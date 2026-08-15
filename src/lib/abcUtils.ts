/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as abcjs from 'abcjs';
import { ScoreData, ScoreFormat } from '../components/Score/types.ts';
import { createMxlBlob } from './mxlUtils.ts';

export interface AbcItem {
  type: 'prepage' | 'tune';
  pageLabel: string;
  title: string;
  abc: string;
}

/**
 * Parses an ABC document into individual pages/items, supporting pre-tune metadata pages
 * (e.g., 0.1, 0.2 separated by %%newpage directives before the first X:) and individual tunes.
 */
export function parseAbcItems(abc: string): AbcItem[] {
  if (!abc || typeof abc !== 'string') return [];

  const items: AbcItem[] = [];
  const firstXMatch = abc.match(/^X:/m);
  let preamble = '';
  let tuneBody = abc;

  if (firstXMatch && firstXMatch.index !== undefined) {
    preamble = abc.substring(0, firstXMatch.index);
    tuneBody = abc.substring(firstXMatch.index);
  }

  // Extract global formatting directives from preamble (e.g. %%scale, %%pageheight, %%pagewidth)
  let globalDirectives = '';
  if (preamble) {
    const cleanedPreamble = preamble.replace(/%%begintext[\s\S]*?%%endtext/gi, '');
    globalDirectives = cleanedPreamble
      .split('\n')
      .filter(line => {
        const t = line.trim();
        if (!t.startsWith('%%')) return false;
        return !/^%%(begintext|endtext|text|center|title|subtitle|header|footer|eps|ps|postscript|newpage|pagebreak|vskip)\b/i.test(t);
      })
      .join('\n');
  }

  // Helper to extract a friendly title for prepages
  const getPrepageTitle = (content: string, pageNum: string) => {
    const lines = content.split('\n');
    let inBeginText = false;

    for (const rawLine of lines) {
      const t = rawLine.trim();
      if (!t) continue;

      if (/^%%begintext\b/i.test(t)) {
        inBeginText = true;
        continue;
      }
      if (/^%%endtext\b/i.test(t)) {
        inBeginText = false;
        continue;
      }

      if (inBeginText) {
        if (t.length < 50 && !t.startsWith('%')) {
          return `${pageNum}: ${t}`;
        }
        continue;
      }

      if (/^%%center\b/i.test(t)) {
        const title = t.replace(/^%%center\s*/i, '').trim();
        if (title && title.length < 50) return `${pageNum}: ${title}`;
      }
      if (/^%%title\b/i.test(t)) {
        const title = t.replace(/^%%title\s*/i, '').trim();
        if (title && title.length < 50) return `${pageNum}: ${title}`;
      }
      if (/^%%text\b/i.test(t)) {
        const title = t.replace(/^%%text\s*/i, '').trim();
        if (title && title.length < 50) return `${pageNum}: ${title}`;
      }

      // Ignore any directive starting with %
      if (t.startsWith('%')) continue;

      // Plain text line before X:
      if (!t.includes(':') && t.length < 50) {
        return `${pageNum}: ${t}`;
      }
    }
    return pageNum;
  };

  // Parse preamble for pre-tune metadata pages (e.g., 0.1, 0.2)
  if (preamble.trim()) {
    const rawPages = preamble.split(/^%%newpage\b|^%%pagebreak\b/m);

    const hasVisualContent = (str: string) => {
      return /%%vskip|%%begintext|%%text|%%center/i.test(str) ||
        str.split('\n').some(l => {
          const t = l.trim();
          return t && !t.startsWith('%') && !t.includes(':');
        });
    };

    if (rawPages.some(hasVisualContent)) {
      rawPages.forEach((pageContent, idx) => {
        if (hasVisualContent(pageContent)) {
          const pageNum = `0.${idx + 1}`;
          const title = getPrepageTitle(pageContent, pageNum);
          items.push({
            type: 'prepage',
            pageLabel: pageNum,
            title: title,
            abc: pageContent
          });
        }
      });
    }
  }

  // Parse tunes
  const tunes = tuneBody.split(/(?=^X:)/m).filter(t => t.trim().includes('X:'));
  tunes.forEach((tuneStr, idx) => {
    const titleMatch = tuneStr.match(/^T:\s*(.*)$/m);
    const tuneTitle = titleMatch ? titleMatch[1].trim() : `Tune ${idx + 1}`;
    const fullTuneAbc = globalDirectives.trim() ? `${globalDirectives.trim()}\n${tuneStr}` : tuneStr;
    items.push({
      type: 'tune',
      pageLabel: `${idx + 1}`,
      title: `${idx + 1}. ${tuneTitle}`,
      abc: fullTuneAbc
    });
  });

  return items;
}

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
    
    const items = parseAbcItems(abc);
    const targetItem = items.length > tuneIndex ? items[tuneIndex] : null;
    const targetAbc = targetItem ? targetItem.abc : abc;
    
    const div = document.createElement('div');
    const visualObjs = abcjs.renderAbc(div, targetAbc, {
      visualTranspose: transpose
    });
    
    if (visualObjs && visualObjs.length > 0) {
      const res = abcjs.synth.getMidiFile(visualObjs[0], {
        midiOutputType: 'binary'
      }) as any;

      let rawBytes: Uint8Array | null = null;
      if (Array.isArray(res) && res.length > 0) {
        rawBytes = res[0] instanceof Uint8Array ? res[0] : new Uint8Array(res[0]);
      } else if (res instanceof Uint8Array) {
        rawBytes = res;
      }

      if (rawBytes) {
        const buffer = rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength);
        const blob = new Blob([buffer], { type: 'audio/midi' });
        return URL.createObjectURL(blob);
      }
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

  if (score.format === ScoreFormat.ABC || score.format === ScoreFormat.Text || (score.format === ScoreFormat.GuitarPro && typeof score.content === 'string' && !score.content.startsWith('blob:') && !score.content.startsWith('http'))) {
    content = score.content as string;
    const ext = score.format === ScoreFormat.ABC ? 'abc' : score.format === ScoreFormat.GuitarPro ? 'gp' : 'txt';
    fileName = `${score.title || 'score'}.${ext}`;
  } else {
    const fileUrl = Array.isArray(score.content) ? score.content[0] : (score.content as string);
    if (!fileUrl) return;
    
    const link = document.createElement('a');
    link.href = fileUrl;
    let downloadName = score.title || 'score';
    if (score.format === ScoreFormat.GuitarPro && !downloadName.match(/\.(gp\d?|gpx|ptb)$/i)) {
      downloadName = `${downloadName}.gp`;
    }
    link.download = downloadName;
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

