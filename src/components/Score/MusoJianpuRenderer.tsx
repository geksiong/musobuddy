/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BarlineType,
  BeatGroup,
  BowingType,
  ChordPitch,
  GraceNote,
  GuqinDisplayMode,
  HairpinType,
  InstrumentType,
  MusicLineNode,
  NavMarkerType,
  OrnamentType,
  PluckTechniqueType,
  MusoJianpuDocument,
  MusoJianpuMeasure,
  MusoJianpuNote,
  ShakuhachiDisplayMode,
  ShakuhachiNoteData,
  ShakuhachiSchool
} from '../../lib/musojianpu/types.ts';
import { CHINESE_FINGERS, formatJianpuKeyLabel, getErhuKeyInfo } from '../../lib/musojianpu/erhuKeys.ts';
import {
  computeShakuhachiMidi,
  getShakuhachiLengthInfo,
  inferShakuhachiFromMidi,
  midiToJianpuPitch
} from '../../lib/musojianpu/shakuhachi.ts';
import { GuqinJianziGlyph } from './GuqinJianziGlyph.tsx';
import {
  SHAKUHACHI_SERIF_FONT,
  ShakuhachiDualGlyph,
  ShakuhachiVerticalView
} from './ShakuhachiGlyph.tsx';
import { cn } from '../../lib/utils.ts';

export interface MusoJianpuRendererProps {
  document: MusoJianpuDocument;
  zoom?: number;
  paperTheme?: 'paper' | 'adaptive';
  resolvedTheme: string;
  fingeringStyle?: 'chinese' | 'arabic';
  guqinDisplayMode?: GuqinDisplayMode;
  shakuhachiDisplayMode?: ShakuhachiDisplayMode;
  shakuhachiSchool?: ShakuhachiSchool;
  showMarkings?: boolean;
  showLyrics?: boolean;
  highlightMarkings?: boolean;
  activeNoteId?: string | null;
  selectedOffset?: number | null;
  onNoteClick?: (note: MusoJianpuNote) => void;
}

/**
 * Vector Erhu Bowing Symbol (Chinese Jianpu geometry)
 */
function BowingGlyph({ type, className }: { type: BowingType; className?: string }) {
  switch (type) {
    case 'pull': // 拉弓 (Down-bow: square arch Π)
      return (
        <svg viewBox="0 0 14 12" className={cn('w-3.5 h-3 inline-block', className)} aria-label="拉弓 Pull Bow">
          <path d="M2.5 10.5V2.5H11.5V10.5" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="square" />
          <path d="M2.5 2.5H11.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
        </svg>
      );
    case 'push': // 推弓 (Up-bow: V wedge)
      return (
        <svg viewBox="0 0 14 12" className={cn('w-3.5 h-3 inline-block', className)} aria-label="推弓 Push Bow">
          <path d="M2.5 2L7 10.2L11.5 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'trem': // 颤弓 (Tremolo slashes ///)
      return (
        <svg viewBox="0 0 16 12" className={cn('w-4 h-3 inline-block', className)} aria-label="颤弓 Tremolo">
          <path d="M3 10L7 2M7 10L11 2M11 10L15 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'stacc': // 顿弓 (Martelé inverted triangle ▼)
      return (
        <svg viewBox="0 0 12 10" className={cn('w-2.5 h-2.5 inline-block', className)} aria-label="顿弓 Staccato">
          <path d="M2 2H10L6 8.5Z" fill="currentColor" />
        </svg>
      );
    case 'spicc': // 跳弓 (Spiccato dot ·)
      return (
        <svg viewBox="0 0 10 10" className={cn('w-2.5 h-2.5 inline-block', className)} aria-label="跳弓 Spiccato">
          <circle cx="5" cy="5" r="2.2" fill="currentColor" />
        </svg>
      );
    case 'retake': // 换弓 / 提弓 (Breath comma)
      return (
        <span className={cn('text-xs font-serif font-bold leading-none', className)} title="换弓 / 换气">
          ’
        </span>
      );
    case 'pizz': // 拨弦 (+)
      return (
        <span className={cn('text-[11px] font-bold leading-none', className)} title="拨弦 Pizzicato">
          +
        </span>
      );
  }
}

/**
 * Vector Erhu Ornament Symbol (Slides, Vibrato, Harmonics, Fermata, Trill)
 */
function OrnamentGlyph({ type, instrument, className }: { type: OrnamentType; instrument?: InstrumentType; className?: string }) {
  switch (type) {
    case 'su': // 上滑音
      return (
        <svg viewBox="0 0 14 12" className={cn('w-3.5 h-3 inline-block', className)} aria-label="上滑音 Upward Slide">
          <path d="M2 10Q7.5 8.5 11.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
          <path d="M8.5 2.5H11.8V5.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'sd': // 下滑音
      return (
        <svg viewBox="0 0 14 12" className={cn('w-3.5 h-3 inline-block', className)} aria-label="下滑音 Downward Slide">
          <path d="M2 2.5Q7.5 3.5 11.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
          <path d="M8.5 9.5H11.8V6.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'sr': // 回滑音
      return (
        <svg viewBox="0 0 16 10" className={cn('w-4 h-2.5 inline-block', className)} aria-label="回滑音 Return Slide">
          <path d="M2 7.5Q8 1 14 7.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'vib': // 揉弦
      return (
        <svg viewBox="0 0 18 8" className={cn('w-4 h-2 inline-block', className)} aria-label="揉弦 Vibrato">
          <path d="M1 4.5Q3 1 5 4.5T9 4.5T13 4.5T17 4.5" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        </svg>
      );
    case 'pvib': // 压揉
      return (
        <span className={cn('text-[9px] font-semibold leading-none', className)} title="压揉">
          压
        </span>
      );
    case 'tr':
      return (
        <span className={cn('text-[10px] font-serif italic font-bold leading-none', className)} title="颤音 Trill">
          tr
        </span>
      );
    case 'da': {
      const isWind = instrument === 'dizi' || instrument === 'xiao';
      return (
        <span className={cn('text-[9.5px] font-bold leading-none', className)} title={isWind ? '打音 (丁)' : '打音'}>
          {isWind ? '丁' : '打'}
        </span>
      );
    }
    case 'fermata':
      return (
        <svg viewBox="0 0 18 11" className={cn('w-4 h-2.5 inline-block', className)} aria-label="延长记号 Fermata">
          <path d="M2 9A7 7 0 0 1 16 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="7.5" r="1.4" fill="currentColor" />
        </svg>
      );
    case 'accent':
      return (
        <svg viewBox="0 0 14 10" className={cn('w-3 h-2.5 inline-block', className)} aria-label="重音 Accent">
          <path d="M2 2L11.5 5L2 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'harm':
      return (
        <svg viewBox="0 0 10 10" className={cn('w-2.5 h-2.5 inline-block', className)} aria-label="自然泛音 Natural Harmonic">
          <circle cx="5" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.35" />
        </svg>
      );
    case 'aharm':
      return (
        <svg viewBox="0 0 10 10" className={cn('w-2.5 h-2.5 inline-block', className)} aria-label="人工泛音 Artificial Harmonic">
          <polygon points="5,1.2 8.8,5 5,8.8 1.2,5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    case 'shiftUp':
      return (
        <span className={cn('text-[10px] font-bold leading-none', className)} title="上换把">
          ↑
        </span>
      );
    case 'shiftDown':
      return (
        <span className={cn('text-[10px] font-bold leading-none', className)} title="下换把">
          ↓
        </span>
      );
  }
}

/**
 * Left-of-chord vertical wavy Arpeggio Glyph (琶音)
 */
function ArpeggioGlyph({ tall, className }: { tall?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 8 36"
      className={cn(tall ? 'w-[7px] h-[38px]' : 'w-[6px] h-[22px]', 'inline-block shrink-0', className)}
      aria-label="琶音 Arpeggio"
    >
      <path
        d="M4 2Q1.2 5 4 8T4 14T4 20T4 26T4 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
      <path
        d="M1.8 4.8L4 1.6L6.2 4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Vector & Conservatory Notation Glyphs for Pipa (琵琶) and Guzheng (古筝) Techniques
 */
function PluckTechniqueGlyph({ type, className }: { type: PluckTechniqueType; className?: string }) {
  switch (type) {
    // Pipa right-hand & left-hand
    case 'tan': // 弹 (inward index pluck — classic downward-left stroke)
      return (
        <svg viewBox="0 0 12 12" className={cn('w-3 h-3 inline-block', className)} aria-label="弹 Tan (Pipa inward pluck)">
          <path d="M9.5 2L3 10" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
          <path d="M6.2 9.5L2.8 10.2L3.6 6.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'tiao': // 挑 (outward index pluck — classic upward-right stroke)
      return (
        <svg viewBox="0 0 12 12" className={cn('w-3 h-3 inline-block', className)} aria-label="挑 Tiao (Outward index pluck)">
          <path d="M2.5 10L9.2 2.2" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
          <path d="M5.8 2.4L9.4 2L8.8 5.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'gun': // 滚 (rapid tan-tiao alternation)
      return (
        <svg viewBox="0 0 14 12" className={cn('w-3.5 h-3 inline-block', className)} aria-label="滚 Gun (Rapid alternation)">
          <path d="M3 2.5L11 9.5M11 2.5L3 9.5" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
          <circle cx="7" cy="2" r="1" fill="currentColor" />
          <circle cx="7" cy="10" r="1" fill="currentColor" />
        </svg>
      );
    case 'lun': // 轮指
      return (
        <span className={cn('text-[10px] font-bold leading-none', className)} title="轮指 Five-finger roll">
          轮
        </span>
      );
    case 'banlun': // 半轮
      return (
        <span className={cn('text-[9.5px] font-bold leading-none', className)} title="半轮 Half roll">
          半轮
        </span>
      );
    case 'sao': // 扫 (bold downward strum)
      return (
        <span className={cn('inline-flex items-center gap-[1px] text-[9.5px] font-bold leading-none', className)} title="扫 Downward strum">
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 inline-block">
            <path d="M10 2L2.5 9.5M6.5 9.5H2.5V5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>扫</span>
        </span>
      );
    case 'fu': // 拂 (bold upward strum)
      return (
        <span className={cn('inline-flex items-center gap-[1px] text-[9.5px] font-bold leading-none', className)} title="拂 Upward strum">
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 inline-block">
            <path d="M2 10L9.5 2.5M5.5 2.5H9.5V6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>拂</span>
        </span>
      );
    case 'fen':
      return <span className={cn('text-[9.5px] font-bold leading-none', className)} title="分 Outward split chord">分</span>;
    case 'zhi':
      return <span className={cn('text-[9.5px] font-bold leading-none', className)} title="摭 Inward pinch chord">摭</span>;
    case 'jiao': // 绞弦 ⊗
      return (
        <svg viewBox="0 0 12 12" className={cn('w-3 h-3 inline-block', className)} aria-label="绞弦 Twisted string">
          <circle cx="6" cy="6" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.35" />
          <path d="M3.3 3.3L8.7 8.7M8.7 3.3L3.3 8.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case 'sha': // 煞音 ×
      return (
        <svg viewBox="0 0 10 10" className={cn('w-2.5 h-2.5 inline-block', className)} aria-label="煞音 Muted percussive click">
          <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
        </svg>
      );
    case 'dai':
      return <span className={cn('text-[9.5px] font-semibold leading-none', className)} title="带起 Pull-off">带</span>;
    case 'tuixian':
      return <span className={cn('text-[9.5px] font-semibold leading-none', className)} title="推弦 Push string">推</span>;
    case 'laxian':
      return <span className={cn('text-[9.5px] font-semibold leading-none', className)} title="拉弦 Pull string">拉</span>;

    // Guzheng right-hand & left-hand
    case 'tuo': // 托 ∟ (thumb outward)
      return (
        <svg viewBox="0 0 12 12" className={cn('w-3 h-3 inline-block', className)} aria-label="托 Tuo (Thumb outward)">
          <path d="M3.5 2V9.5H9.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'pi': // 劈 ┐ (thumb inward)
      return (
        <svg viewBox="0 0 12 12" className={cn('w-3 h-3 inline-block', className)} aria-label="劈 Pi (Thumb inward)">
          <path d="M2.5 2.5H8.5V10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'mo': // 抹 ╲ (index inward)
      return (
        <svg viewBox="0 0 12 12" className={cn('w-3 h-3 inline-block', className)} aria-label="抹 Mo (Index inward)">
          <path d="M3 2.2L9 9.8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case 'gou': // 勾 (middle inward hook)
      return (
        <svg viewBox="0 0 14 12" className={cn('w-3.5 h-3 inline-block', className)} aria-label="勾 Gou (Middle inward)">
          <path d="M2.5 8.5C2.5 4.2 5.2 2.4 8.2 2.4C10.4 2.4 11.4 4.2 11.2 8.2L9.5 6.8" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'ti':
      return <span className={cn('text-[9.5px] font-semibold leading-none', className)} title="剔 Middle outward">剔</span>;
    case 'cuo': // 大撮 (stacked 勾 over 托)
      return (
        <svg viewBox="0 0 14 16" className={cn('w-3.5 h-4 inline-block', className)} aria-label="大撮 Da Cuo (Octave pinch)">
          <path d="M3 6.5C3 3.2 5.4 1.8 8 1.8C10 1.8 11 3.3 10.8 6.4" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
          <path d="M4.2 8.2V14H10" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'xiaocuo': // 小撮 (stacked 抹 over 托)
      return (
        <svg viewBox="0 0 14 16" className={cn('w-3.5 h-4 inline-block', className)} aria-label="小撮 Xiao Cuo (Small pinch)">
          <path d="M4.2 1.8L9.6 6.4" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
          <path d="M4.2 8.2V14H10" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'yao': // 摇指 彡
      return (
        <svg viewBox="0 0 14 12" className={cn('w-3.5 h-3 inline-block', className)} aria-label="摇指 Yaozhi (Thumb tremolo)">
          <path d="M2.5 9.5L5.5 2.5M6 9.5L9 2.5M9.5 9.5L12.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
        </svg>
      );
    case 'gua': // 刮奏 (upward wavy glissando arrow)
      return (
        <svg viewBox="0 0 16 14" className={cn('w-4 h-3.5 inline-block', className)} aria-label="刮奏 Upward glissando">
          <path d="M2 12Q4.5 9.5 6 10Q7.5 10.5 9 7.5Q10.5 4.5 13.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
          <path d="M10.2 2.2H13.8V5.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'guadown': // 下行刮奏 (downward wavy glissando arrow)
      return (
        <svg viewBox="0 0 16 14" className={cn('w-4 h-3.5 inline-block', className)} aria-label="下行刮奏 Downward glissando">
          <path d="M2 2.5Q4.5 5 6 4.5Q7.5 4 9 7Q10.5 10 13.5 12" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
          <path d="M10.2 12.2H13.8V8.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'huazhi':
      return <span className={cn('text-[9.5px] font-bold leading-none', className)} title="花指 Ornamental flourish">花</span>;
    case 'arp':
      return <ArpeggioGlyph className={className} />;
    case 'an':
      return <span className={cn('text-[9.5px] font-semibold leading-none', className)} title="按音 Left-hand pitch press">按</span>;
    case 'dian':
      return <span className={cn('text-[9.5px] font-semibold leading-none', className)} title="点音 Quick press-release">点</span>;

    // Dizi (笛子) & Xiao (箫) breath, tonguing & finger ornaments
    case 'breath': // 换气 (V breath mark)
      return (
        <svg viewBox="0 0 12 10" className={cn('w-3 h-2.5 inline-block', className)} aria-label="换气 Breath mark">
          <path d="M2 1.8L6 8.5L10 1.8" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'circ': // 循环换气
      return <span className={cn('text-[9px] font-bold leading-none', className)} title="循环换气 Circular breathing">↻循</span>;
    case 'tu': // 单吐 T
      return <span className={cn('text-[10px] font-bold font-mono leading-none', className)} title="单吐 Single tonguing">T</span>;
    case 'ktu': // K
      return <span className={cn('text-[10px] font-bold font-mono leading-none', className)} title="吐音 Back-tongue K">K</span>;
    case 'dtu': // 双吐 TK
      return <span className={cn('text-[9.5px] font-bold font-mono leading-none tracking-tight', className)} title="双吐 Double tonguing">TK</span>;
    case 'ttu': // 三吐 TTK
      return <span className={cn('text-[9px] font-bold font-mono leading-none tracking-tight', className)} title="三吐 Triple tonguing">TTK</span>;
    case 'huashe': // 花舌 ※
      return (
        <svg viewBox="0 0 12 12" className={cn('w-3 h-3 inline-block', className)} aria-label="花舌 Flutter-tongue">
          <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="6" cy="2" r="1.05" fill="currentColor" />
          <circle cx="6" cy="10" r="1.05" fill="currentColor" />
          <circle cx="2" cy="6" r="1.05" fill="currentColor" />
          <circle cx="10" cy="6" r="1.05" fill="currentColor" />
        </svg>
      );
    case 'qizhen': // 气震音 (breath vibrato wave)
      return (
        <span className={cn('inline-flex items-center gap-[1px] text-[8.5px] font-semibold leading-none', className)} title="气震音 Breath vibrato">
          <span>气</span>
          <svg viewBox="0 0 14 7" className="w-3 h-1.5 inline-block">
            <path d="M1 3.8Q2.8 1 4.6 3.8T8.2 3.8T11.8 3.8" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          </svg>
        </span>
      );
    case 'die': // 叠音 又
      return <span className={cn('text-[9.5px] font-bold leading-none', className)} title="叠音 Upper-neighbor appoggiatura">又</span>;
    case 'zeng': // 赠音
      return <span className={cn('text-[9px] font-semibold leading-none', className)} title="赠音 Trailing grace ornament">赠</span>;
    case 'li': // 历音 (upward rapid scale sweep)
      return (
        <svg viewBox="0 0 15 13" className={cn('w-3.5 h-3 inline-block', className)} aria-label="历音 Upward rapid scale sweep">
          <path d="M2 11L12.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2.2 1.6" />
          <path d="M9 2.2H13V6.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'lidown': // 下历音 (downward rapid scale sweep)
      return (
        <svg viewBox="0 0 15 13" className={cn('w-3.5 h-3 inline-block', className)} aria-label="下历音 Downward rapid scale sweep">
          <path d="M2 2.5L12.5 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2.2 1.6" />
          <path d="M9 11.2H13V7.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'duo': // 剁音
      return <span className={cn('text-[9.5px] font-bold leading-none', className)} title="剁音 Percussive finger chop">剁</span>;
    case 'feizhi': // 飞指
      return <span className={cn('text-[9.5px] font-bold leading-none', className)} title="飞指 Flying-finger sweep">飞</span>;
    case 'bo': // 波音 (mordent)
      return (
        <svg viewBox="0 0 16 9" className={cn('w-4 h-2 inline-block', className)} aria-label="波音 Mordent">
          <path d="M1.5 6L4 2.5L6.5 6L9 2.5L11.5 6L14.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

/**
 * Miniature Jianpu Grace Note Cluster (前倚音 / 后倚音) with octave dots, accidentals,
 * accurate beam underlines, optional acciaccatura slash, and connecting curved slur arc.
 */
function GraceNoteCluster({
  notes,
  position,
  colorClass
}: {
  notes: GraceNote[];
  position: 'pre' | 'post';
  colorClass: string;
}) {
  if (notes.length === 0) return null;
  const maxUnderlines = Math.min(3, Math.max(1, ...notes.map(n => n.underlines)));
  const isSlashed = notes.some(n => n.slashed);

  return (
    <span
      className={cn(
        'relative inline-flex items-end select-none leading-none',
        colorClass
      )}
    >
      <span className="relative inline-flex items-end">
        {notes.map((gn, gIdx) => {
          const underlineCount = Math.min(3, Math.max(1, gn.underlines));
          return (
            <span
              key={gIdx}
              className="relative inline-flex flex-col items-center px-[0.5px]"
            >
              {/* High octave dots above miniature grace digit */}
              {gn.octave >= 1 && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-full left-1/2 -translate-x-1/2 pb-[1px] flex flex-col items-center gap-[1.5px] pointer-events-none"
                >
                  {gn.octave >= 2 && <span className="w-[2.5px] h-[2.5px] rounded-full bg-current" />}
                  <span className="w-[2.5px] h-[2.5px] rounded-full bg-current" />
                </span>
              )}

              {/* Accidental + Grace Numeral */}
              <span className="inline-flex items-baseline text-[11px] font-bold tabular-nums leading-none">
                {gn.accidental && (
                  <span className="text-[8px] font-bold -translate-y-[2px] mr-[0.5px]">
                    {gn.accidental === '#' ? '♯' : gn.accidental === 'b' ? '♭' : '♮'}
                  </span>
                )}
                <span>{gn.degree}</span>
              </span>

              {/* Grace Underlines (respecting 1, 2, or 3 beams) */}
              <span className="relative w-full flex flex-col gap-[1.5px] mt-[1.5px]">
                {Array.from({ length: maxUnderlines }).map((_, uIdx) => (
                  <span
                    key={uIdx}
                    className={cn(
                      'w-full h-[1px]',
                      uIdx < underlineCount ? 'bg-current' : 'bg-transparent'
                    )}
                    style={{
                      marginLeft: gIdx > 0 && uIdx < underlineCount ? '-0.5px' : undefined,
                      marginRight: gIdx < notes.length - 1 && uIdx < underlineCount ? '-0.5px' : undefined
                    }}
                  />
                ))}
              </span>

              {/* Low octave dots below grace underlines */}
              {gn.octave <= -1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-full left-1/2 -translate-x-1/2 pt-[1.5px] flex flex-col items-center gap-[1.5px] pointer-events-none"
                >
                  <span className="w-[2.5px] h-[2.5px] rounded-full bg-current" />
                  {gn.octave <= -2 && <span className="w-[2.5px] h-[2.5px] rounded-full bg-current" />}
                </span>
              )}
            </span>
          );
        })}

        {/* Optional diagonal acciaccatura slash (^/5) */}
        {isSlashed && (
          <svg
            viewBox="0 0 12 8"
            className="w-3 h-2 absolute -bottom-[2px] -left-[1px] pointer-events-none opacity-90"
            aria-hidden="true"
          >
            <path d="M1 7L11 1" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        )}
      </span>

      {/* Connecting Jianpu Grace Slur Arc (倚音小弧线) tucked tightly toward the main note */}
      <svg
        viewBox="0 0 10 6"
        className={cn(
          'w-[7px] h-[5px] pointer-events-none opacity-80 shrink-0',
          position === 'pre'
            ? '-ml-[2px] -mr-[2px] translate-y-[4px]'
            : '-mr-[2px] -ml-[2px] translate-y-[4px] -scale-x-100 order-first'
        )}
        aria-hidden="true"
      >
        <path d="M1 1Q4.8 5.4 9 2.4" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function BarlineGlyph({ type, inkClass }: { type: BarlineType; inkClass: string }) {
  const barH = 'h-[26px]';
  switch (type) {
    case '|':
      return <div className={cn('w-[1.5px] bg-current opacity-75 shrink-0', barH, inkClass)} />;
    case '||':
      return (
        <div className={cn('flex items-center gap-[2.5px] shrink-0', barH, inkClass)}>
          <div className="w-[1.5px] h-full bg-current opacity-85" />
          <div className="w-[1.5px] h-full bg-current opacity-85" />
        </div>
      );
    case '|]':
      return (
        <div className={cn('flex items-center gap-[2.5px] shrink-0', barH, inkClass)}>
          <div className="w-[1.5px] h-full bg-current opacity-85" />
          <div className="w-[3.5px] h-full bg-current" />
        </div>
      );
    case '|:':
      return (
        <div className={cn('flex items-center gap-[2.5px] shrink-0', barH, inkClass)}>
          <div className="w-[3px] h-full bg-current" />
          <div className="w-[1.5px] h-full bg-current opacity-85" />
          <div className="flex flex-col gap-1.5 pl-0.5">
            <span className="w-1 h-1 rounded-full bg-current" />
            <span className="w-1 h-1 rounded-full bg-current" />
          </div>
        </div>
      );
    case ':|':
      return (
        <div className={cn('flex items-center gap-[2.5px] shrink-0', barH, inkClass)}>
          <div className="flex flex-col gap-1.5 pr-0.5">
            <span className="w-1 h-1 rounded-full bg-current" />
            <span className="w-1 h-1 rounded-full bg-current" />
          </div>
          <div className="w-[1.5px] h-full bg-current opacity-85" />
          <div className="w-[3px] h-full bg-current" />
        </div>
      );
    case ':||:':
      return (
        <div className={cn('flex items-center gap-[2px] shrink-0', barH, inkClass)}>
          <div className="flex flex-col gap-1.5 pr-0.5">
            <span className="w-1 h-1 rounded-full bg-current" />
            <span className="w-1 h-1 rounded-full bg-current" />
          </div>
          <div className="w-[1.5px] h-full bg-current opacity-85" />
          <div className="w-[3px] h-full bg-current" />
          <div className="w-[1.5px] h-full bg-current opacity-85" />
          <div className="flex flex-col gap-1.5 pl-0.5">
            <span className="w-1 h-1 rounded-full bg-current" />
            <span className="w-1 h-1 rounded-full bg-current" />
          </div>
        </div>
      );
  }
}

/**
 * Vector Segno Glyph (𝄋) — crisp engraving across all font stacks
 */
function SegnoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 22" className={cn('w-3.5 h-4 inline-block shrink-0', className)} aria-label="Segno">
      {/* Stylized S-curve */}
      <path
        d="M12.8 5.2C12.8 3.3 11.1 2.2 9.1 2.2C6.9 2.2 5.4 3.5 5.4 5.4C5.4 7.7 7.8 8.9 9.7 10.2C11.9 11.7 13.4 13.1 13.4 15.6C13.4 18.1 11.4 19.8 8.7 19.8C6.4 19.8 4.8 18.5 4.8 16.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      {/* End terminals */}
      <circle cx="12.7" cy="5.2" r="1.15" fill="currentColor" />
      <circle cx="4.9" cy="16.4" r="1.15" fill="currentColor" />
      {/* Diagonal slash */}
      <path d="M3.2 19.2L14.8 2.8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      {/* Side dots */}
      <circle cx="4.2" cy="9.7" r="1.15" fill="currentColor" />
      <circle cx="13.8" cy="12.3" r="1.15" fill="currentColor" />
    </svg>
  );
}

/**
 * Vector Coda Glyph (𝄌) — oval with extended crosshairs
 */
function CodaGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" className={cn('w-3.5 h-3.5 inline-block shrink-0', className)} aria-label="Coda">
      <ellipse cx="9" cy="9" rx="4.8" ry="5.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 1.2V16.8M1.8 9H16.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Renders a musical navigation marker (Segno, Coda, To Coda, Fine, D.C., D.S., Segue, Attacca)
 */
function NavMarkerBadge({
  type,
  accentClass,
  inkClass
}: {
  type: NavMarkerType;
  accentClass: string;
  inkClass: string;
}) {
  switch (type) {
    case 'segno':
      return (
        <span className={cn('inline-flex items-center leading-none', accentClass)} title="Segno (Repeat sign)">
          <SegnoGlyph />
        </span>
      );
    case 'coda':
      return (
        <span className={cn('inline-flex items-center gap-0.5 font-serif font-bold text-[11px] leading-none', accentClass)} title="Coda">
          <CodaGlyph />
          <span>Coda</span>
        </span>
      );
    case 'toCoda':
      return (
        <span className={cn('inline-flex items-center gap-0.5 font-serif italic font-bold text-[11px] leading-none', accentClass)} title="To Coda">
          <span>To</span>
          <CodaGlyph className="w-3 h-3" />
        </span>
      );
    case 'fine':
      return (
        <span className={cn('font-serif italic font-bold text-[11px] leading-none', inkClass)} title="Fine (End)">
          Fine
        </span>
      );
    case 'dc':
      return (
        <span className={cn('font-serif italic font-bold text-[11px] leading-none', inkClass)} title="Da Capo (From the beginning)">
          D.C.
        </span>
      );
    case 'dcAlFine':
      return (
        <span className={cn('font-serif italic font-bold text-[11px] leading-none', inkClass)} title="Da Capo al Fine">
          D.C. al Fine
        </span>
      );
    case 'dcAlCoda':
      return (
        <span className={cn('inline-flex items-center gap-0.5 font-serif italic font-bold text-[11px] leading-none', inkClass)} title="Da Capo al Coda">
          <span>D.C. al</span>
          <CodaGlyph className="w-3 h-3" />
        </span>
      );
    case 'ds':
      return (
        <span className={cn('font-serif italic font-bold text-[11px] leading-none', inkClass)} title="Dal Segno (From the Segno)">
          D.S.
        </span>
      );
    case 'dsAlFine':
      return (
        <span className={cn('font-serif italic font-bold text-[11px] leading-none', inkClass)} title="Dal Segno al Fine">
          D.S. al Fine
        </span>
      );
    case 'dsAlCoda':
      return (
        <span className={cn('inline-flex items-center gap-0.5 font-serif italic font-bold text-[11px] leading-none', inkClass)} title="Dal Segno al Coda">
          <span>D.S. al</span>
          <CodaGlyph className="w-3 h-3" />
        </span>
      );
    case 'segue':
      return (
        <span className={cn('font-serif italic font-bold text-[11px] leading-none', inkClass)} title="Segue (Continue directly into next section)">
          Segue
        </span>
      );
    case 'attacca':
      return (
        <span className={cn('font-serif italic font-bold text-[11px] leading-none', inkClass)} title="Attacca (Proceed without pause)">
          Attacca
        </span>
      );
  }
}

interface SlurArc {
  key: string;
  id: number;
  tier: number;
  x1: number;
  x2: number;
  y: number;
}

interface HairpinSpan {
  key: string;
  type: HairpinType;
  x1: number;
  x2: number;
  y: number;
}

/**
 * Computes visual rhythmic weight for proportional Jianpu spacing (quarter note / dash = 1).
 */
function getNoteBeatWeight(note: MusoJianpuNote): number {
  let base = 1;
  if (note.underlines === 1) base = 0.5;
  else if (note.underlines === 2) base = 0.25;
  else if (note.underlines >= 3) base = 0.125;

  if (note.dots === 1) base *= 1.5;
  else if (note.dots >= 2) base *= 1.75;
  return base;
}

function getGroupBeatWeight(group: BeatGroup): number {
  const total = group.notes.reduce((sum, n) => sum + getNoteBeatWeight(n), 0);
  return Math.max(0.45, total);
}

function getMeasureBeatWeight(measure: MusoJianpuMeasure): number {
  const total = measure.groups.reduce((sum, g) => sum + getGroupBeatWeight(g), 0);
  return Math.max(1, total);
}

const JIANPU_SCALE_SEMITONES_RENDERER = [0, 0, 2, 4, 5, 7, 9, 11];

/**
 * Renders one Music Line (system of measures) with accurate SVG slur arcs measured across DOM note boxes.
 */
function MusicLineView({
  line,
  instrument,
  keyName,
  fluteKey,
  shakuhachiSchool = 'kinko',
  isFreeRhythm = false,
  fingeringStyle,
  showMarkings,
  showLyrics,
  highlightMarkings,
  activeNoteId,
  selectedOffset,
  isDarkSurface,
  onNoteClick
}: {
  line: MusicLineNode;
  instrument?: InstrumentType;
  keyName: string;
  fluteKey?: string;
  shakuhachiSchool?: ShakuhachiSchool;
  isFreeRhythm?: boolean;
  fingeringStyle: 'chinese' | 'arabic';
  showMarkings: boolean;
  showLyrics: boolean;
  highlightMarkings: boolean;
  activeNoteId?: string | null;
  selectedOffset?: number | null;
  isDarkSurface: boolean;
  onNoteClick?: (note: MusoJianpuNote) => void;
}) {
  const lineContainerRef = useRef<HTMLDivElement>(null);
  const noteElMapRef = useRef<Map<string, HTMLSpanElement>>(new Map());
  const [slurArcs, setSlurArcs] = useState<SlurArc[]>([]);
  const [hairpinSpans, setHairpinSpans] = useState<HairpinSpan[]>([]);

  const hasAnyLyrics = useMemo(() => {
    if (!showLyrics) return false;
    return line.measures.some(m =>
      m.groups.some(g => g.notes.some(n => Boolean(n.lyric)))
    );
  }, [line, showLyrics]);

  const hasAnyDynamics = useMemo(() => {
    if (!showMarkings) return false;
    return line.measures.some(m =>
      m.groups.some(g => g.notes.some(n => Boolean(n.markings.dynamic || n.hairpinId !== undefined)))
    );
  }, [line, showMarkings]);

  const hasAnyJianzi = useMemo(() => {
    if (!showMarkings) return false;
    return line.measures.some(m =>
      m.groups.some(g => g.notes.some(n => Boolean(n.markings.jianzi)))
    );
  }, [line, showMarkings]);

  const hasAnyShakuhachi = useMemo(() => {
    if (!showMarkings) return false;
    if (instrument === 'shakuhachi') return true;
    return line.measures.some(m =>
      m.groups.some(g => g.notes.some(n => Boolean(n.markings.shakuhachi)))
    );
  }, [line, showMarkings, instrument]);

  const hasTopNavMarkers = useMemo(() => {
    return line.measures.some(m =>
      Boolean(m.volta || (m.startMarkers && m.startMarkers.length > 0) || (m.endMarkers && m.endMarkers.length > 0))
    );
  }, [line]);

  const hasStackedNavAndVolta = useMemo(() => {
    return line.measures.some(m =>
      Boolean(m.volta && ((m.startMarkers && m.startMarkers.length > 0) || (m.endMarkers && m.endMarkers.length > 0)))
    );
  }, [line]);

  const maxSlurTier = useMemo(() => {
    let maxTier = 0;
    for (const m of line.measures) {
      for (const g of m.groups) {
        for (const n of g.notes) {
          if (n.slurs) {
            for (const s of n.slurs) {
              if (s.tier > maxTier) maxTier = s.tier;
            }
          }
        }
      }
    }
    return maxTier;
  }, [line]);

  const slurLaneHeight = 16 + maxSlurTier * 11;

  const barlineBottomOffset =
    25 +
    (hasAnyDynamics ? 16 : 0) +
    (hasAnyJianzi ? 58 : 0) +
    (hasAnyShakuhachi ? 44 : 0) +
    (hasAnyLyrics ? 24 : 0);
  const measureNumberBottomOffset =
    31 +
    (hasAnyDynamics ? 16 : 0) +
    (hasAnyJianzi ? 58 : 0) +
    (hasAnyShakuhachi ? 44 : 0) +
    (hasAnyLyrics ? 24 : 0);

  const measureOverlays = () => {
    const container = lineContainerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const scale = container.offsetWidth > 0 ? containerRect.width / container.offsetWidth : 1;

    // Group notes by slurId (supporting nested slur stacks!) and hairpinId across the line
    const slurGroups = new Map<number, { tier: number; notes: MusoJianpuNote[] }>();
    const hairpinGroups = new Map<number, { type: HairpinType; notes: MusoJianpuNote[] }>();
    for (const m of line.measures) {
      for (const g of m.groups) {
        for (const n of g.notes) {
          if (n.slurs && n.slurs.length > 0) {
            for (const membership of n.slurs) {
              const entry = slurGroups.get(membership.id) || { tier: membership.tier, notes: [] };
              entry.tier = Math.max(entry.tier, membership.tier);
              entry.notes.push(n);
              slurGroups.set(membership.id, entry);
            }
          } else if (n.slurId !== undefined) {
            const entry = slurGroups.get(n.slurId) || { tier: 0, notes: [] };
            entry.notes.push(n);
            slurGroups.set(n.slurId, entry);
          }
          if (showMarkings && n.hairpinId !== undefined && n.hairpinType) {
            const entry = hairpinGroups.get(n.hairpinId) || { type: n.hairpinType, notes: [] };
            entry.notes.push(n);
            hairpinGroups.set(n.hairpinId, entry);
          }
        }
      }
    }

    const nextArcs: SlurArc[] = [];
    slurGroups.forEach(({ tier, notes }, slurId) => {
      if (notes.length < 2) return;

      // Split into visual rows in case a long phrasing slur wraps across flex rows
      const visualRows: { note: MusoJianpuNote; rect: DOMRect }[][] = [];
      for (const n of notes) {
        const el = noteElMapRef.current.get(n.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const currentRow = visualRows[visualRows.length - 1];
        if (!currentRow || Math.abs(rect.bottom - currentRow[0].rect.bottom) / scale > 44) {
          visualRows.push([{ note: n, rect }]);
        } else {
          currentRow.push({ note: n, rect });
        }
      }

      visualRows.forEach((row, rowIdx) => {
        if (row.length < 2) return;
        const firstRect = row[0].rect;
        const lastRect = row[row.length - 1].rect;
        const x1 = (firstRect.left - containerRect.left + firstRect.width * 0.5) / scale;
        const x2 = (lastRect.left - containerRect.left + lastRect.width * 0.5) / scale;

        // Anchor above the highest note/chord top in the spanned row
        const minTop = row.reduce(
          (min, item) => Math.min(min, (item.rect.top - containerRect.top) / scale),
          Infinity
        );
        const maxOctave = row.reduce((max, item) => Math.max(max, item.note.octave), 0);
        const octaveClearance = maxOctave >= 2 ? 12 : maxOctave === 1 ? 7 : 1;
        const tierOffset = tier * 11;

        if (x2 > x1 + 4) {
          nextArcs.push({
            key: `${slurId}-${rowIdx}`,
            id: slurId,
            tier,
            x1,
            x2,
            y: Math.max(4, minTop - octaveClearance - tierOffset)
          });
        }
      });
    });

    const nextHairpins: HairpinSpan[] = [];
    hairpinGroups.forEach(({ type, notes }, hairpinId) => {
      if (notes.length === 0) return;

      // Split into visual rows in case a long hairpin wraps onto a second flex row
      const visualRows: { note: MusoJianpuNote; rect: DOMRect }[][] = [];
      for (const n of notes) {
        const el = noteElMapRef.current.get(n.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const currentRow = visualRows[visualRows.length - 1];
        if (!currentRow || Math.abs(rect.top - currentRow[0].rect.top) / scale > 40) {
          visualRows.push([{ note: n, rect }]);
        } else {
          currentRow.push({ note: n, rect });
        }
      }

      visualRows.forEach((row, rowIdx) => {
        const first = row[0];
        const last = row[row.length - 1];
        let x1 = (first.rect.left - containerRect.left) / scale;
        let x2 = (last.rect.right - containerRect.left) / scale;

        if (row.length === 1) {
          x1 -= 6;
          x2 += 6;
        } else {
          // Avoid colliding with dynamic text (e.g. p / f) on the boundary notes
          if (first.note.markings.dynamic) {
            x1 = (first.rect.right - containerRect.left) / scale + 4;
          }
          if (last.note.markings.dynamic) {
            x2 = (last.rect.left - containerRect.left) / scale - 4;
          }
        }

        const maxDigitBottom = row.reduce(
          (max, item) => Math.max(max, (item.rect.bottom - containerRect.top) / scale),
          0
        );

        if (x2 > x1 + 6) {
          nextHairpins.push({
            key: `${hairpinId}-${rowIdx}`,
            type,
            x1,
            x2,
            y: maxDigitBottom + 33
          });
        }
      });
    });

    setSlurArcs(nextArcs);
    setHairpinSpans(nextHairpins);
  };

  useLayoutEffect(() => {
    measureOverlays();
  }, [line, showMarkings, showLyrics, fingeringStyle]);

  useEffect(() => {
    const el = lineContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measureOverlays());
    ro.observe(el);
    return () => ro.disconnect();
  }, [line, showMarkings, showLyrics]);

  const inkClass = isDarkSurface ? 'text-neutral-100' : 'text-[#161616]';
  const erhuAccentClass = highlightMarkings
    ? (isDarkSurface ? 'text-[#FF6B3D]' : 'text-[#C23E1E]')
    : (isDarkSurface ? 'text-neutral-300' : 'text-[#2B2B2B]');
  const subtleInkClass = isDarkSurface ? 'text-neutral-400' : 'text-neutral-600';

  const registerNoteRef = (noteId: string) => (el: HTMLSpanElement | null) => {
    if (el) noteElMapRef.current.set(noteId, el);
    else noteElMapRef.current.delete(noteId);
  };

  const renderNoteCell = (note: MusoJianpuNote, group: BeatGroup, noteIdxInGroup: number) => {
    const isPlaying = activeNoteId === note.id;
    const isSelected =
      selectedOffset !== null &&
      selectedOffset !== undefined &&
      selectedOffset >= note.startOffset &&
      selectedOffset <= note.endOffset;

    const fingerDisplay = note.markings.finger
      ? (fingeringStyle === 'chinese' ? CHINESE_FINGERS[note.markings.finger] : note.markings.finger)
      : null;

    const stringDisplay = note.markings.string === 'in'
      ? '内'
      : note.markings.string === 'out'
        ? '外'
        : note.markings.string === 's1'
          ? '一弦'
          : note.markings.string === 's2'
            ? '二弦'
            : note.markings.string === 's3'
              ? '三弦'
              : note.markings.string === 's4'
                ? '四弦'
                : null;

    const harmonicOrnaments = note.markings.ornaments.filter(o => o === 'harm' || o === 'aharm');
    const positionShiftOrnaments = note.markings.ornaments.filter(o => o === 'shiftUp' || o === 'shiftDown');
    const slideOrnaments = note.markings.ornaments.filter(o => o === 'su' || o === 'sd');
    const accentOrnaments = note.markings.ornaments.filter(o => o === 'accent');
    const vibratoOrnaments = note.markings.ornaments.filter(o => o === 'vib' || o === 'pvib');
    const melodicOrnaments = note.markings.ornaments.filter(o => o === 'sr' || o === 'da' || o === 'tr');
    const fermataOrnaments = note.markings.ornaments.filter(o => o === 'fermata');
    const allTechniques = note.markings.techniques || [];
    const hasArpeggio = allTechniques.includes('arp');
    const leftGlissTechniques = allTechniques.filter(t => t === 'gua' || t === 'guadown' || t === 'li' || t === 'lidown');
    const topTechniques = allTechniques.filter(t => t !== 'arp' && t !== 'gua' && t !== 'guadown' && t !== 'li' && t !== 'lidown');
    const hasPositionRow = Boolean(note.markings.position || positionShiftOrnaments.length > 0);

    const isChord = Boolean(note.chordPitches && note.chordPitches.length >= 2);
    const chordPitches: ChordPitch[] = isChord ? note.chordPitches! : [];

    // Shakuhachi Dual-view pitch & fingering synchronization:
    // 1. Pure Shakuhachi notes (`{ロ}`) automatically compute Jianpu digits for Dual view
    // 2. Pitched Jianpu notes under `@instrument: shakuhachi` automatically infer Kinko/Tozan fingerings
    let displayDegree = note.degree;
    let displayOctave = note.octave;
    let displayAccidental = note.accidental;
    let effectiveShakuhachi: ShakuhachiNoteData | undefined = note.markings.shakuhachi;
    let isInferredShakuhachi = false;

    if (note.degree === -2 && note.markings.shakuhachi?.fingering) {
      const shMidi = computeShakuhachiMidi(note.markings.shakuhachi, fluteKey);
      if (shMidi !== null) {
        const derived = midiToJianpuPitch(shMidi, keyName);
        displayDegree = derived.degree;
        displayOctave = derived.octave;
        displayAccidental = derived.accidental;
      }
    } else if (
      hasAnyShakuhachi &&
      instrument === 'shakuhachi' &&
      !effectiveShakuhachi?.fingering &&
      note.degree >= 1 &&
      note.degree <= 7
    ) {
      const kInfo = getErhuKeyInfo(keyName);
      let semi = JIANPU_SCALE_SEMITONES_RENDERER[note.degree] || 0;
      if (note.accidental === '#') semi += 1;
      else if (note.accidental === 'b') semi -= 1;
      const concertMidi = kInfo.tonicMidi + semi + note.octave * 12;
      const inferred = inferShakuhachiFromMidi(concertMidi, fluteKey, shakuhachiSchool);
      effectiveShakuhachi = effectiveShakuhachi ? { ...inferred, ...effectiveShakuhachi } : inferred;
      isInferredShakuhachi = true;
    }

    const jinInstructions = note.markings.shakuhachi?.instructions || [];

    // Continuous beaming logic across adjacent notes in the same BeatGroup
    const prevUnderlines = noteIdxInGroup > 0 ? group.notes[noteIdxInGroup - 1].underlines : 0;
    const nextUnderlines = noteIdxInGroup < group.notes.length - 1 ? group.notes[noteIdxInGroup + 1].underlines : 0;

    const hasPreGrace = note.graceNotes.length > 0;
    const hasPostGrace = Boolean(note.postGraceNotes && note.postGraceNotes.length > 0);
    const noteColorClass = isPlaying ? 'text-[#E05A2B]' : inkClass;

    const noteMinWidthClass =
      note.underlines === 0
        ? (note.dots > 0 ? 'min-w-[36px]' : 'min-w-[26px]')
        : note.underlines === 1
          ? (note.dots > 0 ? 'min-w-[28px]' : 'min-w-[22px]')
          : 'min-w-[19px]';

    return (
      <button
        key={note.id}
        type="button"
        onClick={() => onNoteClick?.(note)}
        title={`Line ${note.lineNumber} · Click to edit in source`}
        className={cn(
          'relative shrink-0 flex items-end justify-center group/note px-[5px] pt-1 pb-0.5 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E05A2B]',
          noteMinWidthClass,
          isPlaying && (isDarkSurface ? 'bg-[#E05A2B]/30 ring-1 ring-[#E05A2B]' : 'bg-[#E05A2B]/15 ring-1 ring-[#E05A2B]'),
          !isPlaying && isSelected && (isDarkSurface ? 'bg-white/10' : 'bg-amber-100/80'),
          !isPlaying && !isSelected && (isDarkSurface ? 'hover:bg-white/[0.06]' : 'hover:bg-neutral-100')
        )}
      >
        {/* Left Pre-Grace Note Slot (tucked close to the main digit, keeping main markings centered) */}
        {hasPreGrace && (
          <div className="flex flex-col items-end justify-end -mr-[1px]">
            <div className="h-[24px] flex items-center -translate-y-[6px]">
              <GraceNoteCluster notes={note.graceNotes} position="pre" colorClass={noteColorClass} />
            </div>
            {/* Beam bridge only when this note continues an incoming beam from the left */}
            <div className="relative w-full h-[11px] flex flex-col justify-start gap-[2.5px] mt-[1px]">
              {[1, 2, 3].map(level => {
                const bridgeLeft = note.underlines >= level && prevUnderlines >= level;
                if (!bridgeLeft) return <div key={level} className="h-[1.5px]" />;
                return (
                  <div
                    key={level}
                    className={cn('h-[1.5px] bg-current transition-none', noteColorClass)}
                    style={{ marginLeft: '-5px', marginRight: '-1px' }}
                  />
                );
              })}
            </div>
            <div className="h-[11px] mt-[1px]" aria-hidden="true" />
            {hasAnyDynamics && <div className="h-[15px] mt-[1px]" aria-hidden="true" />}
            {hasAnyJianzi && <div className="h-[56px] mt-[2px]" aria-hidden="true" />}
            {hasAnyShakuhachi && <div className="h-[42px] mt-[2px]" aria-hidden="true" />}
            {hasAnyLyrics && <div className="h-[20px] mt-1" aria-hidden="true" />}
          </div>
        )}

        {/* Main Note / Chord Column */}
        <div className="flex flex-col items-center justify-end">
          {/* Top Markings Stack (Conventional bottom-to-top order closest to note upward:
              1. Harmonics → 2. Fingers → 3. String → 4. Position → 5. Accent →
              6. Vibrato → 7. Melodic Ornaments → 8. Bowing / Pipa & Guzheng Techniques → 9. Fermata → 10. Custom Text / Jin Nyodo) */}
          {showMarkings && (
            <div className="flex flex-col items-center justify-end gap-[2px] min-h-[34px] mb-0.5 select-none">
              {/* Layer 10 (Topmost): Jin Nyodo Instructions & Custom Performance Text */}
              {jinInstructions.length > 0 && (
                <div className="flex items-center justify-center min-h-[12px] whitespace-nowrap">
                  <span
                    style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                    className={cn('text-[9.5px] font-medium leading-none whitespace-nowrap', erhuAccentClass)}
                  >
                    「{jinInstructions.join('・')}」
                  </span>
                </div>
              )}
              {note.markings.customText && (
                <div className="flex items-center justify-center min-h-[12px] whitespace-nowrap">
                  <span className={cn('text-[9.5px] font-medium leading-none whitespace-nowrap', subtleInkClass)}>
                    {note.markings.customText}
                  </span>
                </div>
              )}

              {/* Layer 9: Fermata (𝄐 sits above ornaments & bowing/pluck techniques) */}
              {fermataOrnaments.map((orn, idx) => (
                <div key={`ferm-${idx}`} className="flex items-center justify-center min-h-[12px] leading-none">
                  <OrnamentGlyph type={orn} className={erhuAccentClass} />
                </div>
              ))}

              {/* Layer 8: Bowing & Plucked Instrument Techniques (Pipa / Guzheng) */}
              {topTechniques.map((tech, idx) => (
                <div key={`tech-${idx}`} className="flex items-center justify-center min-h-[12px] leading-none whitespace-nowrap">
                  <PluckTechniqueGlyph type={tech} className={erhuAccentClass} />
                </div>
              ))}
              {note.markings.bowing && (
                <div className="flex items-center justify-center min-h-[12px] leading-none">
                  <BowingGlyph type={note.markings.bowing} className={erhuAccentClass} />
                </div>
              )}

              {/* Layer 7: Melodic Ornaments (tr / 打·丁 / ⌒回滑) stacked vertically */}
              {melodicOrnaments.map((orn, idx) => (
                <div key={`mel-${idx}`} className="flex items-center justify-center min-h-[11px] leading-none">
                  <OrnamentGlyph type={orn} instrument={instrument} className={erhuAccentClass} />
                </div>
              ))}

              {/* Layer 6: Vibrato (〰 / 压) stacked vertically */}
              {vibratoOrnaments.map((orn, idx) => (
                <div key={`vib-${idx}`} className="flex items-center justify-center min-h-[10px] leading-none">
                  <OrnamentGlyph type={orn} className={erhuAccentClass} />
                </div>
              ))}

              {/* Layer 5: Articulation / Accent (>) */}
              {accentOrnaments.map((orn, idx) => (
                <div key={`acc-${idx}`} className="flex items-center justify-center min-h-[11px] leading-none">
                  <OrnamentGlyph type={orn} className={erhuAccentClass} />
                </div>
              ))}

              {/* Layer 4: Position & Position Shift */}
              {hasPositionRow && (
                <div className="flex items-center justify-center gap-0.5 min-h-[12px] whitespace-nowrap">
                  {positionShiftOrnaments.map((orn, idx) => (
                    <OrnamentGlyph key={idx} type={orn} className={erhuAccentClass} />
                  ))}
                  {note.markings.position && (
                    <span className={cn('text-[9.5px] font-semibold leading-none', subtleInkClass)}>
                      {note.markings.position}
                    </span>
                  )}
                </div>
              )}

              {/* Layer 3: String (Erhu 内/外 or Pipa 一弦–四弦) */}
              {stringDisplay && (
                <div className="flex items-center justify-center min-h-[12px] leading-none whitespace-nowrap">
                  <span className={cn('text-[10px] font-bold leading-none', erhuAccentClass)}>
                    {stringDisplay}
                  </span>
                </div>
              )}

              {/* Layer 2: Fingers (0 / 一二三四 / 1234) */}
              {fingerDisplay && (
                <div className="flex items-center justify-center min-h-[12px] leading-none">
                  <span className={cn('text-[10.5px] font-semibold leading-none', inkClass)}>
                    {fingerDisplay}
                  </span>
                </div>
              )}

              {/* Layer 1 (Bottom, closest to note): Harmonics (○ / ◇) */}
              {harmonicOrnaments.map((orn, idx) => (
                <div key={`harm-${idx}`} className="flex items-center justify-center min-h-[11px] leading-none">
                  <OrnamentGlyph type={orn} className={erhuAccentClass} />
                </div>
              ))}
            </div>
          )}

          {/* Reserved vertical lane for High Octave Dots & Nested Slur Arcs */}
          <div style={{ height: `${slurLaneHeight}px` }} className="mb-[2px]" aria-hidden="true" />

          {/* Main Pitch Numeral / Vertical Chord Row (with optional Gliss, Slide, Arpeggio, Accidental, Dot, Tie) */}
          <div className={cn('relative flex justify-center leading-none', isChord ? 'items-end' : 'items-center h-[24px]')}>
            {/* Left-side Arpeggio wavy line (琶音), Glissando (刮奏), and Slide Arrows (上滑音 / 下滑音) */}
            {showMarkings && (leftGlissTechniques.length > 0 || slideOrnaments.length > 0 || hasArpeggio) && (
              <span className={cn('inline-flex items-center mr-[1.5px]', isChord && 'self-center')}>
                {leftGlissTechniques.map((gTech, gIdx) => (
                  <PluckTechniqueGlyph key={`gliss-${gIdx}`} type={gTech} className={erhuAccentClass} />
                ))}
                {slideOrnaments.map((sOrn, sIdx) => (
                  <OrnamentGlyph key={sIdx} type={sOrn} className={erhuAccentClass} />
                ))}
                {hasArpeggio && <ArpeggioGlyph tall={isChord} className={erhuAccentClass} />}
              </span>
            )}

            {isChord ? (
              /* Vertical Stacked Chord (highest pitch on top, lowest on bottom) */
              <span
                ref={registerNoteRef(note.id)}
                className={cn(
                  'relative inline-flex flex-col items-center justify-end gap-[2px] select-text',
                  noteColorClass
                )}
                style={{ fontFamily: '"Plus Jakarta Sans", "Noto Sans SC", system-ui, sans-serif' }}
              >
                {chordPitches.map((cp, cpIdx) => {
                  const isTop = cpIdx === 0;
                  const isBottom = cpIdx === chordPitches.length - 1;
                  return (
                    <span
                      key={cpIdx}
                      className="relative inline-flex items-center justify-center leading-none"
                    >
                      {cp.accidental && (
                        <span className={cn('text-[9.5px] font-bold -translate-y-[2px] mr-[0.5px] leading-none', inkClass)}>
                          {cp.accidental === '#' ? '♯' : cp.accidental === 'b' ? '♭' : '♮'}
                        </span>
                      )}
                      <span className="relative inline-flex flex-col items-center justify-center leading-none">
                        {/* High octave dots above this chord pitch */}
                        {cp.octave >= 1 && (
                          <span
                            aria-hidden="true"
                            className={cn(
                              'flex flex-col items-center gap-[1.5px] pointer-events-none',
                              isTop ? 'absolute bottom-full left-1/2 -translate-x-1/2 pb-[2px]' : 'mb-[1px]'
                            )}
                          >
                            {cp.octave >= 2 && <span className={cn('w-[3px] h-[3px] rounded-full bg-current', inkClass)} />}
                            <span className={cn('w-[3px] h-[3px] rounded-full bg-current', inkClass)} />
                          </span>
                        )}

                        <span className="text-[17.5px] font-bold tabular-nums leading-[18px]">
                          {cp.degree}
                        </span>

                        {/* Low octave dots: inline for upper chord tones, below beam underlines for bottom tone */}
                        {cp.octave <= -1 && !isBottom && (
                          <span
                            aria-hidden="true"
                            className="flex flex-col items-center gap-[1.5px] mt-[1px] pointer-events-none"
                          >
                            <span className={cn('w-[3px] h-[3px] rounded-full bg-current', inkClass)} />
                            {cp.octave <= -2 && <span className={cn('w-[3px] h-[3px] rounded-full bg-current', inkClass)} />}
                          </span>
                        )}
                        {cp.octave <= -1 && isBottom && (
                          <span
                            aria-hidden="true"
                            className={cn(
                              'absolute top-full left-1/2 -translate-x-1/2 flex flex-col items-center gap-[2px] pointer-events-none',
                              note.underlines === 0
                                ? 'pt-[3px]'
                                : note.underlines === 1
                                  ? 'pt-[6px]'
                                  : note.underlines === 2
                                    ? 'pt-[10px]'
                                    : 'pt-[14px]'
                            )}
                          >
                            <span className={cn('w-[3.5px] h-[3.5px] rounded-full bg-current', inkClass)} />
                            {cp.octave <= -2 && <span className={cn('w-[3.5px] h-[3.5px] rounded-full bg-current', inkClass)} />}
                          </span>
                        )}
                      </span>
                    </span>
                  );
                })}
              </span>
            ) : (
              <>
                {/* Accidental */}
                {displayAccidental && (
                  <span className={cn('text-[11px] font-bold -translate-y-1.5 mr-[0.5px] leading-none', inkClass)}>
                    {displayAccidental === '#' ? '♯' : displayAccidental === 'b' ? '♭' : '♮'}
                  </span>
                )}

                {/* Core Jianpu Digit or Prolongation Dash (anchors octave dots & slurs to the digit itself) */}
                <span
                  ref={registerNoteRef(note.id)}
                  className={cn(
                    'relative inline-flex items-center justify-center h-[22px] text-[21px] font-bold tabular-nums tracking-tight leading-none select-text',
                    note.degree === -2 && displayDegree >= 1 && 'opacity-80',
                    noteColorClass
                  )}
                  style={{ fontFamily: '"Plus Jakarta Sans", "Noto Sans SC", system-ui, sans-serif' }}
                >
                  {/* High Octave Dots anchored directly above the digit */}
                  {displayOctave >= 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-full left-1/2 -translate-x-1/2 pb-[2px] flex flex-col items-center gap-[2px] pointer-events-none"
                    >
                      {displayOctave >= 2 && <span className={cn('w-[3.5px] h-[3.5px] rounded-full bg-current', inkClass)} />}
                      <span className={cn('w-[3.5px] h-[3.5px] rounded-full bg-current', inkClass)} />
                    </span>
                  )}

                  {displayDegree === -1 ? '–' : displayDegree === -2 ? <span className="opacity-35 text-sm">·</span> : displayDegree}

                  {/* Low Octave Dots anchored directly below the digit & duration underlines */}
                  {displayOctave <= -1 && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute top-full left-1/2 -translate-x-1/2 flex flex-col items-center gap-[2px] pointer-events-none',
                        note.underlines === 0
                          ? 'pt-[3px]'
                          : note.underlines === 1
                            ? 'pt-[6px]'
                            : note.underlines === 2
                              ? 'pt-[10px]'
                              : 'pt-[14px]'
                      )}
                    >
                      <span className={cn('w-[3.5px] h-[3.5px] rounded-full bg-current', inkClass)} />
                      {displayOctave <= -2 && <span className={cn('w-[3.5px] h-[3.5px] rounded-full bg-current', inkClass)} />}
                    </span>
                  )}
                </span>
              </>
            )}

            {/* Augmentation Dot(s) */}
            {note.dots > 0 && (
              <span
                className={cn(
                  'inline-flex items-center',
                  isChord && 'mb-[6px]',
                  note.underlines === 0 ? 'ml-[8px] mr-[1px] gap-[4px]' : 'ml-[5px] gap-[3px]',
                  inkClass
                )}
              >
                {Array.from({ length: note.dots }).map((_, dIdx) => (
                  <span key={dIdx} className="w-[4px] h-[4px] rounded-full bg-current inline-block" />
                ))}
              </span>
            )}

            {/* Tie Curve (~) */}
            {note.tiedToNext && (
              <svg viewBox="0 0 16 8" className={cn('w-4 h-2 absolute -right-3 -top-2 pointer-events-none', inkClass)}>
                <path d="M1 7Q8 1 15 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            )}
          </div>

          {/* Duration Underlines (Continuous Horizontal Beams across BeatGroup) */}
          <div className="relative w-full h-[11px] flex flex-col justify-start gap-[2.5px] mt-[1px]">
            {[1, 2, 3].map(level => {
              if (note.underlines < level) return <div key={level} className="h-[1.5px]" />;
              const connectLeft = prevUnderlines >= level;
              const connectRight = nextUnderlines >= level;
              return (
                <div
                  key={level}
                  className={cn('h-[1.5px] bg-current transition-none', noteColorClass)}
                  style={{
                    marginLeft: connectLeft ? (hasPreGrace ? '-2px' : '-5px') : '1px',
                    marginRight: connectRight ? (hasPostGrace ? '-2px' : '-5px') : '1px'
                  }}
                />
              );
            })}
          </div>

          {/* Reserved vertical lane for Low Octave Dots */}
          <div className="h-[11px] mt-[1px]" aria-hidden="true" />

          {/* Dynamic Marking below the note (p, mp, mf, f, cresc, dim, rit, etc.) */}
          {hasAnyDynamics && (
            <div className="h-[15px] mt-[1px] flex items-center justify-center whitespace-nowrap select-none">
              {note.markings.dynamic && (
                <span className={cn('text-[11px] font-serif italic font-bold leading-none', isDarkSurface ? 'text-amber-300' : 'text-neutral-800')}>
                  {note.markings.dynamic}
                </span>
              )}
            </div>
          )}

          {/* Dual-Line Guqin Jianzipu (减字谱) Character aligned directly beneath the Jianpu note */}
          {hasAnyJianzi && (
            <div className="h-[56px] mt-[2px] pb-[4px] flex items-end justify-center select-none">
              {note.markings.jianzi && (
                <GuqinJianziGlyph
                  jianzi={note.markings.jianzi}
                  size="sm"
                  orientation="horizontal"
                  inkClass={noteColorClass}
                />
              )}
            </div>
          )}

          {/* Dual-Line Shakuhachi Fingering (尺八譜 · Kinko / Tozan) aligned directly beneath the Jianpu note */}
          {hasAnyShakuhachi && (
            <div className="h-[42px] mt-[2px] pt-[2px] flex items-start justify-center select-none">
              {effectiveShakuhachi && (
                <ShakuhachiDualGlyph
                  data={effectiveShakuhachi}
                  school={shakuhachiSchool}
                  inkClass={noteColorClass}
                  accentClass={erhuAccentClass}
                  isInferred={isInferredShakuhachi}
                />
              )}
            </div>
          )}

          {/* Aligned Lyric Syllable */}
          {hasAnyLyrics && (
            <div className={cn('h-[20px] mt-1 text-[13px] font-medium leading-tight whitespace-nowrap', isDarkSurface ? 'text-neutral-200' : 'text-neutral-800')}>
              {note.lyric || ''}
            </div>
          )}
        </div>

        {/* Optional Right Post-Grace Note Slot (后倚音) */}
        {hasPostGrace && note.postGraceNotes && (
          <div className="flex flex-col items-start justify-end -ml-[1px]">
            <div className="h-[24px] flex items-center -translate-y-[6px]">
              <GraceNoteCluster notes={note.postGraceNotes} position="post" colorClass={noteColorClass} />
            </div>
            <div className="relative w-full h-[11px] flex flex-col justify-start gap-[2.5px] mt-[1px]">
              {[1, 2, 3].map(level => {
                const bridgeRight = note.underlines >= level && nextUnderlines >= level;
                if (!bridgeRight) return <div key={level} className="h-[1.5px]" />;
                return (
                  <div
                    key={level}
                    className={cn('h-[1.5px] bg-current transition-none', noteColorClass)}
                    style={{ marginLeft: '-1px', marginRight: '-5px' }}
                  />
                );
              })}
            </div>
            <div className="h-[11px] mt-[1px]" aria-hidden="true" />
            {hasAnyDynamics && <div className="h-[15px] mt-[1px]" aria-hidden="true" />}
            {hasAnyJianzi && <div className="h-[56px] mt-[2px]" aria-hidden="true" />}
            {hasAnyShakuhachi && <div className="h-[42px] mt-[2px]" aria-hidden="true" />}
            {hasAnyLyrics && <div className="h-[20px] mt-1" aria-hidden="true" />}
          </div>
        )}
      </button>
    );
  };

  return (
    <div ref={lineContainerRef} className={cn('relative w-full pb-3', hasStackedNavAndVolta ? 'pt-10' : hasTopNavMarkers ? 'pt-7' : 'pt-2')}>
      {/* SVG Nested Slurs & Hairpin Overlay Layer */}
      {(slurArcs.length > 0 || hairpinSpans.length > 0) && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
          {slurArcs.map(arc => {
            const midX = (arc.x1 + arc.x2) / 2;
            const span = arc.x2 - arc.x1;
            const lift = Math.min(20, Math.max(7, span * 0.11) + arc.tier * 3.5);
            const yBase = arc.y;
            return (
              <path
                key={`slur-${arc.key}`}
                d={`M ${arc.x1} ${yBase} Q ${midX} ${yBase - lift} ${arc.x2} ${yBase}`}
                fill="none"
                stroke={isDarkSurface ? '#E5E7EB' : '#1A1A1A'}
                strokeWidth={arc.tier >= 1 ? '1.35' : '1.45'}
                strokeLinecap="round"
              />
            );
          })}
          {hairpinSpans.map(hp => {
            const halfH = 4.2;
            const d = hp.type === 'cresc'
              ? `M ${hp.x2} ${hp.y - halfH} L ${hp.x1} ${hp.y} L ${hp.x2} ${hp.y + halfH}`
              : `M ${hp.x1} ${hp.y - halfH} L ${hp.x2} ${hp.y} L ${hp.x1} ${hp.y + halfH}`;
            return (
              <path
                key={`hp-${hp.key}`}
                d={d}
                fill="none"
                stroke={isDarkSurface ? '#FCD34D' : '#1F2937'}
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
        </svg>
      )}

      {/* Measures Flex Row */}
      <div className={cn('flex flex-wrap items-end w-full', hasTopNavMarkers ? 'gap-y-10' : 'gap-y-7')}>
        {line.measures.map((measure: MusoJianpuMeasure, mIdx: number) => {
          const isLastInLine = mIdx === line.measures.length - 1;
          const measureWeight = getMeasureBeatWeight(measure);
          const closesVoltaHook = measure.endBarline === ':|' || measure.endBarline === ':||:';
          const isCodaStart = Boolean(measure.startMarkers?.includes('coda')) && mIdx > 0;
          const navTopClass = measure.volta ? '-top-9' : '-top-5';
          return (
            <div
              key={measure.id}
              style={{ flex: `${measureWeight} 0 auto` }}
              className={cn('relative flex items-end', isCodaStart && 'ml-3')}
            >
              {/* Measure Number subtle cue on first measure of each line */}
              {mIdx === 0 && (
                <span
                  style={{ bottom: `${measureNumberBottomOffset}px` }}
                  className={cn(
                    'absolute -left-5 text-[10px] font-mono tabular-nums opacity-40 select-none',
                    inkClass
                  )}
                >
                  {measure.measureNumber}
                </span>
              )}

              {/* Start Navigation Markers (Segno, Coda) */}
              {measure.startMarkers && measure.startMarkers.length > 0 && (
                <div className={cn('absolute left-0 flex items-center gap-1.5 whitespace-nowrap select-none pointer-events-none', navTopClass)}>
                  {measure.startMarkers.map((marker, idx) => (
                    <NavMarkerBadge key={`${marker}-${idx}`} type={marker} accentClass={erhuAccentClass} inkClass={inkClass} />
                  ))}
                </div>
              )}

              {/* End Navigation Markers (To Coda, Fine, D.C., D.S., Segue, Attacca) */}
              {measure.endMarkers && measure.endMarkers.length > 0 && (
                <div className={cn('absolute right-0 flex items-center gap-1.5 whitespace-nowrap select-none pointer-events-none', navTopClass)}>
                  {measure.endMarkers.map((marker, idx) => (
                    <NavMarkerBadge key={`${marker}-${idx}`} type={marker} accentClass={erhuAccentClass} inkClass={inkClass} />
                  ))}
                </div>
              )}

              {/* Volta Bracket ([1. / [2. / [1,2.) */}
              {measure.volta && (
                <div className={cn(
                  'absolute -top-4 left-1 right-1 h-3.5 border-t border-l flex items-start pl-1 text-[10px] font-bold leading-none pt-0.5 pointer-events-none select-none',
                  closesVoltaHook && 'border-r',
                  isDarkSurface ? 'border-neutral-400 text-neutral-300' : 'border-neutral-700 text-neutral-800'
                )}>
                  {measure.volta}
                </div>
              )}

              {/* Start Barline */}
              {measure.startBarline && (
                <div className="mr-2 shrink-0 self-end" style={{ marginBottom: `${barlineBottomOffset}px` }}>
                  <BarlineGlyph type={measure.startBarline} inkClass={inkClass} />
                </div>
              )}

              {/* Beat Groups inside Measure (duration-proportional spacing, never overlapping) */}
              <div className="flex items-end flex-1 gap-x-2 pl-2.5 pr-1.5">
                {measure.groups.map(group => {
                  const groupWeight = getGroupBeatWeight(group);
                  const hasTuplet = group.notes.some(n => n.tupletStart);
                  const tupletNum = group.notes.find(n => n.tupletStart)?.tupletStart;
                  return (
                    <div
                      key={group.id}
                      style={{ flex: `${groupWeight} 0 auto` }}
                      className="relative flex items-end justify-start"
                    >
                      {hasTuplet && tupletNum && (
                        <div className={cn(
                          'absolute -top-2 inset-x-1 flex items-center justify-center text-[10px] font-bold pointer-events-none',
                          inkClass
                        )}>
                          <span className="border-t border-l border-r border-current px-1.5 leading-none pt-0.5">
                            {tupletNum}
                          </span>
                        </div>
                      )}
                      {group.notes.map((note, nIdx) => renderNoteCell(note, group, nIdx))}
                    </div>
                  );
                })}
              </div>

              {/* End Barline (in Free Rhythm Honkyoku, regular '|' renders as a subtle breath-phrase break) */}
              {(measure.endBarline || !isLastInLine) && (
                <div className="ml-2 shrink-0 self-end" style={{ marginBottom: `${barlineBottomOffset}px` }}>
                  {isFreeRhythm && (!measure.endBarline || measure.endBarline === '|') ? (
                    <div
                      className={cn('h-[24px] border-l border-dashed opacity-30', inkClass)}
                      title="Free-rhythm phrase division (散拍句切れ)"
                    />
                  ) : (
                    <BarlineGlyph type={measure.endBarline || '|'} inkClass={inkClass} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CLASSICAL_SERIF_FONT =
  '"Noto Serif SC", "Songti SC", "STSong", "Source Han Serif SC", "SimSun", serif';

type ScrollCell =
  | { kind: 'section'; id: string; text: string }
  | { kind: 'note'; note: MusoJianpuNote; phraseEnd?: 'pause' | 'period' };

/**
 * Pure Jianzipu (纯减字谱) Renderer — supports both:
 * 1. `pure-horizontal` (横排): Flowing horizontal calligraphic Jianzipu glyphs grouped by phrase without Jianpu digits
 * 2. `pure-vertical` (竖排 · 乌丝栏): Traditional right-to-left vertical scroll columns with classical double border & colophon
 */
function PureJianzipuView({
  document,
  mode,
  isDarkSurface,
  highlightMarkings,
  activeNoteId,
  selectedOffset,
  onNoteClick
}: {
  document: MusoJianpuDocument;
  mode: 'pure-horizontal' | 'pure-vertical';
  isDarkSurface: boolean;
  highlightMarkings: boolean;
  activeNoteId?: string | null;
  selectedOffset?: number | null;
  onNoteClick?: (note: MusoJianpuNote) => void;
}) {
  const inkClass = isDarkSurface ? 'text-neutral-100' : 'text-[#181614]';
  const accentClass = highlightMarkings
    ? (isDarkSurface ? 'text-[#FF6B3D]' : 'text-[#B8321A]')
    : (isDarkSurface ? 'text-neutral-300' : 'text-[#3A3530]');
  const ruleBorderClass = isDarkSurface ? 'border-amber-200/15' : 'border-[#8C6D46]/35';

  // Extract flat vertical scroll columns (right-to-left) for pure-vertical mode
  const verticalColumns = useMemo(() => {
    const cols: ScrollCell[][] = [];
    const MAX_PER_COL = 7;
    let currentCol: ScrollCell[] = [];

    const pushCol = () => {
      if (currentCol.length > 0) {
        cols.push(currentCol);
        currentCol = [];
      }
    };

    for (const line of document.lines) {
      if (line.kind === 'section') {
        pushCol();
        currentCol.push({ kind: 'section', id: line.id, text: line.text });
        continue;
      }
      if (line.kind !== 'music') continue;

      const lineNotes: { note: MusoJianpuNote; phraseEnd?: 'pause' | 'period' }[] = [];
      line.measures.forEach((m, mIdx) => {
        const mNotes = m.groups.flatMap(g => g.notes).filter(n => Boolean(n.markings.jianzi));
        mNotes.forEach((n, nIdx) => {
          const isLastInMeasure = nIdx === mNotes.length - 1;
          const isLastInLine = mIdx === line.measures.length - 1;
          lineNotes.push({
            note: n,
            phraseEnd: isLastInMeasure ? (isLastInLine ? 'period' : 'pause') : undefined
          });
        });
      });

      for (const item of lineNotes) {
        if (currentCol.length >= MAX_PER_COL) {
          pushCol();
        }
        currentCol.push({ kind: 'note', note: item.note, phraseEnd: item.phraseEnd });
      }
      pushCol();
    }
    pushCol();
    return cols;
  }, [document]);

  const textNotes = useMemo(
    () => document.lines.filter(l => l.kind === 'text'),
    [document]
  );

  const hasAnyJianziInDoc = useMemo(() => {
    return document.lines.some(
      l => l.kind === 'music' && l.measures.some(m => m.groups.some(g => g.notes.some(n => Boolean(n.markings.jianzi))))
    );
  }, [document]);

  if (!hasAnyJianziInDoc) {
    return (
      <div className={cn('py-14 text-center text-sm', isDarkSurface ? 'text-neutral-400' : 'text-neutral-500')}>
        No Jianzipu (减字谱) glyphs found yet. Add tokens like{' '}
        <code className="font-mono text-[#E05A2B]">{'{散勾一}'}</code> or{' '}
        <code className="font-mono text-[#E05A2B]">{'{名九勾六,绰,吟}'}</code> using the Guqin tab, or load a Guqin template.
      </div>
    );
  }

  // Traditional Right-to-Left Vertical Woodblock Scroll (纯减字竖排 · 乌丝栏)
  if (mode === 'pure-vertical') {
    return (
      <div className="flex flex-col gap-5">
        <div
          className={cn(
            'overflow-x-auto pb-2 rounded-xl border-2 p-2',
            isDarkSurface
              ? 'border-amber-200/20 bg-[#141519]'
              : 'border-[#8C6D46]/45 bg-[#FBF7EE]'
          )}
        >
          <div
            className={cn(
              'min-w-max border flex flex-row-reverse items-stretch justify-start',
              ruleBorderClass
            )}
          >
            {/* Rightmost Traditional Colophon Column (Title, Tuning & Credits in vertical calligraphy) */}
            <div
              className={cn(
                'w-[72px] shrink-0 py-6 px-3 flex flex-col items-center justify-between gap-6 border-l-2 select-none',
                ruleBorderClass,
                isDarkSurface ? 'bg-amber-950/15' : 'bg-[#F5ECD9]/55'
              )}
            >
              <div
                style={{ fontFamily: CLASSICAL_SERIF_FONT, writingMode: 'vertical-rl' }}
                className={cn('text-xl font-bold tracking-[0.22em] leading-none', inkClass)}
              >
                {document.header.title}
              </div>

              <div className="flex flex-row-reverse items-start gap-2.5">
                <div
                  style={{ fontFamily: CLASSICAL_SERIF_FONT, writingMode: 'vertical-rl' }}
                  className={cn('text-xs font-semibold tracking-[0.16em]', accentClass)}
                >
                  {document.header.strings || '正调 五六一二三五六'}
                </div>
                {document.header.composer && (
                  <div
                    style={{ fontFamily: CLASSICAL_SERIF_FONT, writingMode: 'vertical-rl' }}
                    className={cn('text-[11px] tracking-[0.14em] opacity-70', inkClass)}
                  >
                    {document.header.composer}
                  </div>
                )}
              </div>
            </div>

            {/* Right-to-Left Vertical Jianzipu Columns (乌丝栏) */}
            {verticalColumns.map((col, colIdx) => (
              <div
                key={`vcol-${colIdx}`}
                className={cn(
                  'w-[66px] shrink-0 py-5 px-1.5 flex flex-col items-center justify-start gap-2.5 border-l',
                  ruleBorderClass
                )}
              >
                {col.map(cell => {
                  if (cell.kind === 'section') {
                    return (
                      <div
                        key={cell.id}
                        style={{ fontFamily: CLASSICAL_SERIF_FONT, writingMode: 'vertical-rl' }}
                        className={cn(
                          'py-1.5 text-xs font-bold tracking-[0.18em] select-none',
                          accentClass
                        )}
                      >
                        {cell.text}
                      </div>
                    );
                  }

                  const { note, phraseEnd } = cell;
                  const isPlaying = activeNoteId === note.id;
                  const isSelected =
                    selectedOffset !== null &&
                    selectedOffset !== undefined &&
                    selectedOffset >= note.startOffset &&
                    selectedOffset <= note.endOffset;
                  const noteColorClass = isPlaying ? 'text-[#E05A2B]' : inkClass;

                  return (
                    <div key={note.id} className="relative flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => onNoteClick?.(note)}
                        className={cn(
                          'relative p-1 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E05A2B]',
                          isPlaying && (isDarkSurface ? 'bg-[#E05A2B]/30 ring-1 ring-[#E05A2B]' : 'bg-[#E05A2B]/15 ring-1 ring-[#E05A2B]'),
                          !isPlaying && isSelected && (isDarkSurface ? 'bg-white/10' : 'bg-amber-200/50'),
                          !isPlaying && !isSelected && (isDarkSurface ? 'hover:bg-white/[0.06]' : 'hover:bg-amber-900/[0.06]')
                        )}
                      >
                        <GuqinJianziGlyph
                          jianzi={note.markings.jianzi!}
                          size="md"
                          orientation="vertical"
                          accentClass={accentClass}
                          inkClass={noteColorClass}
                        />
                      </button>
                      {/* Traditional 句读 vermilion phrase dot */}
                      {phraseEnd && (
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute -bottom-1 -left-1.5 text-[11px] font-serif leading-none select-none pointer-events-none',
                            phraseEnd === 'period' ? accentClass : 'opacity-45 ' + inkClass
                          )}
                        >
                          {phraseEnd === 'period' ? '。' : '、'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {textNotes.length > 0 && (
          <div className={cn('space-y-1.5 text-xs sm:text-sm pt-2 border-t', isDarkSurface ? 'border-white/[0.08] text-neutral-400' : 'border-neutral-200/80 text-neutral-600')}>
            {textNotes.map(t => (
              <p key={t.id}>{t.text}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Pure Horizontal Jianzipu View (纯减字横排)
  return (
    <div className="flex flex-col gap-6">
      {document.lines.map(line => {
        if (line.kind === 'section') {
          return (
            <div
              key={line.id}
              style={{ fontFamily: CLASSICAL_SERIF_FONT }}
              className={cn(
                'pt-2 text-base font-bold tracking-[0.12em]',
                accentClass
              )}
            >
              {line.text}
            </div>
          );
        }

        if (line.kind === 'text') {
          return (
            <p
              key={line.id}
              className={cn(
                'text-xs sm:text-sm leading-relaxed pt-2 border-t',
                isDarkSurface ? 'text-neutral-400 border-white/[0.06]' : 'text-neutral-600 border-neutral-200/80'
              )}
            >
              {line.text}
            </p>
          );
        }

        const measuresWithJianzi = line.measures
          .map(m => ({
            id: m.id,
            notes: m.groups.flatMap(g => g.notes).filter(n => Boolean(n.markings.jianzi))
          }))
          .filter(m => m.notes.length > 0);

        if (measuresWithJianzi.length === 0) return null;

        return (
          <div
            key={line.id}
            className={cn(
              'flex flex-wrap items-end gap-x-2 gap-y-5 pb-3 border-b border-dashed',
              isDarkSurface ? 'border-white/[0.08]' : 'border-[#8C6D46]/25'
            )}
          >
            {measuresWithJianzi.map((m, mIdx) => {
              const isLastMeasure = mIdx === measuresWithJianzi.length - 1;
              return (
                <div key={m.id} className="inline-flex items-end gap-1.5">
                  {m.notes.map(note => {
                    const isPlaying = activeNoteId === note.id;
                    const isSelected =
                      selectedOffset !== null &&
                      selectedOffset !== undefined &&
                      selectedOffset >= note.startOffset &&
                      selectedOffset <= note.endOffset;
                    const noteColorClass = isPlaying ? 'text-[#E05A2B]' : inkClass;

                    return (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => onNoteClick?.(note)}
                        className={cn(
                          'px-1.5 py-1 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E05A2B]',
                          isPlaying && (isDarkSurface ? 'bg-[#E05A2B]/30 ring-1 ring-[#E05A2B]' : 'bg-[#E05A2B]/15 ring-1 ring-[#E05A2B]'),
                          !isPlaying && isSelected && (isDarkSurface ? 'bg-white/10' : 'bg-amber-100/80'),
                          !isPlaying && !isSelected && (isDarkSurface ? 'hover:bg-white/[0.06]' : 'hover:bg-neutral-100')
                        )}
                      >
                        <GuqinJianziGlyph
                          jianzi={note.markings.jianzi!}
                          size="md"
                          orientation="horizontal"
                          accentClass={accentClass}
                          inkClass={noteColorClass}
                        />
                      </button>
                    );
                  })}
                  {/* Phrase breath punctuation */}
                  <span
                    aria-hidden="true"
                    style={{ fontFamily: CLASSICAL_SERIF_FONT }}
                    className={cn(
                      'text-sm select-none mr-2',
                      isLastMeasure ? accentClass : 'opacity-45 ' + inkClass
                    )}
                  >
                    {isLastMeasure ? '。' : '、'}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function MusoJianpuRenderer({
  document,
  zoom = 1,
  paperTheme = 'paper',
  resolvedTheme,
  fingeringStyle = 'chinese',
  guqinDisplayMode = 'dual',
  shakuhachiDisplayMode = 'dual',
  shakuhachiSchool,
  showMarkings = true,
  showLyrics = true,
  highlightMarkings = true,
  activeNoteId,
  selectedOffset,
  onNoteClick
}: MusoJianpuRendererProps) {
  const isDarkSurface = paperTheme === 'adaptive';
  const keyInfo = getErhuKeyInfo(document.header.key);
  const stringsLabel = document.header.strings || keyInfo.strings;
  const isPureJianzipuMode =
    guqinDisplayMode === 'pure-horizontal' || guqinDisplayMode === 'pure-vertical';
  const isVerticalShakuhachiMode =
    shakuhachiDisplayMode === 'kinko-vertical' || shakuhachiDisplayMode === 'tozan-vertical';
  const resolvedShakuhachiSchool: ShakuhachiSchool =
    shakuhachiDisplayMode === 'tozan-vertical'
      ? 'tozan'
      : shakuhachiDisplayMode === 'kinko-vertical'
        ? 'kinko'
        : (shakuhachiSchool || document.header.school || 'kinko');
  const isFreeRhythm =
    document.header.rhythmMode === 'free' ||
    /^(?:free|散拍|散板|無拍子|无拍子|自由|honkyoku)$/i.test((document.header.time || '').trim());

  const [timeNum, timeDen] = (document.header.time || '4/4').split('/');

  return (
    <div
      className="musojianpu-print-sheet w-full overflow-x-auto"
      style={{
        transform: zoom !== 1 ? `scale(${zoom})` : undefined,
        transformOrigin: 'top left',
        width: zoom !== 1 ? `${100 / zoom}%` : '100%'
      }}
    >
      <div
        className={cn(
          'mx-auto max-w-[920px] rounded-2xl border px-6 sm:px-12 py-8 sm:py-10 transition-colors',
          isDarkSurface
            ? 'bg-[#17191E] border-white/[0.08] text-neutral-100'
            : 'bg-[#FFFEFA] border-neutral-200/90 text-[#161616] shadow-sm'
        )}
      >
        {/* Classic Score Header (omitted in pure-vertical modes because the rightmost colophon column carries it) */}
        {guqinDisplayMode !== 'pure-vertical' && !isVerticalShakuhachiMode && (
          <>
            <div className="text-center mb-6">
              <h1 className={cn(
                'text-2xl sm:text-3xl font-bold tracking-tight text-balance',
                isDarkSurface ? 'text-white' : 'text-[#121212]'
              )}>
                {document.header.title}
              </h1>
              {document.header.subtitle && (
                <p className={cn(
                  'text-sm mt-1 font-medium',
                  isDarkSurface ? 'text-neutral-400' : 'text-neutral-600'
                )}>
                  {document.header.subtitle}
                </p>
              )}
            </div>

            {/* Metadata Row: Left (1=Key, Strings, Time Signature, Tempo/Mood) | Right (Composer / Arranger) */}
            <div className={cn(
              'flex flex-wrap items-end justify-between gap-4 pb-4 mb-6 border-b',
              isDarkSurface ? 'border-white/[0.08]' : 'border-neutral-200'
            )}>
              {/* Left Musical Signature Block */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {/* Key & Instrument Tuning */}
                <div className="flex items-baseline gap-1.5">
                  {!isPureJianzipuMode && (
                    <span className="text-base sm:text-lg font-bold tabular-nums tracking-tight">
                      {formatJianpuKeyLabel(document.header.key)}
                    </span>
                  )}
                  <span className={cn(
                    'text-xs font-semibold',
                    highlightMarkings
                      ? (isDarkSurface ? 'text-[#FF6B3D]' : 'text-[#C23E1E]')
                      : (isDarkSurface ? 'text-neutral-400' : 'text-neutral-600')
                  )}>
                    {document.header.instrument === 'pipa'
                      ? `琵琶 (${document.header.strings || 'A-d-e-a'})`
                      : document.header.instrument === 'guzheng'
                        ? `古筝${document.header.strings ? ` (${document.header.strings})` : ''}`
                        : document.header.instrument === 'guqin'
                          ? `古琴 (${document.header.strings || '正调 5-6-1-2-3-5-6'})`
                          : document.header.instrument === 'shakuhachi'
                            ? `尺八 ${getShakuhachiLengthInfo(document.header.fluteKey).label} · ${resolvedShakuhachiSchool === 'tozan' ? '都山流' : '琴古流'}`
                            : document.header.instrument === 'dizi'
                              ? `${document.header.fluteKey || '笛子'}${document.header.fingering ? ` · ${document.header.fingering}` : ''}`
                              : document.header.instrument === 'xiao'
                                ? `${document.header.fluteKey || '洞箫'}${document.header.fingering ? ` · ${document.header.fingering}` : ''}`
                                : `(${stringsLabel}弦)`}
                  </span>
                </div>

                {/* Stacked Time Signature or Free Rhythm Honkyoku indicator */}
                {!isPureJianzipuMode && (
                  isFreeRhythm ? (
                    <span
                      style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                      className={cn(
                        'text-xs font-bold tracking-wide px-1.5 py-0.5 rounded border',
                        isDarkSurface ? 'border-white/15 text-neutral-200' : 'border-neutral-300 text-neutral-800'
                      )}
                    >
                      散拍 Free
                    </span>
                  ) : timeDen ? (
                    <div className="inline-flex flex-col items-center leading-none font-bold tabular-nums text-sm">
                      <span>{timeNum}</span>
                      <span className="w-3.5 h-[1.5px] bg-current my-[1.5px]" />
                      <span>{timeDen}</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold">{document.header.time}</span>
                  )
                )}

                {/* Tempo & Expression */}
                <div className="flex items-baseline gap-2 text-sm">
                  {!isPureJianzipuMode && !isFreeRhythm && (
                    <span className="font-mono tabular-nums font-semibold">
                      ♩= {document.header.tempo}
                    </span>
                  )}
                  {document.header.expression && (
                    <span className={cn('text-xs sm:text-sm font-medium', isDarkSurface ? 'text-neutral-300' : 'text-neutral-700')}>
                      {document.header.expression}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Credits Block */}
              <div className={cn(
                'text-right text-xs sm:text-sm leading-snug',
                isDarkSurface ? 'text-neutral-400' : 'text-neutral-600'
              )}>
                {document.header.composer && (
                  <div className="font-semibold">{document.header.composer}</div>
                )}
                {document.header.arranger && (
                  <div className="text-xs opacity-80">{document.header.arranger}</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Engraved Score Body */}
        {document.lines.length === 0 ? (
          <div className={cn(
            'py-16 text-center text-sm',
            isDarkSurface ? 'text-neutral-500' : 'text-neutral-400'
          )}>
            Start typing Jianpu notes in the editor (e.g. <span className="font-mono">| 1 2 3 5 | 6_5_ 3 - |</span>) or pick a repertoire template above.
          </div>
        ) : isVerticalShakuhachiMode ? (
          <ShakuhachiVerticalView
            document={document}
            school={resolvedShakuhachiSchool}
            isDarkSurface={isDarkSurface}
            highlightMarkings={highlightMarkings}
            showMarkings={showMarkings}
            activeNoteId={activeNoteId}
            selectedOffset={selectedOffset}
            onNoteClick={onNoteClick}
          />
        ) : isPureJianzipuMode ? (
          <PureJianzipuView
            document={document}
            mode={guqinDisplayMode}
            isDarkSurface={isDarkSurface}
            highlightMarkings={highlightMarkings}
            activeNoteId={activeNoteId}
            selectedOffset={selectedOffset}
            onNoteClick={onNoteClick}
          />
        ) : (
          <div className="flex flex-col gap-5 pl-4">
            {document.lines.map(line => {
              if (line.kind === 'section') {
                return (
                  <div
                    key={line.id}
                    className={cn(
                      'pt-2 pb-1 text-sm font-bold tracking-wide',
                      isDarkSurface ? 'text-neutral-200' : 'text-neutral-800'
                    )}
                  >
                    {line.text}
                  </div>
                );
              }

              if (line.kind === 'text') {
                return (
                  <p
                    key={line.id}
                    className={cn(
                      'text-xs sm:text-sm leading-relaxed pt-2 border-t',
                      isDarkSurface ? 'text-neutral-400 border-white/[0.06]' : 'text-neutral-600 border-neutral-200/80'
                    )}
                  >
                    {line.text}
                  </p>
                );
              }

              return (
                <MusicLineView
                  key={line.id}
                  line={line}
                  instrument={document.header.instrument}
                  keyName={document.header.key}
                  fluteKey={document.header.fluteKey}
                  shakuhachiSchool={resolvedShakuhachiSchool}
                  isFreeRhythm={isFreeRhythm}
                  fingeringStyle={fingeringStyle}
                  showMarkings={showMarkings}
                  showLyrics={showLyrics}
                  highlightMarkings={highlightMarkings}
                  activeNoteId={activeNoteId}
                  selectedOffset={selectedOffset}
                  isDarkSurface={isDarkSurface}
                  onNoteClick={onNoteClick}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
