/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { cn } from './lib/utils.ts';
import { useAudio } from './contexts/AudioContext.tsx';
import { useAccompaniment } from './contexts/AccompanimentContext.tsx';
import { useTheme } from './contexts/ThemeContext.tsx';
import { useScores } from './contexts/ScoreContext.tsx';
import { useController } from './contexts/ControllerContext.tsx';
import { ScoreFormat } from './components/Score/types.ts';
import { usePWA } from './hooks/usePWA.ts';

// Components
import TopNavigationBar, { ViewType } from './components/Navigation/TopNavigationBar.tsx';
import PracticeToolsDock from './components/Navigation/PracticeToolsDock.tsx';
import MetronomeView from './components/Metronome/MetronomeView.tsx';
import TunerView from './components/Tuner/TunerView.tsx';
import DroneView from './components/Drone/DroneView.tsx';
import ScoreView from './components/Score/ScoreView.tsx';
import AccompanimentView from './components/Accompaniment/AccompanimentView.tsx';
import AboutModal from './components/AboutModal.tsx';
import LoadUrlModal from './components/Score/LoadUrlModal.tsx';
import TranscribeMelodyModal from './components/Score/TranscribeMelodyModal.tsx';
import { ControllerMappingModal } from './components/Score/ControllerMappingModal.tsx';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('score');
  const { resolvedTheme } = useTheme();
  const { loadFiles, loadFromUrl, createScore, isDistractionFree, setIsDistractionFree, toggleDistractionFree } = useScores();
  const { isOffline, hasUpdate, updateApp } = usePWA();
  const { setIsControllerModalOpen, activeToast } = useController();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLoadUrlOpen, setIsLoadUrlOpen] = useState(false);
  const [isTranscribeModalOpen, setIsTranscribeModalOpen] = useState(false);

  // Check URL query params for view or direct score loading
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam && ['metronome', 'tuner', 'drone', 'score', 'accompaniment'].includes(viewParam)) {
      setCurrentView(viewParam as ViewType);
    }

    const scoreUrlParam = params.get('url') || params.get('scoreUrl') || params.get('score');
    if (scoreUrlParam) {
      loadFromUrl(scoreUrlParam).then(res => {
        if (res.success) {
          setCurrentView('score');
        }
      });
    }
  }, [loadFromUrl]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDistractionFree) {
        setIsDistractionFree(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDistractionFree, setIsDistractionFree]);

  const handleHeaderFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await loadFiles(e.target.files);
      setCurrentView('score');
      e.target.value = '';
    }
  };

  return (
    <div className={cn(
      "flex h-screen overflow-hidden font-sans flex-col transition-colors duration-200 select-none",
      resolvedTheme === 'dark' ? "bg-[#121316] text-neutral-200" : "bg-[#F8F9FA] text-neutral-800"
    )}>
      {/* Hidden File Input for Global Score Uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple 
        accept=".abc,.txt,.pro,.chordpro,.chopro,.crd,.cho,.pdf,.xml,.musicxml,.mxl,.gp,.gp3,.gp4,.gp5,.gpx,.ptb,image/*,audio/*"
        onChange={handleHeaderFileChange}
      />

      {/* Top Navigation Bar (Zen 3-Zone Contract) */}
      {!isDistractionFree && (
        <TopNavigationBar
          currentView={currentView}
          onSelectView={(v) => setCurrentView(v)}
          onOpenTranscribeModal={() => setIsTranscribeModalOpen(true)}
          onOpenLoadUrlModal={() => setIsLoadUrlOpen(true)}
          onCreateScore={(format) => {
            createScore(format);
            setCurrentView('score');
          }}
          onTriggerFileUpload={() => fileInputRef.current?.click()}
          onOpenAboutModal={() => setIsAboutOpen(true)}
          onOpenControllerModal={() => setIsControllerModalOpen(true)}
          isDistractionFree={isDistractionFree}
          toggleDistractionFree={toggleDistractionFree}
        />
      )}

      {/* Offline Status Bar (Discreet) */}
      {isOffline && !isDistractionFree && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 px-4 py-1 text-xs font-medium flex items-center justify-center gap-2 shrink-0">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode • Scores, Practice Tools & Tuner remain operational</span>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className={cn(
        "flex-1 relative flex flex-col min-h-0 overflow-hidden",
        isDistractionFree && "fixed inset-0 z-50 bg-inherit"
      )}>
        <div className={cn("flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar", currentView !== 'score' && "hidden")}>
          <ScoreView />
        </div>
        <div className={cn("flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar", currentView !== 'accompaniment' && "hidden")}>
          <AccompanimentView />
        </div>
        <div className={cn("flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar", currentView !== 'metronome' && "hidden")}>
          <MetronomeView />
        </div>
        <div className={cn("flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar", currentView !== 'tuner' && "hidden")}>
          <TunerView />
        </div>
        <div className={cn("flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar", currentView !== 'drone' && "hidden")}>
          <DroneView />
        </div>
      </main>

      {/* Practice Tools Compact Bottom Dock */}
      {!isDistractionFree && (
        <PracticeToolsDock 
          onNavigate={(view) => setCurrentView(view)}
          fileInputRef={fileInputRef}
        />
      )}

      {/* Controller & Hardware Mapping Modal */}
      <ControllerMappingModal />

      {/* About Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      {/* Load Score from URL Modal */}
      <LoadUrlModal 
        isOpen={isLoadUrlOpen} 
        onClose={() => setIsLoadUrlOpen(false)} 
        onSuccess={() => setCurrentView('score')}
      />

      {/* Melody Transcriber Modal */}
      <TranscribeMelodyModal
        isOpen={isTranscribeModalOpen}
        onClose={() => setIsTranscribeModalOpen(false)}
      />

      {/* Live Controller / MIDI HUD Toast */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-2 px-3.5 py-1.5 rounded-full shadow-xl backdrop-blur-xl border border-white/10 bg-[#16181D]/90 text-white text-xs font-medium"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#E05A2B] animate-pulse" />
            <span className="font-semibold text-neutral-200">{activeToast.title}</span>
            {activeToast.subtitle && (
              <span className="text-neutral-400 font-normal">· {activeToast.subtitle}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service Worker Update Toast Notification */}
      <AnimatePresence>
        {hasUpdate && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="fixed bottom-16 right-4 z-50 p-3.5 rounded-xl border bg-[#16181D]/95 border-white/10 text-white shadow-2xl backdrop-blur-xl flex items-center gap-3 max-w-sm"
          >
            <div className="p-2 rounded-lg bg-[#E05A2B]/20 text-[#E05A2B] shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-neutral-200">Update Available</h4>
              <p className="text-[11px] text-neutral-400">A new version of MusoBuddy is ready.</p>
            </div>
            <button
              onClick={updateApp}
              className="px-3 py-1.5 rounded-lg bg-[#E05A2B] hover:bg-[#c8491c] text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer"
            >
              Update
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
