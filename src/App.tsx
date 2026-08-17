/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Mic2, 
  Waves, 
  Library, 
  ChevronRight, 
  ChevronLeft,
  Drum,
  Piano,
  Sun,
  Moon,
  Monitor,
  Upload,
  X,
  FileMusic,
  ChevronDown,
  Plus,
  FileCode,
  FileText
} from 'lucide-react';
import { cn } from './lib/utils.ts';
import { useAudio } from './contexts/AudioContext.tsx';
import { useAccompaniment } from './contexts/AccompanimentContext.tsx';
import { useTheme } from './contexts/ThemeContext.tsx';
import { useScores } from './contexts/ScoreContext.tsx';
import { ScoreFormat } from './components/Score/types.ts';

// Components
import MetronomeView from './components/Metronome/MetronomeView.tsx';
import TunerView from './components/Tuner/TunerView.tsx';
import DroneView from './components/Drone/DroneView.tsx';
import ScoreView from './components/Score/ScoreView.tsx';
import AccompanimentView from './components/Accompaniment/AccompanimentView.tsx';
import PracticeToolsPanel from './components/Navigation/PracticeToolsPanel.tsx';

type ViewType = 'metronome' | 'tuner' | 'drone' | 'score' | 'accompaniment' | 'settings';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('score');
  const { isMetronomePlaying, isDronePlaying, playingRefNote } = useAudio();
  const { isPlaying: isAccompanimentPlaying } = useAccompaniment();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { scores, setScores, activeScoreId, setActiveScoreId, loadFiles, createScore, isDistractionFree, setIsDistractionFree } = useScores();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isNewScoreOpen, setIsNewScoreOpen] = useState(false);
  const newScoreDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDistractionFree) {
        setIsDistractionFree(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDistractionFree, setIsDistractionFree]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newScoreDropdownRef.current && !newScoreDropdownRef.current.contains(e.target as Node)) {
        setIsNewScoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHeaderLoadScore = () => {
    fileInputRef.current?.click();
  };

  const handleHeaderFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await loadFiles(e.target.files);
      setCurrentView('score');
      e.target.value = '';
    }
  };

  const handleDeleteScore = (id: string) => {
    setScores(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (activeScoreId === id) {
        if (remaining.length > 0) {
          setActiveScoreId(remaining[0].id);
        } else {
          setActiveScoreId(null);
        }
      }
      return remaining;
    });
  };

  const navItems = [
    { id: 'score', label: 'Score', icon: Library, isActiveAudio: false },
    { id: 'metronome', label: 'Metronome', icon: Drum, isActiveAudio: isMetronomePlaying },
    { id: 'tuner', label: 'Tuner', icon: Mic2, isActiveAudio: !!playingRefNote },
    { id: 'drone', label: 'Drone', icon: Waves, isActiveAudio: isDronePlaying },
    { id: 'accompaniment', label: 'Accompaniment', icon: Piano, isActiveAudio: isAccompanimentPlaying },
  ];

  return (
    <div className={cn(
      "flex h-screen overflow-hidden font-sans flex-col transition-colors duration-500",
      resolvedTheme === 'dark' ? "bg-[#0A0A0A] text-slate-200" : "bg-[#f8f9fa] text-slate-900"
    )}>
      {/* Header Navigation */}
      {!isDistractionFree && (
        <header className={cn(
          "flex items-center justify-between px-3 sm:px-6 py-3 border-b shrink-0 transition-colors gap-2 sm:gap-4 sticky top-0 z-50 backdrop-blur-xl",
          resolvedTheme === 'dark' ? "border-white/10 bg-[#0A0A0A]/90 text-slate-200" : "border-black/5 bg-white/90 text-slate-900 shadow-sm"
        )}>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#FF4E00] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,78,0,0.3)] shrink-0">
              <Music className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight uppercase hidden sm:block">
              MUSO <span className="text-[#FF4E00]">BUDDY</span>
            </h1>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2 lg:gap-6 text-[10px] font-bold tracking-[0.15em] uppercase">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as ViewType)}
                title={item.label}
                className={cn(
                  "transition-all border-b-2 py-1 px-1.5 sm:px-2 flex items-center gap-1.5 relative",
                  currentView === item.id 
                    ? "text-[#FF4E00] border-[#FF4E00]" 
                    : resolvedTheme === 'dark' 
                      ? "text-slate-400 border-transparent hover:text-white"
                      : "text-slate-500 border-transparent hover:text-slate-900"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
                {item.isActiveAudio && (
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)] shrink-0"></span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Theme Toggle */}
            <div className={cn(
              "hidden sm:flex items-center gap-0.5 p-1 rounded-full border transition-all shadow-inner shrink-0",
              resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"
            )}>
              {[
                { id: 'light', icon: Sun },
                { id: 'dark', icon: Moon },
                { id: 'system', icon: Monitor },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as any)}
                  className={cn(
                    "p-1.5 rounded-full transition-all",
                    theme === t.id 
                      ? "bg-white text-black shadow-sm" 
                      : "text-slate-500 hover:text-slate-300"
                  )}
                  title={t.id}
                >
                  <t.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 sm:gap-2.5 items-center shrink-0">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                accept=".abc,.txt,.pro,.chordpro,.chopro,.crd,.cho,.pdf,.xml,.musicxml,.mxl,.gp,.gp3,.gp4,.gp5,.gpx,.ptb,image/*,audio/*"
                onChange={handleHeaderFileChange}
              />

              {/* New Score Dropdown Button */}
              <div className="relative shrink-0" ref={newScoreDropdownRef}>
                <button
                  onClick={() => setIsNewScoreOpen(!isNewScoreOpen)}
                  title="Create a new blank score"
                  className={cn(
                    "px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border text-[10px] font-extrabold tracking-wider transition-all uppercase flex items-center gap-1 sm:gap-1.5 shrink-0 min-h-[36px]",
                    isNewScoreOpen
                      ? "bg-[#FF4E00] border-[#FF4E00] text-white shadow-lg shadow-[#FF4E00]/20"
                      : resolvedTheme === 'dark'
                        ? "border-white/20 bg-white/5 hover:bg-white/10 text-slate-200"
                        : "border-black/10 bg-slate-100 hover:bg-slate-200 text-slate-800"
                  )}
                >
                  <Plus className="w-3.5 h-3.5 text-[#FF4E00] shrink-0" />
                  <span>New <span className="hidden sm:inline">Score</span></span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isNewScoreOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isNewScoreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className={cn(
                        "absolute right-0 top-full mt-2 w-56 rounded-2xl border p-2 shadow-2xl z-50 overflow-hidden backdrop-blur-xl",
                        resolvedTheme === 'dark' 
                          ? "bg-[#141416]/95 border-white/10 text-white" 
                          : "bg-white/95 border-black/10 text-slate-900"
                      )}
                    >
                      <div className="text-[9px] uppercase font-black tracking-widest px-3 py-1.5 text-slate-400 border-b border-black/5 dark:border-white/5 mb-1">
                        Create Editable Sheet
                      </div>

                      <button
                        onClick={() => {
                          createScore(ScoreFormat.ABC);
                          setCurrentView('score');
                          setIsNewScoreOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group",
                          resolvedTheme === 'dark' ? "hover:bg-white/10" : "hover:bg-slate-100"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-[#FF4E00] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <FileCode className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase tracking-tight">ABC Score</div>
                          <div className="text-[9px] font-bold uppercase tracking-widest opacity-50">Notation</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          createScore(ScoreFormat.GuitarPro);
                          setCurrentView('score');
                          setIsNewScoreOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group",
                          resolvedTheme === 'dark' ? "hover:bg-white/10" : "hover:bg-slate-100"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Music className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase tracking-tight">Guitar Tab</div>
                          <div className="text-[9px] font-bold uppercase tracking-widest opacity-50">AlphaTex / GP</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          createScore(ScoreFormat.ChordSheet);
                          setCurrentView('score');
                          setIsNewScoreOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group",
                          resolvedTheme === 'dark' ? "hover:bg-white/10" : "hover:bg-slate-100"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 text-[#FF4E00] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase tracking-tight">Chord Sheet</div>
                          <div className="text-[9px] font-bold uppercase tracking-widest opacity-50">ChordPro / Chords</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          createScore(ScoreFormat.Text);
                          setCurrentView('score');
                          setIsNewScoreOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group",
                          resolvedTheme === 'dark' ? "hover:bg-white/10" : "hover:bg-slate-100"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase tracking-tight">Text Sheet</div>
                          <div className="text-[9px] font-bold uppercase tracking-widest opacity-50">Lyrics / Chords</div>
                        </div>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={handleHeaderLoadScore}
                title="Load Score from file"
                className={cn(
                  "px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] font-black tracking-wider transition-colors uppercase shadow-lg shadow-[#FF4E00]/10 flex items-center gap-1 sm:gap-1.5 shrink-0 min-h-[36px]",
                  resolvedTheme === 'dark' ? "bg-white text-black hover:bg-slate-200" : "bg-black text-white hover:bg-slate-800"
                )}
              >
                <Upload className="w-3.5 h-3.5 text-[#FF4E00] shrink-0" />
                <span>Load<span className="hidden sm:inline"> Score</span></span>
              </button>


            </div>
          </div>
        </header>
      )}

      {/* Practice Tools Collapsible Panel */}
      {!isDistractionFree && (
        <PracticeToolsPanel 
          onNavigate={(view) => setCurrentView(view)} 
          fileInputRef={fileInputRef} 
        />
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 relative flex flex-col min-h-0 overflow-hidden",
        isDistractionFree && "fixed inset-0 z-50 bg-inherit"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn(
              "flex-1 flex flex-col min-h-0",
              currentView === 'score' ? "h-full overflow-hidden" : "overflow-y-auto custom-scrollbar"
            )}
          >
            {currentView === 'metronome' && <MetronomeView />}
            {currentView === 'tuner' && <TunerView />}
            {currentView === 'drone' && <DroneView />}
            {currentView === 'score' && <ScoreView />}
            {currentView === 'accompaniment' && <AccompanimentView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      {!isDistractionFree && (
        <div className={cn(
          "md:hidden fixed bottom-16 left-1/2 -translate-x-1/2 w-[90%] backdrop-blur-2xl border rounded-2xl p-2 flex justify-around items-center shadow-2xl z-50 transition-colors",
          resolvedTheme === 'dark' ? "bg-black/80 border-white/10" : "bg-white/80 border-black/5 shadow-black/10"
        )}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewType)}
              className={cn(
                "p-3 rounded-xl transition-all relative",
                currentView === item.id ? "text-[#FF4E00] bg-[#FF4E00]/5" : "text-slate-500"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.isActiveAudio && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Footer Navigable Loaded Scores List */}
      {!isDistractionFree && (
        <footer className={cn(
          "px-3 sm:px-6 py-2 sm:py-2.5 border-t flex items-center justify-between shrink-0 transition-colors gap-2 sm:gap-4 z-40 text-xs",
          resolvedTheme === 'dark' ? "border-white/10 bg-[#0A0A0A] text-slate-400" : "border-black/5 bg-white text-slate-600"
        )}>
          {/* Mobile / Tight view: Drop-down list */}
          <div className="flex md:hidden items-center gap-2 w-full">
            <div className="flex items-center gap-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#FF4E00]">
              <Library className="w-4 h-4 shrink-0" />
              <span className="px-1.5 py-0.5 rounded-full bg-[#FF4E00]/10 font-mono text-[10px]">
                {scores.length}
              </span>
            </div>

            <div className="flex-1 min-w-0 relative">
              <select
                value={activeScoreId || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setActiveScoreId(e.target.value);
                    setCurrentView('score');
                  }
                }}
                className={cn(
                  "w-full h-11 pl-3 pr-8 text-xs font-bold rounded-xl border appearance-none transition-colors outline-none cursor-pointer truncate",
                  resolvedTheme === 'dark' 
                    ? "bg-white/10 border-white/15 text-slate-200 focus:border-[#FF4E00]" 
                    : "bg-slate-100 border-black/10 text-slate-900 focus:border-[#FF4E00]"
                )}
                style={{ fontSize: '14px' }}
              >
                {scores.length === 0 ? (
                  <option value="" disabled>No scores loaded</option>
                ) : (
                  scores.map((score) => (
                    <option 
                      key={score.id} 
                      value={score.id}
                      className={resolvedTheme === 'dark' ? "bg-slate-900 text-slate-200" : "bg-white text-slate-900"}
                    >
                      {score.title} ({score.format.toUpperCase()})
                    </option>
                  ))
                )}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {scores.length > 1 && activeScoreId && (
              <button
                onClick={() => handleDeleteScore(activeScoreId)}
                title="Delete current score"
                className={cn(
                  "h-11 w-11 flex items-center justify-center rounded-xl border shrink-0 transition-colors",
                  resolvedTheme === 'dark'
                    ? "border-white/10 bg-white/5 hover:bg-red-500/20 hover:border-red-500/50 text-slate-400 hover:text-red-400"
                    : "border-black/10 bg-slate-100 hover:bg-red-50 hover:border-red-300 text-slate-500 hover:text-red-600"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleHeaderLoadScore}
              title="Load new score file"
              className={cn(
                "h-11 px-3 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0",
                resolvedTheme === 'dark'
                  ? "border-white/15 bg-white/10 hover:bg-white/20 text-slate-200"
                  : "border-black/10 bg-black text-white hover:bg-slate-800"
              )}
            >
              <Upload className="w-4 h-4 text-[#FF4E00]" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Add</span>
            </button>
          </div>

          {/* Desktop View: Horizontal scrollable pill list */}
          <div className="hidden md:flex items-center justify-between w-full gap-4">
            {/* Left: Label & Count */}
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider shrink-0 text-[10px]">
              <Library className="w-4 h-4 text-[#FF4E00]" />
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500">Loaded Scores:</span>
              <span className="px-2 py-0.5 rounded-full bg-[#FF4E00]/10 text-[#FF4E00] font-mono text-[10px]">
                {scores.length}
              </span>
            </div>

            {/* Center: Scrollable pills of loaded scores */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
              {scores.length === 0 ? (
                <span className="text-xs italic text-slate-500">No scores loaded yet. Click "Load Score" to import scores.</span>
              ) : (
                scores.map((score) => {
                  const isActive = activeScoreId === score.id;
                  return (
                    <div
                      key={score.id}
                      onClick={() => {
                        setActiveScoreId(score.id);
                        setCurrentView('score');
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all shrink-0 group border",
                        isActive
                          ? "bg-[#FF4E00] text-white border-[#FF4E00] shadow-md shadow-[#FF4E00]/20"
                          : resolvedTheme === 'dark'
                            ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300"
                            : "bg-slate-100 border-slate-200 hover:bg-slate-200 hover:border-slate-300 text-slate-700"
                      )}
                      title={`Select "${score.title}" (${score.format.toUpperCase()})`}
                    >
                      <FileMusic className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-white" : "text-[#FF4E00]")} />
                      <span className="truncate max-w-[150px]">{score.title}</span>
                      <span className={cn(
                        "text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold shrink-0",
                        isActive 
                          ? "bg-white/20 text-white" 
                          : "bg-black/10 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                      )}>
                        {score.format}
                      </span>
                      {scores.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScore(score.id);
                          }}
                          title="Remove score"
                          className={cn(
                            "opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/20 transition-opacity ml-0.5",
                            isActive ? "text-white hover:text-red-200" : "text-slate-400 hover:text-red-500"
                          )}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Quick Add File button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleHeaderLoadScore}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5",
                  resolvedTheme === 'dark'
                    ? "border-white/10 hover:bg-white/10 text-slate-300"
                    : "border-black/10 hover:bg-black/5 text-slate-700"
                )}
                title="Load new score file"
              >
                <Upload className="w-3.5 h-3.5 text-[#FF4E00]" />
                <span className="hidden lg:inline text-[10px] uppercase font-bold tracking-wider">Add File</span>
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}


