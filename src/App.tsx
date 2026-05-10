/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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
  Monitor
} from 'lucide-react';
import { cn } from './lib/utils.ts';
import { useAudio } from './contexts/AudioContext.tsx';
import { useAccompaniment } from './contexts/AccompanimentContext.tsx';
import { useTheme } from './contexts/ThemeContext.tsx';

// Components
import MetronomeView from './components/Metronome/MetronomeView.tsx';
import TunerView from './components/Tuner/TunerView.tsx';
import DroneView from './components/Drone/DroneView.tsx';
import ScoreView from './components/Score/ScoreView.tsx';
import AccompanimentView from './components/Accompaniment/AccompanimentView.tsx';

type ViewType = 'metronome' | 'tuner' | 'drone' | 'score' | 'accompaniment' | 'settings';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('metronome');
  const { isMetronomePlaying, isDronePlaying, playingRefNote } = useAudio();
  const { isPlaying: isAccompanimentPlaying } = useAccompaniment();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const navItems = [
    { id: 'metronome', label: 'Metronome', icon: Drum, isActiveAudio: isMetronomePlaying },
    { id: 'tuner', label: 'Tuner', icon: Mic2, isActiveAudio: !!playingRefNote },
    { id: 'drone', label: 'Drone', icon: Waves, isActiveAudio: isDronePlaying },
    { id: 'accompaniment', label: 'Accompaniment', icon: Piano, isActiveAudio: isAccompanimentPlaying },
    { id: 'score', label: 'Score', icon: Library, isActiveAudio: false },
  ];

  return (
    <div className={cn(
      "flex h-screen overflow-hidden font-sans flex-col transition-colors duration-500",
      resolvedTheme === 'dark' ? "bg-[#0A0A0A] text-slate-200" : "bg-[#f8f9fa] text-slate-900"
    )}>
      {/* Header Navigation */}
      <header className={cn(
        "flex items-center justify-between px-8 py-6 border-b shrink-0 transition-colors",
        resolvedTheme === 'dark' ? "border-white/10" : "border-black/5 bg-white shadow-sm"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF4E00] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,78,0,0.3)]">
            <Music className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase">
            MUSO <span className="text-[#FF4E00]">BUDDY</span>
          </h1>
        </div>

        <nav className="hidden md:flex gap-8 text-[10px] font-bold tracking-[0.2em] uppercase">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewType)}
              className={cn(
                "transition-all border-b-2 py-1 flex items-center gap-2",
                currentView === item.id 
                  ? "text-[#FF4E00] border-[#FF4E00]" 
                  : resolvedTheme === 'dark' 
                    ? "text-slate-500 border-transparent hover:text-white"
                    : "text-slate-400 border-transparent hover:text-slate-900"
              )}
            >
              {item.label}
              {item.isActiveAudio && (
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-6">
          {/* Theme Toggle */}
          <div className={cn(
            "flex items-center gap-1 p-1 rounded-full border transition-all shadow-inner",
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

          <div className="flex gap-3">
            <button className={cn(
              "px-5 py-2 rounded-full border text-[10px] font-bold tracking-wider transition-colors uppercase",
              resolvedTheme === 'dark' 
                ? "border-white/20 hover:bg-white/5" 
                : "border-black/10 hover:bg-black/5"
            )}>
              Save
            </button>
            <button className={cn(
              "px-5 py-2 rounded-full text-[10px] font-black tracking-wider transition-colors uppercase shadow-lg shadow-[#FF4E00]/10",
              resolvedTheme === 'dark' ? "bg-white text-black" : "bg-black text-white"
            )}>
              Connect
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="min-h-full"
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
      <div className={cn(
        "md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] backdrop-blur-2xl border rounded-2xl p-2 flex justify-around items-center shadow-2xl z-50 transition-colors",
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

      <footer className={cn(
        "px-8 py-4 border-t flex items-center justify-between text-[9px] uppercase tracking-[0.2em] shrink-0 transition-colors",
        resolvedTheme === 'dark' ? "border-white/10 text-slate-500" : "border-black/5 text-slate-400 bg-white"
      )}>
        <div className="flex gap-6">
          <span>Processing: 64-bit float</span>
          <span>Buffer: 128ms</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <span>Engine Optimized</span>
        </div>
      </footer>
    </div>
  );
}

