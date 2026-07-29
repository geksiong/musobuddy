/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentGroup } from './types.ts';

export const INSTRUMENT_TUNINGS: InstrumentGroup[] = [
  {
    name: 'Guitar',
    tunings: [
      { name: 'E Standard', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
      { name: 'Drop D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
      { name: 'Open D', notes: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'] },
      { name: 'Open G', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
      { name: 'DADGAD', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
      { name: 'Open C', notes: ['C2', 'G2', 'C3', 'G3', 'C4', 'E4'] },
      { name: 'Half-Step Down', notes: ['D#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'] },
      { name: '7-String Standard', notes: ['B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    ],
  },
  {
    name: 'Ukulele',
    tunings: [
      { name: 'Standard (High G)', notes: ['G4', 'C4', 'E4', 'A4'] },
      { name: 'Low G', notes: ['G3', 'C4', 'E4', 'A4'] },
      { name: 'Slack-Key (GCEG)', notes: ['G4', 'C4', 'E4', 'G4'] },
      { name: 'Soprano D-Tuning (ADF#B)', notes: ['A4', 'D4', 'F#4', 'B4'] },
      { name: 'Baritone Standard', notes: ['D3', 'G3', 'B3', 'E4'] },
      { name: 'Baritone Open G', notes: ['D3', 'G3', 'B3', 'D4'] },
    ],
  },
  {
    name: '5-String Banjo',
    tunings: [
      { name: 'Standard / Open G (gDGBD)', notes: ['G4', 'D3', 'G3', 'B3', 'D4'] },
      { name: 'Old-Time G / Sawmill (gDGCD)', notes: ['G4', 'D3', 'G3', 'C4', 'D4'] },
      { name: 'Drop C (gCGCD)', notes: ['G4', 'C3', 'G3', 'C4', 'D4'] },
      { name: 'Double C (gCGCD)', notes: ['G4', 'C3', 'G3', 'C4', 'D4'] },
      { name: 'Open D (f#DF#AD)', notes: ['F#4', 'D3', 'F#3', 'A3', 'D4'] },
    ],
  },
  {
    name: 'Violin / Mandolin',
    tunings: [
      { name: 'Standard (GDAE)', notes: ['G3', 'D4', 'A4', 'E5'] },
      { name: 'Mandolin GDAD', notes: ['G3', 'D4', 'A4', 'D5'] },
      { name: 'Violin Sawmill / Cross (AEAE)', notes: ['A3', 'E4', 'A4', 'E5'] },
    ],
  },
  {
    name: 'Viola / Cello',
    tunings: [
      { name: 'Viola Standard', notes: ['C3', 'G3', 'D4', 'A4'] },
      { name: 'Cello Standard', notes: ['C2', 'G2', 'D3', 'A3'] },
    ],
  },
  {
    name: 'Bass Guitar',
    tunings: [
      { name: '4-String E Standard', notes: ['E1', 'A1', 'D2', 'G2'] },
      { name: '4-String Drop D', notes: ['D1', 'A1', 'D2', 'G2'] },
      { name: '5-String Standard', notes: ['B0', 'E1', 'A1', 'D2', 'G2'] },
    ],
  },
  {
    name: 'Cavaquinho',
    tunings: [
      { name: 'Standard (DGBD)', notes: ['D4', 'G4', 'B4', 'D5'] },
    ],
  },
  {
    name: 'Charango',
    tunings: [
      { name: 'Standard (GCEAE)', notes: ['G4', 'C5', 'E5', 'A4', 'E5'] },
    ],
  },
  {
    name: 'Cuatro',
    tunings: [
      { name: 'Puerto Rican Cuatro', notes: ['B2', 'E3', 'A3', 'D4', 'G4'] },
      { name: 'Venezuelan Cuatro (aDF#B)', notes: ['A4', 'D4', 'F#4', 'B3'] },
    ],
  },
];
