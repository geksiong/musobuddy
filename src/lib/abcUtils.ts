/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as abcjs from 'abcjs';
import { ScoreData, ScoreFormat } from '../components/Score/types.ts';
import { createMxlBlob } from './mxlUtils.ts';

/**
 * Converts scientific pitch notation (e.g. E2, A2, D3, G3, B3, E4, Gb3, F#4, C4, E5)
 * into standard ABC note names (e.g. E,, A,, D, G, B, e, _G, ^f, c, e').
 * If the string is already an ABC note name or invalid format, returns trimmed string.
 */
export function toAbcNoteName(note: string): string {
  if (!note) return '';
  const trimmed = note.trim();
  const match = trimmed.match(/^([A-Ga-g])([#b]?)([1-8])$/);
  if (!match) {
    return trimmed;
  }
  const [, letter, accidental, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);

  let accPrefix = '';
  if (accidental === '#') accPrefix = '^';
  else if (accidental === 'b') accPrefix = '_';

  const uppercaseLetter = letter.toUpperCase();

  if (octave <= 1) {
    const commas = ','.repeat(2 - octave);
    return `${accPrefix}${uppercaseLetter}${commas}`;
  } else if (octave === 2) {
    return `${accPrefix}${uppercaseLetter},`;
  } else if (octave === 3) {
    return `${accPrefix}${uppercaseLetter}`;
  } else if (octave === 4) {
    return `${accPrefix}${uppercaseLetter.toLowerCase()}`;
  } else {
    const apostrophes = "'".repeat(octave - 4);
    return `${accPrefix}${uppercaseLetter.toLowerCase()}${apostrophes}`;
  }
}

/**
 * Maps input instrument name to valid abcjs tablature instrument:
 * "violin" | "mandolin" | "fiddle" | "guitar" | "fiveString" | ""
 */
export function getAbcjsTablatureInstrument(
  tab?: string
): 'violin' | 'mandolin' | 'fiddle' | 'guitar' | 'fiveString' | '' {
  if (!tab || tab === 'none') return '';
  const lower = tab.toLowerCase().trim();
  if (lower === 'guitar') return 'guitar';
  if (lower === 'ukulele' || lower === 'mandolin') return 'mandolin';
  if (lower === 'banjo' || lower === 'fivestring') return 'fiveString';
  if (lower === 'violin') return 'violin';
  if (lower === 'fiddle') return 'fiddle';
  return '';
}

/**
 * Generates a MIDI blob URL for ABC content
 */
export function generateMidiForAbc(abc: string, tuneIndex: number = 0, transpose: number = 0): string | null {
  try {
    if (!abc || typeof abc !== 'string') return null;
    
    // Filter out any lines starting with %% (directives/comments) ONLY before the first tune
    let filteredAbc = abc;
    const firstXMatch = filteredAbc.match(/^X:/m);
    if (firstXMatch && firstXMatch.index !== undefined) {
      const header = filteredAbc.substring(0, firstXMatch.index);
      const rest = filteredAbc.substring(firstXMatch.index);
      filteredAbc = header.replace(/^%%[^\n]*\n?/gm, '') + rest;
    } else {
      filteredAbc = filteredAbc.replace(/^%%[^\n]*\n?/gm, '');
    }
    
    // Split into individual tunes to be more robust for tunebooks
    const tunes = filteredAbc.split(/(?=^X:)/m).filter(t => t.trim().includes('X:'));
    const targetAbc = tunes.length > tuneIndex ? tunes[tuneIndex] : filteredAbc;
    
    const div = document.createElement('div');
    const visualObjs = abcjs.renderAbc(div, targetAbc, {
      visualTranspose: transpose
    });
    
    if (visualObjs && visualObjs.length > 0) {
      const midiBuffer = abcjs.synth.getMidiFile(visualObjs[0], {
        midiOutputType: 'binary'
      }) as Uint8Array;
      const blob = new Blob([midiBuffer], { type: 'audio/midi' });
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.error('Failed to generate MIDI:', err);
  }
  return null;
}

/**
 * Exports/downloads a ScoreData item as a file
 */
export async function exportScore(score: ScoreData | null | undefined, saveAsMxlOverride?: boolean): Promise<void> {
  if (!score) return;

  if (score.format === ScoreFormat.MusicXML) {
    const shouldSaveAsMxl = saveAsMxlOverride !== undefined ? saveAsMxlOverride : !!score.isMxl;
    const xmlContent = score.content as string;

    if (shouldSaveAsMxl) {
      try {
        const mxlBlob = await createMxlBlob(xmlContent);
        const url = URL.createObjectURL(mxlBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${score.title || 'score'}.mxl`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      } catch (err) {
        console.error('Failed to create MXL file:', err);
      }
    }

    // Fallback or explicit XML export
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${score.title || 'score'}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }
  
  let content = '';
  let mimeType = 'text/plain';
  let fileName = '';

  if (score.format === ScoreFormat.ABC || score.format === ScoreFormat.Text) {
    content = score.content as string;
    const ext = score.format === ScoreFormat.ABC ? 'abc' : 'txt';
    fileName = `${score.title || 'score'}.${ext}`;
  } else {
    const fileUrl = Array.isArray(score.content) ? score.content[0] : (score.content as string);
    if (!fileUrl) return;
    
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = score.title || 'score';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

