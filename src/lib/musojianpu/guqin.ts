/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Guqin Jianzipu (古琴减字谱) parser, builder, human-readable formatter,
 * and acoustic string/hui pitch physics engine.
 */

import {
  GuqinJianzi,
  GuqinLeftAction,
  GuqinLeftFinger,
  GuqinRightStroke,
  GuqinSoundType
} from './types.ts';

export const GUQIN_STRING_CHINESE: Record<number, string> = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
  7: '七'
};

export const CHINESE_TO_STRING_NUM: Record<string, number> = {
  '一': 1, '1': 1,
  '二': 2, '2': 2,
  '三': 3, '3': 3,
  '四': 4, '4': 4,
  '五': 5, '5': 5,
  '六': 6, '6': 6,
  '七': 7, '7': 7
};

export const GUQIN_FINGER_LABEL: Record<GuqinLeftFinger, { full: string; radical: string }> = {
  da: { full: '大指', radical: '大' },
  shi: { full: '食指', radical: '亻' },
  zhong: { full: '中指', radical: '中' },
  ming: { full: '名指', radical: '夕' },
  gui: { full: '跪指', radical: '跪' }
};

export const GUQIN_STROKE_LABEL: Record<GuqinRightStroke, { zh: string; en: string }> = {
  gou: { zh: '勾', en: 'Gou (middle inward)' },
  ti: { zh: '剔', en: 'Ti (middle outward)' },
  mo: { zh: '抹', en: 'Mo (index inward)' },
  tiao: { zh: '挑', en: 'Tiao (index outward)' },
  da: { zh: '打', en: 'Da (ring inward)' },
  zhai: { zh: '摘', en: 'Zhai (ring outward)' },
  pi: { zh: '劈', en: 'Pi (thumb inward)' },
  tuo: { zh: '托', en: 'Tuo (thumb outward)' },
  li: { zh: '历', en: 'Li (consecutive index outward)' },
  cuo: { zh: '撮', en: 'Cuo (simultaneous pinch)' },
  fancuo: { zh: '反撮', en: 'Fan Cuo (reverse pinch)' },
  lun: { zh: '轮', en: 'Lun (three-finger roll)' },
  gun: { zh: '滚', en: 'Gun (downward sweep)' },
  fu: { zh: '拂', en: 'Fu (upward sweep)' },
  suo: { zh: '锁', en: 'Suo (rapid repeated strokes)' },
  bo: { zh: '拨', en: 'Bo (two-finger strum inward)' },
  ruyi: { zh: '如一', en: 'Ruyi (sounding as one)' }
};

export const GUQIN_ACTION_LABEL: Record<GuqinLeftAction, { zh: string; en: string }> = {
  shang: { zh: '上', en: 'Slide up (上)' },
  xia: { zh: '下', en: 'Slide down (下)' },
  chuo: { zh: '绰', en: 'Slide in from below (绰)' },
  zhu: { zh: '注', en: 'Slide in from above (注)' },
  yin: { zh: '吟', en: 'Gentle vibrato (吟)' },
  nao: { zh: '猱', en: 'Wide slow vibrato (猱)' },
  zhuang: { zh: '撞', en: 'Quick pitch bump (撞)' },
  qiaqi: { zh: '掐起', en: 'Left-hand pull-off (掐起)' },
  jinfu: { zh: '进复', en: 'Advance & return (进复)' },
  tuifu: { zh: '退复', en: 'Retreat & return (退复)' },
  yan: { zh: '罨', en: 'Left-hand hammer-on (罨)' },
  daiqi: { zh: '带起', en: 'Pull-off open string (带起)' },
  fanqi: { zh: '泛起', en: 'Harmonics begin (泛起)' },
  fanzhi: { zh: '泛止', en: 'Harmonics end (泛止)' }
};

const ACTION_ALIASES: Record<string, GuqinLeftAction> = {
  shang: 'shang', '上': 'shang',
  xia: 'xia', '下': 'xia',
  chuo: 'chuo', '绰': 'chuo', '綽': 'chuo',
  zhu: 'zhu', '注': 'zhu',
  yin: 'yin', '吟': 'yin',
  nao: 'nao', '猱': 'nao',
  zhuang: 'zhuang', '撞': 'zhuang',
  qiaqi: 'qiaqi', '掐': 'qiaqi', '掐起': 'qiaqi',
  jinfu: 'jinfu', '进复': 'jinfu', '進復': 'jinfu',
  tuifu: 'tuifu', '退复': 'tuifu', '退復': 'tuifu',
  yan: 'yan', '罨': 'yan',
  daiqi: 'daiqi', '带起': 'daiqi',
  fanqi: 'fanqi', '泛起': 'fanqi',
  fanzhi: 'fanzhi', '泛止': 'fanzhi'
};

const FINGER_MAP: Record<string, GuqinLeftFinger> = {
  da: 'da', '大': 'da', '大指': 'da',
  shi: 'shi', '食': 'shi', '食指': 'shi', '亻': 'shi',
  zhong: 'zhong', '中': 'zhong', '中指': 'zhong',
  ming: 'ming', '名': 'ming', '名指': 'ming', '夕': 'ming',
  gui: 'gui', '跪': 'gui', '跪指': 'gui'
};

const STROKE_MAP: Record<string, GuqinRightStroke> = {
  gou: 'gou', '勾': 'gou',
  ti: 'ti', '剔': 'ti',
  mo: 'mo', '抹': 'mo',
  tiao: 'tiao', '挑': 'tiao',
  da: 'da', '打': 'da',
  zhai: 'zhai', '摘': 'zhai',
  pi: 'pi', '劈': 'pi',
  tuo: 'tuo', '托': 'tuo',
  li: 'li', '历': 'li', '歷': 'li',
  cuo: 'cuo', '撮': 'cuo',
  fancuo: 'fancuo', '反撮': 'fancuo',
  lun: 'lun', '轮': 'lun', '輪': 'lun',
  gun: 'gun', '滚': 'gun', '滾': 'gun',
  fu: 'fu', '拂': 'fu',
  suo: 'suo', '锁': 'suo', '鎖': 'suo',
  bo: 'bo', '拨': 'bo', '撥': 'bo',
  ruyi: 'ruyi', '如一': 'ruyi'
};

const HUI_ZH_MAP: Record<string, string> = {
  '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
  '六': '6', '七': '7', '八': '8', '九': '9', '十': '10',
  '十一': '11', '十二': '12', '十三': '13',
  '徽外': '外', '外': '外'
};

const NUM_TO_HUI_ZH: Record<string, string> = {
  '1': '一', '2': '二', '3': '三', '4': '四', '5': '五',
  '6': '六', '7': '七', '8': '八', '9': '九', '10': '十',
  '11': '十一', '12': '十二', '13': '十三',
  '外': '外', '徽外': '外'
};

/**
 * Formats a hui string (e.g. "7", "10", "7.6", "外") into authentic Chinese numerals (e.g. "七", "十", "七六", "外").
 */
export function formatHuiChinese(hui?: string): { main: string; frac?: string } | null {
  if (!hui) return null;
  const cleaned = hui.trim();
  if (!cleaned) return null;
  if (cleaned === '外' || cleaned === '徽外' || cleaned.toLowerCase() === 'wai') {
    return { main: '外' };
  }
  const dotMatch = cleaned.match(/^(\d{1,2})\.(\d)$/);
  if (dotMatch) {
    return {
      main: NUM_TO_HUI_ZH[dotMatch[1]] || dotMatch[1],
      frac: NUM_TO_HUI_ZH[dotMatch[2]] || dotMatch[2]
    };
  }
  if (NUM_TO_HUI_ZH[cleaned]) {
    return { main: NUM_TO_HUI_ZH[cleaned] };
  }
  return { main: cleaned };
}

/**
 * Parses a Chinese Hui segment like "九", "十", "十三", "七六" (7.6), "十外", "徽外"
 */
function parseChineseHui(raw: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.replace(/徽/g, '').trim();
  if (!s) return undefined;
  if (s === '外') return '外';
  if (HUI_ZH_MAP[s]) return HUI_ZH_MAP[s];

  // Fractional hui e.g. 七六 -> 7.6, 七九 -> 7.9, 六二 -> 6.2, 十八 -> 10.8, 十外 -> 10.8
  const twoChar = s.match(/^(十三|十二|十一|十|[一二三四五六七八九])([一二三四五六七八九]|半|外)$/);
  if (twoChar) {
    const base = HUI_ZH_MAP[twoChar[1]];
    const frac = twoChar[2] === '半' ? '5' : twoChar[2] === '外' ? '9' : HUI_ZH_MAP[twoChar[2]];
    if (base && frac) return `${base}.${frac}`;
  }

  if (/^\d{1,2}(?:\.\d)?$/.test(s)) return s;
  return undefined;
}

/**
 * Parses a compact Guqin Jianzipu token (Chinese oral shorthand OR ASCII `gq:` format) into a GuqinJianzi AST.
 *
 * Examples:
 * - Chinese compound: `散勾一`, `名九勾六`, `大七六挑七`, `泛七抹五`, `散撮一六`, `名十撮三六`, `上七六`, `下九`
 * - ASCII compound: `gq:san-gou-1`, `gq:ming-9-gou-6`, `gq:da-7.6-tiao-7`, `gq:fan-7-mo-5`, `gq:san-cuo-1-6`
 * - Standalone action/modifier: `绰`, `注`, `吟`, `猱`, `上`, `下`, `撞`, `掐起`, `进复`, `退复`, `泛起`, `泛止`,
 *   or ASCII `chuo`, `zhu`, `yin`, `nao`, `shang`, `xia`, `zhuang`, `qiaqi`, `jinfu`, `tuifu`, `fanqi`, `fanzhi`
 */
export function parseGuqinToken(part: string): Partial<GuqinJianzi> | null {
  const trimmed = part.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  // 1. Standalone left-hand action / harmonic boundary marker
  if (ACTION_ALIASES[lower] || ACTION_ALIASES[trimmed]) {
    const act = ACTION_ALIASES[lower] || ACTION_ALIASES[trimmed];
    return { actions: [act] };
  }

  // 2. Slide with explicit target hui: 上七六, 上七半, 上七, 下九, shang7.6, xia9
  const slideMatch = trimmed.match(/^(上|下|shang|xia)(十三|十二|十一|十[一二三四五六七八九半外]?|[一二三四五六七八九][一二三四五六七八九半外]?|徽?外|\d{1,2}(?:\.\d)?)$/i);
  if (slideMatch) {
    const dir: GuqinLeftAction = slideMatch[1].toLowerCase() === 'shang' || slideMatch[1] === '上' ? 'shang' : 'xia';
    const targetHui = parseChineseHui(slideMatch[2]);
    return { actions: [dir], targetHui };
  }

  // 3. Explicit ASCII `gq:...` or `jz:...` compound token
  // e.g. gq:san-gou-1, gq:ming-9-gou-6, gq:da-7.6-tiao-7, gq:fan-7-mo-5, gq:san-cuo-1-6
  if (/^(?:gq|jz)[:：]/i.test(trimmed)) {
    const body = trimmed.replace(/^(?:gq|jz)[:：]/i, '').trim();
    const segs = body.split(/[-_\s/]+/).filter(Boolean);
    const out: Partial<GuqinJianzi> = {};
    const strings: number[] = [];

    for (const seg of segs) {
      const sLow = seg.toLowerCase();
      if (sLow === 'san' || seg === '散') {
        out.soundType = 'san';
      } else if (sLow === 'fan' || seg === '泛') {
        out.soundType = 'fan';
      } else if (sLow === 'an' || seg === '按') {
        out.soundType = 'an';
      } else if (FINGER_MAP[sLow] || FINGER_MAP[seg]) {
        out.leftFinger = FINGER_MAP[sLow] || FINGER_MAP[seg];
        if (!out.soundType) out.soundType = 'an';
      } else if (STROKE_MAP[sLow] || STROKE_MAP[seg]) {
        out.rightStroke = STROKE_MAP[sLow] || STROKE_MAP[seg];
      } else if (ACTION_ALIASES[sLow] || ACTION_ALIASES[seg]) {
        out.actions = [...(out.actions || []), ACTION_ALIASES[sLow] || ACTION_ALIASES[seg]];
      } else if (out.rightStroke && CHINESE_TO_STRING_NUM[seg]) {
        strings.push(CHINESE_TO_STRING_NUM[seg]);
      } else if (/^s([1-7])$/i.test(sLow)) {
        strings.push(parseInt(sLow[1], 10));
      } else if (!out.rightStroke) {
        const parsedHui = parseChineseHui(seg);
        if (parsedHui) out.hui = parsedHui;
      } else if (/^([1-7])([1-7])$/.test(seg)) {
        strings.push(parseInt(seg[0], 10), parseInt(seg[1], 10));
      }
    }

    if (strings.length > 0) out.stringNum = strings[0];
    if (strings.length > 1) out.secondStringNum = strings[1];
    return Object.keys(out).length > 0 ? out : null;
  }

  // 4. Natural Chinese Jianzipu compound token!
  // Grammar: [散|泛|大|食|中|名|跪]? [徽位]? [反撮|如一|勾|剔|抹|挑|打|摘|劈|托|历|撮|轮|滚|拂|锁|拨] [一..七]{1,2}?
  const zhRegex = /^(散|泛|大|食|中|名|跪)?(十三|十二|十一|十[一二三四五六七八九半外]?|[一二三四五六七八九][一二三四五六七八九半外]?|徽?外)?(反撮|如一|勾|剔|抹|挑|打|摘|劈|托|历|歷|撮|轮|輪|滚|滾|拂|锁|鎖|拨|撥)([一二三四五六七]{1,2}|[1-7]{1,2})?$/;
  const zm = trimmed.match(zhRegex);
  if (zm) {
    const [, prefix, huiRaw, strokeRaw, stringsRaw] = zm;
    // Avoid catching single-character Pipa/Guzheng strokes like bare "挑", "抹", "勾", "托", "劈", "打", "轮", "滚", "拂"
    // unless paired with prefix, hui, or string number!
    if (!prefix && !huiRaw && !stringsRaw) {
      return null;
    }

    const out: Partial<GuqinJianzi> = {};
    if (prefix === '散') {
      out.soundType = 'san';
    } else if (prefix === '泛') {
      out.soundType = 'fan';
    } else if (prefix && FINGER_MAP[prefix]) {
      out.soundType = 'an';
      out.leftFinger = FINGER_MAP[prefix];
    }

    if (huiRaw) {
      const h = parseChineseHui(huiRaw);
      if (h) {
        out.hui = h;
        if (!out.soundType) out.soundType = 'an';
      }
    }

    if (strokeRaw && STROKE_MAP[strokeRaw]) {
      out.rightStroke = STROKE_MAP[strokeRaw];
    }

    if (stringsRaw) {
      const chars = Array.from(stringsRaw);
      if (chars[0] && CHINESE_TO_STRING_NUM[chars[0]]) {
        out.stringNum = CHINESE_TO_STRING_NUM[chars[0]];
      }
      if (chars[1] && CHINESE_TO_STRING_NUM[chars[1]]) {
        out.secondStringNum = CHINESE_TO_STRING_NUM[chars[1]];
      }
    }

    return Object.keys(out).length > 0 ? out : null;
  }

  return null;
}

/**
 * Merges a parsed GuqinJianzi fragment into an existing GuqinJianzi object on a note.
 */
export function mergeGuqinJianzi(existing: GuqinJianzi | undefined, patch: Partial<GuqinJianzi>): GuqinJianzi {
  const base: GuqinJianzi = existing ? { ...existing, actions: existing.actions ? [...existing.actions] : undefined } : {};
  if (patch.soundType) base.soundType = patch.soundType;
  if (patch.leftFinger) base.leftFinger = patch.leftFinger;
  if (patch.hui) base.hui = patch.hui;
  if (patch.targetHui) base.targetHui = patch.targetHui;
  if (patch.rightStroke) base.rightStroke = patch.rightStroke;
  if (patch.stringNum) base.stringNum = patch.stringNum;
  if (patch.secondStringNum) base.secondStringNum = patch.secondStringNum;
  if (patch.actions && patch.actions.length > 0) {
    const merged = base.actions ? [...base.actions] : [];
    for (const a of patch.actions) {
      if (!merged.includes(a)) merged.push(a);
    }
    base.actions = merged;
  }
  return base;
}

/**
 * Human-readable Chinese + English tooltip description for a composed Jianzipu character.
 */
export function describeGuqinJianzi(jz: GuqinJianzi): string {
  const parts: string[] = [];
  if (jz.soundType === 'san') parts.push('散音 (Open)');
  else if (jz.soundType === 'fan') parts.push('泛音 (Harmonic)');
  else if (jz.soundType === 'an') parts.push('按音 (Stopped)');

  if (jz.leftFinger) parts.push(GUQIN_FINGER_LABEL[jz.leftFinger].full);
  if (jz.hui) {
    const h = formatHuiChinese(jz.hui);
    if (h) parts.push(`${h.main}${h.frac || ''}徽`);
  }
  if (jz.rightStroke) {
    const st = GUQIN_STROKE_LABEL[jz.rightStroke];
    parts.push(`${st.zh} (${st.en.split(' ')[0]})`);
  }
  if (jz.stringNum) {
    const s1 = GUQIN_STRING_CHINESE[jz.stringNum] || String(jz.stringNum);
    if (jz.secondStringNum) {
      const s2 = GUQIN_STRING_CHINESE[jz.secondStringNum] || String(jz.secondStringNum);
      parts.push(`${s1}·${s2}弦`);
    } else {
      parts.push(`${s1}弦`);
    }
  }
  if (jz.actions && jz.actions.length > 0) {
    const acts = jz.actions.map(a => GUQIN_ACTION_LABEL[a].zh).join('·');
    const target = jz.targetHui ? `${formatHuiChinese(jz.targetHui)?.main || ''}${formatHuiChinese(jz.targetHui)?.frac || ''}徽` : '';
    parts.push(target ? `${acts}${target}` : acts);
  }
  return parts.join(' · ') || '减字谱';
}

/**
 * Composes a compact Chinese Jianzipu text token from builder fields (e.g. "名九勾六").
 */
export function composeGuqinTokenText(params: {
  soundType: GuqinSoundType;
  leftFinger?: GuqinLeftFinger;
  hui?: string;
  rightStroke: GuqinRightStroke;
  stringNum: number;
  secondStringNum?: number;
}): string {
  let prefix = '';
  if (params.soundType === 'san') {
    prefix = '散';
  } else if (params.soundType === 'fan') {
    const h = formatHuiChinese(params.hui || '7');
    prefix = `泛${h ? `${h.main}${h.frac || ''}` : '七'}`;
  } else {
    const fingerZh = params.leftFinger === 'da' ? '大'
      : params.leftFinger === 'shi' ? '食'
        : params.leftFinger === 'zhong' ? '中'
          : params.leftFinger === 'gui' ? '跪'
            : '名';
    const h = formatHuiChinese(params.hui || '9');
    prefix = `${fingerZh}${h ? `${h.main}${h.frac || ''}` : '九'}`;
  }
  const strokeZh = GUQIN_STROKE_LABEL[params.rightStroke].zh;
  const s1 = GUQIN_STRING_CHINESE[params.stringNum] || '一';
  const s2 = (params.rightStroke === 'cuo' || params.rightStroke === 'fancuo') && params.secondStringNum
    ? (GUQIN_STRING_CHINESE[params.secondStringNum] || '')
    : '';
  return `${prefix}${strokeZh}${s1}${s2}`;
}

export interface JzpFontEncoding {
  /** Pre-attack boundary glyphs (e.g. :fanqi+ for 泛起) */
  preWords: string[];
  /** Main composite Jianzipu character (e.g. 0k1+, s9/k6+, fy7u5+, C03|s10,6+) */
  coreWord: string | null;
  /** Post-attack action & closing glyphs (e.g. :yin+, :shang76+, :fanzhi+) */
  postWords: string[];
}

const FINGER_TO_JZP: Record<GuqinLeftFinger, string> = {
  da: 'v',
  shi: 'f',
  zhong: 'd',
  ming: 's',
  gui: 'x'
};

const STANDARD_STROKE_TO_JZP: Partial<Record<GuqinRightStroke, string>> = {
  gou: 'k',
  ti: 'i',
  mo: 'j',
  tiao: 'u',
  da: 'l',
  zhai: 'o',
  pi: 'n',
  tuo: 'h',
  li: 'U',
  lun: 'lun'
};

const CHORD_STROKE_TO_JZP: Partial<Record<GuqinRightStroke, string>> = {
  cuo: 'C',
  fancuo: 'FC',
  bo: 'B'
};

const VERTICAL_STROKE_TO_JZP: Partial<Record<GuqinRightStroke, string>> = {
  gun: 'gun',
  fu: 'fu',
  suo: 'suo',
  ruyi: 'ru1'
};

/** Encodes a hui value for JianZiPu.ttf standard/chord `area_hui` (supports 1..13, 1.1..13.9, wai). */
function encodeJzpStandardHui(hui?: string): string {
  if (!hui) return '';
  const cleaned = hui.trim();
  if (!cleaned) return '';
  if (cleaned === '外' || cleaned === '徽外' || cleaned.toLowerCase() === 'wai') {
    return 'wai';
  }
  const dotMatch = cleaned.match(/^(\d{1,2})\.(\d)$/);
  if (dotMatch) {
    const whole = Math.max(1, Math.min(13, parseInt(dotMatch[1], 10)));
    const frac = Math.max(1, Math.min(9, parseInt(dotMatch[2], 10)));
    return `${whole}.${frac}`;
  }
  const wholeNum = parseInt(cleaned, 10);
  if (!isNaN(wholeNum)) {
    return String(Math.max(1, Math.min(13, wholeNum)));
  }
  return '';
}

/**
 * Encodes a hui value for JianZiPu.ttf vertical `area_char` (used in :shang / :xia),
 * which uses individual md_1..md_13, md_wai, and md_ban glyphs rather than decimal md_H.D.
 */
function encodeJzpVerticalHui(hui?: string): string {
  if (!hui) return '';
  const cleaned = hui.trim();
  if (!cleaned) return '';
  if (cleaned === '外' || cleaned === '徽外' || cleaned.toLowerCase() === 'wai') {
    return 'wai';
  }
  const dotMatch = cleaned.match(/^(\d{1,2})\.(\d)$/);
  if (dotMatch) {
    const whole = Math.max(1, Math.min(13, parseInt(dotMatch[1], 10)));
    const frac = parseInt(dotMatch[2], 10);
    if (frac === 5) return `${whole}ban`;
    // Disambiguate "1" followed by 0/1/2/3 from 10/11/12/13 using JianZiPu.ttf comma rule
    if (whole === 1 && frac >= 0 && frac <= 3) return `1,${frac}`;
    return `${whole}${frac}`;
  }
  const wholeNum = parseInt(cleaned, 10);
  if (!isNaN(wholeNum)) {
    return String(Math.max(1, Math.min(13, wholeNum)));
  }
  return '';
}

/**
 * Encodes a GuqinJianzi AST into verified OpenType input strings for JianZiPu.ttf
 * (by Nancy Yi Liang / Nellodee LLC, SIL Open Font License 1.1).
 * Each returned word ends with `+` (advance) so it takes its exact 1em width in HTML.
 */
export function encodeGuqinJianziToJzpFont(jz: GuqinJianzi): JzpFontEncoding {
  const actions = jz.actions || [];
  const preWords: string[] = [];
  const postWords: string[] = [];

  if (actions.includes('fanqi')) {
    preWords.push(':fanqi+');
  }

  const approach = actions.includes('chuo')
    ? '/'
    : actions.includes('zhu')
      ? '\\'
      : '';

  const s1 = jz.stringNum ? String(jz.stringNum) : '';
  const s2 = jz.secondStringNum ? String(jz.secondStringNum) : '';
  const fyPrefix = jz.soundType === 'fan' ? 'fy' : '';
  const leftKey = jz.soundType !== 'san' && jz.leftFinger ? FINGER_TO_JZP[jz.leftFinger] : '';
  const huiKey = jz.soundType === 'san' ? '0' : encodeJzpStandardHui(jz.hui);

  // If the note has no explicit right-hand stroke but has `qiaqi` (掐起), fold `c` (lg_qiaqi) into the core glyph
  let consumedQiaqiInCore = false;
  let coreWord: string | null = null;

  const hasCoreData = Boolean(
    jz.soundType ||
    jz.leftFinger ||
    jz.hui ||
    jz.rightStroke ||
    jz.stringNum
  );

  if (hasCoreData) {
    const chordKey = jz.rightStroke ? CHORD_STROKE_TO_JZP[jz.rightStroke] : undefined;
    const vertStrokeKey = jz.rightStroke ? VERTICAL_STROKE_TO_JZP[jz.rightStroke] : undefined;

    if (chordKey) {
      // Two-string simultaneous pinch / strum chord layout: [fy?] [C|FC|B] [leftHalf] | [rightHalf] +
      const buildStoppedHalf = (str: string) => {
        const sep = huiKey && !approach && str ? ',' : '';
        return `${leftKey}${huiKey}${approach}${sep}${str}`;
      };

      if (s1 && s2) {
        if (jz.soundType === 'san') {
          coreWord = `${chordKey}0${s1}|0${s2}+`;
        } else if (jz.soundType === 'fan') {
          coreWord = `${fyPrefix}${chordKey}${buildStoppedHalf(s1)}|${buildStoppedHalf(s2)}+`;
        } else {
          // Traditional stopped 撮 (e.g. 名十撮三六): lower string open, upper string stopped
          coreWord = `${chordKey}0${s1}|${buildStoppedHalf(s2)}+`;
        }
      } else {
        const half = jz.soundType === 'san' ? `0${s1}` : buildStoppedHalf(s1);
        coreWord = `${fyPrefix}${chordKey}${half}+`;
      }
    } else if (vertStrokeKey) {
      // Vertical-only multi-string sweeps/rolls: 滚, 拂/沸, 锁, 如一
      if (jz.rightStroke === 'ruyi') {
        coreWord = ':ru1+';
      } else {
        const stringsJoined = s1 && s2
          ? (s1 === '1' && parseInt(s2, 10) <= 3 ? `1,${s2}` : `${s1}${s2}`)
          : s1;
        coreWord = `:${vertStrokeKey}${stringsJoined}+`;
      }
    } else {
      // Standard layout: [fy?] [left?] [hui?] [jc?] [zhu?] [right?] [string?] +
      let rightKey = jz.rightStroke ? (STANDARD_STROKE_TO_JZP[jz.rightStroke] || '') : '';
      if (!rightKey && actions.includes('qiaqi')) {
        rightKey = 'c';
        consumedQiaqiInCore = true;
      }
      const needsComma = Boolean(huiKey && !approach && !rightKey && s1 && jz.soundType !== 'san');
      const assembled = `${fyPrefix}${leftKey}${huiKey}${approach}${rightKey}${needsComma ? ',' : ''}${s1}`;
      coreWord = assembled ? `${assembled}+` : null;
    }
  } else if (approach) {
    // Standalone 绰 or 注 marker with no pluck core
    coreWord = `${approach}+`;
  }

  // Post-attack left-hand actions rendered in matching JianZiPu.ttf calligraphy
  for (const act of actions) {
    if (act === 'chuo' || act === 'zhu' || act === 'fanqi' || act === 'fanzhi') continue;
    if (act === 'qiaqi' && consumedQiaqiInCore) continue;

    switch (act) {
      case 'shang': {
        const th = encodeJzpVerticalHui(jz.targetHui);
        postWords.push(th ? `:shang${th}+` : ':shang+');
        break;
      }
      case 'xia': {
        const th = encodeJzpVerticalHui(jz.targetHui);
        postWords.push(th ? `:xia${th}+` : ':xia+');
        break;
      }
      case 'yin':
        postWords.push(':yin+');
        break;
      case 'nao':
        postWords.push(':nao+');
        break;
      case 'zhuang':
        postWords.push(':zhuang+');
        break;
      case 'daiqi':
        postWords.push(':daiqi+');
        break;
      case 'qiaqi':
        postWords.push('c+');
        break;
      case 'jinfu':
        postWords.push(':jinfu4+');
        break;
      case 'tuifu':
        postWords.push(':tuifu4+');
        break;
      case 'yan':
        postWords.push(':V+');
        break;
    }
  }

  if (actions.includes('fanzhi')) {
    postWords.push(':fanzhi+');
  }

  return { preWords, coreWord, postWords };
}

/**
 * Standard Guqin 正调 (Zhengdiao, F Major: 5-6-1-2-3-5-6) open string MIDI pitches
 * pitched in the warm, audible concert baritone-tenor register (C3–D4, MIDI 48–62).
 */
const ZHENGDIAO_OPEN_MIDI: Record<number, number> = {
  1: 48, // C3 (5,)
  2: 50, // D3 (6,)
  3: 53, // F3 (1)
  4: 55, // G3 (2)
  5: 57, // A3 (3)
  6: 60, // C4 (5)
  7: 62  // D4 (6)
};

/** Exact vibrating-length ratio for each of the 13 Hui positions */
const HUI_RATIOS: Record<number, number> = {
  1: 1 / 8,
  2: 1 / 6,
  3: 1 / 5,
  4: 1 / 4,
  5: 1 / 3,
  6: 2 / 5,
  7: 1 / 2,
  8: 3 / 5,
  9: 2 / 3,
  10: 3 / 4,
  11: 4 / 5,
  12: 5 / 6,
  13: 7 / 8
};

/** Exact acoustic overtone semitone boost for Harmonics (泛音) at each Hui */
const HARMONIC_HUI_SEMITONES: Record<number, number> = {
  1: 36, 13: 36,
  2: 31, 12: 31,
  3: 28, 6: 28, 8: 28, 11: 28,
  4: 24, 10: 24,
  5: 19, 9: 19,
  7: 12
};

/**
 * Computes acoustic MIDI pitch(es) directly from a GuqinJianzi specification using 正调 physics.
 * Used as fallback when a pure-Jianzipu score omits explicit Jianpu digits or for verifying pitches.
 */
export function computeGuqinMidiFromJianzi(jz: GuqinJianzi, transposeSemitones: number = 0): number[] {
  if (!jz.stringNum || !ZHENGDIAO_OPEN_MIDI[jz.stringNum]) return [];

  const calcString = (strNum: number, applyLeftHand: boolean): number => {
    const open = ZHENGDIAO_OPEN_MIDI[strNum] + transposeSemitones;
    if (!applyLeftHand || jz.soundType === 'san' || !jz.hui) {
      return open;
    }
    const huiFloat = jz.hui === '外' ? 13.5 : parseFloat(jz.hui);
    if (isNaN(huiFloat)) return open;

    if (jz.soundType === 'fan') {
      const nearestHui = Math.max(1, Math.min(13, Math.round(huiFloat)));
      return open + (HARMONIC_HUI_SEMITONES[nearestHui] || 12);
    }

    // Stopped string (按音): interpolate vibrating length ratio between integer hui
    const lo = Math.max(1, Math.min(13, Math.floor(huiFloat)));
    const hi = Math.max(1, Math.min(13, Math.ceil(huiFloat)));
    const frac = huiFloat - lo;
    const rLo = HUI_RATIOS[lo] || 0.5;
    const rHi = huiFloat > 13 ? 0.92 : (HUI_RATIOS[hi] || rLo);
    const ratio = rLo + (rHi - rLo) * frac;
    const semitones = Math.round(-12 * Math.log2(Math.max(0.08, ratio)));
    return open + semitones;
  };

  if (jz.secondStringNum && ZHENGDIAO_OPEN_MIDI[jz.secondStringNum]) {
    // In 撮 (cuo), typically lower string is open or both stopped; apply left-hand to higher string if 按/泛
    const p1 = calcString(jz.stringNum, jz.soundType === 'fan');
    const p2 = calcString(jz.secondStringNum, jz.soundType !== 'san');
    return [p1, p2].sort((a, b) => a - b);
  }

  return [calcString(jz.stringNum, true)];
}
