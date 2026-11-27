/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BarlineType,
  BeatGroup,
  BowingType,
  GraceNote,
  MusicLineNode,
  OrnamentType,
  MusoJianpuDocument,
  MusoJianpuMeasure,
  MusoJianpuNote
} from '../../lib/musojianpu/types.ts';
import { CHINESE_FINGERS, formatJianpuKeyLabel, getErhuKeyInfo } from '../../lib/musojianpu/erhuKeys.ts';
import { cn } from '../../lib/utils.ts';

export interface MusoJianpuRendererProps {
  document: MusoJianpuDocument;
  zoom?: number;
  paperTheme?: 'paper' | 'adaptive';
  resolvedTheme: string;
  fingeringStyle?: 'chinese' | 'arabic';
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
function OrnamentGlyph({ type, className }: { type: OrnamentType; className?: string }) {
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
    case 'da':
      return (
        <span className={cn('text-[9px] font-semibold leading-none', className)} title="打音">
          打
        </span>
      );
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

interface SlurArc {
  id: number;
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

/**
 * Renders one Music Line (system of measures) with accurate SVG slur arcs measured across DOM note boxes.
 */
function MusicLineView({
  line,
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

  const hasAnyLyrics = useMemo(() => {
    if (!showLyrics) return false;
    return line.measures.some(m =>
      m.groups.some(g => g.notes.some(n => Boolean(n.lyric)))
    );
  }, [line, showLyrics]);

  const hasAnyDynamics = useMemo(() => {
    if (!showMarkings) return false;
    return line.measures.some(m =>
      m.groups.some(g => g.notes.some(n => Boolean(n.markings.dynamic)))
    );
  }, [line, showMarkings]);

  const barlineBottomOffset = 25 + (hasAnyDynamics ? 16 : 0) + (hasAnyLyrics ? 24 : 0);
  const measureNumberBottomOffset = 31 + (hasAnyDynamics ? 16 : 0) + (hasAnyLyrics ? 24 : 0);

  const measureSlurs = () => {
    const container = lineContainerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const scale = container.offsetWidth > 0 ? containerRect.width / container.offsetWidth : 1;

    // Group notes by slurId across the line
    const slurGroups = new Map<number, MusoJianpuNote[]>();
    for (const m of line.measures) {
      for (const g of m.groups) {
        for (const n of g.notes) {
          if (n.slurId !== undefined) {
            const arr = slurGroups.get(n.slurId) || [];
            arr.push(n);
            slurGroups.set(n.slurId, arr);
          }
        }
      }
    }

    const nextArcs: SlurArc[] = [];
    slurGroups.forEach((notes, slurId) => {
      if (notes.length < 2) return;
      const firstEl = noteElMapRef.current.get(notes[0].id);
      const lastEl = noteElMapRef.current.get(notes[notes.length - 1].id);
      if (!firstEl || !lastEl) return;

      const r1 = firstEl.getBoundingClientRect();
      const r2 = lastEl.getBoundingClientRect();

      // Only draw continuous arc if both notes are on the same wrapped visual row
      if (Math.abs(r1.top - r2.top) / scale > 40) return;

      const x1 = (r1.left - containerRect.left + r1.width * 0.5) / scale;
      const x2 = (r2.left - containerRect.left + r2.width * 0.5) / scale;
      const minDigitTop = (Math.min(r1.top, r2.top) - containerRect.top) / scale;

      const maxOctave = notes.reduce((max, n) => Math.max(max, n.octave), 0);
      const octaveClearance = maxOctave >= 2 ? 12 : maxOctave === 1 ? 7 : 1;

      if (x2 > x1 + 4) {
        nextArcs.push({
          id: slurId,
          x1,
          x2,
          y: Math.max(4, minDigitTop - octaveClearance)
        });
      }
    });

    setSlurArcs(nextArcs);
  };

  useLayoutEffect(() => {
    measureSlurs();
  }, [line, showMarkings, showLyrics, fingeringStyle]);

  useEffect(() => {
    const el = lineContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measureSlurs());
    ro.observe(el);
    return () => ro.disconnect();
  }, [line]);

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
        : null;

    const harmonicOrnaments = note.markings.ornaments.filter(o => o === 'harm' || o === 'aharm');
    const positionShiftOrnaments = note.markings.ornaments.filter(o => o === 'shiftUp' || o === 'shiftDown');
    const slideOrnaments = note.markings.ornaments.filter(o => o === 'su' || o === 'sd');
    const upperOrnaments = note.markings.ornaments.filter(
      o => o !== 'su' && o !== 'sd' && o !== 'harm' && o !== 'aharm' && o !== 'shiftUp' && o !== 'shiftDown'
    );
    const hasTopPerformanceRow = Boolean(
      note.markings.bowing || upperOrnaments.length > 0 || note.markings.customText
    );
    const hasPositionRow = Boolean(note.markings.position || positionShiftOrnaments.length > 0);

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
            {hasAnyLyrics && <div className="h-[20px] mt-1" aria-hidden="true" />}
          </div>
        )}

        {/* Main Note Column */}
        <div className="flex flex-col items-center justify-end">
          {/* Top Markings Stack (Bottom-first closest to note: Harmonics → Fingers → String → Position, then Bowing/Ornaments above) */}
          {showMarkings && (
            <div className="flex flex-col items-center justify-end gap-[2px] min-h-[34px] mb-0.5 select-none">
              {/* Topmost: Bowing, Other Ornaments & Custom Text */}
              {hasTopPerformanceRow && (
                <div className="flex items-center justify-center gap-0.5 min-h-[13px] whitespace-nowrap">
                  {note.markings.bowing && (
                    <BowingGlyph type={note.markings.bowing} className={erhuAccentClass} />
                  )}
                  {upperOrnaments.map((orn, idx) => (
                    <OrnamentGlyph key={idx} type={orn} className={erhuAccentClass} />
                  ))}
                  {note.markings.customText && (
                    <span className={cn('text-[9.5px] font-medium leading-none whitespace-nowrap', subtleInkClass)}>
                      {note.markings.customText}
                    </span>
                  )}
                </div>
              )}

              {/* Layer 4 (Top of left-hand stack): Position */}
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

              {/* Layer 3: String (内 / 外) */}
              {stringDisplay && (
                <div className="flex items-center justify-center min-h-[12px] leading-none">
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
              {harmonicOrnaments.length > 0 && (
                <div className="flex items-center justify-center gap-0.5 min-h-[11px] leading-none">
                  {harmonicOrnaments.map((orn, idx) => (
                    <OrnamentGlyph key={idx} type={orn} className={erhuAccentClass} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reserved vertical lane for High Octave Dots & Slur Arcs */}
          <div className="h-[16px] mb-[2px]" aria-hidden="true" />

          {/* Main Pitch Numeral Row (with optional Slide, Accidental, Dot, Tie) */}
          <div className="relative flex items-center justify-center leading-none h-[24px]">
            {/* Slide Arrows (上滑音 / 下滑音 leading into the note from the left) */}
            {showMarkings && slideOrnaments.length > 0 && (
              <span className="inline-flex items-center mr-[1px]">
                {slideOrnaments.map((sOrn, sIdx) => (
                  <OrnamentGlyph key={sIdx} type={sOrn} className={erhuAccentClass} />
                ))}
              </span>
            )}

            {/* Accidental */}
            {note.accidental && (
              <span className={cn('text-[11px] font-bold -translate-y-1.5 mr-[0.5px] leading-none', inkClass)}>
                {note.accidental === '#' ? '♯' : note.accidental === 'b' ? '♭' : '♮'}
              </span>
            )}

            {/* Core Jianpu Digit or Prolongation Dash (anchors octave dots & slurs to the digit itself) */}
            <span
              ref={registerNoteRef(note.id)}
              className={cn(
                'relative inline-flex items-center justify-center h-[22px] text-[21px] font-bold tabular-nums tracking-tight leading-none select-text',
                noteColorClass
              )}
              style={{ fontFamily: '"Plus Jakarta Sans", "Noto Sans SC", system-ui, sans-serif' }}
            >
              {/* High Octave Dots anchored directly above the digit */}
              {note.octave >= 1 && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-full left-1/2 -translate-x-1/2 pb-[2px] flex flex-col items-center gap-[2px] pointer-events-none"
                >
                  {note.octave >= 2 && <span className={cn('w-[3.5px] h-[3.5px] rounded-full bg-current', inkClass)} />}
                  <span className={cn('w-[3.5px] h-[3.5px] rounded-full bg-current', inkClass)} />
                </span>
              )}

              {note.degree === -1 ? '–' : note.degree}

              {/* Low Octave Dots anchored directly below the digit & duration underlines */}
              {note.octave <= -1 && (
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
                  {note.octave <= -2 && <span className={cn('w-[3.5px] h-[3.5px] rounded-full bg-current', inkClass)} />}
                </span>
              )}
            </span>

            {/* Augmentation Dot(s) */}
            {note.dots > 0 && (
              <span
                className={cn(
                  'inline-flex items-center',
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
            {hasAnyLyrics && <div className="h-[20px] mt-1" aria-hidden="true" />}
          </div>
        )}
      </button>
    );
  };

  return (
    <div ref={lineContainerRef} className="relative w-full pt-2 pb-3">
      {/* SVG Slur Overlay Layer */}
      {slurArcs.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
          {slurArcs.map(arc => {
            const midX = (arc.x1 + arc.x2) / 2;
            const span = arc.x2 - arc.x1;
            const lift = Math.min(13, Math.max(7, span * 0.12));
            const yBase = arc.y;
            return (
              <path
                key={arc.id}
                d={`M ${arc.x1} ${yBase} Q ${midX} ${yBase - lift} ${arc.x2} ${yBase}`}
                fill="none"
                stroke={isDarkSurface ? '#E5E7EB' : '#1A1A1A'}
                strokeWidth="1.45"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      )}

      {/* Measures Flex Row */}
      <div className="flex flex-wrap items-end gap-y-7 w-full">
        {line.measures.map((measure: MusoJianpuMeasure, mIdx: number) => {
          const isLastInLine = mIdx === line.measures.length - 1;
          const measureWeight = getMeasureBeatWeight(measure);
          return (
            <div
              key={measure.id}
              style={{ flex: `${measureWeight} 0 auto` }}
              className="relative flex items-end"
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

              {/* Volta Bracket ([1. / [2.) */}
              {measure.volta && (
                <div className={cn(
                  'absolute -top-2 left-1 right-1 h-3.5 border-t border-l flex items-start pl-1 text-[10px] font-bold leading-none pt-0.5 pointer-events-none',
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

              {/* End Barline */}
              {(measure.endBarline || !isLastInLine) && (
                <div className="ml-2 shrink-0 self-end" style={{ marginBottom: `${barlineBottomOffset}px` }}>
                  <BarlineGlyph type={measure.endBarline || '|'} inkClass={inkClass} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MusoJianpuRenderer({
  document,
  zoom = 1,
  paperTheme = 'paper',
  resolvedTheme,
  fingeringStyle = 'chinese',
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
        {/* Classic Chinese Jianpu Score Header */}
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
            {/* Key & Erhu Strings */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold tabular-nums tracking-tight">
                {formatJianpuKeyLabel(document.header.key)}
              </span>
              <span className={cn(
                'text-xs font-semibold',
                highlightMarkings
                  ? (isDarkSurface ? 'text-[#FF6B3D]' : 'text-[#C23E1E]')
                  : (isDarkSurface ? 'text-neutral-400' : 'text-neutral-600')
              )}>
                ({stringsLabel}弦)
              </span>
            </div>

            {/* Stacked Time Signature */}
            {timeDen ? (
              <div className="inline-flex flex-col items-center leading-none font-bold tabular-nums text-sm">
                <span>{timeNum}</span>
                <span className="w-3.5 h-[1.5px] bg-current my-[1.5px]" />
                <span>{timeDen}</span>
              </div>
            ) : (
              <span className="text-sm font-bold">{document.header.time}</span>
            )}

            {/* Tempo & Expression */}
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-mono tabular-nums font-semibold">
                ♩= {document.header.tempo}
              </span>
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

        {/* Engraved Score Body */}
        {document.lines.length === 0 ? (
          <div className={cn(
            'py-16 text-center text-sm',
            isDarkSurface ? 'text-neutral-500' : 'text-neutral-400'
          )}>
            Start typing Jianpu notes in the editor (e.g. <span className="font-mono">| 1 2 3 5 | 6_5_ 3 - |</span>) or pick an Erhu repertoire template above.
          </div>
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
