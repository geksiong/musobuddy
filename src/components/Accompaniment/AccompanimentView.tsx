/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Play, Pause, Plus, Trash2, Guitar as GuitarIcon, Music, Layers, 
  Radio, ChevronDown, Volume2, X, RefreshCw, BookOpen, Compass, ListMusic, Sparkles,
  ArrowLeftRight, BookmarkPlus, Save, Hash, Search
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useMetronome } from '../../hooks/useMetronome.ts';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { useAccompaniment, getEffectiveChord } from '../../contexts/AccompanimentContext.tsx';
import { InstrumentType } from '../../types.ts';
import ChordExplorer from '../ChordExplorer/ChordExplorer.tsx';
import GrooveEnginePanel from './GrooveEnginePanel.tsx';
import SongLibraryPanel from './SongLibraryPanel.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { 
  CHORD_ROOTS_SHARP, CHORD_ROOTS_FLAT, CHORD_TYPES, ARPEGGIO_PRESETS, ARPEGGIO_RATES,
  getChordTypeInfo, transposeChord, toggleEnharmonicSpelling, formatChordName 
} from './constants.ts';
import { 
  PROGRESSION_PRESETS, ProgressionPreset, getUserPresets, saveUserPreset, deleteUserPreset 
} from './progressionPresets.ts';
import { DEFAULT_PRESETS } from '../Metronome/constants.ts';

const INSTRUMENTS = [
  { id: InstrumentType.Piano, label: 'Acoustic Piano', icon: Music },
  { id: InstrumentType.ElectricPiano, label: 'Electric Piano (Rhodes)', icon: KeyboardIcon },
  { id: InstrumentType.Guitar, label: 'Acoustic Guitar', icon: GuitarIcon },
  { id: InstrumentType.Bass, label: 'Plucked Bass', icon: GuitarIcon },
  { id: InstrumentType.Strings, label: 'Symphonic Strings', icon: Layers },
  { id: InstrumentType.Organ, label: 'Hammond Organ', icon: KeyboardIcon },
  { id: InstrumentType.Flute, label: 'Concert Flute', icon: Sparkles },
  { id: InstrumentType.Brass, label: 'Brass Section', icon: Radio },
  { id: InstrumentType.Marimba, label: 'Acoustic Marimba', icon: ListMusic },
];

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

export default function AccompanimentView() {
  const { 
    progression, setProgression,
    selectedBeatIndex, setSelectedBeatIndex,
    clearBeat, deleteBeat, insertBeat, addBeat, addMeasure, clearAll,
    arpeggioPreset, setArpeggioPreset,
    arpeggioRate, setArpeggioRate,
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

  const [activeRightTab, setActiveRightTab] = useState<'songs' | 'library' | 'explorer' | 'presets'>('songs');
  const [presetFilterTimeSig, setPresetFilterTimeSig] = useState<string>('ALL');
  const [presetSearchQuery, setPresetSearchQuery] = useState<string>('');

  // Enharmonic and Transposition state
  const [accidentalMode, setAccidentalMode] = useState<'sharp' | 'flat'>('sharp');
  const [transposeShift, setTransposeShift] = useState<number>(0);

  // User Custom Presets state
  const [userPresets, setUserPresets] = useState<ProgressionPreset[]>(() => getUserPresets());
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetGenreInput, setPresetGenreInput] = useState('Pop');
  const [presetDescInput, setPresetDescInput] = useState('');

  const { isPlaying: isMetronomeRunning, start: startMetronome, stop: stopMetronome, activePattern, setActivePattern, setBpm } = useMetronome();
  const { playChord } = useAudio();

  // Transpose handlers
  const handleTranspose = (semitones: number) => {
    const updated = progression.map(slot => ({
      ...slot,
      name: slot.name ? transposeChord(slot.name, semitones, accidentalMode) : '',
    }));
    setProgression(updated);
    setTransposeShift(prev => prev + semitones);
  };

  const handleResetTranspose = () => {
    if (transposeShift === 0) return;
    handleTranspose(-transposeShift);
    setTransposeShift(0);
  };

  const handleToggleProgressionEnharmonics = () => {
    const updated = progression.map(slot => ({
      ...slot,
      name: slot.name ? toggleEnharmonicSpelling(slot.name) : '',
    }));
    setProgression(updated);
  };

  const handleSwapSelectedBeatEnharmonic = () => {
    if (selectedBeatIndex === null || !progression[selectedBeatIndex]?.name) return;
    const currentChord = progression[selectedBeatIndex].name;
    const swapped = toggleEnharmonicSpelling(currentChord);
    const updated = [...progression];
    updated[selectedBeatIndex] = { ...updated[selectedBeatIndex], name: swapped };
    setProgression(updated);
    playChord(swapped, selectedInstrument, accompanimentVolume);
    setTrackedChord(swapped);
  };

  // Preset Save & Delete handlers
  const handleSaveCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetNameInput.trim()) return;

    const chordsPerBeat = progression.map(p => p.name || '');
    const timeSig = (activePattern?.timeSignature as '4/4' | '3/4' | '6/8' | '5/4') || '4/4';

    const updatedList = saveUserPreset({
      name: presetNameInput.trim(),
      genre: presetGenreInput,
      timeSignature: timeSig,
      description: presetDescInput.trim() || 'Custom chord progression',
      bpm: activePattern?.voices[0]?.beats ? 120 : undefined,
      chordsPerBeat,
    });

    setUserPresets(updatedList);
    setIsSaveModalOpen(false);
    setPresetNameInput('');
    setPresetDescInput('');
    setActiveRightTab('presets');
    setPresetFilterTimeSig('CUSTOM');
  };

  const handleDeleteUserPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedList = deleteUserPreset(id);
    setUserPresets(updatedList);
  };

  const handleSelectPreset = (preset: ProgressionPreset) => {
    // 1. Convert preset chordsPerBeat to progression slots
    const newProg = preset.chordsPerBeat.map((chordName, i) => ({
      id: `preset_beat_${Date.now()}_${i}`,
      name: chordName,
    }));
    setProgression(newProg);
    setSelectedBeatIndex(0);

    // 2. Sync metronome pattern and BPM
    const targetPattern = DEFAULT_PRESETS.find(p => p.timeSignature === preset.timeSignature);
    if (targetPattern) {
      setActivePattern(targetPattern);
    }
    if (preset.bpm) {
      setBpm(preset.bpm);
    }

    // 3. Audio feedback on first chord
    const firstChord = preset.chordsPerBeat.find(c => c.trim() !== '');
    if (firstChord) {
      playChord(firstChord, selectedInstrument, accompanimentVolume);
      setTrackedChord(firstChord);
    }
  };

  const masterVoice = activePattern?.voices[0];
  const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;
  const timeSigLabel = activePattern?.timeSignature || `${masterLength}/4`;

  const totalMeasures = Math.ceil(progression.length / masterLength) || 1;

  const handleLibraryChordClick = (chordName: string) => {
    if (selectedBeatIndex !== null && selectedBeatIndex < progression.length) {
      const nextProg = [...progression];
      nextProg[selectedBeatIndex] = { ...nextProg[selectedBeatIndex], name: chordName };
      setProgression(nextProg);
      setSelectedBeatIndex((selectedBeatIndex + 1) % nextProg.length);
    } else {
      addBeat(chordName);
    }

    playChord(chordName, selectedInstrument, accompanimentVolume);
    setTrackedChord(chordName);
  };

  const activePlayChordInfo = getEffectiveChord(progression, currentIndex);
  const selectedBeatChordInfo = selectedBeatIndex !== null ? getEffectiveChord(progression, selectedBeatIndex) : null;
  const activeExplorerChord = trackedChord || (isPlaying && activePlayChordInfo?.chord) || selectedBeatChordInfo?.chord || 'C';

  return (
    <div className="p-4 md:p-6 w-full max-w-none min-h-full flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full min-w-0 items-start">
        {/* Left Side: Beat-Aligned Chord Grid & Controls */}
        <div className={cn(
          "lg:col-span-7 xl:col-span-8 w-full min-w-0 rounded-2xl border p-5 md:p-6 relative overflow-hidden flex flex-col transition-colors min-h-[580px]",
          resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
        )}>
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200 dark:border-white/10 gap-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-emerald-500 tracking-[0.3em] uppercase italic">Backing Engine</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[9px] font-bold">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                <span>{timeSigLabel}</span>
              </div>
            </div>

            {/* Beat Dots Visualizer */}
            <div className="flex items-center gap-1.5">
              <div className="flex gap-1.5 items-center">
                {Array.from({ length: masterLength }).map((_, i) => {
                  const isCurrentBeat = isPlaying && (currentIndex % masterLength === i);
                  return (
                    <motion.div
                      key={i}
                      initial={false}
                      animate={{
                        scale: isCurrentBeat ? 1.3 : 1,
                        backgroundColor: isCurrentBeat ? '#10B981' : (resolvedTheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                        boxShadow: isCurrentBeat ? '0 0 8px rgba(16,185,129,0.7)' : 'none'
                      }}
                      className="w-2 h-2 rounded-full"
                    />
                  );
                })}
              </div>
              <span className={cn("text-[9px] font-mono font-bold ml-1.5 min-w-[70px] text-right inline-block", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
                {isPlaying ? `Beat ${(currentIndex % masterLength) + 1}/${masterLength}` : `${masterLength} Beats`}
              </span>
            </div>
          </div>

          {/* Compact Single Row Playback Controls Bar */}
          <div className={cn(
            "flex flex-wrap items-center justify-between gap-2.5 p-2.5 mb-5 rounded-xl border transition-all",
            resolvedTheme === 'dark' ? "bg-black/20 border-white/10" : "bg-slate-50 border-slate-200"
          )}>
            {/* Play/Stop Button */}
            <button 
              onClick={() => {
                if (!isPlaying) setTrackedChord(null);
                setIsPlaying(!isPlaying);
              }}
              className={cn(
                "px-4 py-2 rounded-lg font-black uppercase tracking-wider text-[10px] flex items-center justify-center min-w-[84px] gap-2 transition-all shadow-md active:scale-95 shrink-0",
                isPlaying 
                  ? "bg-red-500 text-white shadow-red-500/20" 
                  : (progression.length > 0 ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20" : (resolvedTheme === 'dark' ? "bg-white/10 text-white/20 cursor-not-allowed" : "bg-slate-200 text-slate-400 cursor-not-allowed"))
              )}
              disabled={progression.length === 0}
            >
              {isPendingStart ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Syncing...</span>
                </div>
              ) : (
                <>
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? 'Stop' : 'Play'}</span>
                </>
              )}
            </button>

            {/* Metronome Toggle */}
            <button
              onClick={() => isMetronomeRunning ? stopMetronome() : startMetronome()}
              className={cn(
                "px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border shrink-0",
                isMetronomeRunning 
                  ? "bg-orange-500/20 border-orange-500 text-orange-500" 
                  : resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
              title="Toggle Metronome"
            >
              <div className={cn("w-1.5 h-1.5 rounded-full", isMetronomeRunning ? "bg-orange-500 animate-pulse" : "bg-slate-400")} />
              <span>Click</span>
            </button>

            {/* Bass Pulse Toggle */}
            <button
              onClick={() => setIsBassEnabled(!isBassEnabled)}
              className={cn(
                "px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border shrink-0",
                isBassEnabled 
                  ? "bg-orange-500/20 border-orange-500 text-orange-500" 
                  : resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
              title="Toggle Bass Pulse"
            >
              <div className={cn("w-1.5 h-1.5 rounded-full", isBassEnabled ? "bg-orange-500" : "bg-slate-400")} />
              <span>Bass</span>
            </button>

            {/* Instrument Selector */}
            <div className="relative group shrink-0">
              <select
                value={selectedInstrument}
                onChange={(e) => {
                  setSelectedInstrument(e.target.value as InstrumentType);
                  e.target.blur();
                }}
                className={cn(
                  "appearance-none border px-3 pr-8 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer outline-none focus:border-emerald-500/50",
                  resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/80 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
              >
                {INSTRUMENTS.map(inst => (
                  <option key={inst.id} value={inst.id} className={cn(resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>{inst.label}</option>
                ))}
              </select>
              <ChevronDown className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")} />
            </div>

            {/* Arpeggio Pattern Selector */}
            <div className="relative group shrink-0">
              <select
                value={arpeggioPreset}
                onChange={(e) => {
                  setArpeggioPreset(e.target.value);
                  e.target.blur();
                }}
                className={cn(
                  "appearance-none border px-3 pr-8 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer outline-none focus:border-emerald-500/50",
                  resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/80 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
                title="Select arpeggio pattern"
              >
                {ARPEGGIO_PRESETS.map(preset => (
                  <option key={preset} value={preset} className={cn(resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>
                    {preset}
                  </option>
                ))}
              </select>
              <ChevronDown className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")} />
            </div>

            {/* Rate / Subdivision Selector (Double Time, Triplets, Sixteenths) */}
            <div className="relative group shrink-0">
              <select
                value={arpeggioRate}
                onChange={(e) => {
                  setArpeggioRate(e.target.value);
                  e.target.blur();
                }}
                className={cn(
                  "appearance-none border px-3 pr-8 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer outline-none focus:border-emerald-500/50",
                  arpeggioRate !== '1x' ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-extrabold" : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/80 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100")
                )}
                title="Subdivision Speed (1x Normal, 2x Double Time, 3x Triplets, 4x Sixteenths)"
              >
                {ARPEGGIO_RATES.map(rate => (
                  <option key={rate.id} value={rate.id} className={cn(resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>
                    {rate.label}
                  </option>
                ))}
              </select>
              <ChevronDown className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")} />
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 shrink-0 min-w-[120px]">
              <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={accompanimentVolume}
                onChange={(e) => setAccompanimentVolume(parseFloat(e.target.value))}
                className="w-16 accent-emerald-500 h-1 rounded-lg appearance-none bg-slate-200 dark:bg-white/20 cursor-pointer"
              />
              <span className="text-[9px] font-mono font-bold text-emerald-500 w-[36px] text-right inline-block">
                {Math.round(accompanimentVolume * 100)}%
              </span>
            </div>
          </div>

          {/* Groove & Syncopation Engine Panel */}
          <div className="mb-4">
            <GrooveEnginePanel />
          </div>

          {/* Transposition & Preset Toolbar */}
          <div className={cn(
            "flex flex-wrap items-center justify-between gap-2 mb-3 p-2.5 rounded-xl border text-[10px] font-bold transition-colors",
            resolvedTheme === 'dark' ? "bg-white/[0.03] border-white/10" : "bg-slate-50 border-slate-200"
          )}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-mono uppercase text-[9px] mr-0.5">Transpose:</span>
              <button
                onClick={() => handleTranspose(-1)}
                className={cn(
                  "px-2 py-1 rounded-lg border flex items-center gap-1 transition-all text-[9px] font-mono",
                  resolvedTheme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-xs"
                )}
                title="Transpose current progression down 1 semitone (-1)"
              >
                -1 st
              </button>

              <button
                onClick={() => handleTranspose(1)}
                className={cn(
                  "px-2 py-1 rounded-lg border flex items-center gap-1 transition-all text-[9px] font-mono",
                  resolvedTheme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-xs"
                )}
                title="Transpose current progression up 1 semitone (+1)"
              >
                +1 st
              </button>

              {transposeShift !== 0 && (
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-2 py-0.5 rounded-lg text-[9px] font-mono">
                  <span>{transposeShift > 0 ? `+${transposeShift}` : transposeShift} st</span>
                  <button 
                    onClick={handleResetTranspose}
                    className="hover:text-emerald-400 text-slate-400 ml-1 font-bold"
                    title="Reset transposition to original key"
                  >
                    ✕
                  </button>
                </div>
              )}

              <button
                onClick={handleToggleProgressionEnharmonics}
                className={cn(
                  "px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all text-[9px] ml-1",
                  resolvedTheme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/80" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-xs"
                )}
                title="Swap enharmonic spelling across all chords in progression (e.g. C# ↔ Db)"
              >
                <ArrowLeftRight className="w-3 h-3 text-emerald-500" />
                <span>♯ ↔ ♭ All</span>
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-1 hidden sm:block" />

              <span className="text-slate-400 font-mono uppercase text-[9px] mr-0.5 hidden sm:inline">Speed:</span>
              <div className="flex items-center gap-1">
                {ARPEGGIO_RATES.map(rate => (
                  <button
                    key={rate.id}
                    onClick={() => setArpeggioRate(rate.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-md border text-[9px] font-mono transition-all",
                      arpeggioRate === rate.id
                        ? "bg-emerald-500 text-white border-emerald-500 font-bold shadow-xs"
                        : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/60 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100")
                    )}
                    title={rate.description}
                  >
                    {rate.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsSaveModalOpen(true)}
              disabled={progression.every(p => !p.name || p.name.trim() === '')}
              className={cn(
                "px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-[9px] font-bold shadow-xs",
                progression.some(p => p.name && p.name.trim() !== '')
                  ? (resolvedTheme === 'dark' ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700")
                  : "opacity-40 cursor-not-allowed"
              )}
              title="Save current progression as a custom preset"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Save as Preset</span>
            </button>
          </div>

          {/* Quick Actions & Selection Banner */}
          <div className="flex flex-wrap items-center justify-between mb-4 gap-2 text-[10px] font-bold">
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2.5 py-1 rounded-lg border uppercase tracking-wider text-[9px]",
                selectedBeatIndex !== null 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                  : "opacity-40"
              )}>
                {selectedBeatIndex !== null 
                  ? `Editing Beat ${selectedBeatIndex + 1} (m.${Math.floor(selectedBeatIndex / masterLength) + 1}, beat ${(selectedBeatIndex % masterLength) + 1})`
                  : 'Select beat to edit'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedBeatIndex !== null && progression[selectedBeatIndex]?.name ? (
                <button
                  onClick={handleSwapSelectedBeatEnharmonic}
                  className={cn(
                    "px-2 py-1 rounded-lg border flex items-center gap-1 transition-all text-[9px]",
                    resolvedTheme === 'dark' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  )}
                  title="Swap enharmonic spelling for selected chord (e.g. C#7 ↔ Db7)"
                >
                  <ArrowLeftRight className="w-3 h-3" /> Swap ♯/♭
                </button>
              ) : null}

              <button
                onClick={() => selectedBeatIndex !== null && insertBeat(selectedBeatIndex, '')}
                disabled={selectedBeatIndex === null}
                className={cn(
                  "px-2 py-1 rounded-lg border flex items-center gap-1 transition-all text-[9px]",
                  selectedBeatIndex !== null
                    ? (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700")
                    : "opacity-30 cursor-not-allowed"
                )}
                title="Insert empty beat at selected position"
              >
                <Plus className="w-3 h-3" /> Insert
              </button>

              <button
                onClick={() => selectedBeatIndex !== null && clearBeat(selectedBeatIndex)}
                disabled={selectedBeatIndex === null}
                className={cn(
                  "px-2 py-1 rounded-lg border flex items-center gap-1 transition-all text-[9px]",
                  selectedBeatIndex !== null
                    ? (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400 text-white/70" : "bg-slate-100 border-slate-200 hover:bg-amber-50 hover:text-amber-600 text-slate-700")
                    : "opacity-30 cursor-not-allowed"
                )}
                title="Clear chord from selected beat"
              >
                <X className="w-3 h-3" /> Clear
              </button>

              <button
                onClick={() => selectedBeatIndex !== null && deleteBeat(selectedBeatIndex)}
                disabled={selectedBeatIndex === null}
                className={cn(
                  "px-2 py-1 rounded-lg border flex items-center gap-1 transition-all text-[9px]",
                  selectedBeatIndex !== null
                    ? (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-white/70" : "bg-slate-100 border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-700")
                    : "opacity-30 cursor-not-allowed"
                )}
                title="Delete selected beat"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>

              <button
                onClick={addMeasure}
                className={cn(
                  "px-2 py-1 rounded-lg border flex items-center gap-1 transition-all text-[9px]",
                  resolvedTheme === 'dark' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                )}
                title={`Add 1 measure (${masterLength} beats)`}
              >
                <Plus className="w-3 h-3" /> +1 Measure
              </button>

              <button
                onClick={clearAll}
                className={cn(
                  "px-2 py-1 rounded-lg border flex items-center gap-1 transition-all text-red-500/70 hover:text-red-500 text-[9px]",
                  resolvedTheme === 'dark' ? "border-white/5 hover:bg-red-500/10" : "border-slate-200 hover:bg-red-50"
                )}
                title="Clear all chords"
              >
                <RefreshCw className="w-3 h-3" /> Clear All
              </button>
            </div>
          </div>

          {/* Beat Grid Area - Vertical alignment across measures */}
          <div className="w-full overflow-x-auto pb-2">
            <div className="min-w-[580px] flex flex-col gap-2">
              {/* Column Headers (Aligned Vertically for identical beats) */}
              <div 
                className="grid gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400 px-1"
                style={{ gridTemplateColumns: `42px repeat(${masterLength}, minmax(0, 1fr)) 12px` }}
              >
                <div className="flex items-center justify-center font-mono opacity-60">Bar</div>
                {Array.from({ length: masterLength }).map((_, beatIdx) => {
                  const isCurrentBeatColumn = isPlaying && (currentIndex % masterLength === beatIdx);
                  return (
                    <div 
                      key={beatIdx} 
                      className={cn(
                        "text-center py-1 rounded-md transition-colors border border-transparent font-mono",
                        isCurrentBeatColumn ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : ""
                      )}
                    >
                      Beat {beatIdx + 1}
                    </div>
                  );
                })}
                <div />
              </div>

              {/* Measure Rows with Barlines */}
              <div className="flex flex-col gap-3">
                {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                  const startBeatIndex = mIdx * masterLength;
                  const isCurrentMeasure = isPlaying && Math.floor(currentIndex / masterLength) === mIdx;

                  return (
                    <div 
                      key={mIdx}
                      className={cn(
                        "grid gap-2 items-center p-2 rounded-2xl border transition-all relative",
                        isCurrentMeasure 
                          ? (resolvedTheme === 'dark' ? "bg-emerald-500/5 border-emerald-500/30" : "bg-emerald-50/60 border-emerald-300")
                          : (resolvedTheme === 'dark' ? "bg-white/[0.02] border-white/10" : "bg-slate-50/80 border-slate-200")
                      )}
                      style={{ gridTemplateColumns: `42px repeat(${masterLength}, minmax(0, 1fr)) 12px` }}
                    >
                      {/* Measure Label & Left Barline */}
                      <div className="flex items-center justify-between pr-2 border-r border-slate-300 dark:border-white/15 h-full min-h-[90px]">
                        <span className="text-[10px] font-black font-mono text-slate-400">
                          m.{mIdx + 1}
                        </span>
                        {/* Visual Barline | */}
                        <div className="w-1.5 h-16 bg-slate-700 dark:bg-slate-300 rounded-sm" />
                      </div>

                      {/* Beat Slots for this Measure */}
                      {Array.from({ length: masterLength }).map((_, bIdx) => {
                        const globalBeatIndex = startBeatIndex + bIdx;
                        const chordSlot = progression[globalBeatIndex];
                        const exists = !!chordSlot;

                        if (!exists) {
                          return (
                            <button
                              key={bIdx}
                              onClick={() => addBeat('')}
                              className={cn(
                                "h-24 rounded-xl border border-dashed flex flex-col items-center justify-center transition-all opacity-40 hover:opacity-100",
                                resolvedTheme === 'dark' ? "border-white/10 hover:border-emerald-500 text-white/40" : "border-slate-300 hover:border-emerald-500 text-slate-400"
                              )}
                            >
                              <Plus className="w-4 h-4 mb-1" />
                              <span className="text-[8px] font-bold uppercase tracking-wider">Add Beat</span>
                            </button>
                          );
                        }

                        const isExplicit = chordSlot.name.trim() !== '';
                        const effective = getEffectiveChord(progression, globalBeatIndex);
                        const isSelected = selectedBeatIndex === globalBeatIndex;
                        const isCellPlaying = isPlaying && currentIndex === globalBeatIndex;
                        const targetChordName = isExplicit ? chordSlot.name : effective?.chord || '';
                        const chordTypeInfo = getChordTypeInfo(targetChordName);

                        return (
                          <div
                            key={chordSlot.id}
                            onClick={() => {
                              setSelectedBeatIndex(globalBeatIndex);
                              const playTarget = isExplicit ? chordSlot.name : effective?.chord;
                              if (playTarget) {
                                playChord(playTarget, selectedInstrument, accompanimentVolume);
                                setTrackedChord(playTarget);
                              }
                            }}
                            className={cn(
                              "relative group/cell h-24 rounded-xl flex flex-col justify-between p-2 transition-colors cursor-pointer overflow-hidden",
                              isCellPlaying
                                ? "bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-lg shadow-emerald-500/30 z-10 font-bold"
                                : isSelected
                                  ? cn(isExplicit ? chordTypeInfo.color : (resolvedTheme === 'dark' ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900"), "ring-2 ring-emerald-500 shadow-md z-10")
                                  : isExplicit
                                    ? cn(chordTypeInfo.color, "hover:brightness-110 shadow-sm")
                                    : (resolvedTheme === 'dark' ? "bg-black/20 text-white/40 hover:bg-black/30" : "bg-slate-100/60 text-slate-400 hover:bg-slate-100")
                            )}
                          >
                            {/* Cell Top Badge */}
                            <div className="flex items-center justify-between w-full">
                              <span className={cn(
                                "text-[8px] font-black font-mono tracking-wider px-1 py-0.2 rounded",
                                isCellPlaying
                                  ? "bg-white/20 text-white"
                                  : (resolvedTheme === 'dark' ? "bg-white/5 text-white/40" : "bg-black/5 text-slate-500")
                              )}>
                                b.{bIdx + 1}
                              </span>

                              <span className={cn(
                                "text-[7px] font-bold uppercase tracking-wider px-1 py-0.2 rounded",
                                isExplicit 
                                  ? (isCellPlaying ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10 opacity-80")
                                  : "opacity-40"
                              )}>
                                {isExplicit ? 'Change' : 'Sustain'}
                              </span>
                            </div>

                            {/* Center Chord Display */}
                            <div className="flex flex-col items-center justify-center my-0.5">
                              {isExplicit ? (
                                <span className="text-xl font-black font-mono tracking-tighter">{formatChordName(chordSlot.name)}</span>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span className="text-xs font-bold font-mono opacity-50 italic">
                                    {effective?.chord ? `(${formatChordName(effective.chord)})` : '—'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Bottom Action Bar on Cell Hover */}
                            <div className="flex items-center justify-between w-full opacity-0 group-hover/cell:opacity-100 transition-opacity">
                              <button
                                title="Insert empty beat before"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  insertBeat(globalBeatIndex, '');
                                }}
                                className="p-0.5 hover:bg-emerald-500/20 rounded text-emerald-500 transition-colors"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>

                              <button
                                title="Clear chord (keep beat empty)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearBeat(globalBeatIndex);
                                }}
                                className="p-0.5 hover:bg-amber-500/20 rounded text-amber-500 transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>

                              <button
                                title="Delete beat (shift left)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBeat(globalBeatIndex);
                                }}
                                className="p-0.5 hover:bg-red-500/20 rounded text-red-500 transition-colors"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Right Barline | or || */}
                      <div className="flex items-center justify-center pl-1 h-full min-h-[90px]">
                        <div className="flex gap-0.5">
                          <div className="w-1.5 h-16 bg-slate-700 dark:bg-slate-300 rounded-sm" />
                          {mIdx === totalMeasures - 1 && (
                            <div className="w-1.5 h-16 bg-slate-700 dark:bg-slate-300 rounded-sm" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Tabbed Panel: Chord Library / Chord Explorer / Presets */}
        <section className={cn(
          "lg:col-span-5 xl:col-span-4 w-full min-w-0 rounded-2xl border flex flex-col min-h-[580px] overflow-hidden transition-colors self-stretch",
          resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
        )}>
          {/* Tab Header Bar */}
          <div className="p-4 pb-0 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveRightTab('songs')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-wider transition-all border-b-2 shrink-0",
                  activeRightTab === 'songs'
                    ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                    : (resolvedTheme === 'dark' ? "border-transparent text-white/40 hover:text-white/70" : "border-transparent text-slate-400 hover:text-slate-700")
                )}
              >
                <Music className="w-3.5 h-3.5 text-emerald-500" />
                Song Library
              </button>

              <button
                onClick={() => setActiveRightTab('library')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-wider transition-all border-b-2 shrink-0",
                  activeRightTab === 'library'
                    ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                    : (resolvedTheme === 'dark' ? "border-transparent text-white/40 hover:text-white/70" : "border-transparent text-slate-400 hover:text-slate-700")
                )}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Chords
              </button>

              <button
                onClick={() => setActiveRightTab('explorer')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-wider transition-all border-b-2 shrink-0",
                  activeRightTab === 'explorer'
                    ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                    : (resolvedTheme === 'dark' ? "border-transparent text-white/40 hover:text-white/70" : "border-transparent text-slate-400 hover:text-slate-700")
                )}
              >
                <Compass className="w-3.5 h-3.5" />
                Explorer
              </button>

              <button
                onClick={() => setActiveRightTab('presets')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-wider transition-all border-b-2 shrink-0",
                  activeRightTab === 'presets'
                    ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                    : (resolvedTheme === 'dark' ? "border-transparent text-white/40 hover:text-white/70" : "border-transparent text-slate-400 hover:text-slate-700")
                )}
              >
                <ListMusic className="w-3.5 h-3.5" />
                Presets
              </button>
            </div>

            {/* Active Chord Badge */}
            <div className="text-[9px] font-mono font-black text-emerald-500 px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-1 shrink-0 min-w-[56px] text-center inline-block">
              {formatChordName(activeExplorerChord)}
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 p-4 flex flex-col overflow-y-auto min-h-0">
            {activeRightTab === 'songs' ? (
              <SongLibraryPanel />
            ) : activeRightTab === 'library' ? (
              <div className="flex flex-col gap-4 h-full">
                {/* Target Beat & Enharmonic Toggle Banner */}
                <div className="flex items-center justify-between text-[10px] font-bold flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 uppercase tracking-widest text-[9px]">Root Note:</span>
                    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-200/60 dark:bg-white/10 border border-slate-300 dark:border-white/10">
                      <button
                        onClick={() => {
                          setAccidentalMode('sharp');
                          if (selectedLibraryRoot.includes('b')) {
                            setSelectedLibraryRoot(toggleEnharmonicSpelling(selectedLibraryRoot));
                          }
                        }}
                        className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black transition-all",
                          accidentalMode === 'sharp'
                            ? "bg-emerald-500 text-white shadow-xs"
                            : "text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white"
                        )}
                        title="Display Sharp roots (#)"
                      >
                        ♯ Sharps
                      </button>
                      <button
                        onClick={() => {
                          setAccidentalMode('flat');
                          if (selectedLibraryRoot.includes('#')) {
                            setSelectedLibraryRoot(toggleEnharmonicSpelling(selectedLibraryRoot));
                          }
                        }}
                        className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black transition-all",
                          accidentalMode === 'flat'
                            ? "bg-emerald-500 text-white shadow-xs"
                            : "text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white"
                        )}
                        title="Display Flat roots (♭)"
                      >
                        ♭ Flats
                      </button>
                    </div>
                  </div>

                  <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {selectedBeatIndex !== null ? `Target Beat ${selectedBeatIndex + 1}` : 'Target: New Beat'}
                  </span>
                </div>

                {/* Root Note Selector Pills */}
                <div className={cn(
                  "grid grid-cols-6 gap-1 p-1.5 rounded-xl border transition-colors",
                  resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-black/5"
                )}>
                  {(accidentalMode === 'flat' ? CHORD_ROOTS_FLAT : CHORD_ROOTS_SHARP).map(root => (
                    <button
                      key={root}
                      onClick={() => setSelectedLibraryRoot(root)}
                      className={cn(
                        "py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-center",
                        selectedLibraryRoot === root 
                          ? (resolvedTheme === 'dark' ? "bg-white text-black shadow-md" : "bg-slate-900 text-white shadow-md")
                          : (resolvedTheme === 'dark' ? "text-white/40 hover:text-white" : "text-slate-500 hover:text-slate-900")
                      )}
                    >
                      {formatChordName(root)}
                    </button>
                  ))}
                </div>

                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Chord Types ({formatChordName(selectedLibraryRoot)}):
                </span>

                {/* Grid of Chords for Selected Root */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto pr-1">
                  {CHORD_TYPES.map(type => {
                    const chordName = `${selectedLibraryRoot}${type.suffix}`;
                    return (
                      <button 
                        key={type.label}
                        onClick={() => handleLibraryChordClick(chordName)}
                        className={cn(
                          "group flex flex-col items-center justify-center gap-1 p-3 rounded-xl transition-all active:scale-95 min-h-[72px] shadow-sm hover:brightness-105",
                          type.color
                        )}
                      >
                        <span className="text-lg font-black font-mono tracking-tighter">{formatChordName(chordName)}</span>
                        <span className="text-[7px] font-black uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity text-center">
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : activeRightTab === 'explorer' ? (
              <div className="flex-1 min-h-0">
                <ChordExplorer initialChord={activeExplorerChord} />
              </div>
            ) : (
              <div className="flex flex-col gap-3 h-full min-h-0">
                {/* Search & Filter Header */}
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")} />
                    <input 
                      type="text"
                      placeholder="Search presets (e.g., Tangos, Flamenco, Jazz, C7, Paco)..."
                      value={presetSearchQuery}
                      onChange={(e) => setPresetSearchQuery(e.target.value)}
                      className={cn(
                        "w-full pl-8 pr-8 py-1.5 rounded-xl border text-xs font-medium outline-none transition-all focus:border-emerald-500",
                        resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white placeholder:text-white/30" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                      )}
                    />
                    {presetSearchQuery && (
                      <button
                        onClick={() => setPresetSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-400 uppercase tracking-widest text-[9px]">Filter Time Sig:</span>
                    <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {[...userPresets, ...PROGRESSION_PRESETS].filter(p => {
                        const matchesTs = presetFilterTimeSig === 'ALL' 
                          ? true 
                          : presetFilterTimeSig === 'CUSTOM' 
                            ? p.isCustom 
                            : p.timeSignature === presetFilterTimeSig;
                        const query = presetSearchQuery.trim().toLowerCase();
                        if (!query) return matchesTs;
                        const matchName = p.name.toLowerCase().includes(query);
                        const matchGenre = p.genre.toLowerCase().includes(query);
                        const matchDesc = p.description.toLowerCase().includes(query);
                        const matchChords = p.chordsPerBeat.some(c => c.toLowerCase().includes(query));
                        return matchesTs && (matchName || matchGenre || matchDesc || matchChords);
                      }).length} Presets
                    </span>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className={cn(
                  "grid grid-cols-6 gap-1 p-1 rounded-xl border transition-colors",
                  resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-black/5"
                )}>
                  {['ALL', 'CUSTOM', '4/4', '3/4', '6/8', '5/4'].map(ts => (
                    <button
                      key={ts}
                      onClick={() => setPresetFilterTimeSig(ts)}
                      className={cn(
                        "py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all text-center",
                        presetFilterTimeSig === ts
                          ? (resolvedTheme === 'dark' ? "bg-white text-black shadow" : "bg-slate-900 text-white shadow")
                          : (resolvedTheme === 'dark' ? "text-white/40 hover:text-white" : "text-slate-500 hover:text-slate-900")
                      )}
                    >
                      {ts === 'CUSTOM' ? '★ Custom' : ts}
                    </button>
                  ))}
                </div>

                {/* List of Presets */}
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
                  {[...userPresets, ...PROGRESSION_PRESETS]
                    .filter(p => {
                      const matchesTs = presetFilterTimeSig === 'ALL' 
                        ? true 
                        : presetFilterTimeSig === 'CUSTOM' 
                          ? p.isCustom 
                          : p.timeSignature === presetFilterTimeSig;
                      const query = presetSearchQuery.trim().toLowerCase();
                      if (!query) return matchesTs;
                      const matchName = p.name.toLowerCase().includes(query);
                      const matchGenre = p.genre.toLowerCase().includes(query);
                      const matchDesc = p.description.toLowerCase().includes(query);
                      const matchChords = p.chordsPerBeat.some(c => c.toLowerCase().includes(query));
                      return matchesTs && (matchName || matchGenre || matchDesc || matchChords);
                    })
                    .map(preset => {
                      const explicitChords = preset.chordsPerBeat.filter(c => c.trim() !== '');
                      const uniqueExplicitChords = Array.from(new Set<string>(explicitChords));
                      const beatsPerMeasure = preset.timeSignature === '4/4' ? 4 : preset.timeSignature === '3/4' ? 3 : preset.timeSignature === '6/8' ? 6 : 5;
                      const totalMeasures = Math.ceil(preset.chordsPerBeat.length / beatsPerMeasure);

                      return (
                        <div
                          key={preset.id}
                          onClick={() => handleSelectPreset(preset)}
                          className={cn(
                            "group p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 relative overflow-hidden",
                            resolvedTheme === 'dark'
                              ? "bg-white/[0.03] border-white/10 hover:border-emerald-500/50 hover:bg-white/[0.06]"
                              : "bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md"
                          )}
                        >
                          {/* Top row: Title & Badges */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black tracking-tight group-hover:text-emerald-500 transition-colors">
                                  {preset.name}
                                </span>
                                {preset.isCustom && (
                                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
                                    ★ Custom
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-400 font-medium">
                                {preset.description}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                {preset.timeSignature}
                              </span>
                              <span className={cn(
                                "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                                resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/70" : "bg-slate-100 border-slate-200 text-slate-600"
                              )}>
                                {preset.genre}
                              </span>

                              {preset.isCustom && (
                                <button
                                  onClick={(e) => handleDeleteUserPreset(preset.id, e)}
                                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors ml-1"
                                  title="Delete custom preset"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Bottom row: Chords Sequence Preview */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-white/5 text-[9px]">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-mono text-slate-400 text-[8px] mr-0.5">Chords:</span>
                              {uniqueExplicitChords.slice(0, 6).map((c, i) => (
                                <span
                                  key={i}
                                  className="font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[8px]"
                                >
                                  {formatChordName(c)}
                                </span>
                              ))}
                              {uniqueExplicitChords.length > 6 && (
                                <span className="text-[8px] text-slate-400 font-mono">+{uniqueExplicitChords.length - 6} more</span>
                              )}
                            </div>

                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider shrink-0 ml-2">
                              {totalMeasures} {totalMeasures === 1 ? 'Bar' : 'Bars'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Save Custom Preset Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "w-full max-w-md rounded-2xl border p-6 flex flex-col gap-4 shadow-2xl relative",
              resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-black uppercase tracking-wider">Save Custom Preset</h3>
              </div>
              <button 
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomPreset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Preset Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Neo-Soul Groove in Eb"
                  value={presetNameInput}
                  onChange={(e) => setPresetNameInput(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-emerald-500",
                    resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Genre</label>
                  <select
                    value={presetGenreInput}
                    onChange={(e) => setPresetGenreInput(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-emerald-500 cursor-pointer",
                      resolvedTheme === 'dark' ? "bg-slate-800 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  >
                    {['Pop', 'Rock', 'Jazz', 'J-Pop', 'Bossa Nova', 'Blues', 'R&B', 'Acoustic', 'Custom'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Time Signature</label>
                  <div className={cn(
                    "w-full px-3 py-2 rounded-xl border text-xs font-bold font-mono opacity-80",
                    resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                  )}>
                    {activePattern?.timeSignature || '4/4'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Description (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. Smooth 7th chords with chromatic walkthrough"
                  value={presetDescInput}
                  onChange={(e) => setPresetDescInput(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-emerald-500",
                    resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              {/* Chords Sequence Preview */}
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <span className="text-[9px] font-bold uppercase text-slate-400">Progression Preview ({totalMeasures} {totalMeasures === 1 ? 'Bar' : 'Bars'})</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {progression.filter(p => p.name && p.name.trim() !== '').map((p, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-mono font-bold">
                      {formatChordName(p.name)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Save className="w-3.5 h-3.5" /> Save Preset
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
