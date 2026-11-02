import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, Play, Volume2, VolumeX, Plus, Trash2, BookmarkPlus,
  Flame, Zap, Sliders, ChevronDown, Check, Info, Layers, RefreshCw,
  Music, Disc, SlidersHorizontal, Eye
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useAccompaniment } from '../../contexts/AccompanimentContext.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import {
  GROOVE_PRESETS,
  ChordTriggerType,
  BassTriggerType,
  SynthTriggerType,
  GroovePatternPreset,
  GrooveGenre
} from './grooveEngine.ts';
import {
  PERCUSSION_SOUNDS,
  DRUM_SETS,
  getDrumSetInfo,
  BASS_INSTRUMENTS,
  RHYTHM_INSTRUMENTS,
  SYNTH_INSTRUMENTS
} from './instrumentCatalog.ts';

const CHORD_TRIGGER_LABELS: { type: ChordTriggerType; label: string; color: string; desc: string }[] = [
  { type: 'OFF', label: 'OFF', color: 'bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold', desc: 'Silent step' },
  { type: 'CHORD', label: 'Hit', color: 'bg-emerald-500 text-white', desc: 'Standard chord hit' },
  { type: 'CHORD_ACCENT', label: 'ACC', color: 'bg-emerald-600 text-white font-black ring-1 ring-emerald-300', desc: 'Accented chord hit' },
  { type: 'PUSH_NEXT_CHORD', label: 'Push Next', color: 'bg-amber-500 text-white font-extrabold', desc: 'Syncopated early chord anticipation' },
  { type: 'PUSH_NEXT_ACCENT', label: 'Push ACC', color: 'bg-amber-600 text-white font-black ring-1 ring-amber-300', desc: 'Accented early chord push' },
  { type: 'ROOT', label: 'Root', color: 'bg-teal-500 text-white', desc: 'Single root note hit' },
  { type: 'PUSH_NEXT_ROOT', label: 'Push Root', color: 'bg-orange-500 text-white', desc: 'Early root note push' },
];

const BASS_TRIGGER_LABELS: { type: BassTriggerType; label: string; color: string; desc: string }[] = [
  { type: 'OFF', label: 'OFF', color: 'bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold', desc: 'Silent bass step' },
  { type: 'ROOT', label: 'Root', color: 'bg-blue-500 text-white', desc: 'Bass root note' },
  { type: 'ROOT_ACCENT', label: 'Root ACC', color: 'bg-blue-600 text-white font-black', desc: 'Accented bass root' },
  { type: 'FIFTH', label: '5th', color: 'bg-indigo-500 text-white', desc: 'Bass fifth note' },
  { type: 'PUSH_NEXT_ROOT', label: 'Push Root', color: 'bg-amber-500 text-white font-extrabold', desc: 'Early bass root' },
  { type: 'PUSH_NEXT_FIFTH', label: 'Push 5th', color: 'bg-amber-600 text-white font-extrabold', desc: 'Early bass fifth' },
  { type: 'WALKING', label: 'Walk', color: 'bg-purple-500 text-white', desc: 'Walking chromatic approach' },
];

const SYNTH_TRIGGER_LABELS: { type: SynthTriggerType; label: string; color: string; desc: string }[] = [
  { type: 'OFF', label: 'OFF', color: 'bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold', desc: 'Silent synth step' },
  { type: 'PAD', label: 'Pad', color: 'bg-fuchsia-600 text-white font-bold', desc: 'Sustained chord pad swell' },
  { type: 'LEAD_ROOT', label: 'Lead', color: 'bg-violet-500 text-white font-bold', desc: 'Melodic lead on chord root' },
  { type: 'LEAD_ACCENT', label: 'Lead !', color: 'bg-violet-600 text-white font-black ring-1 ring-violet-300', desc: 'Accented lead melody hit' },
  { type: 'LEAD_FIFTH', label: '5th', color: 'bg-pink-500 text-white font-bold', desc: 'Harmonic fifth lead' },
  { type: 'LEAD_OCTAVE', label: '8va', color: 'bg-rose-500 text-white font-bold', desc: 'High octave bell/lead' },
  { type: 'PUSH_NEXT_LEAD', label: 'Push ➜', color: 'bg-amber-500 text-white font-black animate-pulse', desc: 'Syncopated lead push into next root' },
  { type: 'ARP_FLOURISH', label: 'Arp', color: 'bg-cyan-500 text-white font-bold', desc: 'Arpeggiated melodic flourish' },
];

export default function GrooveEnginePanel() {
  const {
    isGrooveEngineEnabled, setIsGrooveEngineEnabled,
    activeGroovePattern, setActiveGroovePattern,
    customGroovePresets, saveCustomPreset, deleteCustomPreset,
    updateActiveGroovePatternStep, updatePercussionLayerProps,
    addPercussionLayer, removePercussionLayer,
    currentSubStepIndex, earlyPushEvent, isPlaying,
    selectedRhythmInstrument, setSelectedRhythmInstrument,
    selectedBassInstrument, setSelectedBassInstrument,
    selectedSynthInstrument, setSelectedSynthInstrument,
    selectedDrumSet, setSelectedDrumSet,
    trackVolumes, setTrackVolume,
    trackMutes, setTrackMute,
    trackSolos, toggleTrackSolo, clearAllSolos, isAnyTrackSoloed,
    togglePercussionLayerSolo
  } = useAccompaniment();
  const { resolvedTheme } = useTheme();

  const [selectedGenre, setSelectedGenre] = useState<string>('ALL');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetGenre, setNewPresetGenre] = useState<GrooveGenre>('Rock');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [showMixer, setShowMixer] = useState(true);

  const genres = ['ALL', 'Rock', 'Pop', 'Funk', 'Jazz', 'Latin', 'World', 'Flamenco', 'CUSTOM'];

  const allPresets = [...GROOVE_PRESETS, ...customGroovePresets];

  const filteredPresets = allPresets.filter(preset => {
    if (selectedGenre === 'ALL') return true;
    if (selectedGenre === 'CUSTOM') return customGroovePresets.some(c => c.id === preset.id);
    return preset.genre === selectedGenre;
  });

  // Ensure active preset is visible in the grid when changed externally
  useEffect(() => {
    if (activeGroovePattern && selectedGenre !== 'ALL') {
      const isCustom = customGroovePresets.some(c => c.id === activeGroovePattern.id);
      if (isCustom && selectedGenre !== 'CUSTOM') {
        setSelectedGenre('CUSTOM');
      } else if (!isCustom && activeGroovePattern.genre && activeGroovePattern.genre !== selectedGenre) {
        setSelectedGenre('ALL');
      }
    }
  }, [activeGroovePattern?.id]);

  const subsPerBeat = activeGroovePattern?.subdivisionsPerBeat || 2;
  const totalSteps = activeGroovePattern?.chordPattern?.length || 8;
  const masterBeats = totalSteps / subsPerBeat;

  const handleCycleChordStep = (stepIdx: number) => {
    if (!activeGroovePattern) return;
    const current = activeGroovePattern.chordPattern[stepIdx];
    const order: ChordTriggerType[] = ['OFF', 'CHORD', 'CHORD_ACCENT', 'PUSH_NEXT_CHORD', 'PUSH_NEXT_ACCENT', 'ROOT', 'PUSH_NEXT_ROOT'];
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    updateActiveGroovePatternStep('chord', stepIdx, order[nextIndex]);
  };

  const handleCycleBassStep = (stepIdx: number) => {
    if (!activeGroovePattern) return;
    const current = activeGroovePattern.bassPattern[stepIdx];
    const order: BassTriggerType[] = ['OFF', 'ROOT', 'ROOT_ACCENT', 'FIFTH', 'PUSH_NEXT_ROOT', 'PUSH_NEXT_FIFTH', 'WALKING'];
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    updateActiveGroovePatternStep('bass', stepIdx, order[nextIndex]);
  };

  const handleCycleSynthStep = (stepIdx: number) => {
    if (!activeGroovePattern) return;
    const current = (activeGroovePattern.synthPattern && activeGroovePattern.synthPattern[stepIdx]) || 'OFF';
    const order: SynthTriggerType[] = ['OFF', 'PAD', 'LEAD_ROOT', 'LEAD_ACCENT', 'LEAD_FIFTH', 'LEAD_OCTAVE', 'PUSH_NEXT_LEAD', 'ARP_FLOURISH'];
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    updateActiveGroovePatternStep('synth', stepIdx, order[nextIndex]);
  };

  const handleCyclePercussionStep = (layerId: string, stepIdx: number) => {
    if (!activeGroovePattern) return;
    const layer = activeGroovePattern.percussionLayers.find(l => l.id === layerId);
    if (!layer) return;
    const current = layer.pattern[stepIdx];
    const nextVal = current === 0 ? 1 : current === 1 ? 2 : 0;
    updateActiveGroovePatternStep('percussion', stepIdx, nextVal, layerId);
  };

  const handleSaveCurrentAsPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim() || !activeGroovePattern) return;

    const newPreset: GroovePatternPreset = {
      ...activeGroovePattern,
      id: `custom_groove_${Date.now()}`,
      name: newPresetName.trim(),
      genre: newPresetGenre,
      description: newPresetDesc.trim() || 'Custom syncopated 4-track groove',
      rhythmInstrument: selectedRhythmInstrument,
      bassInstrument: selectedBassInstrument,
      synthInstrument: selectedSynthInstrument,
    };

    saveCustomPreset(newPreset);
    setIsSaveModalOpen(false);
    setNewPresetName('');
    setNewPresetDesc('');
    setSelectedGenre('CUSTOM');
  };

  return (
    <div className={cn(
      "w-full rounded-2xl border p-4 md:p-5 flex flex-col gap-4 transition-colors relative overflow-hidden",
      resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
    )}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
              4-Track Groove & Instrument Engine
            </h3>
          </div>

          <label className="flex items-center gap-2 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={isGrooveEngineEnabled}
              onChange={(e) => setIsGrooveEngineEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-slate-300 dark:bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500 relative" />
            <span className="text-[10px] font-extrabold uppercase text-emerald-500">
              {isGrooveEngineEnabled ? 'Active' : 'Standard Mode'}
            </span>
          </label>
        </div>

        {/* Syncopation Status / Push Alert Banner */}
        <div className="h-6 flex items-center justify-end">
          <AnimatePresence mode="wait">
            {isPlaying && earlyPushEvent ? (
              <motion.div
                key="early-push-badge"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] tracking-wide shadow-xs animate-bounce"
              >
                <Flame className="w-3 h-3 fill-slate-950" />
                <span>ANTICIPATION PUSH: Beat {earlyPushEvent.sourceBeat} ➜ {earlyPushEvent.pushedChord}</span>
              </motion.div>
            ) : (
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                <span className="hidden sm:inline">4 Tracks:</span>
                <span className="text-emerald-500 font-bold">Rhythm</span>
                <span>•</span>
                <span className="text-blue-500 font-bold">Bass</span>
                <span>•</span>
                <span className="text-purple-500 font-bold">Synth</span>
                <span>•</span>
                <span className="text-amber-500 font-bold">Percussion</span>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Preset Picker & Genre Filter */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Genre Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full text-[10px] font-extrabold scrollbar-none">
            {genres.map(genre => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all whitespace-nowrap",
                  selectedGenre === genre
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5"
                )}
              >
                {genre}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeGroovePattern && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold shrink-0">
                <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px]">Active:</span>
                <span className="font-black truncate max-w-[130px]">{activeGroovePattern.name}</span>
                <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500 text-white font-mono uppercase">{activeGroovePattern.genre}</span>
              </div>
            )}

            {isAnyTrackSoloed && (
              <button
                onClick={clearAllSolos}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1.5 hover:bg-amber-400 transition-all shadow-xs animate-pulse cursor-pointer shrink-0"
                title="Click to clear all track solos"
              >
                <span>Solo Active</span>
                <span className="text-[9px] bg-slate-950 text-amber-400 px-1 py-0.2 rounded font-mono">Reset</span>
              </button>
            )}

            <button
              onClick={() => setShowMixer(!showMixer)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 transition-colors border",
                showMixer 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                  : "text-slate-500 border-slate-300 dark:border-white/10 hover:bg-slate-200/50 dark:hover:bg-white/5"
              )}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Track Mixer</span>
            </button>

            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors flex items-center gap-1 border border-emerald-500/30"
              title="Save current 4-track groove pattern as a custom preset"
            >
              <BookmarkPlus className="w-3 h-3" />
              <span>Save Preset</span>
            </button>
          </div>
        </div>

        {/* Preset Selector Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredPresets.map(preset => {
            const isSelected = activeGroovePattern?.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setActiveGroovePattern(preset);
                  setIsGrooveEngineEnabled(true);
                }}
                className={cn(
                  "text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 relative group shadow-2xs cursor-pointer",
                  isSelected
                    ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40 shadow-xs"
                    : "border-slate-300 dark:border-white/15 hover:border-emerald-400 dark:hover:border-white/30 bg-white dark:bg-white/[0.04]"
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                      {preset.name}
                    </span>
                    {preset.hasEarlyPush && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-0.5 shrink-0">
                        <Flame className="w-2.5 h-2.5" /> Push
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-mono font-extrabold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 uppercase shrink-0">
                    {preset.timeSignature} • {preset.defaultBpm} BPM
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-1 font-medium">
                  {preset.description}
                </p>
                {preset.isUserPreset && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCustomPreset(preset.id);
                    }}
                    className="absolute bottom-2 right-2 text-rose-500 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-opacity p-1 cursor-pointer"
                    title="Delete custom preset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TRACK MIXER & INSTRUMENT PALETTES */}
      <AnimatePresence>
        {showMixer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-slate-300 dark:border-white/15 p-3.5 bg-white dark:bg-black/40 shadow-xs flex flex-col gap-3"
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-white/10">
              <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                Track Instruments & Mixer
              </span>
              <div className="flex items-center gap-2">
                {isAnyTrackSoloed && (
                  <button
                    onClick={clearAllSolos}
                    className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Clear all active solos"
                  >
                    Clear All Solos
                  </button>
                )}
                <span className="text-[9px] text-slate-600 dark:text-slate-400 font-bold hidden sm:inline">
                  Solo (S), Mute (M), volumes, and physical models
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. RHYTHM / HARMONY TRACK */}
              <div className={cn(
                "flex flex-col gap-2 p-2.5 rounded-xl border shadow-2xs min-w-0 overflow-hidden transition-all",
                trackSolos.rhythm 
                  ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30" 
                  : isAnyTrackSoloed && !trackSolos.rhythm
                    ? "opacity-50 bg-slate-100/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5"
                    : "bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                    <span className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-400 truncate">Rhythm / Chords</span>
                    {isAnyTrackSoloed && !trackSolos.rhythm && (
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-500 shrink-0">Solo Muted</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleTrackSolo('rhythm')}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[9px] font-black font-mono transition-all uppercase cursor-pointer border",
                        trackSolos.rhythm
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-1 ring-amber-300"
                          : "text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/15 hover:border-amber-500/50 hover:text-amber-500 hover:bg-amber-500/10"
                      )}
                      title={trackSolos.rhythm ? "Deactivate Solo (Rhythm Track)" : "Solo Rhythm Track (Isolate instrument)"}
                    >
                      SOLO
                    </button>
                    <button
                      onClick={() => setTrackMute('rhythm', !trackMutes.rhythm)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors text-xs font-bold cursor-pointer border",
                        trackMutes.rhythm ? "text-rose-600 bg-rose-500/15 border-rose-500/30" : "text-emerald-600 border-slate-300 dark:border-white/15 hover:bg-emerald-500/15"
                      )}
                      title={trackMutes.rhythm ? "Unmute Rhythm Track" : "Mute Rhythm Track"}
                    >
                      {trackMutes.rhythm ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-700 dark:text-slate-300">Instrument</label>
                  <select
                    value={selectedRhythmInstrument}
                    onChange={(e) => setSelectedRhythmInstrument(e.target.value)}
                    className="text-[11px] font-bold p-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer border border-slate-300 dark:border-white/15 shadow-2xs truncate"
                  >
                    {RHYTHM_INSTRUMENTS.map(inst => (
                      <option key={inst.id} value={inst.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white font-bold">
                        {inst.name} ({inst.badge})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1 min-w-0 w-full overflow-hidden">
                  <span className="text-[9px] font-mono font-extrabold text-slate-700 dark:text-slate-300 w-7 shrink-0">Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={trackVolumes.rhythm}
                    onChange={(e) => setTrackVolume('rhythm', parseFloat(e.target.value))}
                    className="w-full min-w-0 flex-1 accent-emerald-500 h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg cursor-pointer"
                  />
                  <span className="text-[9px] font-mono font-extrabold text-slate-900 dark:text-slate-100 w-9 text-right shrink-0">
                    {Math.round(trackVolumes.rhythm * 100)}%
                  </span>
                </div>
              </div>

              {/* 2. BASS TRACK */}
              <div className={cn(
                "flex flex-col gap-2 p-2.5 rounded-xl border shadow-2xs min-w-0 overflow-hidden transition-all",
                trackSolos.bass 
                  ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30" 
                  : isAnyTrackSoloed && !trackSolos.bass
                    ? "opacity-50 bg-slate-100/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5"
                    : "bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shrink-0" />
                    <span className="text-[11px] font-black uppercase text-blue-800 dark:text-blue-400 truncate">Bass Track</span>
                    {isAnyTrackSoloed && !trackSolos.bass && (
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-500 shrink-0">Solo Muted</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleTrackSolo('bass')}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[9px] font-black font-mono transition-all uppercase cursor-pointer border",
                        trackSolos.bass
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-1 ring-amber-300"
                          : "text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/15 hover:border-amber-500/50 hover:text-amber-500 hover:bg-amber-500/10"
                      )}
                      title={trackSolos.bass ? "Deactivate Solo (Bass Track)" : "Solo Bass Track (Isolate instrument)"}
                    >
                      SOLO
                    </button>
                    <button
                      onClick={() => setTrackMute('bass', !trackMutes.bass)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors text-xs font-bold cursor-pointer border",
                        trackMutes.bass ? "text-rose-600 bg-rose-500/15 border-rose-500/30" : "text-blue-600 border-slate-300 dark:border-white/15 hover:bg-blue-500/15"
                      )}
                      title={trackMutes.bass ? "Unmute Bass Track" : "Mute Bass Track"}
                    >
                      {trackMutes.bass ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-700 dark:text-slate-300">Bass Type</label>
                  <select
                    value={selectedBassInstrument}
                    onChange={(e) => setSelectedBassInstrument(e.target.value)}
                    className="text-[11px] font-bold p-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer border border-slate-300 dark:border-white/15 shadow-2xs truncate"
                  >
                    {BASS_INSTRUMENTS.map(inst => (
                      <option key={inst.id} value={inst.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white font-bold">
                        {inst.name} ({inst.badge})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1 min-w-0 w-full overflow-hidden">
                  <span className="text-[9px] font-mono font-extrabold text-slate-700 dark:text-slate-300 w-7 shrink-0">Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={trackVolumes.bass}
                    onChange={(e) => setTrackVolume('bass', parseFloat(e.target.value))}
                    className="w-full min-w-0 flex-1 accent-blue-500 h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg cursor-pointer"
                  />
                  <span className="text-[9px] font-mono font-extrabold text-slate-900 dark:text-slate-100 w-9 text-right shrink-0">
                    {Math.round(trackVolumes.bass * 100)}%
                  </span>
                </div>
              </div>

              {/* 3. SYNTH TRACK */}
              <div className={cn(
                "flex flex-col gap-2 p-2.5 rounded-xl border shadow-2xs min-w-0 overflow-hidden transition-all",
                trackSolos.synth 
                  ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30" 
                  : isAnyTrackSoloed && !trackSolos.synth
                    ? "opacity-50 bg-slate-100/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5"
                    : "bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shrink-0" />
                    <span className="text-[11px] font-black uppercase text-purple-800 dark:text-purple-400 truncate">Synth / Lead Track</span>
                    {isAnyTrackSoloed && !trackSolos.synth && (
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-500 shrink-0">Solo Muted</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleTrackSolo('synth')}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[9px] font-black font-mono transition-all uppercase cursor-pointer border",
                        trackSolos.synth
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-1 ring-amber-300"
                          : "text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/15 hover:border-amber-500/50 hover:text-amber-500 hover:bg-amber-500/10"
                      )}
                      title={trackSolos.synth ? "Deactivate Solo (Synth Track)" : "Solo Synth Track (Isolate instrument)"}
                    >
                      SOLO
                    </button>
                    <button
                      onClick={() => setTrackMute('synth', !trackMutes.synth)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors text-xs font-bold cursor-pointer border",
                        trackMutes.synth ? "text-rose-600 bg-rose-500/15 border-rose-500/30" : "text-purple-600 border-slate-300 dark:border-white/15 hover:bg-purple-500/15"
                      )}
                      title={trackMutes.synth ? "Unmute Synth Track" : "Mute Synth Track"}
                    >
                      {trackMutes.synth ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-700 dark:text-slate-300">Synth Model</label>
                  <select
                    value={selectedSynthInstrument}
                    onChange={(e) => setSelectedSynthInstrument(e.target.value)}
                    className="text-[11px] font-bold p-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer border border-slate-300 dark:border-white/15 shadow-2xs truncate"
                  >
                    {SYNTH_INSTRUMENTS.map(inst => (
                      <option key={inst.id} value={inst.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white font-bold">
                        {inst.name} ({inst.badge})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1 min-w-0 w-full overflow-hidden">
                  <span className="text-[9px] font-mono font-extrabold text-slate-700 dark:text-slate-300 w-7 shrink-0">Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={trackVolumes.synth}
                    onChange={(e) => setTrackVolume('synth', parseFloat(e.target.value))}
                    className="w-full min-w-0 flex-1 accent-purple-500 h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg cursor-pointer"
                  />
                  <span className="text-[9px] font-mono font-extrabold text-slate-900 dark:text-slate-100 w-9 text-right shrink-0">
                    {Math.round(trackVolumes.synth * 100)}%
                  </span>
                </div>
              </div>

              {/* 4. PERCUSSION TRACK & DRUM SET */}
              <div className={cn(
                "flex flex-col gap-2 p-2.5 rounded-xl border shadow-2xs min-w-0 overflow-hidden transition-all",
                trackSolos.percussion 
                  ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30" 
                  : isAnyTrackSoloed && !trackSolos.percussion
                    ? "opacity-50 bg-slate-100/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5"
                    : "bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0" />
                    <span className="text-[11px] font-black uppercase text-amber-800 dark:text-amber-400 truncate">Percussion Drumset</span>
                    {isAnyTrackSoloed && !trackSolos.percussion && (
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-500 shrink-0">Solo Muted</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleTrackSolo('percussion')}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[9px] font-black font-mono transition-all uppercase cursor-pointer border",
                        trackSolos.percussion
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-1 ring-amber-300"
                          : "text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/15 hover:border-amber-500/50 hover:text-amber-500 hover:bg-amber-500/10"
                      )}
                      title={trackSolos.percussion ? "Deactivate Solo (Percussion Track)" : "Solo Percussion Track (Isolate drumset)"}
                    >
                      SOLO
                    </button>
                    <button
                      onClick={() => setTrackMute('percussion', !trackMutes.percussion)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors text-xs font-bold cursor-pointer border",
                        trackMutes.percussion ? "text-rose-600 bg-rose-500/15 border-rose-500/30" : "text-amber-600 border-slate-300 dark:border-white/15 hover:bg-amber-500/15"
                      )}
                      title={trackMutes.percussion ? "Unmute Percussion Track" : "Mute Percussion Track"}
                    >
                      {trackMutes.percussion ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-extrabold uppercase text-slate-700 dark:text-slate-300">Drum Set</label>
                    <span className="text-[8px] font-mono font-bold text-amber-600 dark:text-amber-400">
                      {getDrumSetInfo(selectedDrumSet)?.badge || 'Kit'}
                    </span>
                  </div>
                  <select
                    value={selectedDrumSet}
                    onChange={(e) => setSelectedDrumSet(e.target.value)}
                    className="text-[11px] font-bold p-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer border border-slate-300 dark:border-white/15 shadow-2xs truncate"
                    title="Select cohesive drumset (Acoustic Studio, Vintage Jazz, 808, Latin, Bossa, Flamenco, etc.)"
                  >
                    {DRUM_SETS.map(dSet => (
                      <option key={dSet.id} value={dSet.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white font-bold">
                        {dSet.name} ({dSet.badge})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1 min-w-0 w-full overflow-hidden">
                  <span className="text-[9px] font-mono font-extrabold text-slate-700 dark:text-slate-300 w-7 shrink-0">Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={trackVolumes.percussion}
                    onChange={(e) => setTrackVolume('percussion', parseFloat(e.target.value))}
                    className="w-full min-w-0 flex-1 accent-amber-500 h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg cursor-pointer"
                  />
                  <span className="text-[9px] font-mono font-extrabold text-slate-900 dark:text-slate-100 w-9 text-right shrink-0">
                    {Math.round(trackVolumes.percussion * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEQUENCER GRID (4-TRACK MULTI-LAYER SEQUENCER) */}
      {isGrooveEngineEnabled && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-emerald-500" />
                Interactive Step Sequencer (Click steps to cycle triggers & accents)
              </span>
              {isAnyTrackSoloed && (
                <span className="px-2 py-0.5 rounded text-[8px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider animate-pulse">
                  Solo Mode Active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isAnyTrackSoloed && (
                <button
                  onClick={clearAllSolos}
                  className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors cursor-pointer"
                  title="Clear all track solos"
                >
                  Unsolo All
                </button>
              )}
              <span className="text-[9px] font-mono font-bold text-emerald-500">
                {totalSteps} Steps • {subsPerBeat} per beat • {activeGroovePattern?.swingRatio ? 'Swing' : 'Straight'}
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-2 scrollbar-none">
            <div className="min-w-[660px] flex flex-col gap-1.5">
              {/* Step Numbers Header */}
              <div 
                className="grid gap-1 items-center py-1 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pl-1"
                style={{ gridTemplateColumns: `150px repeat(${totalSteps}, minmax(0, 1fr))` }}
              >
                <div>Track / Beat</div>
                {Array.from({ length: totalSteps }).map((_, stepIdx) => {
                  const isCurrentSubStep = isPlaying && currentSubStepIndex === stepIdx;
                  const beatNumber = Math.floor(stepIdx / subsPerBeat) + 1;
                  const subBeatLetter = stepIdx % subsPerBeat === 0 ? `B${beatNumber}` : `&`;

                  return (
                    <div
                      key={stepIdx}
                      className={cn(
                        "text-center py-0.5 rounded transition-colors font-mono",
                        isCurrentSubStep ? "bg-emerald-500 text-white font-black" : "opacity-70"
                      )}
                    >
                      {subBeatLetter}
                    </div>
                  );
                })}
              </div>

              {/* 1. CHORD / RHYTHM TRIGGER LAYER */}
              <div 
                className={cn(
                  "grid gap-1 items-center py-1.5 rounded-xl p-1.5 border transition-all",
                  trackSolos.rhythm
                    ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30 shadow-xs"
                    : isAnyTrackSoloed && !trackSolos.rhythm
                      ? "opacity-45 bg-slate-100/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5"
                      : "bg-slate-200/50 dark:bg-white/[0.03] border-slate-200 dark:border-white/5"
                )}
                style={{ gridTemplateColumns: `150px repeat(${totalSteps}, minmax(0, 1fr))` }}
              >
                <div className="flex items-center justify-between pr-1 pl-1">
                  <div className="flex flex-col min-w-0 pr-1">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                      <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider truncate">Rhythm</span>
                    </div>
                    <span className="text-[8px] text-slate-400 truncate">
                      {isAnyTrackSoloed && !trackSolos.rhythm ? "Solo Muted" : "Comping / Pushes"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleTrackSolo('rhythm')}
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center text-[9px] font-black font-mono transition-all cursor-pointer border",
                        trackSolos.rhythm
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-1 ring-amber-300"
                          : "text-slate-400 dark:text-slate-500 border-slate-300 dark:border-white/10 hover:border-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
                      )}
                      title={trackSolos.rhythm ? "Deactivate Solo (Rhythm Track)" : "Solo Rhythm Track (S)"}
                    >
                      S
                    </button>
                    <button
                      onClick={() => setTrackMute('rhythm', !trackMutes.rhythm)}
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center text-[9px] font-black font-mono transition-all cursor-pointer border",
                        trackMutes.rhythm
                          ? "bg-rose-500/20 text-rose-500 border-rose-500/30"
                          : "text-slate-400 dark:text-slate-500 border-slate-300 dark:border-white/10 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5"
                      )}
                      title={trackMutes.rhythm ? "Unmute Rhythm Track" : "Mute Rhythm Track (M)"}
                    >
                      {trackMutes.rhythm ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {activeGroovePattern?.chordPattern?.map((triggerType, stepIdx) => {
                  const isCurrentSubStep = isPlaying && currentSubStepIndex === stepIdx;
                  const meta = CHORD_TRIGGER_LABELS.find(m => m.type === triggerType) || CHORD_TRIGGER_LABELS[0];

                  return (
                    <button
                      key={stepIdx}
                      onClick={() => handleCycleChordStep(stepIdx)}
                      className={cn(
                        "h-10 rounded-lg text-[9px] font-black font-mono transition-colors flex flex-col items-center justify-center border shadow-xs leading-none p-0.5",
                        meta.color,
                        isCurrentSubStep ? "ring-2 ring-emerald-400 z-10 scale-105" : "hover:brightness-110"
                      )}
                      title={`${meta.desc} (Click to change)`}
                    >
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 2. BASS TRIGGER LAYER */}
              <div 
                className={cn(
                  "grid gap-1 items-center py-1.5 rounded-xl p-1.5 border transition-all",
                  trackSolos.bass
                    ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30 shadow-xs"
                    : isAnyTrackSoloed && !trackSolos.bass
                      ? "opacity-45 bg-slate-100/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5"
                      : "bg-slate-200/50 dark:bg-white/[0.03] border-slate-200 dark:border-white/5"
                )}
                style={{ gridTemplateColumns: `150px repeat(${totalSteps}, minmax(0, 1fr))` }}
              >
                <div className="flex items-center justify-between pr-1 pl-1">
                  <div className="flex flex-col min-w-0 pr-1">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block shrink-0" />
                      <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider truncate">Bass Line</span>
                    </div>
                    <span className="text-[8px] text-slate-400 truncate">
                      {isAnyTrackSoloed && !trackSolos.bass ? "Solo Muted" : "Root / 5th / Walk"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleTrackSolo('bass')}
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center text-[9px] font-black font-mono transition-all cursor-pointer border",
                        trackSolos.bass
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-1 ring-amber-300"
                          : "text-slate-400 dark:text-slate-500 border-slate-300 dark:border-white/10 hover:border-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
                      )}
                      title={trackSolos.bass ? "Deactivate Solo (Bass Track)" : "Solo Bass Track (S)"}
                    >
                      S
                    </button>
                    <button
                      onClick={() => setTrackMute('bass', !trackMutes.bass)}
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center text-[9px] font-black font-mono transition-all cursor-pointer border",
                        trackMutes.bass
                          ? "bg-rose-500/20 text-rose-500 border-rose-500/30"
                          : "text-slate-400 dark:text-slate-500 border-slate-300 dark:border-white/10 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5"
                      )}
                      title={trackMutes.bass ? "Unmute Bass Track" : "Mute Bass Track (M)"}
                    >
                      {trackMutes.bass ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {activeGroovePattern?.bassPattern?.map((triggerType, stepIdx) => {
                  const isCurrentSubStep = isPlaying && currentSubStepIndex === stepIdx;
                  const meta = BASS_TRIGGER_LABELS.find(m => m.type === triggerType) || BASS_TRIGGER_LABELS[0];

                  return (
                    <button
                      key={stepIdx}
                      onClick={() => handleCycleBassStep(stepIdx)}
                      className={cn(
                        "h-10 rounded-lg text-[9px] font-black font-mono transition-colors flex flex-col items-center justify-center border shadow-xs leading-none p-0.5",
                        meta.color,
                        isCurrentSubStep ? "ring-2 ring-blue-400 z-10 scale-105" : "hover:brightness-110"
                      )}
                      title={`${meta.desc} (Click to change)`}
                    >
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 3. SYNTH / LEAD TRIGGER LAYER */}
              <div 
                className={cn(
                  "grid gap-1 items-center py-1.5 rounded-xl p-1.5 border transition-all",
                  trackSolos.synth
                    ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30 shadow-xs"
                    : isAnyTrackSoloed && !trackSolos.synth
                      ? "opacity-45 bg-slate-100/50 dark:bg-white/[0.01] border-slate-200 dark:border-white/5"
                      : "bg-slate-200/50 dark:bg-white/[0.03] border-slate-200 dark:border-white/5"
                )}
                style={{ gridTemplateColumns: `150px repeat(${totalSteps}, minmax(0, 1fr))` }}
              >
                <div className="flex items-center justify-between pr-1 pl-1">
                  <div className="flex flex-col min-w-0 pr-1">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500 inline-block shrink-0" />
                      <span className="text-[10px] font-black uppercase text-purple-500 tracking-wider truncate">Synth / Lead</span>
                    </div>
                    <span className="text-[8px] text-slate-400 truncate">
                      {isAnyTrackSoloed && !trackSolos.synth ? "Solo Muted" : "Pad / Lead / Arp"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleTrackSolo('synth')}
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center text-[9px] font-black font-mono transition-all cursor-pointer border",
                        trackSolos.synth
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-1 ring-amber-300"
                          : "text-slate-400 dark:text-slate-500 border-slate-300 dark:border-white/10 hover:border-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
                      )}
                      title={trackSolos.synth ? "Deactivate Solo (Synth Track)" : "Solo Synth Track (S)"}
                    >
                      S
                    </button>
                    <button
                      onClick={() => setTrackMute('synth', !trackMutes.synth)}
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center text-[9px] font-black font-mono transition-all cursor-pointer border",
                        trackMutes.synth
                          ? "bg-rose-500/20 text-rose-500 border-rose-500/30"
                          : "text-slate-400 dark:text-slate-500 border-slate-300 dark:border-white/10 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5"
                      )}
                      title={trackMutes.synth ? "Unmute Synth Track" : "Mute Synth Track (M)"}
                    >
                      {trackMutes.synth ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {Array.from({ length: totalSteps }).map((_, stepIdx) => {
                  const triggerType = (activeGroovePattern?.synthPattern && activeGroovePattern.synthPattern[stepIdx]) || 'OFF';
                  const isCurrentSubStep = isPlaying && currentSubStepIndex === stepIdx;
                  const meta = SYNTH_TRIGGER_LABELS.find(m => m.type === triggerType) || SYNTH_TRIGGER_LABELS[0];

                  return (
                    <button
                      key={stepIdx}
                      onClick={() => handleCycleSynthStep(stepIdx)}
                      className={cn(
                        "h-10 rounded-lg text-[9px] font-black font-mono transition-colors flex flex-col items-center justify-center border shadow-xs leading-none p-0.5",
                        meta.color,
                        isCurrentSubStep ? "ring-2 ring-purple-400 z-10 scale-105" : "hover:brightness-110"
                      )}
                      title={`${meta.desc} (Click to change)`}
                    >
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 4. PERCUSSION TRACK LAYERS */}
              {activeGroovePattern?.percussionLayers?.map((pLayer) => {
                const hasAnyPercLayerSolo = activeGroovePattern.percussionLayers.some(l => l.solo);
                const isTrackSoloMuted = isAnyTrackSoloed && !trackSolos.percussion;
                const isLayerDimmed = pLayer.muted || isTrackSoloMuted || (hasAnyPercLayerSolo && !pLayer.solo);

                return (
                  <div 
                    key={pLayer.id}
                    className={cn(
                      "grid gap-1 items-center py-1.5 rounded-xl p-1.5 border transition-all",
                      pLayer.solo || trackSolos.percussion
                        ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30 shadow-xs"
                        : isLayerDimmed
                          ? "opacity-45 bg-slate-100 dark:bg-white/[0.01] border-slate-200 dark:border-white/5"
                          : "bg-slate-200/50 dark:bg-white/[0.03] border-slate-200 dark:border-white/5"
                    )}
                    style={{ gridTemplateColumns: `150px repeat(${totalSteps}, minmax(0, 1fr))` }}
                  >
                    <div className="flex items-center justify-between pr-1 pl-1">
                      <div className="flex flex-col flex-1 mr-1 min-w-0 overflow-hidden">
                        <select
                          value={pLayer.sound}
                          onChange={(e) => updatePercussionLayerProps(pLayer.id, { sound: e.target.value })}
                          className="text-[9px] text-slate-700 dark:text-slate-200 font-extrabold uppercase bg-transparent hover:text-emerald-500 cursor-pointer outline-none truncate"
                          title="Change drum / percussion instrument voice"
                        >
                          {PERCUSSION_SOUNDS.map(s => (
                            <option key={s.id} value={s.id} className="bg-slate-900 text-white font-normal">
                              {s.name} ({s.category})
                            </option>
                          ))}
                        </select>
                        <span className="text-[7px] text-slate-400 font-mono">
                          {pLayer.solo ? "Solo Voice" : isLayerDimmed ? "Solo Muted" : "Perc Voice"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => togglePercussionLayerSolo(pLayer.id)}
                          className={cn(
                            "w-5 h-5 rounded flex items-center justify-center text-[9px] font-black font-mono transition-all cursor-pointer border",
                            pLayer.solo
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-1 ring-amber-300"
                              : "text-slate-400 dark:text-slate-500 border-slate-300 dark:border-white/10 hover:border-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
                          )}
                          title={pLayer.solo ? "Deactivate Solo (Voice)" : "Solo Percussion Voice (S)"}
                        >
                          S
                        </button>

                        <button
                          onClick={() => updatePercussionLayerProps(pLayer.id, { muted: !pLayer.muted })}
                          className={cn(
                            "w-5 h-5 rounded flex items-center justify-center text-[9px] font-black font-mono transition-all cursor-pointer border",
                            pLayer.muted
                              ? "bg-rose-500/20 text-rose-500 border-rose-500/30"
                              : "text-slate-400 dark:text-slate-500 border-slate-300 dark:border-white/10 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5"
                          )}
                          title={pLayer.muted ? "Unmute Voice" : "Mute Voice (M)"}
                        >
                          {pLayer.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </button>

                        {activeGroovePattern.percussionLayers.length > 1 && (
                          <button
                            onClick={() => removePercussionLayer(pLayer.id)}
                            className="p-0.5 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Remove percussion voice"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {pLayer.pattern.map((val, stepIdx) => {
                      const isCurrentSubStep = isPlaying && currentSubStepIndex === stepIdx;
                      const isAccent = val === 2;
                      const isHit = val === 1;

                      return (
                        <button
                          key={stepIdx}
                          onClick={() => handleCyclePercussionStep(pLayer.id, stepIdx)}
                          className={cn(
                            "h-9 rounded-lg transition-colors flex items-center justify-center border font-mono text-[9px] font-extrabold",
                            isAccent
                              ? "bg-rose-500 border-rose-400 text-white shadow-xs"
                              : isHit
                                ? "bg-amber-500 border-amber-400 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-transparent hover:border-slate-300",
                            isCurrentSubStep ? "ring-2 ring-rose-400 z-10 scale-105" : ""
                          )}
                          title={isAccent ? 'Accented Hit' : isHit ? 'Normal Hit' : 'Click to activate hit'}
                        >
                          {isAccent ? '★' : isHit ? '•' : ''}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Legend & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[9px] font-bold text-slate-400 border-t border-slate-200 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="uppercase text-[8px] tracking-wider font-mono">Legend:</span>
              <div className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-amber-500 text-slate-950 font-black text-[8px] flex items-center justify-center">S</span> Solo Track</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Chord Hit</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Early Push ➜</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> Bass Note</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" /> Synth Lead/Pad</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> Percussion Hit</div>
            </div>

            <button
              onClick={() => addPercussionLayer('snare_brush', 'Brushed Snare')}
              className="text-[9px] font-black text-amber-500 hover:text-amber-400 flex items-center gap-1 px-2 py-0.5 rounded border border-amber-500/20 hover:border-amber-500/40"
            >
              <Plus className="w-3 h-3" /> Add Percussion Voice
            </button>
          </div>
        </div>
      )}

      {/* Save Custom Rhythm Preset Modal */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleSaveCurrentAsPreset}
              className={cn(
                "w-full max-w-md p-5 rounded-2xl border shadow-2xl flex flex-col gap-4",
                resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
              )}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <BookmarkPlus className="w-4 h-4" /> Save 4-Track Custom Groove Preset
                </h4>
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Preset Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Neo-Soul Groove with 808 Sub"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-900"
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Genre Category</label>
                    <select
                      value={newPresetGenre}
                      onChange={(e) => setNewPresetGenre(e.target.value as GrooveGenre)}
                      className={cn(
                        "w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none",
                        resolvedTheme === 'dark' ? "bg-slate-800 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-900"
                      )}
                    >
                      {genres.filter(g => g !== 'ALL' && g !== 'CUSTOM').map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Time Signature</label>
                    <div className="px-3 py-2 rounded-xl border text-xs font-mono font-bold bg-slate-200/50 dark:bg-white/5 border-slate-300 dark:border-white/10">
                      {activeGroovePattern?.timeSignature || '4/4'} ({activeGroovePattern?.defaultBpm || 120} BPM)
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Describe the rhythm style, syncopated anticipation, and instrument setup..."
                    value={newPresetDesc}
                    onChange={(e) => setNewPresetDesc(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs outline-none resize-none",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-900"
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-xs"
                >
                  Save Preset
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
