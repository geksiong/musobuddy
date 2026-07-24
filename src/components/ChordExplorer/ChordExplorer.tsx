/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings2, Info } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

const DB_URL = 'https://raw.githubusercontent.com/tombatossals/chords-db/master/lib';

export type Instrument = 'guitar' | 'ukulele' | 'mandolin';

interface Position {
  frets: number[];
  fingers: number[];
  baseFret: number;
  barres: number[];
  capo?: boolean;
}

interface ChordData {
  key: string;
  suffix: string;
  positions: Position[];
}

interface InstrumentDB {
  main: {
    strings: number;
    fretsOnChord: number;
    name: string;
  };
  tunings: {
    standard: string[];
  };
  keys: string[];
  suffixes: string[];
  chords: Record<string, ChordData[]>;
}

// Custom SVG Chord Renderer to avoid React version issues with old libraries
function ChordDiagram({ chord, instrument }: { chord: Position, instrument: any }) {
  const { resolvedTheme } = useTheme();
  const S = 20; // grid size
  const padding = 30;
  const numStrings = instrument.strings;
  const numFrets = instrument.fretsOnChord || 4;
  const width = (numStrings - 1) * S + padding * 2;
  const height = numFrets * S + padding * 2;

  const isMuted = (fret: number) => fret === -1;
  const isOpen = (fret: number) => fret === 0;

  // Calculate the range of frets to display
  // Most diagrams show 4 or 5 frets starting from baseFret
  // unless there's an open string? Actually, the DB usually specifies fretsOnChord.
  
  return (
    <svg width={width} height={height + 20} viewBox={`0 0 ${width} ${height + 20}`} className="overflow-visible">
      {/* Base Fret Number */}
      {chord.baseFret > 1 && (
        <text 
          x={padding - 22} 
          y={padding + S/2 + 4} 
          className="text-[9px] font-black fill-emerald-500 uppercase italic"
        >
          {chord.baseFret}fr
        </text>
      )}

      {/* Nut / Top Line */}
      <line 
        x1={padding} 
        y1={padding} 
        x2={padding + (numStrings - 1) * S} 
        y2={padding} 
        stroke="currentColor" 
        strokeWidth={chord.baseFret === 1 ? 4 : 2}
        className={resolvedTheme === 'dark' ? "text-white/40" : "text-black/40"}
      />

      {/* Frets */}
      {Array.from({ length: numFrets }).map((_, i) => (
        <line 
          key={i}
          x1={padding} 
          y1={padding + (i + 1) * S} 
          x2={padding + (numStrings - 1) * S} 
          y2={padding + (i + 1) * S} 
          stroke="currentColor" 
          strokeWidth="1"
          className={resolvedTheme === 'dark' ? "text-white/10" : "text-black/10"}
        />
      ))}

      {/* Strings */}
      {Array.from({ length: numStrings }).map((_, i) => (
        <line 
          key={i}
          x1={padding + i * S} 
          y1={padding} 
          x2={padding + i * S} 
          y2={padding + numFrets * S} 
          stroke="currentColor" 
          strokeWidth="1"
          className={resolvedTheme === 'dark' ? "text-white/20" : "text-black/20"}
        />
      ))}

      {/* Barres */}
      {chord.barres?.map((fret, i) => {
        const positionsOnFret = chord.frets.map((f, idx) => f === fret ? idx : -1).filter(idx => idx !== -1);
        if (positionsOnFret.length < 2) return null;
        
        const start = positionsOnFret[0];
        const end = positionsOnFret[positionsOnFret.length - 1];
        const relativeFret = fret - (chord.baseFret > 0 ? chord.baseFret : 1) + 1;

        if (relativeFret < 1 || relativeFret > numFrets) return null;
        
        return (
          <rect
            key={i}
            x={padding + start * S - 6}
            y={padding + relativeFret * S - S + 4}
            width={(end - start) * S + 12}
            height={12}
            rx="6"
            className="fill-emerald-500/40"
          />
        );
      })}

      {/* Fingerings / Fret Markers */}
      {chord.frets.map((fret, stringIdx) => {
        if (isMuted(fret)) {
          return (
            <text 
              key={stringIdx} 
              x={padding + stringIdx * S} 
              y={padding - 10} 
              textAnchor="middle" 
              className={cn("text-[10px] font-bold", resolvedTheme === 'dark' ? "fill-white/20" : "fill-black/20")}
            >
              ×
            </text>
          );
        }
        if (isOpen(fret)) {
          return (
            <circle 
              key={stringIdx}
              cx={padding + stringIdx * S}
              cy={padding - 10}
              r="3.5"
              className="fill-none stroke-emerald-500 stroke-2"
            />
          );
        }

        // The chord data source is already based on relative frets
        const relativeFret = fret;
        if (relativeFret < 1 || relativeFret > numFrets) return null;
        
        return (
          <g key={stringIdx}>
            <circle 
              cx={padding + stringIdx * S}
              cy={padding + relativeFret * S - S/2}
              r="7.5"
              className="fill-emerald-500 shadow-lg"
            />
            {chord.fingers[stringIdx] > 0 && (
              <text
                x={padding + stringIdx * S}
                y={padding + relativeFret * S - S/2 + 3.5}
                textAnchor="middle"
                className="text-[8.5px] font-black fill-white"
              >
                {chord.fingers[stringIdx]}
              </text>
            )}
          </g>
        );
      })}

      {/* String labels at bottom */}
      <text x={width/2} y={height + 15} textAnchor="middle" className={cn("text-[7px] font-black uppercase tracking-[0.3em]", resolvedTheme === 'dark' ? "fill-white/10" : "fill-black/10")}>
        {instrument.name} voicing
      </text>
    </svg>
  );
}

export default function ChordExplorer({ initialChord = 'C' }: { initialChord?: string }) {
  const [instrument, setInstrument] = useState<Instrument>('guitar');
  const [db, setDb] = useState<InstrumentDB | null>(null);
  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedSuffix, setSelectedSuffix] = useState('major');
  const [positionIndex, setPositionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

    // Sync with prop changes
    useEffect(() => {
      if (!initialChord || !db) return;
      
      const FLAT_MAP: Record<string, string> = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
      };

      let key = '';
      let rawSuffix = '';

      // Extract key
      if (initialChord.length >= 2 && (initialChord[1] === '#' || initialChord[1] === 'b')) {
        key = initialChord.substring(0, 2);
        rawSuffix = initialChord.substring(2);
      } else {
        key = initialChord[0];
        rawSuffix = initialChord.substring(1);
      }

      // Normalize key (flats to sharps)
      if (FLAT_MAP[key]) key = FLAT_MAP[key];

      // Normalize suffix
      let suffix = rawSuffix || 'major';
      if (suffix === 'm') suffix = 'minor';
      if (suffix === 'min') suffix = 'minor';
      if (suffix === 'maj') suffix = 'major';
      if (suffix === 'M') suffix = 'major';
      if (suffix === 'min7') suffix = 'm7';
      if (suffix === 'min9') suffix = 'm9';
      if (suffix === 'min11') suffix = 'm11';
      if (suffix === 'min13') suffix = 'm13';

      // Check if this combination exists, if not, try to find closest
      if (db.keys.includes(key) && db.suffixes.includes(suffix)) {
        setSelectedKey(key);
        setSelectedSuffix(suffix);
        setPositionIndex(0);
      }
    }, [initialChord, db]);

  useEffect(() => {
    async function loadDb() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${DB_URL}/${instrument}.json`);
        if (!response.ok) throw new Error('Failed to load chord database');
        const data = await response.json();
        setDb(data);
        
        if (!data.keys.includes(selectedKey)) setSelectedKey(data.keys[0]);
        if (!data.suffixes.includes(selectedSuffix)) setSelectedSuffix('major');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }
    loadDb();
  }, [instrument]);

  const currentChords = db?.chords[selectedKey.replace('#', 'sharp')] || [];
  const currentSuffixData = currentChords.find(c => c.suffix === selectedSuffix);
  const currentPositions = currentSuffixData?.positions || [];
  const currentPosition = currentPositions[positionIndex];

  const handleNextPosition = () => {
    if (currentPositions.length > 0) {
      setPositionIndex((prev) => (prev + 1) % currentPositions.length);
    }
  };

  const handlePrevPosition = () => {
    if (currentPositions.length > 0) {
      setPositionIndex((prev) => (prev - 1 + currentPositions.length) % currentPositions.length);
    }
  };

  const myInstrument = db ? {
    strings: db.main.strings,
    fretsOnChord: db.main.fretsOnChord,
    name: db.main.name,
    keys: [],
    tunings: db.tunings
  } : null;

  return (
    <div className="flex flex-col gap-6 w-full h-full p-4 overflow-hidden">
      {/* Header / Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className={cn(
            "flex p-1 rounded-xl border gap-1 transition-colors",
            resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-black/5"
          )}>
            {(['guitar', 'ukulele'] as Instrument[]).map(inst => (
              <button
                key={inst}
                onClick={() => { setInstrument(inst); setPositionIndex(0); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all",
                  instrument === inst 
                    ? "bg-emerald-500 text-white shadow-lg" 
                    : (resolvedTheme === 'dark' ? "text-white/40 hover:text-white/60" : "text-slate-400 hover:text-slate-900")
                )}
              >
                {inst}
              </button>
            ))}
          </div>
          <div className={cn("flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.2em]", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-300")}>
            <Settings2 className="w-3 h-3" />
            Config
          </div>
        </div>

        <div className="flex gap-2">
          <select 
            value={selectedKey}
            onChange={(e) => { 
              setSelectedKey(e.target.value); 
              setPositionIndex(0); 
              e.target.blur();
              setTimeout(() => e.target.blur(), 0);
            }}
            className={cn(
              "flex-1 border rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-emerald-500/50 appearance-none cursor-pointer transition-colors",
              resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-black/5 text-slate-900"
            )}
          >
            {db?.keys.map(k => <option key={k} value={k} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>{k}</option>)}
          </select>
          <select 
            value={selectedSuffix}
            onChange={(e) => { 
              setSelectedSuffix(e.target.value); 
              setPositionIndex(0); 
              e.target.blur();
              setTimeout(() => e.target.blur(), 0);
            }}
            className={cn(
              "flex-[2] border rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-emerald-500/50 appearance-none cursor-pointer transition-colors",
              resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-black/5 text-slate-900"
            )}
          >
            {db?.suffixes.map(s => <option key={s} value={s} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Diagram Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <span className={cn("text-[9px] font-bold uppercase tracking-widest", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-300")}>Loading DB...</span>
          </div>
        ) : error ? (
          <div className="text-red-400 text-[10px] font-medium bg-red-400/5 border border-red-400/20 p-4 rounded-xl flex items-center gap-3">
             <Info className="w-4 h-4" />
             {error}
          </div>
        ) : currentPosition && myInstrument ? (
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="relative group">
              <div className="absolute -inset-8 bg-emerald-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={cn(
                "relative p-8 rounded-[2rem] border shadow-2xl transition-colors",
                resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5"
              )}>
                <ChordDiagram 
                  chord={currentPosition} 
                  instrument={myInstrument} 
                />
              </div>
            </div>

            {/* Voicing Browser */}
            <div className="flex items-center gap-6">
              <button 
                onClick={handlePrevPosition}
                className={cn(
                  "p-2 rounded-full border transition-all active:scale-95",
                  resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10" : "bg-white border-black/5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 shadow-sm"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex flex-col items-center gap-1">
                <span className={cn("text-[10px] font-bold tracking-widest uppercase transition-colors", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>
                  Voicing {positionIndex + 1}
                </span>
                <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] transition-colors", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-400")}>
                  of {currentPositions.length} positions
                </span>
              </div>

              <button 
                onClick={handleNextPosition}
                className={cn(
                  "p-2 rounded-full border transition-all active:scale-95",
                  resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10" : "bg-white border-black/5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 shadow-sm"
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            {/* Tuning Info */}
            <div className="flex gap-2 mt-4">
              {db?.tunings.standard.map((note, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[8px] font-black text-emerald-400">
                    {note.replace(/\d/, '')}
                  </div>
                  <div className={cn("w-[1px] h-2 transition-colors", resolvedTheme === 'dark' ? "bg-white/10" : "bg-black/10")} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={cn("text-[10px] font-bold uppercase tracking-widest text-center px-8 transition-colors", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-300")}>
            No fingering found for this chord combination.
          </div>
        )}
      </div>
    </div>
  );
}
