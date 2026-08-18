/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Music, 
  Library, 
  Drum, 
  Mic2, 
  Waves, 
  Piano, 
  FileCode, 
  FileText, 
  FileMusic, 
  Pencil, 
  Sliders, 
  CheckCircle2, 
  Sparkles,
  Info,
  Layers,
  Volume2
} from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const coreFeatures = [
    {
      icon: Library,
      title: 'Interactive Score Viewer & Player',
      color: 'bg-orange-500/10 text-[#FF4E00]',
      description: 'Multi-format sheet music rendering with synthetic audio playback, key transposition, tempo control, A/B looping, and live code editing for text/ABC scores.'
    },
    {
      icon: Drum,
      title: 'Precision Metronome',
      color: 'bg-amber-500/10 text-amber-500',
      description: 'Flexible rhythm engine with customizable BPM, subdivision beat accents, Flamenco compás support, visual pulse meter, sound generator presets, and tap tempo detection.'
    },
    {
      icon: Mic2,
      title: 'Chromatic Tuner',
      color: 'bg-emerald-500/10 text-emerald-500',
      description: 'High-accuracy real-time microphone pitch detection with note frequency history graph, tuning needle visualization, and reference tone playback.'
    },
    {
      icon: Waves,
      title: 'Tone Drone Generator',
      color: 'bg-cyan-500/10 text-cyan-500',
      description: 'Continuous polyphonic pitch drone designed for Irish traditional music and folk traditions that use drone tones, perfect for intonation practice and ear training.'
    },
    {
      icon: Piano,
      title: 'Groove & Backing Engine',
      color: 'bg-purple-500/10 text-purple-500',
      description: 'Interactive accompaniment generator with custom chord progressions, style arrangements (Jazz, Bossa Nova, Pop, Rock, Funk), swing feel, and song presets.'
    },
    {
      icon: Pencil,
      title: 'PDF Score Markup & Annotations',
      color: 'bg-rose-500/10 text-rose-500',
      description: 'Digital markup toolbar featuring pen, highlighter, text notes, musical stamps, and shape drawing overlays designed specifically for PDF scores.'
    }
  ];

  const scoreFormats = [
    {
      format: 'ABC Notation',
      extensions: '.abc, .txt',
      icon: FileCode,
      color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
      description: 'Full ABC 2.1 standard rendering with interactive staff notation, audio synthesis playback, key transposition, and live text editing.'
    },
    {
      format: 'Guitar Pro & Tabs',
      extensions: '.gp, .gp3, .gp4, .gp5, .gpx, .ptb',
      icon: Music,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      description: 'AlphaTab engine rendering multi-track tablature and standard notation with instrument track mute/solo and realistic soundfont playback.'
    },
    {
      format: 'ChordPro & Chord Sheets',
      extensions: '.pro, .chordpro, .chopro, .crd, .cho',
      icon: FileText,
      color: 'text-red-500 bg-red-500/10 border-red-500/20',
      description: 'Lead sheets and lyrics with inline chords, automatic transpose key shifted chords, dynamic chord diagrams, and smooth auto-scrolling.'
    },
    {
      format: 'MusicXML',
      extensions: '.xml, .musicxml, .mxl',
      icon: FileMusic,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      description: 'Standard compressed (.mxl) and uncompressed MusicXML formats parsed into rendered musical notation.'
    },
    {
      format: 'PDF Documents',
      extensions: '.pdf',
      icon: Layers,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      description: 'Crisp vector PDF sheet music rendering with multi-page scrolling, zoom adjustment, and interactive drawing annotation layers.'
    },
    {
      format: 'Scans & Audio Files',
      extensions: '.png, .jpg, .svg, .mp3, .wav, .ogg',
      icon: Volume2,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      description: 'Import sheet music image scans alongside reference backing audio tracks for synchronized practice sessions.'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            "relative w-full max-w-4xl rounded-3xl border shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] my-auto",
            resolvedTheme === 'dark' 
              ? "bg-[#121214] border-white/10 text-slate-100" 
              : "bg-white border-black/10 text-slate-900"
          )}
        >
          {/* Header */}
          <div className={cn(
            "px-6 py-5 border-b flex items-center justify-between shrink-0 sticky top-0 z-20 backdrop-blur-xl",
            resolvedTheme === 'dark' ? "bg-[#121214]/90 border-white/10" : "bg-white/90 border-black/5"
          )}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF4E00] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF4E00]/25 shrink-0">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight uppercase">
                    MUSO <span className="text-[#FF4E00]">BUDDY</span>
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FF4E00]/10 text-[#FF4E00]">
                    v2.0
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  The All-in-One Digital Sheet Music Reader & Practice Companion
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  by Gek S. Low
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-xl transition-colors",
                resolvedTheme === 'dark' ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
              )}
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
            {/* Mission / Overview Banner */}
            <div className={cn(
              "p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden",
              resolvedTheme === 'dark'
                ? "bg-gradient-to-br from-[#FF4E00]/15 via-orange-950/10 to-transparent border-[#FF4E00]/30"
                : "bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border-orange-500/20"
            )}>
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FF4E00]">
                  <Sparkles className="w-4 h-4" />
                  <span>Integrated Musician Workspace</span>
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  Muso Buddy unites score viewing, interactive notation playback, precision tuning, groove generation, and score markup into one fluid environment built for musicians, students, and educators.
                </p>
              </div>
            </div>

            {/* Section 1: Core App Features */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#FF4E00] flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Core Features & Tools
                </h3>
                <span className="text-xs text-slate-400 font-mono">6 Built-in Modules</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {coreFeatures.map((feature, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex items-start gap-3.5",
                      resolvedTheme === 'dark'
                        ? "bg-white/[0.03] border-white/10 hover:border-white/20"
                        : "bg-slate-50 border-slate-200/80 hover:border-slate-300"
                    )}
                  >
                    <div className={cn("p-2.5 rounded-xl shrink-0", feature.color)}>
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-xs font-bold uppercase tracking-wide truncate">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Supported Score Formats */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#FF4E00] flex items-center gap-2">
                  <Library className="w-4 h-4" />
                  Supported Score & File Formats
                </h3>
                <span className="text-xs text-slate-400 font-mono">Wide Compatibility</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {scoreFormats.map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all",
                      resolvedTheme === 'dark'
                        ? "bg-white/[0.02] border-white/10 hover:border-white/20"
                        : "bg-slate-50 border-slate-200/80 hover:border-slate-300"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <item.icon className={cn("w-4 h-4", item.color.split(' ')[0])} />
                          <span className="text-xs font-bold uppercase tracking-wider">{item.format}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className={cn("px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border w-fit", item.color)}>
                      {item.extensions}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={cn(
            "px-6 py-4 border-t flex items-center justify-between shrink-0 text-xs",
            resolvedTheme === 'dark' ? "bg-[#121214] border-white/10 text-slate-400" : "bg-slate-50 border-black/5 text-slate-500"
          )}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Offline-capable &amp; client-side audio processing</span>
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#FF4E00] hover:bg-[#e04500] text-white font-extrabold uppercase text-xs tracking-wider transition-colors shadow-lg shadow-[#FF4E00]/20"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
