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
      { name: 'DADGAD', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
    ],
  },
  {
    name: 'Ukulele',
    tunings: [
      { name: 'Standard (High G)', notes: ['G4', 'C4', 'E4', 'A4'] },
      { name: 'Baritone', notes: ['D3', 'G3', 'B3', 'E4'] },
    ],
  },
  {
    name: 'Violin / Mandolin',
    tunings: [
      { name: 'Standard', notes: ['G3', 'D4', 'A4', 'E5'] },
    ],
  },
  {
    name: 'Bass',
    tunings: [
      { name: 'E Standard', notes: ['E1', 'A1', 'D2', 'G2'] },
    ],
  },
];
