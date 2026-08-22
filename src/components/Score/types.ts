/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ScoreFormat {
  Image = 'image',
  PDF = 'pdf',
  ABC = 'abc',
  Text = 'text',
  MusicXML = 'musicxml',
  GuitarPro = 'guitarpro',
  ChordSheet = 'chordsheet'
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
  tablature?: 'guitar' | 'ukulele' | 'mandolin' | 'banjo' | 'violin' | 'none';
  tuning?: string[]; // Array of strings for string tunings e.g. ['E,', 'A,', 'D'...]
  isMxl?: boolean; // Indicates if MusicXML score is/was compressed .mxl format
  abcRenderer?: 'auto' | 'abcjs' | 'abc2svg'; // Renderer preference for ABC scores
  chordEngine?: 'auto' | 'chordsOverWords' | 'ultimateGuitar' | 'chordpro'; // Renderer/Parser choice for ChordSheet
  chordFormat?: 'html' | 'text' | 'chordpro'; // Output display format for ChordSheet
  accidentalPreference?: '#' | 'b'; // Sharp (#) vs Flat (b) preference for ChordSheet
  sourceUrl?: string; // Original URL if loaded from a URL
}
