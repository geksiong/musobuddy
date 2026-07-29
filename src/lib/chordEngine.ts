/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NOTES } from '../constants.ts';

export type InstrumentName = 'guitar' | 'ukulele' | 'mandolin';

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
    fretsOnChord: 4,
    maxFrets: 18,
    maxSpan: 4,
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
  return suffix;
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
        const isOpenOnly = frettedInSearch.length === 0;
        const hasOpen = currentFrets.includes(0);
        const effectiveBaseFret = (isOpenOnly || hasOpen) ? 1 : B;

        const { score, barres } = scoreVoicing(currentFrets, effectiveBaseFret, parsed, tuning, numStrings);
        if (score > 0) {
          candidates.push({
            frets: [...currentFrets],
            baseFret: effectiveBaseFret,
            barres: (isOpenOnly || hasOpen) ? [] : barres,
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
    const fingers = computeFingers(c.frets, c.barres);
    const { noteNames, pitchClasses, inversionLabel, tags, fretSpan } = computeVoicingMetadata(
      c.frets,
      c.baseFret,
      c.barres,
      tuning,
      parsed
    );

    // Calculate actual baseFret for rendering (1 if open strings present, otherwise min fretted)
    const fretted = c.frets.filter(f => f > 0);
    const displayBaseFret = (c.frets.includes(0) || fretted.length === 0) 
      ? 1 
      : Math.min(...fretted);

    return {
      frets: c.frets,
      fingers,
      baseFret: displayBaseFret,
      barres: c.barres,
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
      // Mandolin/Ukulele frets are closer together; scale span reach penalty gently
      score += Math.max(-20, (4 - span) * 10);
    } else {
      score += (4 - span) * 20; // Prefer smaller fret reach for guitar
    }

    // Position height: prefer lower fretboard positions for ease
    score += Math.max(0, (12 - minFret) * 4);
  }

  // 4. Closed 4-string chop chord / movable shape bonus
  if (numStrings <= 4 && frets.length === 4 && frets.every(f => f > 0)) {
    score += 60; // High bonus for 4-string closed chop chords
  }

  // 5. Open strings bonus
  const openCount = frets.filter(f => f === 0).length;
  score += openCount * 25;

  // 5. Sounding string count
  score += soundingIndices.length * 15;

  // 6. Muted string penalty
  const mutedCount = frets.filter(f => f === -1).length;
  score -= mutedCount * 15;

  // Inner muted strings penalty
  for (let i = soundingIndices[0]; i <= soundingIndices[soundingIndices.length - 1]; i++) {
    if (frets[i] === -1) score -= 35;
  }

  // 7. Barre detection & bonus
  const barres: number[] = [];
  if (fretted.length >= 2) {
    const minFret = Math.min(...fretted);
    const stringsAtMinFret = frets.map((f, i) => (f === minFret ? i : -1)).filter(i => i >= 0);

    if (stringsAtMinFret.length >= 2) {
      // Check if no string has a lower fret than minFret
      const lowestFretInVoicing = Math.min(...frets.filter(f => f > 0));
      if (lowestFretInVoicing === minFret && !frets.includes(0)) {
        barres.push(minFret);
        score += 35; // Clean barre chord bonus
      }
    }
  }

  return { score, barres };
}

/**
 * Assign ergonomic fingerings (1=index, 2=middle, 3=ring, 4=pinky)
 */
function computeFingers(frets: number[], barres: number[]): number[] {
  const fingers = new Array(frets.length).fill(0);
  const fretted = frets.map((f, i) => ({ fret: f, stringIndex: i })).filter(item => item.fret > 0);

  if (fretted.length === 0) return fingers;

  const minFret = Math.min(...fretted.map(item => item.fret));

  // If a barre exists at minFret, Finger 1 takes all strings at minFret
  let currentFinger = 1;
  const isBarreAtMin = barres.includes(minFret);

  if (isBarreAtMin) {
    fretted.forEach(item => {
      if (item.fret === minFret) {
        fingers[item.stringIndex] = 1;
      }
    });
    currentFinger = 2;
  }

  // Group remaining fretted strings by fret ascending
  const remaining = fretted.filter(item => fingers[item.stringIndex] === 0);
  remaining.sort((a, b) => a.fret - b.fret || a.stringIndex - b.stringIndex);

  let lastFret = -1;
  for (const item of remaining) {
    if (lastFret !== -1 && item.fret > lastFret) {
      currentFinger = Math.min(4, currentFinger + 1);
    }
    fingers[item.stringIndex] = currentFinger;
    lastFret = item.fret;
    if (!isBarreAtMin && currentFinger < 4) {
      currentFinger++;
    }
  }

  return fingers;
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
