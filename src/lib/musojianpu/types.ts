/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type InstrumentType = 'erhu' | 'pipa' | 'guzheng' | 'dizi' | 'xiao' | 'guqin' | 'shakuhachi';

export type GuqinDisplayMode = 'dual' | 'pure-horizontal' | 'pure-vertical';

export type ShakuhachiSchool = 'kinko' | 'tozan';

export type ShakuhachiDisplayMode = 'dual' | 'kinko-vertical' | 'tozan-vertical';

export type ShakuhachiPitchName =
  | 'ro' | 'tsu' | 're' | 'chi' | 'ri' | 'ha' | 'hi' | 'u' | 'i' | 'ru' | 'pi' | 'ta';

export type ShakuhachiRegister = 'otsu' | 'kan' | 'daikan';

export type ShakuhachiMeriKari = 'meri' | 'chumeri' | 'daimeri' | 'kari';

export type ShakuhachiBendType =
  | 'nayashi'    // 萎し (start flat in meri and bloom smoothly up into pitch)
  | 'suri-up'    // 擦り上げ (smooth upward finger/embouchure glide)
  | 'suri-down'  // 擦り下げ (smooth downward glide)
  | 'merikomi'   // メリ込み (dip smoothly down into meri at tail of tone)
  | 'sori'       // 反り (pitch scoop upward then drop)
  | 'otoshi';    // 落とし (Jin Nyodo sharp downward drop-off)

export type ShakuhachiTechnique =
  | 'atari'      // 当り (crisp finger articulation / accent)
  | 'uchi'       // 打ち (quick finger tap on hole)
  | 'oshi'       // 押し (finger press/pop from above)
  | 'yuri'       // ユリ (head vibrato)
  | 'yokoyuri'   // 横ユリ (horizontal head vibrato)
  | 'tateyuri'   // 縦ユリ (vertical head vibrato / meri-kari wave)
  | 'mawashi'    // 回しユリ (circular head vibrato)
  | 'korokoro'   // コロコロ (finger warble on holes 1 & 2)
  | 'karakara'   // カラカラ (finger rattle on hole 1)
  | 'komi'       // コミ吹き (pulsating abdominal breath push)
  | 'muraiki'    // ムラ息 (explosive breathy wind-rush tone)
  | 'tamane'     // 玉音 (flutter-tongue / throat roll)
  | 'kiri'       // 切り (crisp breath cutoff)
  | 'breath'     // 息継ぎ / ∨ (breath intake)
  | 'ma'         // 間 / 〇 (contemplative silence / resonant pause)
  | 'suri';      // スリ (legato slide connector)

export interface ShakuhachiNoteData {
  /** Canonical fingering syllable (ロ, ツ, レ, チ, リ/ハ, ヒ, ウ, イ, etc.) */
  fingering?: ShakuhachiPitchName;
  /** Octave register: 乙 (otsu), 甲 (kan), 大甲 (daikan) */
  register?: ShakuhachiRegister;
  /** Embouchure / chin pitch adjustment: メ, 中メ, 大メ, カ */
  meriKari?: ShakuhachiMeriKari;
  /** Explicit pitch bend / glide gestures */
  bends?: ShakuhachiBendType[];
  /** Optional glide target fingering (e.g. スリレ) */
  bendTarget?: ShakuhachiPitchName;
  /** Traditional shakuhachi techniques & breath gestures */
  techniques?: ShakuhachiTechnique[];
  /** Jin Nyodo style performance & expressive annotations */
  instructions?: string[];
  /** Free-rhythm relative visual & playback hold multiplier (0.5=短, 1=normal, 2=長, 3=長長) */
  holdLength?: number;
}

export type GuqinSoundType = 'san' | 'an' | 'fan';

export type GuqinLeftFinger = 'da' | 'shi' | 'zhong' | 'ming' | 'gui';

export type GuqinRightStroke =
  | 'gou' | 'ti' | 'mo' | 'tiao' | 'da' | 'zhai' | 'pi' | 'tuo'
  | 'li' | 'cuo' | 'fancuo' | 'lun' | 'gun' | 'fu' | 'suo' | 'bo' | 'ruyi';

export type GuqinLeftAction =
  | 'shang' | 'xia' | 'chuo' | 'zhu' | 'yin' | 'nao'
  | 'zhuang' | 'qiaqi' | 'jinfu' | 'tuifu' | 'yan' | 'daiqi'
  | 'fanqi' | 'fanzhi';

export interface GuqinJianzi {
  /** Sound production mode: 散 (open), 按 (stopped), 泛 (harmonic) */
  soundType?: GuqinSoundType;
  /** Left-hand stopping/touching finger: 大/食/中/名/跪 */
  leftFinger?: GuqinLeftFinger;
  /** Hui position (e.g. "7", "9", "10", "7.6", "外") */
  hui?: string;
  /** Target hui for slides (e.g. 上七六) */
  targetHui?: string;
  /** Right-hand plucking technique */
  rightStroke?: GuqinRightStroke;
  /** Primary string 1–7 */
  stringNum?: number;
  /** Secondary string 1–7 for 撮/反撮/历/滚/拂 */
  secondStringNum?: number;
  /** Left-hand actions & expressive ornaments */
  actions?: GuqinLeftAction[];
}

export type AccidentalType = '#' | 'b' | '=' | null;

export type BowingType =
  | 'pull'    // 拉弓 Π (down-bow)
  | 'push'    // 推弓 V (up-bow)
  | 'trem'    // 颤弓 / 抖弓 ///
  | 'stacc'   // 顿弓 ▼
  | 'spicc'   // 跳弓 ·
  | 'retake'  // 换弓 / 提弓 ,
  | 'pizz';   // 拨弦 +

export type StringType = 'in' | 'out' | 's1' | 's2' | 's3' | 's4'; // 内/外弦 (Erhu) | 一/二/三/四弦 (Pipa)

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

/**
 * Plucked Chinese instrument techniques (Pipa 琵琶 & Guzheng 古筝)
 */
export type PluckTechniqueType =
  // Pipa right-hand & left-hand techniques
  | 'tan'      // 弹 (Pipa index pluck inward)
  | 'tiao'     // 挑 (Pipa/Guzheng index outward)
  | 'gun'      // 滚 (Pipa rapid tan-tiao alternation)
  | 'lun'      // 轮指 (Pipa five-finger continuous roll)
  | 'banlun'   // 半轮 (Pipa half-roll)
  | 'sao'      // 扫 (Pipa downward strum across strings)
  | 'fu'       // 拂 (Pipa upward strum across strings)
  | 'fen'      // 分 (Pipa simultaneous outward split)
  | 'zhi'      // 摭 (Pipa simultaneous inward pinch)
  | 'jiao'     // 绞弦 (Pipa twisted-string effect ⊗)
  | 'sha'      // 煞音 (Pipa muted percussive attack ×)
  | 'dai'      // 带起 (Pipa left-hand pull-off)
  | 'tuixian'  // 推弦 (Pipa left-hand string push)
  | 'laxian'   // 拉弦 (Pipa left-hand string pull)
  // Guzheng right-hand & left-hand techniques
  | 'tuo'      // 托 (Guzheng thumb outward ∟)
  | 'pi'       // 劈 (Guzheng thumb inward ┐)
  | 'mo'       // 抹 (Guzheng index inward ╲)
  | 'gou'      // 勾 (Guzheng middle inward)
  | 'ti'       // 剔 (Guzheng middle outward)
  | 'cuo'      // 大撮 (Guzheng octave pinch)
  | 'xiaocuo'  // 小撮 (Guzheng small pinch)
  | 'yao'      // 摇指 (Guzheng thumb tremolo)
  | 'gua'      // 刮奏 (Guzheng upward glissando)
  | 'guadown'  // 下刮 (Guzheng downward glissando)
  | 'huazhi'   // 花指 (Guzheng ornamental flourish)
  | 'arp'      // 琶音 (Arpeggio / rolled chord)
  | 'an'       // 按音 (Guzheng left-hand pitch press)
  | 'dian'     // 点音 (Guzheng quick press-release)
  // Dizi (笛子) & Xiao (箫) breath, tonguing & finger techniques
  | 'breath'   // 换气 (V breath mark)
  | 'circ'     // 循环换气 (Circular breathing)
  | 'tu'       // 单吐 (T single tonguing)
  | 'ktu'      // 吐音 K (Back-tongue articulation)
  | 'dtu'      // 双吐 (TK double tonguing)
  | 'ttu'      // 三吐 (TTK triple tonguing)
  | 'huashe'   // 花舌 (※ flutter-tongue)
  | 'qizhen'   // 气震音 (Breath vibrato)
  | 'die'      // 叠音 (又 upper-neighbor fleeting grace)
  | 'zeng'     // 赠音 (Trailing ornamental grace)
  | 'li'       // 历音 (Upward rapid scale sweep)
  | 'lidown'   // 下历音 (Downward rapid scale sweep)
  | 'duo'      // 剁音 (Percussive finger chop)
  | 'feizhi'   // 飞指 (Flying-finger rapid sweep)
  | 'bo';      // 波音 (Mordent)

export type DynamicType =
  | 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff'
  | 'sfz' | 'cresc' | 'dim' | 'rit' | 'accel' | 'atempo';

export type HairpinType = 'cresc' | 'dim';

export interface ErhuMarkings {
  bowing?: BowingType;
  finger?: '0' | '1' | '2' | '3' | '4';
  string?: StringType;
  position?: string;
  ornaments: OrnamentType[];
  techniques?: PluckTechniqueType[];
  jianzi?: GuqinJianzi;
  shakuhachi?: ShakuhachiNoteData;
  dynamic?: DynamicType;
  customText?: string;
}

export interface GraceNote {
  degree: number; // 1-7
  octave: number; // -2..+2
  accidental: AccidentalType;
  underlines: number; // typically 1, 2, or 3
  slashed?: boolean; // acciaccatura diagonal slash (^/5)
}

export interface ChordPitch {
  degree: number; // 1-7
  octave: number; // -2..+2
  accidental: AccidentalType;
}

export interface SlurMembership {
  id: number;
  /** 0 = innermost slur closest to notes; 1+ = outer phrasing slurs arching over inner slurs */
  tier: number;
  isStart?: boolean;
  isEnd?: boolean;
}

export interface MusoJianpuNote {
  kind: 'note';
  id: string;
  /** 0 = rest, 1-7 = scale degree (top pitch for chords), -1 = prolongation dash '-' */
  degree: number;
  octave: number; // -2, -1, 0, 1, 2
  accidental: AccidentalType;
  /** Simultaneous stacked chord pitches (sorted highest-to-lowest when present with length >= 2) */
  chordPitches?: ChordPitch[];
  /** Number of duration underlines: 0=quarter, 1=8th, 2=16th, 3=32nd */
  underlines: number;
  /** Augmentation dots (0, 1, or 2) */
  dots: number;
  /** Tied to next note */
  tiedToNext?: boolean;
  /** Grace notes preceding this note (前倚音) */
  graceNotes: GraceNote[];
  /** Optional trailing grace notes after this note (后倚音) */
  postGraceNotes?: GraceNote[];
  /** Bowing, fingering, string, ornaments, Pipa/Guzheng techniques, dynamics */
  markings: ErhuMarkings;
  /** Innermost slur metadata (kept for backwards compatibility) */
  slurStart?: boolean;
  slurEnd?: boolean;
  slurId?: number;
  /** Full nested slur stack memberships (innermost + outer phrasing slurs) */
  slurs?: SlurMembership[];
  /** Crescendo / Diminuendo hairpin passage span (<(...) / >(...)) */
  hairpinId?: number;
  hairpinType?: HairpinType;
  hairpinStart?: boolean;
  hairpinEnd?: boolean;
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
  notes: MusoJianpuNote[];
}

export type BarlineType = '|' | '||' | '|]' | '|:' | ':|' | ':||:';

export type NavMarkerType =
  | 'segno'
  | 'coda'
  | 'toCoda'
  | 'fine'
  | 'dc'
  | 'dcAlFine'
  | 'dcAlCoda'
  | 'ds'
  | 'dsAlFine'
  | 'dsAlCoda'
  | 'segue'
  | 'attacca';

export interface MusoJianpuMeasure {
  id: string;
  measureNumber: number;
  startBarline?: BarlineType;
  endBarline?: BarlineType;
  volta?: string; // e.g. "1.", "2.", "1,2."
  startMarkers?: NavMarkerType[]; // e.g. Segno, Coda at start of bar
  endMarkers?: NavMarkerType[];   // e.g. Fine, To Coda, D.C., D.S., Segue at end of bar
  groups: BeatGroup[];
  startOffset: number;
  endOffset: number;
  lineNumber: number;
}

export interface MusicLineNode {
  kind: 'music';
  id: string;
  lineNumber: number;
  measures: MusoJianpuMeasure[];
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

export type MusoJianpuLine = MusicLineNode | SectionLineNode | TextLineNode;

export interface MusoJianpuHeader {
  title: string;
  subtitle?: string;
  composer?: string;
  arranger?: string;
  instrument?: InstrumentType;
  key: string;        // e.g. "D", "G", "F", "C", "Bb", "A", "Eb"
  strings?: string;   // e.g. "1-5", "5-2", "6-3", "A-d-e-a"
  fluteKey?: string;  // e.g. "曲笛 C调", "梆笛 G调", "G调洞箫", "1.8尺 (D)"
  fingering?: string; // e.g. "筒音作5", "筒音作2", "筒音作1"
  school?: ShakuhachiSchool; // e.g. "kinko" | "tozan"
  rhythmMode?: 'metrical' | 'free'; // "free" for traditional honkyoku (散拍 / 無拍子)
  time: string;       // e.g. "4/4", "2/4", "3/4", "6/8", "free"
  tempo: number;      // BPM, e.g. 72
  expression?: string; // e.g. "如歌地 Adagio"
  columns?: number;   // optional measures per row hint
}

export interface MusoJianpuDocument {
  header: MusoJianpuHeader;
  lines: MusoJianpuLine[];
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
