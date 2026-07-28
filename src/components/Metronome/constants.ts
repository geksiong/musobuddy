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
    id: 'pulse',
    name: 'Pulse',
    bpm: 60,
    timeSignature: '1/1',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 1, active: true, muted: false, pattern: [1] },
    ],
    countIn: false,
    type: TimeSignatureType.Standard,
    startBeat: 1,
  },
  {
    id: '2-4',
    name: '2/4 Basic',
    bpm: 100,
    timeSignature: '2/4',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 2, active: true, muted: false, pattern: [2, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
  },
  {
    id: '3-4',
    name: '3/4 Basic',
    bpm: 60,
    timeSignature: '3/4',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 3, active: true, muted: false, pattern: [2, 1, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
  },
  {
    id: '4-4',
    name: '4/4 Basic',
    bpm: 100,
    timeSignature: '4/4',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 4, active: true, muted: false, pattern: [2, 1, 1, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
  },
  {
    id: '6-8-33',
    name: '6/8 (3+3)',
    bpm: 120,
    timeSignature: '6/8',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 6, active: true, muted: false, pattern: [2, 1, 1, 2, 1, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
  },
  {
    id: '6-8-222',
    name: '6/8 (2+2+2)',
    bpm: 120,
    timeSignature: '6/8',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 6, active: true, muted: false, pattern: [2, 1, 2, 1, 2, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
  },
  {
    id: '5-4-32',
    name: '5/4 (3+2)',
    bpm: 120,
    timeSignature: '5/4',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 5, active: true, muted: false, pattern: [2, 1, 1, 2, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
  },
  {
    id: '5-4-23',
    name: '5/4 (2+3)',
    bpm: 120,
    timeSignature: '5/4',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 5, active: true, muted: false, pattern: [2, 1, 2, 1, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
  },
  {
    id: '7-4-43',
    name: '7/4 (4+3)',
    bpm: 120,
    timeSignature: '7/4',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 7, active: true, muted: false, pattern: [2, 1, 1, 1, 2, 1, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
  },
  {
    id: '7-4-34',
    name: '7/4 (3+4)',
    bpm: 120,
    timeSignature: '7/4',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 7, active: true, muted: false, pattern: [2, 1, 1, 2, 1, 1, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
  },
  {
    id: '7-4-223',
    name: '7/4 (2+2+3)',
    bpm: 120,
    timeSignature: '7/4',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 7, active: true, muted: false, pattern: [2, 1, 2, 1, 2, 1, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
  },
  {
    id: '9-8-333',
    name: '9/8 (3+3+3)',
    bpm: 120,
    timeSignature: '9/8',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 9, active: true, muted: false, pattern: [2, 1, 1, 2, 1, 1, 2, 1, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
  },
  {
    id: '9-8-2223',
    name: '9/8 (2+2+2+3)',
    bpm: 120,
    timeSignature: '9/8',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 9, active: true, muted: false, pattern: [2, 1, 2, 1, 2, 1, 2, 1, 1] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
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
    startBeat: 1,
  },
  {
    id: 'soleas-palmas-double',
    name: 'Soleás + Palmas 2x',
    bpm: 80,
    timeSignature: '12-Beat (2x Palmas)',
    voices: [
      { id: 0, sound: MetronomeSound.Woodblock, volume: 1, beats: 12, active: true, muted: false, pattern: [0, 0, 2, 0, 0, 2, 0, 2, 0, 2, 0, 2] },
      { 
        id: 1, sound: MetronomeSound.Clap, volume: 0.85, beats: 24, active: true, muted: false, isDoubleTime: true,
        pattern: [0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2] 
      },
    ],
    countIn: false,
    type: TimeSignatureType.Flamenco,
    startBeat: 1,
  },
  {
    id: 'funk-double-hihat',
    name: '4/4 (2x Double Time)',
    bpm: 100,
    timeSignature: '4/4 (2x Layer)',
    voices: [
      { id: 0, sound: MetronomeSound.Kick, volume: 1, beats: 4, active: true, muted: false, pattern: [2, 0, 1, 0] },
      { id: 1, sound: MetronomeSound.HiHat, volume: 0.7, beats: 8, active: true, muted: false, isDoubleTime: true, pattern: [2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 2, sound: MetronomeSound.Clap, volume: 0.8, beats: 4, active: true, muted: false, pattern: [0, 2, 0, 2] },
    ],
    countIn: true,
    type: TimeSignatureType.Standard,
    startBeat: 1,
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
    startBeat: 1,
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
    startBeat: 1,
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
    startBeat: 1,
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
    startBeat: 1,
  }
];
