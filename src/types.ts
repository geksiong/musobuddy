/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum InstrumentType {
  Piano = 'piano',
  ElectricPiano = 'epiano',
  Organ = 'organ',
  Strings = 'strings',
  Guitar = 'guitar',
  Bass = 'bass',
  Flute = 'flute',
  Brass = 'brass',
  Marimba = 'marimba'
}

export * from './components/Metronome/types.ts';
export * from './components/Drone/types.ts';
export * from './components/Tuner/types.ts';
export * from './components/Score/types.ts';
export * from './components/Accompaniment/types.ts';
