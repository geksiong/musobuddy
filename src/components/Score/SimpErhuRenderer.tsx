/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BarlineType,
  BeatGroup,
  BowingType,
  MusicLineNode,
  OrnamentType,
  SimpErhuDocument,
  SimpErhuMeasure,
  SimpErhuNote
} from '../../lib/simperhu/types.ts';
import { CHINESE_FINGERS, formatJianpuKeyLabel, getErhuKeyInfo } from '../../lib/simperhu/erhuKeys.ts';
import { cn } from '../../lib/utils.ts';

export interface SimpErhuRendererProps {
  document: SimpErhuDocument;
  zoom?: number;
  paperTheme?: 'paper' | 'adaptive';
  resolvedTheme: string;
  fingeringStyle?: 'chinese' | 'arabic';
  showMarkings?: boolean;
  showLyrics?: boolean;
  highlightMarkings?: boolean;
  activeNoteId?: string | null;
  selectedOffset?: number | null;
  customFontFamily?: string | null;
  onNoteClick?: (note: SimpErhuNote) => void;
}

/**
 * Vector Erhu Bowing Symbol (authentic Chinese Jianpu / SimpErhu geometry)
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
  customFontFamily,
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
  customFontFamily?: string | null;
  onNoteClick?: (note: SimpErhuNote) => void;
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

  const measureSlurs = () => {
    const container = lineContainerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const scale = container.offsetWidth > 0 ? containerRect.width / container.offsetWidth : 1;

    // Group notes by slurId across the line
    const slurGroups = new Map<number, SimpErhuNote[]>();
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
  }, [line, showMarkings, showLyrics, fingeringStyle, customFontFamily]);

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

  const renderNoteCell = (note: SimpErhuNote, group: BeatGroup, noteIdxInGroup: number) => {
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

    const upperOrnaments = note.markings.ornaments.filter(o => o !== 'su' && o !== 'sd');
    const slideOrnaments = note.markings.ornaments.filter(o => o === 'su' || o === 'sd');

    // Continuous beaming logic across adjacent notes in the same BeatGroup
    const prevUnderlines = noteIdxInGroup > 0 ? group.notes[noteIdxInGroup - 1].underlines : 0;
    const nextUnderlines = noteIdxInGroup < group.notes.length - 1 ? group.notes[noteIdxInGroup + 1].underlines : 0;

    return (
      <button
        key={note.id}
        type="button"
        onClick={() => onNoteClick?.(note)}
        title={`Line ${note.lineNumber} · Click to edit in source`}
        className={cn(
          'relative flex flex-col items-center justify-end group/note px-[4px] pt-1 pb-0.5 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E05A2B]',
          isPlaying && (isDarkSurface ? 'bg-[#E05A2B]/30 ring-1 ring-[#E05A2B]' : 'bg-[#E05A2B]/15 ring-1 ring-[#E05A2B]'),
          !isPlaying && isSelected && (isDarkSurface ? 'bg-white/10' : 'bg-amber-100/80'),
          !isPlaying && !isSelected && (isDarkSurface ? 'hover:bg-white/[0.06]' : 'hover:bg-neutral-100')
        )}
      >
        {/* Top Markings Lanes (Reserved height so rows stay aligned cleanly) */}
        {showMarkings && (
          <div className="flex flex-col items-center justify-end min-h-[34px] mb-0.5 select-none">
            {/* Lane 1: Dynamics + Bowing */}
            <div className="flex items-center justify-center gap-1 min-h-[14px]">
              {note.markings.dynamic && (
                <span className={cn('text-[10px] font-serif italic font-bold leading-none', isDarkSurface ? 'text-amber-300' : 'text-neutral-800')}>
                  {note.markings.dynamic}
                </span>
              )}
              {note.markings.bowing && (
                <BowingGlyph type={note.markings.bowing} className={erhuAccentClass} />
              )}
              {upperOrnaments.map((orn, idx) => (
                <OrnamentGlyph key={idx} type={orn} className={erhuAccentClass} />
              ))}
            </div>

            {/* Lane 2: String + Fingering + Custom Text */}
            <div className="flex items-center justify-center gap-0.5 min-h-[14px]">
              {stringDisplay && (
                <span className={cn('text-[10px] font-bold leading-none', erhuAccentClass)}>
                  {stringDisplay}
                </span>
              )}
              {fingerDisplay && (
                <span className={cn('text-[10.5px] font-semibold leading-none', inkClass)}>
                  {fingerDisplay}
                </span>
              )}
              {note.markings.customText && (
                <span className={cn('text-[9.5px] font-medium leading-none whitespace-nowrap', subtleInkClass)}>
                  {note.markings.customText}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Reserved vertical lane for High Octave Dots & Slur Arcs */}
        <div className="h-[16px] mb-[2px]" aria-hidden="true" />

        {/* Main Pitch Numeral Row (with optional Grace Notes, Accidental, Dot, Slide) */}
        <div className="relative flex items-center justify-center leading-none h-[24px]">
          {/* Grace Notes (Superscript miniature Jianpu) */}
          {note.graceNotes.length > 0 && (
            <span className="inline-flex items-baseline mr-0.5 -translate-y-2 text-[10px] font-semibold opacity-85">
              {note.graceNotes.map((gn, gIdx) => (
                <span key={gIdx} className="inline-flex flex-col items-center mx-[0.5px]">
                  <span className="leading-none">
                    {gn.accidental === '#' ? '♯' : gn.accidental === 'b' ? '♭' : ''}
                    {gn.degree}
                  </span>
                  <span className="w-full h-[1px] bg-current mt-[1px]" />
                  <span className="w-full h-[1px] bg-current mt-[1px]" />
                </span>
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
              isPlaying ? 'text-[#E05A2B]' : inkClass
            )}
            style={customFontFamily ? { fontFamily: `"${customFontFamily}", serif` } : { fontFamily: '"Plus Jakarta Sans", "Noto Sans SC", system-ui, sans-serif' }}
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
            <span className={cn('inline-flex items-center gap-[2px] ml-[2px]', inkClass)}>
              {Array.from({ length: note.dots }).map((_, dIdx) => (
                <span key={dIdx} className="w-[3.5px] h-[3.5px] rounded-full bg-current inline-block" />
              ))}
            </span>
          )}

          {/* Slide Arrows (上滑音 / 下滑音 right beside note, authentic SimpErhu placement!) */}
          {showMarkings && slideOrnaments.length > 0 && (
            <span className="inline-flex items-center ml-[1px]">
              {slideOrnaments.map((sOrn, sIdx) => (
                <OrnamentGlyph key={sIdx} type={sOrn} className={erhuAccentClass} />
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
                className={cn(
                  'h-[1.5px] bg-current transition-none',
                  isPlaying ? 'text-[#E05A2B]' : inkClass
                )}
                style={{
                  marginLeft: connectLeft ? '-4px' : '1px',
                  marginRight: connectRight ? '-4px' : '1px'
                }}
              />
            );
          })}
        </div>

        {/* Reserved vertical lane for Low Octave Dots */}
        <div className="h-[11px] mt-[1px]" aria-hidden="true" />

        {/* Aligned Lyric Syllable */}
        {hasAnyLyrics && (
          <div className={cn('h-[20px] mt-1 text-[13px] font-medium leading-tight whitespace-nowrap', isDarkSurface ? 'text-neutral-200' : 'text-neutral-800')}>
            {note.lyric || ''}
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
      <div className="flex flex-wrap items-end gap-y-6 w-full">
        {line.measures.map((measure: SimpErhuMeasure, mIdx: number) => {
          const isLastInLine = mIdx === line.measures.length - 1;
          return (
            <div
              key={measure.id}
              className="relative flex items-end grow basis-[180px] min-w-0"
            >
              {/* Measure Number subtle cue on first measure of each line */}
              {mIdx === 0 && (
                <span
                  className={cn(
                    'absolute -left-5 text-[10px] font-mono tabular-nums opacity-40 select-none',
                    hasAnyLyrics ? 'bottom-[55px]' : 'bottom-[31px]',
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
                <div className={cn('mr-2 self-end', hasAnyLyrics ? 'mb-[49px]' : 'mb-[25px]')}>
                  <BarlineGlyph type={measure.startBarline} inkClass={inkClass} />
                </div>
              )}

              {/* Beat Groups inside Measure */}
              <div className="flex items-end justify-around flex-1 gap-2 px-1.5">
                {measure.groups.map(group => {
                  const hasTuplet = group.notes.some(n => n.tupletStart);
                  const tupletNum = group.notes.find(n => n.tupletStart)?.tupletStart;
                  return (
                    <div key={group.id} className="relative flex items-end">
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
                <div className={cn('ml-2 self-end', hasAnyLyrics ? 'mb-[49px]' : 'mb-[25px]')}>
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

export function SimpErhuRenderer({
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
  customFontFamily,
  onNoteClick
}: SimpErhuRendererProps) {
  const isDarkSurface = paperTheme === 'adaptive' && resolvedTheme === 'dark';
  const keyInfo = getErhuKeyInfo(document.header.key);
  const stringsLabel = document.header.strings || keyInfo.strings;

  const [timeNum, timeDen] = (document.header.time || '4/4').split('/');

  return (
    <div
      className="simperhu-print-sheet w-full overflow-x-auto"
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
                  customFontFamily={customFontFamily}
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
