/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ErhuKeyInfo } from './types.ts';

/**
 * Standard Erhu keys with traditional D4–A4 (内弦 D4, 外弦 A4) string degree mappings.
 * tonicMidi represents Jianpu middle-octave "1" in the standard Erhu tessitura.
 */
export const ERHU_KEYS: ErhuKeyInfo[] = [
  {
    key: 'D',
    label: '1=D',
    strings: '1-5',
    stringsLabel: '1-5弦 (内D 外A)',
    tonicMidi: 62, // D4
    description: 'Standard beginner & folk key (inner open = 1, outer open = 5)'
  },
  {
    key: 'G',
    label: '1=G',
    strings: '5-2',
    stringsLabel: '5-2弦 (内D 外A)',
    tonicMidi: 67, // G4 (inner open D4 = 5,)
    description: 'Most expressive solo key (Erquan Yingyue, Liangzhu)'
  },
  {
    key: 'F',
    label: '1=F',
    strings: '6-3',
    stringsLabel: '6-3弦 (内D 外A)',
    tonicMidi: 65, // F4 (inner open D4 = 6,)
    description: 'Bright energetic key (Sai Ma / Horse Racing)'
  },
  {
    key: 'C',
    label: '1=C',
    strings: '2-6',
    stringsLabel: '2-6弦 (内D 外A)',
    tonicMidi: 60, // C4 (inner open D4 = 2)
    description: 'Warm lyrical key (inner open = 2, outer open = 6)'
  },
  {
    key: 'Bb',
    label: '1=bB',
    strings: '3-7',
    stringsLabel: '3-7弦 (内D 外A)',
    tonicMidi: 58, // Bb3 (inner open D4 = 3)
    description: 'Rich, resonant orchestral & opera key'
  },
  {
    key: 'A',
    label: '1=A',
    strings: '4-1',
    stringsLabel: '4-1弦 (内D 外A)',
    tonicMidi: 69, // A4 (inner open D4 = 4,)
    description: 'Brilliant high-register folk & dance key'
  },
  {
    key: 'Eb',
    label: '1=bE',
    strings: '7-4',
    stringsLabel: '7-4弦 (内D 外A)',
    tonicMidi: 63, // Eb4
    description: 'Orchestral & dramatic repertoire key'
  },
  {
    key: 'E',
    label: '1=E',
    strings: 'b7-4',
    stringsLabel: 'b7-4弦 (内D 外A)',
    tonicMidi: 64, // E4
    description: 'Bright solo key'
  },
  {
    key: 'Ab',
    label: '1=bA',
    strings: '#4-#1',
    stringsLabel: '#4-#1弦 (内D 外A)',
    tonicMidi: 68, // Ab4
    description: 'Lyrical orchestral key'
  },
  {
    key: 'B',
    label: '1=B',
    strings: 'b3-b7',
    stringsLabel: 'b3-b7弦 (内D 外A)',
    tonicMidi: 59, // B3
    description: 'Extended repertoire key'
  },
  {
    key: 'Db',
    label: '1=bD',
    strings: '#1-#5',
    stringsLabel: '#1-#5弦 (内D 外A)',
    tonicMidi: 61, // Db4
    description: 'Extended repertoire key'
  },
  {
    key: 'Gb',
    label: '1=bG',
    strings: '#5-#2',
    stringsLabel: '#5-#2弦 (内D 外A)',
    tonicMidi: 66, // Gb4
    description: 'Extended repertoire key'
  }
];

const CHROMATIC_ORDER = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const KEY_ALIASES: Record<string, string> = {
  'C': 'C',
  'C#': 'Db', 'DB': 'Db', 'BC': 'B',
  'D': 'D',
  'D#': 'Eb', 'EB': 'Eb', 'BE': 'Eb',
  'E': 'E',
  'F': 'F',
  'F#': 'Gb', 'GB': 'Gb', 'BG': 'Gb',
  'G': 'G',
  'G#': 'Ab', 'AB': 'Ab', 'BA': 'Ab',
  'A': 'A',
  'A#': 'Bb', 'BB': 'Bb',
  'B': 'B'
};

export function normalizeKeyName(raw: string): string {
  if (!raw) return 'D';
  let cleaned = raw.trim().replace(/^1\s*=\s*/i, '').trim();
  // Handle Chinese/Jianpu flat prefix like "bB", "bE", "♭B"
  cleaned = cleaned.replace(/♭/g, 'b').replace(/♯/g, '#');
  if (/^b[A-Ga-g]$/.test(cleaned)) {
    cleaned = cleaned[1].toUpperCase() + 'b';
  } else if (/^#[A-Ga-g]$/.test(cleaned)) {
    cleaned = cleaned[1].toUpperCase() + '#';
  }
  const upper = cleaned.toUpperCase();
  return KEY_ALIASES[upper] || 'D';
}

export function getErhuKeyInfo(rawKey: string): ErhuKeyInfo {
  const norm = normalizeKeyName(rawKey);
  return ERHU_KEYS.find(k => k.key === norm) || ERHU_KEYS[0];
}

export function formatJianpuKeyLabel(rawKey: string): string {
  const info = getErhuKeyInfo(rawKey);
  return info.label;
}

export function transposeKeyName(rawKey: string, semitones: number): string {
  const norm = normalizeKeyName(rawKey);
  const idx = CHROMATIC_ORDER.indexOf(norm);
  if (idx === -1) return norm;
  const nextIdx = ((idx + semitones) % 12 + 12) % 12;
  return CHROMATIC_ORDER[nextIdx];
}

/**
 * Major scale semitone offsets for Jianpu degrees 1..7
 */
const DEGREE_SEMITONES: Record<number, number> = {
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11
};

export function jianpuToMidi(
  degree: number,
  octave: number,
  accidental: '#' | 'b' | '=' | null,
  keyName: string,
  transposeSemitones: number = 0
): number | null {
  if (degree < 1 || degree > 7) return null;
  const keyInfo = getErhuKeyInfo(keyName);
  let midi = keyInfo.tonicMidi + DEGREE_SEMITONES[degree] + octave * 12 + transposeSemitones;
  if (accidental === '#') midi += 1;
  if (accidental === 'b') midi -= 1;
  return Math.max(24, Math.min(108, midi));
}

export const CHINESE_FINGERS: Record<string, string> = {
  '0': '0',
  '1': '一',
  '2': '二',
  '3': '三',
  '4': '四'
};
