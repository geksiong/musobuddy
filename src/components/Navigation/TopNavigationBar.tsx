/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Mic2, 
  Waves, 
  Library, 
  Drum, 
  Piano, 
  Sun, 
  Moon, 
  Monitor, 
  Plus, 
  Upload, 
  Globe, 
  AudioWaveform, 
  FileCode, 
  FileText, 
  Download, 
  Gamepad2, 
  Info,
  ChevronDown,
  Maximize2,
  Minimize2,
  MoreVertical,
  Check
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { useAccompaniment } from '../../contexts/AccompanimentContext.tsx';
import { useController } from '../../contexts/ControllerContext.tsx';
import { ScoreFormat } from '../Score/types.ts';
import { usePWA } from '../../hooks/usePWA.ts';

export type ViewType = 'metronome' | 'tuner' | 'drone' | 'score' | 'accompaniment';

interface TopNavigationBarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  onOpenTranscribeModal: () => void;
  onOpenLoadUrlModal: () => void;
  onCreateScore: (format: ScoreFormat) => void;
  onTriggerFileUpload: () => void;
  onOpenAboutModal: () => void;
  onOpenControllerModal: () => void;
  isDistractionFree?: boolean;
  toggleDistractionFree?: () => void;
}

export default function TopNavigationBar({
  currentView,
  onSelectView,
  onOpenTranscribeModal,
  onOpenLoadUrlModal,
  onCreateScore,
  onTriggerFileUpload,
  onOpenAboutModal,
  onOpenControllerModal,
  isDistractionFree,
  toggleDistractionFree,
}: TopNavigationBarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { isMetronomePlaying, isDronePlaying, playingRefNote } = useAudio();
  const { isPlaying: isAccompanimentPlaying } = useAccompaniment();
  const { gamepads, midiDevices, isMidiActive } = useController();
  const { isInstallable, promptInstall } = usePWA();

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'score' as ViewType, label: 'Score', icon: Library, isActiveAudio: false },
    { id: 'accompaniment' as ViewType, label: 'Accompaniment', icon: Piano, isActiveAudio: isAccompanimentPlaying },
    { id: 'metronome' as ViewType, label: 'Metronome', icon: Drum, isActiveAudio: isMetronomePlaying },
    { id: 'tuner' as ViewType, label: 'Tuner', icon: Mic2, isActiveAudio: !!playingRefNote },
    { id: 'drone' as ViewType, label: 'Drone', icon: Waves, isActiveAudio: isDronePlaying },
  ];

  const hasActiveControllers = gamepads.length > 0 || midiDevices.length > 0 || isMidiActive;

  return (
    <header className={cn(
      "h-14 px-4 sm:px-6 flex items-center justify-between border-b shrink-0 transition-colors z-40 backdrop-blur-xl relative select-none",
      resolvedTheme === 'dark' 
        ? "bg-[#121316]/95 border-white/[0.08] text-neutral-200" 
        : "bg-white/95 border-neutral-200 text-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
    )}>
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-2 shrink-0">
        <button 
          onClick={() => onSelectView('score')}
          className="flex items-center gap-2 group text-left cursor-pointer focus-visible:outline-none"
        >
          <div className="w-7 h-7 rounded-lg bg-[#E05A2B] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <Music className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="font-bold text-sm tracking-tight font-sans whitespace-nowrap">
            Muso<span className="text-[#E05A2B]">Buddy</span>
          </span>
        </button>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="flex items-center gap-1 sm:gap-2">
        {navItems.map((item) => {
          const isSelected = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={cn(
                "relative px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                isSelected
                  ? resolvedTheme === 'dark' 
                    ? "text-white bg-white/[0.08]" 
                    : "text-neutral-900 bg-neutral-100 shadow-sm"
                  : resolvedTheme === 'dark' 
                    ? "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]" 
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60"
              )}
            >
              <item.icon className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-[#E05A2B]" : "opacity-70")} />
              <span className="hidden sm:inline">{item.label}</span>
              {item.isActiveAudio && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#E05A2B] shrink-0 animate-pulse" />
              )}
              {isSelected && (
                <motion.div 
                  layoutId="navIndicator"
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#E05A2B] rounded-full"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Unified Action Menu & Tools */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Unified "+" Action Hub */}
        <div className="relative" ref={addMenuRef}>
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            title="Add or Import Score"
            className={cn(
              "h-8 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
              isAddMenuOpen
                ? "bg-[#E05A2B] text-white shadow-sm"
                : resolvedTheme === 'dark'
                  ? "bg-white/[0.07] hover:bg-white/[0.12] text-neutral-200 border border-white/[0.08]"
                  : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200/80"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-semibold">New / Import</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform duration-150", isAddMenuOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isAddMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.14 }}
                className={cn(
                  "absolute right-0 top-full mt-1.5 w-60 rounded-xl border p-1.5 shadow-xl z-50 backdrop-blur-2xl",
                  resolvedTheme === 'dark'
                    ? "bg-[#181A1F]/95 border-white/[0.12] text-neutral-200 shadow-black/50"
                    : "bg-white/95 border-neutral-200 text-neutral-800 shadow-neutral-900/10"
                )}
              >
                <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400">
                  Import or Create Sheet
                </div>

                {/* Transcribe Melody */}
                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    onOpenTranscribeModal();
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer",
                    resolvedTheme === 'dark' ? "hover:bg-white/[0.08]" : "hover:bg-neutral-100"
                  )}
                >
                  <div className="w-7 h-7 rounded-md bg-[#E05A2B]/15 text-[#E05A2B] flex items-center justify-center shrink-0">
                    <AudioWaveform className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      Transcribe Melody
                    </div>
                    <div className="text-[11px] text-neutral-500">Sing or play into mic to ABC</div>
                  </div>
                </button>

                {/* Upload File */}
                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    onTriggerFileUpload();
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer",
                    resolvedTheme === 'dark' ? "hover:bg-white/[0.08]" : "hover:bg-neutral-100"
                  )}
                >
                  <div className="w-7 h-7 rounded-md bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">Upload Files</div>
                    <div className="text-[11px] text-neutral-500">ABC, PDF, MusicXML, GuitarPro, TXT</div>
                  </div>
                </button>

                {/* Load from Web URL */}
                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    onOpenLoadUrlModal();
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors text-left cursor-pointer",
                    resolvedTheme === 'dark' ? "hover:bg-white/[0.08]" : "hover:bg-neutral-100"
                  )}
                >
                  <div className="w-7 h-7 rounded-md bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">Load from URL</div>
                    <div className="text-[11px] text-neutral-500">Import score from web link</div>
                  </div>
                </button>

                <div className="h-[1px] my-1 bg-neutral-200 dark:bg-white/[0.08]" />

                <div className="px-2 py-0.5 text-[11px] font-semibold text-neutral-400">
                  New Blank Score
                </div>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    onCreateScore(ScoreFormat.ABC);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer",
                    resolvedTheme === 'dark' ? "hover:bg-white/[0.08]" : "hover:bg-neutral-100"
                  )}
                >
                  <FileCode className="w-4 h-4 text-[#E05A2B] shrink-0" />
                  <span className="font-medium">Blank ABC Score</span>
                </button>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    onCreateScore(ScoreFormat.ChordSheet);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer",
                    resolvedTheme === 'dark' ? "hover:bg-white/[0.08]" : "hover:bg-neutral-100"
                  )}
                >
                  <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">Blank Chord Sheet</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Toggle (Compact) */}
        <div className={cn(
          "hidden md:flex items-center p-0.5 rounded-lg border",
          resolvedTheme === 'dark' ? "bg-white/[0.05] border-white/[0.08]" : "bg-neutral-100 border-neutral-200"
        )}>
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              title={`Switch to ${t} mode`}
              className={cn(
                "p-1 rounded-md transition-colors cursor-pointer",
                theme === t
                  ? resolvedTheme === 'dark' ? "bg-white/15 text-white" : "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              {t === 'light' && <Sun className="w-3.5 h-3.5" />}
              {t === 'dark' && <Moon className="w-3.5 h-3.5" />}
              {t === 'system' && <Monitor className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>

        {/* More Settings / Controller Dropdown */}
        <div className="relative" ref={settingsMenuRef}>
          <button
            onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
            title="More Options & Controllers"
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border",
              isSettingsMenuOpen
                ? "bg-neutral-200 dark:bg-white/20 border-transparent text-neutral-900 dark:text-white"
                : resolvedTheme === 'dark'
                  ? "border-white/[0.08] hover:bg-white/[0.08] text-neutral-400 hover:text-white"
                  : "border-neutral-200 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900"
            )}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {isSettingsMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.14 }}
                className={cn(
                  "absolute right-0 top-full mt-1.5 w-52 rounded-xl border p-1.5 shadow-xl z-50 backdrop-blur-2xl",
                  resolvedTheme === 'dark'
                    ? "bg-[#181A1F]/95 border-white/[0.12] text-neutral-200 shadow-black/50"
                    : "bg-white/95 border-neutral-200 text-neutral-800 shadow-neutral-900/10"
                )}
              >
                {/* Controller Mapping */}
                <button
                  onClick={() => {
                    setIsSettingsMenuOpen(false);
                    onOpenControllerModal();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer",
                    resolvedTheme === 'dark' ? "hover:bg-white/[0.08]" : "hover:bg-neutral-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-indigo-400" />
                    <span>Gamepads & MIDI</span>
                  </div>
                  {hasActiveControllers && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>

                {/* Distraction Free Toggle */}
                {toggleDistractionFree && (
                  <button
                    onClick={() => {
                      setIsSettingsMenuOpen(false);
                      toggleDistractionFree();
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer",
                      resolvedTheme === 'dark' ? "hover:bg-white/[0.08]" : "hover:bg-neutral-100"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-neutral-400" />
                      <span>Distraction-Free Mode</span>
                    </div>
                    {isDistractionFree && <Check className="w-3.5 h-3.5 text-[#E05A2B]" />}
                  </button>
                )}

                {/* Install PWA Option */}
                {isInstallable && (
                  <button
                    onClick={() => {
                      setIsSettingsMenuOpen(false);
                      promptInstall();
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer text-indigo-400 font-medium",
                      resolvedTheme === 'dark' ? "hover:bg-white/[0.08]" : "hover:bg-neutral-100"
                    )}
                  >
                    <Download className="w-4 h-4" />
                    <span>Install Offline App</span>
                  </button>
                )}

                {/* About MusoBuddy */}
                <button
                  onClick={() => {
                    setIsSettingsMenuOpen(false);
                    onOpenAboutModal();
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer border-t border-neutral-200 dark:border-white/[0.08] mt-1 pt-1.5",
                    resolvedTheme === 'dark' ? "hover:bg-white/[0.08]" : "hover:bg-neutral-100"
                  )}
                >
                  <Info className="w-4 h-4 text-neutral-400" />
                  <span>About MusoBuddy</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
