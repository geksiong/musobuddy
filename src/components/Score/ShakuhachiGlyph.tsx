/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shakuhachi (尺八) visual engraving components:
 * 1. `ShakuhachiHoleDiagram` — 5-hole vertical fingering chart SVG
 * 2. `ShakuhachiDualGlyph` — compact Kinko/Tozan katakana + bend/technique cue beneath Jianpu digits
 * 3. `ShakuhachiVerticalView` — authentic right-to-left vertical scroll renderer for both
 *    Kinko-ryu (琴古流) and Tozan-ryu (都山流), supporting metrical rhythm and free-rhythm
 *    Honkyoku (散拍・本曲) with Jin Nyodo (神如道) vertical annotations & pitch-bend vectors.
 */

import React, { useMemo } from 'react';
import {
  MusoJianpuDocument,
  MusoJianpuNote,
  ShakuhachiBendType,
  ShakuhachiNoteData,
  ShakuhachiSchool
} from '../../lib/musojianpu/types.ts';
import {
  describeShakuhachiNote,
  getEffectiveMeriKariForSchool,
  getShakuhachiKatakana,
  getShakuhachiLengthInfo,
  HoleState,
  inferShakuhachiFromMidi,
  SHAKUHACHI_BEND_LABELS,
  SHAKUHACHI_MERIKARI_LABELS,
  SHAKUHACHI_TECHNIQUE_LABELS
} from '../../lib/musojianpu/shakuhachi.ts';
import { getErhuKeyInfo } from '../../lib/musojianpu/erhuKeys.ts';
import { cn } from '../../lib/utils.ts';

export const SHAKUHACHI_SERIF_FONT =
  '"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif SC", "Songti SC", serif';

/**
 * Compact 5-hole Shakuhachi vertical fingering chart SVG.
 * Holes order: [thumb5 (back), hole4, hole3, hole2, hole1 (bottom)].
 */
export function ShakuhachiHoleDiagram({
  holes,
  size = 'md',
  className
}: {
  holes: [HoleState, HoleState, HoleState, HoleState, HoleState];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dims =
    size === 'sm'
      ? { w: 18, h: 42, r: 2.6 }
      : size === 'lg'
        ? { w: 28, h: 68, r: 4.2 }
        : { w: 22, h: 52, r: 3.3 };

  // Y positions inside 24x64 viewBox: thumb (back) at top-right, holes 4..1 centered down the front
  const positions = [
    { cx: 16.5, cy: 8.5, isThumb: true },
    { cx: 10.5, cy: 20.5, isThumb: false },
    { cx: 10.5, cy: 32.5, isThumb: false },
    { cx: 10.5, cy: 44.5, isThumb: false },
    { cx: 10.5, cy: 56.5, isThumb: false }
  ];

  return (
    <svg
      viewBox="0 0 24 64"
      width={dims.w}
      height={dims.h}
      className={cn('inline-block shrink-0', className)}
      aria-hidden="true"
    >
      {/* Subtle bamboo vertical spine */}
      <line x1="10.5" y1="4" x2="10.5" y2="61" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.2" />
      {/* Small divider tick separating back thumb hole (5) from front holes (4-1) */}
      <line x1="5" y1="14.5" x2="19.5" y2="14.5" stroke="currentColor" strokeOpacity="0.24" strokeWidth="0.9" strokeDasharray="1.8 1.5" />

      {holes.map((state, idx) => {
        const pos = positions[idx];
        const r = pos.isThumb ? 3.4 : 3.9;
        if (state === 'closed') {
          return (
            <circle
              key={idx}
              cx={pos.cx}
              cy={pos.cy}
              r={r}
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          );
        }
        if (state === 'half') {
          return (
            <g key={idx}>
              <circle cx={pos.cx} cy={pos.cy} r={r} fill="none" stroke="currentColor" strokeWidth="1.3" />
              <path
                d={`M ${pos.cx - r} ${pos.cy} A ${r} ${r} 0 0 1 ${pos.cx + r} ${pos.cy} Z`}
                fill="currentColor"
              />
            </g>
          );
        }
        return (
          <circle
            key={idx}
            cx={pos.cx}
            cy={pos.cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
          />
        );
      })}
    </svg>
  );
}

/**
 * Miniature SVG pitch-bend glyph used in Dual Horizontal mode and Reference cards.
 */
export function ShakuhachiBendIcon({
  type,
  className
}: {
  type: ShakuhachiBendType;
  className?: string;
}) {
  switch (type) {
    case 'nayashi': // 萎し: curved bloom from meri (low) into pitch
      return (
        <svg viewBox="0 0 14 14" className={cn('w-3 h-3 inline-block shrink-0', className)} aria-label="萎し Nayashi">
          <path d="M2.5 11.5C2.5 6.5 6.5 3.5 11.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="11.2" cy="2.6" r="1.2" fill="currentColor" />
        </svg>
      );
    case 'suri-up': // 擦り上げ
      return (
        <svg viewBox="0 0 14 14" className={cn('w-3 h-3 inline-block shrink-0', className)} aria-label="擦り上げ Suri-age">
          <path d="M2 11.5Q7 9.5 11.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8.2 2.4H11.8V6" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'suri-down': // 擦り下げ
      return (
        <svg viewBox="0 0 14 14" className={cn('w-3 h-3 inline-block shrink-0', className)} aria-label="擦り下げ Suri-sage">
          <path d="M2 2.5Q7 4.5 11.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8.2 11.6H11.8V8" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'merikomi': // メリ込み: steady then dip down
      return (
        <svg viewBox="0 0 14 14" className={cn('w-3 h-3 inline-block shrink-0', className)} aria-label="メリ込み Merikomi">
          <path d="M2 4.5H7.5Q10.5 4.5 11.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
        </svg>
      );
    case 'sori': // 反り: scoop up then settle
      return (
        <svg viewBox="0 0 16 12" className={cn('w-3.5 h-2.5 inline-block shrink-0', className)} aria-label="反り Sori">
          <path d="M1.5 9Q8 1.5 14.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'otoshi': // 落とし: Jin Nyodo sharp drop-off angle
      return (
        <svg viewBox="0 0 14 14" className={cn('w-3 h-3 inline-block shrink-0', className)} aria-label="落とし Otoshi">
          <path d="M2.5 3H8.5L11.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

/**
 * Compact horizontal Shakuhachi fingering glyph rendered directly beneath each Jianpu numeral in Dual mode.
 */
export function ShakuhachiDualGlyph({
  data,
  school = 'kinko',
  inkClass = 'text-current',
  accentClass = 'text-[#C23E1E]',
  isInferred = false
}: {
  data: ShakuhachiNoteData;
  school?: ShakuhachiSchool;
  inkClass?: string;
  accentClass?: string;
  isInferred?: boolean;
}) {
  const techniques = data.techniques || [];
  const bends = data.bends || [];
  const isMa = !data.fingering && techniques.includes('ma');
  const isBreathOnly = !data.fingering && techniques.includes('breath');

  const kana = data.fingering ? getShakuhachiKatakana(data.fingering, school) : null;
  const effectiveMk = getEffectiveMeriKariForSchool(data, school);
  const mkLabel = effectiveMk
    ? school === 'tozan'
      ? SHAKUHACHI_MERIKARI_LABELS[effectiveMk].tozan
      : SHAKUHACHI_MERIKARI_LABELS[effectiveMk].kinko
    : null;

  const regLabel =
    data.register === 'daikan' ? '大甲' : data.register === 'kan' ? '甲' : null;

  // Compact secondary technique tags to display neatly beneath the katakana
  const compactTechs = techniques
    .filter(t => t !== 'ma' && t !== 'suri')
    .slice(0, 2)
    .map(t => SHAKUHACHI_TECHNIQUE_LABELS[t].shortJp);

  const tooltip = describeShakuhachiNote(data, school);

  if (isMa) {
    return (
      <div
        className={cn('inline-flex flex-col items-center justify-center leading-none select-none', accentClass)}
        title={tooltip}
      >
        <span style={{ fontFamily: SHAKUHACHI_SERIF_FONT }} className="text-[15px] font-bold">
          〇
        </span>
        <span style={{ fontFamily: SHAKUHACHI_SERIF_FONT }} className="text-[8.5px] opacity-75 mt-0.5">
          間
        </span>
      </div>
    );
  }

  if (isBreathOnly) {
    return (
      <div
        className={cn('inline-flex flex-col items-center justify-center leading-none select-none', accentClass)}
        title={tooltip}
      >
        <span className="text-[12px] font-bold">∨</span>
        <span style={{ fontFamily: SHAKUHACHI_SERIF_FONT }} className="text-[8px] opacity-70 mt-0.5">
          息
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-start leading-none select-none',
        isInferred && 'opacity-70'
      )}
      title={isInferred ? `${tooltip} (auto-derived from pitch)` : tooltip}
    >
      {/* Primary Row: Optional Bend Icon + Katakana + Register / Meri-Kari micro-markers */}
      <div className="relative inline-flex items-baseline justify-center gap-[1px]">
        {bends.length > 0 && (
          <span className={cn('self-center -ml-0.5 mr-[1px]', accentClass)}>
            <ShakuhachiBendIcon type={bends[0]} className="w-2.5 h-2.5" />
          </span>
        )}

        {kana && (
          <span
            style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
            className={cn('text-[16px] font-bold leading-none tracking-tight', inkClass)}
          >
            {kana}
          </span>
        )}

        {(regLabel || mkLabel) && (
          <span className="inline-flex flex-col items-start justify-center ml-[1px] leading-none">
            {regLabel && (
              <span
                style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                className={cn('text-[7.5px] font-bold leading-none', accentClass)}
              >
                {regLabel}
              </span>
            )}
            {mkLabel && (
              <span
                style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                className={cn('text-[8px] font-bold leading-none mt-[1px]', inkClass, 'opacity-85')}
              >
                {mkLabel}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Compact Secondary Technique / Hold Row */}
      {(compactTechs.length > 0 || (data.holdLength && data.holdLength >= 2)) && (
        <div
          style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
          className={cn(
            'mt-[2px] flex items-center justify-center gap-0.5 text-[8.5px] font-semibold leading-none whitespace-nowrap',
            accentClass
          )}
        >
          {compactTechs.map((label, idx) => (
            <span key={idx}>{label}</span>
          ))}
          {data.holdLength && data.holdLength >= 2 && (
            <span className="opacity-70">{data.holdLength >= 3 ? '長長' : '長'}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Traditional Vertical Scroll Renderer (Kinko-ryu 琴古流 & Tozan-ryu 都山流)
// ============================================================================

const JIANPU_SCALE_SEMITONES = [0, 0, 2, 4, 5, 7, 9, 11];

function jianpuNoteToConcertMidi(note: MusoJianpuNote, keyName: string): number | null {
  if (note.degree < 1 || note.degree > 7) return null;
  const keyInfo = getErhuKeyInfo(keyName);
  let semi = JIANPU_SCALE_SEMITONES[note.degree] || 0;
  if (note.accidental === '#') semi += 1;
  else if (note.accidental === 'b') semi -= 1;
  return keyInfo.tonicMidi + semi + note.octave * 12;
}

function getNoteBeats(note: MusoJianpuNote): number {
  let base = 1;
  if (note.underlines === 1) base = 0.5;
  else if (note.underlines === 2) base = 0.25;
  else if (note.underlines >= 3) base = 0.125;
  if (note.dots === 1) base *= 1.5;
  else if (note.dots >= 2) base *= 1.75;
  return base;
}

interface BeatDotMarker {
  /** Normalized vertical offset inside this note's row (0 = top aligned with note attack, <1 = down the sustain) */
  offsetRatio: number;
  kind: 'omote' | 'ura' | 'sub';
}

interface VerticalNoteEntry {
  kind: 'note';
  note: MusoJianpuNote;
  shData: ShakuhachiNoteData;
  isRest: boolean;
  isInferred: boolean;
  /** Number of following prolongation `-` dashes absorbed into this note's vertical sustain stroke */
  prolongCount: number;
  /** Total beats including absorbed prolongation dashes (used in metrical mode) */
  totalBeats: number;
  /** Starting beat position inside the measure (0-based, used for Kinko omote/ura dots & Tozan beat ticks) */
  beatStartInMeasure: number;
  /** Exact beat / off-beat / subdivision markers falling during this note's duration */
  beatMarkers: BeatDotMarker[];
  /** Number of underlines of the adjacent previous note in the same BeatGroup (0 if unconnected) */
  prevUnderlines: number;
  /** Number of underlines of the adjacent next note in the same BeatGroup (0 if unconnected) */
  nextUnderlines: number;
  /** Position flags within the measure (used to start/stop Kinko's continuous center vertical line cleanly) */
  isFirstInMeasure: boolean;
  isLastInMeasure: boolean;
  /** Whether a phrase break / measure bar follows this note */
  phraseBreakAfter?: 'measure' | 'double' | 'final' | 'line';
  /** Show register kanji (乙/甲/大甲) when register changes or on Kan/Dai-kan */
  showRegisterCue: boolean;
  /** Visual height weight for balanced column pagination */
  weight: number;
}

type VerticalScrollItem =
  | { kind: 'section'; id: string; text: string; weight: number }
  | VerticalNoteEntry;

/**
 * Computes the exact beat & subdivision dots (`●` omote on-beat, `○` ura off-beat, `·` 16th sub)
 * that occur across a note's metrical time span `[beatStart, beatStart + totalBeats)`.
 */
function computeBeatMarkers(beatStart: number, totalBeats: number): BeatDotMarker[] {
  const markers: BeatDotMarker[] = [];
  const EPS = 0.02;
  const dur = Math.max(0.125, totalBeats);

  // 1. Mark the attack point itself
  const startFrac = ((beatStart % 1) + 1) % 1;
  if (startFrac < EPS || Math.abs(startFrac - 1) < EPS) {
    markers.push({ offsetRatio: 0, kind: 'omote' });
  } else if (Math.abs(startFrac - 0.5) < EPS) {
    markers.push({ offsetRatio: 0, kind: 'ura' });
  } else {
    markers.push({ offsetRatio: 0, kind: 'sub' });
  }

  // 2. Mark every subsequent integer beat (●) — and half-beat (○) on dotted rhythms — inside the held duration
  const firstNextHalf = Math.floor(beatStart * 2 + EPS) / 2 + 0.5;
  for (let b = firstNextHalf; b < beatStart + dur - EPS; b += 0.5) {
    const frac = ((b % 1) + 1) % 1;
    const isInteger = frac < EPS || Math.abs(frac - 1) < EPS;
    const isHalf = Math.abs(frac - 0.5) < EPS;
    if (isInteger) {
      markers.push({ offsetRatio: (b - beatStart) / dur, kind: 'omote' });
    } else if (isHalf && dur < 1.0 && dur > 0.5 + EPS) {
      // Dotted eighth (0.75 beats): show the passing ura half-beat dot
      markers.push({ offsetRatio: (b - beatStart) / dur, kind: 'ura' });
    }
  }

  return markers;
}

/**
 * Renders vertical sustain & pitch-bend SVG stroke flowing beneath a Katakana character
 * in traditional Kinko-ryu / Tozan-ryu / Jin Nyodo vertical notation.
 */
function VerticalSustainStroke({
  sustainHeightPx,
  bends,
  hasYuri,
  hasKomi,
  hasMuraiki,
  hasKiri,
  isFreeRhythm,
  school,
  inkClass,
  accentClass
}: {
  sustainHeightPx: number;
  bends: ShakuhachiBendType[];
  hasYuri: boolean;
  hasKomi: boolean;
  hasMuraiki: boolean;
  hasKiri: boolean;
  isFreeRhythm: boolean;
  school: ShakuhachiSchool;
  inkClass: string;
  accentClass: string;
}) {
  const h = Math.max(16, Math.round(sustainHeightPx));
  const hasMerikomi = bends.includes('merikomi');
  const hasOtoshi = bends.includes('otoshi');
  const hasSuriUp = bends.includes('suri-up');
  const hasSuriDown = bends.includes('suri-down');
  const hasSori = bends.includes('sori');

  // Build authentic vertical stroke path inside viewBox 0 0 28 H (center x = 14)
  let pathD = `M 14 2 L 14 ${h - 2}`;

  if (hasYuri) {
    // Organic vertical sinusoidal vibrato wave (ユリ)
    const segs = Math.max(3, Math.floor((h - 8) / 9));
    const step = (h - 6) / segs;
    let d = 'M 14 2';
    for (let i = 0; i < segs; i++) {
      const yMid = 2 + i * step + step * 0.5;
      const yEnd = 2 + (i + 1) * step;
      const dx = i % 2 === 0 ? 4.2 : -4.2;
      d += ` Q ${14 + dx} ${yMid.toFixed(1)} 14 ${yEnd.toFixed(1)}`;
    }
    pathD = d;
  } else if (hasOtoshi) {
    // Jin Nyodo sharp angled drop-off (落とし)
    const kneeY = Math.max(8, h * 0.55);
    pathD = `M 14 2 L 14 ${kneeY.toFixed(1)} L 5 ${h - 2}`;
  } else if (hasMerikomi) {
    // Smooth leftward meri dip at tail (メリ込み)
    const kneeY = Math.max(8, h * 0.45);
    pathD = `M 14 2 L 14 ${kneeY.toFixed(1)} Q 14 ${(h - 4).toFixed(1)} 5.5 ${h - 2}`;
  } else if (hasSuriUp) {
    // Smooth upward pitch glide curving rightward (擦り上げ)
    pathD = `M 14 2 Q 15 ${(h * 0.5).toFixed(1)} 22 ${h - 2}`;
  } else if (hasSuriDown) {
    // Smooth downward pitch glide curving leftward (擦り下げ)
    pathD = `M 14 2 Q 13 ${(h * 0.5).toFixed(1)} 6 ${h - 2}`;
  } else if (hasSori) {
    // Expressive outward scoop and return (反り)
    pathD = `M 14 2 Q 22 ${(h * 0.5).toFixed(1)} 14 ${h - 2}`;
  }

  // Komi-buki breath pulse ticks along the vertical sustain line
  const komiTicks = hasKomi
    ? Array.from({ length: Math.max(2, Math.floor(h / 14)) }).map((_, i) => 8 + i * 12).filter(y => y < h - 4)
    : [];

  return (
    <svg
      viewBox={`0 0 28 ${h}`}
      width={28}
      height={h}
      className={cn('block shrink-0 overflow-visible', inkClass)}
      aria-hidden="true"
    >
      {/* Subtle breath halo for Muraiki (ムラ息) */}
      {hasMuraiki && (
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="6"
          strokeLinecap="round"
        />
      )}

      {/* Primary vertical sustain / bend trajectory */}
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth={isFreeRhythm ? (school === 'kinko' ? 1.85 : 1.7) : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={hasYuri || bends.length > 0 ? 0.92 : 0.72}
      />

      {/* Komi-buki abdominal breath pulse accents */}
      {komiTicks.map((y, idx) => (
        <path
          key={idx}
          d={`M 10 ${y} L 14 ${y - 2.2} L 18 ${y} L 14 ${y + 2.2} Z`}
          className={accentClass}
          fill="currentColor"
          fillOpacity="0.85"
        />
      ))}

      {/* Crisp breath cutoff horizontal stroke for Kiri (切り) */}
      {hasKiri && (
        <line
          x1="8"
          y1={h - 2}
          x2="20"
          y2={h - 2}
          className={accentClass}
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/**
 * Full Traditional Right-to-Left Vertical Shakuhachi Score Renderer
 * Supports both Kinko-ryu (琴古流) and Tozan-ryu (都山流) in Metrical or Free-Rhythm Honkyoku modes.
 */
export function ShakuhachiVerticalView({
  document,
  school,
  isDarkSurface,
  highlightMarkings,
  showMarkings = true,
  activeNoteId,
  selectedOffset,
  onNoteClick
}: {
  document: MusoJianpuDocument;
  school: ShakuhachiSchool;
  isDarkSurface: boolean;
  highlightMarkings: boolean;
  showMarkings?: boolean;
  activeNoteId?: string | null;
  selectedOffset?: number | null;
  onNoteClick?: (note: MusoJianpuNote) => void;
}) {
  const isFreeRhythm =
    document.header.rhythmMode === 'free' ||
    /^(?:free|散拍|散板|無拍子|无拍子|自由|honkyoku)$/i.test((document.header.time || '').trim());

  const lengthInfo = getShakuhachiLengthInfo(document.header.fluteKey);

  const inkClass = isDarkSurface ? 'text-neutral-100' : 'text-[#181614]';
  const accentClass = highlightMarkings
    ? (isDarkSurface ? 'text-[#FF6B3D]' : 'text-[#B8321A]')
    : (isDarkSurface ? 'text-neutral-300' : 'text-[#3A3530]');
  const subtleInkClass = isDarkSurface ? 'text-neutral-400' : 'text-[#665C50]';
  const ruleBorderClass =
    school === 'tozan'
      ? (isDarkSurface ? 'border-slate-300/15' : 'border-[#4B4742]/28')
      : (isDarkSurface ? 'border-amber-200/15' : 'border-[#8C6D46]/32');

  // Flatten document into right-to-left vertical columns, absorbing trailing `-` prolongation dashes
  const verticalColumns = useMemo(() => {
    const cols: VerticalScrollItem[][] = [];
    const MAX_COL_WEIGHT = isFreeRhythm ? 10.5 : 11.5;
    let currentCol: VerticalScrollItem[] = [];
    let currentWeight = 0;
    let lastRegister: string | undefined;

    const pushCol = () => {
      if (currentCol.length > 0) {
        cols.push(currentCol);
        currentCol = [];
        currentWeight = 0;
      }
    };

    for (const line of document.lines) {
      if (line.kind === 'section') {
        pushCol();
        currentCol.push({ kind: 'section', id: line.id, text: line.text, weight: 2.2 });
        currentWeight = 2.2;
        lastRegister = undefined;
        continue;
      }
      if (line.kind !== 'music') continue;

      const lineItems: VerticalNoteEntry[] = [];

      line.measures.forEach((measure, mIdx) => {
        // Track each note's group index so Tozan right-side vertical beams stay unbroken within a BeatGroup
        const flatWithGroup = measure.groups.flatMap((g, gIdx) =>
          g.notes.map((n, nIdx) => ({
            note: n,
            groupIdx: gIdx,
            prevUnderlines: nIdx > 0 ? g.notes[nIdx - 1].underlines : 0,
            nextUnderlines: nIdx < g.notes.length - 1 ? g.notes[nIdx + 1].underlines : 0
          }))
        );
        let beatCursor = 0;
        let lastEntryInMeasure: VerticalNoteEntry | null = null;
        let firstEntryInMeasure: VerticalNoteEntry | null = null;

        for (let i = 0; i < flatWithGroup.length; i++) {
          const { note, prevUnderlines, nextUnderlines } = flatWithGroup[i];
          const noteBeats = getNoteBeats(note);

          // Prolongation dash `-`: absorb into the immediately preceding note's vertical sustain!
          if (note.degree === -1 && lastEntryInMeasure && !lastEntryInMeasure.isRest) {
            lastEntryInMeasure.prolongCount += 1;
            lastEntryInMeasure.totalBeats += noteBeats;
            lastEntryInMeasure.beatMarkers = computeBeatMarkers(
              lastEntryInMeasure.beatStartInMeasure,
              lastEntryInMeasure.totalBeats
            );
            lastEntryInMeasure.weight += 0.72;
            beatCursor += noteBeats;
            continue;
          }

          const explicitSh = note.markings.shakuhachi;
          const isRest =
            note.degree === 0 &&
            !explicitSh?.fingering &&
            !(explicitSh?.techniques?.includes('ma')) &&
            !(explicitSh?.techniques?.includes('breath'));
          let shData: ShakuhachiNoteData = explicitSh ? { ...explicitSh } : {};
          let isInferred = false;

          if (!isRest && !shData.fingering && note.degree >= 1 && note.degree <= 7) {
            const midi = jianpuNoteToConcertMidi(note, document.header.key);
            if (midi !== null) {
              const inferred = inferShakuhachiFromMidi(midi, document.header.fluteKey, school);
              shData = { ...inferred, ...shData };
              isInferred = true;
            }
          }

          // Skip pure orphan prolongation dashes with no preceding note
          if (note.degree === -1 && !shData.fingering) {
            beatCursor += noteBeats;
            continue;
          }

          const currentReg = shData.register || 'otsu';
          const showRegisterCue =
            Boolean(shData.fingering) &&
            (currentReg === 'daikan' ||
              (currentReg === 'kan' && lastRegister !== 'kan') ||
              (currentReg === 'otsu' && (lastRegister === 'kan' || lastRegister === 'daikan')));
          if (shData.fingering) {
            lastRegister = currentReg;
          }

          const hasInstructions = Boolean(shData.instructions && shData.instructions.length > 0);
          const holdMult = shData.holdLength || 1;
          const baseWeight = isFreeRhythm
            ? (isRest ? 0.9 : 1.05) + (holdMult >= 2 ? (holdMult - 1) * 0.75 : 0)
            : note.underlines >= 2
              ? 0.62
              : note.underlines === 1
                ? 0.78
                : 1.05;
          const itemWeight = baseWeight + (hasInstructions ? 0.45 : 0);

          const entry: VerticalNoteEntry = {
            kind: 'note',
            note,
            shData,
            isRest,
            isInferred,
            prolongCount: 0,
            totalBeats: noteBeats,
            beatStartInMeasure: beatCursor,
            beatMarkers: computeBeatMarkers(beatCursor, noteBeats),
            prevUnderlines,
            nextUnderlines,
            isFirstInMeasure: !firstEntryInMeasure,
            isLastInMeasure: false,
            showRegisterCue,
            weight: itemWeight
          };

          if (!firstEntryInMeasure) firstEntryInMeasure = entry;
          lineItems.push(entry);
          lastEntryInMeasure = entry;
          beatCursor += noteBeats;
        }

        // Attach measure/phrase boundary marker onto the final note of this measure
        if (lastEntryInMeasure) {
          lastEntryInMeasure.isLastInMeasure = true;
          const isLastMeasureInLine = mIdx === line.measures.length - 1;
          if (measure.endBarline === '|]') lastEntryInMeasure.phraseBreakAfter = 'final';
          else if (measure.endBarline === '||') lastEntryInMeasure.phraseBreakAfter = 'double';
          else if (isLastMeasureInLine) lastEntryInMeasure.phraseBreakAfter = 'line';
          else lastEntryInMeasure.phraseBreakAfter = 'measure';
        }
      });

      for (const item of lineItems) {
        if (currentWeight + item.weight > MAX_COL_WEIGHT && currentCol.length > 0) {
          pushCol();
        }
        currentCol.push(item);
        currentWeight += item.weight;
      }
      pushCol();
    }
    pushCol();
    return cols;
  }, [document, school, isFreeRhythm]);

  const textNotes = useMemo(
    () => document.lines.filter(l => l.kind === 'text'),
    [document]
  );

  if (verticalColumns.length === 0) {
    return (
      <div className={cn('py-14 text-center text-sm', isDarkSurface ? 'text-neutral-400' : 'text-neutral-500')}>
        Start writing Shakuhachi notation (e.g.{' '}
        <code className="font-mono text-[#E05A2B]">{'{ロ,萎し,長} {ツ} {レ,ユリ}'}</code>) or pick a Shakuhachi template above.
      </div>
    );
  }

  const schoolKanji = school === 'tozan' ? '都山流' : '琴古流';
  const rhythmBadgeText = isFreeRhythm
    ? '散拍・本曲'
    : `${document.header.time || '4/4'}  ♩=${document.header.tempo || 72}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Subtle School & Reading-Order Header Caption (Non-intrusive) */}
      <div className={cn('flex flex-wrap items-center justify-between gap-2 text-xs px-1', subtleInkClass)}>
        <div className="flex items-center gap-2">
          <span
            style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
            className={cn('font-bold', accentClass)}
          >
            {schoolKanji}縦譜
          </span>
          <span>·</span>
          <span>{lengthInfo.label} ({lengthInfo.kanjiLabel})</span>
          <span>·</span>
          <span>{isFreeRhythm ? 'Free Rhythm Honkyoku (散拍)' : `Metrical (${document.header.time})`}</span>
        </div>
        <span className="text-[11px] opacity-80">Read top → bottom, columns right → left</span>
      </div>

      {/* Main Horizontal-Scrolling Right-to-Left Traditional Vertical Scroll */}
      <div
        className={cn(
          'overflow-x-auto pb-2 rounded-xl border-2 p-2.5',
          isDarkSurface
            ? 'border-amber-200/20 bg-[#141519]'
            : school === 'tozan'
              ? 'border-[#524B42]/40 bg-[#FCFBF7]'
              : 'border-[#8C6D46]/45 bg-[#FBF7EE]'
        )}
      >
        <div
          className={cn(
            'min-w-max border flex flex-row-reverse items-stretch justify-start',
            ruleBorderClass
          )}
        >
          {/* Rightmost Traditional Colophon Column (Title, Vermilion School Seal, Length & Credits) */}
          <div
            className={cn(
              'w-[86px] shrink-0 py-6 px-3 flex flex-col items-center justify-between gap-6 border-l-2 select-none',
              ruleBorderClass,
              isDarkSurface
                ? 'bg-amber-950/15'
                : school === 'tozan'
                  ? 'bg-[#F3F0E8]/70'
                  : 'bg-[#F5ECD9]/60'
            )}
          >
            <div className="flex flex-col items-center gap-3.5">
              {/* Traditional Vermilion School Seal (琴古流 / 都山流) */}
              <div
                style={{ fontFamily: SHAKUHACHI_SERIF_FONT, writingMode: 'vertical-rl' }}
                className={cn(
                  'px-1 py-1.5 border rounded-[3px] text-[11px] font-bold tracking-[0.18em] leading-none',
                  isDarkSurface
                    ? 'border-[#FF6B3D]/70 text-[#FF6B3D]'
                    : 'border-[#B8321A]/80 text-[#B8321A]'
                )}
              >
                {schoolKanji}
              </div>

              {/* Vertical Title */}
              <div
                style={{ fontFamily: SHAKUHACHI_SERIF_FONT, writingMode: 'vertical-rl' }}
                className={cn('text-xl font-bold tracking-[0.24em] leading-none', inkClass)}
              >
                {document.header.title}
              </div>

              {document.header.subtitle && (
                <div
                  style={{ fontFamily: SHAKUHACHI_SERIF_FONT, writingMode: 'vertical-rl' }}
                  className={cn('text-[11px] tracking-[0.14em] opacity-75', inkClass)}
                >
                  {document.header.subtitle}
                </div>
              )}
            </div>

            {/* Bottom Colophon Metadata: Tube length, Rhythm/Expression, Composer */}
            <div className="flex flex-row-reverse items-end gap-2.5 pt-4">
              <div
                style={{ fontFamily: SHAKUHACHI_SERIF_FONT, writingMode: 'vertical-rl' }}
                className={cn('text-xs font-semibold tracking-[0.16em]', accentClass)}
              >
                {lengthInfo.kanjiLabel}
              </div>
              <div
                style={{ fontFamily: SHAKUHACHI_SERIF_FONT, writingMode: 'vertical-rl' }}
                className={cn('text-[11px] tracking-[0.12em] opacity-80', inkClass)}
              >
                {rhythmBadgeText}
              </div>
              {document.header.composer && (
                <div
                  style={{ fontFamily: SHAKUHACHI_SERIF_FONT, writingMode: 'vertical-rl' }}
                  className={cn('text-[11px] tracking-[0.14em] opacity-65', inkClass)}
                >
                  {document.header.composer}
                </div>
              )}
            </div>
          </div>

          {/* Right-to-Left Vertical Notation Columns */}
          {verticalColumns.map((col, colIdx) => {
            const colHasInstructions = col.some(
              item => item.kind === 'note' && item.shData.instructions && item.shData.instructions.length > 0
            );

            return (
              <div
                key={`shcol-${colIdx}`}
                className={cn(
                  'shrink-0 py-5 px-2 flex flex-col items-center justify-start border-l relative',
                  colHasInstructions ? 'min-w-[122px]' : 'w-[92px]',
                  isFreeRhythm ? 'gap-1.5' : 'gap-0',
                  ruleBorderClass
                )}
              >
                {col.map((item, itemIdx) => {
                  if (item.kind === 'section') {
                    return (
                      <div
                        key={item.id}
                        style={{ fontFamily: SHAKUHACHI_SERIF_FONT, writingMode: 'vertical-rl' }}
                        className={cn(
                          'py-2 mb-1 text-xs font-bold tracking-[0.2em] select-none border-b border-dashed pb-3',
                          ruleBorderClass,
                          accentClass
                        )}
                      >
                        {item.text}
                      </div>
                    );
                  }

                  const {
                    note,
                    shData,
                    isRest,
                    isInferred,
                    prolongCount,
                    totalBeats,
                    beatMarkers,
                    prevUnderlines,
                    nextUnderlines,
                    isFirstInMeasure,
                    isLastInMeasure,
                    phraseBreakAfter,
                    showRegisterCue
                  } = item;

                  const prevItem = itemIdx > 0 ? col[itemIdx - 1] : null;
                  const nextItem = itemIdx < col.length - 1 ? col[itemIdx + 1] : null;
                  const isFirstNoteInCol = !prevItem || prevItem.kind !== 'note';
                  const isLastNoteInCol = !nextItem || nextItem.kind !== 'note';

                  const isPlaying = activeNoteId === note.id;
                  const isSelected =
                    selectedOffset !== null &&
                    selectedOffset !== undefined &&
                    selectedOffset >= note.startOffset &&
                    selectedOffset <= note.endOffset;

                  const noteColorClass = isPlaying ? 'text-[#E05A2B]' : inkClass;
                  const techniques = shData.techniques || [];
                  const bends = shData.bends || [];
                  const instructions = shData.instructions || [];
                  const isMa = !shData.fingering && techniques.includes('ma');
                  const isBreathOnly = !shData.fingering && techniques.includes('breath');
                  const hasNayashi = bends.includes('nayashi');
                  const hasYuri = techniques.some(
                    t => t === 'yuri' || t === 'yokoyuri' || t === 'tateyuri' || t === 'mawashi'
                  );
                  const hasKomi = techniques.includes('komi');
                  const hasMuraiki = techniques.includes('muraiki');
                  const hasKiri = techniques.includes('kiri');
                  const hasTrailingBreath = Boolean(shData.fingering) && techniques.includes('breath');

                  // Attack ornaments shown above/right of the katakana
                  const attackMarks = techniques.filter(
                    t => t === 'atari' || t === 'uchi' || t === 'oshi'
                  );
                  // Continuous timbre ornaments shown along left side
                  const sideTechs = techniques.filter(
                    t =>
                      t === 'korokoro' ||
                      t === 'karakara' ||
                      t === 'tamane' ||
                      t === 'muraiki' ||
                      t === 'yokoyuri' ||
                      t === 'tateyuri' ||
                      t === 'mawashi'
                  );

                  const kana = shData.fingering ? getShakuhachiKatakana(shData.fingering, school) : null;
                  const effectiveMk = getEffectiveMeriKariForSchool(shData, school);
                  const mkLabel = effectiveMk
                    ? school === 'tozan'
                      ? SHAKUHACHI_MERIKARI_LABELS[effectiveMk].tozan
                      : SHAKUHACHI_MERIKARI_LABELS[effectiveMk].kinko
                    : null;

                  const regChar =
                    shData.register === 'daikan'
                      ? '大甲'
                      : shData.register === 'kan'
                        ? '甲'
                        : shData.register === 'otsu'
                          ? '乙'
                          : null;

                  const holdMult = shData.holdLength || 1;
                  const hasTailBend = bends.some(b => b !== 'nayashi');
                  const hasExpressiveStroke = hasYuri || hasKomi || hasTailBend || hasKiri || hasMuraiki;

                  // School-specific center sustain / middle line geometry:
                  // - Kinko-ryu metrical: continuous vertical line running straight down the middle of the column!
                  // - Tozan-ryu metrical: clean Katakana stack; center sustain stroke only on held multi-beat notes or bends
                  // - Free-rhythm honkyoku: organic vertical brush stroke beneath each pitched note
                  const isKinkoMetrical = !isFreeRhythm && school === 'kinko';
                  const isTozanMetrical = !isFreeRhythm && school === 'tozan';

                  const metricalSustainPx =
                    totalBeats <= 0.25
                      ? (isKinkoMetrical ? 8 : 0)
                      : totalBeats <= 0.5
                        ? (isKinkoMetrical ? 12 : 0)
                        : totalBeats <= 0.75
                          ? (isKinkoMetrical ? 18 : 8)
                          : totalBeats <= 1.0
                            ? (isKinkoMetrical ? 22 : (hasExpressiveStroke ? 18 : 0))
                            : Math.min(124, Math.round(20 + (totalBeats - 1) * 32));

                  const sustainHeightPx = isFreeRhythm
                    ? Math.round(
                        Math.max(
                          hasTailBend || hasYuri || hasKomi ? 28 : 18,
                          (holdMult - 0.35 + prolongCount * 0.9) * 26
                        )
                      )
                    : Math.max(hasExpressiveStroke ? 20 : 0, metricalSustainPx);

                  const needsExpressiveStroke =
                    !isRest &&
                    !isMa &&
                    !isBreathOnly &&
                    (isFreeRhythm
                      ? prolongCount > 0 || holdMult >= 1 || hasExpressiveStroke
                      : hasExpressiveStroke || (isTozanMetrical && (prolongCount > 0 || totalBeats > 1.05)));

                  // Kinko-ryu continuous vertical middle line segments (connects straight down the center of the column)
                  const showKinkoTopCenterLine =
                    isKinkoMetrical && !isFirstInMeasure && !isFirstNoteInCol && !isBreathOnly;
                  const showKinkoBottomCenterLine =
                    isKinkoMetrical && !needsExpressiveStroke && !isBreathOnly && (!isLastInMeasure || totalBeats >= 1 || prolongCount > 0);
                  const kinkoBottomLineHeightPx = Math.max(
                    isLastInMeasure || isLastNoteInCol ? (totalBeats > 1.05 ? sustainHeightPx : 10) : 8,
                    sustainHeightPx
                  );

                  // Right-side subdivision beam counts (Tozan draws bold vertical lines on the RIGHT;
                  // Kinko uses ● / ○ dots on the right + fine linking line only on 16th/32nd subdivisions)
                  const beamCount = !isFreeRhythm ? Math.min(3, note.underlines) : 0;
                  const effPrevUnderlines = isFirstInMeasure || isFirstNoteInCol ? 0 : prevUnderlines;
                  const effNextUnderlines = isLastInMeasure || isLastNoteInCol ? 0 : nextUnderlines;

                  const tooltip = isRest
                    ? 'Rest (休符) · Click to edit'
                    : `${describeShakuhachiNote(shData, school)} · Click to edit`;

                  return (
                    <div key={note.id} className="w-full flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => onNoteClick?.(note)}
                        title={tooltip}
                        className={cn(
                          'relative w-full px-1 rounded-md flex flex-col items-center justify-start transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E05A2B]',
                          isFreeRhythm ? 'py-1' : 'py-0',
                          isPlaying && (isDarkSurface ? 'bg-[#E05A2B]/30 ring-1 ring-[#E05A2B]' : 'bg-[#E05A2B]/15 ring-1 ring-[#E05A2B]'),
                          !isPlaying && isSelected && (isDarkSurface ? 'bg-white/10' : 'bg-amber-200/50'),
                          !isPlaying && !isSelected && (isDarkSurface ? 'hover:bg-white/[0.06]' : 'hover:bg-amber-900/[0.06]')
                        )}
                      >
                        {/* Main Note Core Row: Left (Meri/Kari & Side Tech) | Center (Katakana + Middle Line / Sustain) | Right (Duration Lines/Dots + Register + Jin Nyodo) */}
                        <div className="relative w-full flex items-stretch justify-center">
                          {/* LEFT FLANK: Meri/Kari & Side Honkyoku Techniques (never rhythmic beams!) */}
                          <div className={cn(
                            'w-[22px] shrink-0 flex flex-col items-end pr-1 select-none',
                            isFreeRhythm ? 'pt-0.5' : 'pt-1.5'
                          )}>
                            {/* Meri / Kari marker (メ / 中 / 大メ / カ) */}
                            {showMarkings && mkLabel && (
                              <span
                                style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                                className={cn(
                                  'text-[9.5px] font-bold leading-tight',
                                  effectiveMk === 'kari' ? accentClass : noteColorClass
                                )}
                              >
                                {mkLabel}
                              </span>
                            )}

                            {/* Side Honkyoku technique labels (コロ / ムラ / 玉音 etc.) */}
                            {showMarkings &&
                              sideTechs.slice(0, 2).map((t, idx) => (
                                <span
                                  key={idx}
                                  style={{ fontFamily: SHAKUHACHI_SERIF_FONT, writingMode: 'vertical-rl' }}
                                  className={cn('text-[8.5px] font-semibold leading-none mt-0.5 tracking-tight', accentClass)}
                                >
                                  {SHAKUHACHI_TECHNIQUE_LABELS[t].shortJp}
                                </span>
                              ))}
                          </div>

                          {/* CENTER SPINE: Katakana / Rest / Ma / Breath + Kinko Continuous Center Line / Sustain & Bend */}
                          <div className="relative flex flex-col items-center justify-start w-[30px] shrink-0">
                            {/* Kinko-ryu top vertical center-line connector running down the middle */}
                            {isKinkoMetrical ? (
                              <div className="h-[6px] flex items-stretch justify-center pointer-events-none">
                                {showKinkoTopCenterLine && (
                                  <span className={cn('w-[1.35px] h-full bg-current opacity-55', noteColorClass)} />
                                )}
                              </div>
                            ) : !isFreeRhythm ? (
                              <div className="h-[5px] shrink-0" aria-hidden="true" />
                            ) : null}

                            {/* Traditional Nayashi (萎し) curved entry stroke sweeping in from the left */}
                            {showMarkings && hasNayashi && (
                              <svg
                                viewBox="0 0 24 14"
                                className={cn('w-6 h-3.5 -mb-1 -ml-2 pointer-events-none', accentClass)}
                                aria-hidden="true"
                              >
                                <path
                                  d="M4 12C4 6 10 3 15 3"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.65"
                                  strokeLinecap="round"
                                />
                              </svg>
                            )}

                            {/* Crisp Attack Articulation (当り / 打ち / 押し) */}
                            {showMarkings && attackMarks.length > 0 && (
                              <span
                                style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                                className={cn('text-[8.5px] font-bold leading-none mb-0.5', accentClass)}
                              >
                                {attackMarks.map(t => SHAKUHACHI_TECHNIQUE_LABELS[t].shortJp).join('')}
                              </span>
                            )}

                            {/* Primary Vertical Symbol */}
                            {isRest ? (
                              school === 'tozan' ? (
                                <span
                                  style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                                  className={cn('text-[17px] font-bold leading-none py-0.5 opacity-65', noteColorClass)}
                                >
                                  休
                                </span>
                              ) : (
                                <span
                                  className={cn('text-[16px] leading-none py-0.5 opacity-70', noteColorClass)}
                                >
                                  ○
                                </span>
                              )
                            ) : isMa ? (
                              <div className="flex flex-col items-center py-1">
                                <span
                                  style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                                  className={cn('text-[19px] leading-none', accentClass)}
                                >
                                  〇
                                </span>
                                <span
                                  style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                                  className={cn('text-[9px] font-semibold mt-0.5 opacity-80', accentClass)}
                                >
                                  間
                                </span>
                              </div>
                            ) : isBreathOnly ? (
                              <span className={cn('text-[13px] font-bold leading-none py-1', accentClass)}>
                                ∨
                              </span>
                            ) : (
                              <span
                                style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                                className={cn(
                                  'text-[22px] font-bold leading-none tracking-tight select-text py-[1px]',
                                  isInferred && 'opacity-85',
                                  noteColorClass
                                )}
                              >
                                {kana || 'ロ'}
                              </span>
                            )}

                            {/* Dynamic marking (p, mf, f) neatly tucked when present */}
                            {showMarkings && note.markings.dynamic && (
                              <span
                                className={cn(
                                  'text-[9px] font-serif italic font-bold leading-none mt-0.5',
                                  isDarkSurface ? 'text-amber-300' : 'text-neutral-700'
                                )}
                              >
                                {note.markings.dynamic}
                              </span>
                            )}

                            {/* Flowing Vertical Sustain / Yuri / Pitch-Bend Trajectory OR Kinko Continuous Center Line */}
                            {needsExpressiveStroke ? (
                              <div className="mt-0.5 flex justify-center">
                                <VerticalSustainStroke
                                  sustainHeightPx={sustainHeightPx}
                                  bends={bends}
                                  hasYuri={hasYuri}
                                  hasKomi={hasKomi}
                                  hasMuraiki={hasMuraiki}
                                  hasKiri={hasKiri}
                                  isFreeRhythm={isFreeRhythm}
                                  school={school}
                                  inkClass={noteColorClass}
                                  accentClass={accentClass}
                                />
                              </div>
                            ) : showKinkoBottomCenterLine ? (
                              <div
                                className="flex justify-center grow pointer-events-none"
                                style={{ minHeight: `${kinkoBottomLineHeightPx}px` }}
                              >
                                <span className={cn('w-[1.35px] h-full bg-current opacity-55', noteColorClass)} />
                              </div>
                            ) : isTozanMetrical ? (
                              <div
                                className="shrink-0"
                                style={{
                                  height: `${note.underlines >= 2 ? 4 : note.underlines === 1 ? 6 : 11}px`
                                }}
                                aria-hidden="true"
                              />
                            ) : null}

                            {/* Trailing Breath Notch (息継ぎ ∨) */}
                            {showMarkings && hasTrailingBreath && (
                              <span className={cn('text-[11px] font-bold leading-none mt-0.5', accentClass)}>
                                ∨
                              </span>
                            )}
                          </div>

                          {/* RIGHT FLANK: Authentic School Duration Track (Tozan Right-Side Lines / Kinko Right-Side Beat Dots) + Register + Jin Nyodo */}
                          <div
                            className={cn(
                              'shrink-0 flex items-stretch justify-start pl-0.5 gap-1 select-none',
                              colHasInstructions ? 'min-w-[56px]' : 'w-[30px]'
                            )}
                          >
                            {/* TOZAN-RYU METRICAL DURATION TRACK (Right-side vertical beams + augmentation dots + beat ticks) */}
                            {isTozanMetrical && (
                              <div className="relative w-[18px] shrink-0 self-stretch pointer-events-none">
                                {/* Continuous right-side vertical beam lines (1 = 8th, 2 = 16th, 3 = 32nd) */}
                                {beamCount > 0 &&
                                  Array.from({ length: beamCount }).map((_, idx) => {
                                    const level = idx + 1;
                                    const connectTop = effPrevUnderlines >= level;
                                    const connectBottom = effNextUnderlines >= level;
                                    const leftPx = 2 + idx * 4;
                                    return (
                                      <span
                                        key={`tz-beam-${level}`}
                                        className={cn('absolute w-[1.8px] bg-current opacity-90', noteColorClass)}
                                        style={{
                                          left: `${leftPx}px`,
                                          top: connectTop ? '0px' : '5px',
                                          bottom: connectBottom ? '0px' : '4px'
                                        }}
                                      />
                                    );
                                  })}

                                {/* Tozan right-side augmentation dot(s) for dotted notes (・) */}
                                {note.dots > 0 && (
                                  <span
                                    className={cn(
                                      'absolute flex flex-col gap-[2px] items-center',
                                      noteColorClass
                                    )}
                                    style={{
                                      left: `${beamCount > 0 ? 4 + beamCount * 4 : 4}px`,
                                      top: '18px'
                                    }}
                                    title="付点 (Dotted duration)"
                                  >
                                    {Array.from({ length: note.dots }).map((_, dIdx) => (
                                      <span
                                        key={dIdx}
                                        className="w-[3.5px] h-[3.5px] rounded-full bg-current"
                                      />
                                    ))}
                                  </span>
                                )}

                                {/* Tozan right-side horizontal beat tick marks (on beats & across sustained multi-beat notes) */}
                                {beamCount === 0 &&
                                  beatMarkers
                                    .filter(bm => bm.kind === 'omote')
                                    .map((bm, bmIdx) => (
                                      <span
                                        key={`tz-tick-${bmIdx}`}
                                        className={cn('absolute left-[2px] w-2.5 h-[1.6px] bg-current opacity-75', accentClass)}
                                        style={{
                                          top: bm.offsetRatio === 0 ? '13px' : `${Math.round(bm.offsetRatio * 100)}%`
                                        }}
                                        title="拍線 (Tozan beat mark)"
                                      />
                                    ))}
                              </div>
                            )}

                            {/* KINKO-RYU METRICAL BEAT DOTS TRACK (Right-side ● omote / ○ ura dots aligned with the center line) */}
                            {isKinkoMetrical && (
                              <div className="relative w-[18px] shrink-0 self-stretch pointer-events-none">
                                {beatMarkers.map((bm, bmIdx) => {
                                  const topStyle =
                                    bm.offsetRatio === 0
                                      ? '13px'
                                      : `calc(${Math.round(bm.offsetRatio * 100)}% + 4px)`;
                                  if (bm.kind === 'omote') {
                                    return (
                                      <span
                                        key={`kk-dot-${bmIdx}`}
                                        className={cn(
                                          'absolute left-[2px] w-[5.5px] h-[5.5px] rounded-full bg-current',
                                          accentClass
                                        )}
                                        style={{ top: topStyle }}
                                        title="表拍 (On-beat dot)"
                                      />
                                    );
                                  }
                                  if (bm.kind === 'ura') {
                                    return (
                                      <span
                                        key={`kk-dot-${bmIdx}`}
                                        className={cn(
                                          'absolute left-[2px] w-[5.5px] h-[5.5px] rounded-full border-[1.4px] border-current',
                                          accentClass
                                        )}
                                        style={{ top: topStyle }}
                                        title="裏拍 (Off-beat hollow dot)"
                                      />
                                    );
                                  }
                                  return (
                                    <span
                                      key={`kk-dot-${bmIdx}`}
                                      className={cn(
                                        'absolute left-[3.5px] w-[3px] h-[3px] rounded-full bg-current opacity-70',
                                        accentClass
                                      )}
                                      style={{ top: topStyle }}
                                      title="細分拍 (Subdivision)"
                                    />
                                  );
                                })}

                                {/* Kinko fine subdivision connecting line(s) on outer right for fast 16th/32nd passages */}
                                {beamCount >= 2 &&
                                  Array.from({ length: beamCount - 1 }).map((_, idx) => {
                                    const level = idx + 2;
                                    const connectTop = effPrevUnderlines >= level;
                                    const connectBottom = effNextUnderlines >= level;
                                    return (
                                      <span
                                        key={`kk-sub-${level}`}
                                        className={cn('absolute w-[1.1px] bg-current opacity-65', accentClass)}
                                        style={{
                                          left: `${11 + idx * 3}px`,
                                          top: connectTop ? '0px' : '6px',
                                          bottom: connectBottom ? '0px' : '5px'
                                        }}
                                      />
                                    );
                                  })}

                                {/* Dotted rhythm dot (・) tucked cleanly right of Katakana */}
                                {note.dots > 0 && (
                                  <span
                                    className={cn('absolute left-[10px] top-[18px] flex flex-col gap-[2px]', noteColorClass)}
                                    title="付点 (Dotted duration)"
                                  >
                                    {Array.from({ length: note.dots }).map((_, dIdx) => (
                                      <span key={dIdx} className="w-[3px] h-[3px] rounded-full bg-current opacity-85" />
                                    ))}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Register Indicator (乙 / 甲 / 大甲) + Jin Nyodo Vertical Performance Commentary */}
                            <div className={cn(
                              'flex flex-col items-start gap-1 min-w-0',
                              isFreeRhythm ? 'pt-0.5' : 'pt-1.5'
                            )}>
                              {showMarkings && showRegisterCue && regChar && (
                                <span
                                  style={{ fontFamily: SHAKUHACHI_SERIF_FONT, writingMode: 'vertical-rl' }}
                                  className={cn(
                                    'text-[9px] font-bold leading-none tracking-tight',
                                    shData.register === 'otsu' ? subtleInkClass : accentClass
                                  )}
                                >
                                  {regChar}
                                </span>
                              )}

                              {/* Jin Nyodo (神如道) Vertical Side Instructions */}
                              {showMarkings && instructions.length > 0 && (
                                <div
                                  style={{ fontFamily: SHAKUHACHI_SERIF_FONT, writingMode: 'vertical-rl' }}
                                  className={cn(
                                    'text-[9.5px] leading-[1.15] tracking-[0.06em] font-medium max-h-[148px]',
                                    accentClass
                                  )}
                                >
                                  {instructions.join('・')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Measure Divider / Phrase Breath Break between notes in the column */}
                      {phraseBreakAfter && (
                        <div className="w-full flex items-center justify-center my-0.5 select-none pointer-events-none">
                          {isFreeRhythm ? (
                            phraseBreakAfter === 'final' ? (
                              <div className={cn('w-9 flex flex-col gap-[2px] my-1.5', inkClass)}>
                                <div className="h-[1px] bg-current opacity-70" />
                                <div className="h-[2.5px] bg-current" />
                              </div>
                            ) : phraseBreakAfter === 'double' || phraseBreakAfter === 'line' ? (
                              <span
                                style={{ fontFamily: SHAKUHACHI_SERIF_FONT }}
                                className={cn('text-[11px] font-bold opacity-75 my-0.5', accentClass)}
                                title="Phrase breath (句切れ)"
                              >
                                ∨
                              </span>
                            ) : (
                              <span className={cn('w-1 h-1 rounded-full bg-current opacity-30 my-1', inkClass)} />
                            )
                          ) : phraseBreakAfter === 'final' ? (
                            <div className={cn('w-10 flex flex-col gap-[2px] my-1', inkClass)}>
                              <div className="h-[1px] bg-current opacity-75" />
                              <div className="h-[2.5px] bg-current" />
                            </div>
                          ) : phraseBreakAfter === 'double' ? (
                            <div className={cn('w-10 flex flex-col gap-[2px] my-1', inkClass)}>
                              <div className="h-[1px] bg-current opacity-75" />
                              <div className="h-[1px] bg-current opacity-75" />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                'my-0.5 bg-current',
                                school === 'tozan' ? 'w-11 h-[1.2px] opacity-45' : 'w-8 h-[1px] opacity-30',
                                inkClass
                              )}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer text notes (T: lines) */}
      {textNotes.length > 0 && (
        <div
          className={cn(
            'space-y-1.5 text-xs sm:text-sm pt-2 border-t',
            isDarkSurface ? 'border-white/[0.08] text-neutral-400' : 'border-neutral-200/80 text-neutral-600'
          )}
        >
          {textNotes.map(t => (
            <p key={t.id}>{t.text}</p>
          ))}
        </div>
      )}
    </div>
  );
}
