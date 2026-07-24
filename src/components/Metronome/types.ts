/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TimeSignatureType {
  Standard = 'standard',
  Flamenco = 'flamenco',
  TradIrish = 'trad_irish',
  Polyrhythm = 'polyrhythm'
}

export enum MetronomeSound {
  Kick = 'kick',
  Snare = 'snare',
  HiHat = 'hihat',
  Bass = 'bass',
  Clap = 'clap',
  Woodblock = 'woodblock',
  Cowbell = 'cowbell',
  ClockTick = 'clocktick',
  Bodhran = 'bodhran'
}

export interface MetronomeVoice {
  id: number;
  sound: MetronomeSound;
  volume: number;
  muted?: boolean;
  beats: number; // For polyrhythm: x in x:y
  active: boolean;
  pattern?: number[]; // custom beat pattern: 0: silent, 1: normal, 2: accent
}

export interface BeatPattern {
  id: string;
  name: string;
  bpm: number;
  timeSignature: string;
  voices: MetronomeVoice[];
  countIn: boolean;
  type: TimeSignatureType;
  isUserPreset?: boolean;
  displayOffset?: number; // Starting count offset (e.g., 11 for a 12-beat cycle starting at 12)
}
