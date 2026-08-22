/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedAbcTune {
  tuneIndex: number;
  id: string;
  title: string;
  meter: string;
  key: string;
  tempo: number | null;
  beatsPerMeasure: number;
  measureCount: number;
  chordsPerBeat: string[];
  measures: { measureIndex: number; chords: string[] }[];
  explicitChordCount: number;
  hasExplicitChords: boolean;
}

/**
 * Standardize chord string for accompaniment display & playback
 */
export function cleanChordSymbol(rawSymbol: string): string | null {
  if (!rawSymbol) return null;
  let clean = rawSymbol.trim();

  // Strip layout, fingering, position and dynamic directives in ABC quotes
  // e.g. "^C", "_G", "@10,10", "p", "f", "1", "2", "rit."
  clean = clean.replace(/^[\^_\@><0-9]/, '');
  if (/^(?:p|f|mf|ff|mp|sfz|rit\.?|fine|coda|D\.C\.|D\.S\.)$/i.test(clean)) {
    return null;
  }

  // Normalize accidentals
  clean = clean.replace(/♯/g, '#').replace(/♭/g, 'b');

  // Match chord regex:
  // Root: A-G, optional # or b
  // Suffix: m, min, maj, dim, aug, sus, sus2, sus4, 7, 9, 11, 13, 6, add9, m7, maj7, dim7, m7b5, etc.
  // Optional slash bass: /A-G[#b]?
  const chordRegex = /^([A-G][#b]?)(m|min|maj|dim|aug|sus|sus2|sus4|add[0-9]+|m7|maj7|dim7|m7b5|[0-9]+)*(?:\/([A-G][#b]?))?$/i;

  if (!chordRegex.test(clean)) {
    return null;
  }

  // Normalize capitalization: Root uppercase
  const root = clean.charAt(0).toUpperCase() + (clean.length > 1 && (clean.charAt(1) === '#' || clean.charAt(1) === 'b') ? clean.charAt(1) : '');
  const rest = clean.slice(root.length);

  return root + rest;
}

/**
 * Parses all tunes in an ABC score string and extracts chord progressions beat-by-beat.
 */
export function parseChordsFromAbc(abcContent: string): ParsedAbcTune[] {
  if (!abcContent || typeof abcContent !== 'string') return [];

  // Split by X: header lines to separate tunes in multi-tune ABC files
  const tuneBlocks = abcContent.split(/(?=^X:\s*\d+)/m).filter(block => block.trim().length > 0);

  const results: ParsedAbcTune[] = [];

  tuneBlocks.forEach((block, tuneIdx) => {
    let tuneId = `X: ${tuneIdx + 1}`;
    let title = `Tune ${tuneIdx + 1}`;
    let meterStr = '4/4';
    let keyStr = 'C';
    let tempoBpm: number | null = null;
    let beatsPerMeasure = 4;
    let meterDenominator = 4;
    let meterNumerator = 4;
    let defaultNoteLengthFraction = 0.125; // Default L: 1/8

    const lines = block.split(/\r?\n/);
    let isHeader = true;
    let musicBodyLines: string[] = [];

    // 1. Header Parsing
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('%')) return;

      if (isHeader) {
        if (/^X:\s*/i.test(trimmed)) {
          tuneId = trimmed;
        } else if (/^T:\s*/i.test(trimmed)) {
          const parsedTitle = trimmed.replace(/^T:\s*/i, '').trim();
          if (parsedTitle) title = parsedTitle;
        } else if (/^M:\s*/i.test(trimmed)) {
          const parsedMeter = trimmed.replace(/^M:\s*/i, '').trim();
          if (parsedMeter) {
            meterStr = parsedMeter;
            if (/^(?:C|Common)$/i.test(parsedMeter)) {
              meterNumerator = 4;
              meterDenominator = 4;
              beatsPerMeasure = 4;
            } else if (/^(?:C\||Cut)$/i.test(parsedMeter)) {
              meterNumerator = 2;
              meterDenominator = 2;
              beatsPerMeasure = 2;
            } else {
              const match = parsedMeter.match(/^(\d+)\/(\d+)/);
              if (match) {
                meterNumerator = parseInt(match[1], 10);
                meterDenominator = parseInt(match[2], 10);
                beatsPerMeasure = meterNumerator;
              }
            }
          }
        } else if (/^L:\s*/i.test(trimmed)) {
          const parsedL = trimmed.replace(/^L:\s*/i, '').trim();
          const match = parsedL.match(/^(\d+)\/(\d+)/);
          if (match) {
            defaultNoteLengthFraction = parseInt(match[1], 10) / parseInt(match[2], 10);
          }
        } else if (/^Q:\s*/i.test(trimmed)) {
          const bpmMatch = trimmed.match(/=(\d+)/) || trimmed.match(/(\d+)\s*$/);
          if (bpmMatch) {
            tempoBpm = parseInt(bpmMatch[1], 10);
          }
        } else if (/^K:\s*/i.test(trimmed)) {
          const parsedKey = trimmed.replace(/^K:\s*/i, '').trim();
          if (parsedKey) keyStr = parsedKey;
          isHeader = false; // K: line marks end of main header block
        }
      } else {
        // Music body line or inline fields
        if (trimmed.startsWith('V:')) return; // Voice field line
        musicBodyLines.push(line);
      }
    });

    if (musicBodyLines.length === 0 && lines.length > 0) {
      musicBodyLines = lines;
    }

    // Adjust default L fraction if no L: field was provided
    if (!block.match(/^L:\s*/m)) {
      if (meterNumerator / meterDenominator < 0.75) {
        defaultNoteLengthFraction = 1 / 8;
      } else {
        defaultNoteLengthFraction = 1 / 16;
      }
    }

    // Beat duration unit in whole note fraction
    // e.g. for 4/4 meter: 1 beat = 1/4 note = 0.25 whole note
    // for 6/8 meter: 1 beat = 1/8 note = 0.125 whole note
    const beatUnitFraction = 1 / meterDenominator;

    // 2. Music Body Tokenizing & Measure Building
    const fullBody = musicBodyLines.join('\n');
    const measures: { measureIndex: number; chords: string[] }[] = [];
    let currentMeasureChordsMap: Map<number, string> = new Map();
    let currentMeasurePitchClasses: number[] = [];
    let timeOffsetInMeasure = 0.0;
    let explicitChordCount = 0;

    let i = 0;
    let tupletNotesRemaining = 0;
    let tupletFactor = 1.0;

    let pendingBrokenRhythm = 0; // 1 for '>', -1 for '<'

    while (i < fullBody.length) {
      const char = fullBody[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Ignore postscript directives and comments
      if (char === '%') {
        while (i < fullBody.length && fullBody[i] !== '\n') i++;
        i++;
        continue;
      }

      // Quoted Chords / Text Annotations
      if (char === '"') {
        let quoteContent = '';
        i++;
        while (i < fullBody.length && fullBody[i] !== '"') {
          quoteContent += fullBody[i];
          i++;
        }
        if (i < fullBody.length && fullBody[i] === '"') i++;

        const cleanedChord = cleanChordSymbol(quoteContent);
        if (cleanedChord) {
          explicitChordCount++;
          const rawBeat = timeOffsetInMeasure / beatUnitFraction;
          const beatIdx = Math.min(beatsPerMeasure - 1, Math.max(0, Math.floor(rawBeat + 0.001)));
          currentMeasureChordsMap.set(beatIdx, cleanedChord);
        }
        continue;
      }

      // Measure Bar Lines: |, ||, |:, :|, ::, [|, |]
      if (char === '|' || char === ':' || char === '[') {
        let isBarLine = false;

        if (char === '|' || (char === '[' && i + 1 < fullBody.length && fullBody[i + 1] === '|')) {
          isBarLine = true;
        }

        if (isBarLine) {
          // Advance past bar line tokens like |:, :|, ||, |], [|
          while (i < fullBody.length && ('|:[]!1234567890'.includes(fullBody[i]))) {
            i++;
          }

          // Complete measure if time passed or chords were gathered
          if (timeOffsetInMeasure > 0 || currentMeasureChordsMap.size > 0) {
            const measureChords: string[] = new Array(beatsPerMeasure).fill('');
            currentMeasureChordsMap.forEach((chordName, beatIndex) => {
              if (beatIndex < beatsPerMeasure) {
                measureChords[beatIndex] = chordName;
              }
            });

            measures.push({
              measureIndex: measures.length,
              chords: measureChords,
            });

            currentMeasureChordsMap.clear();
            currentMeasurePitchClasses = [];
            timeOffsetInMeasure = 0.0;
            tupletNotesRemaining = 0;
            tupletFactor = 1.0;
            pendingBrokenRhythm = 0;
          }
          continue;
        }
      }

      // Tuplet specifiers e.g. (3 , (2 , (4
      if (char === '(' && i + 1 < fullBody.length && /\d/.test(fullBody[i + 1])) {
        const tupletNum = parseInt(fullBody[i + 1], 10);
        i += 2;
        if (tupletNum === 3) {
          tupletNotesRemaining = 3;
          tupletFactor = 2 / 3;
        } else if (tupletNum === 2) {
          tupletNotesRemaining = 2;
          tupletFactor = 3 / 2;
        } else if (tupletNum === 4) {
          tupletNotesRemaining = 4;
          tupletFactor = 3 / 4;
        }
        continue;
      }

      // Note or Rest item
      const isNoteStart = /[a-gA-GzZxX]/.test(char) || (char === '[' && !fullBody.substring(i, i + 2).includes('|'));
      if (isNoteStart) {
        let durationFraction = defaultNoteLengthFraction;

        // Advance through note / rest / chord bracket
        if (char === '[') {
          // In-line note chord e.g. [CEG]
          while (i < fullBody.length && fullBody[i] !== ']') {
            const innerChar = fullBody[i];
            const pc = noteCharToPitchClass(innerChar);
            if (pc !== null) currentMeasurePitchClasses.push(pc);
            i++;
          }
          if (i < fullBody.length && fullBody[i] === ']') i++;
        } else {
          const pc = noteCharToPitchClass(char);
          if (pc !== null) currentMeasurePitchClasses.push(pc);
          i++;
        }

        // Parse optional duration multipliers/divisors after note
        // e.g. C2, C3, C/2, C3/2, C/
        let numStr = '';
        let denStr = '';
        let isDiv = false;

        while (i < fullBody.length && /[0-9\/]/.test(fullBody[i])) {
          if (fullBody[i] === '/') {
            isDiv = true;
          } else if (!isDiv) {
            numStr += fullBody[i];
          } else {
            denStr += fullBody[i];
          }
          i++;
        }

        let multiplier = numStr ? parseInt(numStr, 10) : 1;
        let divisor = isDiv ? (denStr ? parseInt(denStr, 10) : 2) : 1;

        let itemDuration = defaultNoteLengthFraction * (multiplier / divisor);

        // Apply tuplet factor
        if (tupletNotesRemaining > 0) {
          itemDuration *= tupletFactor;
          tupletNotesRemaining--;
        }

        // Apply broken rhythm factor ('>' or '<')
        if (pendingBrokenRhythm === 1) {
          itemDuration *= 0.5;
          pendingBrokenRhythm = 0;
        } else if (pendingBrokenRhythm === -1) {
          itemDuration *= 1.5;
          pendingBrokenRhythm = 0;
        }

        // Lookahead for broken rhythm modifier immediately following note duration
        if (i < fullBody.length && fullBody[i] === '>') {
          itemDuration *= 1.5;
          pendingBrokenRhythm = 1;
          i++;
        } else if (i < fullBody.length && fullBody[i] === '<') {
          itemDuration *= 0.5;
          pendingBrokenRhythm = -1;
          i++;
        }

        timeOffsetInMeasure += itemDuration;
        continue;
      }

      // Fallback advance for other characters (decorations, slurs, grace notes)
      i++;
    }

    // Flush last measure if any notes/chords remained
    if (timeOffsetInMeasure > 0 || currentMeasureChordsMap.size > 0) {
      const measureChords: string[] = new Array(beatsPerMeasure).fill('');
      currentMeasureChordsMap.forEach((chordName, beatIndex) => {
        if (beatIndex < beatsPerMeasure) {
          measureChords[beatIndex] = chordName;
        }
      });

      measures.push({
        measureIndex: measures.length,
        chords: measureChords,
      });
    }

    // 3. Fallback: If no explicit quoted chords were found, infer key chord for beat 0 of each measure
    if (explicitChordCount === 0 && measures.length > 0) {
      const fallbackChord = inferFallbackChordFromKey(keyStr);
      measures.forEach(m => {
        if (fallbackChord) {
          m.chords[0] = fallbackChord;
        }
      });
    }

    // Flat array of chords per beat
    const flatChordsPerBeat: string[] = [];
    measures.forEach(m => {
      flatChordsPerBeat.push(...m.chords);
    });

    results.push({
      tuneIndex: tuneIdx,
      id: tuneId,
      title,
      meter: meterStr,
      key: keyStr,
      tempo: tempoBpm,
      beatsPerMeasure,
      measureCount: measures.length,
      chordsPerBeat: flatChordsPerBeat,
      measures,
      explicitChordCount,
      hasExplicitChords: explicitChordCount > 0,
    });
  });

  return results;
}

/**
 * Maps ABC note characters [a-gA-G] to Pitch Class (0-11)
 */
function noteCharToPitchClass(char: string): number | null {
  const map: Record<string, number> = {
    'c': 0, 'C': 0,
    'd': 2, 'D': 2,
    'e': 4, 'E': 4,
    'f': 5, 'F': 5,
    'g': 7, 'G': 7,
    'a': 9, 'A': 9,
    'b': 11, 'B': 11,
  };
  return map[char] !== undefined ? map[char] : null;
}

/**
 * Infer root key chord from K: field (e.g. "Edor" -> "Em", "G" -> "G", "Am" -> "Am")
 */
function inferFallbackChordFromKey(keyHeader: string): string {
  if (!keyHeader) return 'C';
  const clean = keyHeader.trim();

  // Root letter & accidental
  const match = clean.match(/^([A-G][#b]?)(.*)$/i);
  if (!match) return 'C';

  const root = match[1].charAt(0).toUpperCase() + (match[1].length > 1 ? match[1].charAt(1) : '');
  const mode = match[2].trim().toLowerCase();

  if (mode.includes('m') || mode.includes('dor') || mode.includes('phr') || mode.includes('loc') || mode.includes('minor')) {
    return `${root}m`;
  }
  return root;
}
