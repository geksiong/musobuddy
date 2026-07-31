/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NOTES } from '../constants.ts';

export type InstrumentName = 
  | 'guitar' 
  | 'bass' 
  | 'bass5' 
  | 'ukulele' 
  | 'mandolin' 
  | 'banjo' 
  | 'bouzouki' 
  | 'cavaquinho' 
  | 'charango';

export interface TuningInfo {
  name: string;
  midi: number[]; // MIDI note numbers per string from lowest pitch string to highest pitch string
  notes: string[];
}

export interface InstrumentConfig {
  name: InstrumentName;
  displayName: string;
  strings: number;
  fretsOnChord: number;
  maxFrets: number;
  maxSpan: number;
  defaultTuning: string;
  tunings: Record<string, TuningInfo>;
}

export interface GeneratedPosition {
  frets: number[]; // -1 = muted, 0 = open, >0 = fret number
  fingers: number[]; // 0 = none, 1 = index, 2 = middle, 3 = ring, 4 = pinky
  baseFret: number;
  barres: number[];
  capo?: boolean;
  score: number;
  noteNames: string[]; // Note names with octaves (e.g. ["E2", "A2", "D3", "G3", "B3", "E4"])
  pitchClasses: number[];
  tags: string[];
  inversionLabel: string;
  fretSpan: number;
}

export const INSTRUMENT_CONFIGS: Record<InstrumentName, InstrumentConfig> = {
  guitar: {
    name: 'guitar',
    displayName: 'Guitar',
    strings: 6,
    fretsOnChord: 5,
    maxFrets: 18,
    maxSpan: 5,
    defaultTuning: 'standard',
    tunings: {
      standard: {
        name: 'Standard (E A D G B E)',
        midi: [40, 45, 50, 55, 59, 64],
        notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      },
      dropD: {
        name: 'Drop D (D A D G B E)',
        midi: [38, 45, 50, 55, 59, 64],
        notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
      },
      dadgad: {
        name: 'DADGAD (D A D G A D)',
        midi: [38, 45, 50, 55, 57, 62],
        notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'],
      },
      openD: {
        name: 'Open D (D A D F# A D)',
        midi: [38, 45, 50, 54, 57, 62],
        notes: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'],
      },
      openG: {
        name: 'Open G (D G D G B D)',
        midi: [38, 43, 50, 55, 59, 62],
        notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
      },
      openC: {
        name: 'Open C (C G C G C E)',
        midi: [36, 43, 50, 55, 60, 64],
        notes: ['C2', 'G2', 'C3', 'G3', 'C4', 'E4'],
      },
      ebStandard: {
        name: 'Eb Standard (Eb Ab Db Gb Bb Eb)',
        midi: [39, 44, 49, 54, 58, 63],
        notes: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'],
      },
      dStandard: {
        name: 'D Standard (D G C F A D)',
        midi: [38, 43, 48, 53, 57, 62],
        notes: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'],
      },
      openE: {
        name: 'Open E (E B E G# B E)',
        midi: [40, 47, 52, 56, 59, 64],
        notes: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'],
      },
      dropC: {
        name: 'Drop C (C G C F A D)',
        midi: [36, 43, 48, 53, 57, 62],
        notes: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'],
      },
    },
  },
  bass: {
    name: 'bass',
    displayName: 'Bass (4-String)',
    strings: 4,
    fretsOnChord: 4,
    maxFrets: 18,
    maxSpan: 4,
    defaultTuning: 'standard',
    tunings: {
      standard: {
        name: 'Standard (E A D G)',
        midi: [28, 33, 38, 43],
        notes: ['E1', 'A1', 'D2', 'G2'],
      },
      dropD: {
        name: 'Drop D (D A D G)',
        midi: [26, 33, 38, 43],
        notes: ['D1', 'A1', 'D2', 'G2'],
      },
      dStandard: {
        name: 'D Standard (D G C F)',
        midi: [26, 31, 36, 41],
        notes: ['D1', 'G1', 'C2', 'F2'],
      },
      halfStepDown: {
        name: 'Eb Standard (Eb Ab Db Gb)',
        midi: [27, 32, 37, 42],
        notes: ['Eb1', 'Ab1', 'Db2', 'Gb2'],
      },
    },
  },
  bass5: {
    name: 'bass5',
    displayName: 'Bass (5-String)',
    strings: 5,
    fretsOnChord: 4,
    maxFrets: 18,
    maxSpan: 4,
    defaultTuning: 'standard',
    tunings: {
      standard: {
        name: 'Standard (B E A D G)',
        midi: [23, 28, 33, 38, 43],
        notes: ['B0', 'E1', 'A1', 'D2', 'G2'],
      },
      highC: {
        name: 'Tenor / High C (E A D G C)',
        midi: [28, 33, 38, 43, 48],
        notes: ['E1', 'A1', 'D2', 'G2', 'C3'],
      },
    },
  },
  ukulele: {
    name: 'ukulele',
    displayName: 'Ukulele',
    strings: 4,
    fretsOnChord: 5,
    maxFrets: 15,
    maxSpan: 5,
    defaultTuning: 'standard',
    tunings: {
      standard: {
        name: 'Standard High-G (G C E A)',
        midi: [67, 60, 64, 69],
        notes: ['G4', 'C4', 'E4', 'A4'],
      },
      lowG: {
        name: 'Low-G (G C E A)',
        midi: [55, 60, 64, 69],
        notes: ['G3', 'C4', 'E4', 'A4'],
      },
      baritone: {
        name: 'Baritone (D G B E)',
        midi: [50, 55, 59, 64],
        notes: ['D3', 'G3', 'B3', 'E4'],
      },
      tenorD: {
        name: 'Tenor D-Tuning (A D F# B)',
        midi: [69, 62, 66, 71],
        notes: ['A4', 'D4', 'F#4', 'B4'],
      },
      slackKey: {
        name: 'Slack Key Open G (G C E G)',
        midi: [55, 60, 64, 67],
        notes: ['G3', 'C4', 'E4', 'G4'],
      },
    },
  },
  mandolin: {
    name: 'mandolin',
    displayName: 'Mandolin',
    strings: 4,
    fretsOnChord: 6,
    maxFrets: 15,
    maxSpan: 6,
    defaultTuning: 'standard',
    tunings: {
      standard: {
        name: 'Standard (G D A E)',
        midi: [55, 62, 69, 76],
        notes: ['G3', 'D4', 'A4', 'E5'],
      },
      sawmill: {
        name: 'Sawmill GDGD (G D G D)',
        midi: [55, 62, 67, 74],
        notes: ['G3', 'D4', 'G4', 'D5'],
      },
      openG: {
        name: 'Open G (G D G B)',
        midi: [55, 62, 67, 71],
        notes: ['G3', 'D4', 'G4', 'B4'],
      },
      mandola: {
        name: 'Mandola CGDA (C G D A)',
        midi: [48, 55, 62, 69],
        notes: ['C3', 'G3', 'D4', 'A4'],
      },
    },
  },
  banjo: {
    name: 'banjo',
    displayName: '5-String Banjo',
    strings: 5,
    fretsOnChord: 5,
    maxFrets: 18,
    maxSpan: 5,
    defaultTuning: 'openG',
    tunings: {
      openG: {
        name: 'Open G (g D G B D)',
        midi: [67, 50, 55, 59, 62],
        notes: ['G4', 'D3', 'G3', 'B3', 'D4'],
      },
      cTuning: {
        name: 'Drop C (g C G B D)',
        midi: [67, 48, 55, 59, 62],
        notes: ['G4', 'C3', 'G3', 'B3', 'D4'],
      },
      doubleC: {
        name: 'Double C (g C G C D)',
        midi: [67, 48, 55, 60, 62],
        notes: ['G4', 'C3', 'G3', 'C4', 'D4'],
      },
      sawmill: {
        name: 'Sawmill / Mountain (g D G C D)',
        midi: [67, 50, 55, 60, 62],
        notes: ['G4', 'D3', 'G3', 'C4', 'D4'],
      },
      openD: {
        name: 'Open D (f# D F# A D)',
        midi: [66, 50, 54, 57, 62],
        notes: ['F#4', 'D3', 'F#3', 'A3', 'D4'],
      },
    },
  },
  bouzouki: {
    name: 'bouzouki',
    displayName: 'Irish Bouzouki',
    strings: 4,
    fretsOnChord: 5,
    maxFrets: 18,
    maxSpan: 5,
    defaultTuning: 'gdad',
    tunings: {
      gdad: {
        name: 'Irish GDAD (G D A D)',
        midi: [43, 50, 57, 62],
        notes: ['G2', 'D3', 'A3', 'D4'],
      },
      gdae: {
        name: 'Octave Mandolin GDAE (G D A E)',
        midi: [43, 50, 57, 64],
        notes: ['G2', 'D3', 'A3', 'E4'],
      },
      cfad: {
        name: 'Greek CFAD (C F A D)',
        midi: [48, 53, 57, 62],
        notes: ['C3', 'F3', 'A3', 'D4'],
      },
    },
  },
  cavaquinho: {
    name: 'cavaquinho',
    displayName: 'Cavaquinho',
    strings: 4,
    fretsOnChord: 5,
    maxFrets: 15,
    maxSpan: 5,
    defaultTuning: 'standard',
    tunings: {
      standard: {
        name: 'Standard Brazilian (D G B D)',
        midi: [62, 67, 71, 74],
        notes: ['D4', 'G4', 'B4', 'D5'],
      },
      portuguese: {
        name: 'Portuguese (D A B E)',
        midi: [62, 69, 71, 76],
        notes: ['D4', 'A4', 'B4', 'E5'],
      },
    },
  },
  charango: {
    name: 'charango',
    displayName: 'Charango',
    strings: 5,
    fretsOnChord: 5,
    maxFrets: 15,
    maxSpan: 5,
    defaultTuning: 'standard',
    tunings: {
      standard: {
        name: 'Standard (G C E A E)',
        midi: [67, 72, 64, 69, 64],
        notes: ['G4', 'C5', 'E4', 'A4', 'E4'],
      },
    },
  },
};

export const ROOT_OFFSETS: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

export const CHORD_FORMULAS: Record<string, { label: string; intervals: number[]; essentialIndices: number[] }> = {
  'major': { label: 'Major', intervals: [0, 4, 7], essentialIndices: [0, 1] },
  'minor': { label: 'Minor', intervals: [0, 3, 7], essentialIndices: [0, 1] },
  'm': { label: 'Minor', intervals: [0, 3, 7], essentialIndices: [0, 1] },
  '7': { label: 'Dominant 7th', intervals: [0, 4, 7, 10], essentialIndices: [0, 1, 3] },
  'maj7': { label: 'Major 7th', intervals: [0, 4, 7, 11], essentialIndices: [0, 1, 3] },
  'min7': { label: 'Minor 7th', intervals: [0, 3, 7, 10], essentialIndices: [0, 1, 3] },
  'm7': { label: 'Minor 7th', intervals: [0, 3, 7, 10], essentialIndices: [0, 1, 3] },
  'sus2': { label: 'Suspended 2nd', intervals: [0, 2, 7], essentialIndices: [0, 1] },
  'sus4': { label: 'Suspended 4th', intervals: [0, 5, 7], essentialIndices: [0, 1] },
  'add9': { label: 'Add 9th', intervals: [0, 4, 7, 14], essentialIndices: [0, 1, 3] },
  'dim': { label: 'Diminished', intervals: [0, 3, 6], essentialIndices: [0, 1, 2] },
  'dim7': { label: 'Diminished 7th', intervals: [0, 3, 6, 9], essentialIndices: [0, 1, 3] },
  'm7b5': { label: 'Half-Diminished 7th', intervals: [0, 3, 6, 10], essentialIndices: [0, 1, 2, 3] },
  'aug': { label: 'Augmented', intervals: [0, 4, 8], essentialIndices: [0, 1, 2] },
  '6': { label: 'Major 6th', intervals: [0, 4, 7, 9], essentialIndices: [0, 1, 3] },
  'm6': { label: 'Minor 6th', intervals: [0, 3, 7, 9], essentialIndices: [0, 1, 3] },
  '69': { label: '6/9', intervals: [0, 4, 7, 9, 14], essentialIndices: [0, 1, 3, 4] },
  '9': { label: 'Dominant 9th', intervals: [0, 4, 7, 10, 14], essentialIndices: [0, 1, 3, 4] },
  'm9': { label: 'Minor 9th', intervals: [0, 3, 7, 10, 14], essentialIndices: [0, 1, 3, 4] },
  '11': { label: '11th', intervals: [0, 4, 7, 10, 14, 17], essentialIndices: [0, 1, 3, 5] },
  'm11': { label: 'Minor 11th', intervals: [0, 3, 7, 10, 14, 17], essentialIndices: [0, 1, 3, 5] },
  '13': { label: '13th', intervals: [0, 4, 7, 10, 14, 17, 21], essentialIndices: [0, 1, 3, 6] },
  '7#9': { label: '7#9 (Hendrix)', intervals: [0, 4, 7, 10, 15], essentialIndices: [0, 1, 3, 4] },
  '7b9': { label: '7♭9 Dominant', intervals: [0, 4, 7, 10, 13], essentialIndices: [0, 1, 3, 4] },
  '7b13': { label: '7♭13 Dominant', intervals: [0, 4, 7, 10, 20], essentialIndices: [0, 1, 3, 4] },
  'maj7#11': { label: 'Maj7♯11 (Flamenco)', intervals: [0, 4, 7, 11, 18], essentialIndices: [0, 1, 3, 4] },
  'madd9': { label: 'Minor Add 9th', intervals: [0, 3, 7, 14], essentialIndices: [0, 1, 3] },
  'm69': { label: 'Minor 6/9', intervals: [0, 3, 7, 9, 14], essentialIndices: [0, 1, 3, 4] },
  'mmaj7': { label: 'Minor Major 7th', intervals: [0, 3, 7, 11], essentialIndices: [0, 1, 3] },
};

/**
 * Returns MIDI note name like "C4" or "F#3"
 */
export function midiToNoteName(midi: number): string {
  const noteName = NOTES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName}${octave}`;
}

/**
 * Standardizes key name (e.g. Db -> C#, Bb -> A#)
 */
export function normalizeKey(key: string): string {
  const FLAT_MAP: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
  };
  return FLAT_MAP[key] || key;
}

/**
 * Standardizes chord suffix string
 */
export function normalizeSuffix(suffix: string): string {
  if (!suffix || suffix === 'M' || suffix === 'maj') return 'major';
  if (suffix === 'm' || suffix === 'min') return 'minor';
  if (suffix === 'min7') return 'm7';
  if (suffix === 'min9') return 'm9';
  if (suffix === 'min11') return 'm11';
  if (suffix === 'min13') return 'm13';

  // Flamenco unicode & alternate suffix normalization
  const norm = suffix.replace(/♭/g, 'b').replace(/♯/g, '#');
  if (norm === '7b9' || norm === '7♭9') return '7b9';
  if (norm === '7b13' || norm === '7♭13') return '7b13';
  if (norm === 'maj7#11' || norm === 'maj7♯11') return 'maj7#11';

  return norm;
}

export interface ParsedChord {
  root: string;
  normalizedRoot: string;
  rootPitchClass: number;
  suffix: string;
  formula: { label: string; intervals: number[]; essentialIndices: number[] };
  targetPitchClasses: number[];
  essentialPitchClasses: number[];
  noteNames: string[];
}

export function parseChordInfo(key: string, suffix: string): ParsedChord {
  const normKey = normalizeKey(key);
  const normSuffix = normalizeSuffix(suffix);
  const rootOffset = ROOT_OFFSETS[normKey] ?? 0;

  const formula = CHORD_FORMULAS[normSuffix] || CHORD_FORMULAS['major'];
  const targetPitchClasses = Array.from(
    new Set(formula.intervals.map(inv => (rootOffset + inv) % 12))
  );

  const essentialPitchClasses = formula.essentialIndices.map(
    idx => (rootOffset + formula.intervals[idx]) % 12
  );

  const noteNames = targetPitchClasses.map(pc => NOTES[pc]);

  return {
    root: key,
    normalizedRoot: normKey,
    rootPitchClass: rootOffset,
    suffix: normSuffix,
    formula,
    targetPitchClasses,
    essentialPitchClasses,
    noteNames,
  };
}

/**
 * Memory cache for generated voicings
 */
const voicingCache = new Map<string, GeneratedPosition[]>();

/**
 * Main Algorithmic Chord Generator Engine
 * Fast sliding-window combinatorial generator with playability heuristics
 */
export function generateChordVoicings(
  instrumentName: InstrumentName = 'guitar',
  key: string = 'C',
  suffix: string = 'major',
  tuningKey: string = 'standard',
  maxVoicings: number = 32
): GeneratedPosition[] {
  const inst = INSTRUMENT_CONFIGS[instrumentName] || INSTRUMENT_CONFIGS['guitar'];
  const tuning = inst.tunings[tuningKey] || inst.tunings['standard'];
  const parsed = parseChordInfo(key, suffix);

  const numStrings = inst.strings;
  const maxSpan = inst.maxSpan;
  const maxFrets = inst.maxFrets;

  const cacheKey = `${instrumentName}_${tuningKey}_${key}_${suffix}_${maxSpan}_${maxVoicings}`;
  if (voicingCache.has(cacheKey)) {
    return voicingCache.get(cacheKey)!;
  }

  const candidates: { frets: number[]; baseFret: number; barres: number[]; score: number }[] = [];

  // Generate for sliding base fret windows B from 1 to 12
  for (let B = 1; B <= 12; B++) {
    const stringCandidates: number[][] = [];

    for (let s = 0; s < numStrings; s++) {
      const openMidi = tuning.midi[s];
      const openPitchClass = openMidi % 12;
      const options: number[] = [];

      // Muted string (-1) is always a potential option
      options.push(-1);

      // Open string (0) if open note belongs to chord
      if (parsed.targetPitchClasses.includes(openPitchClass)) {
        options.push(0);
      }

      // Fretted notes in window [B, B + maxSpan]
      for (let f = B; f <= Math.min(B + maxSpan, maxFrets); f++) {
        const fretPitchClass = (openMidi + f) % 12;
        if (parsed.targetPitchClasses.includes(fretPitchClass)) {
          options.push(f);
        }
      }

      stringCandidates.push(options);
    }

    // Backtracking combinations search across strings
    function search(sIndex: number, currentFrets: number[]) {
      if (sIndex === numStrings) {
        // Validate fret combination
        const fretted = currentFrets.filter(f => f > 0);
        const sounding = currentFrets.filter(f => f >= 0);

        // Need at least 2 sounding strings (3 for guitar)
        if (sounding.length < (numStrings >= 6 ? 3 : 2)) return;

        // Fret span check
        if (fretted.length > 0) {
          const minFret = Math.min(...fretted);
          const maxFret = Math.max(...fretted);
          if (maxFret - minFret > maxSpan) return;
        }

        // Distinct frets count check (max 4 fingers)
        const distinctFrets = new Set(fretted).size;
        if (distinctFrets > 4) return;

        // Check if mandatory root and essential pitch classes are present
        const soundingPitchClasses = currentFrets
          .map((f, idx) => (f >= 0 ? (tuning.midi[idx] + f) % 12 : -1))
          .filter(pc => pc >= 0);

        const hasRoot = soundingPitchClasses.includes(parsed.rootPitchClass);
        if (!hasRoot) return; // Root is required

        // Check essential pitch classes (e.g. 3rd, 7th)
        let essentialCount = 0;
        for (const epc of parsed.essentialPitchClasses) {
          if (soundingPitchClasses.includes(epc)) essentialCount++;
        }
        if (essentialCount < Math.min(2, parsed.essentialPitchClasses.length)) return;

        // Mute gap check: disallow string muted in between sounding strings if too fragmented
        let firstSounding = -1;
        let lastSounding = -1;
        for (let i = 0; i < numStrings; i++) {
          if (currentFrets[i] >= 0) {
            if (firstSounding === -1) firstSounding = i;
            lastSounding = i;
          }
        }
        let innerMutes = 0;
        for (let i = firstSounding; i <= lastSounding; i++) {
          if (currentFrets[i] === -1) innerMutes++;
        }
        if (innerMutes > 1) return; // Ignore choppy voicings

        // Calculate score & barres
        const frettedInSearch = currentFrets.filter(f => f > 0);
        const effectiveBaseFret = frettedInSearch.length > 0 ? Math.min(...frettedInSearch) : 1;

        const { score, barres } = scoreVoicing(currentFrets, effectiveBaseFret, parsed, tuning, numStrings);
        if (score > 0) {
          candidates.push({
            frets: [...currentFrets],
            baseFret: effectiveBaseFret,
            barres,
            score,
          });
        }
        return;
      }

      for (const fretOpt of stringCandidates[sIndex]) {
        currentFrets.push(fretOpt);
        search(sIndex + 1, currentFrets);
        currentFrets.pop();
      }
    }

    search(0, []);
  }

  // Deduplicate fret combinations
  const uniqueMap = new Map<string, { frets: number[]; baseFret: number; barres: number[]; score: number }>();
  for (const c of candidates) {
    const keyStr = c.frets.join(',');
    if (!uniqueMap.has(keyStr) || uniqueMap.get(keyStr)!.score < c.score) {
      uniqueMap.set(keyStr, c);
    }
  }

  // Sort candidates by score descending to pick top quality voicings first
  const sortedByScore = Array.from(uniqueMap.values()).sort((a, b) => b.score - a.score);

  // Take top candidates
  const topCandidates = sortedByScore.slice(0, maxVoicings);

  // Helper for sorting by fretted position from lowest to highest
  const getMinFretPos = (frets: number[]) => {
    const fretted = frets.filter(f => f > 0);
    return fretted.length > 0 ? Math.min(...fretted) : 0;
  };

  const getMaxFretPos = (frets: number[]) => {
    const fretted = frets.filter(f => f > 0);
    return fretted.length > 0 ? Math.max(...fretted) : 0;
  };

  topCandidates.sort((a, b) => {
    const minA = getMinFretPos(a.frets);
    const minB = getMinFretPos(b.frets);
    if (minA !== minB) return minA - minB;

    const maxA = getMaxFretPos(a.frets);
    const maxB = getMaxFretPos(b.frets);
    if (maxA !== maxB) return maxA - maxB;

    return b.score - a.score;
  });

  // Convert to final GeneratedPosition format
  const result: GeneratedPosition[] = topCandidates.map(c => {
    const fingering = computeFingersAndBarres(c.frets, numStrings);
    const { noteNames, pitchClasses, inversionLabel, tags, fretSpan } = computeVoicingMetadata(
      c.frets,
      c.baseFret,
      fingering.barres,
      tuning,
      parsed
    );

    // Calculate actual baseFret for rendering (lowest fretted position or 1)
    const fretted = c.frets.filter(f => f > 0);
    const displayBaseFret = fretted.length > 0 ? Math.min(...fretted) : 1;

    return {
      frets: c.frets,
      fingers: fingering.fingers,
      baseFret: displayBaseFret,
      barres: fingering.barres,
      score: c.score,
      noteNames,
      pitchClasses,
      tags,
      inversionLabel,
      fretSpan,
    };
  });

  voicingCache.set(cacheKey, result);
  return result;
}

export interface FingeringResult {
  fingers: number[];
  barres: number[];
  isPractical: boolean;
  penalty: number;
}

/**
 * Assign ergonomic fingerings (1=index, 2=middle, 3=ring, 4=pinky) and detect valid barres.
 */
export function computeFingersAndBarres(frets: number[], numStrings: number): FingeringResult {
  const fingers = new Array(frets.length).fill(0);
  const barres: number[] = [];
  let isPractical = true;
  let penalty = 0;

  const fretted = frets
    .map((f, i) => ({ fret: f, stringIndex: i }))
    .filter(item => item.fret > 0);

  if (fretted.length === 0) {
    return { fingers, barres, isPractical: true, penalty: 0 };
  }

  const minFret = Math.min(...fretted.map(item => item.fret));
  const maxFret = Math.max(...fretted.map(item => item.fret));
  const span = maxFret - minFret;

  // 1. Barre Detection
  const stringsAtMinFret = fretted.filter(item => item.fret === minFret).map(item => item.stringIndex);
  let isBarre = false;

  if (stringsAtMinFret.length >= 2 && !frets.includes(0)) {
    const minString = Math.min(...stringsAtMinFret);
    const maxString = Math.max(...stringsAtMinFret);

    // Check if all intermediate strings between minString and maxString are valid under a barre
    let barreValid = true;
    for (let s = minString; s <= maxString; s++) {
      if (frets[s] === 0 || (frets[s] > 0 && frets[s] < minFret)) {
        barreValid = false;
        break;
      }
    }

    if (barreValid) {
      isBarre = true;
      barres.push(minFret);
      for (let s = minString; s <= maxString; s++) {
        if (frets[s] === minFret) {
          fingers[s] = 1;
        }
      }
    }
  }

  // 2. Process remaining fretted strings
  const remaining = fretted.filter(item => fingers[item.stringIndex] === 0);

  // Group remaining strings by fret ascending
  const fretMap = new Map<number, number[]>();
  for (const item of remaining) {
    if (!fretMap.has(item.fret)) fretMap.set(item.fret, []);
    fretMap.get(item.fret)!.push(item.stringIndex);
  }

  const sortedFrets = Array.from(fretMap.keys()).sort((a, b) => a - b);
  let lastAssignedFinger = isBarre ? 1 : 0;

  for (let idx = 0; idx < sortedFrets.length; idx++) {
    const f = sortedFrets[idx];
    const stringsOnFret = fretMap.get(f)!;
    // Sort strings by index
    stringsOnFret.sort((a, b) => a - b);

    // Remaining distinct frets to process including this one
    const remainingDistinctFrets = sortedFrets.length - idx;

    // Calculate ideal finger based on fret distance, bounded by remaining available fingers
    const fretOffset = f - minFret;
    const maxAllowedBaseFinger = 4 - (stringsOnFret.length - 1) - (remainingDistinctFrets - 1);
    
    let baseFingerForFret = lastAssignedFinger + 1;
    if (1 + fretOffset > baseFingerForFret && 1 + fretOffset <= maxAllowedBaseFinger) {
      baseFingerForFret = 1 + fretOffset;
    }

    baseFingerForFret = Math.min(Math.max(lastAssignedFinger + 1, 1), Math.max(1, maxAllowedBaseFinger));

    // Check if individual fingers can be assigned without exceeding 4
    if (baseFingerForFret + stringsOnFret.length - 1 <= 4) {
      for (let i = 0; i < stringsOnFret.length; i++) {
        const sIndex = stringsOnFret[i];
        const assignedFinger = baseFingerForFret + i;
        fingers[sIndex] = assignedFinger;
        lastAssignedFinger = Math.max(lastAssignedFinger, assignedFinger);
      }
    } else {
      // Assign shared finger (partial barre / flattened finger) across strings on this fret
      const sharedFinger = Math.min(4, Math.max(2, lastAssignedFinger + 1));
      for (let i = 0; i < stringsOnFret.length; i++) {
        const sIndex = stringsOnFret[i];
        fingers[sIndex] = sharedFinger;
      }
      lastAssignedFinger = Math.max(lastAssignedFinger, sharedFinger);
    }
  }

  // 3. Ergonomic & Physical Feasibility Checks
  if (numStrings <= 4) {
    if (span > 6) {
      isPractical = false;
      penalty += 200;
    }
  } else {
    if (span > 4) {
      isPractical = false;
      penalty += 200;
    }
  }

  // Check for impossible same-finger usage on non-contiguous strings without a valid barre
  const fingerToStringsMap = new Map<number, number[]>();
  for (let i = 0; i < fingers.length; i++) {
    const fing = fingers[i];
    if (fing > 0 && frets[i] > 0) {
      if (!fingerToStringsMap.has(fing)) fingerToStringsMap.set(fing, []);
      fingerToStringsMap.get(fing)!.push(i);
    }
  }

  for (const [fing, strIndices] of fingerToStringsMap.entries()) {
    if (strIndices.length > 1) {
      strIndices.sort((a, b) => a - b);
      const minS = strIndices[0];
      const maxS = strIndices[strIndices.length - 1];

      if (!(fing === 1 && isBarre)) {
        for (let s = minS; s <= maxS; s++) {
          if (frets[s] === 0 || (frets[s] > 0 && frets[s] !== frets[minS])) {
            isPractical = false;
            penalty += 250; // Heavily penalize impossible same-finger non-adjacent pressing
            break;
          }
        }
      }
    }
  }

  return { fingers, barres, isPractical, penalty };
}

/**
 * Score a voicing candidate based on musical correctness, pitch coverage, and physical playability
 */
function scoreVoicing(
  frets: number[],
  windowBaseFret: number,
  parsed: ParsedChord,
  tuning: TuningInfo,
  numStrings: number
): { score: number; barres: number[] } {
  let score = 100;

  const fingering = computeFingersAndBarres(frets, numStrings);
  score -= fingering.penalty;
  if (!fingering.isPractical) {
    score -= 300; // Filter out impractical voicings
  }

  const fretted = frets.filter(f => f > 0);
  const soundingIndices = frets.map((f, i) => (f >= 0 ? i : -1)).filter(i => i >= 0);
  const soundingPitchClasses = soundingIndices.map(i => (tuning.midi[i] + frets[i]) % 12);

  // 1. Coverage of chord pitch classes
  const uniqueSoundingPC = new Set(soundingPitchClasses);
  const coveredTargetCount = Array.from(uniqueSoundingPC).filter(pc =>
    parsed.targetPitchClasses.includes(pc)
  ).length;

  const coverageRatio = coveredTargetCount / parsed.targetPitchClasses.length;
  score += Math.round(coverageRatio * 120);

  // 2. Bass note analysis
  const lowestSoundingStringIndex = soundingIndices[0];
  const lowestPitchClass = (tuning.midi[lowestSoundingStringIndex] + frets[lowestSoundingStringIndex]) % 12;

  if (lowestPitchClass === parsed.rootPitchClass) {
    score += 80; // Root position bonus!
  } else {
    score += 30; // Inversion
  }

  // 3. Physical ergonomics & fret span
  if (fretted.length > 0) {
    const minFret = Math.min(...fretted);
    const maxFret = Math.max(...fretted);
    const span = maxFret - minFret;
    if (numStrings <= 4) {
      score += Math.max(-20, (4 - span) * 10);
    } else {
      score += (4 - span) * 20;
    }

    score += Math.max(0, (12 - minFret) * 4);
  }

  // 4. Closed 4-string chop chord / movable shape bonus
  if (numStrings <= 4 && frets.length === 4 && frets.every(f => f > 0)) {
    score += 60;
  }

  // 5. Open strings bonus
  const openCount = frets.filter(f => f === 0).length;
  score += openCount * 25;

  // 6. Sounding string count
  score += soundingIndices.length * 15;

  // 7. Muted string penalty
  const mutedCount = frets.filter(f => f === -1).length;
  score -= mutedCount * 15;

  // Inner muted strings penalty
  for (let i = soundingIndices[0]; i <= soundingIndices[soundingIndices.length - 1]; i++) {
    if (frets[i] === -1) score -= 35;
  }

  if (fingering.barres.length > 0) {
    score += 35; // Clean barre chord bonus
  }

  return { score, barres: fingering.barres };
}

/**
 * Computes human-readable metadata, tags, note names, and inversions
 */
function computeVoicingMetadata(
  frets: number[],
  baseFret: number,
  barres: number[],
  tuning: TuningInfo,
  parsed: ParsedChord
): {
  noteNames: string[];
  pitchClasses: number[];
  inversionLabel: string;
  tags: string[];
  fretSpan: number;
} {
  const noteNames: string[] = [];
  const pitchClasses: number[] = [];

  frets.forEach((f, i) => {
    if (f >= 0) {
      const midi = tuning.midi[i] + f;
      noteNames.push(midiToNoteName(midi));
      pitchClasses.push(midi % 12);
    } else {
      noteNames.push('X');
      pitchClasses.push(-1);
    }
  });

  const soundingIndices = frets.map((f, i) => (f >= 0 ? i : -1)).filter(i => i >= 0);
  const lowestSoundingIndex = soundingIndices[0];
  const bassPitchClass = (tuning.midi[lowestSoundingIndex] + frets[lowestSoundingIndex]) % 12;

  let inversionLabel = 'Root Position';
  if (bassPitchClass !== parsed.rootPitchClass) {
    const bassNoteName = NOTES[bassPitchClass];
    inversionLabel = `Inversion (Slash ${bassNoteName})`;
  }

  const tags: string[] = [];
  if (frets.includes(0)) tags.push('Open Position');
  if (frets.every(f => f > 0)) {
    if (frets.length === 4) tags.push('Chop Chord');
    else tags.push('Closed Voicing');
  }
  if (barres.length > 0) tags.push('Barre Chord');
  if (bassPitchClass === parsed.rootPitchClass) tags.push('Root in Bass');
  else tags.push('Inverted Bass');

  const fretted = frets.filter(f => f > 0);
  const fretSpan = fretted.length > 0 ? Math.max(...fretted) - Math.min(...fretted) : 0;
  if (fretSpan <= 2 && fretted.length >= 3) tags.push('Compact Reach');

  return { noteNames, pitchClasses, inversionLabel, tags, fretSpan };
}
