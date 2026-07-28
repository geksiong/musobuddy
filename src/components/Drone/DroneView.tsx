/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Volume2, Wind } from 'lucide-react';
import { useDrone } from '../../hooks/useDrone.ts';
import { DroneTone } from './types.ts';
import { DRONE_TONES } from './constants.ts';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const OCTAVES = [
  { label: 'Standard Octave (4)', octave: '4' },
  { label: 'Low Octave (3)', octave: '3' },
  { label: 'Bass Octave (2)', octave: '2' },
];

export default function DroneView() {
  const { 
    activeDrones, 
    isDronePlaying,
    setIsDronePlaying,
    userDroneNotes,
    toggleDroneNote,
    selectedDroneNote,
    setSelectedDroneNote,
    droneTone,
    setDroneTone,
    droneVolume,
    setDroneVolume,
    dronePulseBpm,
    setDronePulseBpm
  } = useDrone();
  const { resolvedTheme } = useTheme();
  
  const mainToggleButton = () => {
    setIsDronePlaying(!isDronePlaying);
  };

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto min-h-full flex flex-col gap-6">
      <div className={cn(
        "rounded-2xl border p-5 sm:p-7 flex flex-col items-center gap-6 relative overflow-hidden transition-colors",
        resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
      )}>
        <div className="absolute top-5 left-6">
          <span className="text-[10px] font-bold text-purple-500 tracking-[0.3em] uppercase italic">Sustained Presence</span>
        </div>

        {/* Note Selectors for Octaves 4, 3, and 2 */}
        <div className="flex flex-col gap-3.5 w-full pt-4">
          {OCTAVES.map(({ label, octave }) => (
            <div key={octave} className="flex flex-col gap-1.5 w-full">
              <div className="flex justify-between items-center px-1">
                <span className={cn("text-[10px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-slate-500" : "text-slate-400")}>
                  {label}
                </span>
              </div>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5 w-full">
                {NOTES.map(note => {
                  const fullNote = note + octave;
                  const isActiveNote = !!activeDrones[fullNote];
                  const isSelected = userDroneNotes.includes(fullNote);
                  return (
                    <button
                      key={fullNote}
                      onClick={() => toggleDroneNote(fullNote)}
                      className={cn(
                        "h-10 sm:h-11 rounded-xl font-black text-xs sm:text-sm transition-all active:scale-95 border",
                        isActiveNote
                          ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/20" 
                          : isSelected
                            ? (resolvedTheme === 'dark' ? "bg-white/10 text-white border-white/40 ring-1 ring-white/10" : "bg-purple-50 text-purple-600 border-purple-200 shadow-sm")
                            : (resolvedTheme === 'dark' ? "bg-white/[0.03] text-white/40 border-transparent hover:border-white/10 hover:text-white" : "bg-slate-50 text-slate-400 border-transparent hover:border-black/5 hover:text-slate-900")
                      )}
                    >
                      {note}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {DRONE_TONES.map(tone => (
            <button
              key={tone}
              onClick={() => setDroneTone(tone as DroneTone)}
              className={cn(
                "px-3 py-1 rounded-full font-extrabold transition-all text-[9px] uppercase tracking-wider border",
                droneTone === tone 
                  ? "bg-purple-500/10 text-purple-500 border-purple-500/50 shadow-sm" 
                  : (resolvedTheme === 'dark' ? "bg-white/[0.03] text-white/40 border-transparent hover:border-white/10 hover:text-white" : "bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-900")
              )}
            >
              {tone.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        {/* Bottom Controls: Play Button on Bottom Left, Sliders Stacked Vertically on Bottom Right */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 w-full pt-4 border-t border-black/5 dark:border-white/5">
          {/* Bottom Left: Play Button */}
          <div className="flex items-center justify-start shrink-0">
            <button 
              onClick={mainToggleButton}
              className={cn(
                "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl relative group shrink-0",
                isDronePlaying 
                  ? "bg-red-500 text-white shadow-red-500/20" 
                  : "bg-purple-600 text-white shadow-purple-600/20"
              )}
            >
              {isDronePlaying ? <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-current" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-1 fill-current" />}
              {isDronePlaying && (
                <div className="absolute inset-[-5px] border-2 border-red-500/30 rounded-full animate-ping pointer-events-none" />
              )}
            </button>
          </div>

          {/* Bottom Right: Volume & Pulse Rate Sliders (stacked vertically) */}
          <div className="flex flex-col gap-3 w-full sm:w-72 md:w-80 shrink-0">
            {/* Volume Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className={cn("text-[10px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-slate-500" : "text-slate-400")}>Volume</span>
                <span className="text-[10px] font-mono font-bold text-emerald-500">{Math.round(droneVolume * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <Volume2 className={cn("w-4 h-4 shrink-0", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-300")} />
                <input 
                  type="range" 
                  min="0" max="1" step="0.01" 
                  value={droneVolume} 
                  onChange={(e) => setDroneVolume(parseFloat(e.target.value))}
                  className={cn(
                    "flex-1 accent-purple-500 h-1.5 rounded-full appearance-none cursor-pointer duration-500",
                    resolvedTheme === 'dark' ? "bg-white/10" : "bg-slate-200"
                  )}
                />
              </div>
            </div>

            {/* Pulse Rate Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className={cn("text-[10px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-slate-500" : "text-slate-400")}>Pulse Rate</span>
                <span className="text-[10px] font-mono font-bold text-emerald-500">{dronePulseBpm === 0 ? 'Steady' : `${dronePulseBpm} BPM`}</span>
              </div>
              <div className="flex items-center gap-3">
                <Wind className={cn("w-4 h-4 shrink-0", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-300")} />
                <input 
                  type="range" 
                  min="0" max="200" step="1" 
                  value={dronePulseBpm} 
                  onChange={(e) => setDronePulseBpm(parseInt(e.target.value))}
                  className={cn(
                    "flex-1 accent-purple-500 h-1.5 rounded-full appearance-none cursor-pointer",
                    resolvedTheme === 'dark' ? "bg-white/10" : "bg-slate-200"
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
