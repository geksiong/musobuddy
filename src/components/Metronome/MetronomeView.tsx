/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Plus, Minus, Trash2, RotateCcw, Volume2, VolumeX,
  X, SlidersHorizontal, Music, ChevronUp, ChevronDown, Save, Edit2
} from 'lucide-react';
import { useMetronome } from '../../hooks/useMetronome.ts';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { DEFAULT_PRESETS, TEMPO_NAMES } from './constants.ts';
import { BeatPattern, MetronomeSound, TimeSignatureType } from './types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

export default function MetronomeView() {
  const { isPlaying, bpm, setBpm, start, stop, setActivePattern, activePattern, currentBeat, metronomeVolume, setMetronomeVolume } = useMetronome();
  const { isAccompanimentPlaying } = useAudio();
  const isRhythmActive = isPlaying || isAccompanimentPlaying;

  const { resolvedTheme } = useTheme();
  const [displayMode, setDisplayMode] = useState<'circular' | 'rings' | 'linear'>('circular');
  const [showEditor, setShowEditor] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [userPresets, setUserPresets] = useState<BeatPattern[]>(() => {
    try {
      const saved = localStorage.getItem('metronome_user_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const tapTimesRef = useRef<number[]>([]);
  const [rotation, setRotation] = useState(0);

  const masterVoice = activePattern?.voices[0];
  const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;
  const is12Beat = masterLength === 12 || activePattern?.type === TimeSignatureType.Flamenco || activePattern?.timeSignature === '12-Beat';

  const lastBeatTimeRef = useRef<number>(performance.now());
  const prevBeatRef = useRef<number>(currentBeat);
  const wasRhythmActiveRef = useRef<boolean>(false);

  useEffect(() => {
    if (currentBeat !== prevBeatRef.current || (isRhythmActive && !wasRhythmActiveRef.current)) {
      prevBeatRef.current = currentBeat;
      lastBeatTimeRef.current = performance.now();
    }
    wasRhythmActiveRef.current = isRhythmActive;
  }, [currentBeat, isRhythmActive]);

  useEffect(() => {
    const startBeat = activePattern?.startBeat || 1;
    const is12Beat = masterLength === 12 || activePattern?.type === TimeSignatureType.Flamenco || activePattern?.timeSignature === '12-Beat';

    const baseStartAngle = (is12Beat && masterLength === 12)
      ? (startBeat / 12) * 360
      : ((startBeat - 1) / masterLength) * 360;

    if (!isRhythmActive) {
      setRotation(baseStartAngle);
      return;
    }

    let frame: number;
    const update = () => {
      const now = performance.now();
      const elapsed = (now - lastBeatTimeRef.current) / 1000;
      const secondsPerBeat = 60 / bpm;
      const fractionOfBeat = Math.min(1, Math.max(0, elapsed / secondsPerBeat));
      
      const measurePosition = currentBeat + fractionOfBeat;
      const currentRotation = baseStartAngle + (measurePosition / masterLength) * 360;

      setRotation(currentRotation);
      
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [isRhythmActive, bpm, masterLength, currentBeat, activePattern?.startBeat, activePattern?.type, activePattern?.timeSignature]);

  useEffect(() => {
    if (!activePattern && DEFAULT_PRESETS.length > 0) {
      setActivePattern(JSON.parse(JSON.stringify(DEFAULT_PRESETS[0])));
    }
  }, [activePattern, setActivePattern]);

  const handleTap = () => {
    const now = performance.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 4) tapTimesRef.current.shift();
    
    if (tapTimesRef.current.length >= 2) {
      const diffs = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        diffs.push(tapTimesRef.current[i] - tapTimesRef.current[i-1]);
      }
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      setBpm(Math.round(60000 / avg));
    }
  };

  const handleSavePreset = () => {
    if (!activePattern) return;
    const finalName = activePattern.name.trim() || `Preset ${userPresets.length + 1}`;
    const newId = `user-${Date.now()}`;
    const newPreset: BeatPattern = {
      ...activePattern,
      id: newId,
      name: finalName,
      isUserPreset: true,
      bpm,
    };
    const next = [...userPresets, newPreset];
    setUserPresets(next);
    localStorage.setItem('metronome_user_presets', JSON.stringify(next));
    setActivePattern(newPreset);
    setShowEditor(false);
  };

  const handleEditPresetName = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(id);
  };

  const handleSaveName = (id: string, newName: string) => {
    const next = userPresets.map(p => p.id === id ? { ...p, name: newName.trim() || p.name } : p);
    setUserPresets(next);
    localStorage.setItem('metronome_user_presets', JSON.stringify(next));
    if (activePattern?.id === id) {
      setActivePattern({ ...activePattern, name: newName.trim() || activePattern.name });
    }
    setRenamingId(null);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = userPresets.filter(p => p.id !== id);
    setUserPresets(next);
    localStorage.setItem('metronome_user_presets', JSON.stringify(next));
    if (activePattern?.id === id) {
      setActivePattern(DEFAULT_PRESETS[0]);
    }
  };

  const getTempoName = (currentBpm: number) => {
    return TEMPO_NAMES.find(t => currentBpm >= t.min && currentBpm < t.max)?.name || 'Custom';
  };

  const offset = activePattern?.displayOffset || 0;
  const displayBeat = (Math.floor((((rotation % 360) + 360) % 360) / (360 / masterLength) + 0.0001) + offset) % masterLength;

  return (
    <div className={cn(
      "flex-1 min-h-full flex flex-col md:flex-row gap-6 p-4 md:p-8 selection:bg-orange-500/30 transition-colors",
      resolvedTheme === 'dark' ? "bg-black" : "bg-[#f8f9fa]"
    )}>
      {/* Sidebar - Controls & Presets */}
      <div className="w-full md:w-80 flex flex-col gap-6">
        {/* Playback Controls in Sidebar */}
        <div className={cn(
          "rounded-2xl border p-6 flex flex-col gap-6 shadow-md transition-colors",
          resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5"
        )}>
          <div className="flex items-center justify-between gap-4">
            <div className="w-16" /> {/* Spacer to help center the play button */}
            
            <button 
              onClick={isPlaying ? stop : start}
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 group relative shadow-2xl shrink-0",
                isPlaying 
                  ? resolvedTheme === 'dark' ? "bg-white text-black scale-95 shadow-white/10" : "bg-slate-900 text-white scale-95 shadow-slate-900/40" 
                  : "bg-[#FF4E00] text-white hover:scale-105 shadow-[#FF4E00]/40"
              )}
            >
              <div className={cn(
                "absolute inset-0 rounded-full blur-2xl opacity-40 transition-opacity",
                isPlaying 
                  ? resolvedTheme === 'dark' ? "bg-white" : "bg-slate-900" 
                  : "bg-[#FF4E00] group-hover:opacity-60"
              )} />
              {isPlaying ? <Pause className="w-10 h-10 relative z-10 fill-current" /> : <Play className="w-10 h-10 relative z-10 translate-x-1 fill-current" />}
            </button>

            <div className="flex flex-col gap-3 items-end w-16">
              <button onClick={handleTap} className={cn(
                "w-14 h-14 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all group shrink-0",
                resolvedTheme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-slate-100 border-black/5 shadow-sm hover:bg-slate-200"
              )}>
                 <div className="w-1.5 h-1.5 rounded-full bg-[#FF4E00] group-active:scale-150 transition-transform" />
                 <span className={cn("text-[8px] font-black uppercase tracking-widest italic leading-none", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>Tap</span>
              </button>
              <button 
                onClick={() => {
                  if (activePattern) {
                    const orig = [...DEFAULT_PRESETS, ...userPresets].find(p => p.id === activePattern.id) || DEFAULT_PRESETS[0];
                    setActivePattern(JSON.parse(JSON.stringify(orig)));
                    setBpm(orig.bpm);
                  } else {
                    setBpm(120);
                  }
                }} 
                className={cn(
                "w-14 h-14 border rounded-xl flex flex-col items-center justify-center gap-1 transition-all group shrink-0",
                resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/40 hover:text-white" : "bg-slate-100 border-black/5 shadow-sm hover:bg-slate-200 text-slate-400 hover:text-slate-900"
              )}>
                 <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform" />
                 <span className="text-[8px] font-black uppercase tracking-widest italic leading-none">Reset</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <button 
                  onClick={() => setBpm(bpm - 1)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all",
                    resolvedTheme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/5 text-white/40 hover:text-white" : "bg-slate-100 border-black/5 hover:bg-slate-200 text-slate-400 hover:text-slate-900 shadow-sm"
                  )}
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center">
                  <span className={cn("text-5xl font-black italic tracking-tighter tabular-nums leading-none", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>{bpm}</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF4E00]/60 mt-1 italic">{getTempoName(bpm)}</span>
                </div>
                <button 
                  onClick={() => setBpm(bpm + 1)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all",
                    resolvedTheme === 'dark' ? "bg-white/5 hover:bg-white/10 border-white/5 text-white/40 hover:text-white" : "bg-slate-100 border-black/5 hover:bg-slate-200 text-slate-400 hover:text-slate-900 shadow-sm"
                  )}
                >
                  <Plus className="w-5 h-5" />
                </button>
             </div>
             
             <div className="flex flex-col gap-2">
                <div className={cn("flex justify-between text-[7px] font-black uppercase tracking-[0.3em] italic px-1", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")}>
                  <span>Lento</span>
                  <span>{getTempoName(bpm)}</span>
                  <span>Presto</span>
                </div>
                <input 
                  type="range" min="40" max="240" 
                  value={bpm} 
                  onChange={(e) => setBpm(parseInt(e.target.value))}
                  className={cn(
                    "w-full h-1 rounded-full appearance-none cursor-pointer accent-[#FF4E00]", 
                    resolvedTheme === 'dark' ? "bg-white/10" : "bg-slate-200"
                  )} 
                />
             </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
          {[...DEFAULT_PRESETS, ...userPresets].map(preset => (
            <div 
              key={preset.id}
              onClick={() => {
                setActivePattern(JSON.parse(JSON.stringify(preset)));
                setBpm(preset.bpm);
              }}
              className={cn(
                "p-5 rounded-2xl border transition-all text-left flex flex-col gap-2 group relative overflow-hidden cursor-pointer",
                activePattern?.id === preset.id 
                  ? resolvedTheme === 'dark'
                    ? "bg-white/10 border-[#FF4E00]/50 shadow-[0_20px_40px_rgba(255,78,0,0.15)]" 
                    : "bg-white border-[#FF4E00]/30 shadow-xl shadow-[#FF4E00]/10"
                  : resolvedTheme === 'dark'
                    ? "bg-white/5 border-white/5 hover:border-white/10" 
                    : "bg-white border-black/5 hover:border-black/10 shadow-sm"
              )}
            >
              {activePattern?.id === preset.id && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4E00]/10 blur-3xl -mr-16 -mt-16 pointer-events-none" />
              )}
              <div className="flex items-center justify-between relative z-10">
                {renamingId === preset.id ? (
                  <input
                    autoFocus
                    className={cn(
                      "border rounded px-2 py-1 text-sm font-black uppercase tracking-tight focus:outline-none focus:border-[#FF4E00] w-full mr-4 italic",
                      resolvedTheme === 'dark' ? "bg-white/10 border-white/20 text-white" : "bg-slate-50 border-black/10 text-slate-900"
                    )}
                    defaultValue={preset.name}
                    onBlur={(e) => handleSaveName(preset.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName(preset.id, e.currentTarget.value);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className={cn(
                    "text-sm font-black uppercase tracking-tight transition-colors italic",
                    activePattern?.id === preset.id 
                      ? "text-[#FF4E00]" 
                      : resolvedTheme === 'dark' ? "text-white group-hover:text-white/80" : "text-slate-900 group-hover:text-slate-700"
                  )}>
                    {preset.name}
                  </span>
                )}
                <div className="flex items-center gap-2 relative z-20">
                  <span className={cn("text-[9px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>{preset.timeSignature}</span>
                  {preset.isUserPreset && (
                    <div className="flex items-center gap-2 relative z-50">
                      <button 
                        type="button"
                        onClick={(e) => handleEditPresetName(preset.id, e)}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          resolvedTheme === 'dark' ? "bg-white/10 text-white/50 hover:text-white hover:bg-white/20" : "bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200"
                        )}
                        title="Rename Preset"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                        className="p-2 bg-red-500/10 text-red-500/50 hover:text-red-500 hover:bg-red-500/20 rounded-xl transition-all"
                        title="Delete Preset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("text-[10px] font-bold uppercase tracking-widest leading-none", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>{preset.bpm} BPM</span>
                <div className={cn("w-1 h-1 rounded-full", resolvedTheme === 'dark' ? "bg-white/10" : "bg-slate-200")} />
                <span className={cn("text-[10px] font-bold uppercase tracking-widest leading-none", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
                  {preset.voices.length} {preset.voices.length === 1 ? 'Layer' : 'Layers'}
                  {preset.isUserPreset && <span className="ml-2 text-[8px] border border-white/10 px-1 rounded text-white/20">Custom</span>}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Display */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <div className={cn(
          "flex-1 min-h-[550px] rounded-2xl border flex flex-col items-center justify-between p-6 sm:p-10 pt-20 md:pt-24 relative overflow-hidden backdrop-blur-md transition-colors",
          resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl shadow-black/5"
        )}>
          {/* Top Indicators */}
          <div className="absolute top-6 left-8 sm:top-10 sm:left-12 flex items-center gap-2 z-20">
            <div className="w-2 h-2 rounded-full bg-[#FF4E00] animate-pulse" />
            <span className="text-[10px] font-bold text-[#FF4E00] uppercase tracking-[0.2em] italic">Live Pulse</span>
          </div>

          <div className="flex items-center gap-6 absolute top-6 right-8 sm:top-10 sm:right-12 z-20">
             <div className="flex items-center gap-3 mr-4 group">
               <button 
                 onClick={() => setMetronomeVolume(metronomeVolume === 0 ? 0.8 : 0)}
                 className={cn(
                   "p-2 rounded-lg transition-colors", 
                   resolvedTheme === 'dark' ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-900"
                 )}
               >
                 {metronomeVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
               </button>
               <div className="relative w-24 h-6 flex items-center">
                 <input 
                   type="range" min="0" max="1" step="0.01"
                   value={metronomeVolume}
                   onChange={(e) => setMetronomeVolume(parseFloat(e.target.value))}
                   className={cn(
                     "w-full h-1 rounded-full appearance-none cursor-pointer accent-[#FF4E00] opacity-30 group-hover:opacity-100 transition-opacity", 
                     resolvedTheme === 'dark' ? "bg-white/10" : "bg-slate-200"
                   )} 
                 />
               </div>
             </div>

             <div className="flex gap-4">
               <button 
                 onClick={() => setDisplayMode('circular')}
                 className={cn(
                   "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
                   displayMode === 'circular' 
                     ? resolvedTheme === 'dark' ? "bg-white text-black underline decoration-2 underline-offset-4" : "bg-slate-900 text-white shadow-lg" 
                     : resolvedTheme === 'dark' ? "bg-white/5 text-white/40 hover:bg-white/10" : "bg-slate-100 text-slate-400 hover:text-slate-600"
                 )}
               >
                 Circular
               </button>
               <button 
                 onClick={() => setDisplayMode('rings')}
                 className={cn(
                   "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
                   displayMode === 'rings' 
                     ? resolvedTheme === 'dark' ? "bg-white text-black underline decoration-2 underline-offset-4" : "bg-slate-900 text-white shadow-lg" 
                     : resolvedTheme === 'dark' ? "bg-white/5 text-white/40 hover:bg-white/10" : "bg-slate-100 text-slate-400 hover:text-slate-600"
                 )}
               >
                 Rings
               </button>
               <button 
                 onClick={() => setDisplayMode('linear')}
                 className={cn(
                   "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", 
                   displayMode === 'linear' 
                     ? resolvedTheme === 'dark' ? "bg-white text-black underline decoration-2 underline-offset-4" : "bg-slate-900 text-white shadow-lg" 
                     : resolvedTheme === 'dark' ? "bg-white/5 text-white/40 hover:bg-white/10" : "bg-slate-100 text-slate-400 hover:text-slate-600"
                 )}
               >
                 Linear
               </button>
               <button 
                 onClick={() => setShowEditor(true)}
                 className="p-3 bg-[#FF4E00] text-black rounded-xl hover:scale-105 transition-all shadow-[0_10px_20px_rgba(255,78,0,0.2)]"
                 title="Rhythm Editor"
               >
                 <SlidersHorizontal className="w-4 h-4" />
               </button>
             </div>
          </div>

          <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center my-auto py-2 min-h-0">
            {displayMode === 'circular' ? (
              <CircularVisualizer isPlaying={isRhythmActive} pattern={activePattern} rotation={rotation} displayBeat={displayBeat} resolvedTheme={resolvedTheme} />
            ) : displayMode === 'rings' ? (
              <RingsVisualizer isPlaying={isRhythmActive} pattern={activePattern} rotation={rotation} displayBeat={displayBeat} resolvedTheme={resolvedTheme} />
            ) : (
              <LinearVisualizer isPlaying={isRhythmActive} pattern={activePattern} rotation={rotation} resolvedTheme={resolvedTheme} />
            )}
          </div>

          {/* Live Layer Quick Toggles Bar */}
          {activePattern && activePattern.voices && activePattern.voices.length > 0 && (
            <div className="relative z-20 mt-auto shrink-0 w-full max-w-xl px-2 pt-2">
              <div className="flex items-center justify-between w-full px-1 mb-1.5">
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-[0.2em] italic",
                  resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400"
                )}>
                  Live Layers ({activePattern.voices.filter(v => v.active && !v.muted).length}/{activePattern.voices.length} Active)
                </span>
                {activePattern.voices.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allMuted = activePattern.voices.every(v => v.muted || !v.active);
                      const nextVoices = activePattern.voices.map(v => ({
                        ...v,
                        active: true,
                        muted: allMuted ? false : true
                      }));
                      setActivePattern({ ...activePattern, voices: nextVoices });
                    }}
                    className={cn(
                      "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border transition-all italic cursor-pointer",
                      resolvedTheme === 'dark'
                        ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/50 hover:text-white"
                        : "bg-slate-100 border-black/5 hover:bg-slate-200 text-slate-500 hover:text-slate-900 shadow-sm"
                    )}
                  >
                    {activePattern.voices.every(v => v.muted || !v.active) ? 'Unmute All' : 'Mute All'}
                  </button>
                )}
              </div>

              <div className={cn(
                "flex flex-wrap items-center justify-center gap-1.5 w-full p-2 rounded-xl border backdrop-blur-md transition-colors max-h-28 overflow-y-auto",
                resolvedTheme === 'dark' ? "bg-black/40 border-white/10 shadow-lg shadow-black/50" : "bg-white/90 border-black/5 shadow-md"
              )}>
                {activePattern.voices.map((voice, idx) => {
                  const voiceColors = ["#FF4E00", "#A855F7", "#00D4FF", "#00FFAB", "#FF007F"];
                  const color = voiceColors[idx % voiceColors.length];
                  const isMuted = voice.muted || !voice.active;

                  const subTag = voice.isSwing
                    ? 'Swing'
                    : voice.isTripleTime
                    ? '3x'
                    : voice.isDoubleTime
                    ? '2x'
                    : null;

                  return (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => {
                        const nextVoices = activePattern.voices.map((v, i) => {
                          if (i === idx) {
                            return { ...v, active: true, muted: !isMuted };
                          }
                          return v;
                        });
                        setActivePattern({ ...activePattern, voices: nextVoices });
                      }}
                      style={{
                        borderColor: !isMuted ? color : (resolvedTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black transition-all shadow-sm group relative overflow-hidden select-none cursor-pointer shrink-0",
                        !isMuted 
                          ? (resolvedTheme === 'dark' ? "bg-white/10 text-white shadow-md" : "bg-slate-900 text-white shadow-md")
                          : (resolvedTheme === 'dark' ? "bg-white/5 text-white/30 border-white/10 hover:border-white/20 hover:text-white/60" : "bg-slate-100 text-slate-400 border-black/10 hover:border-black/20 hover:text-slate-700")
                      )}
                      title={`Click to ${isMuted ? 'enable/unmute' : 'disable/mute'} Layer ${idx + 1}`}
                    >
                      {!isMuted && (
                        <div 
                          className="absolute inset-0 opacity-15 transition-opacity group-hover:opacity-25" 
                          style={{ backgroundColor: color }} 
                        />
                      )}
                      
                      <div 
                        className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125"
                        style={{ 
                          backgroundColor: !isMuted ? color : (resolvedTheme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')
                        }}
                      />

                      <span className="relative z-10 font-black italic uppercase tracking-wider text-[10px]">
                        Layer {idx + 1} &bull; {voice.sound}
                      </span>

                      {subTag && (
                        <span className={cn(
                          "relative z-10 text-[7px] font-mono px-1 rounded font-bold italic",
                          !isMuted ? "bg-white/20 text-white" : "bg-black/10 text-slate-400"
                        )}>
                          {subTag}
                        </span>
                      )}

                      <div className="relative z-10 flex items-center ml-0.5">
                        {!isMuted ? (
                          <Volume2 className="w-3 h-3 text-white animate-pulse" />
                        ) : (
                          <VolumeX className="w-3 h-3 text-red-400/80" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
         {showEditor && activePattern && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl transition-colors",
                resolvedTheme === 'dark' ? "bg-[#111] border-white/10" : "bg-white border-black/5"
              )}
            >
              <div className={cn(
                "px-10 py-8 border-b flex justify-between items-center transition-colors",
                resolvedTheme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-black/5"
              )}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#FF4E00] rounded-2xl flex items-center justify-center">
                    <SlidersHorizontal className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <input 
                      type="text"
                      value={activePattern.name}
                      onChange={(e) => setActivePattern({ ...activePattern, name: e.target.value })}
                      placeholder="Preset Name"
                      className={cn(
                        "bg-transparent text-2xl font-black uppercase italic tracking-tighter border-b focus:border-[#FF4E00] focus:outline-none w-full max-w-sm transition-colors",
                        resolvedTheme === 'dark' ? "text-white border-white/10" : "text-slate-900 border-black/10"
                      )}
                    />
                    <p className={cn("text-[9px] font-black uppercase tracking-[0.4em] mt-1", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>Design & Layer your beats</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleSavePreset}
                    className={cn(
                      "flex items-center gap-3 px-6 py-4 rounded-2xl hover:scale-105 transition-all group font-black uppercase text-[10px] tracking-widest italic shadow-lg",
                      resolvedTheme === 'dark' ? "bg-white text-black" : "bg-slate-900 text-white"
                    )}
                  >
                    <Save className="w-4 h-4" />
                    Save Preset
                  </button>
                  <button 
                    onClick={() => setShowEditor(false)}
                    className={cn(
                      "p-4 rounded-2xl transition-all group",
                      resolvedTheme === 'dark' ? "bg-white/5 text-white/40 hover:text-white hover:bg-white/10" : "bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200"
                    )}
                  >
                    <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                {/* Global Pattern Controls */}
                <div className={cn(
                  "flex flex-wrap items-center gap-8 p-8 rounded-[2rem] border transition-colors",
                  resolvedTheme === 'dark' ? "bg-white/[0.04] border-white/10" : "bg-slate-100/50 border-black/5"
                )}>
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black text-[#FF4E00] uppercase tracking-[0.3em]">Start Beat</span>
                    <div className={cn(
                      "flex items-center gap-3 p-1.5 rounded-xl border transition-colors",
                      resolvedTheme === 'dark' ? "bg-black/40 border-white/5" : "bg-white border-black/5"
                    )}>
                      <button 
                        onClick={() => {
                          const next = { ...activePattern };
                          const currentStart = next.startBeat || 1;
                          next.startBeat = currentStart === 1 ? masterLength : currentStart - 1;
                          setActivePattern(next);
                        }}
                        className={cn("p-2 rounded-lg transition-all", resolvedTheme === 'dark' ? "hover:bg-white/5 text-white/40 hover:text-white" : "hover:bg-black/5 text-slate-400 hover:text-slate-900")}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="min-w-[3rem] text-center">
                        <span className={cn("text-xl font-black italic", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>
                          {activePattern.startBeat || 1}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          const next = { ...activePattern };
                          const currentStart = next.startBeat || 1;
                          next.startBeat = currentStart === masterLength ? 1 : currentStart + 1;
                          setActivePattern(next);
                        }}
                        className={cn("p-2 rounded-lg transition-all", resolvedTheme === 'dark' ? "hover:bg-white/5 text-white/40 hover:text-white" : "hover:bg-black/5 text-slate-400 hover:text-slate-900")}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className={cn("w-[1px] h-12 hidden sm:block", resolvedTheme === 'dark' ? "bg-white/10" : "bg-black/10")} />

                  <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[9px] font-black uppercase tracking-[0.3em]", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>Tempo (BPM)</span>
                      <div className="flex items-center gap-2">
                         <button onClick={() => setBpm(bpm - 1)} className={cn("p-1 rounded-md transition-colors", resolvedTheme === 'dark' ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-black/5 text-slate-400 hover:text-slate-900")}>
                           <Minus className="w-3 h-3" />
                         </button>
                         <span className="text-sm font-black italic text-[#FF4E00] w-8 text-center">{bpm}</span>
                         <button onClick={() => setBpm(bpm + 1)} className={cn("p-1 rounded-md transition-colors", resolvedTheme === 'dark' ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-black/5 text-slate-400 hover:text-slate-900")}>
                           <Plus className="w-3 h-3" />
                         </button>
                      </div>
                    </div>
                    <input 
                      type="range" min="40" max="240" 
                      value={bpm} 
                      onChange={(e) => setBpm(parseInt(e.target.value))}
                      className={cn(
                        "w-full h-1 rounded-full appearance-none cursor-pointer accent-[#FF4E00]", 
                        resolvedTheme === 'dark' ? "bg-white/10" : "bg-slate-200"
                      )} 
                    />
                  </div>
                  
                  <div className={cn("w-[1px] h-12 hidden sm:block", resolvedTheme === 'dark' ? "bg-white/10" : "bg-black/10")} />

                  {/* Swing Ratio Control */}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[9px] font-black uppercase tracking-[0.3em]", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>
                        Swing Ratio
                      </span>
                      <span className="text-xs font-mono font-black italic text-[#FF4E00]">
                        {Math.round((activePattern.swingRatio ?? 0.667) * 100)}% ({((activePattern.swingRatio ?? 0.667) / (1 - (activePattern.swingRatio ?? 0.667))).toFixed(1)}:1)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" min="0.50" max="0.75" step="0.01"
                        value={activePattern.swingRatio ?? 0.667} 
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setActivePattern({ ...activePattern, swingRatio: val });
                        }}
                        className={cn(
                          "w-full h-1 rounded-full appearance-none cursor-pointer accent-[#FF4E00]", 
                          resolvedTheme === 'dark' ? "bg-white/10" : "bg-slate-200"
                        )} 
                      />
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {[
                        { label: '1:1', ratio: 0.50 },
                        { label: '3:2 (60%)', ratio: 0.60 },
                        { label: '2:1 (67%)', ratio: 0.667 },
                        { label: '3:1 (75%)', ratio: 0.75 },
                      ].map((preset) => {
                        const isSel = Math.abs((activePattern.swingRatio ?? 0.667) - preset.ratio) < 0.02;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setActivePattern({ ...activePattern, swingRatio: preset.ratio })}
                            className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-mono font-bold transition-all",
                              isSel 
                                ? "bg-[#FF4E00] text-white" 
                                : (resolvedTheme === 'dark' ? "bg-white/5 text-white/40 hover:text-white" : "bg-slate-200 text-slate-600 hover:text-slate-900")
                            )}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={cn("w-[1px] h-12 hidden sm:block", resolvedTheme === 'dark' ? "bg-white/10" : "bg-black/10")} />
                  
                  <div className="flex flex-col gap-1">
                    <span className={cn("text-[9px] font-black uppercase tracking-[0.3em]", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>Signature</span>
                    <input 
                      type="text"
                      value={activePattern.timeSignature}
                      onChange={(e) => setActivePattern({ ...activePattern, timeSignature: e.target.value })}
                      className={cn(
                        "bg-transparent text-xl font-black italic uppercase tracking-tighter tabular-nums border-b focus:border-[#FF4E00] focus:outline-none w-24 transition-colors",
                        resolvedTheme === 'dark' ? "text-white border-white/5" : "text-slate-900 border-black/5"
                      )}
                    />
                  </div>
                </div>

                {activePattern.voices.map((voice, vIndex) => {
                  const masterVoice = activePattern.voices[0];
                  const masterLen = masterVoice?.pattern?.length || masterVoice?.beats || 4;
                  const masterSub = masterVoice?.isTripleTime ? 3 : (masterVoice?.isDoubleTime || masterVoice?.isSwing ? 2 : 1);
                  const masterBaseBeats = Math.max(1, Math.round(masterLen / masterSub));

                  const length = voice.pattern?.length || voice.beats || 4;
                  const vSub = voice.isTripleTime ? 3 : (voice.isDoubleTime || voice.isSwing ? 2 : 1);
                  const currentSubMode: 'straight' | 'double' | 'triple' | 'swing' = voice.isSwing ? 'swing' : (voice.isTripleTime ? 'triple' : (voice.isDoubleTime ? 'double' : 'straight'));

                  const handleSubdivisionChange = (targetMode: 'straight' | 'double' | 'triple' | 'swing') => {
                    const next = { ...activePattern };
                    const v = next.voices[vIndex];
                    const curSub = v.isTripleTime ? 3 : (v.isDoubleTime || v.isSwing ? 2 : 1);
                    const targetSub = targetMode === 'triple' ? 3 : (targetMode === 'double' || targetMode === 'swing' ? 2 : 1);

                    v.isDoubleTime = targetMode === 'double';
                    v.isTripleTime = targetMode === 'triple';
                    v.isSwing = targetMode === 'swing';
                    v.subdivision = targetMode;

                    if (curSub === targetSub) {
                      setActivePattern({ ...next });
                      return;
                    }

                    const curPattern = v.pattern || Array(v.beats || 4).fill(1);
                    const baseBeatsCount = Math.max(1, Math.round(curPattern.length / curSub));

                    const newPattern: number[] = [];
                    for (let b = 0; b < baseBeatsCount; b++) {
                      const origValue = curPattern[b * curSub] ?? 1;
                      if (targetSub === 1) {
                        newPattern.push(origValue);
                      } else if (targetSub === 2) {
                        newPattern.push(origValue);
                        newPattern.push(0);
                      } else if (targetSub === 3) {
                        newPattern.push(origValue);
                        newPattern.push(0);
                        newPattern.push(0);
                      }
                    }

                    v.pattern = newPattern;
                    v.beats = newPattern.length;
                    setActivePattern({ ...next });
                  };

                  return (
                    <div key={voice.id} className={cn(
                      "flex flex-col gap-6 p-8 rounded-[2rem] border transition-colors",
                      resolvedTheme === 'dark' ? "bg-white/[0.02] border-white/5 hover:border-white/10" : "bg-white border-black/5 hover:border-black/10 shadow-sm"
                    )}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex flex-wrap items-center gap-6">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-[#FF4E00] uppercase tracking-[0.3em]">Layer {vIndex + 1}</span>
                              {voice.isSwing && (
                                <span className="px-1.5 py-0.5 rounded bg-[#FF4E00]/20 text-[#FF4E00] font-mono text-[9px] font-black italic">
                                  Swing ({Math.round((activePattern.swingRatio ?? 0.667) * 100)}%)
                                </span>
                              )}
                              {voice.isTripleTime && (
                                <span className="px-1.5 py-0.5 rounded bg-[#A855F7]/20 text-[#A855F7] font-mono text-[9px] font-black italic">
                                  3x Triple
                                </span>
                              )}
                              {voice.isDoubleTime && (
                                <span className="px-1.5 py-0.5 rounded bg-[#00D4FF]/20 text-[#00D4FF] font-mono text-[9px] font-black italic">
                                  2x Double
                                </span>
                              )}
                            </div>
                            <select 
                              value={voice.sound}
                              onChange={(e) => {
                                const next = { ...activePattern };
                                next.voices[vIndex].sound = e.target.value as MetronomeSound;
                                setActivePattern({ ...next });
                                e.target.blur();
                                setTimeout(() => e.target.blur(), 0);
                              }}
                              className={cn(
                                "bg-transparent font-black uppercase text-sm focus:outline-none cursor-pointer hover:text-[#FF4E00] transition-colors",
                                resolvedTheme === 'dark' ? "text-white" : "text-slate-900"
                              )}
                            >
                              {Object.values(MetronomeSound).map(s => (
                                <option key={s} value={s} className={cn(resolvedTheme === 'dark' ? "bg-black text-white" : "bg-white text-slate-900")}>{s}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className={cn("w-[1px] h-8 hidden sm:block", resolvedTheme === 'dark' ? "bg-white/10" : "bg-black/10")} />

                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => {
                                const next = { ...activePattern };
                                next.voices[vIndex].muted = !voice.muted;
                                setActivePattern({ ...next });
                              }}
                              className={cn(
                                "p-3 rounded-xl transition-all border",
                                voice.muted ? "bg-red-500/10 border-red-500/20 text-red-500" : (resolvedTheme === 'dark' ? "bg-white/5 border-white/5 text-white/40 hover:text-white" : "bg-slate-100 border-black/5 text-slate-400 hover:text-slate-900")
                              )}
                            >
                              {voice.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                            
                            <div className="flex flex-col gap-1 w-24">
                              <span className={cn("text-[8px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>Volume {Math.round(voice.volume * 100)}%</span>
                              <input 
                                type="range" min="0" max="1" step="0.01"
                                value={voice.volume}
                                onChange={(e) => {
                                  const next = { ...activePattern };
                                  next.voices[vIndex].volume = parseFloat(e.target.value);
                                  setActivePattern({ ...next });
                                }}
                                className={cn("w-full h-0.5 rounded-full appearance-none cursor-pointer accent-[#FF4E00]", resolvedTheme === 'dark' ? "bg-white/10" : "bg-slate-200")}
                              />
                            </div>
                          </div>

                          <div className={cn("w-[1px] h-8 hidden sm:block", resolvedTheme === 'dark' ? "bg-white/10" : "bg-black/10")} />

                          {/* Subdivision Mode Selector */}
                          <div className="flex flex-col gap-1">
                            <span className={cn("text-[8px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")}>Subdivision</span>
                            <div className={cn(
                              "flex items-center gap-1 p-1 rounded-xl border",
                              resolvedTheme === 'dark' ? "bg-black/40 border-white/5" : "bg-slate-100 border-black/5"
                            )}>
                              {[
                                { id: 'straight', label: '1x' },
                                { id: 'double', label: '2x' },
                                { id: 'triple', label: '3x' },
                                { id: 'swing', label: 'Swing' },
                              ].map((opt) => {
                                const isSel = currentSubMode === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleSubdivisionChange(opt.id as 'straight' | 'double' | 'triple' | 'swing')}
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all italic",
                                      isSel 
                                        ? "bg-[#FF4E00] text-white shadow-md shadow-[#FF4E00]/20" 
                                        : resolvedTheme === 'dark' 
                                          ? "text-white/40 hover:text-white hover:bg-white/5" 
                                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "flex items-center gap-2 p-1 rounded-xl border transition-colors",
                            resolvedTheme === 'dark' ? "bg-black/40 border-white/5" : "bg-slate-100 border-black/5"
                          )}>
                             <button 
                               onClick={() => {
                                 const next = { ...activePattern };
                                 const step = vSub;
                                 const oldLen = next.voices[vIndex].pattern?.length || next.voices[vIndex].beats || 4;
                                 const newLen = Math.max(vSub, oldLen - step);
                                 next.voices[vIndex].pattern = (next.voices[vIndex].pattern || Array(oldLen).fill(1)).slice(0, newLen);
                                 next.voices[vIndex].beats = newLen;
                                 setActivePattern({ ...next });
                               }}
                               className={cn("p-2 rounded-lg transition-all", resolvedTheme === 'dark' ? "hover:bg-white/5 text-white/40 hover:text-white" : "hover:bg-black/5 text-slate-400 hover:text-slate-900")}
                             >
                               <Minus className="w-3 h-3" />
                             </button>
                             <span className={cn("w-14 text-center text-xs font-black italic", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>
                               {length} {vSub > 1 ? 'sub' : 'beats'}
                             </span>
                             <button 
                               onClick={() => {
                                 const next = { ...activePattern };
                                 const step = vSub;
                                 const maxLimit = vSub === 3 ? 36 : (vSub === 2 ? 32 : 16);
                                 const oldLen = next.voices[vIndex].pattern?.length || next.voices[vIndex].beats || 4;
                                 const newLen = Math.min(maxLimit, oldLen + step);
                                 const newArray = [...(next.voices[vIndex].pattern || Array(oldLen).fill(1))];
                                 while (newArray.length < newLen) {
                                   newArray.push(vSub > 1 && newArray.length % vSub !== 0 ? 0 : 1);
                                 }
                                 next.voices[vIndex].pattern = newArray;
                                 next.voices[vIndex].beats = newLen;
                                 setActivePattern({ ...next });
                               }}
                               className={cn("p-2 rounded-lg transition-all", resolvedTheme === 'dark' ? "hover:bg-white/5 text-white/40 hover:text-white" : "hover:bg-black/5 text-slate-400 hover:text-slate-900")}
                             >
                               <Plus className="w-3 h-3" />
                             </button>
                          </div>

                          {vIndex > 0 && (
                            <button 
                              onClick={() => {
                                const next = { ...activePattern };
                                next.voices.splice(vIndex, 1);
                                setActivePattern({ ...next });
                              }}
                              className={cn(
                                "p-4 rounded-2xl transition-all shadow-sm",
                                resolvedTheme === 'dark' ? "bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-black shadow-red-500/10" : "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white shadow-red-500/5"
                              )}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Packed Beat Button Grid aligned by base beats across all layers */}
                      <div className="w-full overflow-x-auto min-w-0 pt-4 border-t transition-colors pb-1" style={{ borderColor: resolvedTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                        <div 
                          className="grid gap-1 sm:gap-2 w-full min-w-[580px] items-stretch"
                          style={{
                            gridTemplateColumns: `repeat(${masterBaseBeats}, minmax(0, 1fr))`
                          }}
                        >
                          {Array.from({ length: masterBaseBeats }).map((_, beatIdx) => {
                            const subBeats = voice.pattern?.slice(beatIdx * vSub, (beatIdx + 1) * vSub) || Array(vSub).fill(1);
                            const swingR = activePattern.swingRatio ?? (2 / 3);

                            return (
                              <div key={beatIdx} className="flex items-center gap-1 w-full h-full">
                                {subBeats.map((val, subIdx) => {
                                  const i = beatIdx * vSub + subIdx;
                                  const voiceBeatIdx = Math.floor((((rotation % 360) + 360) % 360) / (360 / length) + 0.0001) % length;
                                  const isCurrent = voiceBeatIdx === i && isPlaying;

                                  // Compute beat label for step i
                                  let labelText = '';
                                  const bNum = is12Beat ? (beatIdx === 0 ? 12 : beatIdx) : (((beatIdx + (activePattern?.displayOffset || 0)) % masterBaseBeats) + 1);
                                  if (vSub === 1) {
                                    labelText = `${bNum}`;
                                  } else if (vSub === 2) {
                                    labelText = subIdx === 0 ? `${bNum}` : '&';
                                  } else if (vSub === 3) {
                                    labelText = subIdx === 0 ? `${bNum}` : (subIdx === 1 ? 'a' : 'b');
                                  }

                                  const flexVal = voice.isSwing
                                    ? (subIdx === 0 ? swingR : (1 - swingR))
                                    : 1;

                                  return (
                                    <button
                                      key={i}
                                      style={{ flex: flexVal }}
                                      onClick={() => {
                                        const newPattern = [...(voice.pattern || [])];
                                        newPattern[i] = (newPattern[i] + 1) % 3;
                                        const next = { ...activePattern };
                                        next.voices[vIndex].pattern = newPattern;
                                        setActivePattern({ ...next });
                                      }}
                                      className={cn(
                                        "h-11 sm:h-12 rounded-xl transition-all flex flex-col items-center justify-center font-black border relative overflow-hidden min-w-0 px-0.5",
                                        vSub > 1 ? "text-[8px]" : "text-[9px]",
                                        voice.muted ? "opacity-30 pointer-events-none grayscale" : (
                                          val === 2 ? "bg-[#FF4E00] border-[#FF4E00] text-white shadow-lg shadow-[#FF4E00]/20" :
                                          val === 1 ? (resolvedTheme === 'dark' ? "bg-white/10 border-white/5 text-white" : "bg-slate-300 border-black/5 text-slate-900") :
                                          (resolvedTheme === 'dark' ? "bg-white/[0.02] border-white/5 text-white/20 hover:border-white/20 hover:text-white/60" : "bg-slate-50 border-black/5 text-slate-300 hover:border-black/20 hover:text-slate-600")
                                        )
                                      )}
                                    >
                                      {isCurrent && !voice.muted && <div className="absolute inset-0 bg-white/40 animate-pulse" />}
                                      <span className="relative z-10 leading-none truncate w-full text-center">
                                        {val === 2 ? 'ACC' : val === 1 ? (vSub > 1 && subIdx > 0 ? 'SUB' : 'BEAT') : ''}
                                      </span>
                                      <span className={cn(
                                        "absolute bottom-1 right-1 font-mono leading-none", 
                                        vSub > 1 ? "text-[8px] font-bold" : "text-[7px]",
                                        val > 0 
                                          ? (val === 2 ? "text-white/80" : (resolvedTheme === 'dark' ? "text-white/60" : "text-black/60"))
                                          : (resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")
                                      )}>
                                        {labelText}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <button 
                  onClick={() => {
                    if (!activePattern) return;
                    const firstVoice = activePattern.voices[0];
                    const next = { ...activePattern };
                    const newVoice = {
                      id: Date.now(),
                      sound: MetronomeSound.HiHat,
                      volume: 0.6,
                      beats: firstVoice.pattern?.length || firstVoice.beats || 4,
                      active: true,
                      muted: false,
                      pattern: Array(firstVoice.pattern?.length || firstVoice.beats || 4).fill(0)
                    };
                    next.voices.push(newVoice);
                    setActivePattern({ ...next });
                  }}
                  className={cn(
                    "w-full flex items-center justify-center gap-3 p-10 border border-dashed rounded-2xl transition-all group shadow-sm",
                    resolvedTheme === 'dark' ? "bg-white/[0.02] hover:bg-white/[0.05] border-white/10" : "bg-slate-50 hover:bg-slate-100 border-black/10"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-[#FF4E00]/10 flex items-center justify-center text-[#FF4E00] group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className={cn("text-[10px] font-black uppercase tracking-[0.3em] italic", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>Add New Rhythm Layer</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CircularVisualizer({ isPlaying, pattern, rotation, displayBeat, resolvedTheme }: { isPlaying: boolean, pattern: BeatPattern | null, rotation: number, displayBeat: number, resolvedTheme: 'dark' | 'light' }) {
  const voices = pattern?.voices || [];
  const masterVoice = voices[0];
  const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;
  const masterBaseBeats = (masterVoice?.isDoubleTime ? masterLength / 2 : masterLength) || 4;
  const radius = 135;

  const is12Beat = masterBaseBeats === 12 || pattern?.type === TimeSignatureType.Flamenco || pattern?.timeSignature === '12-Beat';
  const voiceColors = ["#FF4E00", "#A855F7", "#00D4FF", "#00FFAB", "#FF007F"];

  const normRot = ((rotation % 360) + 360) % 360;

  return (
    <div className="relative w-[340px] h-[340px] sm:w-[360px] sm:h-[360px] flex items-center justify-center shrink-0">
      <div className={cn("absolute inset-0 rounded-full blur-3xl opacity-10", resolvedTheme === 'dark' ? "bg-white/5" : "bg-black/5")} />
      
      {/* Tracker line - stays on top */}
      <div 
        className={cn(
          "absolute w-[2px] z-50 origin-bottom rounded-full pointer-events-none",
          resolvedTheme === 'dark' ? "bg-white shadow-[0_0_15px_white]" : "bg-slate-900 shadow-[0_0_15px_rgba(0,0,0,0.2)]"
        )}
        style={{ 
          transform: `rotate(${rotation % 360}deg)`,
          top: `${180 - radius}px`,
          height: `${radius}px`,
          left: '50%',
          marginLeft: '-1px',
          transformOrigin: '50% 100%'
        }}
      />

      <div className="relative w-full h-full flex items-center justify-center">
        {/* Guide ring & clock face numbers */}
        <svg viewBox="0 0 360 360" className="absolute w-full h-full overflow-visible">
          <circle 
            cx="180" cy="180" r={radius} 
            className={cn("fill-none", resolvedTheme === 'dark' ? "stroke-white/[0.08]" : "stroke-black/[0.08]")}
            strokeWidth="1.5"
          />
          {is12Beat && Array.from({ length: 12 }).map((_, bIdx) => {
            const num = bIdx === 0 ? 12 : bIdx; // 12 at 0deg (top), 1 at 30deg, ..., 11 at 330deg
            const ang = (bIdx / 12) * 360; // 0, 30, 60, ..., 330
            const rad = (ang * Math.PI) / 180;
            const rLabel = radius + 22; // 135 + 22 = 157px (y=23px at top for 12, y=337px at bottom for 6)
            const x = 180 + rLabel * Math.sin(rad);
            const y = 180 - rLabel * Math.cos(rad);
            const isAccentBeat = [3, 6, 8, 10, 12].includes(num);
            return (
              <text
                key={num}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                className={cn(
                  "font-mono transition-colors select-none",
                  isAccentBeat ? "fill-[#FF4E00] font-black text-[13px] sm:text-[14px]" : (resolvedTheme === 'dark' ? "fill-white/60 font-bold text-[11px] sm:text-[12px]" : "fill-slate-600 font-bold text-[11px] sm:text-[12px]")
                )}
              >
                {num}
              </text>
            );
          })}
        </svg>

        {/* Draw voices in reverse order so higher numbered (larger radii) voices are drawn first (behind) */}
        {[...voices].reverse().map((voice, reversedVIndex) => {
          const vIndex = voices.length - 1 - reversedVIndex;
          const length = voice.pattern?.length || voice.beats || 4;
          const color = voiceColors[vIndex % voiceColors.length];
          const dotRadius = voice.isDoubleTime ? Math.max(3, 4 + (vIndex * 3) - 1) : 4 + (vIndex * 4); 
          
          return (
            <div key={voice.id} className="absolute inset-0 pointer-events-none">
              {Array.from({ length }).map((_, i) => {
                const angle = (is12Beat && length === 24)
                  ? (i * 360) / 24
                  : (is12Beat && length === 12)
                    ? ((i + 1) / 12) * 360
                    : (i * 360) / length;

                let voiceBeatIdx = 0;
                if (is12Beat && length === 12) {
                  let b = Math.floor((normRot + 0.0001) / 30);
                  if (b === 0) b = 12;
                  voiceBeatIdx = b - 1;
                } else if (is12Beat && length === 24) {
                  voiceBeatIdx = Math.floor((normRot + 0.0001) / 15) % 24;
                } else {
                  voiceBeatIdx = Math.floor(normRot / (360 / length) + 0.0001) % length;
                }

                const isOver = voiceBeatIdx === i && isPlaying;
                const val = voice.pattern ? voice.pattern[i] : (i === 0 ? 2 : 1);
                
                if (val === 0 && !isOver) return null;

                return (
                  <div 
                    key={i}
                    className="absolute left-1/2 -ml-[1px] w-[2px] pointer-events-none"
                    style={{ 
                      top: `${180 - radius}px`,
                      height: `${radius}px`,
                      transform: `rotate(${angle}deg)`,
                      transformOrigin: '50% 100%'
                    }}
                  >
                    <div 
                      className={cn(
                        "absolute left-1/2 rounded-full transition-all",
                        voice.muted ? "opacity-10" : "",
                        isOver && !voice.muted ? "z-20" : ""
                      )}
                      style={{
                        width: `${dotRadius * 2}px`,
                        height: `${dotRadius * 2}px`,
                        top: 0,
                        transform: `translate(-50%, -50%) ${isOver && !voice.muted ? 'scale(1.25)' : 'scale(1)'}`,
                        backgroundColor: !voice.muted ? (
                          isOver ? (resolvedTheme === 'dark' ? '#FFFFFF' : '#000000') : (val === 2 ? color : `${color}22`)
                        ) : (resolvedTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                        border: !voice.muted && val === 2 ? `1px solid ${resolvedTheme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}` : 'none',
                        boxShadow: !voice.muted ? (
                          isOver ? `0 0 20px ${resolvedTheme === 'dark' ? '#FFFFFF' : '#000000'}, 0 0 40px ${color}` : (val === 2 ? `0 0 15px ${color}66` : 'none')
                        ) : 'none'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
         <motion.div 
           animate={{
             scale: isPlaying ? 1.02 : 1,
             borderColor: resolvedTheme === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0,0,0,0.05)",
             backgroundColor: resolvedTheme === 'dark' ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.9)",
             boxShadow: resolvedTheme === 'dark' ? "0 20px 50px rgba(0, 0, 0, 0.5)" : "0 10px 30px rgba(0, 0, 0, 0.05)"
           }}
           transition={{ duration: 0.1 }}
           className="flex flex-col items-center backdrop-blur-xl w-32 h-32 rounded-full border shadow-2xl justify-center"
         >
           <div className={cn("text-4xl font-black font-mono tracking-widest italic leading-none", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>
             {(() => {
               if (is12Beat && masterLength === 12) {
                 let b = Math.floor((normRot + 0.0001) / 30);
                 if (b === 0) b = 12;
                 return b.toString().padStart(2, '0');
               } else if (is12Beat && masterLength === 24) {
                 let b = Math.floor((normRot + 0.0001) / 30);
                 if (b === 0) b = 12;
                 return b.toString().padStart(2, '0');
               } else {
                 let b = (Math.floor(normRot / (360 / masterBaseBeats) + 0.0001) % masterBaseBeats) + 1;
                 return b.toString().padStart(2, '0');
               }
             })()}
           </div>
         </motion.div>
      </div>
    </div>
  );
}

function RingsVisualizer({ isPlaying, pattern, rotation, displayBeat, resolvedTheme }: { isPlaying: boolean, pattern: BeatPattern | null, rotation: number, displayBeat: number, resolvedTheme: 'dark' | 'light' }) {
  const voices = pattern?.voices || [];
  const masterVoice = voices[0];
  const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;
  const masterBaseBeats = (masterVoice?.isDoubleTime ? masterLength / 2 : masterLength) || 4;

  const is12Beat = masterBaseBeats === 12 || pattern?.type === TimeSignatureType.Flamenco || pattern?.timeSignature === '12-Beat';
  const voiceColors = ["#FF4E00", "#A855F7", "#00D4FF", "#00FFAB", "#FF007F"];

  const normRot = ((rotation % 360) + 360) % 360;

  return (
    <div className="relative w-[340px] h-[340px] sm:w-[360px] sm:h-[360px] flex items-center justify-center shrink-0">
      <div className={cn("absolute inset-0 rounded-full blur-3xl opacity-10", resolvedTheme === 'dark' ? "bg-white/5" : "bg-black/5")} />
      
      <div 
        className={cn(
          "absolute w-[2px] z-30 origin-bottom rounded-full",
          resolvedTheme === 'dark' ? "bg-white shadow-[0_0_15px_white]" : "bg-slate-900 shadow-[0_0_15px_rgba(0,0,0,0.2)]"
        )}
        style={{ 
          transform: `rotate(${rotation % 360}deg)`,
          top: '30px',
          height: '150px',
          left: '50%',
          marginLeft: '-1px',
          transformOrigin: '50% 150px'
        }}
      />

      <div className="relative w-full h-full flex items-center justify-center">
        {voices.map((voice, vIndex) => {
          const radius = 150 - (vIndex * 32); 
          if (radius < 40) return null; 
          const length = voice.pattern?.length || voice.beats || 4;
          const color = voiceColors[vIndex % voiceColors.length];
          
          return (
            <div key={voice.id} className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg viewBox="0 0 360 360" className="absolute w-full h-full rotate-[-90deg]">
                <circle 
                  cx="180" cy="180" r={radius} 
                  className={cn(
                    "fill-none transition-colors",
                    voice.muted 
                      ? resolvedTheme === 'dark' ? "stroke-white/[0.01]" : "stroke-black/[0.01]"
                      : resolvedTheme === 'dark' ? "stroke-white/[0.05]" : "stroke-black/[0.05]"
                  )}
                  strokeWidth="1"
                />
              </svg>

              {Array.from({ length }).map((_, i) => {
                const angle = (is12Beat && length === 24)
                  ? (i * 360) / 24
                  : (is12Beat && length === 12)
                    ? ((i + 1) / 12) * 360
                    : (i * 360) / length;

                let voiceBeatIdx = 0;
                if (is12Beat && length === 12) {
                  let b = Math.floor((normRot + 0.0001) / 30);
                  if (b === 0) b = 12;
                  voiceBeatIdx = b - 1;
                } else if (is12Beat && length === 24) {
                  voiceBeatIdx = Math.floor((normRot + 0.0001) / 15) % 24;
                } else {
                  voiceBeatIdx = Math.floor(normRot / (360 / length) + 0.0001) % length;
                }

                const isOver = voiceBeatIdx === i && isPlaying;
                const val = voice.pattern ? voice.pattern[i] : (i === 0 ? 2 : 1);
                
                return (
                  <div 
                    key={i}
                    className="absolute left-1/2 -ml-[1px] w-[2px] pointer-events-none"
                    style={{ 
                      top: `${180 - radius}px`,
                      height: `${radius}px`,
                      transform: `rotate(${angle}deg)`,
                      transformOrigin: '50% 100%'
                    }}
                  >
                    <div 
                      className={cn(
                        "absolute left-1/2 rounded-full transition-all",
                        voice.isDoubleTime ? "w-3 h-3" : "w-4 h-4",
                        voice.muted ? "opacity-10" : "",
                        isOver && !voice.muted ? "z-20" : ""
                      )} 
                      style={{
                        top: 0,
                        transform: `translate(-50%, -50%) ${isOver && !voice.muted ? 'scale(1.5)' : 'scale(1)'}`,
                        backgroundColor: !voice.muted ? (
                          isOver ? (resolvedTheme === 'dark' ? '#FFFFFF' : '#000000') : (val === 2 ? color : `${color}22`)
                        ) : (resolvedTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                        boxShadow: !voice.muted ? (
                          isOver ? `0 0 20px ${resolvedTheme === 'dark' ? '#FFFFFF' : '#000000'}, 0 0 40px ${color}` : (val === 2 ? `0 0 15px ${color}66` : 'none')
                        ) : 'none'
                      }} 
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
         <motion.div 
           animate={{
             scale: isPlaying ? 1.02 : 1,
             borderColor: resolvedTheme === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0,0,0,0.05)",
             backgroundColor: resolvedTheme === 'dark' ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.9)",
             boxShadow: resolvedTheme === 'dark' ? "0 20px 50px rgba(0, 0, 0, 0.5)" : "0 10px 30px rgba(0, 0, 0, 0.05)"
           }}
           transition={{ duration: 0.1 }}
           className="flex flex-col items-center backdrop-blur-xl w-32 h-32 rounded-full border shadow-2xl justify-center"
         >
           <div className={cn("text-4xl font-black font-mono tracking-widest italic leading-none", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>
             {(() => {
               if (is12Beat && masterLength === 12) {
                 let b = Math.floor((normRot + 0.0001) / 30);
                 if (b === 0) b = 12;
                 return b.toString().padStart(2, '0');
               } else if (is12Beat && masterLength === 24) {
                 let b = Math.floor((normRot + 0.0001) / 30);
                 if (b === 0) b = 12;
                 return b.toString().padStart(2, '0');
               } else {
                 let b = (Math.floor(normRot / (360 / masterBaseBeats) + 0.0001) % masterBaseBeats) + 1;
                 return b.toString().padStart(2, '0');
               }
             })()}
           </div>
         </motion.div>
      </div>
    </div>
  );
}

function LinearVisualizer({ isPlaying, pattern, rotation, resolvedTheme }: { isPlaying: boolean, pattern: BeatPattern | null, rotation: number, resolvedTheme: 'dark' | 'light' }) {
  const voices = pattern?.voices || [];
  const voiceColors = ["#FF4E00", "#A855F7", "#00D4FF", "#00FFAB", "#FF007F"];
  const masterVoice = voices[0];
  const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;
  const masterSubdivision = masterVoice?.isTripleTime ? 3 : (masterVoice?.isDoubleTime || masterVoice?.isSwing ? 2 : 1);
  const masterBaseBeats = Math.max(1, Math.round(masterLength / masterSubdivision));
  const is12Beat = masterBaseBeats === 12 || pattern?.type === TimeSignatureType.Flamenco || pattern?.timeSignature === '12-Beat';
  const swingRatio = pattern?.swingRatio ?? (2 / 3);

  const normRot = ((rotation % 360) + 360) % 360;

  return (
    <div className="w-full max-w-4xl flex flex-col gap-6 items-center py-6 px-4">
      {voices.map((voice, vIndex) => {
        const length = voice.pattern?.length || voice.beats || 4;
        const vSub = voice.isTripleTime ? 3 : (voice.isDoubleTime || voice.isSwing ? 2 : 1);
        const color = voiceColors[vIndex % voiceColors.length];

        const tagText = voice.isSwing
          ? `Swing (${Math.round(swingRatio * 100)}%)`
          : voice.isTripleTime
          ? '3x Triple Time'
          : voice.isDoubleTime
          ? '2x Double Time'
          : null;

        return (
          <div key={voice.id} className="flex flex-col gap-2 w-full">
            <div className="flex justify-between items-center w-full px-1">
              <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] italic opacity-70 flex items-center gap-2", resolvedTheme === 'dark' ? "" : "opacity-90")} style={{ color }}>
                <span>Layer {vIndex + 1} &bull; {voice.sound}</span>
                {tagText && (
                  <span className="px-1.5 py-0.5 rounded bg-[#FF4E00]/20 text-[#FF4E00] font-mono text-[9px] font-black not-italic tracking-normal">
                    {tagText}
                  </span>
                )}
              </span>
              <span className={cn("text-[9px] font-mono font-bold opacity-40", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>
                {length} {vSub > 1 ? 'sub-beats' : 'beats'}
              </span>
            </div>

            <div className="w-full overflow-x-auto min-w-0">
              <div 
                className="grid gap-1 sm:gap-2 w-full min-w-[500px] items-stretch"
                style={{
                  gridTemplateColumns: `repeat(${masterBaseBeats}, minmax(0, 1fr))`
                }}
              >
                {Array.from({ length: masterBaseBeats }).map((_, beatIdx) => {
                  const subBeats = voice.pattern?.slice(beatIdx * vSub, (beatIdx + 1) * vSub) || Array(vSub).fill(1);

                  return (
                    <div key={beatIdx} className="flex items-center gap-1 w-full h-full">
                      {subBeats.map((val, subIdx) => {
                        const i = beatIdx * vSub + subIdx;

                        let voiceBeatIdx = 0;
                        if (is12Beat && length === 12) {
                          let b = Math.floor((normRot + 0.0001) / 30);
                          if (b === 0) b = 12;
                          voiceBeatIdx = b - 1;
                        } else if (is12Beat && length === 24) {
                          voiceBeatIdx = Math.floor((normRot + 0.0001) / 15) % 24;
                        } else if (is12Beat && length === 36) {
                          voiceBeatIdx = Math.floor((normRot + 0.0001) / 10) % 36;
                        } else {
                          voiceBeatIdx = Math.floor(normRot / (360 / length) + 0.0001) % length;
                        }
                        const isCurrent = voiceBeatIdx === i && isPlaying;

                        const flexStyle = voice.isSwing
                          ? (subIdx === 0 ? swingRatio : (1 - swingRatio))
                          : 1;

                        return (
                          <motion.div
                            key={i}
                            style={{ flex: flexStyle }}
                            initial={false}
                            animate={{
                              scale: isCurrent && !voice.muted ? 1.05 : 1,
                              opacity: voice.muted ? 0.25 : (val === 0 && !isCurrent ? 0.15 : 1),
                              backgroundColor: !voice.muted ? (
                                isCurrent ? (resolvedTheme === 'dark' ? '#FFFFFF' : '#000000') : (val === 2 ? color : (val === 1 ? `${color}25` : (resolvedTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)')))
                              ) : (resolvedTheme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                              boxShadow: !voice.muted && isCurrent ? `0 0 16px ${resolvedTheme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)'}, 0 0 30px ${color}` : (val === 2 && !voice.muted ? `0 0 10px ${color}44` : 'none')
                            }}
                            transition={{ duration: 0.08 }}
                            className={cn(
                              "rounded-xl border transition-all flex flex-col items-center justify-center min-w-0 relative overflow-hidden",
                              vSub > 1 ? "h-8 sm:h-10" : "h-11 sm:h-12",
                              isCurrent && !voice.muted ? (resolvedTheme === 'dark' ? "border-white" : "border-black") : (resolvedTheme === 'dark' ? "border-white/10" : "border-black/10")
                            )}
                          >
                            {val === 2 && !isCurrent && (
                              <div className={cn("w-1.5 h-1.5 rounded-full mb-0.5", resolvedTheme === 'dark' ? "bg-white/70" : "bg-black/50")} />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

