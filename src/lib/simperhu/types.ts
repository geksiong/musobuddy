/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccidentalType = '#' | 'b' | '=' | null;

export type BowingType =
  | 'pull'    // 拉弓 Π (down-bow)
  | 'push'    // 推弓 V (up-bow)
  | 'trem'    // 颤弓 / 抖弓 ///
  | 'stacc'   // 顿弓 ▼
  | 'spicc'   // 跳弓 ·
  | 'retake'  // 换弓 / 提弓 ,
  | 'pizz';   // 拨弦 +

export type StringType = 'in' | 'out'; // 内弦 | 外弦

export type OrnamentType =
  | 'su'      // 上滑音 ↗
  | 'sd'      // 下滑音 ↘
  | 'sr'      // 回滑音 ⌒
  | 'vib'     // 揉弦 〰
  | 'pvib'    // 压揉 压
  | 'tr'      // 颤音 tr
  | 'da'      // 打音 打
  | 'fermata' // 延长 𝄐
  | 'accent'  // 重音 >
  | 'harm'    // 自然泛音 ○
  | 'aharm'   // 人工泛音 ◇
  | 'shiftUp'   // 上换把 ↑
  | 'shiftDown'; // 下换把 ↓

export type DynamicType =
  | 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff'
  | 'sfz' | 'cresc' | 'dim' | 'rit' | 'accel' | 'atempo';

export interface ErhuMarkings {
  bowing?: BowingType;
  finger?: '0' | '1' | '2' | '3' | '4';
  string?: StringType;
  ornaments: OrnamentType[];
  dynamic?: DynamicType;
  customText?: string;
}

export interface GraceNote {
  degree: number; // 1-7
  octave: number; // -2..+2
  accidental: AccidentalType;
  underlines: number; // typically 1 or 2
}

export interface SimpErhuNote {
  kind: 'note';
  id: string;
  /** 0 = rest, 1-7 = scale degree, -1 = prolongation dash '-' */
  degree: number;
  octave: number; // -2, -1, 0, 1, 2
  accidental: AccidentalType;
  /** Number of duration underlines: 0=quarter, 1=8th, 2=16th, 3=32nd */
  underlines: number;
  /** Augmentation dots (0, 1, or 2) */
  dots: number;
  /** Tied to next note */
  tiedToNext?: boolean;
  /** Grace notes preceding this note */
  graceNotes: GraceNote[];
  /** Erhu bowing, fingering, string, ornaments, dynamics */
  markings: ErhuMarkings;
  /** Slur group IDs for rendering SVG arcs */
  slurStart?: boolean;
  slurEnd?: boolean;
  slurId?: number;
  /** Tuplet metadata (e.g. 3 for triplet) */
  tupletStart?: number;
  tupletEnd?: boolean;
  /** Assigned lyric syllable if a matching L: line follows */
  lyric?: string;
  /** Character offsets in source text for bidirectional editor sync */
  startOffset: number;
  endOffset: number;
  lineNumber: number;
}

export interface BeatGroup {
  kind: 'group';
  id: string;
  notes: SimpErhuNote[];
}

export type BarlineType = '|' | '||' | '|]' | '|:' | ':|' | ':||:';

export interface SimpErhuMeasure {
  id: string;
  measureNumber: number;
  startBarline?: BarlineType;
  endBarline?: BarlineType;
  volta?: string; // e.g. "1." or "2."
  groups: BeatGroup[];
  startOffset: number;
  endOffset: number;
  lineNumber: number;
}

export interface MusicLineNode {
  kind: 'music';
  id: string;
  lineNumber: number;
  measures: SimpErhuMeasure[];
  rawLyrics?: string[];
}

export interface SectionLineNode {
  kind: 'section';
  id: string;
  lineNumber: number;
  text: string;
}

export interface TextLineNode {
  kind: 'text';
  id: string;
  lineNumber: number;
  text: string;
}

export type SimpErhuLine = MusicLineNode | SectionLineNode | TextLineNode;

export interface SimpErhuHeader {
  title: string;
  subtitle?: string;
  composer?: string;
  arranger?: string;
  key: string;        // e.g. "D", "G", "F", "C", "Bb", "A", "Eb"
  strings?: string;   // e.g. "1-5", "5-2", "6-3"
  time: string;       // e.g. "4/4", "2/4", "3/4", "6/8"
  tempo: number;      // BPM, e.g. 72
  expression?: string; // e.g. "如歌地 Adagio"
  columns?: number;   // optional measures per row hint
}

export interface SimpErhuDocument {
  header: SimpErhuHeader;
  lines: SimpErhuLine[];
  totalMeasures: number;
  totalNotes: number;
}

export interface ErhuKeyInfo {
  key: string;          // e.g. "D"
  label: string;        // e.g. "1=D"
  strings: string;      // e.g. "1-5"
  stringsLabel: string; // e.g. "1-5弦 (D-A)"
  tonicMidi: number;    // MIDI note for 1 in middle octave (relative to D4=62, A4=69 Erhu range)
  description: string;
}
