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

const LETTER_INDEX_MAP: Record<string, number> = {
  'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6
};

const LETTER_CHARS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BASE_PITCHES = [0, 2, 4, 5, 7, 9, 11]; // C=0, D=2, E=4, F=5, G=7, A=9, B=11

// Sharp key centers for pitch classes 0..11 (letterIndex, pitchClass)
const SHARP_KEY_CENTERS = [
  { letter: 0, pitch: 0 },  // 0: C
  { letter: 0, pitch: 1 },  // 1: C#
  { letter: 1, pitch: 2 },  // 2: D
  { letter: 1, pitch: 3 },  // 3: D#
  { letter: 2, pitch: 4 },  // 4: E
  { letter: 3, pitch: 5 },  // 5: F
  { letter: 3, pitch: 6 },  // 6: F#
  { letter: 4, pitch: 7 },  // 7: G
  { letter: 4, pitch: 8 },  // 8: G#
  { letter: 5, pitch: 9 },  // 9: A
  { letter: 5, pitch: 10 }, // 10: A#
  { letter: 6, pitch: 11 }, // 11: B
];

// Flat key centers for pitch classes 0..11 (letterIndex, pitchClass)
const FLAT_KEY_CENTERS = [
  { letter: 0, pitch: 0 },  // 0: C
  { letter: 1, pitch: 1 },  // 1: Db
  { letter: 1, pitch: 2 },  // 2: D
  { letter: 2, pitch: 3 },  // 3: Eb
  { letter: 2, pitch: 4 },  // 4: E
  { letter: 3, pitch: 5 },  // 5: F
  { letter: 4, pitch: 6 },  // 6: Gb
  { letter: 4, pitch: 7 },  // 7: G
  { letter: 5, pitch: 8 },  // 8: Ab
  { letter: 5, pitch: 9 },  // 9: A
  { letter: 6, pitch: 10 }, // 10: Bb
  { letter: 6, pitch: 11 }, // 11: B
];

export interface ParsedNote {
  letterChar: string;
  letter: number; // 0..6
  accidental: number; // semitones (-2, -1, 0, +1, +2)
  pitchClass: number; // 0..11
}

export function parseNote(noteStr: string): ParsedNote | null {
  if (!noteStr) return null;
  const match = noteStr.match(/^([A-G])(##|𝄪|x|bb|𝄫|#|♯|b|♭|♮|n)?/i);
  if (!match) return null;

  const letterChar = match[1].toUpperCase();
  const letter = LETTER_INDEX_MAP[letterChar];
  if (letter === undefined) return null;

  const accStr = match[2] || '';
  let accidental = 0;
  if (accStr === '##' || accStr === '𝄪' || accStr === 'x') accidental = 2;
  else if (accStr === '#' || accStr === '♯') accidental = 1;
  else if (accStr === 'bb' || accStr === '𝄫') accidental = -2;
  else if (accStr === 'b' || accStr === '♭') accidental = -1;
  else accidental = 0;

  const basePitch = BASE_PITCHES[letter];
  const pitchClass = (basePitch + accidental + 120) % 12;

  return { letterChar, letter, accidental, pitchClass };
}

export function parseKeyContext(keyContext?: string): { rootLetter: number; rootPitchClass: number } {
  if (!keyContext) return { rootLetter: 0, rootPitchClass: 0 }; // Default C Major
  const cleanKey = keyContext.trim();
  const parsed = parseNote(cleanKey);
  if (!parsed) return { rootLetter: 0, rootPitchClass: 0 };

  const isMinor = cleanKey.toLowerCase().includes('m') && !cleanKey.toLowerCase().includes('maj');
  if (isMinor) {
    // Relative major of minor key is +3 semitones up
    const majorPitchClass = (parsed.pitchClass + 3) % 12;
    // For letter: Am -> C (letter + 2), Em -> G (letter + 2), C#m -> E (letter + 2)
    const majorLetter = (parsed.letter + 2) % 7;
    return { rootLetter: majorLetter, rootPitchClass: majorPitchClass };
  }

  return { rootLetter: parsed.letter, rootPitchClass: parsed.pitchClass };
}

function transposeNoteInKey(
  noteStr: string,
  semitones: number,
  origKeyContext?: string,
  forceAccidental?: 'sharp' | 'flat'
): string {
  const parsed = parseNote(noteStr);
  if (!parsed) return noteStr;

  const origKey = parseKeyContext(origKeyContext);
  const targetPitchClass = (origKey.rootPitchClass + semitones + 120) % 12;

  // Determine accidental preference if not forced
  let useFlats = forceAccidental === 'flat';
  if (!forceAccidental) {
    useFlats = noteStr.includes('b') || noteStr.includes('♭') || (origKeyContext ? origKeyContext.includes('b') : false);
  }

  const keyCenters = useFlats ? FLAT_KEY_CENTERS : SHARP_KEY_CENTERS;
  const targetKeyCenter = keyCenters[targetPitchClass];

  // Diatonic letter step difference between orig key and target key
  const deltaL = (targetKeyCenter.letter - origKey.rootLetter + 7) % 7;

  // Target note letter and pitch class
  const targetLetter = (parsed.letter + deltaL) % 7;
  const noteTargetPitch = (parsed.pitchClass + semitones + 120) % 12;

  // Accidental offset needed for targetLetter to equal noteTargetPitch
  const basePitch = BASE_PITCHES[targetLetter];
  let accidental = (noteTargetPitch - basePitch) % 12;
  if (accidental > 6) accidental -= 12;
  if (accidental < -6) accidental += 12;

  const letterChar = LETTER_CHARS[targetLetter];
  let accStr = '';
  if (accidental === 1) accStr = '#';
  else if (accidental === 2) accStr = '##';
  else if (accidental === -1) accStr = 'b';
  else if (accidental === -2) accStr = 'bb';

  return `${letterChar}${accStr}`;
}

export function transposeChord(
  chordName: string,
  semitones: number,
  forceAccidental?: 'sharp' | 'flat',
  keyContext?: string
): string {
  if (!chordName || chordName.trim() === '') return chordName;
  if (semitones === 0) return chordName;

  // Check for slash bass note
  const slashIdx = chordName.indexOf('/');
  let mainPart = chordName;
  let bassPart = '';

  if (slashIdx !== -1) {
    mainPart = chordName.substring(0, slashIdx);
    const afterSlash = chordName.substring(slashIdx + 1);
    // Check if afterSlash starts with a note letter
    if (/^[A-G](?:##|𝄪|x|bb|𝄫|#|♯|b|♭|♮|n)?/i.test(afterSlash)) {
      const bassMatch = afterSlash.match(/^([A-G](?:##|𝄪|x|bb|𝄫|#|♯|b|♭|♮|n)?)(.*)$/i);
      if (bassMatch) {
        bassPart = bassMatch[1];
        const extraSuffix = bassMatch[2];
        if (extraSuffix) mainPart += '/' + extraSuffix;
      }
    } else {
      mainPart = chordName; // e.g. 6/9
    }
  }

  // Parse root note of mainPart
  const rootMatch = mainPart.match(/^([A-G](?:##|𝄪|x|bb|𝄫|#|♯|b|♭|♮|n)?)(.*)$/i);
  if (!rootMatch) return chordName;

  const origRoot = rootMatch[1];
  const suffix = rootMatch[2];

  const transposedRoot = transposeNoteInKey(origRoot, semitones, keyContext, forceAccidental);
  let transposedBass = '';
  if (bassPart) {
    transposedBass = transposeNoteInKey(bassPart, semitones, keyContext, forceAccidental);
  }

  return `${transposedRoot}${suffix}${transposedBass ? '/' + transposedBass : ''}`;
}

export function formatChordName(chordName: string): string {
  if (!chordName || chordName.trim() === '') return chordName;
  return chordName
    .replace(/##|𝄪|x/g, '𝄪')
    .replace(/bb|𝄫/g, '𝄫')
    .replace(/#/g, '♯')
    .replace(/([A-G])b/g, '$1♭')
    .replace(/b(\d+)/g, '♭$1');
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

