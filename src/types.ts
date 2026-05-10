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

export interface InstrumentTuning {
  name: string;
  notes: string[]; // e.g. ["E2", "A2", "D3", "G3", "B3", "E4"]
}

export interface InstrumentGroup {
  name: string;
  tunings: InstrumentTuning[];
}

export enum DroneTone {
  Strings = 'strings',
  Cello = 'cello',
  Bagpipe = 'bagpipe',
  UilleannPipes = 'uilleann_pipes',
  Accordion = 'accordion',
  SynthLead = 'synth_lead'
}

export enum InstrumentType {
  Piano = 'piano',
  Organ = 'organ',
  Strings = 'strings',
  Guitar = 'guitar',
  Bass = 'bass'
}

export enum ScoreFormat {
  Image = 'image',
  PDF = 'pdf',
  ABC = 'abc',
  Text = 'text',
  MusicXML = 'musicxml'
}

export interface ScoreData {
  id: string;
  title: string;
  format: ScoreFormat;
  content: string | string[]; // Single content or array of images
  zoom: number;
  pan: { x: number; y: number };
  viewMode?: 'scroll' | 'single' | 'double';
  audioUrl?: string; // URL for associated audio file
  audioName?: string;
  showEditor?: boolean;
  selectedTuneIndex?: number;
  transpose?: number;
  tablature?: 'guitar' | 'ukulele' | 'mandolin' | 'banjo' | 'dadgad' | 'none';
  tuning?: string[]; // Array of strings for string tunings e.g. ['E2', 'A2'...]
}

export interface TunerResult {
  note: string;
  frequency: number;
  cents: number;
  octave: number;
  isHolding?: boolean;
}
