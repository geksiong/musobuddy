/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shakuhachi (尺八) Kinko-ryu (琴古流), Tozan-ryu (都山流), and Jin Nyodo (神如道)
 * Honkyoku parser, pitch physics engine, auto-fingering inference, and notation formatter.
 */

import {
  AccidentalType,
  ShakuhachiBendType,
  ShakuhachiMeriKari,
  ShakuhachiNoteData,
  ShakuhachiPitchName,
  ShakuhachiRegister,
  ShakuhachiSchool,
  ShakuhachiTechnique
} from './types.ts';
import { getErhuKeyInfo } from './erhuKeys.ts';

export interface ShakuhachiLengthInfo {
  code: string;        // e.g. "1.8"
  label: string;       // e.g. "1.8尺 (D)"
  kanjiLabel: string;  // e.g. "一尺八寸管"
  roMidi: number;      // Fundamental Ro (ロ) MIDI note (1.8 shaku = D4 = 62)
  keyNote: string;     // Fundamental pitch name
}

export const SHAKUHACHI_LENGTHS: ShakuhachiLengthInfo[] = [
  { code: '1.6', label: '1.6尺 (E)', kanjiLabel: '一尺六寸管', roMidi: 64, keyNote: 'E' },
  { code: '1.7', label: '1.7尺 (Eb)', kanjiLabel: '一尺七寸管', roMidi: 63, keyNote: 'Eb' },
  { code: '1.8', label: '1.8尺 (D)', kanjiLabel: '一尺八寸管', roMidi: 62, keyNote: 'D' },
  { code: '1.9', label: '1.9尺 (Db)', kanjiLabel: '一尺九寸管', roMidi: 61, keyNote: 'Db' },
  { code: '2.0', label: '2.0尺 (C)', kanjiLabel: '二尺管', roMidi: 60, keyNote: 'C' },
  { code: '2.1', label: '2.1尺 (B)', kanjiLabel: '二尺一寸管', roMidi: 59, keyNote: 'B' },
  { code: '2.2', label: '2.2尺 (Bb)', kanjiLabel: '二尺二寸管', roMidi: 58, keyNote: 'Bb' },
  { code: '2.3', label: '2.3尺 (A)', kanjiLabel: '二尺三寸管', roMidi: 57, keyNote: 'A' },
  { code: '2.4', label: '2.4尺 (Ab)', kanjiLabel: '二尺四寸管', roMidi: 56, keyNote: 'Ab' },
  { code: '2.5', label: '2.5尺 (G)', kanjiLabel: '二尺五寸管', roMidi: 55, keyNote: 'G' }
];

export type HoleState = 'closed' | 'open' | 'half';

export interface ShakuhachiFingeringMeta {
  id: ShakuhachiPitchName;
  kinko: string;
  tozan: string;
  romaji: string;
  /** Semitone offset above Otsu Ro (D4=0) before register/meri adjustment */
  baseSemitone: number;
  /** Default register if none explicitly given */
  defaultRegister: ShakuhachiRegister;
  /** 5 holes: [thumb5, hole4, hole3, hole2, hole1] from top to bottom */
  holes: [HoleState, HoleState, HoleState, HoleState, HoleState];
  pitch18: string;
  description: string;
}

export const SHAKUHACHI_FINGERING_TABLE: Record<ShakuhachiPitchName, ShakuhachiFingeringMeta> = {
  ro: {
    id: 'ro',
    kinko: 'ロ',
    tozan: 'ロ',
    romaji: 'Ro',
    baseSemitone: 0,
    defaultRegister: 'otsu',
    holes: ['closed', 'closed', 'closed', 'closed', 'closed'],
    pitch18: 'D4 / D5',
    description: 'All 5 holes closed — fundamental tonic of the shakuhachi'
  },
  tsu: {
    id: 'tsu',
    kinko: 'ツ',
    tozan: 'ツ',
    romaji: 'Tsu',
    baseSemitone: 3,
    defaultRegister: 'otsu',
    holes: ['closed', 'closed', 'closed', 'closed', 'open'],
    pitch18: 'F4 / F5',
    description: 'Hole 1 open; meri gives E (ツ中メ) and Eb (ツ大メ)'
  },
  re: {
    id: 're',
    kinko: 'レ',
    tozan: 'レ',
    romaji: 'Re',
    baseSemitone: 5,
    defaultRegister: 'otsu',
    holes: ['closed', 'closed', 'closed', 'open', 'open'],
    pitch18: 'G4 / G5',
    description: 'Holes 1 & 2 open; meri gives F# (レメ)'
  },
  u: {
    id: 'u',
    kinko: 'ウ',
    tozan: 'レ',
    romaji: 'U',
    baseSemitone: 4,
    defaultRegister: 'otsu',
    holes: ['closed', 'closed', 'closed', 'open', 'closed'],
    pitch18: 'F#4 / G4(dark)',
    description: 'Kinko dark timbre fingering (hole 2 open, hole 1 closed)'
  },
  ru: {
    id: 'ru',
    kinko: 'ル',
    tozan: 'レ',
    romaji: 'Ru',
    baseSemitone: 4,
    defaultRegister: 'otsu',
    holes: ['closed', 'closed', 'open', 'closed', 'open'],
    pitch18: 'F#4',
    description: 'Kinko alternate shaded fingering (holes 1 & 3 open)'
  },
  chi: {
    id: 'chi',
    kinko: 'チ',
    tozan: 'チ',
    romaji: 'Chi',
    baseSemitone: 7,
    defaultRegister: 'otsu',
    holes: ['closed', 'closed', 'open', 'open', 'open'],
    pitch18: 'A4 / A5',
    description: 'Holes 1, 2 & 3 open; meri gives Ab (チメ)'
  },
  ri: {
    id: 'ri',
    kinko: 'リ',
    tozan: 'ハ',
    romaji: 'Ri / Ha',
    baseSemitone: 10,
    defaultRegister: 'otsu',
    holes: ['closed', 'open', 'open', 'open', 'open'],
    pitch18: 'C5 / C6',
    description: 'Holes 1–4 open, thumb closed (Kinko リ · Tozan ハ)'
  },
  ha: {
    id: 'ha',
    kinko: 'ハ',
    tozan: 'ハ',
    romaji: 'Ha',
    baseSemitone: 10,
    defaultRegister: 'otsu',
    holes: ['closed', 'open', 'open', 'open', 'open'],
    pitch18: 'C5 / C6',
    description: 'Tozan primary C fingering / Kinko alternate C fingering'
  },
  i: {
    id: 'i',
    kinko: 'イ',
    tozan: 'ハ',
    romaji: 'I',
    baseSemitone: 9,
    defaultRegister: 'otsu',
    holes: ['open', 'closed', 'open', 'open', 'open'],
    pitch18: 'B4 / Bb4',
    description: 'Thumb open, hole 4 closed — shaded B/Bb fingering'
  },
  hi: {
    id: 'hi',
    kinko: 'ヒ',
    tozan: 'ヒ',
    romaji: 'Hi',
    baseSemitone: 12,
    defaultRegister: 'kan',
    holes: ['open', 'open', 'open', 'open', 'open'],
    pitch18: 'D5 / D6',
    description: 'Upper octave / Dai-kan high D (all holes open or overblown)'
  },
  pi: {
    id: 'pi',
    kinko: 'ヒ',
    tozan: 'ピ',
    romaji: 'Pi',
    baseSemitone: 12,
    defaultRegister: 'daikan',
    holes: ['open', 'open', 'closed', 'open', 'open'],
    pitch18: 'D6',
    description: 'Tozan Dai-kan (大甲) high register D6'
  },
  ta: {
    id: 'ta',
    kinko: 'タ',
    tozan: 'タ',
    romaji: 'Ta',
    baseSemitone: 15,
    defaultRegister: 'daikan',
    holes: ['open', 'closed', 'closed', 'open', 'closed'],
    pitch18: 'F6',
    description: 'Dai-kan extreme upper register F6'
  }
};

export const SHAKUHACHI_BEND_LABELS: Record<
  ShakuhachiBendType,
  { jp: string; shortJp: string; romaji: string; en: string }
> = {
  nayashi: { jp: '萎し', shortJp: '萎', romaji: 'Nayashi', en: 'Start flat in meri & bloom smoothly up into pitch' },
  'suri-up': { jp: '擦り上げ', shortJp: '擦↑', romaji: 'Suri-age', en: 'Smooth upward finger/chin glide' },
  'suri-down': { jp: '擦り下げ', shortJp: '擦↓', romaji: 'Suri-sage', en: 'Smooth downward finger/chin glide' },
  merikomi: { jp: 'メリ込み', shortJp: 'メ込', romaji: 'Merikomi', en: 'Dip smoothly downward into meri at tone tail' },
  sori: { jp: '反り', shortJp: '反', romaji: 'Sori', en: 'Expressive upward scoop then release' },
  otoshi: { jp: '落とし', shortJp: '落', romaji: 'Otoshi', en: 'Jin Nyodo sharp downward angle drop-off' }
};

export const SHAKUHACHI_TECHNIQUE_LABELS: Record<
  ShakuhachiTechnique,
  { jp: string; shortJp: string; romaji: string; en: string }
> = {
  atari: { jp: '当り', shortJp: 'ア', romaji: 'Atari', en: 'Crisp finger articulation accent' },
  uchi: { jp: '打ち', shortJp: '打', romaji: 'Uchi', en: 'Quick finger tap on lower hole' },
  oshi: { jp: '押し', shortJp: '押', romaji: 'Oshi', en: 'Finger press/pop from above' },
  yuri: { jp: 'ユリ', shortJp: 'ユ', romaji: 'Yuri', en: 'Head vibrato (pitch/timbre wave)' },
  yokoyuri: { jp: '横ユリ', shortJp: '横ユ', romaji: 'Yoko-yuri', en: 'Horizontal head vibrato' },
  tateyuri: { jp: '縦ユリ', shortJp: '縦ユ', romaji: 'Tate-yuri', en: 'Vertical chin meri-kari vibrato' },
  mawashi: { jp: '回しユリ', shortJp: '回ユ', romaji: 'Mawashi-yuri', en: 'Circular head vibrato' },
  korokoro: { jp: 'コロコロ', shortJp: 'コロ', romaji: 'Korokoro', en: 'Characteristic bamboo warble on holes 1 & 2' },
  karakara: { jp: 'カラカラ', shortJp: 'カラ', romaji: 'Karakara', en: 'Rapid finger rattle on hole 1' },
  komi: { jp: 'コミ吹き', shortJp: 'コミ', romaji: 'Komi-buki', en: 'Pulsating abdominal breath pushes' },
  muraiki: { jp: 'ムラ息', shortJp: 'ムラ', romaji: 'Muraiki', en: 'Explosive breathy wind-rush tone' },
  tamane: { jp: '玉音', shortJp: '玉', romaji: 'Tamane', en: 'Flutter-tongue / throat-rolled trill' },
  kiri: { jp: '切り', shortJp: '切', romaji: 'Kiri', en: 'Crisp breath cutoff' },
  breath: { jp: '息継ぎ', shortJp: '∨', romaji: 'Ikitsugi', en: 'Breath intake / phrase break' },
  ma: { jp: '間', shortJp: '〇', romaji: 'Ma', en: 'Contemplative silence / resonant space' },
  suri: { jp: 'スリ', shortJp: 'スリ', romaji: 'Suri', en: 'Legato sliding transition' }
};

export const SHAKUHACHI_MERIKARI_LABELS: Record<
  ShakuhachiMeriKari,
  { kinko: string; tozan: string; en: string; semitoneDelta: number }
> = {
  meri: { kinko: 'メ', tozan: 'メ', en: 'Meri (-1 st)', semitoneDelta: -1 },
  chumeri: { kinko: '中', tozan: '中メ', en: 'Chū-meri (-1 st)', semitoneDelta: -1 },
  daimeri: { kinko: '大メ', tozan: '大メ', en: 'Dai-meri (-2 st)', semitoneDelta: -2 },
  kari: { kinko: 'カ', tozan: 'カ', en: 'Kari (+1 st)', semitoneDelta: 1 }
};

export const SHAKUHACHI_REGISTER_LABELS: Record<
  ShakuhachiRegister,
  { jp: string; romaji: string; en: string }
> = {
  otsu: { jp: '乙', romaji: 'Otsu', en: 'Lower octave (乙音)' },
  kan: { jp: '甲', romaji: 'Kan', en: 'Upper octave (甲音)' },
  daikan: { jp: '大甲', romaji: 'Dai-kan', en: 'Highest octave (大甲)' }
};

/**
 * Resolves shakuhachi tube length metadata from `@flute` / `@length` header (defaults to 1.8尺 D4).
 */
export function getShakuhachiLengthInfo(fluteKey?: string): ShakuhachiLengthInfo {
  if (fluteKey) {
    const match = fluteKey.match(/(1\.[6-9]|2\.[0-5])/);
    if (match) {
      const found = SHAKUHACHI_LENGTHS.find(l => l.code === match[1]);
      if (found) return found;
    }
    const lower = fluteKey.toLowerCase();
    if (lower.includes('二尺管') || lower.includes('2尺')) {
      return SHAKUHACHI_LENGTHS.find(l => l.code === '2.0')!;
    }
    if (lower.includes('一尺六寸')) return SHAKUHACHI_LENGTHS[0];
    if (lower.includes('一尺八寸')) return SHAKUHACHI_LENGTHS[2];
    if (lower.includes('二尺一寸')) return SHAKUHACHI_LENGTHS[5];
    if (lower.includes('二尺二寸')) return SHAKUHACHI_LENGTHS[6];
    if (lower.includes('二尺四寸')) return SHAKUHACHI_LENGTHS[8];
  }
  return SHAKUHACHI_LENGTHS[2]; // Standard 1.8尺 (D4 = MIDI 62)
}

/**
 * Returns the authentic Katakana symbol for a fingering in either Kinko-ryu or Tozan-ryu.
 */
export function getShakuhachiKatakana(
  fingering: ShakuhachiPitchName,
  school: ShakuhachiSchool = 'kinko'
): string {
  const meta = SHAKUHACHI_FINGERING_TABLE[fingering];
  return school === 'tozan' ? meta.tozan : meta.kinko;
}

/**
 * Returns effective meriKari badge for display (e.g. Kinko ウ/イ map to Tozan レメ / ハメ).
 */
export function getEffectiveMeriKariForSchool(
  data: ShakuhachiNoteData,
  school: ShakuhachiSchool
): ShakuhachiMeriKari | undefined {
  if (data.meriKari) return data.meriKari;
  if (school === 'tozan' && (data.fingering === 'u' || data.fingering === 'ru' || data.fingering === 'i')) {
    return 'meri';
  }
  return undefined;
}

/**
 * Computes concert MIDI pitch from a ShakuhachiNoteData AST and tube length.
 */
export function computeShakuhachiMidi(
  data: ShakuhachiNoteData,
  fluteKey?: string,
  transposeSemitones: number = 0
): number | null {
  if (!data.fingering) return null;
  const lengthInfo = getShakuhachiLengthInfo(fluteKey);
  const meta = SHAKUHACHI_FINGERING_TABLE[data.fingering];
  if (!meta) return null;

  let semitone = meta.baseSemitone;
  const reg = data.register;
  // Handle register octave lift carefully for notes whose baseSemitone already sits at 12+
  if (data.fingering === 'hi') {
    if (reg === 'daikan') semitone = 24;
    else if (reg === 'otsu') semitone = 12;
    else semitone = 12; // Kan / Otsu upper D5
  } else if (data.fingering === 'pi') {
    semitone = reg === 'kan' ? 12 : 24;
  } else if (data.fingering === 'ta') {
    semitone = 27;
  } else {
    if (reg === 'kan') semitone += 12;
    else if (reg === 'daikan') semitone += 24;
  }

  if (data.meriKari) {
    semitone += SHAKUHACHI_MERIKARI_LABELS[data.meriKari].semitoneDelta;
  }

  return Math.max(36, Math.min(96, lengthInfo.roMidi + semitone + transposeSemitones));
}

/**
 * Infers the most idiomatic Shakuhachi fingering from a concert MIDI pitch & tube length.
 * Used when a Shakuhachi score writes Jianpu digits without explicit `{ロ}` katakana tags.
 */
export function inferShakuhachiFromMidi(
  midi: number,
  fluteKey?: string,
  school: ShakuhachiSchool = 'kinko'
): ShakuhachiNoteData {
  const lengthInfo = getShakuhachiLengthInfo(fluteKey);
  let rel = midi - lengthInfo.roMidi;

  // Clamp very low notes up an octave if below Ro daimeri
  while (rel < -2) rel += 12;
  while (rel > 27) rel -= 12;

  if (rel === -2) return { fingering: 'ro', register: 'otsu', meriKari: 'daimeri' };
  if (rel === -1) return { fingering: 'ro', register: 'otsu', meriKari: 'meri' };

  const octave = Math.floor(rel / 12); // 0 = otsu, 1 = kan, 2 = daikan
  const pc = ((rel % 12) + 12) % 12;
  const register: ShakuhachiRegister = octave >= 2 ? 'daikan' : octave === 1 ? 'kan' : 'otsu';

  if (rel === 24) {
    return { fingering: school === 'tozan' ? 'pi' : 'hi', register: 'daikan' };
  }
  if (rel === 12) {
    return { fingering: 'ro', register: 'kan' };
  }

  const pcMap: Record<number, { f: ShakuhachiPitchName; mk?: ShakuhachiMeriKari }> = {
    0: { f: 'ro' },
    1: { f: 'tsu', mk: 'daimeri' },
    2: { f: 'tsu', mk: 'chumeri' },
    3: { f: 'tsu' },
    4: { f: 're', mk: 'meri' },
    5: { f: 're' },
    6: { f: 'chi', mk: 'meri' },
    7: { f: 'chi' },
    8: { f: school === 'tozan' ? 'ha' : 'ri', mk: 'daimeri' },
    9: { f: school === 'tozan' ? 'ha' : 'ri', mk: 'meri' },
    10: { f: school === 'tozan' ? 'ha' : 'ri' },
    11: { f: 'ro', mk: 'meri' } // high leading tone / Ro meri in next octave
  };

  if (pc === 11) {
    return {
      fingering: 'ro',
      register: octave === 0 ? 'kan' : 'daikan',
      meriKari: 'meri'
    };
  }

  const mapped = pcMap[pc] || { f: 'ro' };
  return {
    fingering: mapped.f,
    register,
    meriKari: mapped.mk
  };
}

/**
 * Converts a concert MIDI note into a Jianpu pitch (degree, octave, accidental) relative to `keyName`.
 * Used so pure-Shakuhachi Honkyoku scores (`{ロ} {ツ} {レ}`) also display accurate Jianpu digits in Dual mode!
 */
export function midiToJianpuPitch(
  midi: number,
  keyName: string
): { degree: number; octave: number; accidental: AccidentalType } {
  const keyInfo = getErhuKeyInfo(keyName);
  const diff = midi - keyInfo.tonicMidi;
  const octave = Math.max(-2, Math.min(2, Math.floor(diff / 12)));
  const pc = ((diff % 12) + 12) % 12;

  const PC_TO_JIANPU: Record<number, { degree: number; accidental: AccidentalType }> = {
    0: { degree: 1, accidental: null },
    1: { degree: 1, accidental: '#' },
    2: { degree: 2, accidental: null },
    3: { degree: 3, accidental: 'b' },
    4: { degree: 3, accidental: null },
    5: { degree: 4, accidental: null },
    6: { degree: 4, accidental: '#' },
    7: { degree: 5, accidental: null },
    8: { degree: 5, accidental: '#' },
    9: { degree: 6, accidental: null },
    10: { degree: 7, accidental: 'b' },
    11: { degree: 7, accidental: null }
  };

  const entry = PC_TO_JIANPU[pc] || { degree: 1, accidental: null };
  return { degree: entry.degree, octave, accidental: entry.accidental };
}

// ---------- Parser Tables ----------

const KATAKANA_TO_PITCH: Record<string, ShakuhachiPitchName> = {
  'ロ': 'ro', 'ろ': 'ro',
  'ツ': 'tsu', 'つ': 'tsu',
  'レ': 're', 'れ': 're',
  'チ': 'chi', 'ち': 'chi',
  'リ': 'ri', 'り': 'ri',
  'ハ': 'ha', 'は': 'ha',
  'ヒ': 'hi', 'ひ': 'hi',
  'ウ': 'u', 'う': 'u',
  'イ': 'i', 'い': 'i',
  'ル': 'ru', 'る': 'ru',
  'ピ': 'pi', 'ぴ': 'pi',
  'タ': 'ta', 'た': 'ta'
};

const ROMAJI_TO_PITCH: Record<string, ShakuhachiPitchName> = {
  ro: 'ro',
  tsu: 'tsu',
  tu: 'tsu',
  re: 're',
  chi: 'chi',
  ti: 'chi',
  ri: 'ri',
  ha: 'ha',
  hi: 'hi',
  u: 'u',
  i: 'i',
  ru: 'ru',
  pi: 'pi',
  ta: 'ta'
};

const BEND_ALIASES: Record<string, ShakuhachiBendType> = {
  nayashi: 'nayashi', '萎し': 'nayashi', '萎': 'nayashi', 'ナヤシ': 'nayashi',
  'suri-up': 'suri-up', suriup: 'suri-up', suriage: 'suri-up', 'suri+': 'suri-up',
  '擦り上げ': 'suri-up', 'スリ上げ': 'suri-up', 'スリ上': 'suri-up', '擦上': 'suri-up',
  'suri-down': 'suri-down', suridown: 'suri-down', surisage: 'suri-down', 'suri-': 'suri-down',
  '擦り下げ': 'suri-down', 'スリ下げ': 'suri-down', 'スリ下': 'suri-down', '擦下': 'suri-down',
  merikomi: 'merikomi', 'メリ込み': 'merikomi', 'メリ込': 'merikomi', 'メ込': 'merikomi',
  sori: 'sori', '反り': 'sori', 'ソリ': 'sori',
  otoshi: 'otoshi', '落とし': 'otoshi', 'オトシ': 'otoshi', '落': 'otoshi'
};

const ALWAYS_SAFE_TECHNIQUES: Record<string, ShakuhachiTechnique> = {
  atari: 'atari', '当り': 'atari', '当たり': 'atari', 'ア': 'atari', '当': 'atari',
  uchi: 'uchi', '打ち': 'uchi',
  oshi: 'oshi', '押し': 'oshi',
  yuri: 'yuri', 'ユリ': 'yuri', '揺り': 'yuri', 'ユ': 'yuri',
  yokoyuri: 'yokoyuri', '横ユリ': 'yokoyuri', '横揺り': 'yokoyuri',
  tateyuri: 'tateyuri', '縦ユリ': 'tateyuri', '縦揺り': 'tateyuri',
  mawashi: 'mawashi', mawashiyuri: 'mawashi', '回しユリ': 'mawashi', '廻しユリ': 'mawashi',
  korokoro: 'korokoro', koro: 'korokoro', 'コロコロ': 'korokoro', 'コロ': 'korokoro',
  karakara: 'karakara', kara: 'karakara', 'カラカラ': 'karakara', 'カラ': 'karakara',
  komi: 'komi', komibuki: 'komi', 'コミ': 'komi', 'コミ吹き': 'komi', '込吹き': 'komi',
  muraiki: 'muraiki', 'ムラ息': 'muraiki', '村息': 'muraiki', 'ムラ': 'muraiki',
  tamane: 'tamane', tama: 'tamane', '玉音': 'tamane', 'タマ': 'tamane',
  kiri: 'kiri', '切り': 'kiri',
  ikitsugi: 'breath', '息継ぎ': 'breath', '息': 'breath', '∨': 'breath',
  suri: 'suri', 'スリ': 'suri', '擦り': 'suri'
};

// Tokens that are only matched as Shakuhachi when instrument === 'shakuhachi' or a shakuhachi token is already on the note
const CONTEXTUAL_TECHNIQUES: Record<string, ShakuhachiTechnique> = {
  '打': 'uchi',
  '押': 'oshi',
  '切': 'kiri',
  '間': 'ma',
  ma: 'ma',
  breath: 'breath',
  v: 'breath'
};

/**
 * Parses a Shakuhachi notation token (Japanese Katakana/Kanji, Jin Nyodo annotation,
 * pitch bend, honkyoku technique, or `sh:` ASCII shorthand) into a partial ShakuhachiNoteData AST.
 */
export function parseShakuhachiToken(
  part: string,
  isShakuhachiContext: boolean = false
): Partial<ShakuhachiNoteData> | null {
  const trimmed = part.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  // 1. Explicit Jin Nyodo / performance instruction prefix: jin:..., 注:..., 指示:...
  const jinMatch = trimmed.match(/^(?:jin|nyodo|inst|note|注|傍注|指示)[:：]\s*(.+)$/i);
  if (jinMatch) {
    let text = jinMatch[1].trim();
    if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'")) ||
      (text.startsWith('「') && text.endsWith('」')) ||
      (text.startsWith('『') && text.endsWith('』')) ||
      (text.startsWith('“') && text.endsWith('”'))
    ) {
      text = text.slice(1, -1).trim();
    }
    return text ? { instructions: [text] } : null;
  }

  // 2. Quoted text inside a shakuhachi score becomes a clean Jin Nyodo side instruction!
  if (
    isShakuhachiContext &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('「') && trimmed.endsWith('」')) ||
      (trimmed.startsWith('『') && trimmed.endsWith('』')) ||
      (trimmed.startsWith('“') && trimmed.endsWith('”')))
  ) {
    const inner = trimmed.slice(1, -1).trim();
    return inner ? { instructions: [inner] } : null;
  }

  // 3. Free-rhythm sustain hold length tags (長, 長長, 極長, 短, hold:2)
  if (isShakuhachiContext) {
    if (trimmed === '長' || lower === 'long') return { holdLength: 2 };
    if (trimmed === '長長' || trimmed === '極長' || lower === 'xlong' || lower === 'verylong') return { holdLength: 3 };
    if (trimmed === '短' || lower === 'short') return { holdLength: 0.5 };
  }
  const holdMatch = trimmed.match(/^hold[:：](\d+(?:\.\d+)?)$/i);
  if (holdMatch) {
    const val = parseFloat(holdMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 6) return { holdLength: val };
  }

  // 4. Standalone register / meri-kari modifiers
  if (lower === 'otsu' || trimmed === '乙') return { register: 'otsu' };
  if (lower === 'kan' || trimmed === '甲') return { register: 'kan' };
  if (lower === 'daikan' || trimmed === '大甲') return { register: 'daikan' };
  if (lower === 'meri' || trimmed === 'メ' || trimmed === 'メリ') return { meriKari: 'meri' };
  if (lower === 'chumeri' || trimmed === '中メ' || trimmed === '中メリ') return { meriKari: 'chumeri' };
  if (lower === 'daimeri' || trimmed === '大メ' || trimmed === '大メリ') return { meriKari: 'daimeri' };
  if (lower === 'kari' || trimmed === 'カ' || trimmed === 'カリ') return { meriKari: 'kari' };

  // 5. Pitch bends & glides (including target-pitch glides like スリレ, suri>re, suri->chi)
  if (BEND_ALIASES[lower] || BEND_ALIASES[trimmed]) {
    return { bends: [BEND_ALIASES[lower] || BEND_ALIASES[trimmed]] };
  }
  const glideTargetJp = trimmed.match(/^(?:スリ|擦り?|glide|suri)(?:->|>|→)?([ロツレチリハヒウイルピタ]|ro|tsu|re|chi|ri|ha|hi|u|i|ru|pi|ta)$/i);
  if (glideTargetJp) {
    const targetRaw = glideTargetJp[1];
    const targetPitch = KATAKANA_TO_PITCH[targetRaw] || ROMAJI_TO_PITCH[targetRaw.toLowerCase()];
    if (targetPitch) {
      return { bends: ['suri-up'], bendTarget: targetPitch };
    }
  }

  // 6. Shakuhachi techniques (always-safe Japanese/Romaji + contextual kanji)
  if (ALWAYS_SAFE_TECHNIQUES[lower] || ALWAYS_SAFE_TECHNIQUES[trimmed]) {
    return { techniques: [ALWAYS_SAFE_TECHNIQUES[lower] || ALWAYS_SAFE_TECHNIQUES[trimmed]] };
  }
  if (isShakuhachiContext && (CONTEXTUAL_TECHNIQUES[lower] || CONTEXTUAL_TECHNIQUES[trimmed])) {
    return { techniques: [CONTEXTUAL_TECHNIQUES[lower] || CONTEXTUAL_TECHNIQUES[trimmed]] };
  }

  // 7. Explicit ASCII `sh:...` compound token: e.g. sh:ro, sh:kan-re, sh:tsu-meri, sh:daikan-hi-kari
  if (/^sh[:：]/i.test(trimmed)) {
    const body = trimmed.replace(/^sh[:：]/i, '').trim();
    const segs = body.split(/[-_\s/]+/).filter(Boolean);
    const out: Partial<ShakuhachiNoteData> = {};
    for (const seg of segs) {
      const sLow = seg.toLowerCase();
      if (sLow === 'otsu' || seg === '乙') out.register = 'otsu';
      else if (sLow === 'kan' || seg === '甲') out.register = 'kan';
      else if (sLow === 'daikan' || seg === '大甲') out.register = 'daikan';
      else if (sLow === 'meri' || seg === 'メ' || seg === 'メリ') out.meriKari = 'meri';
      else if (sLow === 'chumeri' || seg === '中メ' || seg === '中メリ') out.meriKari = 'chumeri';
      else if (sLow === 'daimeri' || seg === '大メ' || seg === '大メリ') out.meriKari = 'daimeri';
      else if (sLow === 'kari' || seg === 'カ' || seg === 'カリ') out.meriKari = 'kari';
      else if (KATAKANA_TO_PITCH[seg]) out.fingering = KATAKANA_TO_PITCH[seg];
      else if (ROMAJI_TO_PITCH[sLow]) out.fingering = ROMAJI_TO_PITCH[sLow];
      else if (BEND_ALIASES[sLow] || BEND_ALIASES[seg]) {
        out.bends = [...(out.bends || []), BEND_ALIASES[sLow] || BEND_ALIASES[seg]];
      } else if (ALWAYS_SAFE_TECHNIQUES[sLow] || ALWAYS_SAFE_TECHNIQUES[seg]) {
        out.techniques = [...(out.techniques || []), ALWAYS_SAFE_TECHNIQUES[sLow] || ALWAYS_SAFE_TECHNIQUES[seg]];
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  // 8. Natural Japanese Shakuhachi Katakana compound token!
  // Grammar: [大甲|甲|乙]? [大メリ|大メ|中メリ|中メ|メリ|メ|カリ|カ]? [ロツレチリハヒウイルピタ] [大メリ|大メ|中メリ|中メ|メリ|メ|カリ|カ]?
  const jpMatch = trimmed.match(
    /^(大甲|甲|乙)?(大メリ|大メ|中メリ|中メ|メリ|メ|カリ|カ)?([ロツレチリハヒウイルピタ])(大メリ|大メ|中メリ|中メ|メリ|メ|カリ|カ)?$/
  );
  if (jpMatch) {
    const [, regRaw, preMk, kana, postMk] = jpMatch;
    const fingering = KATAKANA_TO_PITCH[kana];
    if (!fingering) return null;

    const out: Partial<ShakuhachiNoteData> = { fingering };
    if (regRaw === '大甲') out.register = 'daikan';
    else if (regRaw === '甲') out.register = 'kan';
    else if (regRaw === '乙') out.register = 'otsu';

    const mkRaw = postMk || preMk;
    if (mkRaw === '大メ' || mkRaw === '大メリ') out.meriKari = 'daimeri';
    else if (mkRaw === '中メ' || mkRaw === '中メリ') out.meriKari = 'chumeri';
    else if (mkRaw === 'メ' || mkRaw === 'メリ') out.meriKari = 'meri';
    else if (mkRaw === 'カ' || mkRaw === 'カリ') out.meriKari = 'kari';

    return out;
  }

  // 9. Context-aware bare Romaji fingering when @instrument: shakuhachi (e.g. {ro}, {tsu}, {kan-re}, {tsu-meri})
  if (isShakuhachiContext) {
    const romMatch = lower.match(/^(?:(daikan|kan|otsu)[-_]?)?(ro|tsu|re|chi|ri|ha|hi|pi)(?:[-_]?(daimeri|chumeri|meri|kari))?$/);
    if (romMatch) {
      const [, regRaw, pitchRaw, mkRaw] = romMatch;
      const fingering = ROMAJI_TO_PITCH[pitchRaw];
      if (fingering) {
        const out: Partial<ShakuhachiNoteData> = { fingering };
        if (regRaw === 'daikan' || regRaw === 'kan' || regRaw === 'otsu') out.register = regRaw;
        if (mkRaw === 'daimeri' || mkRaw === 'chumeri' || mkRaw === 'meri' || mkRaw === 'kari') out.meriKari = mkRaw;
        return out;
      }
    }
  }

  return null;
}

/**
 * Merges a parsed ShakuhachiNoteData fragment into an existing ShakuhachiNoteData object.
 */
export function mergeShakuhachiData(
  existing: ShakuhachiNoteData | undefined,
  patch: Partial<ShakuhachiNoteData>
): ShakuhachiNoteData {
  const base: ShakuhachiNoteData = existing
    ? {
        ...existing,
        bends: existing.bends ? [...existing.bends] : undefined,
        techniques: existing.techniques ? [...existing.techniques] : undefined,
        instructions: existing.instructions ? [...existing.instructions] : undefined
      }
    : {};

  if (patch.fingering) base.fingering = patch.fingering;
  if (patch.register) base.register = patch.register;
  if (patch.meriKari) base.meriKari = patch.meriKari;
  if (patch.bendTarget) base.bendTarget = patch.bendTarget;
  if (patch.holdLength !== undefined) base.holdLength = patch.holdLength;

  if (patch.bends && patch.bends.length > 0) {
    const merged = base.bends ? [...base.bends] : [];
    for (const b of patch.bends) {
      if (!merged.includes(b)) merged.push(b);
    }
    base.bends = merged;
  }

  if (patch.techniques && patch.techniques.length > 0) {
    const merged = base.techniques ? [...base.techniques] : [];
    for (const t of patch.techniques) {
      if (!merged.includes(t)) merged.push(t);
    }
    base.techniques = merged;
  }

  if (patch.instructions && patch.instructions.length > 0) {
    const merged = base.instructions ? [...base.instructions] : [];
    for (const inst of patch.instructions) {
      if (!merged.includes(inst)) merged.push(inst);
    }
    base.instructions = merged;
  }

  return base;
}

/**
 * Composes a clean Japanese Katakana token from workbench builder inputs (e.g. "甲ツメ").
 */
export function composeShakuhachiTokenText(params: {
  fingering: ShakuhachiPitchName;
  register?: ShakuhachiRegister;
  meriKari?: ShakuhachiMeriKari | '';
  school?: ShakuhachiSchool;
}): string {
  const regPrefix = params.register === 'daikan' ? '大甲' : params.register === 'kan' ? '甲' : '';
  const kana = getShakuhachiKatakana(params.fingering, params.school || 'kinko');
  const mkSuffix =
    params.meriKari === 'daimeri'
      ? '大メ'
      : params.meriKari === 'chumeri'
        ? '中メ'
        : params.meriKari === 'meri'
          ? 'メ'
          : params.meriKari === 'kari'
            ? 'カ'
            : '';
  return `${regPrefix}${kana}${mkSuffix}`;
}

/**
 * Human-readable Japanese + English tooltip description for a Shakuhachi note.
 */
export function describeShakuhachiNote(
  data: ShakuhachiNoteData,
  school: ShakuhachiSchool = 'kinko'
): string {
  const parts: string[] = [];
  if (data.register && data.register !== 'otsu') {
    const r = SHAKUHACHI_REGISTER_LABELS[data.register];
    parts.push(`${r.jp} (${r.romaji})`);
  }
  if (data.fingering) {
    const meta = SHAKUHACHI_FINGERING_TABLE[data.fingering];
    const kana = getShakuhachiKatakana(data.fingering, school);
    const holesStr = meta.holes.map(h => (h === 'closed' ? '●' : h === 'half' ? '◐' : '○')).join('');
    parts.push(`${kana} (${meta.romaji} · ${holesStr})`);
  }
  if (data.meriKari) {
    const mk = SHAKUHACHI_MERIKARI_LABELS[data.meriKari];
    parts.push(`${school === 'tozan' ? mk.tozan : mk.kinko} (${mk.en})`);
  }
  if (data.bends && data.bends.length > 0) {
    parts.push(data.bends.map(b => `${SHAKUHACHI_BEND_LABELS[b].jp} (${SHAKUHACHI_BEND_LABELS[b].romaji})`).join(' · '));
  }
  if (data.techniques && data.techniques.length > 0) {
    parts.push(data.techniques.map(t => `${SHAKUHACHI_TECHNIQUE_LABELS[t].jp} (${SHAKUHACHI_TECHNIQUE_LABELS[t].romaji})`).join(' · '));
  }
  if (data.instructions && data.instructions.length > 0) {
    parts.push(`「${data.instructions.join(' / ')}」`);
  }
  return parts.join(' · ') || '尺八譜';
}
