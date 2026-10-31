/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Edit3, Timer, LocateFixed } from 'lucide-react';
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
}

export default function CompactPlaybackChart({
  masterLength,
  timeSigLabel,
  onEditBeat,
  onOpenEditor,
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
    activeGroovePattern,
    isGrooveEngineEnabled,
    isTrackMeasuresEnabled,
    setIsTrackMeasuresEnabled
  } = useAccompaniment();

  const { playChord } = useAudio();
  const { resolvedTheme } = useTheme();
  const activeMeasureRef = useRef<HTMLDivElement | null>(null);

  const totalMeasures = Math.max(1, Math.ceil(progression.length / masterLength));

  // Determine current active and next chord for HUD
  const lastDisplayedChordRef = useRef<string>('—');
  const currentActiveChordInfo = getEffectiveChord(progression, currentIndex);
  const rawActiveChord = progression[currentIndex]?.name;

  let activeChordToDisplay: string;
  if (isPlaying) {
    if (!rawActiveChord || rawActiveChord === '-' || rawActiveChord === '—' || rawActiveChord === '–') {
      // If the active chord is "-", display the last displayed active chord instead of "-"
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

    // Analyze if the measure has only 1 distinct chord
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
    <div className="flex flex-col gap-3 w-full">
      {/* Heads-Up Display (HUD): Now Playing & Next Up Banner */}
      <div className={cn(
        "p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-all",
        isPlaying
          ? (resolvedTheme === 'dark' ? "bg-emerald-950/30 border-emerald-500/40 shadow-sm shadow-emerald-500/10" : "bg-emerald-50/80 border-emerald-300 shadow-xs")
          : (resolvedTheme === 'dark' ? "bg-white/[0.02] border-white/10" : "bg-slate-50 border-slate-200")
      )}>
        {/* Left: Current Position & Active Chord */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono",
              isPlaying
                ? "bg-emerald-500 text-white border-emerald-400 animate-pulse"
                : "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-transparent font-bold"
            )}>
              {isPlaying ? (isCountingIn ? 'Lead-In' : 'Playing') : 'Ready'}
            </span>

            <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
              {isCountingIn ? (
                <span className="text-amber-500 font-extrabold flex items-center gap-1">
                  <Timer className="w-3 h-3 animate-spin" />
                  Count {countInBeat}/{masterLength}
                </span>
              ) : isPlaying ? (
                `m.${Math.floor(currentIndex / masterLength) + 1} • Beat ${(currentIndex % masterLength) + 1}/${masterLength}`
              ) : (
                `${totalMeasures} ${totalMeasures === 1 ? 'Measure' : 'Measures'} • ${timeSigLabel}`
              )}
            </span>
          </div>

        </div>

        {/* Right: Controls, Track Measures Toggle, Groove Badge & Beat Dots */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Measure Follow / Tracking Toggle */}
          <button
            onClick={() => setIsTrackMeasuresEnabled(!isTrackMeasuresEnabled)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-extrabold transition-all cursor-pointer shadow-2xs",
              isTrackMeasuresEnabled
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
                : (resolvedTheme === 'dark'
                    ? "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-950")
            )}
            title={isTrackMeasuresEnabled ? "Auto-scrolling measures during playback (Click to disable tracking)" : "Measure tracking paused (Click to follow playback)"}
          >
            <LocateFixed className={cn("w-3.5 h-3.5", isTrackMeasuresEnabled ? "text-emerald-500" : "text-slate-400")} />
            <span className="hidden sm:inline">Track Measures</span>
            <span className={cn(
              "text-[8px] font-mono px-1 py-0.2 rounded font-black uppercase tracking-wider",
              isTrackMeasuresEnabled ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-white/15 text-slate-700 dark:text-slate-300"
            )}>
              {isTrackMeasuresEnabled ? "ON" : "OFF"}
            </span>
          </button>

          {isGrooveEngineEnabled && activeGroovePattern && (
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span className="truncate max-w-[130px]">{activeGroovePattern.name}</span>
            </div>
          )}

          {/* Beat visualizer dots */}
          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-slate-200/50 dark:bg-white/5 border border-slate-300/40 dark:border-white/5">
            {Array.from({ length: masterLength }).map((_, b) => {
              const isActive = isPlaying && (
                isCountingIn ? (countInBeat - 1 === b) : (currentIndex % masterLength === b)
              );
              return (
                <div
                  key={b}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-75",
                    isActive
                      ? (isCountingIn ? "bg-amber-500 scale-125 shadow-xs shadow-amber-500" : "bg-emerald-500 scale-125 shadow-xs shadow-emerald-500")
                      : (resolvedTheme === 'dark' ? "bg-white/20" : "bg-slate-300")
                  )}
                />
              );
            })}
          </div>

          {onOpenEditor && (
            <button
              onClick={onOpenEditor}
              className={cn(
                "p-1.5 rounded-lg border text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-all shadow-2xs",
                resolvedTheme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white border-slate-300 hover:bg-slate-100"
              )}
              title="Open Beat & Chord Grid Editor"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Real-Book / Lead-Sheet Compact Measures Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
        {measuresData.map((measure) => {
          const mIdx = measure.measureIndex;
          const isCurrentMeasure = isPlaying && Math.floor(currentIndex / masterLength) === mIdx;

          return (
            <div
              key={mIdx}
              ref={isCurrentMeasure ? activeMeasureRef : null}
              className={cn(
                "relative rounded-xl border p-2.5 flex flex-col justify-between transition-all select-none min-h-[96px]",
                isCurrentMeasure
                  ? (resolvedTheme === 'dark'
                      ? "bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/50 shadow-md shadow-emerald-500/10"
                      : "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm")
                  : (resolvedTheme === 'dark'
                      ? "bg-white/[0.03] border-white/10 hover:border-white/20"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs")
              )}
            >
              {/* Measure Card Header: Measure Number + Optional Section Label */}
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200/60 dark:border-white/5 text-[9px] font-mono">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn(
                    "font-black px-1.5 py-0.2 rounded text-[8px]",
                    isCurrentMeasure
                      ? "bg-emerald-500 text-white font-bold"
                      : "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 font-extrabold"
                  )}>
                    {mIdx + 1}
                  </span>

                  {measure.label && (
                    <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 truncate max-w-[110px]" title={measure.label}>
                      {measure.label}
                    </span>
                  )}
                </div>

                {isCurrentMeasure && isCountingIn && mIdx === 0 && (
                  <span className="text-[8px] font-black text-amber-500 animate-pulse uppercase">
                    Count {countInBeat}
                  </span>
                )}
              </div>

              {/* Chords Layout inside the Measure */}
              <div className="flex-1 flex items-center justify-center py-1">
                {measure.hasSingleChord ? (
                  // Single Chord spanning the measure with slash notation
                  <button
                    onClick={() => handleChordClick(measure.beats[0].index, measure.primaryChord)}
                    className={cn(
                      "w-full h-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg transition-all text-center group cursor-pointer",
                      selectedBeatIndex === measure.beats[0].index
                        ? "bg-emerald-500/15 ring-2 ring-emerald-500 shadow-2xs"
                        : (resolvedTheme === 'dark' 
                            ? "hover:bg-white/10 text-white" 
                            : "hover:bg-slate-100 text-slate-900 hover:text-slate-950")
                    )}
                  >
                    <span className={cn(
                      "text-base md:text-lg font-black font-mono tracking-tight transition-all",
                      isCurrentMeasure && measure.primaryChord
                        ? "text-emerald-600 dark:text-emerald-400 scale-105"
                        : (resolvedTheme === 'dark' ? "text-white group-hover:text-white" : "text-slate-900 group-hover:text-slate-950")
                    )}>
                      {formatChordName(measure.primaryChord || '—')}
                    </span>

                    {/* Slashes for remaining beats */}
                    <span className="text-xs font-mono text-slate-400 dark:text-white/20 font-bold select-none tracking-widest">
                      {Array.from({ length: masterLength - 1 }).map((_, i) => ' / ').join('')}
                    </span>
                  </button>
                ) : (
                  // Multi-chord measure: split into individual beat cells
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
                            "flex flex-col items-center justify-center h-10 rounded-md border text-center transition-all cursor-pointer p-0.5",
                            isCellPlaying
                              ? "bg-emerald-500 text-white border-emerald-400 shadow-xs scale-105 font-bold"
                              : isSelected
                                ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold ring-1 ring-emerald-500"
                                : beat.isExplicit
                                  ? (resolvedTheme === 'dark' 
                                      ? "bg-white/5 border-white/10 hover:bg-white/15 text-white hover:text-white font-bold" 
                                      : "bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-900 hover:text-slate-950 font-black")
                                  : (resolvedTheme === 'dark' 
                                      ? "bg-transparent border-dashed border-white/10 text-white/40 hover:bg-white/5 hover:text-white" 
                                      : "bg-transparent border-dashed border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800")
                          )}
                          title={`Beat ${(beat.index % masterLength) + 1}: ${beat.effectiveChord || 'Empty'}`}
                        >
                          <span className="text-[11px] font-black font-mono leading-none truncate w-full px-0.5">
                            {formatChordName(
                              isCellPlaying && (beat.rawName === '-' || beat.rawName === '—')
                                ? (activeChordToDisplay || beat.effectiveChord || '—')
                                : (beat.rawName || (beat.effectiveChord ? '—' : '•'))
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Beat Progress Bar for Active Measure */}
              <div className="flex items-center gap-1 pt-1 mt-1 border-t border-slate-200/40 dark:border-white/5">
                {measure.beats.map((beat) => {
                  const isBeatActive = isPlaying && currentIndex === beat.index;
                  return (
                    <div
                      key={beat.index}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-75",
                        isBeatActive
                          ? "bg-emerald-500 shadow-xs shadow-emerald-500"
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
  );
}
