/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, Reorder } from 'motion/react';
import { Play, Pause, Plus, Trash2, Guitar as GuitarIcon, Music, Layers, Radio, ChevronDown, Move, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useMetronome } from '../../hooks/useMetronome.ts';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { useAccompaniment } from '../../contexts/AccompanimentContext.tsx';
import { InstrumentType } from '../../types.ts';
import ChordExplorer from '../ChordExplorer/ChordExplorer.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';

const CHORD_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CHORD_TYPES = [
  { label: 'Major', suffix: '', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { label: 'Minor', suffix: 'm', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { label: '7th', suffix: '7', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { label: 'Major 7th', suffix: 'maj7', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { label: 'Minor 7th', suffix: 'min7', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { label: 'Minor 6th', suffix: 'm6', color: 'bg-cyan-600/10 text-cyan-400 border-cyan-600/20' },
  { label: 'Minor 6/9', suffix: 'm69', color: 'bg-teal-600/10 text-teal-400 border-teal-600/20' },
  { label: 'Minor 9th', suffix: 'm9', color: 'bg-sky-600/10 text-sky-400 border-sky-600/20' },
  { label: 'Minor Add 9', suffix: 'madd9', color: 'bg-blue-400/10 text-blue-300 border-blue-400/20' },
  { label: 'Minor 11th', suffix: 'm11', color: 'bg-indigo-400/10 text-indigo-300 border-indigo-400/20' },
  { label: 'Minor Maj 7', suffix: 'mmaj7', color: 'bg-violet-600/10 text-violet-400 border-violet-600/20' },
  { label: 'Minor Maj 7b5', suffix: 'mmaj7b5', color: 'bg-fuchsia-600/10 text-fuchsia-400 border-fuchsia-600/20' },
  { label: 'Minor Maj 9', suffix: 'mmaj9', color: 'bg-rose-600/10 text-rose-400 border-rose-600/20' },
  { label: '7 #9', suffix: '7#9', color: 'bg-orange-600/10 text-orange-400 border-orange-600/20' },
  { label: 'Suspended 2', suffix: 'sus2', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { label: 'Suspended 4', suffix: 'sus4', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { label: 'Add 9', suffix: 'add9', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  { label: 'Diminished', suffix: 'dim', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { label: 'Diminished 7', suffix: 'dim7', color: 'bg-red-600/10 text-red-500 border-red-600/20' },
  { label: 'Half-Dim 7', suffix: 'm7b5', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { label: '6/9 Chord', suffix: '69', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { label: '9th Chord', suffix: '9', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  { label: '11th Chord', suffix: '11', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  { label: '13th Chord', suffix: '13', color: 'bg-lime-500/10 text-lime-400 border-lime-500/20' },
];

const CHORD_INTERVALS: Record<string, number[]> = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  '7': [0, 4, 7, 10],
  'maj7': [0, 4, 7, 11],
  'min7': [0, 3, 7, 10],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  'add9': [0, 4, 7, 14],
  'dim': [0, 3, 6],
  'dim7': [0, 3, 6, 9],
  'm7b5': [0, 3, 6, 10],
  '69': [0, 4, 7, 9, 14],
  '9': [0, 4, 7, 10, 14],
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 17, 21],
  'aug': [0, 4, 8],
  'm': [0, 3, 7],
  'm7': [0, 3, 7, 10],
  'm6': [0, 3, 7, 9],
  'm69': [0, 3, 7, 9, 14],
  'm9': [0, 3, 7, 10, 14],
  'madd9': [0, 3, 7, 14],
  'm11': [0, 3, 7, 10, 14, 17],
  'mmaj7': [0, 3, 7, 11],
  'mmaj7b5': [0, 3, 6, 11],
  'mmaj9': [0, 3, 7, 11, 14],
  '7#9': [0, 4, 7, 10, 15],
};

const ROOT_OFFSETS: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

function getIntervalsForChord(chordName: string): number[] {
  let root = '';
  let suffix = '';
  
  if (chordName.length >= 2 && (chordName[1] === '#' || chordName[1] === 'b')) {
    root = chordName.substring(0, 2);
    suffix = chordName.substring(2);
  } else {
    root = chordName[0];
    suffix = chordName.substring(1);
  }

  const offset = ROOT_OFFSETS[root] || 0;
  
  // Normalize suffixes
  let type = suffix === '' ? 'major' : suffix;
  if (type === 'm') type = 'minor';
  if (type === 'min7') type = 'm7';
  if (type === 'major7') type = 'maj7';
  if (type === 'mmajor7') type = 'mmaj7';
  
  const intervals = CHORD_INTERVALS[type] || CHORD_INTERVALS['major'];
  
  return intervals.map(v => v + offset);
}

const ARPEGGIO_PRESETS = ['Block', 'Up', 'Down', 'Up-Down', 'Converge', 'Diverge', 'Stutter', 'Random'];

const INSTRUMENTS = [
  { id: InstrumentType.Piano, label: 'Piano', icon: Music },
  { id: InstrumentType.Organ, label: 'Organ', icon: KeyboardIcon },
  { id: InstrumentType.Strings, label: 'Strings', icon: Layers },
  { id: InstrumentType.Guitar, label: 'Guitar', icon: GuitarIcon }
];

// Helper as KeyboardIcon is not in standard lucide for this version usually, using Piano style
function KeyboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
      <line x1="2" y1="13" x2="22" y2="13" />
      <line x1="6" y1="13" x2="6" y2="21" />
      <line x1="10" y1="13" x2="10" y2="21" />
      <line x1="14" y1="13" x2="14" y2="21" />
      <line x1="18" y1="13" x2="18" y2="21" />
    </svg>
  );
}

interface ProgressionChord {
  id: string;
  name: string;
}

export default function AccompanimentView() {
  const { 
    progression, setProgression, 
    arpeggioPreset, setArpeggioPreset,
    selectedInstrument, setSelectedInstrument,
    isBassEnabled, setIsBassEnabled,
    selectedLibraryRoot, setSelectedLibraryRoot,
    trackedChord, setTrackedChord,
    isPlaying, setIsPlaying,
    isPendingStart,
    currentIndex,
    accompanimentVolume,
    setAccompanimentVolume
  } = useAccompaniment();
  const { resolvedTheme } = useTheme();

  const { isPlaying: isMetronomeRunning, start: startMetronome, stop: stopMetronome, activePattern } = useMetronome();
  const { playChord, playNote } = useAudio();

  const masterVoice = activePattern?.voices[0];
  const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;
  
  // Local beat calculation for visual indicators only
  const { currentBeat } = useAudio();
  const beatInMeasure = currentBeat % masterLength;

  const addChord = (chordName: string) => {
    setProgression([...progression, { id: Math.random().toString(36).substr(2, 9), name: chordName }]);
  };

  const clearProgression = () => {
    setProgression([]);
    setIsPlaying(false);
  };

  const removeChord = (index: number) => {
    setProgression(progression.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full flex flex-col gap-6">
      <div className="flex flex-col gap-6 w-full">
        {/* Row 1: Engine & Explorer */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Progression Editor (2/3 width) */}
          <div className={cn(
            "lg:w-2/3 rounded-2xl border p-6 md:p-8 relative overflow-hidden flex flex-col h-auto transition-colors",
            resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
          )}>
            <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-emerald-500 tracking-[0.3em] uppercase italic">Backing Engine</span>
                <div className={cn("hidden sm:block h-[1px] w-8", resolvedTheme === 'dark' ? "bg-white/10" : "bg-black/10")} />
                <div className="flex items-center gap-2">
                  <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                  <span className={cn("text-[9px] font-bold uppercase tracking-widest truncate max-w-[120px]", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-500")}>
                    {selectedInstrument} / {arpeggioPreset}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Instrument Selector Dropdown */}
                <div className="relative group">
                  <select
                    value={selectedInstrument}
                    onChange={(e) => setSelectedInstrument(e.target.value as InstrumentType)}
                    className={cn(
                      "appearance-none border px-4 pr-10 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer outline-none focus:border-emerald-500/50",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10" : "bg-slate-100 border-black/5 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    )}
                  >
                    {INSTRUMENTS.map(inst => (
                      <option key={inst.id} value={inst.id} className={cn(resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>{inst.label}</option>
                    ))}
                  </select>
                  <ChevronDown className={cn("absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")} />
                </div>

                {/* Arpeggio Dropdown */}
                <div className="relative group">
                  <select
                    value={arpeggioPreset}
                    onChange={(e) => setArpeggioPreset(e.target.value)}
                    className={cn(
                      "appearance-none border px-4 pr-10 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer outline-none focus:border-emerald-500/50",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10" : "bg-slate-100 border-black/5 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    )}
                  >
                    {ARPEGGIO_PRESETS.map(preset => (
                      <option key={preset} value={preset} className={cn(resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>{preset}</option>
                    ))}
                  </select>
                  <ChevronDown className={cn("absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")} />
                </div>
              </div>
            </div>

            <Reorder.Group 
              axis="x" 
              values={progression} 
              onReorder={setProgression}
              className="flex flex-wrap gap-4 mb-8 min-h-[128px] items-start"
            >
              {progression.map((chordItem, i) => {
                const rootPart = chordItem.name.length >= 2 && (chordItem.name[1] === '#' || chordItem.name[1] === 'b') 
                  ? chordItem.name.substring(0, 2) 
                  : chordItem.name.substring(0, 1);
                const suffix = chordItem.name.substring(rootPart.length);
                const typeInfo = CHORD_TYPES.find(t => t.suffix === suffix) || CHORD_TYPES[0];

                return (
                  <Reorder.Item 
                    key={chordItem.id}
                    value={chordItem}
                    animate={isPlaying && currentIndex === i ? { y: -8, scale: 1.02 } : { y: 0 }}
                    onClick={() => {
                      playChord(chordItem.name, selectedInstrument, accompanimentVolume);
                      setTrackedChord(chordItem.name);
                    }}
                    className={cn(
                      "relative group w-24 h-32 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer",
                      isPlaying && currentIndex === i 
                        ? "bg-emerald-500 border-emerald-400 text-white shadow-xl shadow-emerald-500/30" 
                        : cn(
                            resolvedTheme === 'dark' ? "bg-white/[0.03] border-white/10 hover:border-white/20 hover:text-white" : "bg-white border-black/5 hover:border-black/20 hover:text-slate-900 shadow-sm",
                            typeInfo.color.split(' ')[1]
                          )
                    )}
                  >
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Move className={cn("w-3 h-3", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-300")} />
                    </div>
                    <span className="text-3xl font-black font-mono tracking-tighter shadow-sm">{chordItem.name}</span>
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] mt-1 opacity-40 text-center px-2 line-clamp-1">{typeInfo.label}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeChord(i); }}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white shadow-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Reorder.Item>
                );
              })}
              <button 
                onClick={clearProgression}
                className={cn(
                  "w-24 h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all group",
                  resolvedTheme === 'dark' ? "border-white/5 text-white/10 hover:border-red-500/50 hover:text-red-500/50 hover:bg-red-500/5" : "border-black/10 text-slate-300 hover:border-red-400 hover:text-red-400 hover:bg-red-50 shadow-sm"
                )}
              >
                <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-black uppercase tracking-widest mt-2">Clear All</span>
              </button>
            </Reorder.Group>

            <div className="flex flex-col items-center gap-8 mt-auto py-4">
               <div className="flex flex-wrap items-center justify-center gap-6">
                  {/* Bass Toggle */}
                  <button
                    onClick={() => setIsBassEnabled(!isBassEnabled)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                      isBassEnabled 
                        ? "bg-orange-500/10 border-orange-500 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]" 
                        : resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/40 hover:text-white/60 hover:bg-white/5" : "bg-slate-100 border-black/5 text-slate-400 hover:text-slate-900 hover:bg-slate-200"
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full", isBassEnabled ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" : "bg-white/20")} />
                    Bass Pulse
                  </button>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-2">
                      {Array.from({ length: masterLength }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={false}
                          animate={{
                            scale: beatInMeasure === i ? 1.2 : 1,
                            backgroundColor: beatInMeasure === i ? '#FF4E00' : (resolvedTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                            boxShadow: beatInMeasure === i ? '0 0 10px rgba(255,78,0,0.5)' : 'none'
                          }}
                          className="w-2 h-2 rounded-full"
                        />
                      ))}
                    </div>
                    <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>Beat {beatInMeasure + 1}</span>
                  </div>
               </div>

               <div className="flex flex-wrap items-center justify-center gap-4">
                  <button 
                    onClick={() => {
                      if (!isPlaying) setTrackedChord(null);
                      setIsPlaying(!isPlaying);
                    }}
                    className={cn(
                      "px-8 md:px-12 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95 min-w-[200px]",
                      isPlaying 
                        ? "bg-red-500 text-white shadow-red-500/20" 
                        : (progression.length > 0 ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20" : (resolvedTheme === 'dark' ? "bg-white/10 text-white/20 cursor-not-allowed" : "bg-slate-200 text-slate-400 cursor-not-allowed"))
                    )}
                    disabled={progression.length === 0}
                  >
                      {isPendingStart ? (
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Waiting for Beat 1</span>
                        </div>
                      ) : (
                        <>
                          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                          {isPlaying ? 'Stop Sequence' : 'Start Sequence'}
                        </>
                      )}
                  </button>

                  <button
                    onClick={() => isMetronomeRunning ? stopMetronome() : startMetronome()}
                    className={cn(
                      "px-6 md:px-8 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95 border",
                      isMetronomeRunning 
                        ? "bg-orange-600/20 border-orange-500 text-orange-500" 
                        : resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/40 hover:bg-white/10" : "bg-white border-black/10 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", isMetronomeRunning ? "bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" : "bg-white/20")} />
                    Metronome {isMetronomeRunning ? 'On' : 'Off'}
                  </button>

                  <div className={cn(
                    "flex items-center gap-4 px-6 md:px-8 py-5 rounded-2xl border transition-all shadow-xl min-w-[220px]",
                    resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/10 shadow-slate-200/50"
                  )}>
                    <div className="flex items-center gap-3 flex-1">
                      <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={accompanimentVolume}
                        onChange={(e) => setAccompanimentVolume(parseFloat(e.target.value))}
                        className="w-full accent-orange-500 h-1.5 rounded-lg appearance-none bg-slate-200/50 dark:bg-black/20 cursor-pointer"
                      />
                    </div>
                    <span className="text-[10px] font-black font-mono text-orange-500 w-8 text-right">
                      {Math.round(accompanimentVolume * 100)}%
                    </span>
                  </div>
               </div>
            </div>
          </div>

          {/* Chord Explorer (1/3 width) */}
          <section className={cn(
            "lg:w-1/3 rounded-2xl border flex flex-col min-h-[450px] lg:min-h-0 overflow-hidden transition-colors",
            resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
          )}>
            <div className="p-8 pb-0 flex items-center justify-between">
              <h3 className="font-bold text-slate-500 uppercase text-[10px] tracking-[0.3em]">Chord Explorer</h3>
              <div className="text-[10px] font-black text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                {trackedChord || (progression[currentIndex] && progression[currentIndex].name) || (progression[0] && progression[0].name)}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ChordExplorer initialChord={trackedChord || (progression[currentIndex] && progression[currentIndex].name) || (progression[0] && progression[0].name)} />
            </div>
          </section>
        </div>

        {/* Row 2: Full Width Chord Library */}
        <section className={cn(
          "w-full rounded-2xl border p-6 md:p-8 flex flex-col gap-8 h-auto transition-colors",
          resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
        )}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h3 className="font-bold text-slate-500 uppercase text-[10px] tracking-[0.3em]">Chord Library</h3>
            
            {/* Root Note Selector */}
            <div className={cn(
              "flex flex-wrap gap-1.5 p-1.5 rounded-2xl border transition-colors",
              resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-black/5"
            )}>
              {CHORD_ROOTS.map(root => (
                <button
                  key={root}
                  onClick={() => setSelectedLibraryRoot(root)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                    selectedLibraryRoot === root 
                      ? (resolvedTheme === 'dark' ? "bg-white text-black" : "bg-slate-900 text-white shadow-lg")
                      : (resolvedTheme === 'dark' ? "text-white/40 hover:text-white/60" : "text-slate-400 hover:text-slate-900")
                  )}
                >
                  {root}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {CHORD_TYPES.map(type => {
              const chordName = `${selectedLibraryRoot}${type.suffix}`;
              return (
                <button 
                  key={type.label}
                  onClick={() => {
                    addChord(chordName);
                    playChord(chordName, selectedInstrument, accompanimentVolume);
                    setTrackedChord(chordName);
                  }}
                  className={cn(
                    "group flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border transition-all active:scale-95 min-h-[100px] shadow-sm",
                    type.color,
                    resolvedTheme === 'light' && "border-slate-200"
                  )}
                >
                  <span className="text-xl font-black font-mono tracking-tighter">{chordName}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity text-center">
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

