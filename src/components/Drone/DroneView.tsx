/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Volume2, Wind } from 'lucide-react';
import { useDrone } from '../../hooks/useDrone.ts';
import { DroneTone } from '../../types.ts';
import { DRONE_TONES } from '../../constants.ts';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-full flex flex-col gap-8">
      <div className={cn(
        "rounded-2xl border p-12 flex flex-col items-center gap-12 relative overflow-hidden transition-colors",
        resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl"
      )}>
        <div className="absolute top-8 left-10">
          <span className="text-[10px] font-bold text-purple-500 tracking-[0.3em] uppercase italic">Sustained Presence</span>
        </div>

        {/* Note Selector Octave 4 */}
        <div className="flex flex-col gap-4 w-full">
          <div className="flex justify-between items-center px-2">
            <span className={cn("text-[10px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-slate-500" : "text-slate-400")}>Standard Octave (4)</span>
          </div>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2 w-full">
            {NOTES.map(note => {
              const fullNote = note + '4';
              const isActiveNote = !!activeDrones[fullNote];
              const isSelected = userDroneNotes.includes(fullNote);
              return (
                <button
                  key={fullNote}
                  onClick={() => toggleDroneNote(fullNote)}
                  className={cn(
                    "h-14 rounded-2xl font-black text-sm transition-all active:scale-95 border",
                    isActiveNote
                      ? "bg-purple-600 text-white border-purple-400 shadow-xl shadow-purple-600/20" 
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

          <div className="flex justify-between items-center px-2 mt-4">
            <span className={cn("text-[10px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-slate-500" : "text-slate-400")}>Low Octave (3)</span>
          </div>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2 w-full">
            {NOTES.map(note => {
              const fullNote = note + '3';
              const isActiveNote = !!activeDrones[fullNote];
              const isSelected = userDroneNotes.includes(fullNote);
              return (
                <button
                  key={fullNote}
                  onClick={() => toggleDroneNote(fullNote)}
                  className={cn(
                    "h-14 rounded-2xl font-black text-sm transition-all active:scale-95 border",
                    isActiveNote
                      ? "bg-purple-600 text-white border-purple-400 shadow-xl shadow-purple-600/20" 
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

        <div className="flex flex-wrap justify-center gap-3">
          {DRONE_TONES.map(tone => (
            <button
              key={tone}
              onClick={() => setDroneTone(tone as DroneTone)}
              className={cn(
                "px-6 py-3 rounded-full font-bold transition-all text-[10px] uppercase tracking-widest border",
                droneTone === tone 
                  ? "bg-purple-500/10 text-purple-500 border-purple-500/50" 
                  : (resolvedTheme === 'dark' ? "bg-white/[0.03] text-white/30 border-transparent hover:border-white/10 hover:text-white" : "bg-slate-100 text-slate-400 border-transparent hover:bg-slate-200 hover:text-slate-900")
              )}
            >
              {tone.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Volume & Pulse & Play */}
        <div className="flex flex-col items-center gap-10 w-full max-w-lg">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
             <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between">
                 <span className={cn("text-[10px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-slate-500" : "text-slate-400")}>Volume</span>
                 <span className="text-[10px] font-mono font-bold text-emerald-500">{Math.round(droneVolume * 100)}%</span>
               </div>
               <div className="flex items-center gap-4">
                 <Volume2 className={cn("w-4 h-4 shrink-0", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-300")} />
                 <input 
                   type="range" 
                   min="0" max="1" step="0.01" 
                   value={droneVolume} 
                   onChange={(e) => setDroneVolume(parseFloat(e.target.value))}
                   className={cn(
                     "flex-1 accent-purple-500 h-1 rounded-full appearance-none cursor-pointer duration-500",
                     resolvedTheme === 'dark' ? "bg-white/10" : "bg-slate-200"
                   )}
                 />
               </div>
             </div>

             <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between">
                 <span className={cn("text-[10px] font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-slate-500" : "text-slate-400")}>Pulse Rate</span>
                 <span className="text-[10px] font-mono font-bold text-emerald-500">{dronePulseBpm === 0 ? 'Steady' : `${dronePulseBpm} BPM`}</span>
               </div>
               <div className="flex items-center gap-4">
                 <Wind className={cn("w-4 h-4 shrink-0", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-300")} />
                 <input 
                   type="range" 
                   min="0" max="200" step="1" 
                   value={dronePulseBpm} 
                   onChange={(e) => setDronePulseBpm(parseInt(e.target.value))}
                   className={cn(
                     "flex-1 accent-purple-500 h-1 rounded-full appearance-none cursor-pointer",
                     resolvedTheme === 'dark' ? "bg-white/10" : "bg-slate-200"
                   )}
                 />
               </div>
             </div>
           </div>

           <button 
             onClick={mainToggleButton}
             className={cn(
               "w-32 h-32 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-2xl relative group",
               isDronePlaying 
                 ? "bg-red-500 text-white shadow-red-500/20" 
                 : "bg-purple-600 text-white shadow-purple-600/20"
             )}
           >
             {isDronePlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 ml-1 fill-current" />}
             {isDronePlaying && (
               <div className="absolute inset-[-8px] border-2 border-red-500/30 rounded-full animate-ping pointer-events-none" />
             )}
           </button>
        </div>
      </div>
    </div>
  );
}
