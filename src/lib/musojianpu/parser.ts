/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AccidentalType,
  BarlineType,
  BeatGroup,
  BowingType,
  ChordPitch,
  DynamicType,
  ErhuMarkings,
  GraceNote,
  HairpinType,
  InstrumentType,
  MusicLineNode,
  NavMarkerType,
  OrnamentType,
  PluckTechniqueType,
  SlurMembership,
  MusoJianpuDocument,
  MusoJianpuHeader,
  MusoJianpuLine,
  MusoJianpuMeasure,
  MusoJianpuNote,
  StringType
} from './types.ts';
import { getErhuKeyInfo, normalizeKeyName } from './erhuKeys.ts';

const BOWING_ALIASES: Record<string, BowingType> = {
  pull: 'pull', down: 'pull', la: 'pull', '拉': 'pull', '拉弓': 'pull', 'π': 'pull',
  push: 'push', up: 'push', tui: 'push', '推': 'push', '推弓': 'push', 'v': 'push',
  trem: 'trem', tremolo: 'trem', '颤弓': 'trem', '抖弓': 'trem', '///': 'trem',
  stacc: 'stacc', staccato: 'stacc', dun: 'stacc', '顿': 'stacc', '顿弓': 'stacc',
  spicc: 'spicc', spiccato: 'spicc', '跳': 'spicc', '跳弓': 'spicc', '抛弓': 'spicc',
  retake: 'retake', lift: 'retake', '换弓': 'retake', '提弓': 'retake',
  pizz: 'pizz', '拨': 'pizz', '拨弦': 'pizz', '+': 'pizz'
};

const PLUCK_TECHNIQUE_ALIASES: Record<string, PluckTechniqueType> = {
  // Pipa 琵琶 techniques
  tan: 'tan', '弹': 'tan',
  tiao: 'tiao', '挑': 'tiao',
  gun: 'gun', '滚': 'gun',
  lun: 'lun', lunzhi: 'lun', '轮': 'lun', '轮指': 'lun',
  banlun: 'banlun', '半轮': 'banlun',
  sao: 'sao', strum: 'sao', '扫': 'sao', '扫弦': 'sao',
  fu: 'fu', '拂': 'fu',
  fen: 'fen', '分': 'fen',
  zhi: 'zhi', '摭': 'zhi',
  jiao: 'jiao', '绞': 'jiao', '绞弦': 'jiao',
  sha: 'sha', '煞': 'sha', '煞音': 'sha',
  dai: 'dai', '带': 'dai', '带起': 'dai',
  tuixian: 'tuixian', '推弦': 'tuixian',
  laxian: 'laxian', '拉弦': 'laxian',
  // Guzheng 古筝 techniques
  tuo: 'tuo', '托': 'tuo',
  pi: 'pi', '劈': 'pi',
  mo: 'mo', '抹': 'mo',
  gou: 'gou', '勾': 'gou',
  ti: 'ti', '剔': 'ti',
  cuo: 'cuo', dacuo: 'cuo', '撮': 'cuo', '大撮': 'cuo',
  xiaocuo: 'xiaocuo', '小撮': 'xiaocuo',
  yao: 'yao', yaozhi: 'yao', '摇': 'yao', '摇指': 'yao',
  gua: 'gua', gliss: 'gua', glissup: 'gua', '刮': 'gua', '刮奏': 'gua', '上刮': 'gua',
  guadown: 'guadown', glissdown: 'guadown', '下刮': 'guadown', '下行刮奏': 'guadown',
  huazhi: 'huazhi', '花': 'huazhi', '花指': 'huazhi',
  arp: 'arp', arpeggio: 'arp', pa: 'arp', payin: 'arp', '琶': 'arp', '琶音': 'arp',
  an: 'an', '按': 'an', '按音': 'an',
  dian: 'dian', '点': 'dian', '点音': 'dian',
  // Dizi (笛子) & Xiao (箫) breath, tonguing & finger ornaments
  breath: 'breath', qikou: 'breath', '换气': 'breath', '气口': 'breath',
  circ: 'circ', xunhuan: 'circ', '循环换气': 'circ', '循环': 'circ',
  tu: 'tu', dantu: 'tu', t: 'tu', '单吐': 'tu', '吐': 'tu',
  ktu: 'ktu', k: 'ktu',
  dtu: 'dtu', shuangtu: 'dtu', tk: 'dtu', '双吐': 'dtu',
  ttu: 'ttu', santu: 'ttu', ttk: 'ttu', '三吐': 'ttu',
  huashe: 'huashe', flutter: 'huashe', flz: 'huashe', '花舌': 'huashe', '*': 'huashe', '※': 'huashe',
  qizhen: 'qizhen', bvib: 'qizhen', '气震': 'qizhen', '气震音': 'qizhen',
  die: 'die', dieyin: 'die', '叠': 'die', '叠音': 'die', '又': 'die',
  zeng: 'zeng', zengyin: 'zeng', '赠': 'zeng', '赠音': 'zeng',
  li: 'li', liyin: 'li', '历': 'li', '历音': 'li', '上历': 'li', '上历音': 'li',
  lidown: 'lidown', xiali: 'lidown', '下历': 'lidown', '下历音': 'lidown',
  duo: 'duo', duoyin: 'duo', '剁': 'duo', '剁音': 'duo',
  feizhi: 'feizhi', fei: 'feizhi', '飞指': 'feizhi', '飞': 'feizhi',
  bo: 'bo', boyin: 'bo', '波': 'bo', '波音': 'bo'
};

const FINGER_ALIASES: Record<string, '0' | '1' | '2' | '3' | '4'> = {
  '0': '0', open: '0', '空': '0', '空弦': '0',
  '1': '1', '一': '1', '一指': '1', f1: '1',
  '2': '2', '二': '2', '二指': '2', f2: '2',
  '3': '3', '三': '3', '三指': '3', f3: '3',
  '4': '4', '四': '4', '四指': '4', f4: '4'
};

const STRING_ALIASES: Record<string, StringType> = {
  in: 'in', inner: 'in', nei: 'in', '内': 'in', '内弦': 'in',
  out: 'out', outer: 'out', wai: 'out', '外': 'out', '外弦': 'out',
  s1: 's1', str1: 's1', '一弦': 's1', '子弦': 's1',
  s2: 's2', str2: 's2', '二弦': 's2', '中弦': 's2',
  s3: 's3', str3: 's3', '三弦': 's3', '老弦': 's3',
  s4: 's4', str4: 's4', '四弦': 's4', '缠弦': 's4'
};

const POSITION_ALIASES: Record<string, string> = {
  pos1: '一把', p1: '一把', '一把': '一把', '第一把': '一把', '传统一把': '一把',
  pos2: '二把', p2: '二把', '二把': '二把', '第二把': '二把',
  pos3: '三把', p3: '三把', '三把': '三把', '第三把': '三把',
  pos4: '四把', p4: '四把', '四把': '四把', '第四把': '四把',
  pos5: '五把', p5: '五把', '五把': '五把', '第五把': '五把',
  '上把': '上把', '中把': '中把', '下把': '下把', '次下把': '次下把', '最下把': '最下把', '换把': '换把'
};

const ORNAMENT_ALIASES: Record<string, OrnamentType> = {
  su: 'su', slideup: 'su', shanghua: 'su', '上滑': 'su', '上滑音': 'su',
  sd: 'sd', slidedown: 'sd', xiahua: 'sd', '下滑': 'sd', '下滑音': 'sd',
  sr: 'sr', huihua: 'sr', '回滑': 'sr', '回滑音': 'sr',
  vib: 'vib', vibrato: 'vib', rou: 'vib', '揉': 'vib', '揉弦': 'vib', '吟': 'vib', '~': 'vib',
  pvib: 'pvib', pressvib: 'pvib', yarou: 'pvib', '压揉': 'pvib', '压': 'pvib',
  tr: 'tr', trill: 'tr', chan: 'tr', '颤': 'tr', '颤音': 'tr',
  da: 'da', mordent: 'da', dayin: 'da', '打': 'da', '打音': 'da', '丁': 'da',
  fermata: 'fermata', hold: 'fermata', '延': 'fermata', '延长': 'fermata',
  accent: 'accent', '>': 'accent', '重音': 'accent',
  harm: 'harm', harmonic: 'harm', '泛': 'harm', '泛音': 'harm',
  aharm: 'aharm', '人工泛': 'aharm', '人工泛音': 'aharm',
  'shift+': 'shiftUp', shiftup: 'shiftUp', '上换把': 'shiftUp', '↑': 'shiftUp',
  'shift-': 'shiftDown', shiftdown: 'shiftDown', '下换把': 'shiftDown', '↓': 'shiftDown'
};

const DYNAMIC_ALIASES: Record<string, DynamicType> = {
  ppp: 'ppp', pp: 'pp', p: 'p', mp: 'mp', mf: 'mf', f: 'f', ff: 'ff', fff: 'fff',
  sfz: 'sfz', cresc: 'cresc', dim: 'dim', rit: 'rit', accel: 'accel', atempo: 'atempo',
  '渐强': 'cresc', '渐弱': 'dim', '渐慢': 'rit', '渐快': 'accel', '原速': 'atempo'
};

function normalizeInstrumentName(raw: string): InstrumentType {
  const lower = raw.trim().toLowerCase();
  if (lower.includes('pipa') || lower.includes('琵琶')) return 'pipa';
  if (lower.includes('guzheng') || lower.includes('zheng') || lower.includes('古筝') || lower.includes('古箏') || lower === '筝') {
    return 'guzheng';
  }
  if (lower.includes('xiao') || lower.includes('箫') || lower.includes('簫')) return 'xiao';
  if (lower.includes('dizi') || lower.includes('flute') || lower.includes('笛')) return 'dizi';
  return 'erhu';
}

function normalizeFingeringLabel(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return '';
  if (/^[1-7]$/.test(cleaned)) return `筒音作${cleaned}`;
  return cleaned;
}

const START_NAV_MARKERS = new Set<NavMarkerType>(['segno', 'coda']);

function parseNavMarkerTag(rawInner: string): NavMarkerType | null {
  const normalized = rawInner.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  switch (normalized) {
    case 'segno':
    case 's':
    case '$':
    case '记号':
    case '反复记号':
      return 'segno';
    case 'coda':
    case 'o':
    case '⊕':
    case '尾声':
    case '结束句':
      return 'coda';
    case 'to coda':
    case 'tocoda':
    case '进尾声':
    case '至尾声':
      return 'toCoda';
    case 'fine':
    case 'end':
    case '结束':
    case '曲终':
      return 'fine';
    case 'dc':
    case 'da capo':
    case '从头反复':
      return 'dc';
    case 'dc al fine':
    case 'da capo al fine':
    case '从头反复至结束':
      return 'dcAlFine';
    case 'dc al coda':
    case 'da capo al coda':
    case '从头反复进尾声':
      return 'dcAlCoda';
    case 'ds':
    case 'dal segno':
    case '从记号反复':
      return 'ds';
    case 'ds al fine':
    case 'dal segno al fine':
    case '从记号反复至结束':
      return 'dsAlFine';
    case 'ds al coda':
    case 'dal segno al coda':
    case '从记号反复进尾声':
      return 'dsAlCoda';
    case 'segue':
    case '紧接':
      return 'segue';
    case 'attacca':
    case '紧接下段':
      return 'attacca';
    default:
      return null;
  }
}

function parseMarkingsBlock(raw: string, target: ErhuMarkings) {
  const parts = raw.split(/[,，;\s]+/).map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    // Quoted custom text e.g. "渐强" or '换把'
    if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
      target.customText = part.slice(1, -1);
      continue;
    }

    const lower = part.toLowerCase();
    if (BOWING_ALIASES[lower] || BOWING_ALIASES[part]) {
      target.bowing = BOWING_ALIASES[lower] || BOWING_ALIASES[part];
    } else if (PLUCK_TECHNIQUE_ALIASES[lower] || PLUCK_TECHNIQUE_ALIASES[part]) {
      const tech = PLUCK_TECHNIQUE_ALIASES[lower] || PLUCK_TECHNIQUE_ALIASES[part];
      if (!target.techniques) target.techniques = [];
      if (!target.techniques.includes(tech)) {
        target.techniques.push(tech);
      }
    } else if (FINGER_ALIASES[lower] || FINGER_ALIASES[part]) {
      target.finger = FINGER_ALIASES[lower] || FINGER_ALIASES[part];
    } else if (STRING_ALIASES[lower] || STRING_ALIASES[part]) {
      target.string = STRING_ALIASES[lower] || STRING_ALIASES[part];
    } else if (POSITION_ALIASES[lower] || POSITION_ALIASES[part]) {
      target.position = POSITION_ALIASES[lower] || POSITION_ALIASES[part];
    } else if (ORNAMENT_ALIASES[lower] || ORNAMENT_ALIASES[part]) {
      const orn = ORNAMENT_ALIASES[lower] || ORNAMENT_ALIASES[part];
      if (!target.ornaments.includes(orn)) {
        target.ornaments.push(orn);
      }
    } else if (DYNAMIC_ALIASES[lower] || DYNAMIC_ALIASES[part]) {
      target.dynamic = DYNAMIC_ALIASES[lower] || DYNAMIC_ALIASES[part];
    } else {
      // Unrecognized tag renders cleanly as custom performance text
      target.customText = target.customText ? `${target.customText} ${part}` : part;
    }
  }
}

function getChordPitchRank(p: ChordPitch): number {
  const accOffset = p.accidental === '#' ? 0.35 : p.accidental === 'b' ? -0.35 : 0;
  return p.octave * 7 + p.degree + accOffset;
}

/**
 * Parses chord tones inside <1 3 5> or 1+3+5 and sorts them highest-to-lowest (top-to-bottom engraving).
 */
function parseChordPitches(raw: string): ChordPitch[] {
  const pitches: ChordPitch[] = [];
  const seen = new Set<string>();
  const regex = /([#b=]?)([1-7])([',]*)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    const accidental = (m[1] || null) as AccidentalType;
    const degree = parseInt(m[2], 10);
    const octStr = m[3] || '';
    let octave = 0;
    for (const ch of octStr) {
      if (ch === "'") octave++;
      else if (ch === ',') octave--;
    }
    octave = Math.max(-2, Math.min(2, octave));
    const key = `${accidental || ''}${degree}:${octave}`;
    if (!seen.has(key)) {
      seen.add(key);
      pitches.push({ degree, octave, accidental });
    }
  }
  pitches.sort((a, b) => getChordPitchRank(b) - getChordPitchRank(a));
  return pitches;
}

function parseGraceString(raw: string, slashed: boolean = false): GraceNote[] {
  const notes: GraceNote[] = [];
  const regex = /([#b=]?)([1-7])([',]*)([_/]*)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    const acc = (m[1] || null) as AccidentalType;
    const degree = parseInt(m[2], 10);
    const octStr = m[3] || '';
    let octave = 0;
    for (const ch of octStr) {
      if (ch === "'") octave++;
      else if (ch === ',') octave--;
    }
    octave = Math.max(-2, Math.min(2, octave));
    const rawUnderlines = (m[4] || '').length;
    const underlines = Math.min(3, Math.max(1, rawUnderlines || 2));
    notes.push({ degree, octave, accidental: acc, underlines, slashed: slashed || undefined });
  }
  return notes;
}

/**
 * Splits a lyrics line into individual syllables (Chinese characters become individual syllables;
 * Latin words separated by whitespace or hyphens become syllables; punctuation attaches cleanly).
 */
function tokenizeLyrics(raw: string): string[] {
  const tokens: string[] = [];
  const cleaned = raw.trim();
  if (!cleaned) return tokens;

  // Match CJK characters (with optional trailing punctuation), or hyphen/space-separated Latin words, or _ skip
  const regex = /([\u4e00-\u9fff\u3400-\u4dbf][，。、！？；：,.!?;:]?)|([^\s\u4e00-\u9fff\u3400-\u4dbf]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(cleaned)) !== null) {
    const tok = m[0].trim();
    if (!tok) continue;
    // If purely standalone punctuation, attach to previous syllable if possible
    if (/^[，。、！？；：,.!?;:]+$/.test(tok) && tokens.length > 0) {
      tokens[tokens.length - 1] += tok;
    } else {
      tokens.push(tok);
    }
  }
  return tokens;
}

function createEmptyMarkings(): ErhuMarkings {
  return { ornaments: [] };
}

/**
 * Parses a MusoJianpu text-formatted score into a structured AST with exact character offsets.
 */
export function parseMusoJianpuScore(text: string): MusoJianpuDocument {
  const safeText = typeof text === 'string' ? text : '';
  const header: MusoJianpuHeader = {
    title: 'Untitled Jianpu Score',
    key: 'D',
    time: '4/4',
    tempo: 80
  };

  const lines: MusoJianpuLine[] = [];
  let totalMeasures = 0;
  let totalNotes = 0;
  let nextSlurId = 1;
  let nextHairpinId = 1;

  // Compute exact line start offsets for bidirectional editor-sheet sync
  const rawLines = safeText.split(/\r?\n/);
  const lineOffsets: number[] = [];
  let runningOffset = 0;
  for (let i = 0; i < rawLines.length; i++) {
    lineOffsets.push(runningOffset);
    runningOffset += rawLines[i].length + 1; // assumes \n (close enough for highlight & selection)
  }
  // Recalculate exact offsets preserving \r\n if present
  {
    let pos = 0;
    for (let i = 0; i < rawLines.length; i++) {
      lineOffsets[i] = pos;
      pos += rawLines[i].length;
      if (safeText[pos] === '\r') pos++;
      if (safeText[pos] === '\n') pos++;
    }
  }

  let lastMusicLine: MusicLineNode | null = null;

  for (let lineIdx = 0; lineIdx < rawLines.length; lineIdx++) {
    const rawLine = rawLines[lineIdx];
    const trimmed = rawLine.trim();
    const lineStart = lineOffsets[lineIdx];
    const lineNumber = lineIdx + 1;

    if (!trimmed) continue;

    // Comment lines
    if (trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    // Header directives: @key: value
    const directiveMatch = trimmed.match(/^@([a-zA-Z_]+)\s*[:：]\s*(.*)$/);
    if (directiveMatch) {
      const k = directiveMatch[1].toLowerCase();
      const v = directiveMatch[2].trim();
      if (k === 'title' || k === 't') header.title = v || header.title;
      else if (k === 'subtitle' || k === 'sub') header.subtitle = v;
      else if (k === 'composer' || k === 'c' || k === 'artist') header.composer = v;
      else if (k === 'arranger' || k === 'arr') header.arranger = v;
      else if (k === 'instrument' || k === 'inst') header.instrument = normalizeInstrumentName(v);
      else if (k === 'key' || k === 'k') header.key = normalizeKeyName(v);
      else if (k === 'strings' || k === 'tuning' || k === 'str') header.strings = v.replace(/弦$/u, '').trim();
      else if (k === 'flute' || k === 'tube' || k === 'flutekey') header.fluteKey = v;
      else if (k === 'fingering' || k === 'tongyin' || k === 'finger') header.fingering = normalizeFingeringLabel(v);
      else if (k === 'time' || k === 'meter' || k === 'm') header.time = v || '4/4';
      else if (k === 'tempo' || k === 'bpm' || k === 'q') {
        const num = parseInt(v.replace(/[^\d]/g, ''), 10);
        if (!isNaN(num) && num >= 20 && num <= 320) header.tempo = num;
      } else if (k === 'expression' || k === 'mood' || k === 'style') {
        header.expression = v;
      } else if (k === 'columns' || k === 'cols' || k === 'bars') {
        const cols = parseInt(v, 10);
        if (!isNaN(cols) && cols >= 1 && cols <= 8) header.columns = cols;
      }
      continue;
    }

    // Section heading line: S: ...
    if (/^S[:：]/i.test(trimmed)) {
      const secText = trimmed.replace(/^S[:：]\s*/i, '').trim();
      if (secText) {
        lines.push({
          kind: 'section',
          id: `sec-${lineIdx}`,
          lineNumber,
          text: secText
        });
      }
      lastMusicLine = null;
      continue;
    }

    // Footnote / performance note line: T: ...
    if (/^T[:：]/i.test(trimmed)) {
      const noteText = trimmed.replace(/^T[:：]\s*/i, '').trim();
      if (noteText) {
        lines.push({
          kind: 'text',
          id: `txt-${lineIdx}`,
          lineNumber,
          text: noteText
        });
      }
      continue;
    }

    // Lyrics line: L: ... (attaches to notes in preceding music line!)
    if (/^L[:：]/i.test(trimmed)) {
      const lyricBody = trimmed.replace(/^L[:：]\s*/i, '').trim();
      if (lastMusicLine && lyricBody) {
        const syllables = tokenizeLyrics(lyricBody);
        lastMusicLine.rawLyrics = syllables;
        let sylIdx = 0;
        for (const measure of lastMusicLine.measures) {
          for (const group of measure.groups) {
            for (const note of group.notes) {
              // Assign lyrics to pitched notes (1-7), skipping rests (0) and dashes (-)
              if (note.degree >= 1 && note.degree <= 7 && sylIdx < syllables.length) {
                const syl = syllables[sylIdx++];
                if (syl !== '_' && syl !== '-') {
                  note.lyric = syl;
                }
              }
            }
          }
        }
      }
      continue;
    }

    // Otherwise, parse as a Music Line!
    const measures: MusoJianpuMeasure[] = [];
    let currentMeasure: MusoJianpuMeasure | null = null;
    let currentGroup: BeatGroup | null = null;

    const parenStack: ('slur' | 'tuplet' | 'hairpin')[] = [];

    interface ActiveSlurFrame {
      id: number;
      pendingStart: boolean;
      maxChildTier: number;
      members: { note: MusoJianpuNote; membership: SlurMembership }[];
    }
    const slurStack: ActiveSlurFrame[] = [];

    const attachActiveSlurs = (note: MusoJianpuNote) => {
      if (slurStack.length === 0) return;
      const memberships: SlurMembership[] = [];
      for (const frame of slurStack) {
        const membership: SlurMembership = {
          id: frame.id,
          tier: 0,
          isStart: frame.pendingStart ? true : undefined
        };
        frame.pendingStart = false;
        memberships.push(membership);
        frame.members.push({ note, membership });
      }
      note.slurs = memberships;
      const innermost = memberships[memberships.length - 1];
      note.slurId = innermost.id;
      if (innermost.isStart) note.slurStart = true;
    };

    const closeSlurFrame = (frame: ActiveSlurFrame) => {
      const finalTier = frame.maxChildTier;
      for (const item of frame.members) {
        item.membership.tier = finalTier;
      }
      if (frame.members.length > 0) {
        const lastItem = frame.members[frame.members.length - 1];
        lastItem.membership.isEnd = true;
        if (lastItem.note.slurId === frame.id) {
          lastItem.note.slurEnd = true;
        }
      }
      if (slurStack.length > 0) {
        const parent = slurStack[slurStack.length - 1];
        parent.maxChildTier = Math.max(parent.maxChildTier, finalTier + 1);
      }
    };

    let pendingTupletStart: number | undefined = undefined;
    let inTuplet = false;
    let lastNoteInTuplet: MusoJianpuNote | null = null;

    let inHairpin = false;
    let activeHairpinId: number | undefined = undefined;
    let activeHairpinType: HairpinType | undefined = undefined;
    let pendingHairpinStart = false;
    let lastNoteInHairpin: MusoJianpuNote | null = null;

    let pendingGraceNotes: GraceNote[] = [];
    let pendingMarkings: ErhuMarkings | null = null;
    let lastPitchedNote: MusoJianpuNote | null = null;
    let pendingVolta: string | undefined = undefined;
    let pendingStartMarkers: NavMarkerType[] = [];
    let lastCompletedMeasure: MusoJianpuMeasure | null = null;

    const addMarkerUnique = (list: NavMarkerType[] | undefined, marker: NavMarkerType): NavMarkerType[] => {
      const next = list ? [...list] : [];
      if (!next.includes(marker)) next.push(marker);
      return next;
    };

    const ensureMeasure = (offset: number, startBar?: BarlineType) => {
      if (!currentMeasure) {
        totalMeasures++;
        currentMeasure = {
          id: `m-${totalMeasures}`,
          measureNumber: totalMeasures,
          startBarline: startBar,
          volta: pendingVolta,
          startMarkers: pendingStartMarkers.length > 0 ? [...pendingStartMarkers] : undefined,
          groups: [],
          startOffset: offset,
          endOffset: offset,
          lineNumber
        };
        pendingVolta = undefined;
        pendingStartMarkers = [];
        measures.push(currentMeasure);
      } else {
        if (pendingVolta && !currentMeasure.volta) {
          currentMeasure.volta = pendingVolta;
          pendingVolta = undefined;
        }
        if (pendingStartMarkers.length > 0 && currentMeasure.groups.length === 0) {
          for (const mk of pendingStartMarkers) {
            currentMeasure.startMarkers = addMarkerUnique(currentMeasure.startMarkers, mk);
          }
          pendingStartMarkers = [];
        }
      }
    };

    const flushGroup = () => {
      if (currentGroup && currentGroup.notes.length > 0 && currentMeasure) {
        currentMeasure.groups.push(currentGroup);
      }
      currentGroup = null;
    };

    let i = 0;
    const len = rawLine.length;

    while (i < len) {
      const ch = rawLine[i];

      // Whitespace separates beat groups (so beams break cleanly on spaces!)
      if (/\s/.test(ch)) {
        flushGroup();
        i++;
        continue;
      }

      // Check barlines: :||:, ||, |], |:, :|, |
      if (ch === '|' || (ch === ':' && rawLine[i + 1] === '|')) {
        flushGroup();
        let barStr: BarlineType = '|';
        let step = 1;
        if (rawLine.startsWith(':||:', i)) {
          barStr = ':||:';
          step = 4;
        } else if (rawLine.startsWith('||', i)) {
          barStr = '||';
          step = 2;
        } else if (rawLine.startsWith('|]', i)) {
          barStr = '|]';
          step = 2;
        } else if (rawLine.startsWith('|:', i)) {
          barStr = '|:';
          step = 2;
        } else if (rawLine.startsWith(':|', i)) {
          barStr = ':|';
          step = 2;
        }

        if (!currentMeasure) {
          // Leading barline on the line
          ensureMeasure(lineStart + i, barStr);
        } else if (currentMeasure.groups.length === 0 && !currentMeasure.startBarline) {
          currentMeasure.startBarline = barStr;
        } else {
          // Closes current measure
          currentMeasure.endBarline = barStr;
          currentMeasure.endOffset = lineStart + i + step;
          lastCompletedMeasure = currentMeasure;
          currentMeasure = null;
          // If :||:, next measure also begins with |:
          if (barStr === ':||:') {
            // Look ahead to see if there's more music on this line
            const restOfLine = rawLine.slice(i + step).trim();
            if (restOfLine.length > 0) {
              ensureMeasure(lineStart + i + step, '|:');
            }
          }
        }
        i += step;
        continue;
      }

      // Navigation markers ([segno], [coda], [to coda], [fine], [dc al fine], [ds al coda], [segue], [attacca])
      // and Volta brackets ([1., [2., [1.], [1,2.], [1-2.])
      if (ch === '[') {
        const bracketMatch = rawLine.slice(i).match(/^\[([^\]]+)\]/);
        if (bracketMatch) {
          const inner = bracketMatch[1].trim();
          const navMarker = parseNavMarkerTag(inner);
          if (navMarker) {
            if (START_NAV_MARKERS.has(navMarker)) {
              if (currentMeasure && currentMeasure.groups.length === 0) {
                currentMeasure.startMarkers = addMarkerUnique(currentMeasure.startMarkers, navMarker);
              } else {
                if (!pendingStartMarkers.includes(navMarker)) pendingStartMarkers.push(navMarker);
              }
            } else {
              // End-of-measure marker: attach to current measure if it has notes, else to the just-closed measure
              if (currentMeasure && currentMeasure.groups.length > 0) {
                currentMeasure.endMarkers = addMarkerUnique(currentMeasure.endMarkers, navMarker);
              } else if (lastCompletedMeasure) {
                lastCompletedMeasure.endMarkers = addMarkerUnique(lastCompletedMeasure.endMarkers, navMarker);
              } else {
                // Fallback if placed at the start of a single-bar fragment
                ensureMeasure(lineStart + i);
                currentMeasure!.endMarkers = addMarkerUnique(currentMeasure!.endMarkers, navMarker);
              }
            }
            i += bracketMatch[0].length;
            continue;
          }

          // Closed volta bracket e.g. [1.] or [1,2.] or [1-3.]
          if (/^\d+(?:[,\-]\d+)*\.?$/.test(inner)) {
            const formatted = inner.endsWith('.') ? inner : `${inner}.`;
            pendingVolta = formatted;
            if (currentMeasure && currentMeasure.groups.length === 0) {
              currentMeasure.volta = pendingVolta;
              pendingVolta = undefined;
            }
            i += bracketMatch[0].length;
            continue;
          }
        }

        // Open volta bracket syntax: [1. or [2. or [1,2. (without closing ])
        const openVoltaMatch = rawLine.slice(i).match(/^\[(\d+(?:[,\-]\d+)*\.)/);
        if (openVoltaMatch) {
          pendingVolta = openVoltaMatch[1];
          if (currentMeasure && currentMeasure.groups.length === 0) {
            currentMeasure.volta = pendingVolta;
            pendingVolta = undefined;
          }
          i += openVoltaMatch[0].length;
          continue;
        }
      }

      // Crescendo / Diminuendo hairpin passage start: <( or >( or cresc( or dim(
      const hairpinMatch = rawLine.slice(i).match(/^(<|>|cresc|dim)\(/i);
      if (hairpinMatch) {
        const token = hairpinMatch[1].toLowerCase();
        inHairpin = true;
        activeHairpinId = nextHairpinId++;
        activeHairpinType = (token === '<' || token === 'cresc') ? 'cresc' : 'dim';
        pendingHairpinStart = true;
        lastNoteInHairpin = null;
        parenStack.push('hairpin');
        i += hairpinMatch[0].length;
        continue;
      }

      // Tuplet start: 3( or 5(
      const tupletMatch = rawLine.slice(i).match(/^([3567])\(/);
      if (tupletMatch) {
        pendingTupletStart = parseInt(tupletMatch[1], 10);
        inTuplet = true;
        parenStack.push('tuplet');
        i += tupletMatch[0].length;
        continue;
      }

      // Slur start '(' (supports arbitrarily nested phrasing + articulation slurs)
      if (ch === '(') {
        slurStack.push({
          id: nextSlurId++,
          pendingStart: true,
          maxChildTier: 0,
          members: []
        });
        parenStack.push('slur');
        i++;
        continue;
      }

      // Close innermost slur, tuplet, or hairpin passage ')'
      if (ch === ')') {
        const closing = parenStack.pop();
        if (closing === 'tuplet' || (!closing && inTuplet)) {
          if (lastNoteInTuplet) lastNoteInTuplet.tupletEnd = true;
          inTuplet = false;
          lastNoteInTuplet = null;
        } else if (closing === 'hairpin' || (!closing && inHairpin)) {
          if (lastNoteInHairpin) lastNoteInHairpin.hairpinEnd = true;
          inHairpin = false;
          activeHairpinId = undefined;
          activeHairpinType = undefined;
          pendingHairpinStart = false;
          lastNoteInHairpin = null;
        } else if (closing === 'slur' || (!closing && slurStack.length > 0)) {
          const frame = slurStack.pop();
          if (frame) closeSlurFrame(frame);
        }
        i++;
        continue;
      }

      // Grace note prefix: ^{5/6/}, ^5/, ^5//, ^5_, ^5, or slashed acciaccatura ^/5, ^/{5 6}
      if (ch === '^') {
        let cursor = i + 1;
        let slashed = false;
        if (rawLine[cursor] === '/') {
          slashed = true;
          cursor++;
        }
        if (rawLine[cursor] === '{') {
          const closeIdx = rawLine.indexOf('}', cursor + 1);
          if (closeIdx !== -1) {
            const inner = rawLine.slice(cursor + 1, closeIdx);
            pendingGraceNotes.push(...parseGraceString(inner, slashed));
            i = closeIdx + 1;
            continue;
          }
        } else {
          const gm = rawLine.slice(cursor).match(/^([#b=]?)([1-7])([',]*)([_/]*)/);
          if (gm) {
            pendingGraceNotes.push(...parseGraceString(gm[0], slashed));
            i = cursor + gm[0].length;
            continue;
          }
        }
        i++;
        continue;
      }

      // Stray {markings} block before a main note (e.g. ^5/{pull}6): capture cleanly for the upcoming note
      if (ch === '{') {
        const closeIdx = rawLine.indexOf('}', i + 1);
        if (closeIdx !== -1) {
          if (!pendingMarkings) pendingMarkings = createEmptyMarkings();
          parseMarkingsBlock(rawLine.slice(i + 1, closeIdx), pendingMarkings);
          i = closeIdx + 1;
          continue;
        }
      }

      // Prolongation dash '-'
      if (ch === '-') {
        // If a grace note appeared immediately before a prolongation dash (e.g. 5 ^6/ -),
        // attach it as a trailing post-grace note on the held note instead of leaking it across the dash.
        if (pendingGraceNotes.length > 0 && lastPitchedNote) {
          lastPitchedNote.postGraceNotes = [
            ...(lastPitchedNote.postGraceNotes || []),
            ...pendingGraceNotes
          ];
          pendingGraceNotes = [];
        }
        ensureMeasure(lineStart + i);
        const startOffset = lineStart + i;
        i++;
        const markings = createEmptyMarkings();
        while (i < len && rawLine[i] === '{') {
          const closeIdx = rawLine.indexOf('}', i + 1);
          if (closeIdx === -1) break;
          parseMarkingsBlock(rawLine.slice(i + 1, closeIdx), markings);
          i = closeIdx + 1;
        }

        totalNotes++;
        const dashNote: MusoJianpuNote = {
          kind: 'note',
          id: `n-${totalNotes}`,
          degree: -1,
          octave: 0,
          accidental: null,
          underlines: 0,
          dots: 0,
          graceNotes: [],
          markings,
          startOffset,
          endOffset: lineStart + i,
          lineNumber
        };
        attachActiveSlurs(dashNote);
        if (inHairpin && activeHairpinId !== undefined && activeHairpinType) {
          dashNote.hairpinId = activeHairpinId;
          dashNote.hairpinType = activeHairpinType;
          if (pendingHairpinStart) {
            dashNote.hairpinStart = true;
            pendingHairpinStart = false;
          }
          lastNoteInHairpin = dashNote;
        }
        flushGroup();
        currentMeasure!.groups.push({
          kind: 'group',
          id: `g-${totalNotes}`,
          notes: [dashNote]
        });
        currentMeasure!.endOffset = lineStart + i;
        continue;
      }

      // Chord token: angle-bracket syntax <1 3 5>/ or plus-joined syntax 1+3+5/
      const angleChordMatch = ch === '<' && rawLine[i + 1] !== '('
        ? rawLine.slice(i).match(/^<([^<>()]+)>([_/]*)(\.*)(~?)/)
        : null;
      const plusChordMatch = !angleChordMatch
        ? rawLine.slice(i).match(/^([#b=]?[1-7][',]*(?:\+[#b=]?[1-7][',]*)+)([_/]*)(\.*)(~?)/)
        : null;
      const chordMatch = angleChordMatch || plusChordMatch;
      if (chordMatch) {
        const chordPitches = parseChordPitches(chordMatch[1]);
        if (chordPitches.length >= 1) {
          ensureMeasure(lineStart + i);
          const startOffset = lineStart + i;
          const underlines = Math.min(3, (chordMatch[2] || '').length);
          const dots = Math.min(2, (chordMatch[3] || '').length);
          const tiedToNext = chordMatch[4] === '~';

          i += chordMatch[0].length;

          const markings = pendingMarkings ? pendingMarkings : createEmptyMarkings();
          pendingMarkings = null;
          while (i < len && rawLine[i] === '{') {
            const closeIdx = rawLine.indexOf('}', i + 1);
            if (closeIdx === -1) break;
            parseMarkingsBlock(rawLine.slice(i + 1, closeIdx), markings);
            i = closeIdx + 1;
          }

          let finalTied = tiedToNext;
          if (i < len && rawLine[i] === '~') {
            finalTied = true;
            i++;
          }

          const topPitch = chordPitches[0];
          totalNotes++;
          const chordNote: MusoJianpuNote = {
            kind: 'note',
            id: `n-${totalNotes}`,
            degree: topPitch.degree,
            octave: topPitch.octave,
            accidental: topPitch.accidental,
            chordPitches: chordPitches.length >= 2 ? chordPitches : undefined,
            underlines,
            dots,
            tiedToNext: finalTied,
            graceNotes: pendingGraceNotes.length > 0 ? [...pendingGraceNotes] : [],
            markings,
            startOffset,
            endOffset: lineStart + i,
            lineNumber
          };
          pendingGraceNotes = [];
          lastPitchedNote = chordNote;

          attachActiveSlurs(chordNote);

          if (inHairpin && activeHairpinId !== undefined && activeHairpinType) {
            chordNote.hairpinId = activeHairpinId;
            chordNote.hairpinType = activeHairpinType;
            if (pendingHairpinStart) {
              chordNote.hairpinStart = true;
              pendingHairpinStart = false;
            }
            lastNoteInHairpin = chordNote;
          }

          if (inTuplet) {
            if (pendingTupletStart !== undefined) {
              chordNote.tupletStart = pendingTupletStart;
              pendingTupletStart = undefined;
            }
            lastNoteInTuplet = chordNote;
          }

          if (underlines > 0) {
            if (!currentGroup) {
              currentGroup = {
                kind: 'group',
                id: `g-${totalNotes}`,
                notes: [chordNote]
              };
            } else {
              currentGroup.notes.push(chordNote);
            }
          } else {
            flushGroup();
            currentMeasure!.groups.push({
              kind: 'group',
              id: `g-${totalNotes}`,
              notes: [chordNote]
            });
          }
          currentMeasure!.endOffset = lineStart + i;
          continue;
        }
      }

      // Note token: optional accidental (#, b, =) + digit (0-7) + octaves (', ,) + underlines (_ or /) + dots (.) + tie (~) + {markings}
      const noteMatch = rawLine.slice(i).match(/^([#b=]?)([0-7])([',]*)([_/]*)(\.*)(~?)/);
      if (noteMatch) {
        ensureMeasure(lineStart + i);
        const startOffset = lineStart + i;
        const acc = (noteMatch[1] || null) as AccidentalType;
        const degree = parseInt(noteMatch[2], 10);
        const octStr = noteMatch[3] || '';
        let octave = 0;
        for (const oc of octStr) {
          if (oc === "'") octave++;
          else if (oc === ',') octave--;
        }
        octave = Math.max(-2, Math.min(2, octave));
        const underlines = Math.min(3, (noteMatch[4] || '').length);
        const dots = Math.min(2, (noteMatch[5] || '').length);
        const tiedToNext = noteMatch[6] === '~';

        i += noteMatch[0].length;

        // Parse any trailing {markings} blocks (supports {pull,二} or {pull}{二})
        const markings = pendingMarkings ? pendingMarkings : createEmptyMarkings();
        pendingMarkings = null;
        while (i < len && rawLine[i] === '{') {
          const closeIdx = rawLine.indexOf('}', i + 1);
          if (closeIdx === -1) break;
          parseMarkingsBlock(rawLine.slice(i + 1, closeIdx), markings);
          i = closeIdx + 1;
        }

        // Also allow trailing tie '~' after markings
        let finalTied = tiedToNext;
        if (i < len && rawLine[i] === '~') {
          finalTied = true;
          i++;
        }

        totalNotes++;
        const note: MusoJianpuNote = {
          kind: 'note',
          id: `n-${totalNotes}`,
          degree,
          octave,
          accidental: degree === 0 ? null : acc,
          underlines,
          dots,
          tiedToNext: finalTied,
          graceNotes: pendingGraceNotes.length > 0 ? [...pendingGraceNotes] : [],
          markings,
          startOffset,
          endOffset: lineStart + i,
          lineNumber
        };
        pendingGraceNotes = [];
        if (degree >= 1 && degree <= 7) {
          lastPitchedNote = note;
        }

        attachActiveSlurs(note);

        if (inHairpin && activeHairpinId !== undefined && activeHairpinType) {
          note.hairpinId = activeHairpinId;
          note.hairpinType = activeHairpinType;
          if (pendingHairpinStart) {
            note.hairpinStart = true;
            pendingHairpinStart = false;
          }
          lastNoteInHairpin = note;
        }

        if (inTuplet) {
          if (pendingTupletStart !== undefined) {
            note.tupletStart = pendingTupletStart;
            pendingTupletStart = undefined;
          }
          lastNoteInTuplet = note;
        }

        // Group adjacent underlined notes (or single standalone notes) into beat groups for continuous beaming
        if (underlines > 0) {
          if (!currentGroup) {
            currentGroup = {
              kind: 'group',
              id: `g-${totalNotes}`,
              notes: [note]
            };
          } else {
            currentGroup.notes.push(note);
          }
        } else {
          flushGroup();
          currentMeasure!.groups.push({
            kind: 'group',
            id: `g-${totalNotes}`,
            notes: [note]
          });
        }
        currentMeasure!.endOffset = lineStart + i;
        continue;
      }

      // Skip any unrecognized character gracefully
      i++;
    }

    // Attach any trailing end-of-line grace notes as post-grace notes on the last pitched note
    if (pendingGraceNotes.length > 0 && lastPitchedNote) {
      lastPitchedNote.postGraceNotes = [
        ...(lastPitchedNote.postGraceNotes || []),
        ...pendingGraceNotes
      ];
      pendingGraceNotes = [];
    }

    flushGroup();

    // Filter out completely empty trailing measures created by trailing barline
    const validMeasures = measures.filter(m => m.groups.length > 0);
    if (validMeasures.length > 0) {
      // Close any unclosed nested slurs, tuplets, or hairpins at end of line
      while (slurStack.length > 0) {
        const frame = slurStack.pop();
        if (frame) closeSlurFrame(frame);
      }
      if (inTuplet && lastNoteInTuplet) {
        lastNoteInTuplet.tupletEnd = true;
      }
      if (inHairpin && lastNoteInHairpin) {
        lastNoteInHairpin.hairpinEnd = true;
      }

      const musicNode: MusicLineNode = {
        kind: 'music',
        id: `ml-${lineIdx}`,
        lineNumber,
        measures: validMeasures
      };
      lines.push(musicNode);
      lastMusicLine = musicNode;
    }
  }

  // Ensure default strings derived from key & instrument if not explicitly set
  if (!header.strings) {
    if (header.instrument === 'pipa') {
      header.strings = 'A-d-e-a';
    } else if (!header.instrument || header.instrument === 'erhu') {
      header.strings = getErhuKeyInfo(header.key).strings;
    }
  }

  return {
    header,
    lines,
    totalMeasures,
    totalNotes
  };
}

/**
 * Heuristically detects whether an arbitrary text file is a MusoJianpu text score.
 */
export function detectMusoJianpuFormat(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const hasHeader = /^@(title|key|strings|time|tempo|instrument)\s*[:：]/im.test(text);
  if (hasHeader) return true;

  const hasInstrumentMarkings = /\{(pull|push|拉|推|内|外|in|out|vib|揉|su|sd|上滑|下滑|一|二|三|四|trem|stacc|pizz|tan|tiao|lun|sao|fu|tuo|mo|gou|cuo|yao|gua|arp|弹|挑|轮|扫|拂|托|抹|勾|撮|摇|刮|琶音)\b/i.test(text);
  if (hasInstrumentMarkings) return true;

  // Check for multiple Jianpu measure bars containing digits 0-7
  const jianpuBarLines = text.split('\n').filter(line => {
    const t = line.trim();
    return t.includes('|') && /[1-7][',_/.-]*\s+[0-7-]/.test(t) && !/^[A-Z]:/.test(t);
  });
  return jianpuBarLines.length >= 2;
}
