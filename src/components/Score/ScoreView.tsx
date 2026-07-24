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
  Trash2,
  FileCode,
  Layout,
  Library,
  Music,
  RefreshCw,
  Upload,
  PanelLeft,
  ChevronLeft,
  ChevronRight,
  Columns,
  Square,
  Scroll,
  Play,
  Square as Stop,
  Wind,
  Radio,
  Clock,
  Download
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
import { toAbcNoteName } from '../../lib/abcUtils.ts';

// Lazy load complex components
const PdfRenderer = React.lazy(() => import('./PdfRenderer.tsx'));
const MusicXmlRenderer = React.lazy(() => import('./MusicXmlRenderer.tsx'));

export default function ScoreView() {
  const { scores, setScores, activeScoreId, setActiveScoreId, globalAudio, setGlobalAudio } = useScores();
  const [isDragging, setIsDragging] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
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

  const generateMidiForAbc = useCallback((abc: string, tuneIndex: number = 0, transpose: number = 0) => {
    try {
      if (!abc || typeof abc !== 'string') return null;
      
      // Filter out any lines starting with %% (directives/comments) ONLY before the first tune
      let filteredAbc = abc;
      const firstXMatch = filteredAbc.match(/^X:/m);
      if (firstXMatch && firstXMatch.index !== undefined) {
        const header = filteredAbc.substring(0, firstXMatch.index);
        const rest = filteredAbc.substring(firstXMatch.index);
        filteredAbc = header.replace(/^%%[^\n]*\n?/gm, '') + rest;
      } else {
        filteredAbc = filteredAbc.replace(/^%%[^\n]*\n?/gm, '');
      }
      
      // Split into individual tunes to be more robust for tunebooks
      const tunes = filteredAbc.split(/(?=^X:)/m).filter(t => t.trim().includes('X:'));
      const targetAbc = tunes.length > tuneIndex ? tunes[tuneIndex] : filteredAbc;
      
      const div = document.createElement('div');
      const visualObjs = abcjs.renderAbc(div, targetAbc, {
        visualTranspose: transpose
      });
      
      if (visualObjs && visualObjs.length > 0) {
        const midiBuffer = abcjs.synth.getMidiFile(visualObjs[0], {
          midiOutputType: 'binary'
        }) as Uint8Array;
        const blob = new Blob([midiBuffer], { type: 'audio/midi' });
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.error('Failed to generate MIDI:', err);
    }
    return null;
  }, []);

  const getAbcTuneTitles = useCallback((abc: string) => {
    try {
      if (!abc || typeof abc !== 'string') return ['Tune 1'];
      
      // Filter out any lines starting with %% (directives/comments) ONLY before the first tune
      let filteredAbc = abc;
      const firstXMatch = filteredAbc.match(/^X:/m);
      if (firstXMatch && firstXMatch.index !== undefined) {
        const header = filteredAbc.substring(0, firstXMatch.index);
        const rest = filteredAbc.substring(firstXMatch.index);
        filteredAbc = header.replace(/^%%[^\n]*\n?/gm, '') + rest;
      } else {
        filteredAbc = filteredAbc.replace(/^%%[^\n]*\n?/gm, '');
      }
      
      // Split by X: at the start of a line to detect multiple tunes in a tunebook
      const tunes = filteredAbc.split(/(?=^X:)/m).filter(t => t.trim().includes('X:'));
      
      if (tunes.length > 0) {
        return tunes.map((tune, i) => {
          const titleMatch = tune.match(/^T:\s*(.*)$/m);
          return titleMatch ? titleMatch[1].trim() : `Tune ${i + 1}`;
        });
      }
      
      // Fallback to traditional parsing if splitting fails
      const visualObjs = abcjs.renderAbc(document.createElement('div'), filteredAbc);
      if (!visualObjs || !visualObjs.length) return ['Tune 1'];
      return visualObjs.map((obj, i) => obj.metaText?.title || `Tune ${i + 1}`);
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
  }, [activeScoreId, scores, generateMidiForAbc, setScores]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const audioFiles: File[] = [];
    const imageFiles: File[] = [];
    const filesToProcess: File[] = [];
    
    // First, filter out files that are already loaded (by title)
    for (const file of Array.from(files)) {
      const name = file.name.split('.')[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      // Separate images and audio
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
        imageFiles.push(file);
        continue;
      }
      if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'mid', 'midi'].includes(ext || '')) {
        audioFiles.push(file);
        continue;
      }

      // Check for duplicate scores
      const existingScore = scores.find(s => s.title === name);
      if (existingScore) {
        setActiveScoreId(existingScore.id);
        continue;
      }
      
      filesToProcess.push(file);
    }

    const newScores: ScoreData[] = [];
    
    for (const file of filesToProcess) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const id = Math.random().toString(36).substr(2, 9);
      const name = file.name.split('.')[0];
      
      let format: ScoreFormat = ScoreFormat.Text;
      let content: string | string[] = '';
      let audioUrl: string | undefined = undefined;
      let audioName: string | undefined = undefined;

      if (ext === 'pdf') {
        format = ScoreFormat.PDF;
        content = URL.createObjectURL(file);
      } else if (ext === 'abc') {
        format = ScoreFormat.ABC;
        content = await file.text();
        const midiUrl = generateMidiForAbc(content, 0);
        if (midiUrl) {
          audioUrl = midiUrl;
          audioName = `${name}.mid`;
        }
      } else if (ext === 'xml' || ext === 'musicxml') {
        format = ScoreFormat.MusicXML;
        content = await file.text();
      } else if (ext === 'txt') {
        format = ScoreFormat.Text;
        content = await file.text();
      } else {
        continue; // Unsupported
      }

      newScores.push({
        id,
        title: name,
        format,
        content,
        zoom: 1,
        pan: { x: 0, y: 0 },
        viewMode: 'scroll',
        audioUrl,
        audioName,
        showEditor: false,
        selectedTuneIndex: 0
      });
    }

    if (imageFiles.length > 0) {
      const id = Math.random().toString(36).substr(2, 9);
      const content = imageFiles.map(f => URL.createObjectURL(f));
      newScores.push({
        id,
        title: imageFiles.length === 1 ? imageFiles[0].name.split('.')[0] : `Image Collection (${imageFiles.length})`,
        format: ScoreFormat.Image,
        content,
        zoom: 1,
        pan: { x: 0, y: 0 },
        viewMode: 'scroll'
      });
    }

    // Process resulting scores
    setScores(prev => {
      let updatedScores = [...prev, ...newScores];
      
      // If we have audio files, try to link them
      if (audioFiles.length > 0) {
        const audioUrl = URL.createObjectURL(audioFiles[0]); // Take first audio for now
        const audioName = audioFiles[0].name;
        
        setGlobalAudio({ url: audioUrl, name: audioName });

        if (newScores.length > 0) {
          // Link to the first new score added in this batch
          newScores[0].audioUrl = audioUrl;
          newScores[0].audioName = audioName;
        } else if (activeScoreId) {
          // Link to existing active score
          updatedScores = updatedScores.map(s => 
            s.id === activeScoreId ? { ...s, audioUrl, audioName } : s
          );
        }
      }
      
      return updatedScores;
    });

    if (newScores.length > 0) setActiveScoreId(newScores[0].id);
  }, [scores, activeScoreId, generateMidiForAbc, setActiveScoreId, setScores, setGlobalAudio]);

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
    const score = scores.find(s => s.id === activeScoreId);
    if (!score) return;
    
    let content = '';
    let mimeType = 'text/plain';
    let fileName = '';

    if (score.format === ScoreFormat.ABC || score.format === ScoreFormat.Text || score.format === ScoreFormat.MusicXML) {
      content = score.content as string;
      const ext = score.format === ScoreFormat.ABC ? 'abc' : (score.format === ScoreFormat.MusicXML ? 'xml' : 'txt');
      fileName = `${score.title || 'score'}.${ext}`;
    } else {
      const fileUrl = Array.isArray(score.content) ? score.content[0] : (score.content as string);
      if (!fileUrl) return;
      
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = score.title || 'score';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    <div className="min-h-full flex flex-col md:flex-row gap-0 md:gap-6 p-4 md:p-8 relative">
      {/* Sidebar - Scores Library */}
      <AnimatePresence initial={false}>
        {!isSidebarCollapsed && (
          <motion.div 
            initial={{ width: 0, opacity: 0, marginRight: 0 }}
            animate={{ width: 320, opacity: 1, marginRight: 24 }}
            exit={{ width: 0, opacity: 0, marginRight: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full md:w-80 flex flex-col gap-6 overflow-hidden shrink-0"
          >
            {/* Global Controls Panel - Moved from main to sidebar */}
            <div className={cn(
                 "flex flex-col gap-3 p-4 rounded-xl border transition-colors shadow-md",
                 resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-md"
            )}>
              <div className="flex items-center gap-2 mb-1">
                 <div className="w-6 h-6 rounded bg-orange-500/10 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                 </div>
                 <span className={cn("text-[10px] font-black uppercase tracking-widest leading-none", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>Performance Tools</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => isMetronomePlaying ? stopMetronome() : startMetronome()}
                  className={cn(
                    "w-full p-2.5 rounded-xl transition-all border flex flex-col items-center justify-center gap-2",
                    isMetronomePlaying 
                      ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20" 
                      : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/40 hover:text-white" : "bg-slate-50 border-black/10 text-slate-500 hover:text-slate-900")
                  )}
                  title="Metronome"
                >
                  <div className="w-7 h-7 rounded-lg bg-current/10 flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[8px] font-black uppercase leading-tight">Metronome</span>
                  </div>
                </button>

                <button 
                  onClick={() => setIsDronePlaying(!isDronePlaying)}
                  className={cn(
                    "w-full p-2.5 rounded-xl transition-all border flex flex-col items-center justify-center gap-2",
                    isDronePlaying 
                      ? "bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/20" 
                      : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/40 hover:text-white" : "bg-slate-50 border-black/10 text-slate-500 hover:text-slate-900")
                  )}
                  title="Drone"
                >
                  <div className="w-7 h-7 rounded-lg bg-current/10 flex items-center justify-center shrink-0">
                    <Wind className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[8px] font-black uppercase leading-tight">Drone</span>
                  </div>
                </button>

                <button 
                  onClick={() => setIsAccompanimentPlaying(!isAccompanimentPlaying)}
                  className={cn(
                    "w-full p-2.5 rounded-xl transition-all border flex flex-col items-center justify-center gap-2",
                    isAccompanimentPlaying 
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                      : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/40 hover:text-white" : "bg-slate-50 border-black/10 text-slate-500 hover:text-slate-900")
                  )}
                  title="Accompaniment"
                >
                  <div className="w-7 h-7 rounded-lg bg-current/10 flex items-center justify-center shrink-0">
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[8px] font-black uppercase leading-tight">AI Engine</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/10 to-transparent rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className={cn(
                "relative rounded-2xl border p-6 backdrop-blur-sm overflow-hidden h-fit transition-colors",
                resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
              )}>
                <div className="absolute top-0 right-0 p-4">
                  <Library className={cn("w-8 h-8 rotate-12", resolvedTheme === 'dark' ? "text-white/5" : "text-black/5")} />
                </div>
                
                <span className={cn("text-[9px] uppercase font-black tracking-[0.3em] block mb-2", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>Collection</span>
                <h1 className={cn("text-2xl font-black leading-tight uppercase tracking-tighter italic", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>Score</h1>
                
                <div className="mt-8 flex flex-col gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    multiple 
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFiles(e.target.files);
                        e.target.value = '';
                      }
                    }}
                    accept=".abc,.txt,.pdf,.xml,.musicxml,image/*,audio/*"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group bg-[#FF4E00] border-[#FF4E00] text-white shadow-lg shadow-orange-500/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase">Load Score</div>
                        <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">Upload Files</div>
                      </div>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      const id = Math.random().toString(36).substr(2, 9);
                      const initialContent = 'X:1\nT:New ABC Score\nM:4/4\nK:C\nC D E F | G A B c |';
                      const midiUrl = generateMidiForAbc(initialContent);
                      const newScore: ScoreData = {
                        id,
                        title: 'New ABC Score',
                        format: ScoreFormat.ABC,
                        content: initialContent,
                        zoom: 1,
                        pan: { x: 0, y: 0 },
                        viewMode: 'scroll',
                        showEditor: false,
                        audioUrl: midiUrl || undefined,
                        audioName: midiUrl ? 'rendering.mid' : undefined
                      };
                      setScores([...scores, newScore]);
                      setActiveScoreId(id);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                      resolvedTheme === 'dark' ? "bg-white/[0.03] hover:bg-white/[0.08] border-white/5" : "bg-slate-50 hover:bg-slate-100 border-black/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-black transition-colors">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={cn("text-xs font-black uppercase", resolvedTheme === 'dark' ? "text-white/80" : "text-slate-900")}>ABC Score</div>
                        <div className={cn("text-[10px] uppercase tracking-widest font-bold", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>Notation</div>
                      </div>
                    </div>
                    <Plus className={cn("w-4 h-4 transition-colors", resolvedTheme === 'dark' ? "text-white/20 group-hover:text-white" : "text-slate-300 group-hover:text-slate-900")} />
                  </button>

                  <button 
                    onClick={() => addScore(ScoreFormat.Text)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                      resolvedTheme === 'dark' ? "bg-white/[0.03] hover:bg-white/[0.08] border-white/5" : "bg-slate-50 hover:bg-slate-100 border-black/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={cn("text-xs font-black uppercase", resolvedTheme === 'dark' ? "text-white/80" : "text-slate-900")}>Text Sheet</div>
                        <div className={cn("text-[10px] uppercase tracking-widest font-bold", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>Lyrics/Chords</div>
                      </div>
                    </div>
                    <Plus className={cn("w-4 h-4 transition-colors", resolvedTheme === 'dark' ? "text-white/20 group-hover:text-white" : "text-slate-300 group-hover:text-slate-900")} />
                  </button>
                </div>
              </div>
            </div>

            {/* Scores List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-3">
              {scores.map(s => (
                <button 
                  key={s.id}
                  onClick={() => setActiveScoreId(s.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all text-left flex items-start gap-4 group relative overflow-hidden",
                    activeScoreId === s.id 
                      ? (resolvedTheme === 'dark' ? "bg-white/10 border-orange-500/50 shadow-[0_0_20px_rgba(255,78,0,0.1)]" : "bg-white border-orange-500 shadow-xl shadow-orange-500/10") 
                      : (resolvedTheme === 'dark' ? "bg-white/5 border-white/5 hover:border-white/10" : "bg-white border-black/5 hover:border-black/10")
                  )}
                >
                  {activeScoreId === s.id && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 blur-3xl -mr-12 -mt-12" />
                  )}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all",
                    activeScoreId === s.id ? "bg-orange-500 text-black shadow-lg" : (resolvedTheme === 'dark' ? "bg-white/10 text-white group-hover:bg-white/20" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200")
                  )}>
                    <ScoreIcon format={s.format} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-sm font-bold truncate leading-tight transition-colors uppercase tracking-tight", activeScoreId === s.id ? (resolvedTheme === 'dark' ? "text-white" : "text-slate-900") : (resolvedTheme === 'dark' ? "text-slate-400 group-hover:text-orange-400" : "text-slate-500 group-hover:text-orange-600"))}>{s.title || 'Untitled'}</div>
                    <div className={cn("text-[9px] uppercase font-bold tracking-[0.15em] mt-1 italic", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>{s.format}</div>
                  </div>
                </button>
              ))}
              {scores.length === 0 && (
                <div className={cn(
                  "p-8 text-center rounded-2xl border border-dashed transition-colors",
                  resolvedTheme === 'dark' ? "bg-white/[0.02] border-white/10" : "bg-slate-50 border-black/5"
                )}>
                  <Library className={cn("w-8 h-8 mx-auto mb-4", resolvedTheme === 'dark' ? "text-white/10" : "text-slate-200")} />
                  <p className={cn("text-[10px] uppercase font-black tracking-[0.2em]", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-300")}>Empty Collection</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Display */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Controls Row */}
        <div className="mb-4">
          {/* Global Audio Engine Panel */}
          <div className="w-full">
            <ScoreAudioPlayer 
              url={globalAudio?.url || activeScore?.audioUrl} 
              filename={globalAudio?.name || activeScore?.audioName || 'audio.mp3'}
              resolvedTheme={resolvedTheme} 
              onUploadRequested={() => fileInputRef.current?.click()}
              onFilesDropped={handleFiles}
              onTimeUpdate={setPlaybackTime}
            />
          </div>
        </div>

        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex-1 rounded-2xl border flex flex-col overflow-hidden backdrop-blur-sm relative transition-all",
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
          {/* Label */}
          <div className="absolute top-6 left-8 pointer-events-none">
            <span className="text-[10px] font-bold text-orange-400 tracking-[0.3em] uppercase italic opacity-50">Active Session</span>
          </div>

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
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
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
  playbackTime,
  isSidebarCollapsed,
  onToggleSidebar
}: { 
  score?: ScoreData, 
  onUpdate: (u: Partial<ScoreData>) => void, 
  onDelete: () => void,
  onDownload: () => void,
  onTranspose: (semitones: number) => void,
  getAbcTuneTitles: (abc: string) => string[],
  onReloadMidi: () => void,
  playbackTime: number,
  isSidebarCollapsed: boolean,
  onToggleSidebar: () => void
}) {
  const { resolvedTheme } = useTheme();
  
  if (!score) return (
    <div className={cn("flex-1 flex flex-col items-center justify-center gap-4 transition-colors", resolvedTheme === 'dark' ? "text-white/10" : "text-slate-200")}>
      <Library className="w-16 h-16 opacity-5 mb-4" />
      <div className="text-center">
        <p className="text-xs uppercase font-black tracking-[0.4em] opacity-40">No Score Selected</p>
        <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-20 mt-2">Select or create from the library</p>
      </div>
    </div>
  );

  const viewMode = score.viewMode || 'scroll';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className={cn(
        "px-6 py-6 flex flex-col lg:flex-row lg:items-center justify-between border-b transition-all gap-6",
        resolvedTheme === 'dark' ? "border-white/5 bg-slate-900/40" : "border-black/5 bg-white shadow-sm"
      )}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={onToggleSidebar}
              className={cn(
                "p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 shadow-sm hidden md:flex items-center justify-center group",
                !isSidebarCollapsed 
                  ? "bg-orange-500 border-orange-500 text-white" 
                  : (resolvedTheme === 'dark' ? "bg-black/20 border-white/10 text-white/40 hover:text-white" : "bg-white border-black/10 text-slate-400 hover:text-slate-900")
              )}
              title={isSidebarCollapsed ? "Show Library" : "Hide Library"}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <input 
              value={score.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className={cn(
              "w-full bg-transparent text-3xl font-black focus:outline-none uppercase tracking-tighter italic transition-colors",
              resolvedTheme === 'dark' ? "text-white placeholder:text-white/10" : "text-slate-900 placeholder:text-slate-200"
            )}
            placeholder="UNTITLED SCORE"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>{score.format} MODE</span>
            </div>

            {score.format === ScoreFormat.ABC && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pl-4 border-l border-black/10 dark:border-white/10">
                {/* Tune Picker */}
                <div className="flex items-center gap-2">
                  <Music className="w-3.5 h-3.5 text-orange-500" />
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
                          {i + 1}. {title}
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
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 lg:gap-6 shrink-0">
          <div className="flex items-center gap-3 ml-2 lg:ml-4 border-l border-black/5 dark:border-white/5 pl-4 lg:pl-6">
              {/* View Mode Selector */}
              {(score.format === ScoreFormat.Image || score.format === ScoreFormat.PDF) && (
                <div className={cn("flex p-1 rounded-xl border transition-colors", resolvedTheme === 'dark' ? "bg-black/20 border-white/5" : "bg-slate-100 border-black/5")}>
                  <button 
                    onClick={() => onUpdate({ viewMode: 'scroll' })}
                    className={cn("p-2 rounded-lg transition-all", viewMode === 'scroll' ? (resolvedTheme === 'dark' ? "bg-white/10 text-white" : "bg-white text-slate-900 shadow-sm") : "text-slate-400")}
                    title="Continuous Scroll"
                  >
                    <Scroll className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onUpdate({ viewMode: 'single' })}
                    className={cn("p-2 rounded-lg transition-all", viewMode === 'single' ? (resolvedTheme === 'dark' ? "bg-white/10 text-white" : "bg-white text-slate-900 shadow-sm") : "text-slate-400")}
                    title="Single Page"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onUpdate({ viewMode: 'double' })}
                    className={cn("p-2 rounded-lg transition-all", viewMode === 'double' ? (resolvedTheme === 'dark' ? "bg-white/10 text-white" : "bg-white text-slate-900 shadow-sm") : "text-slate-400")}
                    title="Double Page"
                  >
                    <Columns className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              {(score.format === ScoreFormat.Image || score.format === ScoreFormat.PDF) && (
                <div className={cn("flex p-1 rounded-xl border transition-colors", resolvedTheme === 'dark' ? "bg-black/20 border-white/5" : "bg-slate-100 border-black/5")}>
                  <button 
                    onClick={() => onUpdate({ zoom: Math.max(0.5, score.zoom - 0.1) })}
                    className={cn("p-2 rounded-lg transition-all", resolvedTheme === 'dark' ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-black/5")}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <div className={cn("w-[1px] self-stretch my-1", resolvedTheme === 'dark' ? "bg-white/5" : "bg-black/5")} />
                  <button 
                    onClick={() => onUpdate({ zoom: Math.min(3, score.zoom + 0.1) })}
                    className={cn("p-2 rounded-lg transition-all", resolvedTheme === 'dark' ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-black/5")}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              )}

              {score.format === ScoreFormat.ABC && (
                <button 
                  onClick={() => onUpdate({ showEditor: !score.showEditor })}
                  className={cn(
                    "p-2 rounded-xl border transition-all flex items-center gap-2 px-3 shadow-sm group active:scale-95",
                    score.showEditor 
                      ? "bg-orange-500 border-orange-500 text-white" 
                      : (resolvedTheme === 'dark' ? "bg-black/20 border-white/10 text-white/40 hover:text-white" : "bg-white border-black/10 text-slate-400 hover:text-slate-900")
                  )}
                  title={score.showEditor ? "Hide Editor" : "Show Editor"}
                >
                  <Layout className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{score.showEditor ? 'Hide' : 'Code'}</span>
                </button>
              )}

              <button 
                onClick={onDownload}
                className={cn(
                  "p-2 rounded-xl border transition-all flex items-center gap-2 px-3 shadow-sm group active:scale-95",
                  resolvedTheme === 'dark' ? "bg-black/20 border-white/10 text-white/40 hover:text-white" : "bg-white border-black/10 text-slate-400 hover:text-slate-900"
                )}
                title="Download Score"
              >
                <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Export</span>
              </button>

              <button 
                onClick={onDelete}
                className="p-2 rounded-xl border border-red-500/10 text-red-500/30 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all shadow-sm active:scale-95 group"
                title="Delete Score"
              >
                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>

      {/* Rendering Area */}
      <div className="flex-1 overflow-auto custom-scrollbar relative p-8">
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
            <div 
              className={cn(
                "transition-transform origin-top-left",
                viewMode === 'scroll' ? "flex flex-col gap-8" : "h-full"
              )}
              style={{ transform: `scale(${score.zoom})` }}
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

            {score.format === ScoreFormat.PDF && (
              <PdfRenderer 
                url={score.content as string} 
                viewMode={viewMode} 
              />
            )}

            {score.format === ScoreFormat.MusicXML && (
              <MusicXmlRenderer 
                xml={score.content as string} 
              />
            )}
          </div>
        </React.Suspense>
        )}
      </div>
    </div>
  );
}

function ImageViewer({ content, viewMode, onRemove }: { content: string | string[], viewMode: string, onRemove: () => void }) {
  const images = Array.isArray(content) ? content : (content ? [content] : []);
  const [page, setPage] = useState(0);

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
