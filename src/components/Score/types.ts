/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  tablature?: 'guitar' | 'ukulele' | 'mandolin' | 'banjo' | 'violin' | 'none';
  tuning?: string[]; // Array of strings for string tunings e.g. ['E,', 'A,', 'D'...]
}
