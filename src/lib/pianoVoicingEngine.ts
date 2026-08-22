/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NOTES } from '../constants.ts';

export type PianoVoicingStyle =
  | 'smooth_voice_leading'  // Optimal voice-leading minimizing motion between previous and next chord
  | 'lush_jazz_drop2'       // Open Drop-2 and 4-way guide tone voicings with rich color extensions
  | 'pop_open_spread'       // Open acoustic piano spread voicings with root/fifth bass + wide right hand
  | 'close_inversions'      // Smooth close-position triads & 7th inversions
  | 'root_position';        // Simple root position (classic)

export interface PianoVoicing {
  chordName: string;
  root: string;
  suffix: string;
  bassNote: number; // MIDI number (e.g. 36 = C2, 48 = C3)
  upperNotes: number[]; // MIDI numbers for right hand / harmony (e.g. [64, 67, 71, 74])
  allNotes: number[]; // [bassNote, ...upperNotes] sorted ascending
  noteNames: string[]; // ["C2", "E4", "G4", "B4", "D5"]
  label: string; // e.g. "Drop-2 Spread", "1st Inversion", "Type A (Rootless 3-7-9)", etc.
  inversionName?: string; // alias for label
  description?: string;
  style: PianoVoicingStyle;
  centerOfGravity: number; // Mean pitch of upper notes
  inversion?: 'root' | '1st' | '2nd' | '3rd' | 'open' | 'rootless';
  voiceLeadingDistance?: number;
}

export const ROOT_OFFSETS: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

export function midiToNoteName(midi: number): string {
  const noteName = NOTES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName}${octave}`;
}

export function midiToNoteNameWithOctave(midi: number): string {
  const noteName = NOTES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName}${octave}`;
}

export function calculateVoiceLeadingDistance(v1: PianoVoicing, v2: PianoVoicing): number {
  const upper1 = v1.upperNotes;
  const upper2 = v2.upperNotes;
  let totalDistance = 0;
  for (const p2 of upper2) {
    let minDist = 999;
    for (const p1 of upper1) {
      const dist = Math.abs(p2 - p1);
      if (dist < minDist) minDist = dist;
    }
    totalDistance += minDist;
  }
  return totalDistance;
}

export interface ParsedChordDetails {
  raw: string;
  root: string;
  normalizedRoot: string;
  rootPitchClass: number;
  suffix: string;
  bassRoot: string;
  bassPitchClass: number;
  isSlash: boolean;
  quality: 'major' | 'minor' | 'dominant7' | 'major7' | 'minor7' | 'diminished' | 'diminished7' | 'halfDiminished' | 'augmented' | 'sus2' | 'sus4' | 'extended' | 'unknown';
  intervals: number[];
  colorTones: number[]; // 9th, 11th, 13th, etc.
}

export function parseChordDetails(chordName: string): ParsedChordDetails | null {
  if (!chordName || !chordName.trim()) return null;
  const raw = chordName.trim();

  let mainPart = raw;
  let bassPart = '';
  const slashIdx = raw.indexOf('/');
  if (slashIdx !== -1) {
    mainPart = raw.substring(0, slashIdx);
    const afterSlash = raw.substring(slashIdx + 1);
    if (/^[A-G](?:##|𝄪|x|bb|𝄫|#|♯|b|♭)?/i.test(afterSlash)) {
      const match = afterSlash.match(/^([A-G](?:##|𝄪|x|bb|𝄫|#|♯|b|♭)?)/i);
      if (match) bassPart = match[1];
    }
  }

  const rootMatch = mainPart.match(/^([A-G](?:##|𝄪|x|bb|𝄫|#|♯|b|♭)?)(.*)$/i);
  if (!rootMatch) return null;

  let root = rootMatch[1];
  // Normalize root accidentals
  root = root.replace(/♯/g, '#').replace(/♭/g, 'b');
  let suffix = rootMatch[2] || '';
  suffix = suffix.replace(/♯/g, '#').replace(/♭/g, 'b');

  const FLAT_MAP: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
  };
  const normalizedRoot = FLAT_MAP[root] || root;
  const rootPitchClass = ROOT_OFFSETS[normalizedRoot] ?? 0;

  let bassRoot = bassPart ? (FLAT_MAP[bassPart.replace(/♯/g, '#').replace(/♭/g, 'b')] || bassPart.replace(/♯/g, '#').replace(/♭/g, 'b')) : normalizedRoot;
  let bassPitchClass = ROOT_OFFSETS[bassRoot] ?? rootPitchClass;

  // Classify suffix
  let s = suffix.toLowerCase();
  let quality: ParsedChordDetails['quality'] = 'major';
  let intervals = [0, 4, 7];
  let colorTones: number[] = [];

  if (s === '' || s === 'maj' || s === 'm' && suffix === 'M') {
    quality = 'major';
    intervals = [0, 4, 7];
  } else if (s === 'm' || s === 'min' || s === 'minor') {
    quality = 'minor';
    intervals = [0, 3, 7];
  } else if (s === '7' || s === 'dom7') {
    quality = 'dominant7';
    intervals = [0, 4, 7, 10];
  } else if (s === 'maj7' || s === 'm7+' || s === 'major7' || s === 'ma7') {
    quality = 'major7';
    intervals = [0, 4, 7, 11];
  } else if (s === 'm7' || s === 'min7' || s === 'minor7') {
    quality = 'minor7';
    intervals = [0, 3, 7, 10];
  } else if (s === 'dim' || s === 'o') {
    quality = 'diminished';
    intervals = [0, 3, 6];
  } else if (s === 'dim7' || s === 'o7') {
    quality = 'diminished7';
    intervals = [0, 3, 6, 9];
  } else if (s === 'm7b5' || s === 'min7b5' || s === 'ø' || s === 'ø7') {
    quality = 'halfDiminished';
    intervals = [0, 3, 6, 10];
  } else if (s === 'aug' || s === '+' || s === '+5') {
    quality = 'augmented';
    intervals = [0, 4, 8];
  } else if (s === 'sus2') {
    quality = 'sus2';
    intervals = [0, 2, 7];
  } else if (s === 'sus4' || s === 'sus') {
    quality = 'sus4';
    intervals = [0, 5, 7];
  } else if (s === 'add9' || s === 'add2') {
    quality = 'extended';
    intervals = [0, 4, 7, 14];
    colorTones = [14];
  } else if (s === 'madd9') {
    quality = 'extended';
    intervals = [0, 3, 7, 14];
    colorTones = [14];
  } else if (s === '6') {
    quality = 'extended';
    intervals = [0, 4, 7, 9];
    colorTones = [9];
  } else if (s === 'm6') {
    quality = 'extended';
    intervals = [0, 3, 7, 9];
    colorTones = [9];
  } else if (s === '69' || s === '6/9') {
    quality = 'extended';
    intervals = [0, 4, 7, 9, 14];
    colorTones = [9, 14];
  } else if (s === 'm69' || s === 'm6/9') {
    quality = 'extended';
    intervals = [0, 3, 7, 9, 14];
    colorTones = [9, 14];
  } else if (s === '9') {
    quality = 'extended';
    intervals = [0, 4, 7, 10, 14];
    colorTones = [14];
  } else if (s === 'maj9') {
    quality = 'extended';
    intervals = [0, 4, 7, 11, 14];
    colorTones = [14];
  } else if (s === 'm9' || s === 'min9') {
    quality = 'extended';
    intervals = [0, 3, 7, 10, 14];
    colorTones = [14];
  } else if (s === '11') {
    quality = 'extended';
    intervals = [0, 4, 7, 10, 14, 17];
    colorTones = [14, 17];
  } else if (s === 'm11' || s === 'min11') {
    quality = 'extended';
    intervals = [0, 3, 7, 10, 14, 17];
    colorTones = [14, 17];
  } else if (s === '13') {
    quality = 'extended';
    intervals = [0, 4, 7, 10, 14, 21];
    colorTones = [14, 21];
  } else if (s === '7#9') {
    quality = 'extended';
    intervals = [0, 4, 7, 10, 15];
    colorTones = [15];
  } else if (s === '7b9') {
    quality = 'extended';
    intervals = [0, 4, 7, 10, 13];
    colorTones = [13];
  } else if (s === '7b13') {
    quality = 'extended';
    intervals = [0, 4, 7, 10, 20];
    colorTones = [20];
  } else if (s === 'maj7#11') {
    quality = 'extended';
    intervals = [0, 4, 7, 11, 18];
    colorTones = [18];
  } else if (s === 'mmaj7') {
    quality = 'extended';
    intervals = [0, 3, 7, 11];
    colorTones = [11];
  } else {
    quality = 'major';
    intervals = [0, 4, 7];
  }

  return {
    raw,
    root,
    normalizedRoot,
    rootPitchClass,
    suffix,
    bassRoot,
    bassPitchClass,
    isSlash: !!bassPart,
    quality,
    intervals,
    colorTones
  };
}

/**
 * Generates an extensive collection of piano candidate voicings for a given chord
 */
export function generatePianoVoicingCandidates(chordName: string, preferredStyle?: PianoVoicingStyle): PianoVoicing[] {
  const details = parseChordDetails(chordName);
  if (!details) {
    // Fallback: simple C major voicing
    return [{
      chordName: chordName || 'C',
      root: 'C',
      suffix: '',
      bassNote: 48, // C3
      upperNotes: [60, 64, 67], // C4, E4, G4
      allNotes: [48, 60, 64, 67],
      noteNames: ['C3', 'C4', 'E4', 'G4'],
      label: 'Root Position',
      style: 'root_position',
      centerOfGravity: 63.67,
      inversion: 'root'
    }];
  }

  const { normalizedRoot, rootPitchClass, bassPitchClass, isSlash, quality, intervals } = details;

  // Determine low bass note (in octave 2 or 3: MIDI 36 to 53)
  // Low interval rule: C2 (36) to F3 (53)
  let baseBass = 36 + bassPitchClass;
  if (baseBass < 36) baseBass += 12;
  if (baseBass > 50) baseBass -= 12; // keep bass in warm, clear range 36..48

  const candidates: PianoVoicing[] = [];

  const addCandidate = (
    upperPitches: number[],
    label: string,
    style: PianoVoicingStyle,
    inversion?: PianoVoicing['inversion'],
    customBass?: number
  ) => {
    const bass = customBass ?? baseBass;
    // Filter and sort upper notes
    const upper = Array.from(new Set(upperPitches)).sort((a, b) => a - b);
    
    // Ensure all upper notes fall within playable keyboard span (MIDI 45 to 88)
    if (upper.some(n => n < 45 || n > 88)) return;
    if (upper.length === 0) return;

    // Check low interval limit: don't put 3rds or dense intervals below MIDI 48
    if (upper[0] < 48 && upper.length > 1 && (upper[1] - upper[0] <= 4)) return;

    const all = [bass, ...upper].sort((a, b) => a - b);
    const meanUpper = upper.reduce((sum, p) => sum + p, 0) / upper.length;
    const noteNames = all.map(midiToNoteNameWithOctave);

    candidates.push({
      chordName,
      root: normalizedRoot,
      suffix: details.suffix,
      bassNote: bass,
      upperNotes: upper,
      allNotes: all,
      noteNames,
      label,
      style,
      centerOfGravity: meanUpper,
      inversion: inversion || 'root'
    });
  };

  // Base pitch classes of chord tones
  const chordPCs = intervals.map(i => (rootPitchClass + i) % 12);
  const rootPC = rootPitchClass;
  const thirdPC = chordPCs[1] ?? (rootPC + 4) % 12;
  const fifthPC = chordPCs[2] ?? (rootPC + 7) % 12;
  const seventhPC = chordPCs.length >= 4 ? chordPCs[3] : undefined;
  const ninthPC = chordPCs.length >= 5 ? chordPCs[4] : undefined;

  // Build voicings across octaves 3, 4, 5
  // --- 1. TRIADS (Major, Minor, Diminished, Augmented, Sus2, Sus4) ---
  if (quality === 'major' || quality === 'minor' || quality === 'diminished' || quality === 'augmented' || quality === 'sus2' || quality === 'sus4') {
    for (let oct = 3; oct <= 5; oct++) {
      const r = (oct + 1) * 12 + rootPC;
      let t = (oct + 1) * 12 + thirdPC;
      if (t < r) t += 12; // ensure 3rd is above root in root octave
      let f = (oct + 1) * 12 + fifthPC;
      if (f < r) f += 12; // ensure 5th is above root in root octave

      // A. Close Triad Inversions
      // Root Position: [R, 3, 5]
      addCandidate([r, t, f], 'Root Position (Close)', 'close_inversions', 'root');
      addCandidate([r, t, f], 'Root Position', 'root_position', 'root');

      // 1st Inversion: [3, 5, R+12]
      addCandidate([t, f, r + 12], '1st Inversion (Close)', 'close_inversions', '1st');
      addCandidate([t, f, r + 12], '1st Inversion (Smooth)', 'smooth_voice_leading', '1st');

      // 2nd Inversion: [5, R+12, 3+12]
      addCandidate([f, r + 12, t + 12], '2nd Inversion (Close)', 'close_inversions', '2nd');
      addCandidate([f, r + 12, t + 12], '2nd Inversion (Smooth)', 'smooth_voice_leading', '2nd');

      // B. Open / Spread / Drop-2 Voicings (Lush, expansive piano sound)
      // Open 10th Spread: [R, 5, 3+12] (e.g. C4 - G4 - E5)
      addCandidate([r, f, t + 12], 'Open 10th Spread', 'pop_open_spread', 'open');
      addCandidate([r, f, t + 12], 'Smooth Open Triad', 'smooth_voice_leading', 'open');

      // Spread 2nd Inv: [5, 3+12, R+12] (e.g. G3 - E4 - C5)
      addCandidate([f - 12, t, r + 12], 'Spread 2nd Inversion', 'pop_open_spread', '2nd');
      addCandidate([f - 12, t, r + 12], 'Smooth Spread 2nd', 'smooth_voice_leading', '2nd');

      // Spread 1st Inv: [3, R+12, 5+12] (e.g. E3 - C4 - G4)
      addCandidate([t - 12, r, f], 'Spread 1st Inversion', 'pop_open_spread', '1st');

      // C. Rich 4-Voice Contemporary Pop Piano Voicings (Doubled root or 5th for harmonic warmth)
      // Full 4-Voice: [R, 5, R+12, 3+12] (e.g. C4 - G4 - C5 - E5)
      addCandidate([r, f, r + 12, t + 12], '4-Voice Pop Spread', 'pop_open_spread', 'open');
      addCandidate([r, f, r + 12, t + 12], 'Smooth 4-Voice Pop', 'smooth_voice_leading', 'open');

      // Full 4-Voice 2nd Inv: [5, R+12, 3+12, 5+12] (e.g. G3 - C4 - E4 - G4)
      addCandidate([f - 12, r, t, f], '4-Voice 2nd Inversion', 'pop_open_spread', '2nd');
      addCandidate([f - 12, r, t, f], 'Smooth 4-Voice 2nd', 'smooth_voice_leading', '2nd');

      // Add9 Contemporary Color Triad (if major or minor): [3, 5, 9, R+12]
      if (quality === 'major' || quality === 'minor') {
        const nine = (oct + 1) * 12 + ((rootPC + 2) % 12) + (rootPC + 2 >= 12 ? 12 : 0);
        addCandidate([t, f, nine, r + 12], 'Color Add9 Voicing', 'lush_jazz_drop2', 'open');
        addCandidate([t, f, nine, r + 12], 'Smooth Add9', 'smooth_voice_leading', 'open');
      }
    }
  }

  // --- 2. SEVENTH & EXTENDED CHORDS (7, maj7, m7, m7b5, dim7, 9, 11, 13, etc.) ---
  else {
    for (let oct = 3; oct <= 5; oct++) {
      const r = (oct + 1) * 12 + rootPC;
      let t = (oct + 1) * 12 + thirdPC;
      if (t < r) t += 12;
      let f = (oct + 1) * 12 + fifthPC;
      if (f < r) f += 12;
      let s = seventhPC !== undefined ? ((oct + 1) * 12 + seventhPC) : (r + 10);
      if (s < r) s += 12;
      let n = ninthPC !== undefined ? ((oct + 1) * 12 + ninthPC) : (r + 14);
      if (n < r) n += 12;

      // A. Standard 4-Way Close Inversions
      // Close Root: [R, 3, 5, 7]
      addCandidate([r, t, f, s], 'Root Position 7th', 'root_position', 'root');
      addCandidate([r, t, f, s], 'Close 7th (Root)', 'close_inversions', 'root');

      // Close 1st Inv: [3, 5, 7, R+12]
      addCandidate([t, f, s, r + 12], '1st Inversion 7th', 'close_inversions', '1st');
      addCandidate([t, f, s, r + 12], 'Smooth 1st Inv 7th', 'smooth_voice_leading', '1st');

      // Close 2nd Inv: [5, 7, R+12, 3+12]
      addCandidate([f, s, r + 12, t + 12], '2nd Inversion 7th', 'close_inversions', '2nd');
      addCandidate([f, s, r + 12, t + 12], 'Smooth 2nd Inv 7th', 'smooth_voice_leading', '2nd');

      // Close 3rd Inv: [7, R+12, 3+12, 5+12]
      addCandidate([s, r + 12, t + 12, f + 12], '3rd Inversion 7th', 'close_inversions', '3rd');
      addCandidate([s, r + 12, t + 12, f + 12], 'Smooth 3rd Inv 7th', 'smooth_voice_leading', '3rd');

      // B. Drop-2 Voicings (Quintessential lush, open jazz/broadway piano voicing)
      // Drop-2 from Close Root: [5-12, R, 3, 7] -> [5, R, 3, 7] (e.g. G3 - C4 - E4 - B4)
      addCandidate([f - 12, r, t, s], 'Drop-2 Root Position', 'lush_jazz_drop2', 'open');
      addCandidate([f - 12, r, t, s], 'Smooth Drop-2 (Root)', 'smooth_voice_leading', 'open');

      // Drop-2 from 1st Inv: [7-12, 3, 5, R+12] -> (e.g. B3 - E4 - G4 - C5)
      addCandidate([s - 12, t, f, r + 12], 'Drop-2 1st Inversion', 'lush_jazz_drop2', '1st');
      addCandidate([s - 12, t, f, r + 12], 'Smooth Drop-2 (1st Inv)', 'smooth_voice_leading', '1st');

      // Drop-2 from 2nd Inv: [R, 5, 7, 3+12] -> (e.g. C4 - G4 - B4 - E5)
      addCandidate([r, f, s, t + 12], 'Drop-2 2nd Inversion', 'lush_jazz_drop2', '2nd');
      addCandidate([r, f, s, t + 12], 'Smooth Drop-2 (2nd Inv)', 'smooth_voice_leading', '2nd');

      // Drop-2 from 3rd Inv: [3, 7, R+12, 5+12] -> (e.g. E3 - B3 - C4 - G4 or E4 - B4 - C5 - G5)
      addCandidate([t - 12, s - 12, r, f], 'Drop-2 3rd Inversion', 'lush_jazz_drop2', '3rd');
      addCandidate([t - 12, s - 12, r, f], 'Smooth Drop-2 (3rd Inv)', 'smooth_voice_leading', '3rd');
      addCandidate([t, s, r + 12, f + 12], 'Drop-2 3rd Inversion (High)', 'lush_jazz_drop2', '3rd');

      // C. Bill Evans Rootless Keyboard Voicings (Type A & Type B with 9ths/extensions)
      // Type A: [3, 5, 7, 9] or [3, 7, 9, 5] (3rd on bottom, e.g. E3 - G3 - B3 - D4 or E4 - A4 - B4 - D5)
      const nineNote = ((oct + 1) * 12 + ((rootPC + 2) % 12)) + (rootPC + 2 >= 12 ? 12 : 0);
      addCandidate([t, f, s, nineNote + 12], 'Type A Rootless (3-5-7-9)', 'lush_jazz_drop2', 'rootless');
      addCandidate([t, f, s, nineNote + 12], 'Smooth Jazz Type A', 'smooth_voice_leading', 'rootless');
      addCandidate([t - 12, f - 12, s - 12, nineNote], 'Type A Rootless (Mid)', 'lush_jazz_drop2', 'rootless');
      addCandidate([t - 12, f - 12, s - 12, nineNote], 'Smooth Jazz Type A (Mid)', 'smooth_voice_leading', 'rootless');

      // Type B: [7, 9, 3, 5] or [7, 3, 5, 9] (7th on bottom, e.g. B3 - D4 - E4 - G4)
      addCandidate([s - 12, nineNote, t, f], 'Type B Rootless (7-9-3-5)', 'lush_jazz_drop2', 'rootless');
      addCandidate([s - 12, nineNote, t, f], 'Smooth Jazz Type B', 'smooth_voice_leading', 'rootless');
      addCandidate([s, nineNote + 12, t + 12, f + 12], 'Type B Rootless (High)', 'lush_jazz_drop2', 'rootless');

      // D. Shell & Guide Tone Voicings (Clean, spacious 3-voice right hand)
      // [3, 7, R+12] or [3, 7, 9]
      addCandidate([t, s, r + 12], 'Guide-Tone Shell (3-7-R)', 'lush_jazz_drop2', 'open');
      addCandidate([t, s, r + 12], 'Smooth Guide Tone', 'smooth_voice_leading', 'open');
      addCandidate([s - 12, t, r + 12], 'Guide-Tone Shell (7-3-R)', 'lush_jazz_drop2', 'open');
      addCandidate([s - 12, t, r + 12], 'Smooth Guide Tone (7-3)', 'smooth_voice_leading', 'open');

      // E. Pop 4-Voice Open 7th: [R, 5, 7, 3+12]
      addCandidate([r, f, s, t + 12], 'Pop Open 7th Spread', 'pop_open_spread', 'open');
      addCandidate([r, f, s, t + 12], 'Smooth Pop 7th', 'smooth_voice_leading', 'open');
    }
  }

  // Deduplicate candidate voicings by unique sorted pitch list
  const uniqueMap = new Map<string, PianoVoicing>();
  for (const c of candidates) {
    const key = `${c.bassNote}_${c.upperNotes.join(',')}_${c.style}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }

  const result = Array.from(uniqueMap.values());
  return result.length > 0 ? result : [
    {
      chordName,
      root: normalizedRoot,
      suffix: details.suffix,
      bassNote: baseBass,
      upperNotes: [baseBass + 12, baseBass + 16, baseBass + 19],
      allNotes: [baseBass, baseBass + 12, baseBass + 16, baseBass + 19],
      noteNames: [baseBass, baseBass + 12, baseBass + 16, baseBass + 19].map(midiToNoteNameWithOctave),
      label: 'Root Position',
      style: 'root_position',
      centerOfGravity: baseBass + 15.67,
      inversion: 'root'
    }
  ];
}

/**
 * Calculates transition cost between two candidate voicings
 * Lower cost = smoother, more harmonious voice leading
 */
export function calculateVoiceLeadingCost(
  vPrev: PianoVoicing,
  vCurr: PianoVoicing,
  style: PianoVoicingStyle = 'smooth_voice_leading'
): number {
  let cost = 0;

  const prevUpper = vPrev.upperNotes;
  const currUpper = vCurr.upperNotes;

  // 1. Voice Matching & Distance (Minimal voice travel)
  // For each voice in currUpper, find the closest voice in prevUpper
  let totalDistance = 0;
  let maxSingleVoiceJump = 0;
  let sharedCommonTones = 0;
  let stepMovements = 0;

  for (const pCurr of currUpper) {
    let minDist = 999;
    for (const pPrev of prevUpper) {
      const dist = Math.abs(pCurr - pPrev);
      if (dist < minDist) {
        minDist = dist;
      }
      if (pCurr === pPrev) {
        sharedCommonTones++;
      }
    }
    totalDistance += minDist * minDist; // quadratic penalty for larger jumps
    if (minDist > maxSingleVoiceJump) maxSingleVoiceJump = minDist;
    if (minDist === 1 || minDist === 2) stepMovements++;
  }

  cost += totalDistance * 1.5;

  // Golden Rule 1: Common Tone Retention (Major bonus)
  cost -= sharedCommonTones * 35;

  // Golden Rule 2: Stepwise Motion (1 or 2 semitones)
  cost -= stepMovements * 18;

  // Severe penalty for big jumps in individual voice lines
  if (maxSingleVoiceJump >= 4) {
    cost += (maxSingleVoiceJump - 3) * 20;
  }
  if (maxSingleVoiceJump >= 7) {
    cost += (maxSingleVoiceJump - 6) * 45;
  }

  // 2. Center of Gravity (Register Balance)
  // Ideal keyboard sweet spot center of gravity is around Middle C to F#4 (MIDI 60 to 66)
  const idealCenter = 63; // Eb4
  const centerDiff = Math.abs(vCurr.centerOfGravity - idealCenter);
  cost += centerDiff * 1.2;

  // Penalize big jumps in center of gravity between chords
  const cogJump = Math.abs(vCurr.centerOfGravity - vPrev.centerOfGravity);
  cost += cogJump * 2.5;

  // 3. Bass Motion
  // Smooth bass intervals (stepwise or fourths/fifths) are natural; avoid octave bouncing
  const bassJump = Math.abs(vCurr.bassNote - vPrev.bassNote);
  if (bassJump === 0) {
    cost -= 15; // Pedal bass bonus
  } else if (bassJump <= 2) {
    cost -= 10; // Stepwise bass bonus
  } else if (bassJump === 5 || bassJump === 7) {
    cost -= 5; // 4th/5th standard cycle
  } else if (bassJump > 7) {
    cost += (bassJump - 7) * 8; // penalty for wide bass leaps
  }

  // Keep bass in sweet foundation range (MIDI 36..48)
  if (vCurr.bassNote < 36) cost += (36 - vCurr.bassNote) * 15;
  if (vCurr.bassNote > 50) cost += (vCurr.bassNote - 50) * 15;

  // 4. Style Preferences
  if (style === 'smooth_voice_leading') {
    // Heavily reward smoothness and common tones
    if (vCurr.style === 'smooth_voice_leading') cost -= 10;
  } else if (style === 'lush_jazz_drop2') {
    if (vCurr.style === 'lush_jazz_drop2') cost -= 25;
    if (vCurr.label.includes('Drop-2') || vCurr.label.includes('Rootless')) cost -= 20;
  } else if (style === 'pop_open_spread') {
    if (vCurr.style === 'pop_open_spread') cost -= 25;
    if (vCurr.label.includes('Spread') || vCurr.label.includes('4-Voice')) cost -= 20;
  } else if (style === 'close_inversions') {
    if (vCurr.style === 'close_inversions') cost -= 20;
  } else if (style === 'root_position') {
    if (vCurr.style === 'root_position') cost -= 35;
  }

  return cost;
}

/**
 * Optimizes an entire chord progression using Dynamic Programming (Viterbi Search)
 * Takes into account both forward and cyclic (wrap-around) transitions for seamless accompaniment loops.
 */
export function solveProgressionVoicings(
  chordSequence: (string | null | undefined)[],
  style: PianoVoicingStyle = 'smooth_voice_leading'
): PianoVoicing[] {
  // Filter out empty entries while preserving chord indices
  const validEntries: { chord: string; origIndex: number }[] = [];
  chordSequence.forEach((ch, idx) => {
    if (ch && ch.trim()) {
      validEntries.push({ chord: ch.trim(), origIndex: idx });
    }
  });

  if (validEntries.length === 0) return [];

  if (validEntries.length === 1) {
    const candidates = generatePianoVoicingCandidates(validEntries[0].chord);
    const chosen = selectBestIsolatedVoicing(candidates, style);
    return [chosen];
  }

  // Pre-generate candidate voicings for each chord in the sequence
  const stages: PianoVoicing[][] = validEntries.map(entry => {
    const allCandidates = generatePianoVoicingCandidates(entry.chord);
    // Filter candidates by style if strictly requested, but ensure fallback
    if (style === 'root_position') {
      const rootOnly = allCandidates.filter(c => c.style === 'root_position');
      return rootOnly.length > 0 ? rootOnly : allCandidates;
    }
    return allCandidates;
  });

  const N = stages.length;

  // We perform Viterbi search. To support looping smoothly from end back to start,
  // we test each possible starting voicing in stage 0.
  let globalBestVoicings: PianoVoicing[] = [];
  let globalMinCost = Infinity;

  // For performance, test top candidate starting points in stage 0
  const startCandidates = stages[0].slice(0, Math.min(stages[0].length, 8));

  for (const startVoicing of startCandidates) {
    // dp[stageIndex][candidateIndex] = min cost to reach here
    // parent[stageIndex][candidateIndex] = parent candidateIndex
    const dp: number[][] = [];
    const parent: number[][] = [];

    for (let i = 0; i < N; i++) {
      dp[i] = new Array(stages[i].length).fill(Infinity);
      parent[i] = new Array(stages[i].length).fill(-1);
    }

    // Initialize stage 0 with startVoicing
    const startIdx = stages[0].indexOf(startVoicing);
    if (startIdx === -1) continue;
    dp[0][startIdx] = Math.abs(startVoicing.centerOfGravity - 63) * 0.8;

    // Forward pass
    for (let i = 1; i < N; i++) {
      for (let j = 0; j < stages[i].length; j++) {
        const vCurr = stages[i][j];
        for (let k = 0; k < stages[i - 1].length; k++) {
          if (dp[i - 1][k] === Infinity) continue;
          const vPrev = stages[i - 1][k];
          const transitionCost = calculateVoiceLeadingCost(vPrev, vCurr, style);
          const totalCost = dp[i - 1][k] + transitionCost;
          if (totalCost < dp[i][j]) {
            dp[i][j] = totalCost;
            parent[i][j] = k;
          }
        }
      }
    }

    // Add loop-back wrap-around cost from stage N-1 back to stage 0 startVoicing
    for (let j = 0; j < stages[N - 1].length; j++) {
      if (dp[N - 1][j] === Infinity) continue;
      const wrapCost = calculateVoiceLeadingCost(stages[N - 1][j], startVoicing, style);
      const totalLoopCost = dp[N - 1][j] + wrapCost;

      if (totalLoopCost < globalMinCost) {
        globalMinCost = totalLoopCost;

        // Backtrack optimal path
        const path: PianoVoicing[] = new Array(N);
        let currNode = j;
        for (let i = N - 1; i >= 1; i--) {
          path[i] = stages[i][currNode];
          currNode = parent[i][currNode];
        }
        path[0] = stages[0][startIdx];
        globalBestVoicings = path;
      }
    }
  }

  // Fallback if loop search didn't complete
  if (globalBestVoicings.length === 0) {
    globalBestVoicings = stages.map(st => selectBestIsolatedVoicing(st, style));
  }

  return globalBestVoicings;
}

/**
 * Selects the most balanced standalone voicing when no progression context exists
 */
export function selectBestIsolatedVoicing(
  candidates: PianoVoicing[],
  style: PianoVoicingStyle = 'smooth_voice_leading'
): PianoVoicing {
  if (candidates.length === 0) {
    return {
      chordName: 'C',
      root: 'C',
      suffix: '',
      bassNote: 48,
      upperNotes: [60, 64, 67],
      allNotes: [48, 60, 64, 67],
      noteNames: ['C3', 'C4', 'E4', 'G4'],
      label: 'Root Position',
      style: 'root_position',
      centerOfGravity: 63.67
    };
  }

  let best = candidates[0];
  let minCost = Infinity;

  for (const c of candidates) {
    let cost = 0;

    // Sweet spot center of gravity around Middle C to F#4 (MIDI 60..66)
    cost += Math.abs(c.centerOfGravity - 63) * 3;

    // Bass note in comfortable range
    cost += Math.abs(c.bassNote - 40) * 1.5;

    // Prefer styled voicings
    if (style === 'lush_jazz_drop2' && c.style === 'lush_jazz_drop2') cost -= 20;
    if (style === 'pop_open_spread' && c.style === 'pop_open_spread') cost -= 20;
    if (style === 'close_inversions' && c.style === 'close_inversions') cost -= 15;
    if (style === 'root_position' && c.style === 'root_position') cost -= 30;

    if (cost < minCost) {
      minCost = cost;
      best = c;
    }
  }

  return best;
}

/**
 * Context-aware voice leading resolver for real-time chord playback
 */
export function getVoiceLedVoicing(
  chordName: string,
  prevVoicing?: PianoVoicing | null,
  nextChordName?: string | null,
  style: PianoVoicingStyle = 'smooth_voice_leading'
): PianoVoicing {
  const candidates = generatePianoVoicingCandidates(chordName);
  if (!candidates || candidates.length === 0) {
    return selectBestIsolatedVoicing(candidates, style);
  }

  if (!prevVoicing && !nextChordName) {
    return selectBestIsolatedVoicing(candidates, style);
  }

  // If we have nextChordName, also generate next candidates to evaluate forward voice leading
  const nextCandidates = nextChordName ? generatePianoVoicingCandidates(nextChordName) : null;

  let best = candidates[0];
  let minCost = Infinity;

  for (const c of candidates) {
    let cost = 0;

    if (prevVoicing) {
      cost += calculateVoiceLeadingCost(prevVoicing, c, style);
    } else {
      cost += Math.abs(c.centerOfGravity - 63) * 2;
    }

    if (nextCandidates && nextCandidates.length > 0) {
      // Find min cost to any viable next candidate
      let minNextCost = Infinity;
      for (const n of nextCandidates) {
        const nCost = calculateVoiceLeadingCost(c, n, style);
        if (nCost < minNextCost) minNextCost = nCost;
      }
      cost += minNextCost * 0.8; // include anticipated next chord voice leading!
    }

    if (cost < minCost) {
      minCost = cost;
      best = c;
    }
  }

  return best;
}

/**
 * Returns clean voiced MIDI note numbers for a chord with optional voice leading context
 */
export function getVoicedMidiNotes(
  chordName: string,
  options?: {
    prevChord?: string | null;
    nextChord?: string | null;
    prevVoicing?: PianoVoicing | null;
    style?: PianoVoicingStyle;
  }
): number[] {
  let prevVoicing = options?.prevVoicing;
  if (!prevVoicing && options?.prevChord) {
    prevVoicing = selectBestIsolatedVoicing(generatePianoVoicingCandidates(options.prevChord), options.style);
  }

  const voicing = getVoiceLedVoicing(
    chordName,
    prevVoicing,
    options?.nextChord,
    options?.style || 'smooth_voice_leading'
  );

  return voicing.allNotes;
}
