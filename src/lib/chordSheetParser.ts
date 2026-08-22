/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseChordSheet } from './chordSheetUtils.ts';
import { cleanChordSymbol } from './abcChordParser.ts';

export type ChordDistributionMode = 'smart' | '1_per_bar' | '2_per_bar' | '4_per_bar';

export interface ParsedChordSheet {
  title: string;
  artist: string;
  key: string;
  timeSignature: string;
  beatsPerMeasure: number;
  tempo: number | null;
  measureCount: number;
  chordsPerBeat: string[];
  measures: { measureIndex: number; chords: string[]; originalLine?: string }[];
  uniqueChords: string[];
  sections: { name: string; measureRange: [number, number] }[];
}

/**
 * Smartly parses a Chord Sheet (ChordPro, Ultimate Guitar, or Chords-Over-Words)
 * into a measure-by-measure, beat-aligned chord progression.
 */
export function parseChordsFromChordSheet(
  content: string,
  mode: ChordDistributionMode = 'smart',
  overrideBeatsPerMeasure?: number
): ParsedChordSheet {
  if (!content || typeof content !== 'string') {
    return {
      title: 'Untitled Chord Sheet',
      artist: '',
      key: 'C',
      timeSignature: '4/4',
      beatsPerMeasure: overrideBeatsPerMeasure || 4,
      tempo: null,
      measureCount: 0,
      chordsPerBeat: [],
      measures: [],
      uniqueChords: [],
      sections: [],
    };
  }

  // 1. Extract metadata headers using regex
  let title = 'Untitled Chord Sheet';
  let artist = '';
  let key = 'C';
  let timeSignature = '4/4';
  let beatsPerMeasure = overrideBeatsPerMeasure || 4;
  let tempo: number | null = null;

  // Check ChordPro & text metadata directives
  const titleMatch = content.match(/\{title:\s*([^}]+)\}/i) || content.match(/^Title:\s*(.+)$/im);
  if (titleMatch) title = titleMatch[1].trim();

  const artistMatch = content.match(/\{artist:\s*([^}]+)\}/i) || content.match(/^Artist:\s*(.+)$/im);
  if (artistMatch) artist = artistMatch[1].trim();

  const keyMatch = content.match(/\{key:\s*([^}]+)\}/i) || content.match(/^Key:\s*(.+)$/im);
  if (keyMatch) key = keyMatch[1].trim();

  const timeMatch = content.match(/\{time:\s*([^}]+)\}/i) || content.match(/^Time(?:\s*Signature)?:\s*(\d+\/\d+)/im);
  if (timeMatch) {
    timeSignature = timeMatch[1].trim();
    const meterMatch = timeSignature.match(/^(\d+)\/(\d+)/);
    if (meterMatch) {
      beatsPerMeasure = parseInt(meterMatch[1], 10);
    }
  }

  const tempoMatch = content.match(/\{tempo:\s*(\d+)\}/i) || content.match(/^(?:Tempo|BPM):\s*(\d+)/im);
  if (tempoMatch) {
    tempo = parseInt(tempoMatch[1], 10);
  }

  if (overrideBeatsPerMeasure && overrideBeatsPerMeasure > 0) {
    beatsPerMeasure = overrideBeatsPerMeasure;
  }

  // 2. Parse Song using ChordSheetJS to get unique chords and structure
  const parseResult = parseChordSheet(content, 'auto');
  const uniqueChords = parseResult.uniqueChords || [];

  // 3. Process line by line for smart measure placement
  const rawLines = content.split(/\r?\n/);
  const measures: { measureIndex: number; chords: string[]; originalLine?: string }[] = [];
  const sections: { name: string; measureRange: [number, number] }[] = [];

  let currentSectionName = 'General';
  let sectionStartMeasure = 0;

  for (let lIdx = 0; lIdx < rawLines.length; lIdx++) {
    const rawLine = rawLines[lIdx].trim();
    if (!rawLine) continue;

    // Detect section headers e.g. {comment: Intro}, [Verse 1], {verse}, {chorus}, [Chorus]
    const sectionMatch = rawLine.match(/\{comment:\s*([^}]+)\}/i) ||
                         rawLine.match(/^\[(Verse|Chorus|Intro|Outro|Bridge|Solo|Pre-Chorus|Interlude)[^\]]*\]/i) ||
                         rawLine.match(/^\{(verse|chorus|bridge|intro|outro)\}/i);

    if (sectionMatch) {
      if (measures.length > sectionStartMeasure) {
        sections.push({
          name: currentSectionName,
          measureRange: [sectionStartMeasure, measures.length - 1],
        });
      }
      currentSectionName = sectionMatch[1] || sectionMatch[0];
      sectionStartMeasure = measures.length;
      continue;
    }

    // Ignore directives e.g. {title:...}, {artist:...}, {key:...}, {capo:...}
    if (rawLine.startsWith('{') && rawLine.endsWith('}')) continue;
    if (/^(Title|Artist|Key|Capo|Time|Tempo|BPM):\s*/i.test(rawLine)) continue;

    // Line Processing:
    // Case A: Line contains bar separators `|` (e.g. `| C | G | Am | F |` or `| C G | Am F |`)
    if (rawLine.includes('|')) {
      const segments = rawLine.split('|');
      for (const segment of segments) {
        const segTrim = segment.trim();
        if (!segTrim) continue;

        // Extract chords in segment
        const segmentChords = extractChordsFromText(segTrim);
        if (segmentChords.length > 0) {
          const measureChords = allocateChordsToMeasureBeats(segmentChords, beatsPerMeasure, mode);
          measures.push({
            measureIndex: measures.length,
            chords: measureChords,
            originalLine: rawLine,
          });
        }
      }
      continue;
    }

    // Case B: Line without `|`
    // Could be inline bracketed chords `[C]Hello [G]world`, chords over words, or a pure chord line `C    G    Am    F`
    const extractedWithPos = extractChordsWithPositions(rawLine);
    if (extractedWithPos.length === 0) continue; // Pure lyric line without chords

    if (mode === '1_per_bar') {
      // Every chord gets 1 measure (Beat 0)
      for (const chordObj of extractedWithPos) {
        const measureChords = new Array(beatsPerMeasure).fill('');
        measureChords[0] = chordObj.chord;
        measures.push({
          measureIndex: measures.length,
          chords: measureChords,
          originalLine: rawLine,
        });
      }
    } else if (mode === '2_per_bar') {
      // Group every 2 chords into 1 measure
      for (let i = 0; i < extractedWithPos.length; i += 2) {
        const pair = extractedWithPos.slice(i, i + 2).map(c => c.chord);
        const measureChords = allocateChordsToMeasureBeats(pair, beatsPerMeasure, '2_per_bar');
        measures.push({
          measureIndex: measures.length,
          chords: measureChords,
          originalLine: rawLine,
        });
      }
    } else if (mode === '4_per_bar') {
      // Group every 4 chords into 1 measure
      for (let i = 0; i < extractedWithPos.length; i += 4) {
        const quad = extractedWithPos.slice(i, i + 4).map(c => c.chord);
        const measureChords = allocateChordsToMeasureBeats(quad, beatsPerMeasure, '4_per_bar');
        measures.push({
          measureIndex: measures.length,
          chords: measureChords,
          originalLine: rawLine,
        });
      }
    } else {
      // 'smart' mode: analyze character spacing and position gaps!
      // If distance between chord[i] and chord[i+1] is small (< 10 characters or close inline), pair them into 1 measure (Beat 0 & Beat 2/3).
      // If distance is large or chord is alone, give it 1 full measure.
      let i = 0;
      while (i < extractedWithPos.length) {
        const curr = extractedWithPos[i];
        const next = extractedWithPos[i + 1];

        if (next && (next.position - curr.position < 10)) {
          // Pair curr & next into 1 measure (beats 0 and mid-beat)
          const pair = [curr.chord, next.chord];
          const measureChords = allocateChordsToMeasureBeats(pair, beatsPerMeasure, 'smart');
          measures.push({
            measureIndex: measures.length,
            chords: measureChords,
            originalLine: rawLine,
          });
          i += 2;
        } else {
          // Single chord gets 1 measure
          const measureChords = new Array(beatsPerMeasure).fill('');
          measureChords[0] = curr.chord;
          measures.push({
            measureIndex: measures.length,
            chords: measureChords,
            originalLine: rawLine,
          });
          i += 1;
        }
      }
    }
  }

  // Push final section range if needed
  if (measures.length > sectionStartMeasure) {
    sections.push({
      name: currentSectionName,
      measureRange: [sectionStartMeasure, measures.length - 1],
    });
  }

  // Flatten chords per beat
  const flatChordsPerBeat: string[] = [];
  measures.forEach(m => {
    flatChordsPerBeat.push(...m.chords);
  });

  return {
    title,
    artist,
    key,
    timeSignature,
    beatsPerMeasure,
    tempo,
    measureCount: measures.length,
    chordsPerBeat: flatChordsPerBeat,
    measures,
    uniqueChords,
    sections,
  };
}

/**
 * Helper: Extract all valid chords from a text string with character positions
 */
function extractChordsWithPositions(textLine: string): { chord: string; position: number }[] {
  const results: { chord: string; position: number }[] = [];

  // Strip Ultimate Guitar tags like [ch] and [/ch]
  const cleanLine = textLine.replace(/\[\/?ch\]/gi, '');

  // Match bracketed chords e.g. [C], [Am7/G], [F#m]
  const bracketRegex = /\[([A-G][#b]?(?:m|min|maj|dim|aug|sus|sus2|sus4|add[0-9]+|m7|maj7|dim7|m7b5|[0-9]+)*(?:\/[A-G][#b]?)?)\]/gi;
  let match: RegExpExecArray | null;

  while ((match = bracketRegex.exec(cleanLine)) !== null) {
    const cleaned = cleanChordSymbol(match[1]);
    if (cleaned) {
      results.push({ chord: cleaned, position: match.index });
    }
  }

  if (results.length > 0) {
    return results;
  }

  // If no bracketed chords, check for plain chord tokens (space separated)
  const tokenRegex = /\b([A-G][#b]?(?:m|min|maj|dim|aug|sus|sus2|sus4|add[0-9]+|m7|maj7|dim7|m7b5|[0-9]+)*(?:\/[A-G][#b]?)?)\b/g;
  while ((match = tokenRegex.exec(cleanLine)) !== null) {
    const cleaned = cleanChordSymbol(match[1]);
    if (cleaned) {
      results.push({ chord: cleaned, position: match.index });
    }
  }

  return results;
}

/**
 * Helper: Extract chord strings from a measure segment text
 */
function extractChordsFromText(segmentText: string): string[] {
  const withPos = extractChordsWithPositions(segmentText);
  return withPos.map(item => item.chord);
}

/**
 * Distribute N chords across a measure's beats
 */
function allocateChordsToMeasureBeats(
  chords: string[],
  beatsPerMeasure: number,
  mode: ChordDistributionMode
): string[] {
  const result: string[] = new Array(beatsPerMeasure).fill('');
  if (chords.length === 0) return result;

  if (chords.length === 1) {
    result[0] = chords[0];
    return result;
  }

  if (chords.length === 2) {
    // 2 chords in measure
    // In 4/4 time: Beat 0 and Beat 2
    // In 3/4 time: Beat 0 and Beat 2
    // In 6/8 time: Beat 0 and Beat 3
    result[0] = chords[0];
    if (beatsPerMeasure === 4) {
      result[2] = chords[1];
    } else if (beatsPerMeasure === 6) {
      result[3] = chords[1];
    } else if (beatsPerMeasure > 2) {
      result[Math.floor(beatsPerMeasure / 2)] = chords[1];
    } else {
      result[1] = chords[1];
    }
    return result;
  }

  if (chords.length === 3) {
    result[0] = chords[0];
    if (beatsPerMeasure >= 3) {
      result[1] = chords[1];
      result[2] = chords[2];
    } else {
      result[1] = chords[1];
    }
    return result;
  }

  // 4 or more chords
  for (let i = 0; i < Math.min(chords.length, beatsPerMeasure); i++) {
    result[i] = chords[i];
  }

  return result;
}
