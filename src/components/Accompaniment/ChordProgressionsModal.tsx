/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Search, Music, Sparkles, Play, Plus, RefreshCw, Layers, ArrowLeftRight, Tag, Info, Disc, Check
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { useAccompaniment } from '../../contexts/AccompanimentContext.tsx';
import { formatChordName, transposeChord } from './constants.ts';
import { 
  CHORD_PROGRESSIONS_LIBRARY, DetailedProgression, ProgressionVariation 
} from './chordProgressionsData.ts';

interface ChordProgressionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProgression: (
    chordsPerBeat: string[], 
    timeSignature: '4/4' | '3/4' | '6/8' | '5/4', 
    bpm: number | undefined, 
    mode: 'replace' | 'add',
    progressionName: string,
    shift: number
  ) => void;
  hasExistingChords: boolean;
}

export default function ChordProgressionsModal({
  isOpen,
  onClose,
  onLoadProgression,
  hasExistingChords
}: ChordProgressionsModalProps) {
  const { resolvedTheme } = useTheme();
  const { playChord } = useAudio();
  const { selectedInstrument, accompanimentVolume } = useAccompaniment();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('ALL');
  const [selectedTimeSigFilter, setSelectedTimeSigFilter] = useState<string>('ALL');

  // Track active variation index per progression ID
  const [activeVariationMap, setActiveVariationMap] = useState<Record<string, number>>({});

  // Track transposition shift per progression ID
  const [transpositionMap, setTranspositionMap] = useState<Record<string, number>>({});

  if (!isOpen) return null;

  const handleSetVariation = (progressionId: string, varIndex: number) => {
    setActiveVariationMap(prev => ({
      ...prev,
      [progressionId]: varIndex
    }));
  };

  const handleShiftKey = (progressionId: string, semitones: number) => {
    setTranspositionMap(prev => ({
      ...prev,
      [progressionId]: (prev[progressionId] || 0) + semitones
    }));
  };

  const handleResetKey = (progressionId: string) => {
    setTranspositionMap(prev => ({
      ...prev,
      [progressionId]: 0
    }));
  };

  const getActiveVariation = (progression: DetailedProgression): ProgressionVariation => {
    const varIdx = activeVariationMap[progression.id] || 0;
    return progression.variations[varIdx] || progression.variations[0];
  };

  const getTransposedVariationChords = (progression: DetailedProgression): string[] => {
    const variation = getActiveVariation(progression);
    const shift = transpositionMap[progression.id] || 0;
    if (shift === 0) return variation.chordsPerBeat;
    return variation.chordsPerBeat.map(chord => chord ? transposeChord(chord, shift, 'sharp') : '');
  };

  const handlePreviewFirstChord = (progression: DetailedProgression) => {
    const chords = getTransposedVariationChords(progression);
    const firstChord = chords.find(c => c && c.trim() !== '');
    if (firstChord) {
      playChord(firstChord, selectedInstrument, accompanimentVolume);
    }
  };

  const handleLoad = (progression: DetailedProgression, mode: 'replace' | 'add') => {
    const chords = getTransposedVariationChords(progression);
    const shift = transpositionMap[progression.id] || 0;
    const variation = getActiveVariation(progression);
    const fullName = `${progression.name} (${variation.name})`;

    onLoadProgression(
      chords,
      progression.timeSignature,
      progression.bpm,
      mode,
      fullName,
      shift
    );
  };

  // Filter logic
  const filteredProgressions = CHORD_PROGRESSIONS_LIBRARY.filter(p => {
    // Genre filter
    const matchesGenre = selectedGenre === 'ALL'
      ? true
      : p.genre.toLowerCase().includes(selectedGenre.toLowerCase());

    // Time Sig filter
    const matchesTimeSig = selectedTimeSigFilter === 'ALL'
      ? true
      : p.timeSignature === selectedTimeSigFilter;

    // Search query filter
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesGenre && matchesTimeSig;

    const matchName = p.name.toLowerCase().includes(query);
    const matchDesc = p.description.toLowerCase().includes(query);
    const matchGenre = p.genre.toLowerCase().includes(query);
    const matchSong = p.popularSongs.some(s => s.toLowerCase().includes(query));
    const matchVars = p.variations.some(v => 
      v.name.toLowerCase().includes(query) || 
      v.chordsPerBeat.some(c => c.toLowerCase().includes(query))
    );

    return matchesGenre && matchesTimeSig && (matchName || matchDesc || matchGenre || matchSong || matchVars);
  });

  const genresList = [
    'ALL',
    'J-Pop / Anime',
    'Pop',
    'Jazz',
    'Rock',
    'Blues',
    'R&B / Soul',
    'Bossa Nova',
    'Flamenco',
    'Country / Folk'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={cn(
          "w-full max-w-4xl max-h-[90vh] rounded-2xl border p-5 md:p-6 flex flex-col shadow-2xl relative overflow-hidden",
          resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
        )}
      >
        {/* Top Header Bar */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-200 dark:border-white/10 shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-black uppercase tracking-wider">
                  Popular Chord Progressions & Variations
                </h2>
                <span className="text-[9px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {filteredProgressions.length} Templates
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Load classic progressions or complex variations directly into your backing arrangement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col gap-2.5 py-3 border-b border-slate-200 dark:border-white/10 shrink-0">
          {/* Search Input */}
          <div className="relative w-full">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")} />
            <input
              type="text"
              placeholder="Search progressions by name, genre, song (e.g. Pretender, Royal Road, Creep, Coltrane, 7ths)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-9 pr-8 py-2 rounded-xl border text-xs font-medium outline-none transition-all focus:border-emerald-500",
                resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white placeholder:text-white/30" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Genre Filters & Time Sig Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
            {/* Genre Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              {genresList.map(genre => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 border",
                    selectedGenre === genre
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-xs"
                      : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/50 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200")
                  )}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Time Signature Filters */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <span className="text-[9px] font-bold text-slate-400 mr-1">Time Sig:</span>
              {['ALL', '4/4', '3/4', '6/8', '5/4'].map(ts => (
                <button
                  key={ts}
                  onClick={() => setSelectedTimeSigFilter(ts)}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[8px] font-mono transition-all border",
                    selectedTimeSigFilter === ts
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold"
                      : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/40 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200")
                  )}
                >
                  {ts}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable List of Progressions */}
        <div className="flex-1 overflow-y-auto py-3 pr-1 flex flex-col gap-4 min-h-0 custom-scrollbar">
          {filteredProgressions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center gap-2 text-slate-400 my-auto">
              <Music className="w-10 h-10 opacity-30" />
              <span className="text-xs font-bold">No matching chord progressions found</span>
              <span className="text-[10px] opacity-75">Try clearing your search query or genre filter</span>
            </div>
          ) : (
            filteredProgressions.map(progression => {
              const activeVarIdx = activeVariationMap[progression.id] || 0;
              const activeVariation = getActiveVariation(progression);
              const shift = transpositionMap[progression.id] || 0;
              const transposedChords = getTransposedVariationChords(progression);

              const beatsPerMeasure = progression.timeSignature === '4/4' ? 4 : progression.timeSignature === '3/4' ? 3 : progression.timeSignature === '6/8' ? 6 : 5;
              const totalMeasures = Math.ceil(transposedChords.length / beatsPerMeasure);

              return (
                <div
                  key={progression.id}
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col gap-3 transition-all relative overflow-hidden shrink-0",
                    resolvedTheme === 'dark'
                      ? "bg-white/[0.03] border-white/10 hover:border-emerald-500/40"
                      : "bg-white border-slate-200 hover:border-emerald-500 shadow-sm"
                  )}
                >
                  {/* Top Bar: Name, Genre, Time Signature & BPM */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs md:text-sm font-black tracking-tight text-emerald-500">
                          {progression.name}
                        </h3>
                        <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {progression.genre}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-2xl">
                        {progression.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        {progression.timeSignature}
                      </span>
                      {progression.bpm && (
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          ♩ = {progression.bpm}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Popular Songs Pills */}
                  {progression.popularSongs && progression.popularSongs.length > 0 && (
                    <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-100/70 dark:bg-black/30 border border-slate-200 dark:border-white/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Music className="w-2.5 h-2.5 text-emerald-500" />
                        Popular Songs Using This Progression:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {progression.popularSongs.map((songName, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 shadow-2xs"
                          >
                            {songName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variations Tabs */}
                  {progression.variations && progression.variations.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                        <span className="uppercase tracking-widest">Select Variation ({progression.variations.length} available):</span>
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {progression.variations.map((varItem, varIdx) => (
                          <button
                            key={varItem.id}
                            onClick={() => handleSetVariation(progression.id, varIdx)}
                            className={cn(
                              "px-2.5 py-1 rounded-xl text-[9px] font-bold transition-all border whitespace-nowrap shrink-0 flex items-center gap-1",
                              activeVarIdx === varIdx
                                ? "bg-indigo-600 text-white border-indigo-500 shadow-xs font-black"
                                : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/60 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200")
                            )}
                          >
                            {activeVarIdx === varIdx && <Check className="w-2.5 h-2.5" />}
                            <span>{varItem.name}</span>
                          </button>
                        ))}
                      </div>
                      {activeVariation.description && (
                        <p className="text-[9px] text-indigo-400 font-medium italic pl-1">
                          ↳ {activeVariation.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Transposition & Chord Preview Area */}
                  <div className={cn(
                    "p-3 rounded-xl border flex flex-col gap-2 transition-colors",
                    resolvedTheme === 'dark' ? "bg-black/40 border-white/10" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 uppercase tracking-widest text-[8px]">Chords ({totalMeasures} bars) — <span className="text-emerald-500 font-semibold">Click any chord to hear:</span></span>
                        {shift !== 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono text-[8px]">
                            {shift > 0 ? `+${shift}` : shift} st transposed
                          </span>
                        )}
                      </div>

                      {/* Transposition adjustment buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleShiftKey(progression.id, -1)}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all",
                            resolvedTheme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                          )}
                          title="Transpose down 1 semitone (-1 st)"
                        >
                          -1st
                        </button>
                        <button
                          onClick={() => handleShiftKey(progression.id, 1)}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all",
                            resolvedTheme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                          )}
                          title="Transpose up 1 semitone (+1 st)"
                        >
                          +1st
                        </button>
                        {shift !== 0 && (
                          <button
                            onClick={() => handleResetKey(progression.id)}
                            className="text-[8px] font-mono text-emerald-500 hover:underline px-1"
                          >
                            Reset
                          </button>
                        )}
                        <button
                          onClick={() => handlePreviewFirstChord(progression)}
                          className="ml-1 text-[8px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20"
                          title="Play first chord"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Sound First</span>
                        </button>
                      </div>
                    </div>

                    {/* Chord Badges Display Grid */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {transposedChords.map((chord, cIdx) => {
                        const isBarStart = cIdx % beatsPerMeasure === 0;
                        const hasChord = chord.trim() !== '';

                        return (
                          <React.Fragment key={cIdx}>
                            {isBarStart && cIdx > 0 && (
                              <div className="h-5 w-px bg-slate-300 dark:bg-white/20 mx-0.5 shrink-0" />
                            )}
                            {hasChord ? (
                              <button
                                type="button"
                                onClick={() => playChord(chord, selectedInstrument, accompanimentVolume)}
                                className={cn(
                                  "px-2 py-1 rounded-lg border font-mono font-bold text-xs flex items-center justify-center min-w-[36px]",
                                  "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 shadow-2xs hover:bg-emerald-500/30 hover:border-emerald-500/60 active:scale-95 cursor-pointer transition-all"
                                )}
                                title={`Click to play ${chord}`}
                              >
                                {formatChordName(chord)}
                              </button>
                            ) : (
                              <div className="px-2 py-1 rounded-lg border border-transparent font-mono font-bold text-xs flex items-center justify-center min-w-[36px] opacity-30 text-slate-400">
                                —
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons: Replace vs Add to Progression */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60 dark:border-white/5">
                    {hasExistingChords ? (
                      <>
                        <button
                          onClick={() => handleLoad(progression, 'add')}
                          className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-xs shrink-0"
                          title="Append this progression to the end of your current chord progression"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Progression</span>
                        </button>

                        <button
                          onClick={() => handleLoad(progression, 'replace')}
                          className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-xs shrink-0"
                          title="Replace your current chord progression with this template"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Replace Existing</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleLoad(progression, 'replace')}
                        className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-md shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Load Progression</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
