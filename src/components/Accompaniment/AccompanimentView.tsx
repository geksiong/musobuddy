/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Play, Pause, Plus, Trash2, Guitar as GuitarIcon, Music, Layers, 
  Radio, ChevronDown, Volume2, X, RefreshCw, BookOpen, Compass, ListMusic, Sparkles,
  ArrowLeftRight, BookmarkPlus, Save, Hash, Search, Tag, LayoutGrid, Rows, Edit2, FileCode, Timer
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useMetronome } from '../../hooks/useMetronome.ts';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { useAccompaniment, getEffectiveChord } from '../../contexts/AccompanimentContext.tsx';
import { InstrumentType } from '../../types.ts';
import ChordExplorer from '../ChordExplorer/ChordExplorer.tsx';
import GrooveEnginePanel from './GrooveEnginePanel.tsx';
import SongLibraryPanel from './SongLibraryPanel.tsx';
import ChordProgressionsModal from './ChordProgressionsModal.tsx';
import ImportAbcChordsModal from './ImportAbcChordsModal.tsx';
import VoicingInspectorPanel, { VOICING_STYLES } from './VoicingInspectorPanel.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { 
  CHORD_ROOTS_SHARP, CHORD_ROOTS_FLAT, CHORD_TYPES, ARPEGGIO_PRESETS, ARPEGGIO_RATES,
  getChordTypeInfo, transposeChord, toggleEnharmonicSpelling, formatChordName 
} from './constants.ts';
import { 
  PROGRESSION_PRESETS, ProgressionPreset, getUserPresets, saveUserPreset, deleteUserPreset 
} from './progressionPresets.ts';
import { DEFAULT_PRESETS } from '../Metronome/constants.ts';
import { getSuggestedChords } from '../../lib/chordSuggestions.ts';

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
    measureLabels, setMeasureLabel, deleteMeasureLabel,
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
    setAccompanimentVolume,
    voicingStyle,
    setVoicingStyle,
    progressionVoicings,
    isCountInEnabled,
    setIsCountInEnabled,
    isCountingIn,
    countInBeat
  } = useAccompaniment();
  const { resolvedTheme } = useTheme();

  const [activeRightTab, setActiveRightTab] = useState<'library' | 'songs' | 'explorer'>('library');
  const [isChordModalOpen, setIsChordModalOpen] = useState(false);
  const [isImportAbcModalOpen, setIsImportAbcModalOpen] = useState(false);
  const [isVoicingInspectorOpen, setIsVoicingInspectorOpen] = useState(true);

  const handleLoadChordProgression = (
    chordsPerBeat: string[],
    timeSignature: '4/4' | '3/4' | '6/8' | '5/4',
    songBpm: number | undefined,
    mode: 'replace' | 'add',
    progressionName: string,
    shift: number
  ) => {
    const targetPattern = DEFAULT_PRESETS.find(p => p.timeSignature === timeSignature);
    if (targetPattern) {
      setActivePattern(targetPattern);
    }
    if (songBpm) {
      setBpm(songBpm);
    }

    if (mode === 'replace') {
      const newProg = chordsPerBeat.map((chordName, i) => ({
        id: `prog_beat_${Date.now()}_${i}`,
        name: chordName,
      }));
      setProgression(newProg);
      setSelectedBeatIndex(0);
    } else {
      const newSlots = chordsPerBeat.map((chordName, i) => ({
        id: `prog_beat_append_${Date.now()}_${i}`,
        name: chordName,
      }));
      setProgression([...progression, ...newSlots]);
    }

    const firstChord = chordsPerBeat.find(c => c && c.trim() !== '');
    if (firstChord) {
      playChord(firstChord, selectedInstrument, accompanimentVolume);
      setTrackedChord(firstChord);
    }

    setIsChordModalOpen(false);
  };

  // Compact layout and Section Label modal state
  const [gridColumns, setGridColumns] = useState<1 | 2>(2);
  const [editingMeasureIndex, setEditingMeasureIndex] = useState<number | null>(null);
  const [customLabelInput, setCustomLabelInput] = useState<string>('');

  // Enharmonic and Transposition state
  const [accidentalMode, setAccidentalMode] = useState<'sharp' | 'flat'>('sharp');
  const [transposeShift, setTransposeShift] = useState<number>(0);

  // User Custom Presets state
  const [userPresets, setUserPresets] = useState<ProgressionPreset[]>(() => getUserPresets());
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetGenreInput, setPresetGenreInput] = useState('Rock');
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
    setActiveRightTab('library');
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

  const handleSelectSuggestedChord = (chordName: string) => {
    if (selectedBeatIndex !== null && selectedBeatIndex < progression.length) {
      const nextProg = [...progression];
      nextProg[selectedBeatIndex] = { ...nextProg[selectedBeatIndex], name: chordName };
      setProgression(nextProg);
    } else {
      addBeat(chordName);
    }

    playChord(chordName, selectedInstrument, accompanimentVolume);
    setTrackedChord(chordName);
  };

  const selectedBeatSlot = selectedBeatIndex !== null ? progression[selectedBeatIndex] : null;
  const isSelectedBeatExplicit = !!(selectedBeatSlot && selectedBeatSlot.name.trim() !== '');

  const prevBeatChord = selectedBeatIndex !== null && selectedBeatIndex > 0 
    ? (progression[selectedBeatIndex - 1]?.name || getEffectiveChord(progression, selectedBeatIndex - 1)?.chord || null) 
    : null;

  const nextBeatChord = selectedBeatIndex !== null && selectedBeatIndex < progression.length - 1 
    ? (progression[selectedBeatIndex + 1]?.name || getEffectiveChord(progression, selectedBeatIndex + 1)?.chord || null) 
    : null;

  const suggestedChords = getSuggestedChords(
    isSelectedBeatExplicit ? selectedBeatSlot?.name : null,
    prevBeatChord,
    nextBeatChord,
    accidentalMode === 'flat'
  );

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
              {isCountingIn && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 font-extrabold text-[9px] uppercase tracking-wider animate-pulse">
                  <Timer className="w-2.5 h-2.5" />
                  <span>Count-In</span>
                </div>
              )}
              <div className="flex gap-1.5 items-center">
                {Array.from({ length: masterLength }).map((_, i) => {
                  const isCurrentBeat = isPlaying && (
                    isCountingIn 
                      ? (countInBeat - 1 === i)
                      : (currentIndex % masterLength === i)
                  );
                  const isCountInDot = isCountingIn && isCurrentBeat;
                  return (
                    <motion.div
                      key={i}
                      initial={false}
                      animate={{
                        scale: isCurrentBeat ? 1.3 : 1,
                        backgroundColor: isCountInDot ? '#F59E0B' : (isCurrentBeat ? '#10B981' : (resolvedTheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)')),
                        boxShadow: isCountInDot ? '0 0 8px rgba(245,158,11,0.8)' : (isCurrentBeat ? '0 0 8px rgba(16,185,129,0.7)' : 'none')
                      }}
                      className="w-2 h-2 rounded-full"
                    />
                  );
                })}
              </div>
              <span className={cn("text-[9px] font-mono font-bold ml-1.5 min-w-[70px] text-right inline-block", isCountingIn ? "text-amber-500 font-black" : (resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400"))}>
                {isCountingIn 
                  ? `Count ${countInBeat}/${masterLength}`
                  : (isPlaying ? `Beat ${(currentIndex % masterLength) + 1}/${masterLength}` : `${masterLength} Beats`)}
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
                  ? (isCountingIn ? "bg-amber-600 text-white shadow-amber-600/30 animate-pulse" : "bg-red-500 text-white shadow-red-500/20")
                  : (progression.length > 0 ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20" : (resolvedTheme === 'dark' ? "bg-white/10 text-white/20 cursor-not-allowed" : "bg-slate-200 text-slate-400 cursor-not-allowed"))
              )}
              disabled={progression.length === 0}
            >
              {isPendingStart ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Syncing...</span>
                </div>
              ) : isCountingIn ? (
                <div className="flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 animate-spin" />
                  <span>Count: {countInBeat}/{masterLength}</span>
                </div>
              ) : (
                <>
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? 'Stop' : 'Play'}</span>
                </>
              )}
            </button>

            {/* 1-Bar Count-In Toggle */}
            <button
              onClick={() => setIsCountInEnabled(!isCountInEnabled)}
              className={cn(
                "px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border shrink-0",
                isCountInEnabled 
                  ? "bg-amber-500/20 border-amber-500 text-amber-500" 
                  : resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
              title="Toggle 1-measure count-in clicks before accompaniment playback begins"
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Count-In</span>
              <div className={cn("w-1.5 h-1.5 rounded-full ml-0.5", isCountInEnabled ? "bg-amber-500 animate-pulse" : "bg-slate-400")} />
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

            {/* Keyboard Voicing Style Selector */}
            <div className="relative group shrink-0">
              <select
                value={voicingStyle}
                onChange={(e) => {
                  setVoicingStyle(e.target.value as any);
                  e.target.blur();
                }}
                className={cn(
                  "appearance-none border px-3 pr-8 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer outline-none focus:border-emerald-500/50",
                  resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-emerald-400 hover:text-emerald-300" : "bg-white border-slate-200 text-emerald-700 hover:bg-slate-100"
                )}
                title="Select keyboard chord voicing style (Smooth voice leading, Jazz drop-2, Pop open spread, etc.)"
              >
                {VOICING_STYLES.map(style => (
                  <option key={style.id} value={style.id} className={cn(resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>
                    Voicing: {style.shortLabel}
                  </option>
                ))}
              </select>
              <ChevronDown className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")} />
            </div>

            {/* Voicing Inspector Toggle Button */}
            <button
              onClick={() => setIsVoicingInspectorOpen(!isVoicingInspectorOpen)}
              className={cn(
                "px-2.5 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all border shrink-0",
                isVoicingInspectorOpen
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 dark:text-emerald-400"
                  : resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
              title="Toggle Piano Voicing Inspector & Voice-Leading Visualizer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Voice Leading</span>
            </button>

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

          {/* Piano Voicing & Voice Leading Inspector Panel */}
          {isVoicingInspectorOpen && (
            <div className="mb-4">
              <VoicingInspectorPanel />
            </div>
          )}

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

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImportAbcModalOpen(true)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-[9px] font-bold shadow-xs cursor-pointer",
                  resolvedTheme === 'dark' ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                )}
                title="Import chord progression from a loaded ABC score or chord sheet (overwrites progression)"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Import ABC score or chord sheet</span>
              </button>

              <button
                onClick={() => setIsSaveModalOpen(true)}
                disabled={progression.every(p => !p.name || p.name.trim() === '')}
                className={cn(
                  "px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-[9px] font-bold shadow-xs cursor-pointer",
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

              {/* Layout Mode Toggle: 2 Meas/Row vs 1 Meas/Row */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/20 ml-1">
                <button
                  onClick={() => setGridColumns(2)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-all",
                    gridColumns === 2
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                  title="2 measures per line (Compact mode for long songs)"
                >
                  <LayoutGrid className="w-3 h-3" /> 2 / Line
                </button>
                <button
                  onClick={() => setGridColumns(1)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 transition-all",
                    gridColumns === 1
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                  title="1 measure per line (Expanded view)"
                >
                  <Rows className="w-3 h-3" /> 1 / Line
                </button>
              </div>
            </div>
          </div>

          {/* Beat Grid Area - Supporting Compact 2-Measures-Per-Row */}
          <div className="w-full pb-2">
            <div className={cn(
              "grid gap-3 transition-all",
              gridColumns === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            )}>
              {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                const startBeatIndex = mIdx * masterLength;
                const isCurrentMeasure = isPlaying && Math.floor(currentIndex / masterLength) === mIdx;
                const currentLabel = measureLabels[mIdx];

                return (
                  <div 
                    key={mIdx}
                    className={cn(
                      "group/measure flex flex-col p-2.5 rounded-2xl border transition-all relative overflow-hidden",
                      isCurrentMeasure 
                        ? (resolvedTheme === 'dark' ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm shadow-emerald-500/10" : "bg-emerald-50/90 border-emerald-400 shadow-sm")
                        : (resolvedTheme === 'dark' ? "bg-white/[0.02] border-white/10 hover:border-white/20" : "bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-2xs")
                    )}
                  >
                    {/* Measure Card Top Bar: Measure number + Section Label Tag */}
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200 dark:border-white/10">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-[10px] font-black font-mono text-slate-500 dark:text-slate-400">
                          m.{mIdx + 1}
                        </span>

                        {isCountingIn && mIdx === 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1 border border-amber-500/30">
                            <Timer className="w-2.5 h-2.5" />
                            <span>Lead-in: Beat {countInBeat}/{masterLength}</span>
                          </span>
                        )}

                        {currentLabel ? (
                          <button
                            onClick={() => {
                              setEditingMeasureIndex(mIdx);
                              setCustomLabelInput(currentLabel);
                            }}
                            className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/25 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-2xs transition-all truncate"
                            title="Click to edit section label"
                          >
                            <Tag className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{currentLabel}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingMeasureIndex(mIdx);
                              setCustomLabelInput('');
                            }}
                            className="opacity-40 group-hover/measure:opacity-100 hover:opacity-100 px-1.5 py-0.5 rounded border border-dashed border-slate-300 dark:border-white/20 text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 text-[9px] font-medium transition-all flex items-center gap-1"
                            title="Add section label (e.g. Chorus 1, Verse 1, Bridge)"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Label</span>
                          </button>
                        )}
                      </div>

                      <div className="text-[8px] font-mono text-slate-400 uppercase tracking-wider pl-1">
                        {masterLength} Beats
                      </div>
                    </div>

                    {/* Beat Slots Grid for this Measure */}
                    <div 
                      className="grid gap-1.5 items-center w-full"
                      style={{ gridTemplateColumns: `repeat(${masterLength}, minmax(0, 1fr))` }}
                    >
                      {Array.from({ length: masterLength }).map((_, bIdx) => {
                        const globalBeatIndex = startBeatIndex + bIdx;
                        const chordSlot = progression[globalBeatIndex];
                        const exists = !!chordSlot;

                        if (!exists) {
                          return (
                            <button
                              key={bIdx}
                              onClick={() => {
                                addBeat('');
                                setSelectedBeatIndex(progression.length);
                              }}
                              className={cn(
                                "h-14 sm:h-16 rounded-xl border border-dashed flex flex-col items-center justify-center transition-all opacity-40 hover:opacity-100",
                                resolvedTheme === 'dark' ? "border-white/10 hover:border-emerald-500 text-white/40" : "border-slate-300 hover:border-emerald-500 text-slate-400"
                              )}
                            >
                              <Plus className="w-3.5 h-3.5 mb-0.5" />
                              <span className="text-[7px] font-bold uppercase tracking-wider">Add</span>
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
                              "relative group/cell h-14 sm:h-16 rounded-xl flex flex-col justify-between p-1.5 transition-all cursor-pointer overflow-hidden border",
                              isCellPlaying
                                ? "bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300 shadow-md z-10 font-bold scale-[1.02]"
                                : isSelected
                                  ? cn(isExplicit ? chordTypeInfo.color : (resolvedTheme === 'dark' ? "bg-white/10 text-white" : "bg-slate-100 text-slate-900"), "ring-2 ring-emerald-500 border-emerald-500 shadow-xs z-10")
                                  : isExplicit
                                    ? cn(chordTypeInfo.color, "hover:brightness-110 border-transparent shadow-2xs")
                                    : (resolvedTheme === 'dark' ? "bg-black/20 border-white/5 text-white/40 hover:bg-black/30" : "bg-slate-100/70 border-slate-200 text-slate-400 hover:bg-slate-100")
                            )}
                          >
                            {/* Cell Top Header */}
                            <div className="flex items-center justify-between w-full leading-none">
                              <span className={cn(
                                "text-[7px] font-black font-mono px-1 py-0.2 rounded",
                                isCellPlaying
                                  ? "bg-white/20 text-white"
                                  : (resolvedTheme === 'dark' ? "bg-white/5 text-white/40" : "bg-black/5 text-slate-500")
                              )}>
                                b.{bIdx + 1}
                              </span>

                              {progressionVoicings[globalBeatIndex] && targetChordName ? (
                                <span className={cn(
                                  "text-[6.5px] font-mono font-bold truncate max-w-[48px] px-0.5 rounded",
                                  isCellPlaying ? "bg-white/20 text-white" : (resolvedTheme === 'dark' ? "text-emerald-400/80" : "text-emerald-700/80")
                                )} title={progressionVoicings[globalBeatIndex]?.description}>
                                  {progressionVoicings[globalBeatIndex]?.inversionName}
                                </span>
                              ) : !isExplicit ? (
                                <span className="text-[6px] font-bold uppercase tracking-tight opacity-50">sus</span>
                              ) : null}
                            </div>

                            {/* Center Chord Name Display */}
                            <div className="flex flex-col items-center justify-center my-0.5 leading-none">
                              {isExplicit ? (
                                <span className="text-sm sm:text-base font-black font-mono tracking-tighter truncate max-w-full">
                                  {formatChordName(chordSlot.name)}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold font-mono opacity-50 italic truncate max-w-full">
                                  {effective?.chord ? `(${formatChordName(effective.chord)})` : '—'}
                                </span>
                              )}
                            </div>

                            {/* Cell Bottom Hover Quick Actions */}
                            <div className="flex items-center justify-between w-full opacity-0 group-hover/cell:opacity-100 transition-opacity leading-none">
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
                                title="Clear chord"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearBeat(globalBeatIndex);
                                }}
                                className="p-0.5 hover:bg-amber-500/20 rounded text-amber-500 transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>

                              <button
                                title="Delete beat"
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side Tabbed Panel: Chord Library / Chord Explorer / Presets */}
        <section className={cn(
          "lg:col-span-5 xl:col-span-4 w-full min-w-0 rounded-2xl border flex flex-col min-h-[580px] lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-5rem)] overflow-hidden transition-colors",
          resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
        )}>
          {/* Tab Header Bar */}
          <div className="p-4 pb-0 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveRightTab('library')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-wider transition-all border-b-2 shrink-0 cursor-pointer",
                  activeRightTab === 'library'
                    ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                    : (resolvedTheme === 'dark' ? "border-transparent text-white/40 hover:text-white/70" : "border-transparent text-slate-400 hover:text-slate-700")
                )}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Chords
              </button>

              <button
                onClick={() => setActiveRightTab('songs')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-wider transition-all border-b-2 shrink-0 cursor-pointer",
                  activeRightTab === 'songs'
                    ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                    : (resolvedTheme === 'dark' ? "border-transparent text-white/40 hover:text-white/70" : "border-transparent text-slate-400 hover:text-slate-700")
                )}
              >
                <Music className="w-3.5 h-3.5 text-emerald-500" />
                Song Library
              </button>

              <button
                onClick={() => setActiveRightTab('explorer')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-wider transition-all border-b-2 shrink-0 cursor-pointer",
                  activeRightTab === 'explorer'
                    ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                    : (resolvedTheme === 'dark' ? "border-transparent text-white/40 hover:text-white/70" : "border-transparent text-slate-400 hover:text-slate-700")
                )}
              >
                <Compass className="w-3.5 h-3.5" />
                Explorer
              </button>
            </div>

            {/* Active Chord Badge */}
            <div className="text-[9px] font-mono font-black text-emerald-500 px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-1 shrink-0 min-w-[56px] text-center inline-block">
              {formatChordName(activeExplorerChord)}
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 p-4 flex flex-col overflow-y-auto min-h-0">
            {activeRightTab === 'library' ? (
              <div className="flex flex-col gap-4 h-full">
                {/* Target Beat, Enharmonic Toggle & Chord Progressions Modal Trigger Banner */}
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
                          "px-2 py-0.5 rounded text-[8px] font-black transition-all cursor-pointer",
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
                          "px-2 py-0.5 rounded text-[8px] font-black transition-all cursor-pointer",
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsChordModalOpen(true)}
                      className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-xs border border-indigo-500 transition-all cursor-pointer active:scale-95 shrink-0"
                      title="Pick from common chord progressions and variations (J-Pop, Anime, Jazz, Rock, etc.)"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Chord Progressions</span>
                    </button>

                    <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                      {selectedBeatIndex !== null ? `Target Beat ${selectedBeatIndex + 1}` : 'Target: New Beat'}
                    </span>
                  </div>
                </div>

                {/* SUGGESTED ALTERNATIVE CHORDS SECTION */}
                <div className={cn(
                  "p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all shadow-xs shrink-0",
                  resolvedTheme === 'dark'
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                    : "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                        {isSelectedBeatExplicit
                          ? `Alternatives for ${formatChordName(selectedBeatSlot?.name || '')}`
                          : selectedBeatIndex !== null
                            ? `Suggested for Beat ${selectedBeatIndex + 1}`
                            : 'Suggested Chords'}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 shrink-0">
                      {suggestedChords.length} options
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto pr-0.5">
                    {suggestedChords.map((s) => {
                      const isCurrentSelected = isSelectedBeatExplicit && selectedBeatSlot?.name === s.chord;
                      return (
                        <button
                          key={`${s.chord}_${s.label}`}
                          onClick={() => handleSelectSuggestedChord(s.chord)}
                          className={cn(
                            "group flex flex-col p-1.5 rounded-lg border text-left transition-all active:scale-95 shadow-2xs cursor-pointer",
                            isCurrentSelected
                              ? "bg-emerald-500 text-white border-emerald-400 font-bold"
                              : resolvedTheme === 'dark'
                                ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-emerald-500/50"
                                : "bg-white border-slate-200 hover:bg-emerald-50 hover:border-emerald-400"
                          )}
                          title={`${s.chord}: ${s.reason}`}
                        >
                          <div className="flex items-center justify-between w-full leading-none mb-0.5">
                            <span className="text-xs font-black font-mono tracking-tight group-hover:text-emerald-500 dark:group-hover:text-emerald-400">
                              {formatChordName(s.chord)}
                            </span>
                            <span className={cn(
                              "text-[6.5px] font-extrabold uppercase tracking-wider px-1 py-0.2 rounded shrink-0 ml-1",
                              isCurrentSelected
                                ? "bg-white/20 text-white"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                            )}>
                              {s.label}
                            </span>
                          </div>
                          <span className="text-[7.5px] opacity-75 line-clamp-1 font-medium leading-tight">
                            {s.reason}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Root Note Selector Pills */}
                <div className={cn(
                  "grid grid-cols-6 sm:grid-cols-12 gap-1 p-1 rounded-xl border transition-colors",
                  resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-black/5"
                )}>
                  {(accidentalMode === 'flat' ? CHORD_ROOTS_FLAT : CHORD_ROOTS_SHARP).map(root => (
                    <button
                      key={root}
                      onClick={() => setSelectedLibraryRoot(root)}
                      className={cn(
                        "py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all text-center",
                        selectedLibraryRoot === root 
                          ? (resolvedTheme === 'dark' ? "bg-white text-black shadow-xs" : "bg-slate-900 text-white shadow-xs")
                          : (resolvedTheme === 'dark' ? "text-white/40 hover:text-white" : "text-slate-500 hover:text-slate-900")
                      )}
                    >
                      {formatChordName(root)}
                    </button>
                  ))}
                </div>

                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Chord Types ({formatChordName(selectedLibraryRoot)}):
                </span>

                {/* Grid of Chords for Selected Root */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 overflow-y-auto pr-1">
                  {CHORD_TYPES.map(type => {
                    const chordName = `${selectedLibraryRoot}${type.suffix}`;
                    return (
                      <button 
                        key={type.label}
                        onClick={() => handleLibraryChordClick(chordName)}
                        className={cn(
                          "group flex flex-col items-center justify-center gap-0.5 p-1.5 sm:p-2 rounded-lg transition-all active:scale-95 min-h-[46px] shadow-2xs hover:brightness-105 cursor-pointer",
                          type.color
                        )}
                      >
                        <span className="text-xs sm:text-sm font-black font-mono tracking-tighter leading-none">{formatChordName(chordName)}</span>
                        <span className="text-[6.5px] font-extrabold uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity text-center leading-tight truncate max-w-full px-0.5">
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : activeRightTab === 'songs' ? (
              <SongLibraryPanel />
            ) : (
              <div className="flex-1 min-h-0">
                <ChordExplorer initialChord={activeExplorerChord} />
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
                    {['Rock', 'Pop', 'Funk', 'Jazz', 'Latin', 'World', 'Flamenco', 'Custom'].map(g => (
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

      {/* Section Label Selection Modal */}
      {editingMeasureIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "w-full max-w-md p-6 rounded-3xl border shadow-2xl flex flex-col gap-4",
              resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Measure {editingMeasureIndex + 1} Section Label
                </h3>
              </div>
              <button
                onClick={() => setEditingMeasureIndex(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a quick section preset or enter custom label text (e.g. Chorus 1, Bridge, Guitar Solo):
            </p>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
              {[
                'Intro', 'Verse 1', 'Verse 2', 'Verse 3',
                'Pre-Chorus', 'Chorus 1', 'Chorus 2', 'Chorus 3',
                'Bridge', 'Solo', 'Guitar Solo', 'Outro',
                'A Section', 'B Section', 'Turnaround', 'Ending'
              ].map((label) => (
                <button
                  key={label}
                  onClick={() => {
                    setMeasureLabel(editingMeasureIndex, label);
                    setEditingMeasureIndex(null);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                    measureLabels[editingMeasureIndex] === label
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                      : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-indigo-500 hover:text-indigo-500"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customLabelInput.trim()) {
                  setMeasureLabel(editingMeasureIndex, customLabelInput.trim());
                } else {
                  deleteMeasureLabel(editingMeasureIndex);
                }
                setEditingMeasureIndex(null);
              }}
              className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-white/10"
            >
              <label className="text-[10px] font-bold uppercase text-slate-400">Custom Section Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Breakdown, Sax Solo..."
                  value={customLabelInput}
                  onChange={(e) => setCustomLabelInput(e.target.value)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-indigo-500",
                    resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shrink-0"
                >
                  Set
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10">
              {measureLabels[editingMeasureIndex] ? (
                <button
                  type="button"
                  onClick={() => {
                    deleteMeasureLabel(editingMeasureIndex);
                    setEditingMeasureIndex(null);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  Clear Label
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setEditingMeasureIndex(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Popular Chord Progressions Modal Window */}
      <ChordProgressionsModal
        isOpen={isChordModalOpen}
        onClose={() => setIsChordModalOpen(false)}
        onLoadProgression={handleLoadChordProgression}
        hasExistingChords={progression.some(p => p.name && p.name.trim() !== '')}
      />

      {/* Import Chords from ABC Score Modal */}
      <ImportAbcChordsModal
        isOpen={isImportAbcModalOpen}
        onClose={() => setIsImportAbcModalOpen(false)}
      />
    </div>
  );
}
