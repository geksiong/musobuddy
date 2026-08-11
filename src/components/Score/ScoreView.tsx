/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Image as ImageIcon, 
  Search, 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Minimize2,
  Trash2,
  FileCode,
  Layout,
  Library,
  Music,
  RefreshCw,
  Upload,
  ChevronLeft,
  ChevronRight,
  Columns,
  Square,
  Scroll,
  Play,
  Square as Stop,
  Drum,
  Waves,
  Piano,
  Download,
  Sliders,
  Compass
} from 'lucide-react';
import { ScoreFormat, ScoreData } from './types.ts';
import { TUNINGS } from './constants.ts';
import { AbcRenderer } from './AbcRenderer.tsx';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useScores } from '../../contexts/ScoreContext.tsx';
import { useMetronome } from '../../hooks/useMetronome.ts';
import { useDrone } from '../../hooks/useDrone.ts';
import { useAccompaniment } from '../../contexts/AccompanimentContext.tsx';
import ScoreAudioPlayer from './ScoreAudioPlayer.tsx';
import * as abcjs from 'abcjs';
import CodeMirror from '@uiw/react-codemirror';
import { abc } from '../../lib/abcLanguage.ts';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { transposeAbc } from '../../lib/abcTransposer.ts';
import { toAbcNoteName, generateMidiForAbc, parseAbcItems } from '../../lib/abcUtils.ts';
import { detectAbcRenderer } from '../../lib/abcDetector.ts';

// Lazy load complex components
const PdfRenderer = React.lazy(() => import('./PdfRenderer'));
const MusicXmlRenderer = React.lazy(() => import('./MusicXmlRenderer'));

export default function ScoreView() {
  const { scores, setScores, activeScoreId, setActiveScoreId, globalAudio, setGlobalAudio, loadFiles, exportActiveScore, playbackTime, isDistractionFree, toggleDistractionFree } = useScores();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme } = useTheme();

  const handleTransposeInternal = (semitones: number) => {
    const score = scores.find(s => s.id === activeScoreId);
    if (!score || score.format !== ScoreFormat.ABC) return;

    const newContent = transposeAbc(score.content as string, semitones);
    
    // Cleanup old blob if it was generated
    if (score.audioUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(score.audioUrl);
    }

    const targetTuneIndex = score.selectedTuneIndex || 0;
    const targetTranspose = (score.transpose || 0) + semitones;
    // We pass 0 here because newContent is already transposed via transposeAbc
    const midiUrl = generateMidiForAbc(newContent, targetTuneIndex, 0);

    const updates: Partial<ScoreData> = { 
      content: newContent,
      transpose: targetTranspose
    };

    if (midiUrl) {
      updates.audioUrl = midiUrl;
      updates.audioName = `${score.title || 'score'}.mid`;
    }

    updateActiveScore(updates);
  };

  // Integration Contexts
  const { isPlaying: isMetronomePlaying, start: startMetronome, stop: stopMetronome } = useMetronome();
  const { isDronePlaying, setIsDronePlaying } = useDrone();
  const { isPlaying: isAccompanimentPlaying, setIsPlaying: setIsAccompanimentPlaying } = useAccompaniment();

  const getAbcTuneTitles = useCallback((abc: string) => {
    try {
      if (!abc || typeof abc !== 'string') return ['Tune 1'];
      const items = parseAbcItems(abc);
      if (items.length > 0) {
        return items.map(item => item.title);
      }
      return ['Tune 1'];
    } catch (err) {
      console.error('Failed to parse ABC titles:', err);
      return ['Tune 1'];
    }
  }, []);

  // Ensure activeScoreId is valid if scores exist
  useEffect(() => {
    if (!activeScoreId && scores.length > 0) {
      setActiveScoreId(scores[0].id);
    }
  }, [activeScoreId, scores, setActiveScoreId]);

  // Auto-activate audio engine for loaded score if audioUrl is missing (e.g. after refresh/initial load)
  useEffect(() => {
    const currentScore = scores.find(s => s.id === activeScoreId) || scores[0];
    if (
      currentScore &&
      (currentScore.format === ScoreFormat.ABC || (typeof currentScore.content === 'string' && currentScore.content.includes('X:'))) &&
      (!currentScore.audioUrl || currentScore.audioUrl === '')
    ) {
      const midiUrl = generateMidiForAbc(
        currentScore.content as string,
        currentScore.selectedTuneIndex || 0,
        currentScore.transpose || 0
      );
      if (midiUrl) {
        setScores(prev => prev.map(s => s.id === currentScore.id ? {
          ...s,
          audioUrl: midiUrl,
          audioName: `${s.title || 'score'}.mid`
        } : s));
      }
    }
  }, [activeScoreId, scores, setScores]);

  const currentAbcScore = scores.find(s => s.id === activeScoreId);

  useEffect(() => {
    if (!currentAbcScore || currentAbcScore.format !== ScoreFormat.ABC) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        (activeEl as HTMLElement).isContentEditable
      )) {
        return;
      }

      const titles = getAbcTuneTitles(currentAbcScore.content as string);
      if (titles.length <= 1) return;

      const currentIndex = currentAbcScore.selectedTuneIndex || 0;

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          setScores(prev => prev.map(s => s.id === currentAbcScore.id ? { ...s, selectedTuneIndex: currentIndex - 1 } : s));
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (currentIndex < titles.length - 1) {
          setScores(prev => prev.map(s => s.id === currentAbcScore.id ? { ...s, selectedTuneIndex: currentIndex + 1 } : s));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAbcScore, getAbcTuneTitles, setScores]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    loadFiles(files);
  }, [loadFiles]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const addScore = (format: ScoreFormat) => {
    const id = Math.random().toString(36).substr(2, 9);
    const initialContent = format === ScoreFormat.ABC ? 'X:1\nT:Untitled\nM:4/4\nK:C\nC D E F | G A B c |' : '';
    const midiUrl = format === ScoreFormat.ABC ? generateMidiForAbc(initialContent, 0) : null;
    const newScore: ScoreData = {
      id,
      title: 'Untitled Score',
      format,
      content: initialContent,
      zoom: 1,
      pan: { x: 0, y: 0 },
      viewMode: 'scroll',
      showEditor: false,
      selectedTuneIndex: 0,
      audioUrl: midiUrl || undefined,
      audioName: midiUrl ? 'rendering.mid' : undefined
    };
    setScores([...scores, newScore]);
    setActiveScoreId(id);
  };

  const deleteScore = (id: string) => {
    setScores(prev => {
      const newScores = prev.filter(s => s.id !== id);
      if (activeScoreId === id) {
        setActiveScoreId(newScores.length > 0 ? newScores[0].id : null);
      }
      return newScores;
    });
  };

  const handleDownload = () => {
    exportActiveScore();
  };

  const updateActiveScore = (updates: Partial<ScoreData>) => {
    // Clear manual audio override when updating core ABC properties or explicit audio
    const s = scores.find(score => score.id === activeScoreId);
    if (s && s.format === ScoreFormat.ABC) {
      const contentChanged = updates.content !== undefined && updates.content !== s.content;
      const tuneChanged = updates.selectedTuneIndex !== undefined && updates.selectedTuneIndex !== s.selectedTuneIndex;
      const audioUpdated = updates.audioUrl !== undefined;
      
      if (contentChanged || tuneChanged || audioUpdated) {
        setGlobalAudio(null);
      }
    }

    setScores(scores.map(s => {
      if (s.id === activeScoreId) {
        const updated = { ...s, ...updates };
        
        // Regenerate MIDI if ABC content or selectedTuneIndex or transpose changed
        const contentChanged = s.format === ScoreFormat.ABC && updates.content !== undefined && updates.content !== s.content;
        const tuneChanged = s.format === ScoreFormat.ABC && updates.selectedTuneIndex !== undefined && updates.selectedTuneIndex !== s.selectedTuneIndex;
        const transposeChanged = s.format === ScoreFormat.ABC && updates.transpose !== undefined && updates.transpose !== s.transpose;

        if (contentChanged || tuneChanged || transposeChanged) {
          // Cleanup old blob if it was generated
          if (s.audioUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(s.audioUrl);
          }

          const targetTuneIndex = updates.selectedTuneIndex !== undefined ? updates.selectedTuneIndex : (s.selectedTuneIndex || 0);
          const targetTranspose = updates.transpose !== undefined ? updates.transpose : (s.transpose || 0);
          const midiUrl = generateMidiForAbc(updated.content as string, targetTuneIndex, targetTranspose);
          if (midiUrl) {
            updated.audioUrl = midiUrl;
            updated.audioName = `${updated.title || 'score'}.mid`;
          }
        }
        return updated;
      }
      return s;
    }));
  };

  const activeScore = scores.find(s => s.id === activeScoreId) || scores[0];

  return (
    <div className="h-full flex-1 flex flex-col px-2 sm:px-4 md:px-6 pt-2 sm:pt-4 md:pt-6 pb-0 relative overflow-hidden min-h-0">
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden">
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex-1 rounded-t-2xl rounded-b-none border border-b-0 flex flex-col overflow-hidden backdrop-blur-sm relative transition-all min-h-0",
            resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl",
            isDragging && "ring-4 ring-orange-500 ring-inset bg-orange-500/5"
          )}
        >
          {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-orange-500/10 backdrop-blur-sm">
              <div className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl animate-bounce">
                Drop Score Files Here
              </div>
            </div>
          )}
          {ScoreDisplay && (
            <ScoreDisplay 
              score={activeScore} 
              onUpdate={updateActiveScore}
              onDelete={() => activeScore && deleteScore(activeScore.id)}
              onDownload={handleDownload}
              onTranspose={handleTransposeInternal}
              getAbcTuneTitles={getAbcTuneTitles}
              playbackTime={playbackTime}
              onReloadMidi={() => {
                if (activeScore && activeScore.format === ScoreFormat.ABC) {
                  const midiUrl = generateMidiForAbc(
                    activeScore.content as string, 
                    activeScore.selectedTuneIndex || 0,
                    activeScore.transpose || 0
                  );
                  if (midiUrl) {
                    if (activeScore.audioUrl?.startsWith('blob:')) {
                      URL.revokeObjectURL(activeScore.audioUrl);
                    }
                    updateActiveScore({
                      audioUrl: midiUrl,
                      audioName: `${activeScore.title || 'score'}.mid`
                    });
                  }
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreIcon({ format }: { format: ScoreFormat }) {
  switch (format) {
    case ScoreFormat.ABC: return <FileCode className="w-4 h-4" />;
    case ScoreFormat.Image: return <ImageIcon className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
}

function ScoreDisplay({ 
  score, 
  onUpdate, 
  onDelete,
  onDownload,
  onTranspose,
  getAbcTuneTitles,
  onReloadMidi,
  playbackTime
}: { 
  score?: ScoreData, 
  onUpdate: (u: Partial<ScoreData>) => void, 
  onDelete: () => void,
  onDownload: () => void,
  onTranspose: (semitones: number) => void,
  getAbcTuneTitles: (abc: string) => string[],
  onReloadMidi: () => void,
  playbackTime: number
}) {
  const { resolvedTheme } = useTheme();
  const { exportActiveScore, isDistractionFree, toggleDistractionFree } = useScores();
  
  if (!score) return (
    <div className={cn("flex-1 flex flex-col items-center justify-center gap-4 transition-colors", resolvedTheme === 'dark' ? "text-white/10" : "text-slate-200")}>
      <Library className="w-16 h-16 opacity-5 mb-4" />
      <div className="text-center">
        <p className="text-xs uppercase font-black tracking-[0.4em] opacity-40">No Score Selected</p>
        <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-20 mt-2">Create a new score or load a file from top nav</p>
      </div>
    </div>
  );

  const viewMode = score.viewMode || 'scroll';
  const detectedResult = score.format === ScoreFormat.ABC ? detectAbcRenderer(score.content as string) : null;
  const [headerExtra, setHeaderExtra] = useState<React.ReactNode | null>(null);
  const [sidebarState, setSidebarState] = useState<{ isOpen: boolean; toggle: () => void } | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(112);
  const [scoreViewHeight, setScoreViewHeight] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const scoreViewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHeaderExtra(null);
    setSidebarState(null);
  }, [score?.id, score?.format]);

  useEffect(() => {
    const updateMetrics = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
      if (scoreViewRef.current) {
        setScoreViewHeight(scoreViewRef.current.clientHeight);
      }
    };
    updateMetrics();
    const observer = new ResizeObserver(updateMetrics);
    if (headerRef.current) observer.observe(headerRef.current);
    if (scoreViewRef.current) observer.observe(scoreViewRef.current);
    return () => observer.disconnect();
  }, [headerExtra, score?.format, score?.id]);

  return (
    <div ref={scoreViewRef} className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative min-h-0 h-full">
      {/* Floating HUD for No Distraction mode */}
      {isDistractionFree && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 sm:gap-3.5 px-3.5 sm:px-5 py-2 bg-black/90 backdrop-blur-2xl border border-white/20 text-white rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all hover:opacity-100 opacity-90 max-w-[95vw]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider truncate max-w-[120px] sm:max-w-[260px]">
              {score.title || "UNTITLED SCORE"}
            </span>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0 hidden sm:inline-block">
              No Distraction
            </span>
          </div>

          <div className="h-4 w-[1px] bg-white/20 shrink-0" />

          {/* View Mode Selector */}
          {(score.format === ScoreFormat.Image || score.format === ScoreFormat.PDF) && (
            <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-xl shrink-0">
              <button 
                onClick={() => onUpdate({ viewMode: 'scroll' })}
                className={cn("p-1.5 rounded-lg transition-all", viewMode === 'scroll' ? "bg-orange-500 text-white" : "text-white/60 hover:text-white")}
                title="Continuous Scroll Mode"
              >
                <Scroll className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => onUpdate({ viewMode: 'single' })}
                className={cn("p-1.5 rounded-lg transition-all", viewMode === 'single' ? "bg-orange-500 text-white" : "text-white/60 hover:text-white")}
                title="Single Page Mode (Use ←/→ or PgUp/PgDn to flip)"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => onUpdate({ viewMode: 'double' })}
                className={cn("p-1.5 rounded-lg transition-all", viewMode === 'double' ? "bg-orange-500 text-white" : "text-white/60 hover:text-white")}
                title="Double Page Mode (Use ←/→ or PgUp/PgDn to flip)"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 bg-white/10 p-0.5 rounded-xl shrink-0">
            <button 
              onClick={() => onUpdate({ zoom: Math.max(0.1, Math.round(((score.zoom || 1) - 0.1) * 10) / 10) })}
              className="p-1.5 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out (Min 10%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onUpdate({ zoom: 1 })}
              className="px-1.5 text-[10px] font-black tabular-nums text-white/90 hover:text-orange-400 transition-colors cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {Math.round((score.zoom || 1) * 100)}%
            </button>
            <button 
              onClick={() => onUpdate({ zoom: Math.min(5, Math.round(((score.zoom || 1) + 0.1) * 10) / 10) })}
              className="p-1.5 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Zoom In (Max 500%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exit Button */}
          <button
            onClick={toggleDistractionFree}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-black text-[10px] font-black uppercase tracking-wider rounded-full transition-all shadow-lg active:scale-95 cursor-pointer shrink-0"
            title="Exit No Distraction Mode (Press Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit (Esc)</span>
          </button>
        </div>
      )}

      {/* Toolbar */}
      {!isDistractionFree && (
        <div 
          ref={headerRef}
          className={cn(
            "sticky top-0 z-30 px-3 sm:px-5 py-2 sm:py-2.5 flex flex-col border-b transition-all gap-2 backdrop-blur-xl shrink-0 shadow-sm",
            resolvedTheme === 'dark' ? "border-white/10 bg-[#121215]/95 text-white" : "border-black/10 bg-white/95 text-slate-900"
          )}
        >
          {/* First Row: Title, Pagination mode (if available), Zoom, No Distraction, Save, Close */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 w-full min-w-0">
            <div className="flex items-center min-w-0 flex-1">
              <input 
                value={score.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                className={cn(
                  "w-full bg-transparent text-lg sm:text-2xl font-black focus:outline-none uppercase tracking-tighter italic transition-colors py-0.5 min-w-[120px]",
                  resolvedTheme === 'dark' ? "text-white placeholder:text-white/10" : "text-slate-900 placeholder:text-slate-200"
                )}
                placeholder="UNTITLED SCORE"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
              {/* Pagination Mode Selector (if available) */}
              {(score.format === ScoreFormat.Image || score.format === ScoreFormat.PDF) && (
                <div className={cn("flex p-1 rounded-xl border transition-colors shrink-0", resolvedTheme === 'dark' ? "bg-black/20 border-white/5" : "bg-slate-100 border-black/5")}>
                  <button 
                    onClick={() => onUpdate({ viewMode: 'scroll' })}
                    className={cn("p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer", viewMode === 'scroll' ? (resolvedTheme === 'dark' ? "bg-white/10 text-white" : "bg-white text-slate-900 shadow-sm") : "text-slate-400")}
                    title="Continuous Scroll Mode"
                  >
                    <Scroll className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onUpdate({ viewMode: 'single' })}
                    className={cn("p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer", viewMode === 'single' ? (resolvedTheme === 'dark' ? "bg-white/10 text-white" : "bg-white text-slate-900 shadow-sm") : "text-slate-400")}
                    title="Single Page Mode"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onUpdate({ viewMode: 'double' })}
                    className={cn("p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer", viewMode === 'double' ? (resolvedTheme === 'dark' ? "bg-white/10 text-white" : "bg-white text-slate-900 shadow-sm") : "text-slate-400")}
                    title="Double Page Mode"
                  >
                    <Columns className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              <div className={cn("flex items-center p-1 rounded-xl border transition-colors shrink-0", resolvedTheme === 'dark' ? "bg-black/20 border-white/5" : "bg-slate-100 border-black/5")}>
                <button 
                  onClick={() => onUpdate({ zoom: Math.max(0.1, Math.round(((score.zoom || 1) - 0.1) * 10) / 10) })}
                  className={cn("p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer", resolvedTheme === 'dark' ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-black/5")}
                  title="Zoom Out (Min 10%)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onUpdate({ zoom: 1 })}
                  className={cn(
                    "px-2 text-[10px] font-black tabular-nums transition-colors hover:text-orange-500 cursor-pointer",
                    resolvedTheme === 'dark' ? "text-white/70" : "text-slate-600"
                  )}
                  title="Reset Zoom to 100%"
                >
                  {Math.round((score.zoom || 1) * 100)}%
                </button>
                <button 
                  onClick={() => onUpdate({ zoom: Math.min(5, Math.round(((score.zoom || 1) + 0.1) * 10) / 10) })}
                  className={cn("p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer", resolvedTheme === 'dark' ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-black/5")}
                  title="Zoom In (Max 500%)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* No Distraction Button */}
              <button 
                onClick={toggleDistractionFree}
                className={cn(
                  "p-2 rounded-xl border transition-all flex items-center gap-1.5 px-3 shadow-sm group active:scale-95 cursor-pointer shrink-0",
                  isDistractionFree 
                    ? "bg-orange-500 border-orange-500 text-white font-bold" 
                    : (resolvedTheme === 'dark' ? "bg-black/20 border-white/10 text-orange-400 hover:text-white" : "bg-white border-black/10 text-orange-600 hover:text-slate-900")
                )}
                title="No Distraction Mode (Full screen view)"
              >
                <Maximize2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">No Distraction</span>
              </button>

              {/* Save Button(s) */}
              {score.format === ScoreFormat.MusicXML ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => exportActiveScore(true)}
                    className={cn(
                      "p-2 rounded-xl border transition-all flex items-center gap-1.5 px-3 shadow-sm group active:scale-95 cursor-pointer",
                      score.isMxl 
                        ? "bg-orange-500/20 border-orange-500/50 text-orange-400 font-bold" 
                        : (resolvedTheme === 'dark' ? "bg-black/20 border-white/10 text-white/50 hover:text-white" : "bg-white border-black/10 text-slate-500 hover:text-slate-900")
                    )}
                    title="Save as Compressed MusicXML (.mxl)"
                  >
                    <Download className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Save .MXL</span>
                  </button>

                  <button 
                    onClick={() => exportActiveScore(false)}
                    className={cn(
                      "p-2 rounded-xl border transition-all flex items-center gap-1.5 px-3 shadow-sm group active:scale-95 cursor-pointer",
                      !score.isMxl 
                        ? "bg-orange-500/20 border-orange-500/50 text-orange-400 font-bold" 
                        : (resolvedTheme === 'dark' ? "bg-black/20 border-white/10 text-white/50 hover:text-white" : "bg-white border-black/10 text-slate-500 hover:text-slate-900")
                    )}
                    title="Save as Standard MusicXML (.xml)"
                  >
                    <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Save .XML</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={onDownload}
                  className={cn(
                    "p-2 rounded-xl border transition-all flex items-center gap-2 px-3 shadow-sm group active:scale-95 cursor-pointer shrink-0",
                    resolvedTheme === 'dark' ? "bg-black/20 border-white/10 text-white/40 hover:text-white" : "bg-white border-black/10 text-slate-400 hover:text-slate-900"
                  )}
                  title="Save Score"
                >
                  <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Save</span>
                </button>
              )}

              {/* Close Button */}
              <button 
                onClick={onDelete}
                className="p-2 rounded-xl border border-red-500/10 text-red-500/30 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all shadow-sm active:scale-95 group cursor-pointer shrink-0"
                title="Close Score"
              >
                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* Subsequent Row: Format Badge and Format-Specific Controls */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1.5 border-t border-black/5 dark:border-white/10 w-full">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
              {/* Format Badge Indicator */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
                  {score.format === ScoreFormat.MusicXML ? (score.isMxl ? 'MUSICXML (.MXL)' : 'MUSICXML (.XML)') : `${score.format} MODE`}
                </span>
              </div>

              {/* Sidebar Toggle for PDF */}
              {score.format === ScoreFormat.PDF && sidebarState && (
                <button 
                  onClick={sidebarState.toggle}
                  className={cn(
                    "p-1.5 sm:p-2 rounded-xl border transition-all flex items-center gap-1.5 px-3 shadow-sm group active:scale-95 cursor-pointer shrink-0",
                    sidebarState.isOpen 
                      ? "bg-orange-500 border-orange-500 text-white font-bold" 
                      : (resolvedTheme === 'dark' ? "bg-black/20 border-white/10 text-orange-400 hover:text-white" : "bg-white border-black/10 text-orange-600 hover:text-slate-900")
                  )}
                  title={sidebarState.isOpen ? "Close Sidebar" : "Open Navigation Sidebar"}
                >
                  <Compass className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Sidebar</span>
                </button>
              )}

              {/* ABC Specific Controls */}
              {score.format === ScoreFormat.ABC && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
                  {/* Tune Picker */}
                  <div className="flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <div className="flex items-center gap-1 group">
                      <select 
                        value={score.selectedTuneIndex || 0}
                        onChange={(e) => {
                          onUpdate({ selectedTuneIndex: parseInt(e.target.value) });
                          e.target.blur();
                          setTimeout(() => e.target.blur(), 0);
                        }}
                        className={cn(
                          "bg-transparent text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-orange-500 transition-colors py-1",
                          resolvedTheme === 'dark' ? "text-white/60" : "text-slate-500"
                        )}
                      >
                        {getAbcTuneTitles(score.content as string).map((title, i) => (
                          <option key={i} value={i} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                            {title}
                          </option>
                        ))}
                      </select>
                      
                      <button 
                        onClick={onReloadMidi}
                        title="Reload MIDI"
                        className="p-1.5 hover:text-orange-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Transpose Control */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className={cn("text-[7px] font-black uppercase tracking-widest opacity-30 mb-0.5", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>Transpose</span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => onTranspose(-1)}
                          className={cn("p-1 hover:text-orange-500 transition-colors", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <select
                          value={score.transpose || 0}
                          onChange={(e) => {
                            onTranspose(parseInt(e.target.value) - (score.transpose || 0));
                            e.target.blur();
                            setTimeout(() => e.target.blur(), 0);
                          }}
                          className={cn(
                            "bg-transparent text-[11px] font-black tabular-nums outline-none cursor-pointer hover:text-orange-500 transition-colors appearance-none",
                            resolvedTheme === 'dark' ? "text-white/80" : "text-slate-700"
                          )}
                        >
                          {Array.from({ length: 35 }, (_, i) => 17 - i).map(val => (
                            <option key={val} value={val} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                              {val > 0 ? `+${val}` : val}
                            </option>
                          ))}
                        </select>
                        <button 
                          onClick={() => onTranspose(1)}
                          className={cn("p-1 hover:text-orange-500 transition-colors", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Instrument Picker */}
                  <div className="flex flex-col">
                    <span className={cn("text-[7px] font-black uppercase tracking-widest opacity-30 mb-0.5", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>Instrument</span>
                    <select 
                      value={score.tablature || 'none'}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        const defaultTuning = val !== 'none' ? TUNINGS[val]?.[0]?.value : [];
                        onUpdate({ tablature: val, tuning: defaultTuning });
                        e.target.blur();
                        setTimeout(() => e.target.blur(), 0);
                      }}
                      className={cn(
                        "bg-transparent text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-orange-500 transition-colors",
                        resolvedTheme === 'dark' ? "text-white/60" : "text-slate-500"
                      )}
                    >
                      <option value="none" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>Score Only</option>
                      <option value="guitar" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>Guitar</option>
                      <option value="ukulele" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>Ukulele</option>
                      <option value="mandolin" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>Mandolin</option>
                      <option value="banjo" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>Banjo</option>
                      <option value="violin" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>Violin / Fiddle</option>
                    </select>
                  </div>

                  {/* Tuning Picker */}
                  {score.tablature && score.tablature !== 'none' && (
                    <div className="flex flex-col">
                      <span className={cn("text-[7px] font-black uppercase tracking-widest opacity-30 mb-0.5", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>Tuning</span>
                      <select 
                        value={JSON.stringify((score.tuning || []).map(toAbcNoteName))}
                        onChange={(e) => {
                          onUpdate({ tuning: JSON.parse(e.target.value) });
                          e.target.blur();
                          setTimeout(() => e.target.blur(), 0);
                        }}
                        className={cn(
                          "bg-transparent text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-orange-500 transition-colors",
                          resolvedTheme === 'dark' ? "text-white/60" : "text-slate-500"
                        )}
                      >
                        {(TUNINGS[score.tablature] || []).map((t, i) => (
                          <option key={i} value={JSON.stringify(t.value)} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Renderer Picker & Detector Status */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className={cn("text-[7px] font-black uppercase tracking-widest opacity-30 mb-0.5", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>Engine</span>
                      {detectedResult?.renderer === 'abc2svg' && (
                        <span 
                          className="text-[8px] bg-orange-500/20 text-orange-400 font-bold px-1 rounded-full cursor-help tracking-tight" 
                          title={`abcm2ps directives detected: ${detectedResult.reasons.join(', ')}`}
                        >
                          abcm2ps
                        </span>
                      )}
                    </div>
                    <select 
                      value={score.abcRenderer || 'auto'}
                      onChange={(e) => {
                        onUpdate({ abcRenderer: e.target.value as 'auto' | 'abcjs' | 'abc2svg' });
                        e.target.blur();
                        setTimeout(() => e.target.blur(), 0);
                      }}
                      className={cn(
                        "bg-transparent text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-orange-500 transition-colors",
                        resolvedTheme === 'dark' ? "text-white/80" : "text-slate-700"
                      )}
                      title={
                        score.abcRenderer && score.abcRenderer !== 'auto'
                          ? `Manual renderer choice: ${score.abcRenderer}`
                          : `Auto-detected: ${detectedResult?.renderer} (${detectedResult?.reasons.join('; ')})`
                      }
                    >
                      <option value="auto" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                        Auto ({detectedResult?.renderer || 'abcjs'})
                      </option>
                      <option value="abcjs" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                        abcjs (Traditional)
                      </option>
                      <option value="abc2svg" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                        abc2svg (abcm2ps)
                      </option>
                    </select>
                  </div>

                  {/* Code Editor Toggle Button */}
                  <button 
                    onClick={() => onUpdate({ showEditor: !score.showEditor })}
                    className={cn(
                      "p-1.5 sm:p-2 rounded-xl border transition-all flex items-center gap-2 px-3 shadow-sm group active:scale-95 cursor-pointer shrink-0",
                      score.showEditor 
                        ? "bg-orange-500 border-orange-500 text-white font-bold" 
                        : (resolvedTheme === 'dark' ? "bg-black/20 border-white/10 text-white/40 hover:text-white" : "bg-white border-black/10 text-slate-400 hover:text-slate-900")
                    )}
                    title={score.showEditor ? "Hide Editor" : "Show Editor"}
                  >
                    <Layout className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{score.showEditor ? 'Hide' : 'Code'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Header Extra Slot (Annotation Toolbar for PDF) */}
          {headerExtra && (
            <div className="pt-1.5 border-t border-black/5 dark:border-white/10 min-w-0 w-full">
              {headerExtra}
            </div>
          )}
        </div>
      )}
      {/* Rendering Area */}
      <div className={cn("flex-1 relative", score.format === ScoreFormat.PDF ? "p-0" : "p-4 sm:p-8 pb-4 sm:pb-6")}>
        {((score.format === ScoreFormat.PDF || score.format === ScoreFormat.Image) && !score.content) ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", resolvedTheme === 'dark' ? "bg-white/5 text-white/20" : "bg-slate-100 text-slate-300")}>
              <Upload className="w-8 h-8" />
            </div>
            <h2 className={cn("text-xl font-black uppercase tracking-tighter italic mb-2", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>File session expired</h2>
            <p className={cn("text-xs uppercase font-bold tracking-widest max-w-xs leading-relaxed", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
              Cloud-less sessions expire on reload for PDF and Image files. Please re-upload your document.
            </p>
            <button 
              className="mt-8 px-6 py-3 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-400 transition-colors"
              onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
            >
              Re-upload File
            </button>
          </div>
        ) : (
          <React.Suspense fallback={<div className="flex items-center justify-center p-20 animate-pulse text-[10px] uppercase font-black tracking-widest">Initialising Renderer...</div>}>
            {score.format === ScoreFormat.PDF ? (
              <PdfRenderer 
                url={score.content as string} 
                viewMode={viewMode}
                scoreTitle={score.title}
                scoreId={score.id}
                zoom={score.zoom}
                headerHeight={headerHeight}
                scoreViewHeight={scoreViewHeight}
                onHeaderContentChange={setHeaderExtra}
                onSidebarStateChange={setSidebarState}
              />
            ) : (
              <div 
                className={cn(
                  "transition-transform",
                  score.format === ScoreFormat.Image && "w-full flex flex-col items-center justify-center",
                  viewMode === 'scroll' ? "flex flex-col gap-8" : "h-full"
                )}
                style={(score.format === ScoreFormat.Image || score.format === ScoreFormat.Text) ? { 
                  transform: `scale(${score.zoom})`, 
                  transformOrigin: score.format === ScoreFormat.Image ? 'top center' : 'top left' 
                } : undefined}
              >
                {score.format === ScoreFormat.ABC && (
                <div className="flex flex-col gap-8 w-full">
                  {score.showEditor && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative group w-full"
                    >
                      <div className="absolute -inset-0.5 bg-gradient-to-b from-orange-500/20 to-transparent rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                      <div className={cn(
                        "relative w-full rounded-xl overflow-hidden border transition-all shadow-inner",
                        resolvedTheme === 'dark' ? "border-white/10" : "border-black/5"
                      )}>
                        <CodeMirror
                          value={score.content as string}
                          height="300px"
                          theme={resolvedTheme === 'dark' ? vscodeDark : 'light'}
                          extensions={[abc()]}
                          onChange={(value) => onUpdate({ content: value })}
                          className="text-sm"
                          basicSetup={{
                            lineNumbers: true,
                            foldGutter: true,
                            highlightActiveLine: true,
                          }}
                        />
                      </div>
                      <div className={cn("absolute bottom-4 right-4 text-[9px] font-black uppercase tracking-[0.2em] pointer-events-none z-10", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>ABC Editor</div>
                    </motion.div>
                  )}

                  <div className={cn("rounded-2xl p-10 shadow-2xl overflow-x-auto min-h-[400px] transition-colors w-full", resolvedTheme === 'dark' ? "bg-white text-black" : "bg-white text-black border border-black/5")}>
                    <AbcRenderer 
                      abc={score.content as string} 
                      tuneIndex={score.selectedTuneIndex || 0} 
                      transpose={0} // Text is already transposed
                      tablature={score.tablature || 'none'}
                      tuning={score.tuning || []}
                      currentTime={playbackTime}
                      rendererPreference={score.abcRenderer || 'auto'}
                      zoom={score.zoom || 1}
                    />
                  </div>
                </div>
              )}
              
              {score.format === ScoreFormat.Text && (
                <div className="max-w-3xl mx-auto pt-8">
                  <textarea 
                    value={score.content as string}
                    placeholder="TYPE CHORDS OR LYRICS HERE..."
                    onChange={(e) => onUpdate({ content: e.target.value })}
                    className={cn(
                      "w-full h-[800px] bg-transparent font-mono text-lg focus:outline-none whitespace-pre leading-relaxed transition-colors",
                      resolvedTheme === 'dark' ? "text-white/80 placeholder:text-white/5" : "text-slate-700 placeholder:text-slate-200"
                    )}
                    spellCheck={false}
                  />
                </div>
              )}

              {score.format === ScoreFormat.Image && (
                <ImageViewer 
                  content={score.content} 
                  viewMode={viewMode}
                  onRemove={() => onUpdate({ content: '' })}
                />
              )}

              {score.format === ScoreFormat.MusicXML && (
                <MusicXmlRenderer 
                  xml={score.content as string} 
                  zoom={score.zoom || 1}
                />
              )}
            </div>
          )}
        </React.Suspense>
        )}
      </div>
    </div>
  );
}

function ImageViewer({ content, viewMode, onRemove }: { content: string | string[], viewMode: string, onRemove: () => void }) {
  const images = Array.isArray(content) ? content : (content ? [content] : []);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (viewMode !== 'single' && viewMode !== 'double') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        (activeEl as HTMLElement).isContentEditable
      )) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setPage(p => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (viewMode === 'single') {
          setPage(p => Math.min(images.length - 1, p + 1));
        } else if (viewMode === 'double') {
          const maxSpreads = Math.floor((images.length - 1) / 2);
          setPage(p => Math.min(maxSpreads, p + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, images.length]);

  if (images.length === 0) return null;

  if (viewMode === 'scroll') {
    return (
      <div className="flex flex-col items-center gap-12 py-12">
        {images.map((img, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group max-w-full"
          >
            <img src={img} className="rounded-2xl shadow-2xl border border-white/10" />
            <button onClick={onRemove} className="absolute top-4 right-4 p-2 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          </motion.div>
        ))}
      </div>
    );
  }

  if (viewMode === 'single') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 relative">
        <div className="relative group max-w-full">
           <img src={images[page]} className="max-h-[80vh] rounded-2xl shadow-2xl" />
        </div>
        <div className="absolute bottom-8 flex items-center gap-6 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
          <button 
            disabled={page === 0} 
            onClick={() => setPage(page - 1)}
            className="disabled:opacity-20 text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">{page + 1} / {images.length}</span>
          <button 
            disabled={page === images.length - 1} 
            onClick={() => setPage(page + 1)}
            className="disabled:opacity-20 text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'double') {
    const p1 = page * 2;
    const p2 = page * 2 + 1;
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 relative">
        <div className="flex gap-4 items-center justify-center max-w-full">
          {images[p1] && <img src={images[p1]} className="max-h-[80vh] rounded-2xl shadow-2xl w-1/2 object-contain" />}
          {images[p2] && <img src={images[p2]} className="max-h-[80vh] rounded-2xl shadow-2xl w-1/2 object-contain" />}
        </div>
        <div className="absolute bottom-8 flex items-center gap-6 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
          <button 
            disabled={page === 0} 
            onClick={() => setPage(page - 1)}
            className="disabled:opacity-20 text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Page {p1 + 1}-{Math.min(p2 + 1, images.length)} / {images.length}</span>
          <button 
            disabled={p2 >= images.length - 1} 
            onClick={() => setPage(page + 1)}
            className="disabled:opacity-20 text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
