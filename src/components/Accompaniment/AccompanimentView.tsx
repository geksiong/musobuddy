/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Music, Layers, ChevronDown, X, RefreshCw, 
  BookOpen, Compass, Sparkles, ArrowLeftRight, BookmarkPlus, Save, Tag, Edit3, 
  FileCode, Disc, SlidersHorizontal, LocateFixed, PanelRightClose, PanelRightOpen,
  Play, Pause, Timer
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useMetronome } from '../../hooks/useMetronome.ts';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { useAccompaniment, getEffectiveChord } from '../../contexts/AccompanimentContext.tsx';
import ChordExplorer from '../ChordExplorer/ChordExplorer.tsx';
import SongLibraryPanel from './SongLibraryPanel.tsx';
import ChordProgressionsModal from './ChordProgressionsModal.tsx';
import ImportAbcChordsModal from './ImportAbcChordsModal.tsx';
import CompactPlaybackChart from './CompactPlaybackChart.tsx';
import QuickSongPickerModal from './QuickSongPickerModal.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { 
  CHORD_ROOTS_SHARP, CHORD_ROOTS_FLAT, CHORD_TYPES,
  formatChordName, toggleEnharmonicSpelling
} from './constants.ts';
import { 
  ProgressionPreset, getUserPresets, saveUserPreset
} from './progressionPresets.ts';
import { Song } from './songLibrary.ts';
import { GROOVE_PRESETS } from './grooveEngine.ts';
import { DEFAULT_PRESETS } from '../Metronome/constants.ts';
import { getSuggestedChords } from '../../lib/chordSuggestions.ts';

export default function AccompanimentView() {
  const { 
    progression, setProgression,
    measureLabels, setMeasureLabels, setMeasureLabel, deleteMeasureLabel,
    selectedBeatIndex, setSelectedBeatIndex,
    clearBeat, deleteBeat, insertBeat, addMeasure, clearAll,
    selectedInstrument,
    selectedLibraryRoot, setSelectedLibraryRoot,
    trackedChord, setTrackedChord,
    isPlaying, setIsPlaying,
    isPendingStart, isCountingIn, countInBeat,
    currentIndex,
    accompanimentVolume,
    progressionVoicings,
    setActiveGroovePattern,
    setIsGrooveEngineEnabled,
    isTrackMeasuresEnabled,
    setIsTrackMeasuresEnabled,
    isToolsDrawerOpen,
    setIsToolsDrawerOpen,
    activeToolsTab,
    setActiveToolsTab,
    currentSongTitle,
    setCurrentSongTitle,
    currentKey,
    setCurrentKey,
    transposeShift,
    setTransposeShift,
    handleTranspose,
    handleToggleProgressionEnharmonics,
    handleSelectDirectKey,
    isGrooveEngineOpen,
    setIsGrooveEngineOpen,
    isVoicingInspectorOpen,
    setIsVoicingInspectorOpen
  } = useAccompaniment();
  const { resolvedTheme } = useTheme();

  const [isChordModalOpen, setIsChordModalOpen] = useState(false);
  const [isImportAbcModalOpen, setIsImportAbcModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'compact' | 'editor'>('compact');
  const [isQuickPickerOpen, setIsQuickPickerOpen] = useState(false);

  // Section Label modal state
  const [editingMeasureIndex, setEditingMeasureIndex] = useState<number | null>(null);
  const [customLabelInput, setCustomLabelInput] = useState<string>('');

  // Enharmonic root display mode in chord library
  const [accidentalMode, setAccidentalMode] = useState<'sharp' | 'flat'>('sharp');

  // User Custom Presets state
  const [, setUserPresets] = useState<ProgressionPreset[]>(() => getUserPresets());
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetGenreInput, setPresetGenreInput] = useState('Rock');
  const [presetDescInput, setPresetDescInput] = useState('');

  const { activePattern, setActivePattern, setBpm } = useMetronome();
  const { playChord } = useAudio();

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

  // Preset Save handler
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
    setActiveToolsTab('library');
  };

  const handleSelectPreset = (preset: ProgressionPreset) => {
    const newProg = preset.chordsPerBeat.map((chordName, i) => ({
      id: `preset_beat_${Date.now()}_${i}`,
      name: chordName,
    }));
    setProgression(newProg);
    setSelectedBeatIndex(0);

    const targetPattern = DEFAULT_PRESETS.find(p => p.timeSignature === preset.timeSignature);
    if (targetPattern) {
      setActivePattern(targetPattern);
    }
    if (preset.bpm) {
      setBpm(preset.bpm);
    }

    const firstChord = preset.chordsPerBeat.find(c => c.trim() !== '');
    if (firstChord) {
      playChord(firstChord, selectedInstrument, accompanimentVolume);
      setTrackedChord(firstChord);
    }
  };

  // Load Song from Quick Picker
  const handleSelectSongFromQuickPicker = (song: Song) => {
    const newProg = song.chordsPerBeat.map((chordName, i) => ({
      id: `song_beat_${Date.now()}_${i}`,
      name: chordName,
    }));
    setProgression(newProg);
    setMeasureLabels(song.sectionLabels || {});
    setSelectedBeatIndex(0);

    const targetPattern = DEFAULT_PRESETS.find(p => p.timeSignature === song.timeSignature);
    if (targetPattern) {
      setActivePattern(targetPattern);
    }
    if (song.bpm) {
      setBpm(song.bpm);
    }

    const matchingGroove = GROOVE_PRESETS.find(g => g.id === song.grooveId);
    if (matchingGroove) {
      setActiveGroovePattern(matchingGroove);
      setIsGrooveEngineEnabled(true);
    }

    setCurrentSongTitle(song.title);
    const root = song.key.split(' ')[0] || 'C';
    setCurrentKey(root);
    setTransposeShift(0);

    const firstChord = song.chordsPerBeat.find(c => c && c.trim() !== '');
    if (firstChord) {
      playChord(firstChord, selectedInstrument, accompanimentVolume);
      setTrackedChord(firstChord);
    }
  };

  // Load Progression from Quick Picker
  const handleSelectProgressionFromQuickPicker = (prog: ProgressionPreset) => {
    handleSelectPreset(prog);
    setCurrentSongTitle(prog.name);
    setCurrentKey('C');
    setTransposeShift(0);
  };

  const handleLoadChordProgression = (
    chordsPerBeat: string[],
    timeSignature: '4/4' | '3/4' | '6/8' | '5/4',
    songBpm: number | undefined,
    mode: 'replace' | 'add',
    progressionName: string
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
      const newId = Math.random().toString(36).substr(2, 9);
      setProgression([...progression, { id: newId, name: chordName }]);
      setSelectedBeatIndex(progression.length);
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
      const newId = Math.random().toString(36).substr(2, 9);
      setProgression([...progression, { id: newId, name: chordName }]);
      setSelectedBeatIndex(progression.length);
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

  const suggestedChords = useMemo(() => getSuggestedChords(
    isSelectedBeatExplicit ? selectedBeatSlot?.name : null,
    prevBeatChord,
    nextBeatChord,
    accidentalMode === 'flat'
  ), [isSelectedBeatExplicit, selectedBeatSlot?.name, prevBeatChord, nextBeatChord, accidentalMode]);

  const activePlayChordInfo = getEffectiveChord(progression, currentIndex);
  const selectedBeatChordInfo = selectedBeatIndex !== null ? getEffectiveChord(progression, selectedBeatIndex) : null;
  const activeExplorerChord = trackedChord || (isPlaying && activePlayChordInfo?.chord) || selectedBeatChordInfo?.chord || 'C';

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto min-h-full flex flex-col gap-4 pb-20">
      {/* 1. CLEAN LEAD-SHEET HEADER */}
      <header className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all",
        resolvedTheme === 'dark' ? "bg-slate-900/60 border-white/10" : "bg-white border-slate-200/90 shadow-2xs"
      )}>
        {/* Left: Quick Play Transport & Song Title / Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              if (!isPlaying) setTrackedChord(null);
              setIsPlaying(!isPlaying);
            }}
            disabled={progression.length === 0}
            className={cn(
              "px-3 py-1.5 rounded-xl font-black uppercase tracking-wider text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0",
              isPlaying
                ? (isCountingIn ? "bg-amber-600 text-white animate-pulse" : "bg-red-500 text-white shadow-red-500/20")
                : (progression.length > 0 ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20" : "bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed")
            )}
            title={isPlaying ? "Stop Playback" : "Start Playback"}
          >
            {isPendingStart ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isCountingIn ? (
              <div className="flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 animate-spin" />
                <span className="font-mono">{countInBeat}</span>
              </div>
            ) : (
              <>
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Stop' : 'Play'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsQuickPickerOpen(true)}
            className="flex items-center gap-2 group cursor-pointer text-left min-w-0"
            title="Browse songs and chord progressions"
          >
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shrink-0">
              <Disc className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm md:text-base text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                  {currentSongTitle || 'Custom Progression'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <span>{totalMeasures} {totalMeasures === 1 ? 'bar' : 'bars'}</span>
                <span>·</span>
                <span>{timeSigLabel}</span>
              </div>
            </div>
          </button>
        </div>

        {/* Center: Key & Transposition Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs shrink-0">
          {/* Reset button placed on the left side of Key with stable layout */}
          <button
            onClick={() => handleTranspose(-transposeShift)}
            disabled={transposeShift === 0}
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-bold transition-all w-[58px] text-center truncate",
              transposeShift !== 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                : "invisible pointer-events-none select-none"
            )}
            title={transposeShift !== 0 ? `Reset transposition to original key (${transposeShift > 0 ? `+${transposeShift}` : transposeShift})` : undefined}
          >
            {transposeShift !== 0 ? `Reset (${transposeShift > 0 ? `+${transposeShift}` : transposeShift})` : 'Reset'}
          </button>

          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-0.5">Key</span>
          <select
            value={currentKey}
            onChange={(e) => handleSelectDirectKey(e.target.value)}
            className="w-14 px-1.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 cursor-pointer outline-none text-xs text-center"
            title="Select Progression Key"
          >
            {['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'].map((k) => (
              <option key={k} value={k}>
                {formatChordName(k)}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => handleTranspose(-1)}
              className="w-7 h-6 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-xs flex items-center justify-center"
              title="Transpose down 1 semitone (-1)"
            >
              -1
            </button>
            <button
              onClick={() => handleTranspose(1)}
              className="w-7 h-6 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-xs flex items-center justify-center"
              title="Transpose up 1 semitone (+1)"
            >
              +1
            </button>
          </div>

          <button
            onClick={handleToggleProgressionEnharmonics}
            className="px-2 py-0.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border-l border-slate-200 dark:border-white/10 text-xs"
            title="Toggle enharmonic spelling (♯ ↔ ♭)"
          >
            ♯/♭
          </button>
        </div>

        {/* Right: View Mode, Track Follower, Utilities & Integrated Drawer Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Segmented Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setViewMode('compact')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'compact'
                  ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Lead-Sheet</span>
            </button>

            <button
              onClick={() => setViewMode('editor')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === 'editor'
                  ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Grid Editor</span>
            </button>
          </div>

          {/* Follow Playback Toggle */}
          <button
            onClick={() => setIsTrackMeasuresEnabled(!isTrackMeasuresEnabled)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer",
              isTrackMeasuresEnabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
            )}
            title="Auto-scroll to follow playback"
          >
            <LocateFixed className={cn("w-3.5 h-3.5", isTrackMeasuresEnabled ? "text-emerald-500" : "text-slate-400")} />
            <span className="hidden sm:inline">Follow</span>
          </button>

          {/* Import ABC */}
          <button
            onClick={() => setIsImportAbcModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            title="Import chords from ABC notation score"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Import ABC</span>
          </button>

          {/* Save Preset */}
          <button
            onClick={() => setIsSaveModalOpen(true)}
            disabled={progression.every(p => !p.name || p.name.trim() === '')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all",
              progression.some(p => p.name && p.name.trim() !== '')
                ? "border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                : "opacity-40 cursor-not-allowed border-transparent text-slate-400"
            )}
            title="Save progression as a custom preset"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Sequencer Drawer Toggle */}
          <button
            onClick={() => {
              if (isGrooveEngineOpen) {
                setIsGrooveEngineOpen(false);
              } else {
                setIsGrooveEngineOpen(true);
                setIsVoicingInspectorOpen(false);
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer",
              isGrooveEngineOpen
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
            )}
            title={isGrooveEngineOpen ? "Close Groove Step Sequencer" : "Open 4-Track Groove Step Sequencer"}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Sequencer</span>
          </button>

          {/* Voicings Drawer Toggle */}
          <button
            onClick={() => {
              if (isVoicingInspectorOpen) {
                setIsVoicingInspectorOpen(false);
              } else {
                setIsVoicingInspectorOpen(true);
                setIsGrooveEngineOpen(false);
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer",
              isVoicingInspectorOpen
                ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
            )}
            title={isVoicingInspectorOpen ? "Close Voice Leading Visualizer" : "Open Piano Voice Leading Visualizer"}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Voicings</span>
          </button>

          {/* Accompaniment Tools Drawer Toggle (Synced with Dock) */}
          <button
            onClick={() => setIsToolsDrawerOpen(!isToolsDrawerOpen)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer",
              isToolsDrawerOpen
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
            )}
            title={isToolsDrawerOpen ? "Hide Chords & Tools Drawer" : "Show Chords & Tools Drawer"}
          >
            {isToolsDrawerOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            <span>Tools</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE: LEAD-SHEET CHART & ACCOMPANIMENT TOOLS DRAWER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        {/* Main Chart Canvas */}
        <main className={cn(
          isToolsDrawerOpen ? "lg:col-span-8" : "lg:col-span-12",
          "w-full transition-all min-w-0"
        )}>
          {viewMode === 'compact' ? (
            <CompactPlaybackChart
              masterLength={masterLength}
              timeSigLabel={timeSigLabel}
              onEditBeat={(beatIdx) => {
                setSelectedBeatIndex(beatIdx);
                if (!isToolsDrawerOpen) setIsToolsDrawerOpen(true);
              }}
              onOpenEditor={() => setViewMode('editor')}
              onOpenLabelModal={(mIdx) => {
                setEditingMeasureIndex(mIdx);
                setCustomLabelInput(measureLabels[mIdx] || '');
              }}
            />
          ) : (
            /* Mode 2: Streamlined Beat Grid Editor */
            <div className={cn(
              "rounded-2xl border p-4 flex flex-col gap-4 transition-all",
              resolvedTheme === 'dark' ? "bg-slate-900/60 border-white/10" : "bg-white border-slate-200/90 shadow-2xs"
            )}>
              {/* Editor Beat Controls Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-white/10 text-[11px] font-bold">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg border font-mono text-[10px]",
                    selectedBeatIndex !== null 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "opacity-40 border-slate-200 dark:border-white/10"
                  )}>
                    {selectedBeatIndex !== null 
                      ? `Selected: Beat ${selectedBeatIndex + 1} (m.${Math.floor(selectedBeatIndex / masterLength) + 1}, b.${(selectedBeatIndex % masterLength) + 1})`
                      : 'Click any beat cell to edit'}
                  </span>

                  {selectedBeatIndex !== null && progression[selectedBeatIndex]?.name && (
                    <button
                      onClick={handleSwapSelectedBeatEnharmonic}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-[10px] flex items-center gap-1 cursor-pointer"
                      title="Swap enharmonic spelling (e.g. C# ↔ Db)"
                    >
                      <ArrowLeftRight className="w-3 h-3 text-emerald-500" />
                      <span>♯/♭</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => selectedBeatIndex !== null && insertBeat(selectedBeatIndex, '')}
                    disabled={selectedBeatIndex === null}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer text-[10px] flex items-center gap-1"
                    title="Insert empty beat before selection"
                  >
                    <Plus className="w-3 h-3" /> Insert
                  </button>

                  <button
                    onClick={() => selectedBeatIndex !== null && clearBeat(selectedBeatIndex)}
                    disabled={selectedBeatIndex === null}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer text-[10px] flex items-center gap-1"
                    title="Clear chord from beat"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>

                  <button
                    onClick={() => selectedBeatIndex !== null && deleteBeat(selectedBeatIndex)}
                    disabled={selectedBeatIndex === null}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-red-500/10 hover:border-red-500/30 text-red-500 disabled:opacity-30 cursor-pointer text-[10px] flex items-center gap-1"
                    title="Delete beat"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>

                  <button
                    onClick={addMeasure}
                    className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer text-[10px] flex items-center gap-1"
                    title={`Add 1 measure (${masterLength} beats)`}
                  >
                    <Plus className="w-3 h-3" /> +1 Measure
                  </button>

                  <button
                    onClick={clearAll}
                    className="px-2 py-1 rounded-lg border border-transparent hover:bg-red-500/10 text-red-500 cursor-pointer text-[10px] flex items-center gap-1"
                    title="Clear all chords in progression"
                  >
                    <RefreshCw className="w-3 h-3" /> Clear All
                  </button>
                </div>
              </div>

              {/* Grid of Measures with Lead-sheet Bar Lines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                  const startBeatIndex = mIdx * masterLength;
                  const isCurrentMeasure = isPlaying && Math.floor(currentIndex / masterLength) === mIdx;
                  const currentLabel = measureLabels[mIdx];

                  return (
                    <div
                      key={mIdx}
                      className={cn(
                        "flex flex-col p-3 rounded-xl border transition-all",
                        isCurrentMeasure
                          ? "bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30"
                          : "border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/60 dark:border-white/10 text-[9px] font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400">m.{mIdx + 1}</span>
                          {currentLabel ? (
                            <button
                              onClick={() => {
                                setEditingMeasureIndex(mIdx);
                                setCustomLabelInput(currentLabel);
                              }}
                              className="px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-400 text-[8.5px] uppercase font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              <span>{currentLabel}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingMeasureIndex(mIdx);
                                setCustomLabelInput('');
                              }}
                              className="text-[8px] text-slate-400 hover:text-indigo-500 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" /> Label
                            </button>
                          )}
                        </div>
                        <span className="text-slate-400">{masterLength} beats</span>
                      </div>

                      <div 
                        className="grid gap-1.5 items-center w-full"
                        style={{ gridTemplateColumns: `repeat(${masterLength}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: masterLength }).map((_, bIdx) => {
                          const globalBeatIndex = startBeatIndex + bIdx;
                          const chordSlot = progression[globalBeatIndex];
                          const effective = getEffectiveChord(progression, globalBeatIndex);
                          const isSelected = selectedBeatIndex === globalBeatIndex;
                          const isCellPlaying = isPlaying && currentIndex === globalBeatIndex;

                          return (
                            <button
                              key={globalBeatIndex}
                              onClick={() => {
                                setSelectedBeatIndex(globalBeatIndex);
                                const playTarget = chordSlot?.name || effective?.chord;
                                if (playTarget) {
                                  playChord(playTarget, selectedInstrument, accompanimentVolume);
                                  setTrackedChord(playTarget);
                                }
                                if (!isToolsDrawerOpen) setIsToolsDrawerOpen(true);
                              }}
                              className={cn(
                                "flex flex-col justify-between h-14 p-1.5 rounded-lg border text-center transition-all cursor-pointer",
                                isCellPlaying
                                  ? "bg-emerald-600 text-white border-emerald-500 font-bold scale-[1.03]"
                                  : isSelected
                                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500 font-black"
                                    : chordSlot?.name
                                      ? "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-emerald-500/40 text-slate-900 dark:text-white"
                                      : "border-dashed border-slate-200 dark:border-white/10 text-slate-400 hover:border-slate-300"
                              )}
                            >
                              <div className="flex items-center justify-between w-full text-[8px] font-mono opacity-60">
                                <span>b.{bIdx + 1}</span>
                                {progressionVoicings[globalBeatIndex]?.inversionName && (
                                  <span className="truncate max-w-[40px] text-[7px] text-emerald-600 dark:text-emerald-400">
                                    {progressionVoicings[globalBeatIndex]?.inversionName}
                                  </span>
                                )}
                              </div>
                              <div className="font-mono font-black text-xs md:text-sm truncate w-full">
                                {chordSlot?.name ? formatChordName(chordSlot.name) : (effective?.chord ? `(${formatChordName(effective.chord)})` : '—')}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* Right Side Drawer: Chords Palette, Song Library, Chord Explorer */}
        {isToolsDrawerOpen && (
          <aside className={cn(
            "lg:col-span-4 w-full rounded-2xl border flex flex-col min-h-[500px] overflow-hidden transition-all",
            resolvedTheme === 'dark' ? "bg-slate-900/60 border-white/10" : "bg-white border-slate-200/90 shadow-2xs"
          )}>
            {/* Drawer Tab Headers */}
            <div className="flex items-center justify-between px-3 pt-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveToolsTab('library')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-[11px] font-bold border-b-2 transition-all cursor-pointer",
                    activeToolsTab === 'library'
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Chords</span>
                </button>

                <button
                  onClick={() => setActiveToolsTab('songs')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-[11px] font-bold border-b-2 transition-all cursor-pointer",
                    activeToolsTab === 'songs'
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  )}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Repertoire</span>
                </button>

                <button
                  onClick={() => setActiveToolsTab('explorer')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-[11px] font-bold border-b-2 transition-all cursor-pointer",
                    activeToolsTab === 'explorer'
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  )}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Voicings</span>
                </button>
              </div>

              {/* Close Drawer Button */}
              <button
                onClick={() => setIsToolsDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                title="Collapse Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Tab Content */}
            <div className="p-4 flex-1 flex flex-col overflow-y-auto">
              {activeToolsTab === 'library' ? (
                <div className="flex flex-col gap-4">
                  {/* Target Beat Header & Presets Trigger */}
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                      {selectedBeatIndex !== null ? `Target Beat ${selectedBeatIndex + 1}` : 'Target: Append Beat'}
                    </span>

                    <button
                      onClick={() => setIsChordModalOpen(true)}
                      className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Progressions</span>
                    </button>
                  </div>

                  {/* Harmonic Suggestions for Selected Beat */}
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Suggested Substitutions</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{suggestedChords.length} options</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                      {suggestedChords.map(s => (
                        <button
                          key={`${s.chord}_${s.label}`}
                          onClick={() => handleSelectSuggestedChord(s.chord)}
                          className="flex flex-col p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 hover:border-emerald-500 text-left transition-all cursor-pointer shadow-2xs"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                              {formatChordName(s.chord)}
                            </span>
                            <span className="text-[7px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                              {s.label}
                            </span>
                          </div>
                          <span className="text-[8px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {s.reason}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Root Key Palette with Enharmonic Toggle */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px]">Root Note</span>
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          onClick={() => {
                            setAccidentalMode('sharp');
                            if (selectedLibraryRoot.includes('b')) {
                              setSelectedLibraryRoot(toggleEnharmonicSpelling(selectedLibraryRoot));
                            }
                          }}
                          className={cn("px-1.5 py-0.5 rounded cursor-pointer", accidentalMode === 'sharp' ? "bg-slate-200 dark:bg-white/20 font-bold" : "text-slate-400")}
                        >
                          ♯
                        </button>
                        <button
                          onClick={() => {
                            setAccidentalMode('flat');
                            if (selectedLibraryRoot.includes('#')) {
                              setSelectedLibraryRoot(toggleEnharmonicSpelling(selectedLibraryRoot));
                            }
                          }}
                          className={cn("px-1.5 py-0.5 rounded cursor-pointer", accidentalMode === 'flat' ? "bg-slate-200 dark:bg-white/20 font-bold" : "text-slate-400")}
                        >
                          ♭
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-6 gap-1">
                      {(accidentalMode === 'flat' ? CHORD_ROOTS_FLAT : CHORD_ROOTS_SHARP).map(root => (
                        <button
                          key={root}
                          onClick={() => setSelectedLibraryRoot(root)}
                          className={cn(
                            "py-1.5 rounded-lg text-xs font-mono font-bold transition-all text-center cursor-pointer",
                            selectedLibraryRoot === root 
                              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10"
                          )}
                        >
                          {formatChordName(root)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chord Quality / Type Grid */}
                  <div className="flex flex-col gap-2">
                    <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                      Chord Types ({formatChordName(selectedLibraryRoot)})
                    </span>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                      {CHORD_TYPES.map(type => {
                        const chordName = `${selectedLibraryRoot}${type.suffix}`;
                        return (
                          <button
                            key={type.label}
                            onClick={() => handleLibraryChordClick(chordName)}
                            className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-emerald-500 hover:bg-emerald-500/10 text-slate-900 dark:text-white transition-all cursor-pointer"
                          >
                            <span className="text-xs font-mono font-black">{formatChordName(chordName)}</span>
                            <span className="text-[7.5px] text-slate-400 truncate max-w-full">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : activeToolsTab === 'songs' ? (
                <SongLibraryPanel />
              ) : (
                <div className="flex-1 min-h-0">
                  <ChordExplorer initialChord={activeExplorerChord} />
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 4. MODALS & OVERLAYS */}

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
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors cursor-pointer"
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
                  placeholder="e.g. Smooth 7th chords with chromatic turnaround"
                  value={presetDescInput}
                  onChange={(e) => setPresetDescInput(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-emerald-500",
                    resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Save Preset
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Section Rehearsal Label Selection Modal */}
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a rehearsal mark or enter custom label text (e.g. Intro, Chorus 1, Bridge, Solo):
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
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer",
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
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shrink-0 cursor-pointer"
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
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  Clear Label
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setEditingMeasureIndex(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
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

      {/* Quick Song & Progression Picker Modal */}
      <QuickSongPickerModal
        isOpen={isQuickPickerOpen}
        onClose={() => setIsQuickPickerOpen(false)}
        onSelectSong={handleSelectSongFromQuickPicker}
        onSelectProgression={handleSelectProgressionFromQuickPicker}
        currentTitle={currentSongTitle}
      />
    </div>
  );
}
