/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CHORD_ROOTS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const CHORD_ROOTS_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const CHORD_ROOTS = CHORD_ROOTS_SHARP;

export const ENHARMONIC_SWAP_MAP: Record<string, string> = {
  'C#': 'Db', 'Db': 'C#',
  'D#': 'Eb', 'Eb': 'D#',
  'F#': 'Gb', 'Gb': 'F#',
  'G#': 'Ab', 'Ab': 'G#',
  'A#': 'Bb', 'Bb': 'A#',
};

export const ROOT_OFFSETS_MAP: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

export function formatChordName(chordName: string): string {
  if (!chordName || chordName.trim() === '') return chordName;
  return chordName
    .replace(/#/g, '♯')
    .replace(/([A-G])b/g, '$1♭')
    .replace(/b(\d+)/g, '♭$1');
}

export function transposeChord(chordName: string, semitones: number, forceAccidental?: 'sharp' | 'flat'): string {
  if (!chordName || chordName.trim() === '') return chordName;

  const match = chordName.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chordName;

  const [, root, suffix] = match;
  const rootIndex = ROOT_OFFSETS_MAP[root];
  if (rootIndex === undefined) return chordName;

  const newIndex = (rootIndex + semitones % 12 + 12) % 12;

  const useFlats = forceAccidental === 'flat' || (forceAccidental === undefined && chordName.includes('b'));
  const targetScale = useFlats ? CHORD_ROOTS_FLAT : CHORD_ROOTS_SHARP;

  const newRoot = targetScale[newIndex];
  return `${newRoot}${suffix}`;
}

export function toggleEnharmonicSpelling(chordName: string): string {
  if (!chordName || chordName.trim() === '') return chordName;

  const match = chordName.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chordName;

  const [, root, suffix] = match;
  const swappedRoot = ENHARMONIC_SWAP_MAP[root];
  if (!swappedRoot) return chordName; // e.g. C, D, E don't have standard single accidentals

  return `${swappedRoot}${suffix}`;
}

export const CHORD_TYPES = [
  { label: 'Major', suffix: '', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { label: 'Minor', suffix: 'm', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { label: '7th', suffix: '7', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  { label: 'Major 7th', suffix: 'maj7', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  { label: 'Minor 7th', suffix: 'min7', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  { label: 'Minor 6th', suffix: 'm6', color: 'bg-cyan-600/10 text-cyan-600 dark:text-cyan-400' },
  { label: 'Minor 6/9', suffix: 'm69', color: 'bg-teal-600/10 text-teal-600 dark:text-teal-400' },
  { label: 'Minor 9th', suffix: 'm9', color: 'bg-sky-600/10 text-sky-600 dark:text-sky-400' },
  { label: 'Minor Add 9', suffix: 'madd9', color: 'bg-blue-400/10 text-blue-600 dark:text-blue-300' },
  { label: 'Minor 11th', suffix: 'm11', color: 'bg-indigo-400/10 text-indigo-600 dark:text-indigo-300' },
  { label: 'Minor Maj 7', suffix: 'mmaj7', color: 'bg-violet-600/10 text-violet-600 dark:text-violet-400' },
  { label: 'Minor Maj 7b5', suffix: 'mmaj7b5', color: 'bg-fuchsia-600/10 text-fuchsia-600 dark:text-fuchsia-400' },
  { label: 'Minor Maj 9', suffix: 'mmaj9', color: 'bg-rose-600/10 text-rose-600 dark:text-rose-400' },
  { label: '7 ♯9', suffix: '7#9', color: 'bg-orange-600/10 text-orange-600 dark:text-orange-400' },
  { label: '7 ♭9 (Flamenco Dominant)', suffix: '7b9', color: 'bg-rose-600/10 text-rose-600 dark:text-rose-400' },
  { label: '7 ♭13 (Flamenco Altered)', suffix: '7b13', color: 'bg-amber-600/10 text-amber-600 dark:text-amber-400' },
  { label: 'Maj7 ♯11 (Flamenco ♭II)', suffix: 'maj7#11', color: 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400' },
  { label: 'Suspended 2', suffix: 'sus2', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { label: 'Suspended 4', suffix: 'sus4', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { label: 'Add 9', suffix: 'add9', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  { label: 'Diminished', suffix: 'dim', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  { label: 'Diminished 7', suffix: 'dim7', color: 'bg-red-600/10 text-red-600 dark:text-red-400' },
  { label: 'Half-Dim 7', suffix: 'm7b5', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  { label: '6/9 Chord', suffix: '69', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  { label: '9th Chord', suffix: '9', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { label: '11th Chord', suffix: '11', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
  { label: '13th Chord', suffix: '13', color: 'bg-lime-500/10 text-lime-600 dark:text-lime-400' },
];

export function getChordTypeInfo(chordName: string) {
  if (!chordName) return CHORD_TYPES[0];
  const rootMatch = chordName.match(/^[A-G][#b]?/);
  const suffix = rootMatch ? chordName.slice(rootMatch[0].length) : chordName;

  const sorted = [...CHORD_TYPES].sort((a, b) => b.suffix.length - a.suffix.length);
  const found = sorted.find(t => t.suffix !== '' && (suffix === t.suffix || suffix.startsWith(t.suffix)));
  if (found) return found;

  if (suffix === 'm7') {
    const min7 = CHORD_TYPES.find(t => t.suffix === 'min7');
    if (min7) return min7;
  }

  return CHORD_TYPES[0];
}

export const ARPEGGIO_PRESETS = [
  'Block',
  'Up',
  'Down',
  'Up-Down',
  'Converge',
  'Diverge',
  'Stutter',
  'Random',
  'Up (2 Octaves)',
  'Down (2 Octaves)',
  'Up-Down (2 Octaves)',
  'Alberti Bass',
  'Pedal Point',
  'Double-Time Up',
  'Double-Time Up-Down',
  'Double-Time Strum',
  'Fingerstyle Folk',
  'Bossa Nova Rhythm',
  'Montuno / Latin',
  '16th Quad Arpeggio'
];

export interface ArpeggioRateOption {
  id: string;
  label: string;
  shortLabel: string;
  multiplier: number; // notes per quarter note beat
  description: string;
}

export const ARPEGGIO_RATES: ArpeggioRateOption[] = [
  { id: '1x', label: '1x (Quarter Notes)', shortLabel: '1x Normal', multiplier: 1, description: '1 note per beat' },
  { id: '2x', label: '2x (Double Time / 8th Notes)', shortLabel: '2x Double Time', multiplier: 2, description: '2 notes per beat (8th notes)' },
  { id: '3x', label: '3x (Triplets / 8th Triplets)', shortLabel: '3x Triplets', multiplier: 3, description: '3 notes per beat (8th triplets)' },
  { id: '4x', label: '4x (Sixteenth Notes)', shortLabel: '4x Quad Time', multiplier: 4, description: '4 notes per beat (16th notes)' },
  { id: '0.5x', label: '0.5x (Half Time)', shortLabel: '0.5x Half Time', multiplier: 0.5, description: '1 note every 2 beats' },
];

