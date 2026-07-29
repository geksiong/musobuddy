/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sliders, 
  Drum, 
  Waves, 
  Mic2, 
  Piano, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  Pause, 
  Volume2, 
  Music, 
  ExternalLink,
  Plus,
  Minus,
  Sparkles,
  Radio,
  Rewind,
  VolumeX,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useScores } from '../../contexts/ScoreContext.tsx';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { useMetronome } from '../../hooks/useMetronome.ts';
import { useDrone } from '../../hooks/useDrone.ts';
import { useAccompaniment } from '../../contexts/AccompanimentContext.tsx';
import ScoreAudioPlayer from '../Score/ScoreAudioPlayer.tsx';
import { ScoreFormat } from '../Score/types.ts';
import { DroneTone } from '../Drone/types.ts';
import { DRONE_TONES } from '../Drone/constants.ts';

interface PracticeToolsPanelProps {
  onNavigate?: (view: 'metronome' | 'tuner' | 'drone' | 'score' | 'accompaniment') => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function PracticeToolsPanel({ onNavigate, fileInputRef }: PracticeToolsPanelProps) {
  const { resolvedTheme } = useTheme();
  const { globalAudio, activeScore, loadFiles, setPlaybackTime } = useScores();
  const { playingRefNote, playRefNote, stopRefNote } = useAudio();

  // Practice Tools Hooks
  const { 
    isPlaying: isMetronomePlaying, 
    bpm: metronomeBpm, 
    setBpm: setMetronomeBpm, 
    start: startMetronome, 
    stop: stopMetronome,
    metronomeVolume,
    setMetronomeVolume
  } = useMetronome();

  const { 
    isDronePlaying, 
    setIsDronePlaying, 
    selectedDroneNote, 
    setSelectedDroneNote, 
    droneTone, 
    setDroneTone,
    droneVolume,
    setDroneVolume,
    dronePulseBpm,
    setDronePulseBpm,
    userDroneNotes,
    toggleDroneNote
  } = useDrone();

  const { 
    isPlaying: isAccompanimentPlaying, 
    setIsPlaying: setIsAccompanimentPlaying,
    accompanimentVolume,
    setAccompanimentVolume
  } = useAccompaniment();

  const [droneOctave, setDroneOctave] = useState<'2' | '3' | '4'>('4');

  // Expanded menu state: 'tools' | 'audio' | null
  // Expanding one menu collapses the other
  const [expandedMenu, setExpandedMenu] = useState<'tools' | 'audio' | null>(() => {
    const saved = localStorage.getItem('musobuddy_active_menu');
    if (saved === '"tools"' || saved === 'tools') return 'tools';
    if (saved === '"audio"' || saved === 'audio') return 'audio';
    return null;
  });

  useEffect(() => {
    localStorage.setItem('musobuddy_active_menu', JSON.stringify(expandedMenu));
  }, [expandedMenu]);

  const toggleToolsMenu = () => {
    setExpandedMenu(prev => prev === 'tools' ? null : 'tools');
  };

  const toggleAudioMenu = () => {
    setExpandedMenu(prev => prev === 'audio' ? null : 'audio');
  };

  const handleTapTempo = () => {
    // Simple tap tempo logic
    const now = Date.now();
    const lastTap = (window as any)._lastTapTime || 0;
    if (lastTap && now - lastTap < 3000) {
      const delta = now - lastTap;
      const calculatedBpm = Math.round(60000 / delta);
      if (calculatedBpm >= 30 && calculatedBpm <= 300) {
        setMetronomeBpm(calculatedBpm);
      }
    }
    (window as any)._lastTapTime = now;
  };

  const currentAudioUrl = globalAudio?.url || activeScore?.audioUrl;
  
  let currentAudioName = '(no audio file)';
  if (currentAudioUrl) {
    if (globalAudio?.name) {
      currentAudioName = globalAudio.name;
    } else if (activeScore?.audioName) {
      currentAudioName = activeScore.audioName;
    } else if (activeScore?.title) {
      const isMidi = activeScore.format === ScoreFormat.ABC || currentAudioUrl.startsWith('blob:');
      const ext = isMidi ? '.mid' : '.mp3';
      currentAudioName = activeScore.title.toLowerCase().endsWith(ext) ? activeScore.title : `${activeScore.title}${ext}`;
    } else {
      currentAudioName = 'audio.mid';
    }
  }

  return (
    <ScoreAudioPlayer
      url={currentAudioUrl}
      filename={currentAudioName}
      resolvedTheme={resolvedTheme}
      onUploadRequested={() => fileInputRef?.current?.click()}
      onFilesDropped={loadFiles}
      onTimeUpdate={setPlaybackTime}
      renderTopBarControls={(audio) => (
        <div className={cn(
          "border-b shrink-0 transition-colors z-30 select-none",
          resolvedTheme === 'dark' 
            ? "border-white/10 bg-[#0C0C0E] text-slate-200" 
            : "border-black/5 bg-white text-slate-900 shadow-sm"
        )}>
          {/* Split Practice Tools Bar */}
          <div className="px-3 sm:px-6 py-2 flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 sm:gap-3 text-xs">
            
            {/* SET 1: Practice Tools Controls (Metronome, Drone, Accompaniment + Expand Toggle) */}
            <div className={cn(
              "flex items-center gap-1.5 sm:gap-2 p-1 rounded-xl border transition-all overflow-x-auto custom-scrollbar max-w-full",
              expandedMenu === 'tools'
                ? "bg-[#FF4E00]/10 border-[#FF4E00]/30 shadow-sm"
                : resolvedTheme === 'dark'
                  ? "bg-white/5 border-white/10"
                  : "bg-slate-100 border-slate-200"
            )}>
              {/* Practice Tools Expand/Collapse Toggle */}
              <button
                onClick={toggleToolsMenu}
                className={cn(
                  "flex items-center gap-1.5 font-black uppercase tracking-widest text-[10px] sm:text-xs py-1.5 px-2.5 rounded-lg border transition-all shrink-0 group cursor-pointer",
                  expandedMenu === 'tools'
                    ? "bg-[#FF4E00] border-[#FF4E00] text-white shadow-md shadow-[#FF4E00]/20"
                    : resolvedTheme === 'dark'
                      ? "bg-white/10 border-white/10 hover:bg-white/20 text-slate-200"
                      : "bg-white border-slate-300 hover:bg-slate-50 text-slate-800 shadow-sm"
                )}
                title={expandedMenu === 'tools' ? "Collapse Practice Tools Menu" : "Expand Practice Tools Menu"}
              >
                <Sliders className="w-3.5 h-3.5 text-[#FF4E00] group-hover:rotate-45 transition-transform" />
                <span className="hidden sm:inline">Practice Tools</span>
                <span className="sm:hidden">Tools</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", expandedMenu === 'tools' && "rotate-180")} />
              </button>

              <div className="w-[1px] h-4 bg-black/10 dark:bg-white/10 mx-0.5 shrink-0" />

              {/* Metronome Quick Toggle */}
              <button
                onClick={() => isMetronomePlaying ? stopMetronome() : startMetronome()}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 cursor-pointer",
                  isMetronomePlaying
                    ? "bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-500/30"
                    : resolvedTheme === 'dark'
                      ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-slate-200"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                )}
                title="Toggle Metronome"
              >
                <Drum className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Metronome</span>
                <span className="font-mono text-[9px] opacity-80">{metronomeBpm} BPM</span>
                {isMetronomePlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                )}
              </button>

              {/* Drone Quick Toggle */}
              <button
                onClick={() => setIsDronePlaying(!isDronePlaying)}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 cursor-pointer",
                  isDronePlaying
                    ? "bg-purple-500 border-purple-500 text-white shadow-sm shadow-purple-500/30"
                    : resolvedTheme === 'dark'
                      ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-slate-200"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                )}
                title="Toggle Drone Tone"
              >
                <Waves className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Drone</span>
                <span className="font-mono text-[9px] opacity-80 max-w-[90px] truncate">
                  {userDroneNotes.length > 0 ? userDroneNotes.join(', ') : 'None'}
                </span>
                {isDronePlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                )}
              </button>

              {/* Accompaniment Quick Toggle */}
              <button
                onClick={() => setIsAccompanimentPlaying(!isAccompanimentPlaying)}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 cursor-pointer",
                  isAccompanimentPlaying
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                    : resolvedTheme === 'dark'
                      ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-slate-200"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                )}
                title="Toggle Accompaniment Backing Track"
              >
                <Piano className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Accompaniment</span>
                {isAccompanimentPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                )}
              </button>
            </div>

            {/* SET 2: Audio Playback Controls Set (Audio Engine + Expand Toggle) */}
            <div className={cn(
              "flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl border transition-all overflow-x-auto custom-scrollbar max-w-full ml-auto",
              expandedMenu === 'audio'
                ? "bg-orange-500/10 border-orange-500/30 shadow-sm"
                : resolvedTheme === 'dark'
                  ? "bg-white/5 border-white/10"
                  : "bg-slate-100 border-slate-200"
            )}>
              {/* File Name / Upload Trigger */}
              <button
                onClick={() => fileInputRef?.current?.click()}
                className="flex items-center gap-1.5 hover:opacity-80 transition-opacity max-w-[90px] sm:max-w-[140px] truncate px-1 cursor-pointer"
                title={currentAudioUrl ? `Loaded: ${currentAudioName}. Click to change file.` : 'No audio file loaded. Click to load audio file.'}
              >
                <Music className="w-3.5 h-3.5 shrink-0 text-[#FF4E00]" />
                <span className="truncate text-[10px] font-bold text-slate-800 dark:text-slate-200">
                  {currentAudioName}
                </span>
              </button>

              <div className="w-[1px] h-3.5 bg-orange-500/20 mx-0.5" />

              {/* Rewind (-5s) Button */}
              <button
                onClick={() => audio.rewind(5)}
                className="p-1 rounded-lg hover:bg-orange-500/20 active:scale-95 transition-all text-slate-700 dark:text-slate-200 cursor-pointer"
                title="Rewind 5 seconds"
              >
                <Rewind className="w-3.5 h-3.5" />
              </button>

              {/* Play / Pause Button with Time */}
              <button
                onClick={audio.togglePlay}
                className="px-2 py-1 rounded-lg bg-[#FF4E00] text-white hover:bg-orange-600 active:scale-95 transition-all shadow-sm flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                title={audio.isPlaying ? "Pause Audio" : "Play Audio"}
              >
                {audio.isPlaying ? (
                  <Pause className="w-3 h-3 fill-current" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
                <span className="font-mono text-[9px] min-w-[32px] text-center">
                  {audio.formatTime(audio.currentTime)}
                </span>
              </button>

              <div className="w-[1px] h-3.5 bg-orange-500/20 mx-0.5" />

              {/* Volume Down Button (-3dB) */}
              <button
                onClick={() => audio.volumeDown(3)}
                className="p-1 rounded-lg hover:bg-orange-500/20 active:scale-95 transition-all text-slate-700 dark:text-slate-200 cursor-pointer"
                title="Volume Down (-3 dB)"
              >
                <Minus className="w-3 h-3" />
              </button>

              {/* Volume Indicator / Mute Toggle */}
              <button
                onClick={audio.toggleMute}
                className="px-1 text-[9px] font-mono font-bold hover:text-orange-500 transition-colors flex items-center gap-0.5 cursor-pointer"
                title={audio.isMuted ? "Unmute" : "Click to Mute"}
              >
                {audio.isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <span className="text-[9px] font-extrabold text-slate-700 dark:text-slate-300">
                    {Math.round(((audio.volume + 64) / 64) * 100)}%
                  </span>
                )}
              </button>

              {/* Volume Up Button (+3dB) */}
              <button
                onClick={() => audio.volumeUp(3)}
                className="p-1 rounded-lg hover:bg-orange-500/20 active:scale-95 transition-all text-slate-700 dark:text-slate-200 cursor-pointer"
                title="Volume Up (+3 dB)"
              >
                <Plus className="w-3 h-3" />
              </button>

              <div className="w-[1px] h-4 bg-black/10 dark:bg-white/10 mx-0.5 shrink-0" />

              {/* Audio Engine Expand/Collapse Toggle */}
              <button
                onClick={toggleAudioMenu}
                className={cn(
                  "flex items-center gap-1.5 font-black uppercase tracking-widest text-[10px] sm:text-xs py-1.5 px-2.5 rounded-lg border transition-all shrink-0 group cursor-pointer",
                  expandedMenu === 'audio'
                    ? "bg-[#FF4E00] border-[#FF4E00] text-white shadow-md shadow-[#FF4E00]/20"
                    : resolvedTheme === 'dark'
                      ? "bg-white/10 border-white/10 hover:bg-white/20 text-slate-200"
                      : "bg-white border-slate-300 hover:bg-slate-50 text-slate-800 shadow-sm"
                )}
                title={expandedMenu === 'audio' ? "Collapse Audio Engine Menu" : "Expand Audio Engine Menu"}
              >
                <Volume2 className="w-3.5 h-3.5 text-[#FF4E00]" />
                <span className="hidden sm:inline">Audio Engine</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", expandedMenu === 'audio' && "rotate-180")} />
              </button>
            </div>
          </div>

          {/* Drawers Below Top Bar - Mutually Exclusive */}
          <AnimatePresence mode="wait">
            {expandedMenu === 'tools' && (
              <motion.div
                key="tools-drawer"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden border-t border-black/5 dark:border-white/10"
              >
                <div className="p-4 sm:p-6 max-w-7xl mx-auto flex flex-col gap-6">
                  {/* Practice Tools Grid: Metronome, Drone, Tuner, Accompaniment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Metronome Quick Box */}
                    <div className={cn(
                      "p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                            <Drum className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider">Metronome</h4>
                            <span className="text-[9px] font-bold text-slate-400 tracking-wider">Timing Engine</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onNavigate?.('metronome')}
                          className="text-slate-400 hover:text-[#FF4E00] transition-colors p-1 cursor-pointer"
                          title="Open Metronome View"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setMetronomeBpm(Math.max(30, metronomeBpm - 5))}
                          className="p-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 text-xs font-bold cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <div className="flex flex-col items-center">
                          <span className="text-xl font-black font-mono tracking-tight text-[#FF4E00]">
                            {metronomeBpm}
                          </span>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">BPM</span>
                        </div>

                        <button
                          onClick={() => setMetronomeBpm(Math.min(300, metronomeBpm + 5))}
                          className="p-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 text-xs font-bold cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => isMetronomePlaying ? stopMetronome() : startMetronome()}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer",
                            isMetronomePlaying
                              ? "bg-orange-500 text-white shadow-orange-500/20"
                              : "bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20"
                          )}
                        >
                          {isMetronomePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          <span>{isMetronomePlaying ? 'Stop' : 'Start'}</span>
                        </button>

                        <button
                          onClick={handleTapTempo}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-400 hover:text-slate-200 cursor-pointer"
                          title="Tap Tempo"
                        >
                          Tap
                        </button>
                      </div>
                    </div>

                    {/* Drone Quick Box */}
                    <div className={cn(
                      "p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                            <Waves className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider">Drone</h4>
                            <span className="text-[9px] font-bold text-slate-400 tracking-wider">Tone Generator</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={droneTone}
                            onChange={(e) => setDroneTone(e.target.value as DroneTone)}
                            className={cn(
                              "bg-transparent text-[10px] font-bold rounded-lg border px-1.5 py-0.5 outline-none cursor-pointer",
                              resolvedTheme === 'dark' ? "border-white/10 bg-black/20 text-white" : "border-slate-300 bg-white text-slate-900"
                            )}
                          >
                            {DRONE_TONES.map(tone => (
                              <option 
                                key={tone} 
                                value={tone} 
                                className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}
                              >
                                {tone.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => onNavigate?.('drone')}
                            className="text-slate-400 hover:text-purple-400 transition-colors p-1 cursor-pointer"
                            title="Open Full Drone View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Active Selected Notes Badges */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                            Active Notes ({userDroneNotes.length})
                          </span>
                          {userDroneNotes.length > 0 && (
                            <button
                              onClick={() => {
                                userDroneNotes.forEach(note => toggleDroneNote(note));
                              }}
                              className="text-[8px] font-bold uppercase tracking-wider text-purple-400 hover:text-purple-300 cursor-pointer"
                            >
                              Clear All
                            </button>
                          )}
                        </div>
                        
                        {userDroneNotes.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto custom-scrollbar py-0.5">
                            {userDroneNotes.map(note => (
                              <button
                                key={note}
                                onClick={() => toggleDroneNote(note)}
                                className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 flex items-center gap-1 group/chip transition-all cursor-pointer"
                                title={`Click to deselect ${note}`}
                              >
                                <span>{note}</span>
                                <X className="w-2.5 h-2.5 opacity-60 group-hover/chip:opacity-100" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic py-0.5">No notes selected (Click notes below)</span>
                        )}
                      </div>

                      {/* Note Selection Toggle Grid */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                            Select Notes
                          </span>
                          <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-md">
                            <button
                              onClick={() => setDroneOctave('2')}
                              className={cn(
                                "px-1.5 py-0.5 text-[8px] font-bold rounded transition-all cursor-pointer",
                                droneOctave === '2' ? "bg-purple-500 text-white" : "text-slate-400 hover:text-slate-200"
                              )}
                              title="Bass Octave (2)"
                            >
                              Oct 2
                            </button>
                            <button
                              onClick={() => setDroneOctave('3')}
                              className={cn(
                                "px-1.5 py-0.5 text-[8px] font-bold rounded transition-all cursor-pointer",
                                droneOctave === '3' ? "bg-purple-500 text-white" : "text-slate-400 hover:text-slate-200"
                              )}
                              title="Low Octave (3)"
                            >
                              Oct 3
                            </button>
                            <button
                              onClick={() => setDroneOctave('4')}
                              className={cn(
                                "px-1.5 py-0.5 text-[8px] font-bold rounded transition-all cursor-pointer",
                                droneOctave === '4' ? "bg-purple-500 text-white" : "text-slate-400 hover:text-slate-200"
                              )}
                              title="Standard Octave (4)"
                            >
                              Oct 4
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-6 gap-1">
                          {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(noteName => {
                            const fullNote = noteName + droneOctave;
                            const isSelected = userDroneNotes.includes(fullNote);
                            return (
                              <button
                                key={fullNote}
                                onClick={() => toggleDroneNote(fullNote)}
                                className={cn(
                                  "py-1 rounded text-[9px] font-mono font-bold transition-all border text-center cursor-pointer",
                                  isSelected
                                    ? "bg-purple-500 border-purple-500 text-white shadow-sm"
                                    : "bg-black/5 dark:bg-white/5 border-transparent text-slate-400 hover:text-slate-200 hover:bg-black/10 dark:hover:bg-white/10"
                                )}
                                title={isSelected ? `Deselect ${fullNote}` : `Select ${fullNote}`}
                              >
                                {noteName}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Start / Stop Drone Button */}
                      <button
                        onClick={() => {
                          if (!isDronePlaying && userDroneNotes.length === 0) {
                            toggleDroneNote(`C${droneOctave}`);
                          }
                          setIsDronePlaying(!isDronePlaying);
                        }}
                        className={cn(
                          "w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer",
                          isDronePlaying
                            ? "bg-purple-500 text-white shadow-purple-500/20 animate-pulse"
                            : "bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20"
                        )}
                      >
                        {isDronePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isDronePlaying ? 'Stop Drone' : 'Start Drone'}</span>
                      </button>
                    </div>

                    {/* Tuner & Reference Note Quick Box */}
                    <div className={cn(
                      "p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Mic2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider">Tuner & Pitch</h4>
                            <span className="text-[9px] font-bold text-slate-400 tracking-wider">Chromatic Reference</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onNavigate?.('tuner')}
                          className="text-slate-400 hover:text-emerald-400 transition-colors p-1 cursor-pointer"
                          title="Open Tuner View"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Play Pitch Reference</span>
                        <div className="grid grid-cols-4 gap-1">
                          {['A4', 'D4', 'G3', 'C4'].map(note => (
                            <button
                              key={note}
                              onClick={() => playRefNote(note)}
                              className={cn(
                                "py-1 rounded-md text-[10px] font-bold transition-all border cursor-pointer",
                                playingRefNote === note
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "bg-black/5 dark:bg-white/5 border-transparent text-slate-400 hover:text-slate-200"
                              )}
                            >
                              {note}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => onNavigate?.('tuner')}
                        className="w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Launch Tuner</span>
                      </button>
                    </div>

                    {/* Accompaniment Quick Box */}
                    <div className={cn(
                      "p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <Piano className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider">Accompaniment</h4>
                            <span className="text-[9px] font-bold text-slate-400 tracking-wider">Backing Engine</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onNavigate?.('accompaniment')}
                          className="text-slate-400 hover:text-blue-400 transition-colors p-1 cursor-pointer"
                          title="Open Accompaniment View"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Backing Tempo</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="50"
                            max="200"
                            value={metronomeBpm}
                            onChange={(e) => setMetronomeBpm(parseInt(e.target.value))}
                            className="flex-1 accent-blue-500 h-1 rounded-lg cursor-pointer"
                          />
                          <span className="text-xs font-mono font-bold w-12 text-right">{metronomeBpm} BPM</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setIsAccompanimentPlaying(!isAccompanimentPlaying)}
                        className={cn(
                          "w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer",
                          isAccompanimentPlaying
                            ? "bg-blue-500 text-white shadow-blue-500/20"
                            : "bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20"
                        )}
                      >
                        {isAccompanimentPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isAccompanimentPlaying ? 'Stop Backing' : 'Start Backing'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {expandedMenu === 'audio' && (
              <motion.div
                key="audio-drawer"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden border-t border-black/5 dark:border-white/10"
              >
                <div className="p-4 sm:p-6 max-w-7xl mx-auto">
                  {audio.fullPlayerJSX}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    />
  );
}
