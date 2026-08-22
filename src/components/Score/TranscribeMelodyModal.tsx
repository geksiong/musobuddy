/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Sliders, 
  Music, 
  FileCode, 
  Volume2, 
  VolumeX, 
  X, 
  ChevronDown, 
  Download, 
  Copy, 
  AlertCircle, 
  AudioWaveform, 
  Settings2,
  Clock,
  KeyRound,
  Grid3X3,
  Wind,
  Guitar,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useScores } from '../../contexts/ScoreContext.tsx';
import { ScoreFormat, ScoreData } from './types.ts';
import { useMelodyRecorder, InputMode, PitchSmoothingLevel } from '../../hooks/useMelodyRecorder.ts';
import { 
  transcribeMelody, 
  TranscriptionResult, 
  TranscriptionConfig,
  RawNoteEvent,
  PitchTrackingStrategy 
} from '../../lib/melodyTranscription.ts';
import { generateMidiForAbc } from '../../lib/abcUtils.ts';
import * as abcjs from 'abcjs';

interface TranscribeMelodyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_KEYS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
  'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm'
];

export default function TranscribeMelodyModal({ isOpen, onClose }: TranscribeMelodyModalProps) {
  const { resolvedTheme } = useTheme();
  const { setScores, setActiveScoreId } = useScores();

  // Settings & Configuration
  const [bpm, setBpm] = useState<number>(120);
  const [useMetronomeClick, setUseMetronomeClick] = useState<boolean>(true);
  const [useCountIn, setUseCountIn] = useState<boolean>(true);
  const [sensitivity, setSensitivity] = useState<number>(1.0);
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [smoothing, setSmoothing] = useState<PitchSmoothingLevel>('high');
  const [pitchStrategy, setPitchStrategy] = useState<PitchTrackingStrategy>('adaptive_drift');
  const [selectedKey, setSelectedKey] = useState<string>('auto');
  const [selectedTimeSig, setSelectedTimeSig] = useState<'auto' | '4/4' | '3/4' | '2/4' | '6/8'>('auto');
  const [selectedGrid, setSelectedGrid] = useState<'auto' | '1/16' | '1/8' | '1/4' | '1/12'>('auto');
  const [minNoteDuration, setMinNoteDuration] = useState<number>(0.08);
  const [scoreTitle, setScoreTitle] = useState<string>('Transcribed Melody');
  const [activeTab, setActiveTab] = useState<'notation' | 'source'>('notation');
  const [copied, setCopied] = useState<boolean>(false);

  // Playback state for synthesized ABC score
  const [isPlayingScore, setIsPlayingScore] = useState<boolean>(false);
  const [synthAudioContext, setSynthAudioContext] = useState<AudioContext | null>(null);

  // Transcription Result State
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);

  const abcContainerRef = useRef<HTMLDivElement>(null);
  const visualObjRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  const {
    isRecording,
    isCountingIn,
    countInBeat,
    recordedDuration,
    liveNote,
    liveVolume,
    spectrumData,
    recordedNotes,
    audioUrl,
    hasPermission,
    permissionError,
    startRecording,
    stopRecording,
    clearRecorded
  } = useMelodyRecorder({
    bpm,
    useMetronomeClick,
    sensitivity,
    inputMode,
    smoothing,
    pitchStrategy
  });

  // Re-transcribe whenever parameters change post-recording
  const handleRequantize = (
    notes: RawNoteEvent[],
    newKey: string = selectedKey,
    newTime: 'auto' | '4/4' | '3/4' | '2/4' | '6/8' = selectedTimeSig,
    newGrid: 'auto' | '1/16' | '1/8' | '1/4' | '1/12' = selectedGrid,
    newBpm: number = bpm,
    newMinDur: number = minNoteDuration,
    newMode: InputMode = inputMode,
    newPitchStrategy: PitchTrackingStrategy = pitchStrategy,
    title: string = scoreTitle
  ) => {
    if (!notes || notes.length === 0) return;

    const res = transcribeMelody(notes, {
      bpm: newBpm,
      autoBpm: selectedTimeSig === 'auto' && !useMetronomeClick,
      keySignature: newKey,
      timeSignature: newTime,
      quantizationGrid: newGrid,
      minNoteDurationSec: newMinDur,
      inputMode: newMode,
      pitchStrategy: newPitchStrategy,
      title: title || 'Transcribed Melody'
    });

    setTranscriptionResult(res);
  };

  const handleStart = async () => {
    setTranscriptionResult(null);
    clearRecorded();
    await startRecording(useCountIn);
  };

  const handleStop = async () => {
    const result = await stopRecording();
    setScoreTitle(`Melody in ${result.keySignature.key}`);
    setTranscriptionResult(result);
  };

  // Render sheet music using ABCJS
  useEffect(() => {
    if (transcriptionResult && abcContainerRef.current && activeTab === 'notation') {
      try {
        abcContainerRef.current.innerHTML = '';
        const responsiveParams = {
          responsive: 'resize' as const,
          add_classes: true,
          staffwidth: Math.max(340, abcContainerRef.current.clientWidth - 40),
          scale: 0.95,
          foregroundColor: resolvedTheme === 'dark' ? '#f1f5f9' : '#0f172a'
        };
        const visualObjs = abcjs.renderAbc(abcContainerRef.current, transcriptionResult.abc, responsiveParams);
        if (visualObjs && visualObjs.length > 0) {
          visualObjRef.current = visualObjs[0];
        }
      } catch (err) {
        console.error('Failed to render ABC sheet in modal:', err);
      }
    }
  }, [transcriptionResult, activeTab, resolvedTheme]);

  // Audio Playback of the transcribed melody
  const handlePlaySynthesizedScore = () => {
    if (!transcriptionResult) return;

    if (isPlayingScore) {
      if (synthAudioContext) {
        synthAudioContext.close().catch(() => {});
        setSynthAudioContext(null);
      }
      setIsPlayingScore(false);
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      setSynthAudioContext(ctx);
      setIsPlayingScore(true);

      const beatSec = 60 / transcriptionResult.bpm;
      const now = ctx.currentTime + 0.1;

      transcriptionResult.quantizedNotes.forEach(n => {
        if (n.isRest || n.midiNote <= 0) return;

        const noteStart = now + n.startBeat * beatSec;
        const noteDuration = Math.max(0.08, n.durationBeats * beatSec * 0.92);

        const freq = 440 * Math.pow(2, (n.midiNote - 69) / 12);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Warm melodic flute/synth timbre
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.3, noteStart + 0.02);
        gain.gain.setValueAtTime(0.25, noteStart + noteDuration - 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + noteDuration + 0.05);
      });

      const totalTime = (transcriptionResult.totalDuration || (transcriptionResult.quantizedNotes.length * beatSec)) + 0.5;
      setTimeout(() => {
        setIsPlayingScore(false);
        ctx.close().catch(() => {});
      }, totalTime * 1000);
    } catch (err) {
      console.error('Failed to synthesize score playback:', err);
      setIsPlayingScore(false);
    }
  };

  const handleCreateScore = () => {
    if (!transcriptionResult) return;

    const id = Math.random().toString(36).substr(2, 9);
    const finalTitle = scoreTitle.trim() || transcriptionResult.title || 'Transcribed Melody';
    const finalAbc = transcriptionResult.abc;
    const midiUrl = generateMidiForAbc(finalAbc, 0);

    const newScore: ScoreData = {
      id,
      title: finalTitle,
      format: ScoreFormat.ABC,
      content: finalAbc,
      zoom: 1,
      pan: { x: 0, y: 0 },
      viewMode: 'scroll',
      showEditor: true,
      selectedTuneIndex: 0,
      audioUrl: midiUrl || undefined,
      audioName: midiUrl ? `${finalTitle}.mid` : undefined,
      transpose: 0
    };

    setScores(prev => [...prev, newScore]);
    setActiveScoreId(id);
    onClose();
  };

  const handleCopyAbc = () => {
    if (!transcriptionResult) return;
    navigator.clipboard.writeText(transcriptionResult.abc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAbc = () => {
    if (!transcriptionResult) return;
    const blob = new Blob([transcriptionResult.abc], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scoreTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'melody'}.abc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className={cn(
        "relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-colors",
        resolvedTheme === 'dark' 
          ? "bg-[#111215] border-white/10 text-slate-100" 
          : "bg-white border-slate-200 text-slate-900"
      )}>
        {/* Modal Header */}
        <div className={cn(
          "flex items-center justify-between px-5 sm:px-7 py-4 border-b shrink-0",
          resolvedTheme === 'dark' ? "border-white/10 bg-white/5" : "border-slate-100 bg-slate-50/80"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF4E00] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-[#FF4E00]/25">
              <AudioWaveform className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">Melody Transcriber</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#FF4E00]/15 text-[#FF4E00] border border-[#FF4E00]/30">
                  Voice & Mic to ABC
                </span>
              </div>
              <p className="text-xs opacity-60">
                Optimized for humming, singing, whistling, and acoustic instruments
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={cn(
              "p-2 rounded-full transition-colors",
              resolvedTheme === 'dark' ? "hover:bg-white/10 text-slate-400" : "hover:bg-slate-200 text-slate-500"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Permission Error Banner if any */}
          {permissionError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <div className="font-bold">Microphone Access Error</div>
                <div>{permissionError}. Please ensure microphone permission is granted in your browser settings.</div>
              </div>
            </div>
          )}

          {/* Input Mode Selector Bar */}
          <div className={cn(
            "p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs",
            resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
          )}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-70">Source Mode:</span>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/10 dark:bg-black/40 border border-black/5 dark:border-white/10">
                <button
                  onClick={() => setInputMode('voice')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all",
                    inputMode === 'voice'
                      ? "bg-[#FF4E00] text-white shadow-md shadow-[#FF4E00]/25"
                      : "opacity-60 hover:opacity-100 text-slate-600 dark:text-slate-300"
                  )}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Humming & Voice</span>
                </button>

                <button
                  onClick={() => setInputMode('whistle')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all",
                    inputMode === 'whistle'
                      ? "bg-[#FF4E00] text-white shadow-md shadow-[#FF4E00]/25"
                      : "opacity-60 hover:opacity-100 text-slate-600 dark:text-slate-300"
                  )}
                >
                  <Wind className="w-3.5 h-3.5" />
                  <span>Whistling</span>
                </button>

                <button
                  onClick={() => setInputMode('instrument')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all",
                    inputMode === 'instrument'
                      ? "bg-[#FF4E00] text-white shadow-md shadow-[#FF4E00]/25"
                      : "opacity-60 hover:opacity-100 text-slate-600 dark:text-slate-300"
                  )}
                >
                  <Guitar className="w-3.5 h-3.5" />
                  <span>Instrument</span>
                </button>
              </div>
            </div>

            {/* Vocal pitch stabilization level */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Pitch Stability:</span>
              <select
                value={smoothing}
                onChange={(e) => setSmoothing(e.target.value as PitchSmoothingLevel)}
                className={cn(
                  "px-2.5 py-1 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-colors outline-none",
                  resolvedTheme === 'dark' ? "bg-[#18191d] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                )}
              >
                <option value="high">High (Vocal/Vibrato Filter)</option>
                <option value="medium">Medium</option>
                <option value="responsive">Responsive (Fast Notes)</option>
              </select>
            </div>
          </div>

          {/* Humming Guidance Tip */}
          {inputMode === 'voice' && (
            <div className={cn(
              "px-4 py-2.5 rounded-2xl border flex items-center gap-2.5 text-xs",
              resolvedTheme === 'dark' ? "bg-[#FF4E00]/5 border-[#FF4E00]/20 text-orange-200/90" : "bg-[#FF4E00]/5 border-[#FF4E00]/20 text-orange-950"
            )}>
              <Info className="w-4 h-4 text-[#FF4E00] shrink-0" />
              <span className="text-[11px] leading-relaxed">
                <strong>Humming Tip:</strong> Hum with a steady tone (e.g. <em>&quot;mmm&quot;</em> or <em>&quot;dah&quot;</em>). 
                <strong> Relative Pitch Drift Correction</strong> is enabled automatically: sing relative intervals naturally and gradual key drifts will be compensated.
              </span>
            </div>
          )}

          {/* Recording & Input Panel */}
          <div className={cn(
            "p-5 sm:p-6 rounded-3xl border transition-all relative overflow-hidden",
            isRecording 
              ? "border-[#FF4E00]/60 bg-gradient-to-b from-[#FF4E00]/10 to-transparent shadow-[0_0_40px_rgba(255,78,0,0.15)]"
              : resolvedTheme === 'dark' ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
          )}>
            {/* Count-in overlay */}
            <AnimatePresence>
              {isCountingIn && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white"
                >
                  <div className="text-sm uppercase font-black tracking-widest text-[#FF4E00] mb-2">Get Ready...</div>
                  <div className="text-7xl font-black text-[#FF4E00] animate-bounce">{countInBeat}</div>
                  <div className="text-xs opacity-60 mt-2">Count-in beat ({bpm} BPM)</div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Live Note & Visualizer Strip */}
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-5">
                {/* Note Display Orb */}
                <div className={cn(
                  "w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex flex-col items-center justify-center border-2 transition-all shrink-0 relative overflow-hidden",
                  isRecording && liveNote
                    ? "bg-[#FF4E00] border-[#FF4E00] text-white shadow-xl shadow-[#FF4E00]/40 scale-105"
                    : isRecording
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse"
                      : resolvedTheme === 'dark'
                        ? "bg-white/5 border-white/10 text-slate-400"
                        : "bg-white border-slate-200 text-slate-600 shadow-sm"
                )}>
                  {isRecording && liveNote ? (
                    <>
                      <span className="text-3xl sm:text-4xl font-black tracking-tighter">{liveNote.note}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                        {Math.round(liveNote.freq)} Hz
                      </span>
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded-full mt-1",
                        Math.abs(liveNote.cents) < 12 ? "bg-emerald-500/30 text-emerald-100" : "bg-black/30 text-white"
                      )}>
                        {liveNote.cents > 0 ? `+${liveNote.cents}` : liveNote.cents}c
                      </span>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 opacity-50 text-center px-2">
                      <Mic className="w-6 h-6" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">
                        {isRecording ? "Listening..." : "Ready"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Live Waveform & Audio Meter */}
                <div className="flex-1 w-full space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                      <span className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        isRecording ? "bg-red-500 animate-ping" : "bg-slate-400"
                      )} />
                      {isRecording ? (inputMode === 'voice' ? "Listening to Voice / Humming" : "Recording Melody") : recordedNotes.length > 0 ? "Melody Captured" : "Standby"}
                    </span>
                    <span className="font-mono text-sm font-black">
                      {Math.floor(recordedDuration / 60)}:{(Math.floor(recordedDuration % 60)).toString().padStart(2, '0')}
                    </span>
                  </div>

                  {/* Frequency Spectrum / Audio Level Bar */}
                  <div className="h-8 rounded-xl bg-black/20 overflow-hidden flex items-end p-1 gap-0.5 border border-black/10 dark:border-white/10">
                    {spectrumData ? (
                      Array.from({ length: 32 }).map((_, i) => {
                        const step = Math.floor(spectrumData.length / 32);
                        const val = spectrumData[i * step] || 0;
                        const heightPct = Math.max(8, (val / 255) * 100);
                        return (
                          <div 
                            key={i} 
                            className="flex-1 bg-gradient-to-t from-[#FF4E00] to-amber-400 rounded-t-sm transition-all duration-75"
                            style={{ height: `${heightPct}%` }}
                          />
                        );
                      })
                    ) : (
                      <div className="w-full flex items-center justify-center text-[10px] uppercase font-bold tracking-widest opacity-40">
                        {isRecording ? "Listening to mic..." : "Press record to begin"}
                      </div>
                    )}
                  </div>

                  {/* Volume Level Bar */}
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 opacity-50 shrink-0" />
                    <div className="flex-1 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-75",
                          liveVolume > 80 ? "bg-red-500" : liveVolume > 35 ? "bg-[#FF4E00]" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(100, liveVolume)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono opacity-60 w-8 text-right">{liveVolume}%</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-3 shrink-0">
                {!isRecording ? (
                  <button
                    onClick={handleStart}
                    className="px-6 py-3.5 rounded-2xl bg-[#FF4E00] hover:bg-[#e04500] active:scale-95 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-[#FF4E00]/30 transition-all flex items-center gap-2.5 cursor-pointer"
                  >
                    <Mic className="w-5 h-5 animate-pulse" />
                    <span>{recordedNotes.length > 0 ? "Record Again" : "Start Recording"}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    className="px-7 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all flex items-center gap-2.5 animate-pulse cursor-pointer"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    <span>Stop & Quantize</span>
                  </button>
                )}

                {recordedNotes.length > 0 && !isRecording && (
                  <button
                    onClick={() => {
                      clearRecorded();
                      setTranscriptionResult(null);
                    }}
                    title="Clear Recording"
                    className={cn(
                      "p-3.5 rounded-2xl border transition-all text-xs font-bold uppercase cursor-pointer",
                      resolvedTheme === 'dark' 
                        ? "border-white/10 hover:bg-white/10 text-slate-300" 
                        : "border-slate-200 hover:bg-slate-200 text-slate-700"
                    )}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Live Captured Note Count Badges */}
            {recordedNotes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-60">Captured Notes ({recordedNotes.length}):</span>
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none">
                  {recordedNotes.slice(0, 16).map((n, i) => (
                    <span 
                      key={n.id || i} 
                      className="px-2 py-0.5 rounded-lg bg-orange-500/15 text-[#FF4E00] border border-orange-500/30 text-[10px] font-black uppercase shrink-0"
                    >
                      {n.noteName}
                    </span>
                  ))}
                  {recordedNotes.length > 16 && (
                    <span className="text-[10px] font-bold opacity-50">+{recordedNotes.length - 16} more</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Controls & Detection Settings */}
          <div className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-colors space-y-4",
            resolvedTheme === 'dark' ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
          )}>
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-[#FF4E00]" />
                Quantization & Detection Controls
              </span>
              {transcriptionResult && (
                <span className="text-emerald-500 flex items-center gap-1 font-bold">
                  <Check className="w-3.5 h-3.5" /> Auto-Quantized ({transcriptionResult.quantizedNotes.length} notes)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {/* Key Signature */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-[#FF4E00]" />
                  Key Signature
                </label>
                <select
                  value={selectedKey}
                  onChange={(e) => {
                    const k = e.target.value;
                    setSelectedKey(k);
                    if (recordedNotes.length > 0) {
                      handleRequantize(recordedNotes, k, selectedTimeSig, selectedGrid, bpm, minNoteDuration, inputMode, pitchStrategy);
                    }
                  }}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-colors outline-none",
                    resolvedTheme === 'dark' ? "bg-[#18191d] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                  )}
                >
                  <option value="auto">
                    {transcriptionResult ? `Auto (${transcriptionResult.keySignature.key})` : "Auto-Detect"}
                  </option>
                  {ALL_KEYS.map(k => (
                    <option key={k} value={k}>Key of {k}</option>
                  ))}
                </select>
              </div>

              {/* Time Signature */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#FF4E00]" />
                  Time Signature
                </label>
                <select
                  value={selectedTimeSig}
                  onChange={(e) => {
                    const ts = e.target.value as any;
                    setSelectedTimeSig(ts);
                    if (recordedNotes.length > 0) {
                      handleRequantize(recordedNotes, selectedKey, ts, selectedGrid, bpm, minNoteDuration, inputMode, pitchStrategy);
                    }
                  }}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-colors outline-none",
                    resolvedTheme === 'dark' ? "bg-[#18191d] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                  )}
                >
                  <option value="auto">
                    {transcriptionResult ? `Auto (${transcriptionResult.timeSignature.timeSignature})` : "Auto-Detect"}
                  </option>
                  <option value="4/4">4/4 Time</option>
                  <option value="3/4">3/4 Time (Waltz)</option>
                  <option value="2/4">2/4 Time (Polka/March)</option>
                  <option value="6/8">6/8 Time (Jig/Compound)</option>
                </select>
              </div>

              {/* Tempo / BPM */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Tempo (BPM)</label>
                  <span className="text-[10px] font-black text-[#FF4E00]">{bpm} BPM</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="2"
                  value={bpm}
                  onChange={(e) => {
                    const newBpm = parseInt(e.target.value, 10);
                    setBpm(newBpm);
                    if (recordedNotes.length > 0) {
                      handleRequantize(recordedNotes, selectedKey, selectedTimeSig, selectedGrid, newBpm, minNoteDuration, inputMode, pitchStrategy);
                    }
                  }}
                  className="w-full accent-[#FF4E00] cursor-pointer"
                />
              </div>

              {/* Grid Resolution */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
                  <Grid3X3 className="w-3 h-3 text-[#FF4E00]" />
                  Quantize Grid
                </label>
                <select
                  value={selectedGrid}
                  onChange={(e) => {
                    const g = e.target.value as any;
                    setSelectedGrid(g);
                    if (recordedNotes.length > 0) {
                      handleRequantize(recordedNotes, selectedKey, selectedTimeSig, g, bpm, minNoteDuration, inputMode, pitchStrategy);
                    }
                  }}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-colors outline-none",
                    resolvedTheme === 'dark' ? "bg-[#18191d] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                  )}
                >
                  <option value="auto">Auto Resolution</option>
                  <option value="1/16">1/16 Note (Sixteenth)</option>
                  <option value="1/8">1/8 Note (Eighth)</option>
                  <option value="1/4">1/4 Note (Quarter)</option>
                  <option value="1/12">1/12 (Triplets)</option>
                </select>
              </div>
            </div>

            {/* Pitch & Drift Strategy Selector */}
            <div className={cn(
              "p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs",
              resolvedTheme === 'dark' ? "bg-black/20 border-white/5" : "bg-slate-100/70 border-slate-200"
            )}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#FF4E00] shrink-0" />
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80 block">Pitch & Key Drift Tracking:</span>
                  <span className="text-[9px] opacity-60">Compensates natural intonation drift in humming without perfect pitch</span>
                </div>
              </div>

              <select
                value={pitchStrategy}
                onChange={(e) => {
                  const strat = e.target.value as PitchTrackingStrategy;
                  setPitchStrategy(strat);
                  if (recordedNotes.length > 0) {
                    handleRequantize(recordedNotes, selectedKey, selectedTimeSig, selectedGrid, bpm, minNoteDuration, inputMode, strat);
                  }
                }}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg border text-[11px] font-bold tracking-tight outline-none transition-colors max-w-xs",
                  resolvedTheme === 'dark' ? "bg-[#18191d] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                )}
              >
                <option value="adaptive_drift">Adaptive Relative Drift (Recommended)</option>
                <option value="scale_aware">Scale-Aware Diatonic Snapping</option>
                <option value="relative_intervals">Strict Relative Intervals</option>
                <option value="absolute">Absolute A440 Pitch</option>
              </select>
            </div>

            {/* Secondary Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-black/5 dark:border-white/5 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-[11px]">
                  <input
                    type="checkbox"
                    checked={useMetronomeClick}
                    onChange={(e) => setUseMetronomeClick(e.target.checked)}
                    className="rounded accent-[#FF4E00]"
                  />
                  <span>Metronome Click Track</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-[11px]">
                  <input
                    type="checkbox"
                    checked={useCountIn}
                    onChange={(e) => setUseCountIn(e.target.checked)}
                    className="rounded accent-[#FF4E00]"
                  />
                  <span>1-Bar Count-in</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Mic Sensitivity:</span>
                <input
                  type="range"
                  min="0.4"
                  max="1.8"
                  step="0.1"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="w-20 accent-[#FF4E00] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Transcribed Score Preview */}
          {transcriptionResult && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Score Header Title & Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <span className="text-xs font-bold uppercase opacity-60">Score Title:</span>
                  <input
                    type="text"
                    value={scoreTitle}
                    onChange={(e) => {
                      setScoreTitle(e.target.value);
                      if (recordedNotes.length > 0) {
                        handleRequantize(recordedNotes, selectedKey, selectedTimeSig, selectedGrid, bpm, minNoteDuration, inputMode, pitchStrategy, e.target.value);
                      }
                    }}
                    className={cn(
                      "px-3 py-1 rounded-xl border text-xs font-black uppercase tracking-tight flex-1 min-w-[180px] max-w-sm outline-none transition-colors",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}
                    placeholder="Enter melody title..."
                  />

                  {/* Intonation Drift Badge */}
                  {transcriptionResult.driftCents !== undefined && Math.abs(transcriptionResult.driftCents) > 3 && (
                    <span 
                      title="Cumulative key intonation drift compensated during transcription"
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{transcriptionResult.driftCents > 0 ? `+${transcriptionResult.driftCents}` : transcriptionResult.driftCents}¢ drift compensated</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Play Synthesized Score Button */}
                  <button
                    onClick={handlePlaySynthesizedScore}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                      isPlayingScore
                        ? "bg-[#FF4E00] border-[#FF4E00] text-white shadow-lg shadow-[#FF4E00]/25"
                        : resolvedTheme === 'dark'
                          ? "border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
                          : "border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800"
                    )}
                  >
                    {isPlayingScore ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlayingScore ? "Pause Synth" : "Play Score"}</span>
                  </button>

                  {/* Play Original Mic Audio */}
                  {audioUrl && (
                    <button
                      onClick={() => {
                        if (audioPlayerRef.current) {
                          if (audioPlayerRef.current.paused) {
                            audioPlayerRef.current.play();
                          } else {
                            audioPlayerRef.current.pause();
                          }
                        }
                      }}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                        resolvedTheme === 'dark'
                          ? "border-white/10 bg-white/5 hover:bg-white/10 text-slate-200"
                          : "border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800"
                      )}
                    >
                      <Mic className="w-3.5 h-3.5 text-[#FF4E00]" />
                      <span>Original Audio</span>
                    </button>
                  )}
                  {audioUrl && <audio ref={audioPlayerRef} src={audioUrl} className="hidden" />}

                  {/* Tab switchers */}
                  <div className={cn(
                    "flex items-center p-0.5 rounded-xl border",
                    resolvedTheme === 'dark' ? "border-white/10 bg-black/30" : "border-slate-200 bg-slate-100"
                  )}>
                    <button
                      onClick={() => setActiveTab('notation')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                        activeTab === 'notation' 
                          ? "bg-[#FF4E00] text-white shadow-sm" 
                          : "opacity-60 hover:opacity-100"
                      )}
                    >
                      Notation
                    </button>
                    <button
                      onClick={() => setActiveTab('source')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                        activeTab === 'source' 
                          ? "bg-[#FF4E00] text-white shadow-sm" 
                          : "opacity-60 hover:opacity-100"
                      )}
                    >
                      ABC Code
                    </button>
                  </div>
                </div>
              </div>

              {/* Sheet Music / Code Display Canvas */}
              <div className={cn(
                "p-4 sm:p-6 rounded-3xl border min-h-[160px] flex items-center justify-center overflow-x-auto",
                resolvedTheme === 'dark' ? "bg-[#18191d] border-white/10" : "bg-white border-slate-200 shadow-sm"
              )}>
                {activeTab === 'notation' ? (
                  <div ref={abcContainerRef} className="w-full flex justify-center py-2" />
                ) : (
                  <pre className="w-full font-mono text-xs p-3 rounded-xl bg-black/30 text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                    {transcriptionResult.abc}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={cn(
          "flex flex-wrap items-center justify-between px-5 sm:px-7 py-4 border-t shrink-0 gap-3",
          resolvedTheme === 'dark' ? "border-white/10 bg-white/5" : "border-slate-100 bg-slate-50"
        )}>
          <div className="flex items-center gap-2">
            {transcriptionResult && (
              <>
                <button
                  onClick={handleCopyAbc}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                    resolvedTheme === 'dark' ? "border-white/10 hover:bg-white/10" : "border-slate-200 hover:bg-slate-200"
                  )}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy ABC"}</span>
                </button>

                <button
                  onClick={handleDownloadAbc}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                    resolvedTheme === 'dark' ? "border-white/10 hover:bg-white/10" : "border-slate-200 hover:bg-slate-200"
                  )}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export .abc</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={cn(
                "px-4 py-2 rounded-xl border text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer",
                resolvedTheme === 'dark' ? "border-white/10 hover:bg-white/10 text-slate-300" : "border-slate-200 hover:bg-slate-200 text-slate-700"
              )}
            >
              Cancel
            </button>

            <button
              onClick={handleCreateScore}
              disabled={!transcriptionResult || transcriptionResult.quantizedNotes.length === 0}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2",
                transcriptionResult && transcriptionResult.quantizedNotes.length > 0
                  ? "bg-[#FF4E00] hover:bg-[#e04500] text-white shadow-lg shadow-[#FF4E00]/25 active:scale-95 cursor-pointer"
                  : "bg-slate-500/20 text-slate-400 cursor-not-allowed opacity-50"
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Score</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
