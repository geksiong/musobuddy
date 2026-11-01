/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Tag, Plus, Timer } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useAccompaniment, getEffectiveChord } from '../../contexts/AccompanimentContext.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { formatChordName } from './constants.ts';

interface CompactPlaybackChartProps {
  masterLength: number;
  timeSigLabel: string;
  onEditBeat?: (beatIndex: number) => void;
  onOpenEditor?: () => void;
  onOpenLabelModal?: (measureIndex: number) => void;
}

export default function CompactPlaybackChart({
  masterLength,
  timeSigLabel,
  onEditBeat,
  onOpenEditor,
  onOpenLabelModal,
}: CompactPlaybackChartProps) {
  const {
    progression,
    measureLabels,
    selectedBeatIndex,
    setSelectedBeatIndex,
    isPlaying,
    currentIndex,
    isCountingIn,
    countInBeat,
    selectedInstrument,
    accompanimentVolume,
    isTrackMeasuresEnabled,
  } = useAccompaniment();

  const { playChord } = useAudio();
  const { resolvedTheme } = useTheme();
  const activeMeasureRef = useRef<HTMLDivElement | null>(null);

  const totalMeasures = Math.max(1, Math.ceil(progression.length / masterLength));

  // Determine current active and next chord
  const lastDisplayedChordRef = useRef<string>('—');
  const currentActiveChordInfo = getEffectiveChord(progression, currentIndex);
  const rawActiveChord = progression[currentIndex]?.name;

  let activeChordToDisplay: string;
  if (isPlaying) {
    if (!rawActiveChord || rawActiveChord === '-' || rawActiveChord === '—' || rawActiveChord === '–') {
      activeChordToDisplay = (lastDisplayedChordRef.current && lastDisplayedChordRef.current !== '—' && lastDisplayedChordRef.current !== '-')
        ? lastDisplayedChordRef.current
        : (currentActiveChordInfo?.chord || '—');
    } else {
      activeChordToDisplay = rawActiveChord;
      lastDisplayedChordRef.current = rawActiveChord;
    }
  } else {
    activeChordToDisplay = rawActiveChord || currentActiveChordInfo?.chord || '—';
    if (activeChordToDisplay && activeChordToDisplay !== '-' && activeChordToDisplay !== '—') {
      lastDisplayedChordRef.current = activeChordToDisplay;
    }
  }

  // Auto-scroll to keep active measure in view during playback (respects toggle)
  useEffect(() => {
    if (isPlaying && isTrackMeasuresEnabled && activeMeasureRef.current) {
      activeMeasureRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [isPlaying, isTrackMeasuresEnabled, Math.floor(currentIndex / masterLength)]);

  // Group progression by measures
  const measuresData = Array.from({ length: totalMeasures }).map((_, mIdx) => {
    const startBeat = mIdx * masterLength;
    const beats = Array.from({ length: masterLength }).map((_, bOffset) => {
      const gIndex = startBeat + bOffset;
      const slot = progression[gIndex];
      const effective = getEffectiveChord(progression, gIndex);
      return {
        index: gIndex,
        rawName: slot?.name || '',
        effectiveChord: effective?.chord || '',
        isExplicit: !!(slot && slot.name.trim() !== ''),
      };
    });

    const explicitChords = beats.filter(b => b.isExplicit);
    const hasSingleChord = explicitChords.length <= 1;
    const primaryChord = explicitChords[0]?.rawName || beats[0]?.effectiveChord || '';

    return {
      measureIndex: mIdx,
      label: measureLabels[mIdx] || null,
      beats,
      hasSingleChord,
      primaryChord
    };
  });

  const handleChordClick = (gIndex: number, chordName: string) => {
    if (chordName) {
      playChord(chordName, selectedInstrument, accompanimentVolume);
    }
    setSelectedBeatIndex(gIndex);
    if (onEditBeat) {
      onEditBeat(gIndex);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Lead-sheet Systems Grid (4 measures per row on desktop, 2 on tablet, 1 on mobile) */}
      <div className={cn(
        "rounded-2xl border transition-all overflow-hidden",
        resolvedTheme === 'dark' 
          ? "bg-slate-900/60 border-white/10" 
          : "bg-white border-slate-200/90 shadow-xs"
      )}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-slate-200/80 dark:divide-white/10">
          {measuresData.map((measure, idx) => {
            const mIdx = measure.measureIndex;
            const isCurrentMeasure = isPlaying && Math.floor(currentIndex / masterLength) === mIdx;
            const isSystemStart = mIdx % 4 === 0;

            return (
              <div
                key={mIdx}
                ref={isCurrentMeasure ? activeMeasureRef : null}
                className={cn(
                  "relative flex flex-col justify-between p-3.5 select-none min-h-[105px] transition-colors group/measure",
                  // Lead-sheet hairline bar lines between measures
                  "sm:border-r border-b border-slate-200/70 dark:border-white/10",
                  (mIdx + 1) % 4 === 0 && "sm:border-r-0 lg:border-r-0",
                  (mIdx + 1) % 2 === 0 && "sm:border-r-0 lg:border-r",
                  // Active playback measure highlight
                  isCurrentMeasure
                    ? (resolvedTheme === 'dark'
                        ? "bg-emerald-500/15 ring-2 ring-emerald-500/60 z-10"
                        : "bg-emerald-50/90 ring-2 ring-emerald-500/50 z-10")
                    : (resolvedTheme === 'dark'
                        ? "hover:bg-white/[0.02]"
                        : "hover:bg-slate-50/70")
                )}
              >
                {/* Measure Header: Measure Number & Rehearsal Mark / Section Tag */}
                <div className="flex items-center justify-between pb-1 text-[10px] font-mono leading-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "font-mono font-bold text-[9px] px-1 py-0.5 rounded",
                      isCurrentMeasure
                        ? "bg-emerald-500 text-white font-black"
                        : "text-slate-400 dark:text-slate-500"
                    )}>
                      {mIdx + 1}
                    </span>

                    {measure.label ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenLabelModal) onOpenLabelModal(mIdx);
                        }}
                        className="px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-extrabold text-[8.5px] uppercase tracking-wider flex items-center gap-1 hover:bg-indigo-500/25 transition-all truncate"
                        title="Edit section rehearsal label"
                      >
                        <Tag className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
                        <span className="truncate max-w-[90px]">{measure.label}</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenLabelModal) onOpenLabelModal(mIdx);
                        }}
                        className="opacity-0 group-hover/measure:opacity-100 hover:opacity-100 px-1 py-0.5 rounded text-[8px] font-medium text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity flex items-center gap-0.5 cursor-pointer"
                        title="Add rehearsal label (e.g. Verse, Chorus, Bridge)"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Section</span>
                      </button>
                    )}
                  </div>

                  {isCurrentMeasure && isCountingIn && mIdx === 0 && (
                    <span className="text-[8px] font-black text-amber-500 animate-pulse uppercase flex items-center gap-1">
                      <Timer className="w-2.5 h-2.5" />
                      Count {countInBeat}
                    </span>
                  )}
                </div>

                {/* Chords Notation Area */}
                <div className="flex-1 flex items-center justify-center my-1.5 min-h-[46px]">
                  {measure.hasSingleChord ? (
                    // Single chord spanning the entire measure
                    <button
                      onClick={() => handleChordClick(measure.beats[0].index, measure.primaryChord)}
                      className={cn(
                        "w-full h-full flex items-center justify-center gap-2 px-2 py-1 rounded-lg transition-all group/btn cursor-pointer",
                        selectedBeatIndex === measure.beats[0].index
                          ? "bg-emerald-500/15 ring-2 ring-emerald-500"
                          : (resolvedTheme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-100/70")
                      )}
                    >
                      <span className={cn(
                        "text-lg sm:text-xl font-black font-mono tracking-tight transition-all",
                        isCurrentMeasure && measure.primaryChord
                          ? "text-emerald-700 dark:text-emerald-400 scale-105"
                          : (resolvedTheme === 'dark' ? "text-white" : "text-slate-900")
                      )}>
                        {formatChordName(measure.primaryChord || '—')}
                      </span>

                      {/* Rhythm Slash Notation for remaining beats */}
                      {measure.primaryChord && masterLength > 1 && (
                        <span className="text-xs font-mono font-bold text-slate-300 dark:text-white/20 select-none tracking-widest">
                          {Array.from({ length: masterLength - 1 }).map(() => ' / ').join('')}
                        </span>
                      )}
                    </button>
                  ) : (
                    // Multi-chord measure with split beat cells
                    <div
                      className="grid gap-1 w-full h-full items-center"
                      style={{ gridTemplateColumns: `repeat(${masterLength}, minmax(0, 1fr))` }}
                    >
                      {measure.beats.map((beat) => {
                        const isCellPlaying = isPlaying && currentIndex === beat.index;
                        const isSelected = selectedBeatIndex === beat.index;

                        return (
                          <button
                            key={beat.index}
                            onClick={() => handleChordClick(beat.index, beat.effectiveChord)}
                            className={cn(
                              "flex flex-col items-center justify-center h-11 rounded-lg text-center transition-all cursor-pointer p-0.5 relative",
                              isCellPlaying
                                ? "bg-emerald-600 text-white shadow-xs font-bold scale-105"
                                : isSelected
                                  ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500 font-black"
                                  : beat.isExplicit
                                    ? (resolvedTheme === 'dark'
                                        ? "bg-white/5 hover:bg-white/10 text-white font-bold"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-900 font-black")
                                    : (resolvedTheme === 'dark'
                                        ? "bg-transparent text-slate-500 hover:text-white"
                                        : "bg-transparent text-slate-400 hover:text-slate-800")
                            )}
                            title={`Beat ${(beat.index % masterLength) + 1}: ${beat.effectiveChord || 'Empty'}`}
                          >
                            <span className="text-xs font-black font-mono leading-none truncate w-full px-0.5">
                              {formatChordName(
                                isCellPlaying && (beat.rawName === '-' || beat.rawName === '—')
                                  ? (activeChordToDisplay || beat.effectiveChord || '—')
                                  : (beat.rawName || (beat.effectiveChord ? '—' : '•'))
                              )}
                            </span>
                            <span className="text-[7px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                              b.{(beat.index % masterLength) + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Subtle Rhythmic Beat Pulse Indicator */}
                <div className="flex items-center gap-1 pt-1 border-t border-slate-200/50 dark:border-white/5">
                  {measure.beats.map((beat) => {
                    const isBeatActive = isPlaying && currentIndex === beat.index;
                    return (
                      <div
                        key={beat.index}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-all duration-75",
                          isBeatActive
                            ? "bg-emerald-500 scale-y-125 shadow-xs shadow-emerald-500"
                            : isCurrentMeasure
                              ? (resolvedTheme === 'dark' ? "bg-white/20" : "bg-slate-300")
                              : (resolvedTheme === 'dark' ? "bg-white/5" : "bg-slate-100")
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
