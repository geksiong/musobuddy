/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Music, ChevronLeft, ChevronRight, Settings2, Sliders } from 'lucide-react';
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

  // Selected tuning state for the drop down list sectioned by instruments
  const [selectedTuningKey, setSelectedTuningKey] = useState<string>(
    `${INSTRUMENT_TUNINGS[0].name}::${INSTRUMENT_TUNINGS[0].tunings[0].name}`
  );

  const activeTuning = useMemo(() => {
    for (const group of INSTRUMENT_TUNINGS) {
      for (const tuning of group.tunings) {
        if (`${group.name}::${tuning.name}` === selectedTuningKey) {
          return { groupName: group.name, ...tuning };
        }
      }
    }
    return { groupName: INSTRUMENT_TUNINGS[0].name, ...INSTRUMENT_TUNINGS[0].tunings[0] };
  }, [selectedTuningKey]);

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
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-full flex flex-col gap-6">
      
      {/* Top Row: Reference Standards Panel */}
      <section className={cn(
        "rounded-2xl border p-4 md:px-6 md:py-3.5 backdrop-blur-xl transition-colors shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4",
        resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5"
      )}>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-bold text-slate-500 uppercase text-[10px] tracking-[0.2em] hidden sm:inline">Reference</span>
          </div>

          {/* Instrument & Tuning Selector Dropdown */}
          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <select
              value={selectedTuningKey}
              onChange={(e) => setSelectedTuningKey(e.target.value)}
              className={cn(
                "w-full border rounded-xl px-3.5 py-2 text-[11px] font-bold tracking-wider outline-none focus:border-emerald-500/50 transition-all appearance-none pr-8 cursor-pointer",
                resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-white border-black/10 text-slate-900 shadow-sm"
              )}
            >
              {INSTRUMENT_TUNINGS.map(group => (
                <optgroup key={group.name} label={group.name} className={cn("font-bold", resolvedTheme === 'dark' ? "bg-slate-900 text-emerald-400" : "bg-slate-100 text-emerald-700")}>
                  {group.tunings.map(tuning => (
                    <option key={`${group.name}-${tuning.name}`} value={`${group.name}::${tuning.name}`} className={cn(resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>
                      {group.name} — {tuning.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className={cn("absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")} />
          </div>
        </div>

        {/* Tone Pitch Buttons in the same horizontal row */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5 shrink-0 max-w-full">
          <span className={cn("text-[9px] uppercase font-black tracking-wider whitespace-nowrap hidden sm:inline mr-1", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")}>
            Play pitch:
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {activeTuning.notes.map((note, index) => (
              <button 
                key={`${selectedTuningKey}-${note}-${index}`}
                onClick={() => playNote(note)}
                className={cn(
                  "h-9 px-3 min-w-[38px] rounded-xl border flex items-center justify-center text-[11px] font-black transition-all active:scale-95 shrink-0",
                  playingNote === note 
                    ? "bg-emerald-500 text-black border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.4)]" 
                    : resolvedTheme === 'dark'
                      ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                      : "bg-slate-100 border-black/5 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                )}
              >
                {note}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Grid: Tuner Visualizer + Tuner Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Tuner Visualizer Column */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <div className={cn(
            "rounded-2xl border p-6 md:p-10 flex flex-col items-center justify-between relative overflow-hidden backdrop-blur-3xl transition-colors min-h-[440px]",
            resolvedTheme === 'dark' ? "bg-black/40 border-white/5" : "bg-white border-black/5 shadow-xl shadow-slate-200/20"
          )}>
            
            {/* Background Spectrum */}
            <canvas 
              ref={canvasRef}
              width={1200}
              height={400}
              className="absolute inset-0 w-full h-full opacity-20 pointer-events-none z-0"
            />

            {/* Visualizer Header Controls */}
            <div className="relative z-10 flex justify-between items-center w-full pb-4 border-b border-black/5 dark:border-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-emerald-400/80 tracking-[0.25em] uppercase">Phase Analyzer</span>
                <div className="flex items-center gap-1.5">
                  <Settings2 className={cn("w-3 h-3", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")} />
                  <select 
                    value={temperament}
                    onChange={(e) => {
                      setTemperament(e.target.value as Temperament);
                      e.target.blur();
                      setTimeout(() => e.target.blur(), 0);
                    }}
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
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold block">
                    {result.frequency.toFixed(3)} Hz
                  </span>
                  <span className={cn("text-[8px] font-black uppercase tracking-wider", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
                    {(result as any).isHolding ? 'SIGNAL HOLD' : 'LIVE'}
                  </span>
                </div>
              )}
            </div>

            {/* Note Display */}
            <div className="relative z-10 flex flex-col items-center justify-center my-6">
              <motion.div 
                className={cn("text-[8rem] md:text-[11rem] font-black font-mono tracking-tighter transition-colors leading-none select-none", getNoteColor())}
                animate={{ scale: isPerfect ? 1.05 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
              >
                {result ? result.note : '--'}
                <span className="text-3xl md:text-5xl opacity-30 align-top ml-2">{result ? result.octave : ''}</span>
              </motion.div>
            </div>

            {/* Linear Meter & Guidance */}
            <div className="relative z-10 w-full flex flex-col items-center gap-4">
              <div className="flex items-center justify-between w-full gap-2">
                {/* Tune Up Guide */}
                <motion.div 
                  animate={{ opacity: result && result.cents < -2 ? 1 : 0.15, x: result && result.cents < -2 ? [0, 6, 0] : 0 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="flex flex-col items-center"
                >
                  <ChevronRight className="w-8 h-8 text-emerald-500" />
                  <span className={cn("text-[8px] font-black uppercase tracking-widest mt-1", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")}>Tune Up</span>
                </motion.div>

                {/* Accuracy Status */}
                <div className="flex flex-col items-center gap-0.5">
                  <span className={cn(
                    "text-base font-black font-mono tracking-tight",
                    getNoteColor()
                  )}>
                    {result ? `${result.cents > 0 ? '+' : ''}${result.cents.toFixed(3)}` : '0.000'}
                  </span>
                  <span className={cn("text-[9px] font-black uppercase tracking-[0.3em]", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")}>Cents</span>
                </div>

                {/* Tune Down Guide */}
                <motion.div 
                  animate={{ opacity: result && result.cents > 2 ? 1 : 0.15, x: result && result.cents > 2 ? [0, -6, 0] : 0 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="flex flex-col items-center"
                >
                  <ChevronLeft className="w-8 h-8 text-emerald-500" />
                  <span className={cn("text-[8px] font-black uppercase tracking-widest mt-1", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")}>Tune Down</span>
                </motion.div>
              </div>

              {/* Linear Bar */}
              <div className={cn(
                "relative w-full h-7 rounded-full border overflow-hidden px-1 flex items-center transition-colors",
                resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"
              )}>
                {/* Scale Markers */}
                <div className="absolute inset-0 flex justify-between px-8 py-2 pointer-events-none opacity-20">
                  {[-50, -25, 0, 25, 50].map(m => (
                    <div key={m} className={cn("w-[2px] h-full", resolvedTheme === 'dark' ? "bg-white" : "bg-black", m === 0 && "w-1 opacity-50")} />
                  ))}
                </div>

                {/* Meter Slider Indicator */}
                <motion.div 
                  animate={{ left: `${50 + (result?.cents || 0)}%` }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className={cn(
                    "absolute w-10 h-5 -translate-x-1/2 rounded-full shadow-lg transition-colors",
                    isPerfect ? "bg-emerald-400 shadow-emerald-400/50" : isGood ? "bg-amber-400 shadow-amber-400/50" : "bg-red-500 shadow-red-500/50"
                  )}
                >
                  <div className="absolute inset-0 opacity-30 bg-white rounded-full animate-pulse" />
                </motion.div>
              </div>
            </div>

          </div>
        </div>

        {/* Tuner Controls Panel Column */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          <section className={cn(
            "rounded-2xl border p-5 md:p-6 flex flex-col gap-5 backdrop-blur-xl transition-colors shadow-xl",
            resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5"
          )}>
            <div className="flex items-center justify-between border-b pb-3 border-black/5 dark:border-white/5">
              <h3 className="font-bold text-slate-500 uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                Tuner Controls
              </h3>
              <span className={cn(
                "w-2 h-2 rounded-full",
                isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" : "bg-slate-400/40"
              )} />
            </div>

            {/* Connect / Disconnect Microphone Button */}
            <button 
              onClick={isActive ? stopTuner : () => startTuner(selectedDeviceId)}
              className={cn(
                "w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2.5 shadow-lg relative group overflow-hidden shrink-0",
                isActive 
                  ? "bg-red-500 text-white shadow-red-500/20 hover:bg-red-600" 
                  : resolvedTheme === 'dark'
                    ? "bg-emerald-500 text-black shadow-emerald-500/20 hover:bg-emerald-400"
                    : "bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700"
              )}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 flex items-center gap-2">
                {isActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isActive ? 'Disconnect Mic' : 'Connect Microphone'}
              </span>
            </button>

            {/* Input Volume VU Meter */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className={cn("text-[9px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
                  Input Level
                </span>
                <span className="text-[9px] font-mono text-emerald-500 font-bold">{volume.toFixed(0)}%</span>
              </div>
              <div className={cn(
                "flex gap-[2px] p-2 rounded-xl transition-colors relative border shadow-inner items-center justify-between",
                resolvedTheme === 'dark' ? "bg-black/60 border-white/10" : "bg-slate-900 border-black/20"
              )}>
                {Array.from({ length: ledCount }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 h-5 rounded-xs transition-all duration-75 relative",
                      i < activeLeds 
                        ? i > ledCount - 3 
                          ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" 
                          : i > ledCount - 6 
                            ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" 
                            : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                        : "bg-white/5"
                    )}
                  >
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Sensitivity Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className={cn("text-[9px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
                  Mic Sensitivity
                </span>
                <span className="text-[9px] font-mono text-emerald-500 font-bold">{(sensitivity * 100).toFixed(0)}%</span>
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

            {/* Input Device Selector */}
            <div className="flex flex-col gap-1.5">
              <span className={cn("text-[9px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
                Input Device
              </span>
              <div className="relative">
                <select 
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    e.target.blur();
                    setTimeout(() => e.target.blur(), 0);
                  }}
                  className={cn(
                    "w-full border rounded-xl px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider outline-none focus:border-emerald-500/50 transition-all appearance-none pr-8 truncate cursor-pointer",
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
                <ChevronDown className={cn("absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")} />
              </div>
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

