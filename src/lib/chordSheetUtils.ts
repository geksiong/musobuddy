/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ChordSheetJS, {
  ChordProParser,
  ChordsOverWordsParser,
  UltimateGuitarParser,
  HtmlDivFormatter,
  ChordProFormatter,
  TextFormatter,
  Song
} from 'chordsheetjs';

export type ChordEngine = 'auto' | 'chordsOverWords' | 'ultimateGuitar' | 'chordpro';
export type ActiveEngine = 'chordsOverWords' | 'ultimateGuitar' | 'chordpro';

export interface ChordSheetParseResult {
  song: Song;
  detectedEngine: ActiveEngine;
  activeEngine: ActiveEngine;
  reason: string;
  uniqueChords: string[];
}

/**
 * Auto-detects the best ChordSheetJS parser engine to use based on string content heuristics.
 */
export function detectChordEngine(content: string): { engine: ActiveEngine; reason: string } {
  if (!content || typeof content !== 'string') {
    return { engine: 'chordsOverWords', reason: 'Empty content default' };
  }

  // 1. Ultimate Guitar tags check
  const ugRegex = /\[ch\]|\[tab\]|\[Verse \d*\]|\[Chorus\]|\[Intro\]|\[Outro\]|\[Bridge\]|\[Pre-Chorus\]|\[Solo\]|\[Interlude\]/i;
  if (ugRegex.test(content)) {
    const matched = content.match(ugRegex);
    return { 
      engine: 'ultimateGuitar', 
      reason: `Detected Ultimate Guitar tag (${matched ? matched[0] : 'UG syntax'})` 
    };
  }

  // 2. ChordPro tags and bracketed chords inline with lyrics check
  const chordProDirectiveRegex = /\{title:|\{t:|\{artist:|\{subtitle:|\{st:|\{comment:|\{c:|\{key:|\{capo:|\{soc\}|\{eoc\}|\{verse\}|\{chorus\}/i;
  // Match inline bracketed chords e.g. [C], [Am7/G], [F#m]
  const inlineChordRegex = /\[[A-G][b#]?(?:maj|min|m|m7|maj7|7|sus\d?|dim|aug|add\d?|\d)*(?:\/[A-G][b#]?)?\]/i;
  
  const hasDirectives = chordProDirectiveRegex.test(content);
  const hasInlineChords = inlineChordRegex.test(content);

  if (hasDirectives || hasInlineChords) {
    const reasons: string[] = [];
    if (hasDirectives) reasons.push('ChordPro directives');
    if (hasInlineChords) reasons.push('bracketed inline chords [C]');
    return {
      engine: 'chordpro',
      reason: `Detected ChordPro syntax (${reasons.join(', ')})`
    };
  }

  // 3. Fallback to Chords Over Words
  return {
    engine: 'chordsOverWords',
    reason: 'Detected standard chords-over-words format'
  };
}

/**
 * Parses chord sheet text using the specified or auto-detected parser engine.
 */
export function parseChordSheet(
  content: string, 
  enginePreference: ChordEngine = 'auto'
): ChordSheetParseResult {
  const { engine: detectedEngine, reason } = detectChordEngine(content);
  const activeEngine: ActiveEngine = enginePreference === 'auto' ? detectedEngine : enginePreference;

  let song: Song | null = null;

  try {
    if (activeEngine === 'chordpro') {
      const parser = new ChordProParser();
      song = parser.parse(content);
    } else if (activeEngine === 'ultimateGuitar') {
      const parser = new UltimateGuitarParser();
      song = parser.parse(content);
    } else {
      const parser = new ChordsOverWordsParser();
      song = parser.parse(content, { softLineBreaks: true });
    }
  } catch (err) {
    console.warn(`Primary parser (${activeEngine}) failed, attempting fallback:`, err);
    // Fallback attempt
    try {
      const fallbackParser = new ChordsOverWordsParser();
      song = fallbackParser.parse(content, { softLineBreaks: true });
    } catch (fallbackErr) {
      console.error('All chord sheet parsers failed:', fallbackErr);
      const songBuilder = new Song();
      song = songBuilder;
    }
  }

  // Extract unique chords from the parsed song
  const uniqueChords = extractUniqueChordsFromSong(song);

  return {
    song: song || new Song(),
    detectedEngine,
    activeEngine,
    reason,
    uniqueChords
  };
}

/**
 * Formats a parsed Song into HTML, ChordPro, or Chords-Over-Words text.
 */
export function formatChordSheet(
  song: Song, 
  formatType: 'html' | 'chordpro' | 'text' = 'html',
  transpose: number = 0
): { content: string; css?: string } {
  if (!song) {
    return { content: '' };
  }

  let targetSong = song;
  if (transpose !== 0) {
    try {
      targetSong = song.transpose(transpose);
    } catch (err) {
      console.warn('Transposition failed on song:', err);
      targetSong = song;
    }
  }

  if (formatType === 'chordpro') {
    const formatter = new ChordProFormatter();
    return { content: formatter.format(targetSong) };
  } else if (formatType === 'text') {
    const formatter = new TextFormatter();
    return { content: formatter.format(targetSong) };
  } else {
    // HTML rendering
    const formatter = new HtmlDivFormatter();
    const html = formatter.format(targetSong);
    const css = formatter.cssString('.chordsheet-container');
    return { content: html, css };
  }
}

/**
 * Normalizes non-standard enharmonics like B# -> C, E# -> F, Cb -> B, Fb -> E in chord strings and keys.
 */
export function normalizeEnharmonics(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/(^|\/)(B#|B♯)/g, '$1C')
    .replace(/(^|\/)(E#|E♯)/g, '$1F')
    .replace(/(^|\/)(Cb|C♭)/g, '$1B')
    .replace(/(^|\/)(Fb|F♭)/g, '$1E');
}

/**
 * Extracts a list of unique chord names found in a parsed Song object.
 */
export function extractUniqueChordsFromSong(song: Song): string[] {
  if (!song || !song.lines) return [];
  const chordsSet = new Set<string>();

  try {
    song.lines.forEach(line => {
      if (line.items) {
        line.items.forEach((item: any) => {
          let chordStr = '';
          if (item.chords && typeof item.chords === 'string' && item.chords.trim().length > 0) {
            chordStr = item.chords.trim();
          } else if (item.chord) {
            if (typeof item.chord === 'string' && item.chord.trim().length > 0) {
              chordStr = item.chord.trim();
            } else if (typeof item.chord.toString === 'function') {
              chordStr = item.chord.toString().trim();
            } else if (item.chord.name) {
              chordStr = String(item.chord.name).trim();
            }
          }
          if (chordStr) {
            chordsSet.add(normalizeEnharmonics(chordStr));
          }
        });
      }
    });
  } catch (e) {
    console.warn('Error extracting chords from song:', e);
  }

  return Array.from(chordsSet);
}
