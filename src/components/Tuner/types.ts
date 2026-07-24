/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TunerResult {
  note: string;
  frequency: number;
  cents: number;
  octave: number;
  isHolding?: boolean;
}

export interface InstrumentTuning {
  name: string;
  notes: string[]; // e.g. ["E2", "A2", "D3", "G3", "B3", "E4"]
}

export interface InstrumentGroup {
  name: string;
  tunings: InstrumentTuning[];
}
