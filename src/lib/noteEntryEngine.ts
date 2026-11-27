/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getErhuKeyInfo } from './musojianpu/erhuKeys.ts';

export type NoteEntryFormat = 'abc' | 'jianpu';

export type NoteDurationId = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth' | 'thirtysecond';

export interface NoteDurationDef {
  id: NoteDurationId;
  label: string;
  shortLabel: string;
  symbol: string;
  /** Duration in quarter-note beats */
  beats: number;
  shortcutKey: string;
  shortcutCode: string;
}

export const NOTE_DURATIONS: NoteDurationDef[] = [
  { id: 'whole', label: 'Whole', shortLabel: '1', symbol: '𝅝', beats: 4, shortcutKey: '1', shortcutCode: 'Digit1' },
  { id: 'half', label: 'Half', shortLabel: '1/2', symbol: '𝅗𝅥', beats: 2, shortcutKey: '2', shortcutCode: 'Digit2' },
  { id: 'quarter', label: 'Quarter', shortLabel: '1/4', symbol: '𝅘𝅥', beats: 1, shortcutKey: '3', shortcutCode: 'Digit3' },
  { id: 'eighth', label: 'Eighth', shortLabel: '1/8', symbol: '𝅘𝅥𝅮', beats: 0.5, shortcutKey: '4', shortcutCode: 'Digit4' },
  { id: 'sixteenth', label: '16th', shortLabel: '1/16', symbol: '𝅘𝅥𝅯', beats: 0.25, shortcutKey: '5', shortcutCode: 'Digit5' },
  { id: 'thirtysecond', label: '32nd', shortLabel: '1/32', symbol: '𝅘𝅥𝅰', beats: 0.125, shortcutKey: '6', shortcutCode: 'Digit6' },
];

export interface RootNoteOption {
  semitone: number; // 0 = C .. 11 = B
  name: string;     // Canonical key name e.g. 'C', 'Db', 'D', 'Eb', ...
  label: string;    // Display label e.g. 'C', 'C♯ / D♭'
  abcRoot: string;  // ABC key root e.g. 'C', 'Db', 'F#', 'Bb'
  jianpuKey: string; // Matching erhuKeys key name
  preferFlats: boolean;
}

export const ROOT_NOTES: RootNoteOption[] = [
  { semitone: 0,  name: 'C',  label: 'C',       abcRoot: 'C',  jianpuKey: 'C',  preferFlats: false },
  { semitone: 1,  name: 'Db', label: 'C♯ / D♭', abcRoot: 'Db', jianpuKey: 'Db', preferFlats: true },
  { semitone: 2,  name: 'D',  label: 'D',       abcRoot: 'D',  jianpuKey: 'D',  preferFlats: false },
  { semitone: 3,  name: 'Eb', label: 'E♭ / D♯', abcRoot: 'Eb', jianpuKey: 'Eb', preferFlats: true },
  { semitone: 4,  name: 'E',  label: 'E',       abcRoot: 'E',  jianpuKey: 'E',  preferFlats: false },
  { semitone: 5,  name: 'F',  label: 'F',       abcRoot: 'F',  jianpuKey: 'F',  preferFlats: true },
  { semitone: 6,  name: 'F#', label: 'F♯ / G♭', abcRoot: 'F#', jianpuKey: 'Gb', preferFlats: false },
  { semitone: 7,  name: 'G',  label: 'G',       abcRoot: 'G',  jianpuKey: 'G',  preferFlats: false },
  { semitone: 8,  name: 'Ab', label: 'A♭ / G♯', abcRoot: 'Ab', jianpuKey: 'Ab', preferFlats: true },
  { semitone: 9,  name: 'A',  label: 'A',       abcRoot: 'A',  jianpuKey: 'A',  preferFlats: false },
  { semitone: 10, name: 'Bb', label: 'B♭ / A♯', abcRoot: 'Bb', jianpuKey: 'Bb', preferFlats: true },
  { semitone: 11, name: 'B',  label: 'B',       abcRoot: 'B',  jianpuKey: 'B',  preferFlats: false },
];

export type ScaleModeId =
  | 'chromatic'
  | 'major'
  | 'minor'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'locrian'
  | 'harmonic_minor'
  | 'melodic_minor'
  | 'pentatonic_major'
  | 'pentatonic_minor'
  | 'pentatonic_shang'
  | 'pentatonic_jue'
  | 'pentatonic_zhi'
  | 'insen'
  | 'hirajoshi'
  | 'blues'
  | 'whole_tone';

export interface ScaleModeDef {
  id: ScaleModeId;
  name: string;
  category: 'Chromatic' | 'Church Modes' | 'Minor' | 'Pentatonic & East Asian' | 'Other';
  intervals: number[];
  degreeLabels: string[];
  /** ABC K: suffix e.g. '', 'm', 'dor', 'mix', 'lyd', 'phr', 'loc' */
  abcModeSuffix: string;
  preferFlats?: boolean;
}

export const SCALE_MODES: ScaleModeDef[] = [
  {
    id: 'chromatic',
    name: 'Chromatic (All 12)',
    category: 'Chromatic',
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    degreeLabels: ['1', '♯1', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'],
    abcModeSuffix: '',
  },
  {
    id: 'major',
    name: 'Major (Ionian)',
    category: 'Church Modes',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    degreeLabels: ['1', '2', '3', '4', '5', '6', '7'],
    abcModeSuffix: '',
  },
  {
    id: 'dorian',
    name: 'Dorian',
    category: 'Church Modes',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    degreeLabels: ['1', '2', '♭3', '4', '5', '6', '♭7'],
    abcModeSuffix: 'dor',
  },
  {
    id: 'phrygian',
    name: 'Phrygian',
    category: 'Church Modes',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    degreeLabels: ['1', '♭2', '♭3', '4', '5', '♭6', '♭7'],
    abcModeSuffix: 'phr',
    preferFlats: true,
  },
  {
    id: 'lydian',
    name: 'Lydian',
    category: 'Church Modes',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    degreeLabels: ['1', '2', '3', '♯4', '5', '6', '7'],
    abcModeSuffix: 'lyd',
    preferFlats: false,
  },
  {
    id: 'mixolydian',
    name: 'Mixolydian',
    category: 'Church Modes',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    degreeLabels: ['1', '2', '3', '4', '5', '6', '♭7'],
    abcModeSuffix: 'mix',
  },
  {
    id: 'minor',
    name: 'Natural Minor (Aeolian)',
    category: 'Church Modes',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    degreeLabels: ['1', '2', '♭3', '4', '5', '♭6', '♭7'],
    abcModeSuffix: 'm',
    preferFlats: true,
  },
  {
    id: 'locrian',
    name: 'Locrian',
    category: 'Church Modes',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    degreeLabels: ['1', '♭2', '♭3', '4', '♭5', '♭6', '♭7'],
    abcModeSuffix: 'loc',
    preferFlats: true,
  },
  {
    id: 'harmonic_minor',
    name: 'Harmonic Minor',
    category: 'Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    degreeLabels: ['1', '2', '♭3', '4', '5', '♭6', '7'],
    abcModeSuffix: 'm',
  },
  {
    id: 'melodic_minor',
    name: 'Melodic Minor (Asc)',
    category: 'Minor',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    degreeLabels: ['1', '2', '♭3', '4', '5', '6', '7'],
    abcModeSuffix: 'm',
  },
  {
    id: 'pentatonic_major',
    name: 'Major Pentatonic (宫调)',
    category: 'Pentatonic & East Asian',
    intervals: [0, 2, 4, 7, 9],
    degreeLabels: ['1', '2', '3', '5', '6'],
    abcModeSuffix: '',
  },
  {
    id: 'pentatonic_minor',
    name: 'Minor Pentatonic (羽调)',
    category: 'Pentatonic & East Asian',
    intervals: [0, 3, 5, 7, 10],
    degreeLabels: ['1', '♭3', '4', '5', '♭7'],
    abcModeSuffix: 'm',
    preferFlats: true,
  },
  {
    id: 'pentatonic_shang',
    name: 'Shang Pentatonic (商调)',
    category: 'Pentatonic & East Asian',
    intervals: [0, 2, 5, 7, 10],
    degreeLabels: ['1', '2', '4', '5', '♭7'],
    abcModeSuffix: 'dor',
  },
  {
    id: 'pentatonic_jue',
    name: 'Jue Pentatonic (角调)',
    category: 'Pentatonic & East Asian',
    intervals: [0, 3, 5, 8, 10],
    degreeLabels: ['1', '♭3', '4', '♭6', '♭7'],
    abcModeSuffix: 'phr',
    preferFlats: true,
  },
  {
    id: 'pentatonic_zhi',
    name: 'Zhi Pentatonic (徵调)',
    category: 'Pentatonic & East Asian',
    intervals: [0, 2, 5, 7, 9],
    degreeLabels: ['1', '2', '4', '5', '6'],
    abcModeSuffix: 'mix',
  },
  {
    id: 'insen',
    name: 'In-sen (陰旋 / Shakuhachi)',
    category: 'Pentatonic & East Asian',
    intervals: [0, 1, 5, 7, 10],
    degreeLabels: ['1', '♭2', '4', '5', '♭7'],
    abcModeSuffix: 'phr',
    preferFlats: true,
  },
  {
    id: 'hirajoshi',
    name: 'Hirajoshi (平調子)',
    category: 'Pentatonic & East Asian',
    intervals: [0, 2, 3, 7, 8],
    degreeLabels: ['1', '2', '♭3', '5', '♭6'],
    abcModeSuffix: 'm',
    preferFlats: true,
  },
  {
    id: 'blues',
    name: 'Blues',
    category: 'Other',
    intervals: [0, 3, 5, 6, 7, 10],
    degreeLabels: ['1', '♭3', '4', '♭5', '5', '♭7'],
    abcModeSuffix: 'm',
    preferFlats: true,
  },
  {
    id: 'whole_tone',
    name: 'Whole Tone',
    category: 'Other',
    intervals: [0, 2, 4, 6, 8, 10],
    degreeLabels: ['1', '2', '3', '♯4', '♯5', '♭7'],
    abcModeSuffix: '',
  },
];

export function getScaleMode(modeId: ScaleModeId): ScaleModeDef {
  return SCALE_MODES.find(m => m.id === modeId) || SCALE_MODES[0];
}

export function getRootOption(semitone: number): RootNoteOption {
  const norm = ((semitone % 12) + 12) % 12;
  return ROOT_NOTES[norm] || ROOT_NOTES[0];
}

const SHARP_PITCH_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT_PITCH_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

export function midiToScientificPitch(midi: number, preferFlats: boolean = false): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const name = preferFlats ? FLAT_PITCH_NAMES[pc] : SHARP_PITCH_NAMES[pc];
  return `${name}${octave}`;
}

/**
 * Keyboard shortcut slots for Modal / Scale keyboard view (11 home-row keys + 1 optional)
 * Using e.code ensures Shift + key works identically on all keyboard layouts!
 */
export interface KeyboardSlot {
  code: string;
  label: string;
}

export const MODAL_KEYBOARD_SLOTS: KeyboardSlot[] = [
  { code: 'KeyA', label: 'A' },
  { code: 'KeyS', label: 'S' },
  { code: 'KeyD', label: 'D' },
  { code: 'KeyF', label: 'F' },
  { code: 'KeyG', label: 'G' },
  { code: 'KeyH', label: 'H' },
  { code: 'KeyJ', label: 'J' },
  { code: 'KeyK', label: 'K' },
  { code: 'KeyL', label: 'L' },
  { code: 'Semicolon', label: ';' },
  { code: 'Quote', label: "'" },
];

/**
 * Standard DAW chromatic QWERTY piano layout mapped by semitone offset from C of base octave (0..17):
 * White keys: A(C) S(D) D(E) F(F) G(G) H(A) J(B) K(C') L(D') ;(E') '(F')
 * Black keys: W(C#) E(D#) T(F#) Y(G#) U(A#) O(C#') P(D#')
 */
export const PIANO_SEMITONE_TO_SLOT: Record<number, KeyboardSlot> = {
  0:  { code: 'KeyA', label: 'A' },
  1:  { code: 'KeyW', label: 'W' },
  2:  { code: 'KeyS', label: 'S' },
  3:  { code: 'KeyE', label: 'E' },
  4:  { code: 'KeyD', label: 'D' },
  5:  { code: 'KeyF', label: 'F' },
  6:  { code: 'KeyT', label: 'T' },
  7:  { code: 'KeyG', label: 'G' },
  8:  { code: 'KeyY', label: 'Y' },
  9:  { code: 'KeyH', label: 'H' },
  10: { code: 'KeyU', label: 'U' },
  11: { code: 'KeyJ', label: 'J' },
  12: { code: 'KeyK', label: 'K' },
  13: { code: 'KeyO', label: 'O' },
  14: { code: 'KeyL', label: 'L' },
  15: { code: 'KeyP', label: 'P' },
  16: { code: 'Semicolon', label: ';' },
  17: { code: 'Quote', label: "'" },
};

export interface VirtualModalKey {
  index: number;
  midi: number;
  pitchName: string;
  degreeLabel: string;
  isRoot: boolean;
  octaveOffsetFromRoot: number;
  shortcutCode?: string;
  shortcutLabel?: string;
}

/**
 * Generates tactile modal scale keys starting at (rootSemitone, baseOctave + (shiftHeld ? 1 : 0))
 */
export function buildModalKeys(
  rootSemitone: number,
  baseOctave: number,
  modeId: ScaleModeId,
  shiftHeld: boolean,
  preferFlats: boolean
): VirtualModalKey[] {
  const mode = getScaleMode(modeId);
  const effectiveOctave = Math.min(7, Math.max(1, baseOctave + (shiftHeld ? 1 : 0)));
  const rootMidi = (effectiveOctave + 1) * 12 + (((rootSemitone % 12) + 12) % 12);
  const count = MODAL_KEYBOARD_SLOTS.length;
  const intervals = mode.intervals;
  const keys: VirtualModalKey[] = [];

  for (let i = 0; i < count; i++) {
    const octWrap = Math.floor(i / intervals.length);
    const degIdx = i % intervals.length;
    const midi = Math.min(108, Math.max(24, rootMidi + octWrap * 12 + intervals[degIdx]));
    const slot = MODAL_KEYBOARD_SLOTS[i];
    keys.push({
      index: i,
      midi,
      pitchName: midiToScientificPitch(midi, preferFlats),
      degreeLabel: mode.degreeLabels[degIdx] || String(degIdx + 1),
      isRoot: degIdx === 0,
      octaveOffsetFromRoot: octWrap,
      shortcutCode: slot?.code,
      shortcutLabel: slot?.label,
    });
  }

  return keys;
}

export interface VirtualPianoKey {
  semitoneOffset: number; // 0..24 from C of effectiveOctave
  midi: number;
  pitchClass: number;
  isBlack: boolean;
  pitchName: string;
  isRoot: boolean;
  inScale: boolean;
  degreeLabel: string | null;
  shortcutCode?: string;
  shortcutLabel?: string;
}

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

/**
 * Generates a 2-octave + top C (25-key) piano layout starting at C of (baseOctave + (shiftHeld ? 1 : 0)),
 * marking Root & Mode scale membership clearly.
 */
export function buildPianoKeys(
  rootSemitone: number,
  baseOctave: number,
  modeId: ScaleModeId,
  shiftHeld: boolean,
  preferFlats: boolean
): VirtualPianoKey[] {
  const mode = getScaleMode(modeId);
  const effectiveOctave = Math.min(6, Math.max(1, baseOctave + (shiftHeld ? 1 : 0)));
  const startMidi = (effectiveOctave + 1) * 12; // C of effectiveOctave
  const normRoot = ((rootSemitone % 12) + 12) % 12;
  const intervalMap = new Map<number, string>();
  mode.intervals.forEach((iv, idx) => {
    intervalMap.set(iv % 12, mode.degreeLabels[idx] || String(idx + 1));
  });

  const keys: VirtualPianoKey[] = [];
  for (let offset = 0; offset <= 24; offset++) {
    const midi = Math.min(108, Math.max(24, startMidi + offset));
    const pc = ((midi % 12) + 12) % 12;
    const relToRoot = ((pc - normRoot) + 12) % 12;
    const inScale = mode.id === 'chromatic' ? true : intervalMap.has(relToRoot);
    const slot = PIANO_SEMITONE_TO_SLOT[offset];

    keys.push({
      semitoneOffset: offset,
      midi,
      pitchClass: pc,
      isBlack: BLACK_PCS.has(pc),
      pitchName: midiToScientificPitch(midi, preferFlats),
      isRoot: pc === normRoot,
      inScale,
      degreeLabel: intervalMap.get(relToRoot) ?? null,
      shortcutCode: slot?.code,
      shortcutLabel: slot?.label,
    });
  }
  return keys;
}

/* ============================================================================
 * ABC Notation Key Signature, Unit Length & Pitch Formatting
 * ========================================================================== */

export interface AbcScoreContext {
  /** Key root semitone 0..11 */
  rootSemitone: number;
  /** Detected mode id */
  modeId: ScaleModeId;
  /** Raw K: value e.g. 'C', 'Edor', 'G' */
  rawKey: string;
  /** Map from letter 'A'..'G' to accidental offset (-1, 0, +1) implied by K: */
  keySignatureMap: Record<string, number>;
  /** True if key signature uses flats */
  useFlats: boolean;
  /** Default unit length in quarter-note beats (e.g., L:1/8 => 0.5, L:1/4 => 1, L:1/16 => 0.25) */
  unitBeats: number;
  /** Raw M: meter value if present */
  meter: string;
}

const LETTER_BASE_PC: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/** Major key fifths position (-7..+7) by root name */
const MAJOR_KEY_FIFTHS: Record<string, number> = {
  Cb: -7, Gb: -6, Db: -5, Ab: -4, Eb: -3, Bb: -2, F: -1,
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
};

/** Mode shift in circle-of-fifths relative to major/ionian */
const MODE_FIFTHS_SHIFT: Record<string, { shift: number; modeId: ScaleModeId }> = {
  '':    { shift: 0,  modeId: 'major' },
  maj:   { shift: 0,  modeId: 'major' },
  ion:   { shift: 0,  modeId: 'major' },
  lyd:   { shift: 1,  modeId: 'lydian' },
  mix:   { shift: -1, modeId: 'mixolydian' },
  dor:   { shift: -2, modeId: 'dorian' },
  m:     { shift: -3, modeId: 'minor' },
  min:   { shift: -3, modeId: 'minor' },
  aeo:   { shift: -3, modeId: 'minor' },
  phr:   { shift: -4, modeId: 'phrygian' },
  loc:   { shift: -5, modeId: 'locrian' },
};

const NOTE_NAME_TO_SEMITONE: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4,
  F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9,
  'A#': 10, Bb: 10, B: 11, Cb: 11,
};

export function parseAbcScoreContext(abcText: string): AbcScoreContext {
  const defaultMap: Record<string, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };
  if (!abcText || typeof abcText !== 'string') {
    return {
      rootSemitone: 0,
      modeId: 'major',
      rawKey: 'C',
      keySignatureMap: defaultMap,
      useFlats: false,
      unitBeats: 0.5,
      meter: '4/4',
    };
  }

  // Extract M:
  const meterMatch = abcText.match(/^M:\s*([^\n%]+)/m);
  const meter = meterMatch ? meterMatch[1].trim() : '4/4';

  // Extract L:
  let unitBeats = 0.5; // ABC default for >= 3/4 or M:none is 1/8
  const lMatch = abcText.match(/^L:\s*(\d+)\s*\/\s*(\d+)/m);
  if (lMatch) {
    const num = parseInt(lMatch[1], 10);
    const den = parseInt(lMatch[2], 10);
    if (num > 0 && den > 0) {
      unitBeats = (num / den) * 4;
    }
  } else if (meter) {
    const mFrac = meter.match(/^(\d+)\s*\/\s*(\d+)/);
    if (mFrac) {
      const val = parseInt(mFrac[1], 10) / parseInt(mFrac[2], 10);
      unitBeats = val < 0.75 ? 0.25 : 0.5;
    }
  }

  // Extract K:
  const kMatch = abcText.match(/^K:\s*([^\n%]+)/m);
  const rawKey = kMatch ? kMatch[1].trim() : 'C';

  let rootSemitone = 0;
  let modeId: ScaleModeId = 'major';
  let fifths = 0;
  const keySignatureMap: Record<string, number> = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 };

  if (rawKey && !/^none$/i.test(rawKey) && !/^hp$/i.test(rawKey)) {
    const keyTokenMatch = rawKey.match(/^([A-Ga-g])([#b]?)\s*([a-zA-Z]*)/);
    if (keyTokenMatch) {
      const rootLetter = keyTokenMatch[1].toUpperCase();
      const rootAcc = keyTokenMatch[2] || '';
      const modeRaw = (keyTokenMatch[3] || '').toLowerCase();
      const rootName = `${rootLetter}${rootAcc}`;
      rootSemitone = NOTE_NAME_TO_SEMITONE[rootName] ?? 0;

      // Match mode prefix (first 3 letters or 'm')
      let modeInfo = MODE_FIFTHS_SHIFT[''];
      if (modeRaw === 'm' || modeRaw.startsWith('min')) {
        modeInfo = MODE_FIFTHS_SHIFT.m;
      } else if (modeRaw.length >= 3) {
        const prefix3 = modeRaw.slice(0, 3);
        if (MODE_FIFTHS_SHIFT[prefix3]) {
          modeInfo = MODE_FIFTHS_SHIFT[prefix3];
        }
      }
      modeId = modeInfo.modeId;

      const baseFifths = MAJOR_KEY_FIFTHS[rootName] ?? 0;
      fifths = baseFifths + modeInfo.shift;
      // Wrap enharmonically if beyond 7 sharps/flats
      if (fifths > 7) fifths -= 12;
      if (fifths < -7) fifths += 12;

      if (fifths > 0) {
        for (let i = 0; i < Math.min(7, fifths); i++) {
          keySignatureMap[SHARP_ORDER[i]] = 1;
        }
      } else if (fifths < 0) {
        for (let i = 0; i < Math.min(7, -fifths); i++) {
          keySignatureMap[FLAT_ORDER[i]] = -1;
        }
      }
    }
  }

  return {
    rootSemitone,
    modeId,
    rawKey,
    keySignatureMap,
    useFlats: fifths < 0,
    unitBeats,
    meter,
  };
}

/**
 * Formats a duration ratio (targetBeats / unitBeats) into a clean ABC duration suffix.
 */
function formatAbcDurationSuffix(targetBeats: number, unitBeats: number): string {
  const ratio = targetBeats / unitBeats;
  // Convert to exact fraction with denominator 1, 2, 4, or 8
  const eps = 1e-4;
  if (Math.abs(ratio - 1) < eps) return '';
  for (const den of [1, 2, 4, 8]) {
    const num = Math.round(ratio * den);
    if (Math.abs(num / den - ratio) < eps && num > 0) {
      if (den === 1) return String(num);
      if (num === 1 && den === 2) return '/2';
      if (num === 1) return `/${den}`;
      return `${num}/${den}`;
    }
  }
  return '';
}

/**
 * Converts a single MIDI note to its ABC pitch string (no duration) respecting key signature.
 * Standard ABC 2.1: MIDI 60 (C4) = 'C', MIDI 72 (C5) = 'c', MIDI 48 (C3) = 'C,'.
 */
export function midiToAbcPitch(
  midi: number,
  abcContext: AbcScoreContext,
  preferFlatsOverride?: boolean
): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1; // C4 (60) => 4

  // First check if any letter in the key signature naturally produces this pitch class!
  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  for (const letter of letters) {
    const keyAcc = abcContext.keySignatureMap[letter] || 0;
    const effectivePc = ((LETTER_BASE_PC[letter] + keyAcc) + 12) % 12;
    if (effectivePc === pc) {
      // Handle boundary cases where B# is next octave or Cb is prev octave
      let letterOctave = octave;
      if (letter === 'B' && keyAcc === 1 && pc === 0) letterOctave -= 1;
      if (letter === 'C' && keyAcc === -1 && pc === 11) letterOctave += 1;
      return formatAbcLetterOctave('', letter, letterOctave);
    }
  }

  // Otherwise check if it's a white-key natural that is sharpened/flattened by the key signature
  for (const letter of letters) {
    if (LETTER_BASE_PC[letter] === pc) {
      const keyAcc = abcContext.keySignatureMap[letter] || 0;
      const accPrefix = keyAcc !== 0 ? '=' : '';
      return formatAbcLetterOctave(accPrefix, letter, octave);
    }
  }

  // Chromatic accidental outside key signature
  const useFlats = preferFlatsOverride !== undefined ? preferFlatsOverride : abcContext.useFlats;
  const sharpSpelling: Record<number, { letter: string; acc: string }> = {
    1: { letter: 'C', acc: '^' },
    3: { letter: 'D', acc: '^' },
    6: { letter: 'F', acc: '^' },
    8: { letter: 'G', acc: '^' },
    10: { letter: 'A', acc: '^' },
  };
  const flatSpelling: Record<number, { letter: string; acc: string }> = {
    1: { letter: 'D', acc: '_' },
    3: { letter: 'E', acc: '_' },
    6: { letter: 'G', acc: '_' },
    8: { letter: 'A', acc: '_' },
    10: { letter: 'B', acc: '_' },
  };
  const chosen = (useFlats ? flatSpelling : sharpSpelling)[pc] || { letter: 'C', acc: '^' };
  return formatAbcLetterOctave(chosen.acc, chosen.letter, octave);
}

function formatAbcLetterOctave(accPrefix: string, upperLetter: string, octave: number): string {
  if (octave <= 4) {
    const commas = octave < 4 ? ','.repeat(4 - octave) : '';
    return `${accPrefix}${upperLetter}${commas}`;
  }
  const primes = octave > 5 ? "'".repeat(octave - 5) : '';
  return `${accPrefix}${upperLetter.toLowerCase()}${primes}`;
}

export function midiNotesToAbcToken(
  midiNotes: number[],
  durationId: NoteDurationId,
  dotted: boolean,
  abcContext: AbcScoreContext,
  preferFlats?: boolean,
  tied?: boolean
): string {
  if (midiNotes.length === 0) return '';
  const durDef = NOTE_DURATIONS.find(d => d.id === durationId) || NOTE_DURATIONS[2];
  const targetBeats = durDef.beats * (dotted ? 1.5 : 1);
  const suffix = formatAbcDurationSuffix(targetBeats, abcContext.unitBeats);
  const tieStr = tied ? '-' : '';

  const sorted = [...new Set(midiNotes)].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return `${midiToAbcPitch(sorted[0], abcContext, preferFlats)}${suffix}${tieStr}`;
  }
  const inner = sorted.map(m => midiToAbcPitch(m, abcContext, preferFlats)).join('');
  return `[${inner}]${suffix}${tieStr}`;
}

export function restToAbcToken(
  durationId: NoteDurationId,
  dotted: boolean,
  abcContext: AbcScoreContext
): string {
  const durDef = NOTE_DURATIONS.find(d => d.id === durationId) || NOTE_DURATIONS[2];
  const targetBeats = durDef.beats * (dotted ? 1.5 : 1);
  const suffix = formatAbcDurationSuffix(targetBeats, abcContext.unitBeats);
  return `z${suffix}`;
}

/**
 * Updates or inserts K: header in ABC text for a given root + mode.
 */
export function applyKeyToAbcText(abcText: string, rootSemitone: number, modeId: ScaleModeId): string {
  const rootOpt = getRootOption(rootSemitone);
  const mode = getScaleMode(modeId);
  const keyVal = `${rootOpt.abcRoot}${mode.abcModeSuffix}`;

  if (/^K:.*$/m.test(abcText)) {
    return abcText.replace(/^K:.*$/m, `K:${keyVal}`);
  }
  if (/^M:.*$/m.test(abcText)) {
    return abcText.replace(/^(M:.*)$/m, `$1\nK:${keyVal}`);
  }
  return `X:1\nT:Untitled\nM:none\nL:1/8\nK:${keyVal}\n${abcText}`;
}

/**
 * Toggles M:none (free meter) in ABC header.
 */
export function toggleAbcFreeMeter(abcText: string): { text: string; isFree: boolean } {
  const meterMatch = abcText.match(/^M:\s*([^\n%]+)/m);
  const currentlyFree = meterMatch ? /^none$/i.test(meterMatch[1].trim()) : false;
  const nextMeter = currentlyFree ? '4/4' : 'none';
  if (meterMatch) {
    return {
      text: abcText.replace(/^M:.*$/m, `M:${nextMeter}`),
      isFree: !currentlyFree,
    };
  }
  if (/^K:/m.test(abcText)) {
    return {
      text: abcText.replace(/^(K:)/m, `M:${nextMeter}\n$1`),
      isFree: !currentlyFree,
    };
  }
  return {
    text: `M:${nextMeter}\n${abcText}`,
    isFree: !currentlyFree,
  };
}

/* ============================================================================
 * MusoJianpu Notation Pitch & Duration Formatting
 * ========================================================================== */

const JIANPU_SHARP_SPELLING: Record<number, { acc: string; deg: number }> = {
  0:  { acc: '',  deg: 1 },
  1:  { acc: '#', deg: 1 },
  2:  { acc: '',  deg: 2 },
  3:  { acc: '#', deg: 2 },
  4:  { acc: '',  deg: 3 },
  5:  { acc: '',  deg: 4 },
  6:  { acc: '#', deg: 4 },
  7:  { acc: '',  deg: 5 },
  8:  { acc: '#', deg: 5 },
  9:  { acc: '',  deg: 6 },
  10: { acc: '#', deg: 6 },
  11: { acc: '',  deg: 7 },
};

const JIANPU_FLAT_SPELLING: Record<number, { acc: string; deg: number }> = {
  0:  { acc: '',  deg: 1 },
  1:  { acc: 'b', deg: 2 },
  2:  { acc: '',  deg: 2 },
  3:  { acc: 'b', deg: 3 },
  4:  { acc: '',  deg: 3 },
  5:  { acc: '',  deg: 4 },
  6:  { acc: 'b', deg: 5 },
  7:  { acc: '',  deg: 5 },
  8:  { acc: 'b', deg: 6 },
  9:  { acc: '',  deg: 6 },
  10: { acc: 'b', deg: 7 },
  11: { acc: '',  deg: 7 },
};

/**
 * Balanced default Jianpu accidental spelling (matches standard Chinese Jianpu conventions:
 * #1, b3, #4, #5, b7 — or flat-biased for minor/flat modes).
 */
const JIANPU_BALANCED_SPELLING: Record<number, { acc: string; deg: number }> = {
  0:  { acc: '',  deg: 1 },
  1:  { acc: '#', deg: 1 },
  2:  { acc: '',  deg: 2 },
  3:  { acc: 'b', deg: 3 },
  4:  { acc: '',  deg: 3 },
  5:  { acc: '',  deg: 4 },
  6:  { acc: '#', deg: 4 },
  7:  { acc: '',  deg: 5 },
  8:  { acc: '#', deg: 5 },
  9:  { acc: '',  deg: 6 },
  10: { acc: 'b', deg: 7 },
  11: { acc: '',  deg: 7 },
};

export function midiToJianpuPitch(
  midi: number,
  jianpuKey: string,
  preferFlats?: boolean
): string {
  const keyInfo = getErhuKeyInfo(jianpuKey);
  const diff = midi - keyInfo.tonicMidi;
  const octShift = Math.floor(diff / 12);
  const semitone = ((diff % 12) + 12) % 12;

  const table = preferFlats === true
    ? JIANPU_FLAT_SPELLING
    : preferFlats === false
      ? JIANPU_BALANCED_SPELLING
      : JIANPU_BALANCED_SPELLING;

  const entry = table[semitone] || JIANPU_SHARP_SPELLING[semitone];
  const clampedOct = Math.max(-2, Math.min(2, octShift));
  const octMark = clampedOct > 0 ? "'".repeat(clampedOct) : clampedOct < 0 ? ','.repeat(-clampedOct) : '';
  return `${entry.acc}${entry.deg}${octMark}`;
}

export function midiNotesToJianpuToken(
  midiNotes: number[],
  durationId: NoteDurationId,
  dotted: boolean,
  jianpuKey: string,
  preferFlats?: boolean,
  tied?: boolean
): string {
  if (midiNotes.length === 0) return '';
  const sorted = [...new Set(midiNotes)].sort((a, b) => a - b);
  const pitchHead = sorted.length === 1
    ? midiToJianpuPitch(sorted[0], jianpuKey, preferFlats)
    : `<${sorted.map(m => midiToJianpuPitch(m, jianpuKey, preferFlats)).join(' ')}>`;

  const tieStr = tied ? '~' : '';

  switch (durationId) {
    case 'whole':
      return dotted
        ? `${pitchHead} - - - - -${tieStr}`
        : `${pitchHead} - - -${tieStr}`;
    case 'half':
      return dotted
        ? `${pitchHead} - -${tieStr}`
        : `${pitchHead} -${tieStr}`;
    case 'quarter':
      return `${pitchHead}${dotted ? '.' : ''}${tieStr}`;
    case 'eighth':
      return `${pitchHead}/${dotted ? '.' : ''}${tieStr}`;
    case 'sixteenth':
      return `${pitchHead}//${dotted ? '.' : ''}${tieStr}`;
    case 'thirtysecond':
      return `${pitchHead}///${dotted ? '.' : ''}${tieStr}`;
  }
}

export function restToJianpuToken(durationId: NoteDurationId, dotted: boolean): string {
  switch (durationId) {
    case 'whole':
      return dotted ? '0 0 0 0 0 0' : '0 0 0 0';
    case 'half':
      return dotted ? '0 0 0' : '0 0';
    case 'quarter':
      return dotted ? '0.' : '0';
    case 'eighth':
      return dotted ? '0/.' : '0/';
    case 'sixteenth':
      return dotted ? '0//.' : '0//';
    case 'thirtysecond':
      return dotted ? '0///.' : '0///';
  }
}

/* ============================================================================
 * Smart Free-Meter Text Insertion & Undo Helpers (ABC & MusoJianpu)
 * ========================================================================== */

/**
 * Determines whether a line is a header/metadata line where notes should NOT be inserted.
 */
function isHeaderLine(line: string, format: NoteEntryFormat): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (format === 'abc') {
    return /^(?:[A-Za-z]:|%)/.test(trimmed);
  }
  return /^(?:@[a-zA-Z_]+\s*[:：]|#|\/\/|S[:：]|L[:：]|T[:：])/i.test(trimmed);
}

/**
 * Finds the start index of the music body (first index after all leading header lines).
 */
export function findMusicBodyStart(text: string, format: NoteEntryFormat): number {
  const lines = text.split('\n');
  let offset = 0;
  let lastHeaderEnd = 0;
  let seenMusic = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineEnd = offset + line.length + (i < lines.length - 1 ? 1 : 0);
    if (!seenMusic) {
      if (isHeaderLine(line, format) || line.trim() === '') {
        lastHeaderEnd = lineEnd;
      } else {
        seenMusic = true;
      }
    }
    offset = lineEnd;
  }
  return lastHeaderEnd;
}

/**
 * Inserts a note/rest/barline/newline token freely at cursorPos (or cleanly at end of score
 * if cursorPos is null or inside a header line). Never enforces meter or barline counts.
 */
export function insertScoreToken(
  text: string,
  cursorPos: number | null,
  token: string,
  format: NoteEntryFormat
): { text: string; nextCursor: number } {
  const safeText = typeof text === 'string' ? text : '';
  const bodyStart = findMusicBodyStart(safeText, format);

  let pos = cursorPos !== null && cursorPos >= 0 && cursorPos <= safeText.length
    ? cursorPos
    : safeText.length;

  // If cursor sits in the header region, move to the end of the score body
  if (pos < bodyStart) {
    pos = safeText.length;
  } else {
    // Also check if cursor is on an inline header/lyrics/section line
    const lineStart = safeText.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
    const rawLineEnd = safeText.indexOf('\n', pos);
    const lineEnd = rawLineEnd === -1 ? safeText.length : rawLineEnd;
    const currentLine = safeText.slice(lineStart, lineEnd);
    if (isHeaderLine(currentLine, format)) {
      pos = safeText.length;
    }
  }

  let before = safeText.slice(0, pos);
  const after = safeText.slice(pos);

  // If the entire score ends with a header line and no trailing newline, add one first
  if (pos === safeText.length && before.length > 0 && !before.endsWith('\n')) {
    const lastLineStart = before.lastIndexOf('\n') + 1;
    const lastLine = before.slice(lastLineStart);
    if (isHeaderLine(lastLine, format)) {
      before += '\n';
    }
  }

  // Handle explicit newline token
  if (token === '\n') {
    const nextText = `${before}\n${after}`;
    return { text: nextText, nextCursor: before.length + 1 };
  }

  // Handle barline cleanly with spaces around it
  if (token === '|') {
    const needsLeadingSpace = before.length > 0 && !/[\s\n]$/.test(before);
    const insertStr = `${needsLeadingSpace ? ' ' : ''}| `;
    const nextText = `${before}${insertStr}${after}`;
    return { text: nextText, nextCursor: before.length + insertStr.length };
  }

  // Standard note / chord / rest / prolongation token
  const needsLeadingSpace =
    before.length > 0 &&
    !/[\s\n(\[]$/.test(before);
  const needsTrailingSpace =
    after.length > 0 &&
    !/^[\s\n)\]|]/.test(after);

  const insertStr = `${needsLeadingSpace ? ' ' : ''}${token}${needsTrailingSpace ? ' ' : ''}`;
  const nextText = `${before}${insertStr}${after}`;
  const nextCursor = before.length + (needsLeadingSpace ? 1 : 0) + token.length;

  return { text: nextText, nextCursor };
}

/**
 * Deletes the last token (note, chord, rest, dash, barline) immediately before cursorPos.
 */
export function deleteLastScoreToken(
  text: string,
  cursorPos: number | null,
  format: NoteEntryFormat
): { text: string; nextCursor: number } | null {
  const safeText = typeof text === 'string' ? text : '';
  const bodyStart = findMusicBodyStart(safeText, format);
  let pos = cursorPos !== null && cursorPos >= 0 && cursorPos <= safeText.length
    ? cursorPos
    : safeText.length;

  if (pos <= bodyStart) return null;

  const before = safeText.slice(0, pos);
  const after = safeText.slice(pos);

  // Don't delete into a header line
  const trimmedRight = before.replace(/[ \t]+$/, '');
  if (trimmedRight.length <= bodyStart) return null;

  // If right after a newline, remove the newline
  if (trimmedRight.endsWith('\n')) {
    const nextBefore = trimmedRight.slice(0, -1);
    return { text: nextBefore + after, nextCursor: nextBefore.length };
  }

  // Match angle-bracket chord <...> with suffixes (Jianpu) or square-bracket chord [...] with suffixes (ABC)
  const chordMatch = trimmedRight.match(/(?:<[^<>]+>|\[[^\[\]]+\])[^\s\n]*$/);
  let removeStart: number;
  if (chordMatch && chordMatch.index !== undefined) {
    removeStart = chordMatch.index;
  } else {
    // Match last whitespace-separated token on the current line
    const tokenMatch = trimmedRight.match(/[^\s\n]+$/);
    if (!tokenMatch || tokenMatch.index === undefined) return null;
    removeStart = tokenMatch.index;
  }

  if (removeStart < bodyStart) return null;

  // Also trim one preceding space if present
  let nextBefore = trimmedRight.slice(0, removeStart);
  if (nextBefore.endsWith(' ') && !nextBefore.endsWith('\n ')) {
    nextBefore = nextBefore.slice(0, -1);
  }

  return { text: nextBefore + after, nextCursor: nextBefore.length };
}
