/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Drum, 
  Waves, 
  Mic2, 
  Piano, 
  Play, 
  Pause, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Minus, 
  Volume2, 
  VolumeX, 
  X, 
  Music, 
  ExternalLink,
  ChevronRight,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useScores } from '../../contexts/ScoreContext.tsx';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { useMetronome } from '../../hooks/useMetronome.ts';
import { useDrone } from '../../hooks/useDrone.ts';
import { useAccompaniment } from '../../contexts/AccompanimentContext.tsx';
import { NOTES } from '../../constants.ts';
import { DroneTone } from '../Drone/types.ts';
import { GROOVE_PRESETS } from '../Accompaniment/grooveEngine.ts';
import ScoreAudioPlayer from '../Score/ScoreAudioPlayer.tsx';

interface PracticeToolsDockProps {
  onNavigate?: (view: 'metronome' | 'tuner' | 'drone' | 'score' | 'accompaniment') => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

type ActiveDrawer = 'metronome' | 'drone' | 'tuner' | 'accompaniment' | 'audio' | null;

export default function PracticeToolsDock({ onNavigate, fileInputRef }: PracticeToolsDockProps) {
  const { resolvedTheme } = useTheme();
  const { globalAudio, activeScore } = useScores();
  const { playingRefNote, playRefNote, stopRefNote } = useAudio();

  // Metronome Hook
  const { 
    isPlaying: isMetronomePlaying, 
    bpm: metronomeBpm, 
    setBpm: setMetronomeBpm, 
    start: startMetronome, 
    stop: stopMetronome,
    metronomeVolume,
    setMetronomeVolume,
    currentBeat
  } = useMetronome();

  // Drone Hook
  const { 
    isDronePlaying, 
    setIsDronePlaying, 
    selectedDroneNote, 
    setSelectedDroneNote, 
    droneTone, 
    setDroneTone,
    droneVolume,
    setDroneVolume,
    userDroneNotes,
    toggleDroneNote
  } = useDrone();

  // Accompaniment Hook
  const { 
    isPlaying: isAccompanimentPlaying, 
    setIsPlaying: setIsAccompanimentPlaying,
    accompanimentVolume,
    setAccompanimentVolume,
    progression,
    currentIndex,
    arpeggioPreset,
    setArpeggioPreset,
    voicingStyle,
    setVoicingStyle
  } = useAccompaniment();

  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('musobuddy_dock_collapsed') === 'true';
  });
  const [droneOctave, setDroneOctave] = useState<'2' | '3' | '4'>('4');

  // Tap Tempo state
  const tapTimesRef = useRef<number[]>([]);
  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    const times = tapTimesRef.current;
    if (times.length > 0 && now - times[times.length - 1] > 2000) {
      tapTimesRef.current = [now];
      return;
    }
    times.push(now);
    if (times.length > 4) times.shift();
    if (times.length >= 2) {
      const intervals = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 30 && calculatedBpm <= 300) {
        setMetronomeBpm(calculatedBpm);
      }
    }
  }, [setMetronomeBpm]);

  const toggleDrawer = (drawer: ActiveDrawer) => {
    setActiveDrawer(prev => prev === drawer ? null : drawer);
  };

  const handleCollapseToggle = () => {
    const next = !isDockCollapsed;
    setIsDockCollapsed(next);
    localStorage.setItem('musobuddy_dock_collapsed', String(next));
    if (next) setActiveDrawer(null);
  };

  // Determine active chord in accompaniment
  const activeChordName = progression.length > 0 && currentIndex >= 0 && currentIndex < progression.length
    ? progression[currentIndex]?.name || '—'
    : progression[0]?.name || '—';

  const hasScoreAudio = !!(globalAudio || activeScore?.audioUrl);

  // If dock is collapsed, render minimal floating pill trigger
  if (isDockCollapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={handleCollapseToggle}
          title="Open Practice Tools Dock"
          className={cn(
            "h-10 px-3.5 rounded-full border shadow-xl flex items-center gap-2 text-xs font-semibold backdrop-blur-xl transition-all cursor-pointer hover:scale-105 active:scale-95",
            resolvedTheme === 'dark' 
              ? "bg-[#181A1F]/90 border-white/[0.12] text-neutral-200 shadow-black/40" 
              : "bg-white/90 border-neutral-200 text-neutral-800 shadow-neutral-900/10"
          )}
        >
          <div className="flex items-center gap-1.5">
            <Drum className={cn("w-3.5 h-3.5", isMetronomePlaying ? "text-[#E05A2B] animate-pulse" : "text-neutral-400")} />
            <Waves className={cn("w-3.5 h-3.5", isDronePlaying ? "text-emerald-500 animate-pulse" : "text-neutral-400")} />
            <Piano className={cn("w-3.5 h-3.5", isAccompanimentPlaying ? "text-blue-500 animate-pulse" : "text-neutral-400")} />
          </div>
          <span className="text-[11px] font-mono tabular-nums">{metronomeBpm} BPM</span>
          <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative shrink-0 z-40 select-none">
      {/* Slide-out Drawer Panel */}
      <AnimatePresence>
        {activeDrawer && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={cn(
              "absolute bottom-full left-0 right-0 border-t backdrop-blur-2xl p-3 sm:p-4 shadow-2xl transition-colors",
              resolvedTheme === 'dark'
                ? "bg-[#16181D]/98 border-white/[0.08] text-neutral-200"
                : "bg-white/98 border-neutral-200 text-neutral-800"
            )}
          >
            <div className="max-w-5xl mx-auto flex flex-col gap-3">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  {activeDrawer === 'metronome' && <Drum className="w-4 h-4 text-[#E05A2B]" />}
                  {activeDrawer === 'drone' && <Waves className="w-4 h-4 text-emerald-500" />}
                  {activeDrawer === 'tuner' && <Mic2 className="w-4 h-4 text-blue-500" />}
                  {activeDrawer === 'accompaniment' && <Piano className="w-4 h-4 text-amber-500" />}
                  {activeDrawer === 'audio' && <Music className="w-4 h-4 text-[#E05A2B]" />}
                  
                  <span className="text-xs font-bold uppercase tracking-wider font-sans">
                    {activeDrawer === 'metronome' && 'Metronome Controls'}
                    {activeDrawer === 'drone' && 'Harmonic Drone Generator'}
                    {activeDrawer === 'tuner' && 'Quick Pitch Reference'}
                    {activeDrawer === 'accompaniment' && 'Accompaniment & Groove Engine'}
                    {activeDrawer === 'audio' && 'Score Audio Playback'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {onNavigate && (
                    <button
                      onClick={() => {
                        if (activeDrawer === 'metronome') onNavigate('metronome');
                        if (activeDrawer === 'drone') onNavigate('drone');
                        if (activeDrawer === 'tuner') onNavigate('tuner');
                        if (activeDrawer === 'accompaniment') onNavigate('accompaniment');
                        setActiveDrawer(null);
                      }}
                      className={cn(
                        "text-[11px] font-medium px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer",
                        resolvedTheme === 'dark' ? "hover:bg-white/[0.08] text-neutral-300" : "hover:bg-neutral-100 text-neutral-600"
                      )}
                    >
                      <span>Full View</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => setActiveDrawer(null)}
                    className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Content: Metronome */}
              {activeDrawer === 'metronome' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={isMetronomePlaying ? stopMetronome : startMetronome}
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition-transform active:scale-95 cursor-pointer shrink-0",
                        isMetronomePlaying ? "bg-[#E05A2B]" : "bg-neutral-800 dark:bg-white/15"
                      )}
                    >
                      {isMetronomePlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                    </button>
                    <div>
                      <div className="text-2xl font-mono font-bold tabular-nums">
                        {metronomeBpm} <span className="text-xs font-normal text-neutral-400">BPM</span>
                      </div>
                      <div className="text-xs text-neutral-500">
                        Beat: <span className="font-mono font-semibold text-[#E05A2B]">{isMetronomePlaying ? (currentBeat + 1) : '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>Tempo Slider</span>
                      <button onClick={handleTapTempo} className="text-xs text-[#E05A2B] font-semibold hover:underline cursor-pointer">
                        Tap Tempo
                      </button>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={280}
                      value={metronomeBpm}
                      onChange={(e) => setMetronomeBpm(parseInt(e.target.value))}
                      className="w-full accent-[#E05A2B] cursor-pointer"
                    />
                    <div className="flex justify-between gap-1 text-[10px] font-mono text-neutral-400">
                      <span>Largo 40</span>
                      <span>Andante 80</span>
                      <span>Moderato 108</span>
                      <span>Allegro 132</span>
                      <span>Presto 180</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="text-xs text-neutral-500">Metronome Volume</div>
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-neutral-400 shrink-0" />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={metronomeVolume}
                        onChange={(e) => setMetronomeVolume(parseFloat(e.target.value))}
                        className="w-full accent-[#E05A2B] cursor-pointer"
                      />
                      <span className="text-xs font-mono tabular-nums w-8 text-right text-neutral-400">
                        {Math.round(metronomeVolume * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Drawer Content: Drone */}
              {activeDrawer === 'drone' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1.5">Root Note</div>
                    <div className="flex flex-wrap gap-1">
                      {NOTES.map((note) => (
                        <button
                          key={note}
                          onClick={() => setSelectedDroneNote(note)}
                          className={cn(
                            "w-7 h-7 rounded-md text-xs font-bold transition-colors cursor-pointer",
                            selectedDroneNote === note
                              ? "bg-emerald-600 text-white shadow-sm"
                              : resolvedTheme === 'dark'
                                ? "bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300"
                                : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                          )}
                        >
                          {note}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-neutral-500">Tone Texture</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: DroneTone.Strings, name: 'Strings' },
                        { id: DroneTone.Cello, name: 'Cello' },
                        { id: DroneTone.Bagpipe, name: 'Bagpipe' },
                        { id: DroneTone.SynthLead, name: 'Synth Lead' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setDroneTone(t.id)}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer",
                            droneTone === t.id
                              ? "bg-emerald-600/15 text-emerald-500 border border-emerald-500/30"
                              : resolvedTheme === 'dark' ? "bg-white/[0.04] text-neutral-300" : "bg-neutral-100 text-neutral-700"
                          )}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">Harmonics / Intervals</span>
                      <button
                        onClick={() => setIsDronePlaying(!isDronePlaying)}
                        className={cn(
                          "px-3 py-1 rounded-md text-xs font-bold text-white transition-colors cursor-pointer",
                          isDronePlaying ? "bg-emerald-600" : "bg-neutral-800 dark:bg-white/15"
                        )}
                      >
                        {isDronePlaying ? 'Stop Drone' : 'Start Drone'}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: `${selectedDroneNote}3`, label: 'Octave 3' },
                        { id: `${selectedDroneNote}4`, label: 'Octave 4' },
                        { id: `${selectedDroneNote}5`, label: 'Octave 5' },
                      ].map((intv) => {
                        const isToggled = userDroneNotes.includes(intv.id);
                        return (
                          <button
                            key={intv.id}
                            onClick={() => toggleDroneNote(intv.id)}
                            className={cn(
                              "flex-1 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer",
                              isToggled
                                ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                                : "bg-neutral-100 dark:bg-white/[0.05] text-neutral-400"
                            )}
                          >
                            {intv.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Drawer Content: Tuner */}
              {activeDrawer === 'tuner' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1.5">Reference Pitch (A440)</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (playingRefNote) {
                            stopRefNote();
                          } else {
                            playRefNote('A4');
                          }
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer",
                          playingRefNote ? "bg-blue-600" : "bg-neutral-800 dark:bg-white/15"
                        )}
                      >
                        {playingRefNote ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                        <span>Play Concert A (440 Hz)</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs text-neutral-500">
                    <div>Need mic pitch detection or strobe tuner?</div>
                    {onNavigate && (
                      <button
                        onClick={() => {
                          onNavigate('tuner');
                          setActiveDrawer(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-500 border border-blue-500/20 hover:bg-blue-600/20 font-semibold self-start flex items-center gap-1.5 cursor-pointer"
                      >
                        <Mic2 className="w-3.5 h-3.5" />
                        <span>Open Full Tuner View</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Drawer Content: Accompaniment */}
              {activeDrawer === 'accompaniment' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1">Active Chord</div>
                    <div className="text-2xl font-mono font-bold text-amber-500">{activeChordName}</div>
                    <div className="text-xs text-neutral-400">Progression length: {progression.length} beats</div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-neutral-500">Groove Style</div>
                    <select
                      value={arpeggioPreset}
                      onChange={(e) => setArpeggioPreset(e.target.value)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none cursor-pointer border",
                        resolvedTheme === 'dark' ? "bg-white/[0.06] border-white/10 text-white" : "bg-neutral-100 border-neutral-200 text-neutral-800"
                      )}
                    >
                      {GROOVE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id} className={resolvedTheme === 'dark' ? "bg-neutral-900" : "bg-white"}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500">Playback Volume</span>
                      <button
                        onClick={() => setIsAccompanimentPlaying(!isAccompanimentPlaying)}
                        className={cn(
                          "px-3 py-1 rounded-md text-xs font-bold text-white transition-colors cursor-pointer",
                          isAccompanimentPlaying ? "bg-amber-600" : "bg-neutral-800 dark:bg-white/15"
                        )}
                      >
                        {isAccompanimentPlaying ? 'Stop' : 'Play'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-neutral-400 shrink-0" />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={accompanimentVolume}
                        onChange={(e) => setAccompanimentVolume(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-mono tabular-nums w-8 text-right text-neutral-400">
                        {Math.round(accompanimentVolume * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Drawer Content: Audio Player */}
              {activeDrawer === 'audio' && hasScoreAudio && (
                <div className="py-1">
                  <ScoreAudioPlayer
                    url={globalAudio?.url || activeScore?.audioUrl}
                    filename={globalAudio?.name || activeScore?.audioName || activeScore?.title}
                    resolvedTheme={resolvedTheme}
                    onUploadRequested={() => fileInputRef?.current?.click()}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Dock Bar */}
      <div className={cn(
        "h-12 px-3 sm:px-6 flex items-center justify-between border-t transition-colors backdrop-blur-xl relative",
        resolvedTheme === 'dark'
          ? "bg-[#141518]/95 border-white/[0.08] text-neutral-300"
          : "bg-white/95 border-neutral-200 text-neutral-700 shadow-[0_-1px_3px_rgba(0,0,0,0.03)]"
      )}>
        {/* Tool Stations Strip */}
        <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto no-scrollbar py-1">
          {/* 1. Metronome Widget */}
          <div className={cn(
            "flex items-center gap-1 p-0.5 rounded-lg border transition-colors",
            isMetronomePlaying 
              ? "border-[#E05A2B]/40 bg-[#E05A2B]/10" 
              : resolvedTheme === 'dark' ? "border-white/[0.06] bg-white/[0.03]" : "border-neutral-200 bg-neutral-100/70"
          )}>
            <button
              onClick={isMetronomePlaying ? stopMetronome : startMetronome}
              title={isMetronomePlaying ? "Pause Metronome" : "Start Metronome"}
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer",
                isMetronomePlaying 
                  ? "bg-[#E05A2B] text-white shadow-sm" 
                  : resolvedTheme === 'dark' ? "hover:bg-white/10 text-neutral-300" : "hover:bg-neutral-200 text-neutral-700"
              )}
            >
              {isMetronomePlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => toggleDrawer('metronome')}
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono font-semibold tabular-nums hover:text-[#E05A2B] transition-colors cursor-pointer"
              title="Click to open Metronome slider & beats"
            >
              <span>{metronomeBpm}</span>
              <span className="text-[10px] text-neutral-400 font-sans uppercase">BPM</span>
              <ChevronUp className={cn("w-3 h-3 text-neutral-400 transition-transform", activeDrawer === 'metronome' && "rotate-180")} />
            </button>

            <div className="flex items-center gap-0.5 pr-0.5">
              <button
                onClick={() => setMetronomeBpm(Math.max(30, metronomeBpm - 1))}
                className="w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                title="-1 BPM"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => setMetronomeBpm(Math.min(300, metronomeBpm + 1))}
                className="w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                title="+1 BPM"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 2. Drone Widget */}
          <div className={cn(
            "flex items-center gap-1 p-0.5 rounded-lg border transition-colors",
            isDronePlaying 
              ? "border-emerald-500/40 bg-emerald-500/10" 
              : resolvedTheme === 'dark' ? "border-white/[0.06] bg-white/[0.03]" : "border-neutral-200 bg-neutral-100/70"
          )}>
            <button
              onClick={() => setIsDronePlaying(!isDronePlaying)}
              title={isDronePlaying ? "Stop Drone" : "Start Drone"}
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer",
                isDronePlaying 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : resolvedTheme === 'dark' ? "hover:bg-white/10 text-neutral-300" : "hover:bg-neutral-200 text-neutral-700"
              )}
            >
              <Waves className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => toggleDrawer('drone')}
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-semibold hover:text-emerald-500 transition-colors cursor-pointer"
              title="Click to change drone root note & harmonics"
            >
              <span className="font-mono">{selectedDroneNote}</span>
              <span className="text-[10px] text-neutral-400 uppercase hidden sm:inline">{droneTone}</span>
              <ChevronUp className={cn("w-3 h-3 text-neutral-400 transition-transform", activeDrawer === 'drone' && "rotate-180")} />
            </button>
          </div>

          {/* 3. Accompaniment Widget */}
          <div className={cn(
            "flex items-center gap-1 p-0.5 rounded-lg border transition-colors",
            isAccompanimentPlaying 
              ? "border-amber-500/40 bg-amber-500/10" 
              : resolvedTheme === 'dark' ? "border-white/[0.06] bg-white/[0.03]" : "border-neutral-200 bg-neutral-100/70"
          )}>
            <button
              onClick={() => setIsAccompanimentPlaying(!isAccompanimentPlaying)}
              title={isAccompanimentPlaying ? "Stop Accompaniment" : "Start Accompaniment"}
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer",
                isAccompanimentPlaying 
                  ? "bg-amber-600 text-white shadow-sm" 
                  : resolvedTheme === 'dark' ? "hover:bg-white/10 text-neutral-300" : "hover:bg-neutral-200 text-neutral-700"
              )}
            >
              <Piano className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => toggleDrawer('accompaniment')}
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-semibold hover:text-amber-500 transition-colors cursor-pointer"
              title="Click to view groove & chord settings"
            >
              <span className="font-mono text-amber-500">{activeChordName}</span>
              <span className="text-[10px] text-neutral-400 uppercase hidden sm:inline truncate max-w-[80px]">
                {arpeggioPreset}
              </span>
              <ChevronUp className={cn("w-3 h-3 text-neutral-400 transition-transform", activeDrawer === 'accompaniment' && "rotate-180")} />
            </button>
          </div>

          {/* 4. Score Audio Widget (if active) */}
          {hasScoreAudio && (
            <div className={cn(
              "flex items-center gap-1 p-0.5 rounded-lg border transition-colors",
              resolvedTheme === 'dark' ? "border-white/[0.06] bg-white/[0.03]" : "border-neutral-200 bg-neutral-100/70"
            )}>
              <button
                onClick={() => toggleDrawer('audio')}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold hover:text-[#E05A2B] transition-colors cursor-pointer"
                title="Click to open Score Audio Player controls"
              >
                <Music className="w-3.5 h-3.5 text-[#E05A2B]" />
                <span className="truncate max-w-[100px] sm:max-w-[140px] text-[11px]">
                  {globalAudio?.name || activeScore?.audioName || 'Score Audio'}
                </span>
                <ChevronUp className={cn("w-3 h-3 text-neutral-400 transition-transform", activeDrawer === 'audio' && "rotate-180")} />
              </button>
            </div>
          )}
        </div>

        {/* Right Dock Utilities: Tuner Quick Pitch & Dock Hide */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Pitch Reference A440 */}
          <button
            onClick={() => {
              if (playingRefNote) {
                stopRefNote();
              } else {
                playRefNote('A4');
              }
            }}
            title={playingRefNote ? "Stop Reference Pitch" : "Play Reference Pitch (A440)"}
            className={cn(
              "h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border",
              playingRefNote
                ? "bg-blue-600 border-blue-500 text-white"
                : resolvedTheme === 'dark'
                  ? "border-white/[0.06] hover:bg-white/[0.08] text-neutral-400"
                  : "border-neutral-200 hover:bg-neutral-100 text-neutral-600"
            )}
          >
            <Mic2 className="w-3 h-3" />
            <span className="hidden sm:inline">A440</span>
          </button>

          {/* Minimize Dock Button */}
          <button
            onClick={handleCollapseToggle}
            title="Minimize Practice Dock"
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer text-neutral-400 hover:text-neutral-900 dark:hover:text-white",
              resolvedTheme === 'dark' ? "hover:bg-white/[0.08]" : "hover:bg-neutral-100"
            )}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
