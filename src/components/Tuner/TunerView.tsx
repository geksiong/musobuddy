/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Music, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { useTuner, Temperament } from '../../hooks/useTuner.ts';
import { INSTRUMENT_TUNINGS } from './constants.ts';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

export default function TunerView() {
  const { 
    isActive, startTuner, stopTuner, playNote, playingNote, result, spectrumData, volume,
    devices, selectedDeviceId, setSelectedDeviceId, temperament, setTemperament,
    sensitivity, setSensitivity
  } = useTuner();
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // VU Meter LEDs
  const ledCount = 12;
  const activeLeds = Math.min(ledCount, Math.round((volume / 100) * ledCount));

  useEffect(() => {
    if (isActive && spectrumData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barCount = 128; // Lower count for thicker bars
      const step = Math.floor(spectrumData.length / 4 / barCount); 
      const barWidth = width / barCount;
      
      // Enhanced Glow Gradient for spectrum
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      if (resolvedTheme === 'dark') {
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0)');
        gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.2)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.6)');
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
      } else {
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.3)');
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.2)';
      }
      ctx.fillStyle = gradient;
      
      for (let i = 0; i < barCount; i++) {
        const val = spectrumData[i * step];
        if (val > 0) {
          const h = (val / 255) * height;
          ctx.fillRect(i * barWidth, height - h, barWidth - 1, h);
        }
      }
    }
  }, [isActive, spectrumData, resolvedTheme]);

  const accuracy = result ? Math.abs(result.cents) : 100;
  const isPerfect = accuracy < 2;
  const isGood = accuracy < 10;
  
  const getNoteColor = () => {
    if (!result) return 'text-white/20';
    if (isPerfect) return 'text-emerald-400';
    if (isGood) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-full flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Main Visualizer Box */}
          <div className={cn(
            "rounded-2xl border p-8 md:p-12 flex flex-col items-center justify-start pt-12 relative overflow-hidden backdrop-blur-3xl transition-colors min-h-[320px]",
            resolvedTheme === 'dark' ? "bg-black/40 border-white/5" : "bg-white border-black/5 shadow-xl shadow-slate-200/20"
          )}>
            
            {/* Background Spectrum - scoped to this container */}
            <canvas 
              ref={canvasRef}
              width={1200}
              height={400}
              className="absolute inset-0 w-full h-full opacity-20 pointer-events-none z-0"
            />

          <div className="absolute top-8 left-10 flex justify-between w-full pr-20 items-center z-10">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-emerald-400/60 tracking-[0.3em] uppercase">Phase Analyzer</span>
              <div className="flex items-center gap-2">
                <Settings2 className={cn("w-3 h-3", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")} />
                <select 
                  value={temperament}
                  onChange={(e) => setTemperament(e.target.value as Temperament)}
                  className={cn(
                    "bg-transparent border-none text-[10px] font-bold uppercase tracking-widest outline-none cursor-pointer hover:text-emerald-400 transition-colors",
                    resolvedTheme === 'dark' ? "text-white/40" : "text-slate-500"
                  )}
                >
                  <option value={Temperament.Equal} className={cn(resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>Equal Temperament</option>
                  <option value={Temperament.Just} className={cn(resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>Just Intonation</option>
                  <option value={Temperament.Pythagorean} className={cn(resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>Pythagorean</option>
                </select>
              </div>
            </div>
            {result && (
              <div className="text-right">
                <span className="text-[10px] font-mono text-emerald-400/80 uppercase block">
                  {result.frequency.toFixed(3)} Hz
                </span>
                <span className={cn("text-[8px] font-black uppercase tracking-wider", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
                  {(result as any).isHolding ? 'SIGNAL HOLD' : 'LIVE'}
                </span>
              </div>
            )}
          </div>

          <div className="relative z-10 flex flex-col items-center w-full mt-8">
            {/* Note Display */}
            <motion.div 
              className={cn("text-[10rem] md:text-[14rem] font-black font-mono tracking-tighter transition-colors leading-none", getNoteColor())}
              animate={{ scale: isPerfect ? 1.05 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 10 }}
            >
              {result ? result.note : '--'}
              <span className="text-4xl md:text-6xl opacity-30 align-top ml-2">{result ? result.octave : ''}</span>
            </motion.div>

            {/* Linear Meter & Directions */}
            <div className="w-full max-w-2xl mt-4 flex flex-col items-center gap-8">
              
              <div className="flex items-center justify-between w-full gap-4">
                {/* Tune Up Guide */}
                <motion.div 
                  animate={{ opacity: result && result.cents < -2 ? 1 : 0.1, x: result && result.cents < -2 ? [0, 8, 0] : 0 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="flex flex-col items-center"
                >
                  <ChevronRight className="w-10 h-10 text-emerald-500" />
                  <span className={cn("text-[8px] font-black uppercase tracking-widest mt-2", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>Tune Up</span>
                </motion.div>

                {/* Accuracy Status */}
                <div className="flex flex-col items-center gap-1">
                  <span className={cn(
                    "text-sm font-black font-mono tracking-tight",
                    getNoteColor()
                  )}>
                    {result ? `${result.cents > 0 ? '+' : ''}${result.cents.toFixed(3)}` : '0.000'}
                  </span>
                  <span className={cn("text-[9px] font-black uppercase tracking-[0.4em]", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>Cents</span>
                </div>

                {/* Tune Down Guide */}
                <motion.div 
                  animate={{ opacity: result && result.cents > 2 ? 1 : 0.1, x: result && result.cents > 2 ? [0, -8, 0] : 0 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="flex flex-col items-center"
                >
                  <ChevronLeft className="w-10 h-10 text-emerald-500" />
                  <span className={cn("text-[8px] font-black uppercase tracking-widest mt-2", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>Tune Down</span>
                </motion.div>
              </div>

              {/* Linear Bar */}
              <div className={cn(
                "relative w-full h-8 rounded-full border overflow-hidden px-1 flex items-center transition-colors",
                resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"
              )}>
                {/* Scale Markers */}
                <div className="absolute inset-0 flex justify-between px-8 py-2 pointer-events-none opacity-20">
                  {[-50, -25, 0, 25, 50].map(m => (
                    <div key={m} className={cn("w-[2px] h-full", resolvedTheme === 'dark' ? "bg-white" : "bg-black", m === 0 && "w-1 opacity-50")} />
                  ))}
                </div>

                {/* Slider */}
                <motion.div 
                   animate={{ left: `${50 + (result?.cents || 0)}%` }}
                   transition={{ type: "spring", damping: 20, stiffness: 300 }}
                   className={cn(
                     "absolute w-12 h-6 -translate-x-1/2 rounded-full shadow-2xl transition-colors",
                     isPerfect ? "bg-emerald-400 shadow-emerald-400/40" : isGood ? "bg-amber-400 shadow-amber-400/40" : "bg-red-500 shadow-red-500/40"
                   )}
                >
                  <div className="absolute inset-0 opacity-20 bg-white rounded-full animate-pulse" />
                </motion.div>
              </div>
            </div>
          </div>

          </div>

          {/* Controls Container */}
          <div className={cn(
            "rounded-2xl border p-8 items-center flex flex-col gap-6 shadow-xl",
            resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/10 shadow-slate-200/50"
          )}>
            {/* Row 1: Connect & Volume */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8">
              <div className="flex items-center gap-6">
                <button 
                  onClick={isActive ? stopTuner : () => startTuner(selectedDeviceId)}
                  className={cn(
                    "px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl shrink-0 overflow-hidden relative group",
                    isActive 
                      ? "bg-red-500 text-white shadow-red-500/30" 
                      : resolvedTheme === 'dark'
                        ? "bg-emerald-500 text-black shadow-emerald-500/30"
                        : "bg-emerald-600 text-white shadow-emerald-600/30"
                  )}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative z-10 flex items-center gap-3">
                    {isActive ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    {isActive ? 'Disconnect' : 'Connect Microphone'}
                  </span>
                </button>

                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "flex gap-[3px] p-2.5 rounded-2xl transition-colors relative border shadow-2xl",
                    resolvedTheme === 'dark' ? "bg-black/60 border-white/10" : "bg-slate-900 border-black/20"
                  )}>
                    {Array.from({ length: ledCount }).map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-2 h-10 rounded-sm transition-all duration-75 relative",
                          i < activeLeds 
                            ? i > ledCount - 3 
                              ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" 
                              : i > ledCount - 6 
                                ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)]" 
                                : "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]"
                            : "bg-white/5 shadow-inner"
                        )}
                      >
                        {/* Glass reflect */}
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10 rounded-full" />
                      </div>
                    ))}
                    <div className="absolute -bottom-4 left-0 w-full flex justify-between px-1">
                      <span className="text-[6px] font-black text-white/30 uppercase opacity-50">-40dB</span>
                      <span className="text-[6px] font-black text-white/30 uppercase opacity-50">-12dB</span>
                      <span className="text-[6px] font-black text-white/30 uppercase opacity-50">0dB</span>
                    </div>
                  </div>
                  <span className={cn("text-[9px] font-black uppercase tracking-widest mt-2", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>Input Level</span>
                </div>
              </div>
            </div>

            {/* Row 2: Sensitivity & Devices */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-12 pt-4 border-t border-black/5 dark:border-white/5">
              <div className="flex flex-col gap-3 min-w-[240px]">
                <div className="flex justify-between items-center px-1">
                  <span className={cn("text-[9px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>Mic Sensitivity</span>
                  <span className="text-[10px] font-mono text-emerald-500 font-bold">{(sensitivity * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className={cn(
                    "w-full accent-emerald-500 h-1.5 rounded-full appearance-none cursor-pointer transition-colors",
                    resolvedTheme === 'dark' ? "bg-white/10" : "bg-slate-200"
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className={cn("text-[8px] font-black uppercase tracking-[0.3em] ml-1", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>Input Device</span>
                <div className="relative">
                  <select 
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className={cn(
                      "border rounded-xl px-5 py-2.5 text-[9px] font-bold uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all max-w-[280px] appearance-none text-center pr-10",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-white border-black/10 text-slate-900 shadow-sm"
                    )}
                  >
                    {devices.map(device => (
                      <option key={device.deviceId} value={device.deviceId} className={cn(resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>
                        {device.label || `Mic ${device.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                    {devices.length === 0 && <option value="" className={resolvedTheme === 'dark' ? "bg-slate-900" : "bg-white"}>No Devices Found</option>}
                  </select>
                  <ChevronDown className={cn("absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reference Tunings Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6 min-h-0">
          <section className={cn(
            "rounded-2xl border p-8 flex-1 flex flex-col min-h-0 backdrop-blur-xl transition-colors",
            resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-lg"
          )}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-slate-500 uppercase text-[10px] tracking-[0.4em]">
                Reference Standards
              </h3>
              <Music className="w-4 h-4 text-emerald-500/40" />
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0 space-y-8">
                {INSTRUMENT_TUNINGS.map(group => (
                  <div key={group.name} className="space-y-4">
                    <h4 className={cn(
                      "text-[10px] uppercase font-black tracking-widest border-b pb-2 transition-colors",
                      resolvedTheme === 'dark' ? "text-white/30 border-white/5" : "text-slate-400 border-black/5"
                    )}>{group.name}</h4>
                    <div className="space-y-4">
                      {group.tunings.map(tuning => (
                        <div key={tuning.name} className="group/tuning">
                          <p className="text-[9px] font-bold mb-4 text-slate-500 uppercase tracking-widest group-hover/tuning:text-emerald-400 transition-colors">{tuning.name}</p>
                          <div className="grid grid-cols-4 gap-2">
                            {tuning.notes.map(note => (
                              <button 
                                key={note}
                                onClick={() => playNote(note)}
                                className={cn(
                                  "aspect-square rounded-2xl border flex items-center justify-center text-[11px] font-black transition-all active:scale-90",
                                  playingNote === note 
                                    ? "bg-emerald-500 text-black border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                                    : resolvedTheme === 'dark'
                                      ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                                      : "bg-black/5 border-black/5 text-slate-600 hover:bg-black/10 hover:text-slate-900"
                                )}
                              >
                                {note}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}
