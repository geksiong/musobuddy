/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CHORD_INTERVALS: Record<string, number[]> = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  '7': [0, 4, 7, 10],
  'maj7': [0, 4, 7, 11],
  'min7': [0, 3, 7, 10],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  'add9': [0, 4, 7, 14],
  'dim': [0, 3, 6],
  'dim7': [0, 3, 6, 9],
  'm7b5': [0, 3, 6, 10],
  '6': [0, 4, 7, 9],
  '69': [0, 4, 7, 9, 14],
  '9': [0, 4, 7, 10, 14],
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 17, 21],
  'aug': [0, 4, 8],
  'm': [0, 3, 7],
  'm7': [0, 3, 7, 10],
  'm6': [0, 3, 7, 9],
  'm69': [0, 3, 7, 9, 14],
  'm9': [0, 3, 7, 10, 14],
  'madd9': [0, 3, 7, 14],
  'm11': [0, 3, 7, 10, 14, 17],
  'mmaj7': [0, 3, 7, 11],
  'mmaj7b5': [0, 3, 6, 11],
  'mmaj9': [0, 3, 7, 11, 14],
  '7#9': [0, 4, 7, 10, 15],
  '7b9': [0, 4, 7, 10, 13],
  '7b13': [0, 4, 7, 10, 20],
  'maj7#11': [0, 4, 7, 11, 18],
};

export const ROOT_OFFSETS: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

export function getIntervalsForChord(chordName: string): number[] {
  let root = '';
  let suffix = '';

  if (chordName.length >= 2 && (chordName[1] === '#' || chordName[1] === 'b')) {
    root = chordName.substring(0, 2);
    suffix = chordName.substring(2);
  } else {
    root = chordName[0];
    suffix = chordName.substring(1);
  }

  const offset = ROOT_OFFSETS[root] || 0;

  let type = suffix === '' ? 'major' : suffix;
  if (type === 'm') type = 'minor';
  if (type === 'min7') type = 'm7';
  if (type === 'major7') type = 'maj7';
  if (type === 'mmajor7') type = 'mmaj7';
  
  // Normalize unicode flats/sharps for Flamenco voicings
  type = type.replace(/♭/g, 'b').replace(/♯/g, '#');
  if (type === '7♭9') type = '7b9';
  if (type === '7♭13') type = '7b13';
  if (type === 'maj7♯11') type = 'maj7#11';

  const intervals = CHORD_INTERVALS[type] || CHORD_INTERVALS['major'];

  return intervals.map(v => v + offset);
}

export * from './components/Metronome/constants.ts';
export * from './components/Drone/constants.ts';
export * from './components/Tuner/constants.ts';
export * from './components/Score/constants.ts';
export * from './components/Accompaniment/constants.ts';
