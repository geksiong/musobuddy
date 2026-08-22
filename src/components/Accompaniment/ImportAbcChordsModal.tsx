/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Music, Check, X, Upload, Sparkles, Play, AlertCircle, RefreshCw, FileCode, ArrowDown, Sliders, Layers
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useScores } from '../../contexts/ScoreContext.tsx';
import { useAccompaniment } from '../../contexts/AccompanimentContext.tsx';
import { useMetronome } from '../../hooks/useMetronome.ts';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { parseChordsFromAbc, ParsedAbcTune } from '../../lib/abcChordParser.ts';
import { parseChordsFromChordSheet, ParsedChordSheet, ChordDistributionMode } from '../../lib/chordSheetParser.ts';
import { DEFAULT_PRESETS } from '../Metronome/constants.ts';
import { formatChordName } from './constants.ts';

interface ImportAbcChordsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportAbcChordsModal({ isOpen, onClose }: ImportAbcChordsModalProps) {
  const { scores } = useScores();
  const { setProgression, setSelectedBeatIndex, setTrackedChord, selectedInstrument, accompanimentVolume } = useAccompaniment();
  const { setActivePattern, setBpm } = useMetronome();
  const { playChord } = useAudio();
  const { resolvedTheme } = useTheme();

  // Selected Score Source mode: 'score_library' | 'upload' | 'paste'
  const [sourceMode, setSourceMode] = useState<'score_library' | 'upload' | 'paste'>('score_library');

  // Selected Score ID from ScoreContext
  const [selectedScoreId, setSelectedScoreId] = useState<string>('');

  // Uploaded or pasted raw score string
  const [customText, setCustomText] = useState<string>('');

  // Format type override or auto: 'auto' | 'abc' | 'chordsheet'
  const [formatType, setFormatType] = useState<'auto' | 'abc' | 'chordsheet'>('auto');

  // Chord sheet distribution mode
  const [distributionMode, setDistributionMode] = useState<ChordDistributionMode>('smart');

  // Active Tune Index inside parsed ABC score (if multi-tune ABC)
  const [selectedTuneIdx, setSelectedTuneIdx] = useState<number>(0);

  // Sync Options
  const [syncTimeSig, setSyncTimeSig] = useState<boolean>(true);
  const [syncBpm, setSyncBpm] = useState<boolean>(true);

  // Toast / Status Message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filter available scores in library (ABC, Chord Sheets, Text, GuitarPro)
  const availableScores = useMemo(() => {
    return scores.filter(s => {
      if (s.format === 'abc' || s.format === 'chordsheet' || s.format === 'text' || s.format === 'guitarpro') return true;
      if (typeof s.content === 'string' && s.content.trim().length > 0) return true;
      return false;
    });
  }, [scores]);

  // Set default selected score when modal opens or scores change
  useEffect(() => {
    if (availableScores.length > 0 && !selectedScoreId) {
      setSelectedScoreId(availableScores[0].id);
    }
  }, [availableScores, selectedScoreId]);

  // Resolve active raw score content and detected format
  const { activeContent, activeFormat } = useMemo(() => {
    let raw = '';
    let fmt: 'abc' | 'chordsheet' = 'chordsheet';

    if (sourceMode === 'score_library') {
      const match = availableScores.find(s => s.id === selectedScoreId);
      if (match) {
        raw = typeof match.content === 'string' ? match.content : '';
        if (match.format === 'abc') fmt = 'abc';
        else if (match.format === 'chordsheet') fmt = 'chordsheet';
        else if (raw.includes('X:') || raw.includes('K:')) fmt = 'abc';
        else fmt = 'chordsheet';
      }
    } else {
      raw = customText;
      if (formatType === 'auto') {
        if (raw.includes('X:') || raw.match(/^K:\s*[A-G]/m)) {
          fmt = 'abc';
        } else {
          fmt = 'chordsheet';
        }
      } else {
        fmt = formatType;
      }
    }

    return { activeContent: raw, activeFormat: fmt };
  }, [sourceMode, selectedScoreId, availableScores, customText, formatType]);

  // Parse result depending on active format
  const parsedAbcTunes = useMemo(() => {
    if (activeFormat === 'abc') {
      return parseChordsFromAbc(activeContent);
    }
    return [];
  }, [activeContent, activeFormat]);

  const parsedChordSheet: ParsedChordSheet | null = useMemo(() => {
    if (activeFormat === 'chordsheet' && activeContent.trim().length > 0) {
      return parseChordsFromChordSheet(activeContent, distributionMode);
    }
    return null;
  }, [activeContent, activeFormat, distributionMode]);

  // Unified Active Data Model
  const activeProgressionData = useMemo(() => {
    if (activeFormat === 'abc') {
      if (parsedAbcTunes.length === 0) return null;
      const tune = parsedAbcTunes[selectedTuneIdx] || parsedAbcTunes[0];
      return {
        title: tune.title,
        meter: tune.meter,
        key: tune.key,
        tempo: tune.tempo,
        beatsPerMeasure: tune.beatsPerMeasure,
        measureCount: tune.measureCount,
        chordsPerBeat: tune.chordsPerBeat,
        measures: tune.measures,
        isAbc: true,
        explicitCount: tune.explicitChordCount,
      };
    } else if (activeFormat === 'chordsheet' && parsedChordSheet) {
      return {
        title: parsedChordSheet.title,
        meter: parsedChordSheet.timeSignature,
        key: parsedChordSheet.key,
        tempo: parsedChordSheet.tempo,
        beatsPerMeasure: parsedChordSheet.beatsPerMeasure,
        measureCount: parsedChordSheet.measureCount,
        chordsPerBeat: parsedChordSheet.chordsPerBeat,
        measures: parsedChordSheet.measures,
        isAbc: false,
        explicitCount: parsedChordSheet.uniqueChords.length,
      };
    }
    return null;
  }, [activeFormat, parsedAbcTunes, selectedTuneIdx, parsedChordSheet]);

  // Reset tune index when content changes
  useEffect(() => {
    setSelectedTuneIdx(0);
  }, [activeContent]);

  // Handle File Upload (.abc, .txt, .chopro, .crd)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCustomText(content);
        setSourceMode('upload');
        setStatusMessage(`Loaded file "${file.name}"`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  // Execute Import into Accompaniment Progression
  const handleImportChords = () => {
    if (!activeProgressionData || activeProgressionData.chordsPerBeat.length === 0) {
      setStatusMessage('No valid chord progression found in selected score.');
      return;
    }

    // 1. Construct new progression slots
    const newProgression = activeProgressionData.chordsPerBeat.map((chordName, i) => ({
      id: `score_import_${Date.now()}_${i}`,
      name: chordName,
    }));

    // 2. Overwrite Progression
    setProgression(newProgression);
    setSelectedBeatIndex(0);

    // 3. Sync Metronome Time Signature if enabled
    if (syncTimeSig && activeProgressionData.meter) {
      const targetPattern = DEFAULT_PRESETS.find(p => p.timeSignature === activeProgressionData.meter);
      if (targetPattern) {
        setActivePattern(targetPattern);
      }
    }

    // 4. Sync BPM if enabled and specified in score header
    if (syncBpm && activeProgressionData.tempo) {
      setBpm(activeProgressionData.tempo);
    }

    // 5. Play first chord audio preview
    const firstChord = activeProgressionData.chordsPerBeat.find(c => c.trim() !== '');
    if (firstChord) {
      playChord(firstChord, selectedInstrument, accompanimentVolume);
      setTrackedChord(firstChord);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={cn(
          "w-full max-w-2xl rounded-2xl border p-5 flex flex-col gap-4 shadow-2xl relative max-h-[90vh] overflow-hidden",
          resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
        )}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                Import Chords from Score / Chord Sheet
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">
                Smartly extract beat-aligned chord progressions directly from ABC scores or chord sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Mode Tabs */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 w-full">
            <button
              onClick={() => setSourceMode('score_library')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                sourceMode === 'score_library'
                  ? "bg-emerald-500 text-slate-950 font-black shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
              )}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Score Library ({availableScores.length})</span>
            </button>
            <button
              onClick={() => setSourceMode('upload')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                sourceMode === 'upload'
                  ? "bg-emerald-500 text-slate-950 font-black shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Score File</span>
            </button>
            <button
              onClick={() => setSourceMode('paste')}
              className={cn(
                "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                sourceMode === 'paste'
                  ? "bg-emerald-500 text-slate-950 font-black shadow-xs"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Text / Chords</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 min-h-0 custom-scrollbar pr-1">
          {/* Mode 1: Select Score from Library */}
          {sourceMode === 'score_library' && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Select Loaded Score
              </label>
              {availableScores.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-center flex flex-col items-center gap-2 text-slate-400 my-2">
                  <AlertCircle className="w-6 h-6 text-amber-500 opacity-80" />
                  <span className="text-xs font-bold">No scores found in Score Library</span>
                  <span className="text-[10px]">
                    Switch to "Upload Score File" or "Paste Text / Chords" above, or add a score in the Score tab.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar p-0.5">
                  {availableScores.map(score => (
                    <button
                      key={score.id}
                      onClick={() => setSelectedScoreId(score.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer",
                        selectedScoreId === score.id
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 font-bold shadow-xs"
                          : resolvedTheme === 'dark'
                            ? "bg-white/5 border-white/10 hover:border-white/20 text-white"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-900"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black truncate">{score.title || 'Untitled Score'}</span>
                        <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase shrink-0">
                          {score.format.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 truncate">
                        Score Library • {score.format === 'chordsheet' ? 'Chord Sheet / Lyrics' : 'Notation'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Upload File */}
          {sourceMode === 'upload' && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Upload Score or Chord Sheet (.ABC, .TXT, .CHOPRO, .CRD)
              </label>
              <label className={cn(
                "flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center gap-2",
                resolvedTheme === 'dark'
                  ? "bg-white/5 border-white/20 hover:border-emerald-500 hover:bg-white/10"
                  : "bg-slate-50 border-slate-300 hover:border-emerald-500 hover:bg-slate-100"
              )}>
                <Upload className="w-8 h-8 text-emerald-500 animate-bounce" />
                <span className="text-xs font-bold">Click to choose a file</span>
                <span className="text-[10px] text-slate-400">Supports ABC notation, ChordPro, Ultimate Guitar or standard chord sheets</span>
                <input
                  type="file"
                  accept=".abc,.txt,.chopro,.crd"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Mode 3: Paste Text */}
          {sourceMode === 'paste' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Paste ABC Notation or Chord Sheet Text
                </label>
                <div className="flex items-center gap-1.5 text-[9px] font-bold">
                  <span className="text-slate-400">Format:</span>
                  <select
                    value={formatType}
                    onChange={(e) => setFormatType(e.target.value as any)}
                    className={cn(
                      "px-2 py-0.5 rounded border text-[9px] font-mono outline-none cursor-pointer",
                      resolvedTheme === 'dark' ? "bg-slate-800 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-900"
                    )}
                  >
                    <option value="auto">Auto-Detect</option>
                    <option value="chordsheet">Chord Sheet (ChordPro / Words)</option>
                    <option value="abc">ABC Score Notation</option>
                  </select>
                </div>
              </div>
              <textarea
                rows={4}
                placeholder="{title: Hotel California}&#10;[Bm]On a dark desert highway, [F#7]cool wind in my hair...&#10;&#10;OR ABC:&#10;X:1&#10;T:Cooley's&#10;M:4/4&#10;K:Edor&#10;|: &quot;Em&quot;EBBA B2EB | &quot;D&quot;d2AG FDAD :|"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className={cn(
                  "w-full p-3 rounded-xl border text-xs font-mono outline-none focus:border-emerald-500 resize-none",
                  resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                )}
              />
            </div>
          )}

          {/* Smart Placement Controls for Chord Sheets */}
          {activeFormat === 'chordsheet' && activeContent.trim().length > 0 && (
            <div className={cn(
              "p-3 rounded-xl border flex flex-col gap-2",
              resolvedTheme === 'dark' ? "bg-slate-800/80 border-emerald-500/30" : "bg-emerald-50/60 border-emerald-200"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                    Smart Chord Sheet Measure & Beat Placement
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500">
                  Detected Format: Chord Sheet
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px]">
                    Placement Heuristic
                  </span>
                  <select
                    value={distributionMode}
                    onChange={(e) => setDistributionMode(e.target.value as ChordDistributionMode)}
                    className={cn(
                      "p-1.5 rounded-lg border font-bold outline-none cursor-pointer text-xs",
                      resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}
                  >
                    <option value="smart">🧠 Smart Alignment (Bar '|', Spacing & Position)</option>
                    <option value="1_per_bar">🎵 1 Chord per Measure (4 Beats)</option>
                    <option value="2_per_bar">✌️ 2 Chords per Measure (Beats 1 & 3)</option>
                    <option value="4_per_bar">⚡ 4 Chords per Measure (1 Beat each)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-center text-[9px] text-slate-400">
                  {distributionMode === 'smart' && "Analyzes bar separators '|', chord spacing, and line positions to place chords onto measure beats."}
                  {distributionMode === '1_per_bar' && "Places each chord on Beat 1 of its own measure (lasts full bar)."}
                  {distributionMode === '2_per_bar' && "Pairs adjacent chords into measures on Beat 1 and Beat 3."}
                  {distributionMode === '4_per_bar' && "Packs up to 4 chords into each measure (1 beat per chord)."}
                </div>
              </div>
            </div>
          )}

          {/* Active Extracted Progression Summary & Grid Preview */}
          {activeProgressionData ? (
            <div className="flex flex-col gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
              {/* ABC Multi-tune Selector if tune count > 1 */}
              {activeFormat === 'abc' && parsedAbcTunes.length > 1 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Select Tune from ABC File ({parsedAbcTunes.length} Tunes)
                  </label>
                  <select
                    value={selectedTuneIdx}
                    onChange={(e) => setSelectedTuneIdx(parseInt(e.target.value, 10))}
                    className={cn(
                      "w-full p-2 rounded-xl border text-xs font-bold outline-none cursor-pointer focus:border-emerald-500",
                      resolvedTheme === 'dark' ? "bg-slate-800 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-900"
                    )}
                  >
                    {parsedAbcTunes.map((tune, idx) => (
                      <option key={idx} value={idx}>
                        {tune.title} ({tune.meter}, Key {tune.key}) — {tune.measureCount} measures
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Active Score Summary Card */}
              <div className={cn(
                "p-3 rounded-xl border flex flex-col gap-2",
                resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
              )}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-black">{activeProgressionData.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/30">
                      Meter: {activeProgressionData.meter}
                    </span>
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Key: {activeProgressionData.key}
                    </span>
                    {activeProgressionData.tempo && (
                      <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        ♩ = {activeProgressionData.tempo} BPM
                      </span>
                    )}
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {activeProgressionData.measureCount} Bars ({activeProgressionData.chordsPerBeat.length} Beats)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-white/5">
                  <span>
                    Extracted {activeProgressionData.explicitCount} chords mapped into measure beats
                  </span>
                  <span className="font-mono text-emerald-500 font-bold">
                    {activeProgressionData.beatsPerMeasure} beats / measure
                  </span>
                </div>
              </div>

              {/* Measure-by-Measure Beat Preview Grid */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Chord Progression Preview</span>
                  <span className="text-[8px] font-mono">Click a chord to play preview</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar p-1">
                  {activeProgressionData.measures.map((measure, mIdx) => (
                    <div
                      key={mIdx}
                      className={cn(
                        "p-2 rounded-xl border flex flex-col gap-1 text-[9px]",
                        resolvedTheme === 'dark' ? "bg-black/30 border-white/5" : "bg-white border-slate-200"
                      )}
                    >
                      <span className="font-mono text-[8px] text-slate-400 font-bold">
                        Bar {mIdx + 1}
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {measure.chords.map((chord, bIdx) => (
                          <button
                            key={bIdx}
                            type="button"
                            disabled={!chord}
                            onClick={() => chord && playChord(chord, selectedInstrument, accompanimentVolume)}
                            className={cn(
                              "py-1 px-1 rounded-lg text-center font-mono font-bold text-[9px] transition-all truncate border",
                              chord
                                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer shadow-2xs"
                                : "bg-slate-100 text-slate-300 dark:bg-white/5 dark:text-white/20 border-transparent cursor-default"
                            )}
                            title={chord ? `Beat ${bIdx + 1}: ${chord}` : `Beat ${bIdx + 1}: (empty)`}
                          >
                            {chord ? formatChordName(chord) : '—'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sync Options Checkboxes */}
              <div className="flex items-center gap-4 pt-2 border-t border-slate-200 dark:border-white/10 flex-wrap">
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={syncTimeSig}
                    onChange={(e) => setSyncTimeSig(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Sync Time Signature ({activeProgressionData.meter})</span>
                </label>

                {activeProgressionData.tempo && (
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={syncBpm}
                      onChange={(e) => setSyncBpm(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Set Tempo ({activeProgressionData.tempo} BPM)</span>
                  </label>
                )}
              </div>
            </div>
          ) : (
            sourceMode !== 'score_library' || availableScores.length > 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-center flex flex-col items-center gap-2 text-slate-400 my-2">
                <Music className="w-6 h-6 opacity-40" />
                <span className="text-xs font-bold">Select or paste valid score / chord sheet content above</span>
              </div>
            ) : null
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10 shrink-0">
          <span className="text-[10px] text-emerald-500 font-bold">
            {statusMessage || (activeProgressionData ? `Ready to import ${activeProgressionData.chordsPerBeat.length} beats into accompaniment` : '')}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleImportChords}
              disabled={!activeProgressionData || activeProgressionData.chordsPerBeat.length === 0}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer",
                activeProgressionData && activeProgressionData.chordsPerBeat.length > 0
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                  : "opacity-40 cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-white/20"
              )}
            >
              <ArrowDown className="w-4 h-4" />
              <span>Import Chords (Overwrite)</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
