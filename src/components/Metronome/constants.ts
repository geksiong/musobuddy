/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MetronomeSound, TimeSignatureType, BeatPattern } from './types.ts';

export const TEMPO_NAMES = [
  { name: 'Grave', min: 20, max: 40 },
  { name: 'Largo', min: 40, max: 60 },
  { name: 'Adagio', min: 60, max: 76 },
  { name: 'Andante', min: 76, max: 108 },
  { name: 'Moderato', min: 108, max: 120 },
  { name: 'Allegro', min: 120, max: 168 },
  { name: 'Presto', min: 168, max: 200 },
  { name: 'Prestissimo', min: 200, max: 500 },
];

export const DEFAULT_PRESETS: BeatPattern[] = [
  {
    id: '4-4',
    name: '4/4 Basic',
    bpm: 120,
    timeSignature: '4/4',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 4, active: true, muted: false, pattern: [2, 1, 1, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
  },
  {
    id: 'soleas',
    name: 'Soleás',
    bpm: 80,
    timeSignature: '12-Beat',
    voices: [
      { id: 0, sound: MetronomeSound.Clap, volume: 1, beats: 12, active: true, muted: false, pattern: [0, 0, 2, 0, 0, 2, 0, 2, 0, 2, 0, 2] },
    ],
    countIn: false,
    type: TimeSignatureType.Flamenco,
    displayOffset: 11,
  },
  {
    id: 'poly-2-3',
    name: '2:3 Poly',
    bpm: 90,
    timeSignature: '2:3',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 2, active: true, muted: false, pattern: [2, 1] },
      { id: 1, sound: MetronomeSound.Cowbell, volume: 0.8, beats: 3, active: true, muted: false, pattern: [2, 1, 1] },
    ],
    countIn: false,
    type: TimeSignatureType.Polyrhythm,
  },
  {
    id: 'poly-3-4',
    name: '3:4 Poly',
    bpm: 100,
    timeSignature: '3:4',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 3, active: true, muted: false, pattern: [2, 1, 1] },
      { id: 1, sound: MetronomeSound.Cowbell, volume: 0.8, beats: 4, active: true, muted: false, pattern: [2, 1, 1, 1] },
    ],
    countIn: false,
    type: TimeSignatureType.Polyrhythm,
  },
  {
    id: 'poly-4-5',
    name: '4:5 Poly',
    bpm: 80,
    timeSignature: '4:5',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 4, active: true, muted: false, pattern: [2, 1, 1, 1] },
      { id: 1, sound: MetronomeSound.Cowbell, volume: 0.7, beats: 5, active: true, muted: false, pattern: [2, 1, 1, 1, 1] },
    ],
    countIn: false,
    type: TimeSignatureType.Polyrhythm,
  },
  {
    id: 'poly-2-3-5',
    name: '2:3:5 Poly',
    bpm: 80,
    timeSignature: '2:3:5',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 2, active: true, muted: false, pattern: [2, 1] },
      { id: 1, sound: MetronomeSound.Cowbell, volume: 0.8, beats: 3, active: true, muted: false, pattern: [2, 1, 1] },
      { id: 2, sound: MetronomeSound.Clap, volume: 0.6, beats: 5, active: true, muted: false, pattern: [2, 1, 1, 1, 1] },
    ],
    countIn: false,
    type: TimeSignatureType.Polyrhythm,
  }
];
