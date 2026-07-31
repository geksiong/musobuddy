import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, Play, Volume2, VolumeX, Plus, Trash2, BookmarkPlus,
  Flame, Zap, Sliders, ChevronDown, Check, Info, Layers, RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useAccompaniment } from '../../contexts/AccompanimentContext.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import {
  GROOVE_PRESETS,
  ChordTriggerType,
  BassTriggerType,
  GroovePatternPreset
} from './grooveEngine.ts';
import { MetronomeSound } from '../Metronome/types.ts';

const CHORD_TRIGGER_LABELS: { type: ChordTriggerType; label: string; color: string; desc: string }[] = [
  { type: 'OFF', label: 'OFF', color: 'bg-slate-200/50 dark:bg-white/5 text-slate-400', desc: 'Silent step' },
  { type: 'CHORD', label: 'Hit', color: 'bg-emerald-500 text-white', desc: 'Standard chord hit' },
  { type: 'CHORD_ACCENT', label: 'ACC', color: 'bg-emerald-600 text-white font-black ring-1 ring-emerald-300', desc: 'Accented chord hit' },
  { type: 'PUSH_NEXT_CHORD', label: 'Push Next', color: 'bg-amber-500 text-white font-extrabold', desc: 'Syncopated early chord anticipation' },
  { type: 'PUSH_NEXT_ACCENT', label: 'Push ACC', color: 'bg-amber-600 text-white font-black ring-1 ring-amber-300', desc: 'Accented early chord push' },
  { type: 'ROOT', label: 'Root', color: 'bg-teal-500 text-white', desc: 'Single root note hit' },
  { type: 'PUSH_NEXT_ROOT', label: 'Push Root', color: 'bg-orange-500 text-white', desc: 'Early root note push' },
];

const BASS_TRIGGER_LABELS: { type: BassTriggerType; label: string; color: string; desc: string }[] = [
  { type: 'OFF', label: 'OFF', color: 'bg-slate-200/50 dark:bg-white/5 text-slate-400', desc: 'Silent bass step' },
  { type: 'ROOT', label: 'Root', color: 'bg-blue-500 text-white', desc: 'Bass root note' },
  { type: 'ROOT_ACCENT', label: 'Root ACC', color: 'bg-blue-600 text-white font-black', desc: 'Accented bass root' },
  { type: 'FIFTH', label: '5th', color: 'bg-indigo-500 text-white', desc: 'Bass fifth note' },
  { type: 'PUSH_NEXT_ROOT', label: 'Push Root', color: 'bg-amber-500 text-white font-extrabold', desc: 'Early bass root' },
  { type: 'PUSH_NEXT_FIFTH', label: 'Push 5th', color: 'bg-amber-600 text-white font-extrabold', desc: 'Early bass fifth' },
  { type: 'WALKING', label: 'Walk', color: 'bg-purple-500 text-white', desc: 'Walking chromatic approach' },
];

export default function GrooveEnginePanel() {
  const {
    isGrooveEngineEnabled, setIsGrooveEngineEnabled,
    activeGroovePattern, setActiveGroovePattern,
    customGroovePresets, saveCustomPreset, deleteCustomPreset,
    updateActiveGroovePatternStep, updatePercussionLayerProps,
    currentSubStepIndex, earlyPushEvent, isPlaying
  } = useAccompaniment();
  const { resolvedTheme } = useTheme();

  const [selectedGenre, setSelectedGenre] = useState<string>('ALL');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetGenre, setNewPresetGenre] = useState('Latin');
  const [newPresetDesc, setNewPresetDesc] = useState('');

  const genres = ['ALL', 'Latin', 'Jazz', 'Rock / Pop', 'Funk / Soul', 'World / Other', 'CUSTOM'];

  const allPresets = [...GROOVE_PRESETS, ...customGroovePresets];

  const filteredPresets = allPresets.filter(preset => {
    if (selectedGenre === 'ALL') return true;
    if (selectedGenre === 'CUSTOM') return customGroovePresets.some(c => c.id === preset.id);
    return preset.genre === selectedGenre;
  });

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
      description: newPresetDesc.trim() || 'Custom syncopated groove preset',
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
              Groove & Syncopation Engine
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
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-500 text-[9px] font-black uppercase tracking-wider whitespace-nowrap"
              >
                <Zap className="w-3 h-3 fill-current animate-bounce shrink-0" />
                <span>Early Push: Beat {earlyPushEvent.sourceBeat} → Chord [{earlyPushEvent.pushedChord}]</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {isGrooveEngineEnabled && (
        <div className="flex flex-col gap-4">
          {/* Genre Filter Tabs & Preset Dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              {genres.map(genre => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all border shrink-0",
                    selectedGenre === genre
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                      : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/50 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100")
                  )}
                >
                  {genre}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Groove Preset Selector */}
              <div className="relative">
                <select
                  value={activeGroovePattern?.id}
                  onChange={(e) => {
                    const found = allPresets.find(p => p.id === e.target.value);
                    if (found) setActiveGroovePattern(found);
                  }}
                  className={cn(
                    "appearance-none border px-3 pr-8 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer outline-none focus:border-emerald-500",
                    resolvedTheme === 'dark' ? "bg-white/10 border-white/15 text-white" : "bg-white border-slate-300 text-slate-800"
                  )}
                >
                  {filteredPresets.map(preset => (
                    <option key={preset.id} value={preset.id} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                      {preset.name} ({preset.genre})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>

              <button
                onClick={() => setIsSaveModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[9px] font-extrabold uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-xs"
                title="Save current custom groove configuration"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save Preset</span>
              </button>
            </div>
          </div>

          {/* Active Preset Description Card */}
          {activeGroovePattern && (
            <div className={cn(
              "p-3 rounded-xl border flex items-center justify-between gap-3 text-[10px]",
              resolvedTheme === 'dark' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-900"
            )}>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="font-extrabold mr-1.5">{activeGroovePattern.name}:</span>
                  <span className="opacity-80">{activeGroovePattern.description}</span>
                </div>
              </div>
              {activeGroovePattern.swingRatio && (
                <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-mono text-[9px] font-black shrink-0">
                  Swing: {Math.round(activeGroovePattern.swingRatio * 100)}%
                </div>
              )}
            </div>
          )}

          {/* MULTI-LAYER BEAT STEP GRID VISUALIZER */}
          <div className="w-full overflow-x-auto pb-1">
            <div className="min-w-[620px] flex flex-col gap-2">
              {/* Step Grid Header: Sub-beat division markings */}
              <div 
                className="grid gap-1 items-center text-[9px] font-black uppercase text-slate-400 font-mono border-b pb-1.5 border-slate-200 dark:border-white/10"
                style={{ gridTemplateColumns: `110px repeat(${totalSteps}, minmax(0, 1fr))` }}
              >
                <div className="pl-1">Layer</div>
                {Array.from({ length: totalSteps }).map((_, stepIdx) => {
                  const isCurrentSubStep = isPlaying && currentSubStepIndex === stepIdx;
                  const beatNumber = Math.floor(stepIdx / subsPerBeat) + 1;
                  const subBeatLetter = stepIdx % subsPerBeat === 0 ? `Beat ${beatNumber}` : `&`;

                  return (
                    <div
                      key={stepIdx}
                      className={cn(
                        "text-center py-0.5 rounded transition-colors font-mono",
                        isCurrentSubStep ? "bg-emerald-500 text-white font-black scale-105" : "opacity-70"
                      )}
                    >
                      {subBeatLetter}
                    </div>
                  );
                })}
              </div>

              {/* 1. CHORD TRIGGER LAYER */}
              <div 
                className="grid gap-1 items-center py-1 rounded-xl bg-slate-200/40 dark:bg-white/[0.03] p-1.5 border border-slate-200 dark:border-white/5"
                style={{ gridTemplateColumns: `110px repeat(${totalSteps}, minmax(0, 1fr))` }}
              >
                <div className="flex flex-col pl-1">
                  <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Chord Hit</span>
                  <span className="text-[8px] text-slate-400">Harmony / Push</span>
                </div>

                {activeGroovePattern?.chordPattern?.map((triggerType, stepIdx) => {
                  const isCurrentSubStep = isPlaying && currentSubStepIndex === stepIdx;
                  const meta = CHORD_TRIGGER_LABELS.find(m => m.type === triggerType) || CHORD_TRIGGER_LABELS[0];

                  return (
                    <button
                      key={stepIdx}
                      onClick={() => handleCycleChordStep(stepIdx)}
                      className={cn(
                        "h-10 rounded-lg text-[9px] font-black font-mono transition-all flex flex-col items-center justify-center border shadow-xs leading-none p-0.5",
                        meta.color,
                        isCurrentSubStep ? "ring-2 ring-emerald-400 scale-[1.03] z-10" : "hover:brightness-110"
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
                className="grid gap-1 items-center py-1 rounded-xl bg-slate-200/40 dark:bg-white/[0.03] p-1.5 border border-slate-200 dark:border-white/5"
                style={{ gridTemplateColumns: `110px repeat(${totalSteps}, minmax(0, 1fr))` }}
              >
                <div className="flex flex-col pl-1">
                  <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Bass Line</span>
                  <span className="text-[8px] text-slate-400">Root / 5th / Walk</span>
                </div>

                {activeGroovePattern?.bassPattern?.map((triggerType, stepIdx) => {
                  const isCurrentSubStep = isPlaying && currentSubStepIndex === stepIdx;
                  const meta = BASS_TRIGGER_LABELS.find(m => m.type === triggerType) || BASS_TRIGGER_LABELS[0];

                  return (
                    <button
                      key={stepIdx}
                      onClick={() => handleCycleBassStep(stepIdx)}
                      className={cn(
                        "h-10 rounded-lg text-[9px] font-black font-mono transition-all flex flex-col items-center justify-center border shadow-xs leading-none p-0.5",
                        meta.color,
                        isCurrentSubStep ? "ring-2 ring-blue-400 scale-[1.03] z-10" : "hover:brightness-110"
                      )}
                      title={`${meta.desc} (Click to change)`}
                    >
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 3. PERCUSSION LAYERS (Clave, Shaker, HiHat, Kick, Snare, Conga, Bongo) */}
              {activeGroovePattern?.percussionLayers?.map((pLayer) => (
                <div 
                  key={pLayer.id}
                  className={cn(
                    "grid gap-1 items-center py-1 rounded-xl p-1.5 border transition-all",
                    pLayer.muted
                      ? "opacity-40 bg-slate-100 dark:bg-white/[0.01] border-slate-200 dark:border-white/5"
                      : "bg-slate-200/40 dark:bg-white/[0.03] border-slate-200 dark:border-white/5"
                  )}
                  style={{ gridTemplateColumns: `110px repeat(${totalSteps}, minmax(0, 1fr))` }}
                >
                  <div className="flex items-center justify-between pr-2 pl-1">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-extrabold capitalize text-slate-700 dark:text-slate-200 truncate">
                        {pLayer.name}
                      </span>
                      <select
                        value={pLayer.sound}
                        onChange={(e) => updatePercussionLayerProps(pLayer.id, { sound: e.target.value as MetronomeSound })}
                        className="text-[7px] text-slate-400 font-mono uppercase bg-transparent hover:text-emerald-500 cursor-pointer outline-none font-bold"
                        title="Change sound instrument"
                      >
                        <option value={MetronomeSound.Woodblock} className="bg-slate-900 text-white">Woodblock</option>
                        <option value={MetronomeSound.Cowbell} className="bg-slate-900 text-white">Cowbell</option>
                        <option value={MetronomeSound.Kick} className="bg-slate-900 text-white">Kick</option>
                        <option value={MetronomeSound.Snare} className="bg-slate-900 text-white">Snare</option>
                        <option value={MetronomeSound.HiHat} className="bg-slate-900 text-white">HiHat</option>
                        <option value={MetronomeSound.Clap} className="bg-slate-900 text-white">Clap</option>
                        <option value={MetronomeSound.Bass} className="bg-slate-900 text-white">Bass Drum</option>
                        <option value={MetronomeSound.Bodhran} className="bg-slate-900 text-white">Bodhrán</option>
                        <option value={MetronomeSound.ClockTick} className="bg-slate-900 text-white">Clock Tick</option>
                      </select>
                    </div>

                    <button
                      onClick={() => updatePercussionLayerProps(pLayer.id, { muted: !pLayer.muted })}
                      className={cn(
                        "p-1 rounded transition-colors",
                        pLayer.muted ? "text-slate-400 hover:text-slate-600" : "text-emerald-500 hover:text-emerald-600"
                      )}
                      title={pLayer.muted ? "Unmute layer" : "Mute layer"}
                    >
                      {pLayer.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
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
                          "h-8 rounded-lg transition-all flex items-center justify-center border font-mono text-[9px] font-extrabold",
                          isAccent
                            ? "bg-rose-500 border-rose-400 text-white shadow-xs"
                            : isHit
                              ? "bg-amber-500 border-amber-400 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-transparent hover:border-slate-300",
                          isCurrentSubStep ? "ring-2 ring-rose-400 scale-105 z-10" : ""
                        )}
                        title={isAccent ? 'Accented Hit' : isHit ? 'Normal Hit' : 'Click to activate hit'}
                      >
                        {isAccent ? '★' : isHit ? '•' : ''}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Trigger Types Quick Legend */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-[9px] font-bold text-slate-400 border-t border-slate-200 dark:border-white/10">
            <span className="uppercase text-[8px] tracking-wider font-mono">Legend:</span>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Chord Hit</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Early Push (Next Chord)</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> Bass Root</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> Percussion Hit</div>
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
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-500">Save Custom Groove Preset</h4>
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
                    placeholder="e.g. Cuban Songo Syncopation"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-emerald-500",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Genre Category</label>
                  <select
                    value={newPresetGenre}
                    onChange={(e) => setNewPresetGenre(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-emerald-500",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <option value="Latin">Latin</option>
                    <option value="Jazz">Jazz</option>
                    <option value="Rock / Pop">Rock / Pop</option>
                    <option value="Funk / Soul">Funk / Soul</option>
                    <option value="World / Other">World / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the syncopated rhythm feel..."
                    value={newPresetDesc}
                    onChange={(e) => setNewPresetDesc(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-emerald-500 resize-none",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200"
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 shadow-md"
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
