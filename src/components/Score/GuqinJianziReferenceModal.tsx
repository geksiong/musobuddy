/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Interactive Guqin Jianzipu Reference (古琴减字谱图典).
 * Displays authentic JianZiPu.ttf OpenType calligraphy, anatomical reading order,
 * right-hand strokes (右手八法 & compound techniques), left-hand fingers & ornaments,
 * and Zhengdiao (正调) 7-string / 13-hui acoustic reference—with click-to-insert.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ExternalLink, Search, X, Check } from 'lucide-react';
import { GuqinJianzi } from '../../lib/musojianpu/types.ts';
import { GuqinJianziGlyph } from './GuqinJianziGlyph.tsx';
import { cn } from '../../lib/utils.ts';

export interface GuqinJianziReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  /** Inserts or toggles a MusoJianpu token into the active score editor */
  onInsertToken: (token: string, isModifier: boolean) => void;
}

type RefTab = 'anatomy' | 'right' | 'left' | 'strings';

interface GlyphRefEntry {
  id: string;
  zh: string;
  pinyin: string;
  en: string;
  detail: string;
  token: string;
  isModifier: boolean;
  /** Isolated component or modifier glyph */
  radicalJianzi: GuqinJianzi;
  /** Full composite character showing the component in context */
  exampleJianzi?: GuqinJianzi;
  exampleLabel?: string;
}

const ANATOMY_EXAMPLES: Array<{
  title: string;
  token: string;
  jianzi: GuqinJianzi;
  readingOrder: string[];
  pitchNote: string;
}> = [
  {
    title: 'Open String (散音)',
    token: '散勾一',
    jianzi: { soundType: 'san', rightStroke: 'gou', stringNum: 1 },
    readingOrder: ['Top: 散 (open string, no left hand)', 'Bottom: 勾 radical enclosing string 一'],
    pitchNote: '正调: 5, (C3)'
  },
  {
    title: 'Stopped + Approach + Vibrato',
    token: '名九勾六,绰,吟',
    jianzi: {
      soundType: 'an',
      leftFinger: 'ming',
      hui: '9',
      rightStroke: 'gou',
      stringNum: 6,
      actions: ['chuo', 'yin']
    },
    readingOrder: [
      'Top-left: 名 (ring finger) · Top-right: 九 (9th hui)',
      'Left flank: 绰 (slide in from below)',
      'Bottom: 勾 enclosing string 六 · Trailing: 吟 (vibrato)'
    ],
    pitchNote: '正调: 2\' (G4)'
  },
  {
    title: 'Harmonic (泛音)',
    token: '泛七挑五',
    jianzi: { soundType: 'fan', hui: '7', rightStroke: 'tiao', stringNum: 5 },
    readingOrder: [
      'Canopy above: abbreviated 泛音 harmonic mark (not full 泛)',
      'Upper: 七 (7th hui node) · Lower: 挑 cradling string 五'
    ],
    pitchNote: '正调: 3\' (A4, +1 oct)'
  },
  {
    title: 'Simultaneous Pinch (撮)',
    token: '名十撮三六',
    jianzi: {
      soundType: 'an',
      leftFinger: 'ming',
      hui: '10',
      rightStroke: 'cuo',
      stringNum: 3,
      secondStringNum: 6
    },
    readingOrder: [
      'Top canopy: 撮 (pinch two strings together)',
      'Left half: 散三 (open string 3) · Right half: 名十六 (ring, 10th hui, string 6)'
    ],
    pitchNote: '正调: 1 + 1\' (F3 + F4)'
  }
];

const RIGHT_BASIC_STROKES: GlyphRefEntry[] = [
  {
    id: 'mo',
    zh: '抹',
    pinyin: 'mǒ',
    en: 'Index inward',
    detail: 'Pluck toward body with right index finger (abbreviated from 木).',
    token: '散抹五',
    isModifier: false,
    radicalJianzi: { rightStroke: 'mo' },
    exampleJianzi: { soundType: 'san', rightStroke: 'mo', stringNum: 5 },
    exampleLabel: '散抹五'
  },
  {
    id: 'tiao',
    zh: '挑',
    pinyin: 'tiāo',
    en: 'Index outward',
    detail: 'Pluck away from body with right index finger (cradle stroke 乚).',
    token: '散挑七',
    isModifier: false,
    radicalJianzi: { rightStroke: 'tiao' },
    exampleJianzi: { soundType: 'san', rightStroke: 'tiao', stringNum: 7 },
    exampleLabel: '散挑七'
  },
  {
    id: 'gou',
    zh: '勾',
    pinyin: 'gōu',
    en: 'Middle inward',
    detail: 'Pluck toward body with right middle finger (enclosing hook 勹).',
    token: '散勾一',
    isModifier: false,
    radicalJianzi: { rightStroke: 'gou' },
    exampleJianzi: { soundType: 'san', rightStroke: 'gou', stringNum: 1 },
    exampleLabel: '散勾一'
  },
  {
    id: 'ti',
    zh: '剔',
    pinyin: 'tī',
    en: 'Middle outward',
    detail: 'Pluck away from body with right middle finger (from 易).',
    token: '散剔四',
    isModifier: false,
    radicalJianzi: { rightStroke: 'ti' },
    exampleJianzi: { soundType: 'san', rightStroke: 'ti', stringNum: 4 },
    exampleLabel: '散剔四'
  },
  {
    id: 'da',
    zh: '打',
    pinyin: 'dǎ',
    en: 'Ring inward',
    detail: 'Pluck toward body with right ring finger (from 丁).',
    token: '散打二',
    isModifier: false,
    radicalJianzi: { rightStroke: 'da' },
    exampleJianzi: { soundType: 'san', rightStroke: 'da', stringNum: 2 },
    exampleLabel: '散打二'
  },
  {
    id: 'zhai',
    zh: '摘',
    pinyin: 'zhāi',
    en: 'Ring outward',
    detail: 'Pluck away from body with right ring finger (from 啇).',
    token: '散摘五',
    isModifier: false,
    radicalJianzi: { rightStroke: 'zhai' },
    exampleJianzi: { soundType: 'san', rightStroke: 'zhai', stringNum: 5 },
    exampleLabel: '散摘五'
  },
  {
    id: 'pi',
    zh: '劈',
    pinyin: 'pī',
    en: 'Thumb inward',
    detail: 'Pluck toward body with right thumb nail (from 尸).',
    token: '散劈六',
    isModifier: false,
    radicalJianzi: { rightStroke: 'pi' },
    exampleJianzi: { soundType: 'san', rightStroke: 'pi', stringNum: 6 },
    exampleLabel: '散劈六'
  },
  {
    id: 'tuo',
    zh: '托',
    pinyin: 'tuō',
    en: 'Thumb outward',
    detail: 'Pluck away from body with right thumb back (from 乇).',
    token: '散托七',
    isModifier: false,
    radicalJianzi: { rightStroke: 'tuo' },
    exampleJianzi: { soundType: 'san', rightStroke: 'tuo', stringNum: 7 },
    exampleLabel: '散托七'
  }
];

const RIGHT_COMPOUND_STROKES: GlyphRefEntry[] = [
  {
    id: 'cuo',
    zh: '撮',
    pinyin: 'cuō',
    en: 'Simultaneous pinch',
    detail: 'Pinch two strings together (typically thumb outward + middle inward).',
    token: '散撮一六',
    isModifier: false,
    radicalJianzi: { soundType: 'san', rightStroke: 'cuo', stringNum: 1, secondStringNum: 6 },
    exampleJianzi: { soundType: 'an', leftFinger: 'ming', hui: '10', rightStroke: 'cuo', stringNum: 3, secondStringNum: 6 },
    exampleLabel: '名十撮三六'
  },
  {
    id: 'fancuo',
    zh: '反撮',
    pinyin: 'fǎn cuō',
    en: 'Reverse pinch',
    detail: 'Simultaneous outward-inward pinch in reversed finger direction.',
    token: '散反撮一六',
    isModifier: false,
    radicalJianzi: { soundType: 'san', rightStroke: 'fancuo', stringNum: 1, secondStringNum: 6 }
  },
  {
    id: 'li',
    zh: '历',
    pinyin: 'lì',
    en: 'Consecutive outward',
    detail: 'Rapidly pluck two or more adjacent strings outward with index finger.',
    token: '散历六',
    isModifier: false,
    radicalJianzi: { rightStroke: 'li' },
    exampleJianzi: { soundType: 'san', rightStroke: 'li', stringNum: 6 },
    exampleLabel: '散历六'
  },
  {
    id: 'lun',
    zh: '轮',
    pinyin: 'lún',
    en: 'Three-finger roll',
    detail: 'Rapid outward triplet roll (ring, middle, index) on one string.',
    token: '散轮七',
    isModifier: false,
    radicalJianzi: { rightStroke: 'lun' },
    exampleJianzi: { soundType: 'san', rightStroke: 'lun', stringNum: 7 },
    exampleLabel: '散轮七'
  },
  {
    id: 'gun',
    zh: '滚',
    pinyin: 'gǔn',
    en: 'Downward sweep',
    detail: 'Sweep inward from higher-numbered strings down toward lower strings.',
    token: '散滚七一',
    isModifier: false,
    radicalJianzi: { rightStroke: 'gun', stringNum: 7, secondStringNum: 1 }
  },
  {
    id: 'fu',
    zh: '拂',
    pinyin: 'fú',
    en: 'Upward sweep',
    detail: 'Sweep outward from lower strings up toward higher strings.',
    token: '散拂一七',
    isModifier: false,
    radicalJianzi: { rightStroke: 'fu', stringNum: 1, secondStringNum: 7 }
  },
  {
    id: 'bo',
    zh: '拨',
    pinyin: 'bō',
    en: 'Two-finger strum',
    detail: 'Strike two adjacent strings sharply inward with index + middle fingers.',
    token: '散拨一二',
    isModifier: false,
    radicalJianzi: { soundType: 'san', rightStroke: 'bo', stringNum: 1, secondStringNum: 2 }
  },
  {
    id: 'suo',
    zh: '锁',
    pinyin: 'suǒ',
    en: 'Locked pattern',
    detail: 'Crisp rapid rhythmic alternation (tiao-mo-tiao) on a single string.',
    token: '散锁六',
    isModifier: false,
    radicalJianzi: { rightStroke: 'suo', stringNum: 6 }
  },
  {
    id: 'ruyi',
    zh: '如一',
    pinyin: 'rú yī',
    en: 'Sound as one',
    detail: 'Two consecutive strokes blended seamlessly into a single resonance.',
    token: '散如一',
    isModifier: false,
    radicalJianzi: { rightStroke: 'ruyi' }
  }
];

const LEFT_FINGERS_AND_TIMBRES: GlyphRefEntry[] = [
  {
    id: 'san',
    zh: '散音',
    pinyin: 'sàn yīn',
    en: 'Open string',
    detail: 'Unstopped open string—deep, warm bell-like resonance (earth timbre).',
    token: '散勾一',
    isModifier: false,
    radicalJianzi: { soundType: 'san' },
    exampleJianzi: { soundType: 'san', rightStroke: 'gou', stringNum: 1 },
    exampleLabel: '散勾一'
  },
  {
    id: 'fan',
    zh: '泛音',
    pinyin: 'fàn yīn',
    en: 'Harmonic',
    detail: 'Light touch at a hui node—crystalline overtone (heaven timbre). Uses abbreviated top canopy.',
    token: '泛七挑五',
    isModifier: false,
    radicalJianzi: { soundType: 'fan' },
    exampleJianzi: { soundType: 'fan', hui: '7', rightStroke: 'tiao', stringNum: 5 },
    exampleLabel: '泛七挑五'
  },
  {
    id: 'da-finger',
    zh: '大指',
    pinyin: 'dà zhǐ',
    en: 'Left thumb',
    detail: 'Press string with the side-flesh and nail joint of the left thumb (high register).',
    token: '大七挑七',
    isModifier: false,
    radicalJianzi: { leftFinger: 'da' },
    exampleJianzi: { soundType: 'an', leftFinger: 'da', hui: '7', rightStroke: 'tiao', stringNum: 7 },
    exampleLabel: '大七挑七'
  },
  {
    id: 'shi-finger',
    zh: '食指',
    pinyin: 'shí zhǐ',
    en: 'Left index',
    detail: 'Press or lightly touch harmonic nodes with left index finger (亻 radical).',
    token: '食七挑六',
    isModifier: false,
    radicalJianzi: { leftFinger: 'shi' },
    exampleJianzi: { soundType: 'an', leftFinger: 'shi', hui: '7', rightStroke: 'tiao', stringNum: 6 },
    exampleLabel: '食七挑六'
  },
  {
    id: 'zhong-finger',
    zh: '中指',
    pinyin: 'zhōng zhǐ',
    en: 'Left middle',
    detail: 'Press string squarely with left middle finger pad (middle register).',
    token: '中八勾五',
    isModifier: false,
    radicalJianzi: { leftFinger: 'zhong' },
    exampleJianzi: { soundType: 'an', leftFinger: 'zhong', hui: '8', rightStroke: 'gou', stringNum: 5 },
    exampleLabel: '中八勾五'
  },
  {
    id: 'ming-finger',
    zh: '名指',
    pinyin: 'míng zhǐ',
    en: 'Left ring',
    detail: 'Most frequent stopping finger in middle-low positions (夕 radical).',
    token: '名九勾六',
    isModifier: false,
    radicalJianzi: { leftFinger: 'ming' },
    exampleJianzi: { soundType: 'an', leftFinger: 'ming', hui: '9', rightStroke: 'gou', stringNum: 6 },
    exampleLabel: '名九勾六'
  },
  {
    id: 'gui-finger',
    zh: '跪指',
    pinyin: 'guì zhǐ',
    en: 'Bent ring knuckle',
    detail: 'Stop string with the bent back-knuckle of the left ring finger (high positions).',
    token: '跪七挑七',
    isModifier: false,
    radicalJianzi: { leftFinger: 'gui' },
    exampleJianzi: { soundType: 'an', leftFinger: 'gui', hui: '7', rightStroke: 'tiao', stringNum: 7 },
    exampleLabel: '跪七挑七'
  }
];

const LEFT_ACTIONS: GlyphRefEntry[] = [
  {
    id: 'chuo',
    zh: '绰',
    pinyin: 'chuò',
    en: 'Slide in from below',
    detail: 'Approach target hui smoothly upward from a lower pitch on attack.',
    token: '绰',
    isModifier: true,
    radicalJianzi: { actions: ['chuo'] },
    exampleJianzi: { soundType: 'an', leftFinger: 'ming', hui: '9', rightStroke: 'gou', stringNum: 6, actions: ['chuo'] },
    exampleLabel: '名九绰勾六'
  },
  {
    id: 'zhu',
    zh: '注',
    pinyin: 'zhù',
    en: 'Slide in from above',
    detail: 'Approach target hui smoothly downward from a higher pitch on attack.',
    token: '注',
    isModifier: true,
    radicalJianzi: { actions: ['zhu'] },
    exampleJianzi: { soundType: 'an', leftFinger: 'ming', hui: '10', rightStroke: 'tiao', stringNum: 6, actions: ['zhu'] },
    exampleLabel: '名十注挑六'
  },
  {
    id: 'shang',
    zh: '上',
    pinyin: 'shàng',
    en: 'Slide up to hui',
    detail: 'After plucking, glide left finger rightward to a higher pitch (e.g. 上七六).',
    token: '上七六',
    isModifier: true,
    radicalJianzi: { actions: ['shang'], targetHui: '7.6' }
  },
  {
    id: 'xia',
    zh: '下',
    pinyin: 'xià',
    en: 'Slide down to hui',
    detail: 'After plucking, glide left finger leftward to a lower pitch (e.g. 下九).',
    token: '下九',
    isModifier: true,
    radicalJianzi: { actions: ['xia'], targetHui: '9' }
  },
  {
    id: 'yin',
    zh: '吟',
    pinyin: 'yín',
    en: 'Gentle vibrato',
    detail: 'Subtle, singing oscillation centered closely around the stopped hui.',
    token: '吟',
    isModifier: true,
    radicalJianzi: { actions: ['yin'] }
  },
  {
    id: 'nao',
    zh: '猱',
    pinyin: 'náo',
    en: 'Wide slow vibrato',
    detail: 'Broad, expressive pitch undulation wider and deeper than 吟.',
    token: '猱',
    isModifier: true,
    radicalJianzi: { actions: ['nao'] }
  },
  {
    id: 'zhuang',
    zh: '撞',
    pinyin: 'zhuàng',
    en: 'Quick pitch bump',
    detail: 'Rapidly slide up slightly and return immediately to the original hui.',
    token: '撞',
    isModifier: true,
    radicalJianzi: { actions: ['zhuang'] }
  },
  {
    id: 'jinfu',
    zh: '进复',
    pinyin: 'jìn fù',
    en: 'Advance & return',
    detail: 'Glide up to the next higher scale degree, then smoothly return.',
    token: '进复',
    isModifier: true,
    radicalJianzi: { actions: ['jinfu'] }
  },
  {
    id: 'tuifu',
    zh: '退复',
    pinyin: 'tuì fù',
    en: 'Retreat & return',
    detail: 'Glide down to the next lower scale degree, then smoothly return.',
    token: '退复',
    isModifier: true,
    radicalJianzi: { actions: ['tuifu'] }
  },
  {
    id: 'qiaqi',
    zh: '掐起',
    pinyin: 'qiā qǐ',
    en: 'Left-hand pull-off',
    detail: 'Pluck the stopped string with the left thumb nail to sound the lower finger.',
    token: '掐起',
    isModifier: true,
    radicalJianzi: { actions: ['qiaqi'] }
  },
  {
    id: 'daiqi',
    zh: '带起',
    pinyin: 'dài qǐ',
    en: 'Pull-off open',
    detail: 'Flick off the stopped string with the left finger to sound the open string.',
    token: '带起',
    isModifier: true,
    radicalJianzi: { actions: ['daiqi'] }
  },
  {
    id: 'yan',
    zh: '罨',
    pinyin: 'yǎn',
    en: 'Hammer-on',
    detail: 'Strike the string firmly with the left thumb without right-hand plucking.',
    token: '罨',
    isModifier: true,
    radicalJianzi: { actions: ['yan'] }
  },
  {
    id: 'fanqi',
    zh: '泛起',
    pinyin: 'fàn qǐ',
    en: 'Harmonics begin',
    detail: 'Marks the start of a harmonic passage (all notes sound as 泛音 until 泛止).',
    token: '泛起',
    isModifier: true,
    radicalJianzi: { actions: ['fanqi'] }
  },
  {
    id: 'fanzhi',
    zh: '泛止',
    pinyin: 'fàn zhǐ',
    en: 'Harmonics end',
    detail: 'Marks the closing note of a harmonic passage.',
    token: '泛止',
    isModifier: true,
    radicalJianzi: { actions: ['fanzhi'] }
  }
];

const ZHENGDIAO_STRINGS = [
  { num: 1, zh: '一弦', jianpu: '5,', pitch: 'C3', name: '宫 / 散一', token: '散勾一' },
  { num: 2, zh: '二弦', jianpu: '6,', pitch: 'D3', name: '商 / 散二', token: '散勾二' },
  { num: 3, zh: '三弦', jianpu: '1', pitch: 'F3', name: '角 / 散三', token: '散勾三' },
  { num: 4, zh: '四弦', jianpu: '2', pitch: 'G3', name: '徵 / 散四', token: '散挑四' },
  { num: 5, zh: '五弦', jianpu: '3', pitch: 'A3', name: '羽 / 散五', token: '散抹五' },
  { num: 6, zh: '六弦', jianpu: '5', pitch: 'C4', name: '文 / 散六', token: '散挑六' },
  { num: 7, zh: '七弦', jianpu: '6', pitch: 'D4', name: '武 / 散七', token: '散挑七' }
];

const HUI_CHART = [
  { hui: '1', zh: '一', ratio: '1/8', harm: '+3 oct', note: 'Mirror of 13th hui' },
  { hui: '2', zh: '二', ratio: '1/6', harm: '+2 oct + 5th', note: 'Mirror of 12th hui' },
  { hui: '3', zh: '三', ratio: '1/5', harm: '+2 oct + maj3', note: 'Mirror of 11th hui' },
  { hui: '4', zh: '四', ratio: '1/4', harm: '+2 oct', note: 'Mirror of 10th hui' },
  { hui: '5', zh: '五', ratio: '1/3', harm: '+1 oct + 5th', note: 'Mirror of 9th hui' },
  { hui: '6', zh: '六', ratio: '2/5', harm: '+2 oct + maj3', note: 'Mirror of 8th hui' },
  { hui: '7', zh: '七', ratio: '1/2', harm: '+1 oct', note: 'Exact midpoint of string' },
  { hui: '8', zh: '八', ratio: '3/5', harm: '+2 oct + maj3', note: 'Common middle-high stop' },
  { hui: '9', zh: '九', ratio: '2/3', harm: '+1 oct + 5th', note: 'Perfect 5th above open' },
  { hui: '10', zh: '十', ratio: '3/4', harm: '+2 oct', note: 'Perfect 4th above open' },
  { hui: '11', zh: '十一', ratio: '4/5', harm: '+2 oct + maj3', note: 'Major 3rd above open' },
  { hui: '12', zh: '十二', ratio: '5/6', harm: '+2 oct + 5th', note: 'Minor 3rd above open' },
  { hui: '13', zh: '十三', ratio: '7/8', harm: '+3 oct', note: 'Major 2nd above open' },
  { hui: '外', zh: '徽外', ratio: '> 7/8', harm: '—', note: 'Past 13th hui toward bridge' }
];

export function GuqinJianziReferenceModal({
  isOpen,
  onClose,
  isDark,
  onInsertToken
}: GuqinJianziReferenceModalProps) {
  const [activeTab, setActiveTab] = useState<RefTab>('anatomy');
  const [query, setQuery] = useState('');
  const [justInserted, setJustInserted] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const trimmedQuery = query.trim().toLowerCase();

  const allEntries = useMemo(
    () => [
      ...RIGHT_BASIC_STROKES,
      ...RIGHT_COMPOUND_STROKES,
      ...LEFT_FINGERS_AND_TIMBRES,
      ...LEFT_ACTIONS
    ],
    []
  );

  const searchResults = useMemo(() => {
    if (!trimmedQuery) return [];
    return allEntries.filter(item => {
      const hay = `${item.zh} ${item.pinyin} ${item.en} ${item.detail} ${item.token} ${item.exampleLabel || ''}`.toLowerCase();
      return hay.includes(trimmedQuery);
    });
  }, [allEntries, trimmedQuery]);

  if (!isOpen) return null;

  const handleInsert = (token: string, isModifier: boolean) => {
    onInsertToken(token, isModifier);
    setJustInserted(token);
    window.setTimeout(() => {
      setJustInserted(prev => (prev === token ? null : prev));
    }, 1500);
  };

  const paperCardClass = isDark
    ? 'bg-[#1D2026] border-white/[0.08] hover:border-[#E05A2B]/50 text-neutral-100'
    : 'bg-[#FBF8F1] border-[#8C6D46]/20 hover:border-[#C23E1E]/50 text-[#1B1814]';

  const subtleTextClass = isDark ? 'text-neutral-400' : 'text-neutral-600';
  const inkClass = isDark ? 'text-neutral-100' : 'text-[#1A1612]';

  const renderGlyphCard = (item: GlyphRefEntry) => {
    const isInserted = justInserted === item.token;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleInsert(item.token, item.isModifier)}
        className={cn(
          'group text-left rounded-xl border p-3.5 transition-colors cursor-pointer flex items-start gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E05A2B]',
          paperCardClass
        )}
        title={`Click to insert {${item.token}} into editor`}
      >
        {/* Authentic JianZiPu.ttf Glyph Specimen */}
        <div
          className={cn(
            'shrink-0 flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 min-w-[64px] min-h-[64px]',
            isDark ? 'bg-[#14161B]' : 'bg-[#F4EEE1]'
          )}
        >
          <GuqinJianziGlyph
            jianzi={item.radicalJianzi}
            size="md"
            orientation="horizontal"
            inkClass={inkClass}
          />
          {item.exampleJianzi && (
            <>
              <span className="text-[10px] opacity-35 select-none">→</span>
              <GuqinJianziGlyph
                jianzi={item.exampleJianzi}
                size="md"
                orientation="horizontal"
                inkClass={inkClass}
              />
            </>
          )}
        </div>

        {/* Scholarly Label + Meaning + Syntax */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <span
                className="text-base font-bold leading-snug"
                style={{ fontFamily: '"Noto Serif SC", "Songti SC", serif' }}
              >
                {item.zh}
              </span>
              <span className={cn('text-xs', subtleTextClass)}>
                {item.pinyin} · {item.en}
              </span>
            </div>
            <span
              className={cn(
                'shrink-0 text-[11px] font-mono transition-colors',
                isInserted
                  ? 'text-emerald-500 font-semibold'
                  : 'text-[#E05A2B] opacity-80 group-hover:opacity-100'
              )}
            >
              {isInserted ? (
                <span className="inline-flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Added
                </span>
              ) : (
                `{${item.token}}`
              )}
            </span>
          </div>
          <p className={cn('mt-1 text-xs leading-relaxed', subtleTextClass)}>
            {item.detail}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Guqin Jianzipu Reference"
    >
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'w-full max-w-4xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden',
          isDark
            ? 'bg-[#15171C] border-white/[0.1] text-neutral-100'
            : 'bg-[#FAF7F0] border-[#8C6D46]/25 text-[#1A1612]'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0',
            isDark ? 'border-white/[0.08] bg-[#181B21]' : 'border-[#8C6D46]/15 bg-[#F5EFE2]'
          )}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-[#E05A2B] shrink-0" />
            <div>
              <div className="flex items-baseline gap-2.5">
                <h2
                  className="text-base sm:text-lg font-bold tracking-wide"
                  style={{ fontFamily: '"Noto Serif SC", "Songti SC", serif' }}
                >
                  古琴减字谱图典
                </h2>
                <span className={cn('text-xs font-medium', subtleTextClass)}>
                  Guqin Jianzipu Reference
                </span>
              </div>
              <p className={cn('text-xs mt-0.5', subtleTextClass)}>
                Click any glyph card to insert its notation token directly into your score.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className="relative">
              <Search className={cn('w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none', subtleTextClass)} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filter glyph, pinyin, stroke..."
                className={cn(
                  'h-8 w-44 sm:w-56 pl-8 pr-7 rounded-lg border text-xs outline-none focus:border-[#E05A2B]',
                  isDark
                    ? 'bg-white/[0.04] border-white/10 text-neutral-100 placeholder:text-neutral-500'
                    : 'bg-white border-[#8C6D46]/25 text-neutral-900 placeholder:text-neutral-400'
                )}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
                  aria-label="Clear filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn(
                'p-1.5 rounded-lg transition-colors cursor-pointer',
                isDark ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-black/5 text-neutral-600 hover:text-black'
              )}
              aria-label="Close reference"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Category Tabs */}
        {!trimmedQuery && (
          <div
            className={cn(
              'px-5 pt-3 pb-2.5 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0',
              isDark ? 'border-white/[0.06] bg-[#15171C]' : 'border-[#8C6D46]/12 bg-[#FAF7F0]'
            )}
          >
            {(
              [
                { id: 'anatomy', label: 'Anatomy & Reading 结构图解' },
                { id: 'right', label: 'Right Hand 右手指法' },
                { id: 'left', label: 'Left Hand 左手与润色' },
                { id: 'strings', label: 'Strings & Hui 弦位与徽位' }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                  activeTab === tab.id
                    ? 'bg-[#E05A2B] text-white'
                    : isDark
                      ? 'text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.05]'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.05]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 custom-scrollbar">
          {trimmedQuery ? (
            <div className="space-y-3">
              <div className={cn('text-xs font-medium', subtleTextClass)}>
                {searchResults.length} matching {searchResults.length === 1 ? 'glyph' : 'glyphs'} for “{query}”
              </div>
              {searchResults.length === 0 ? (
                <div className={cn('py-10 text-center text-sm', subtleTextClass)}>
                  No Jianzipu components matched that query. Try searching by stroke name (e.g. 勾, tiao, 泛, vibrato, cuo).
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchResults.map(renderGlyphCard)}
                </div>
              )}
            </div>
          ) : activeTab === 'anatomy' ? (
            <>
              {/* How a Jianzi Character Is Assembled */}
              <div
                className={cn(
                  'rounded-xl border p-4 sm:p-5',
                  isDark ? 'bg-[#1B1E24] border-white/[0.08]' : 'bg-[#F5EFE2]/70 border-[#8C6D46]/20'
                )}
              >
                <h3 className="text-sm font-bold mb-1.5">
                  How to Read a Composite Jianzipu Glyph (减字结构)
                </h3>
                <p className={cn('text-xs leading-relaxed mb-4', subtleTextClass)}>
                  Each square character is a compact choreography diagram read from top to bottom rather than a standard Chinese word. Components are traditional abbreviated radicals—for instance, harmonics use a distinct top canopy rather than the modern character 泛.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className={cn('rounded-lg p-3 border', isDark ? 'bg-[#14161B] border-white/[0.06]' : 'bg-white/80 border-[#8C6D46]/15')}>
                    <div className="font-semibold text-[#E05A2B] mb-1">1. Upper Zone · Left Hand</div>
                    <p className={cn('leading-relaxed', subtleTextClass)}>
                      Left-hand stopping finger (大 / 食 / 中 / 名 / 跪) on the left paired with the hui stud numeral (一–十三, fractional 七六, or 徽外) on the right—or 散 for an open string, or the harmonic canopy above for 泛音.
                    </p>
                  </div>
                  <div className={cn('rounded-lg p-3 border', isDark ? 'bg-[#14161B] border-white/[0.06]' : 'bg-white/80 border-[#8C6D46]/15')}>
                    <div className="font-semibold text-[#E05A2B] mb-1">2. Lower Zone · Right Hand</div>
                    <p className={cn('leading-relaxed', subtleTextClass)}>
                      Right-hand plucking radical (勾, 挑, 抹, 剔, 打, 摘, 劈, 托, 撮) enclosing or sitting above the string numeral (一 through 七).
                    </p>
                  </div>
                  <div className={cn('rounded-lg p-3 border', isDark ? 'bg-[#14161B] border-white/[0.06]' : 'bg-white/80 border-[#8C6D46]/15')}>
                    <div className="font-semibold text-[#E05A2B] mb-1">3. Flank &amp; Trailing · Expression</div>
                    <p className={cn('leading-relaxed', subtleTextClass)}>
                      Approach slides 绰 (from below) and 注 (from above) integrate along the left flank; post-attack ornaments (吟, 猱, 上七六, 下九, 撞, 泛止) follow immediately after.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Live Annotated Specimens */}
              <div>
                <h3 className="text-sm font-bold mb-3">Annotated Examples · Click to Insert</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {ANATOMY_EXAMPLES.map(ex => {
                    const isInserted = justInserted === ex.token;
                    return (
                      <button
                        key={ex.token}
                        type="button"
                        onClick={() => handleInsert(ex.token, false)}
                        className={cn(
                          'group text-left rounded-xl border p-4 transition-colors cursor-pointer flex items-center gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E05A2B]',
                          paperCardClass
                        )}
                      >
                        <div
                          className={cn(
                            'shrink-0 w-[84px] h-[84px] rounded-xl flex items-center justify-center',
                            isDark ? 'bg-[#14161B]' : 'bg-[#F3ECE0]'
                          )}
                        >
                          <GuqinJianziGlyph
                            jianzi={ex.jianzi}
                            size="lg"
                            orientation="horizontal"
                            inkClass={inkClass}
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-bold">{ex.title}</span>
                            <span className={cn('text-[11px] font-mono', isInserted ? 'text-emerald-500 font-semibold' : 'text-[#E05A2B]')}>
                              {isInserted ? 'Added' : `{${ex.token}}`}
                            </span>
                          </div>
                          <ul className={cn('space-y-0.5 text-xs leading-snug', subtleTextClass)}>
                            {ex.readingOrder.map((line, i) => (
                              <li key={i}>{line}</li>
                            ))}
                          </ul>
                          <div className={cn('text-[11px] font-mono pt-0.5 opacity-80', subtleTextClass)}>
                            {ex.pitchNote}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : activeTab === 'right' ? (
            <>
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-sm font-bold">Eight Fundamental Right-Hand Strokes (右手八法)</h3>
                  <span className={cn('text-xs', subtleTextClass)}>Radical → Example on string</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {RIGHT_BASIC_STROKES.map(renderGlyphCard)}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-3">Pinches, Sweeps &amp; Compound Techniques (复合指法)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {RIGHT_COMPOUND_STROKES.map(renderGlyphCard)}
                </div>
              </div>
            </>
          ) : activeTab === 'left' ? (
            <>
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-sm font-bold">Timbres &amp; Left-Hand Fingers (三音与左手指法)</h3>
                  <span className={cn('text-xs', subtleTextClass)}>Radical → Composite example</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {LEFT_FINGERS_AND_TIMBRES.map(renderGlyphCard)}
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-sm font-bold">Slides, Vibrato &amp; Harmonic Boundaries (走手与润色)</h3>
                  <span className={cn('text-xs', subtleTextClass)}>Appends to the note under cursor</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {LEFT_ACTIONS.map(renderGlyphCard)}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 7-String Zhengdiao Table */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-sm font-bold">Standard 正调 (Zhengdiao) Seven-String Tuning · 1=F (5–6–1–2–3–5–6)</h3>
                  <span className={cn('text-xs', subtleTextClass)}>Click any string to insert open pluck</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {ZHENGDIAO_STRINGS.map(st => {
                    const isInserted = justInserted === st.token;
                    return (
                      <button
                        key={st.num}
                        type="button"
                        onClick={() => handleInsert(st.token, false)}
                        className={cn(
                          'rounded-xl border p-3 flex flex-col items-center text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E05A2B]',
                          paperCardClass
                        )}
                      >
                        <GuqinJianziGlyph
                          jianzi={{ soundType: 'san', rightStroke: st.num <= 3 ? 'gou' : st.num === 5 ? 'mo' : 'tiao', stringNum: st.num }}
                          size="md"
                          orientation="horizontal"
                          inkClass={inkClass}
                        />
                        <div className="mt-1.5 text-xs font-bold">{st.zh}</div>
                        <div className="text-xs font-mono text-[#E05A2B] font-semibold">
                          {st.jianpu} · {st.pitch}
                        </div>
                        <div className={cn('text-[11px] mt-0.5', subtleTextClass)}>
                          {isInserted ? 'Added' : st.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 13-Hui Acoustic Node Table */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-sm font-bold">Thirteen Hui Positions (十三徽位) &amp; Fractional Notation</h3>
                  <span className={cn('text-xs', subtleTextClass)}>
                    Fractions: 七六 = 7.6 · 七半 = 7.5 · 徽外 = past 13
                  </span>
                </div>
                <div
                  className={cn(
                    'rounded-xl border overflow-hidden',
                    isDark ? 'border-white/[0.08] bg-[#1B1E24]' : 'border-[#8C6D46]/20 bg-white'
                  )}
                >
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className={cn('border-b', isDark ? 'border-white/[0.08] bg-white/[0.03] text-neutral-400' : 'border-[#8C6D46]/15 bg-[#F5EFE2] text-neutral-600')}>
                        <th className="py-2 px-3 font-semibold">Hui 徽</th>
                        <th className="py-2 px-3 font-semibold">Glyph Sample</th>
                        <th className="py-2 px-3 font-semibold">String Ratio</th>
                        <th className="py-2 px-3 font-semibold">Harmonic 泛音</th>
                        <th className="py-2 px-3 font-semibold">Acoustic Note</th>
                      </tr>
                    </thead>
                    <tbody className={cn('divide-y', isDark ? 'divide-white/[0.05]' : 'divide-[#8C6D46]/10')}>
                      {HUI_CHART.map(row => (
                        <tr
                          key={row.hui}
                          className={cn(
                            'transition-colors',
                            row.hui === '7' && (isDark ? 'bg-[#E05A2B]/10' : 'bg-[#E05A2B]/[0.06]')
                          )}
                        >
                          <td className="py-1.5 px-3 font-semibold whitespace-nowrap">
                            {row.zh} <span className={cn('font-mono font-normal', subtleTextClass)}>({row.hui})</span>
                          </td>
                          <td className="py-1 px-3">
                            <GuqinJianziGlyph
                              jianzi={
                                row.hui === '外'
                                  ? { soundType: 'an', leftFinger: 'ming', hui: '外', rightStroke: 'gou', stringNum: 1 }
                                  : { soundType: 'an', leftFinger: 'ming', hui: row.hui, rightStroke: 'gou', stringNum: 6 }
                              }
                              size="sm"
                              orientation="horizontal"
                              inkClass={inkClass}
                            />
                          </td>
                          <td className="py-1.5 px-3 font-mono tabular-nums">{row.ratio}</td>
                          <td className="py-1.5 px-3 font-mono">{row.harm}</td>
                          <td className={cn('py-1.5 px-3', subtleTextClass)}>{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quiet Scholarly Footer with Font Credit & External Reference */}
        <div
          className={cn(
            'px-5 py-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs shrink-0',
            isDark ? 'border-white/[0.08] bg-[#181B21] text-neutral-400' : 'border-[#8C6D46]/15 bg-[#F5EFE2] text-neutral-600'
          )}
        >
          <span>
            Typeset in JianZiPu OpenType font (SIL Open Font License 1.1 · TW-Kai calligraphy)
          </span>
          <a
            href="https://jianzipufont.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#E05A2B] hover:underline font-medium"
          >
            jianzipufont.com Interactive Glossary
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
