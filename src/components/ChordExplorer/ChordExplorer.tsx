/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Settings2, 
  Info, 
  Volume2, 
  Cpu, 
  Database, 
  Sparkles,
  Filter,
  Music2
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { InstrumentType } from '../../types.ts';
import { formatChordName } from '../Accompaniment/constants.ts';
import { 
  InstrumentName, 
  INSTRUMENT_CONFIGS, 
  GeneratedPosition, 
  generateChordVoicings, 
  parseChordInfo,
  computeFingersAndBarres,
  normalizeKey,
  normalizeSuffix
} from '../../lib/chordEngine.ts';

const DB_URL = 'https://raw.githubusercontent.com/tombatossals/chords-db/master/lib';

export type EngineMode = 'algo' | 'hybrid' | 'db';

interface DBPosition {
  frets: number[];
  fingers: number[];
  baseFret: number;
  barres: number[];
  capo?: boolean;
}

interface ChordData {
  key: string;
  suffix: string;
  positions: DBPosition[];
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

const ALL_KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
const ALL_SUFFIXES = [
  'major', 'minor', '7', 'maj7', 'min7', 'sus2', 'sus4', 'add9', 'madd9',
  'dim', 'dim7', 'm7b5', 'aug', '6', 'm6', '69', 'm69', '9', 'm9', '11', 'm11', '13',
  '7#9', '7b9', '7b13', 'maj7#11', 'mmaj7'
];

export type DotDisplayMode = 'intervals' | 'fingers' | 'notes';

const PITCH_NAMES_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const PITCH_NAMES_FLAT  = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

export function getNoteName(midiNote: number, rootKey: string = 'C'): string {
  const pc = ((midiNote % 12) + 12) % 12;
  const isFlatContext = rootKey.includes('b') || ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(rootKey);
  return isFlatContext ? PITCH_NAMES_FLAT[pc] : PITCH_NAMES_SHARP[pc];
}

export interface IntervalInfo {
  semitones: number;
  label: string;
  fullName: string;
  category: 'root' | 'third' | 'fifth' | 'seventh' | 'extension';
  hex: string;
  strokeHex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeBg: string;
}

export function getIntervalInfo(notePitchClass: number, rootPitchClass: number, suffix: string = ''): IntervalInfo {
  const semitones = ((notePitchClass - rootPitchClass) % 12 + 12) % 12;

  switch (semitones) {
    case 0:
      return {
        semitones: 0,
        label: 'R',
        fullName: 'Root',
        category: 'root',
        hex: '#ef4444',
        strokeHex: '#f87171',
        bgClass: 'bg-red-500',
        textClass: 'text-red-500 dark:text-red-400',
        borderClass: 'border-red-500/30',
        badgeBg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      };
    case 1:
      return {
        semitones: 1,
        label: '♭9',
        fullName: 'Flat 9th',
        category: 'extension',
        hex: '#f97316',
        strokeHex: '#fb923c',
        bgClass: 'bg-orange-500',
        textClass: 'text-orange-500 dark:text-orange-400',
        borderClass: 'border-orange-500/30',
        badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
      };
    case 2:
      return {
        semitones: 2,
        label: suffix.includes('sus2') ? '2' : '9',
        fullName: suffix.includes('sus2') ? '2nd (sus2)' : '9th',
        category: 'extension',
        hex: '#10b981',
        strokeHex: '#34d399',
        bgClass: 'bg-emerald-500',
        textClass: 'text-emerald-500 dark:text-emerald-400',
        borderClass: 'border-emerald-500/30',
        badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      };
    case 3:
      return {
        semitones: 3,
        label: '♭3',
        fullName: 'Minor 3rd',
        category: 'third',
        hex: '#f59e0b',
        strokeHex: '#fbbf24',
        bgClass: 'bg-amber-500',
        textClass: 'text-amber-500 dark:text-amber-400',
        borderClass: 'border-amber-500/30',
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      };
    case 4:
      return {
        semitones: 4,
        label: '3',
        fullName: 'Major 3rd',
        category: 'third',
        hex: '#f59e0b',
        strokeHex: '#fbbf24',
        bgClass: 'bg-amber-500',
        textClass: 'text-amber-500 dark:text-amber-400',
        borderClass: 'border-amber-500/30',
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      };
    case 5:
      return {
        semitones: 5,
        label: suffix.includes('sus4') || suffix.includes('11') ? '11' : '4',
        fullName: '4th / 11th',
        category: 'extension',
        hex: '#10b981',
        strokeHex: '#34d399',
        bgClass: 'bg-emerald-500',
        textClass: 'text-emerald-500 dark:text-emerald-400',
        borderClass: 'border-emerald-500/30',
        badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      };
    case 6:
      return {
        semitones: 6,
        label: '♭5',
        fullName: 'Flat 5th',
        category: 'fifth',
        hex: '#06b6d4',
        strokeHex: '#22d3ee',
        bgClass: 'bg-cyan-500',
        textClass: 'text-cyan-500 dark:text-cyan-400',
        borderClass: 'border-cyan-500/30',
        badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      };
    case 7:
      return {
        semitones: 7,
        label: '5',
        fullName: 'Perfect 5th',
        category: 'fifth',
        hex: '#0284c7',
        strokeHex: '#38bdf8',
        bgClass: 'bg-sky-500',
        textClass: 'text-sky-500 dark:text-sky-400',
        borderClass: 'border-sky-500/30',
        badgeBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      };
    case 8:
      return {
        semitones: 8,
        label: '#5',
        fullName: 'Sharp 5th',
        category: 'fifth',
        hex: '#06b6d4',
        strokeHex: '#22d3ee',
        bgClass: 'bg-cyan-500',
        textClass: 'text-cyan-500 dark:text-cyan-400',
        borderClass: 'border-cyan-500/30',
        badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
      };
    case 9:
      return {
        semitones: 9,
        label: suffix.includes('dim7') ? '♭♭7' : '6',
        fullName: suffix.includes('dim7') ? 'Diminished 7th' : '6th / 13th',
        category: suffix.includes('dim7') ? 'seventh' : 'extension',
        hex: suffix.includes('dim7') ? '#a855f7' : '#10b981',
        strokeHex: suffix.includes('dim7') ? '#c084fc' : '#34d399',
        bgClass: suffix.includes('dim7') ? 'bg-purple-500' : 'bg-emerald-500',
        textClass: suffix.includes('dim7') ? 'text-purple-500 dark:text-purple-400' : 'text-emerald-500 dark:text-emerald-400',
        borderClass: suffix.includes('dim7') ? 'border-purple-500/30' : 'border-emerald-500/30',
        badgeBg: suffix.includes('dim7') ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      };
    case 10:
      return {
        semitones: 10,
        label: '♭7',
        fullName: 'Minor 7th',
        category: 'seventh',
        hex: '#a855f7',
        strokeHex: '#c084fc',
        bgClass: 'bg-purple-500',
        textClass: 'text-purple-500 dark:text-purple-400',
        borderClass: 'border-purple-500/30',
        badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      };
    case 11:
      return {
        semitones: 11,
        label: '7',
        fullName: 'Major 7th',
        category: 'seventh',
        hex: '#ec4899',
        strokeHex: '#f472b6',
        bgClass: 'bg-pink-500',
        textClass: 'text-pink-500 dark:text-pink-400',
        borderClass: 'border-pink-500/30',
        badgeBg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
      };
    default:
      return {
        semitones: 0,
        label: 'R',
        fullName: 'Root',
        category: 'root',
        hex: '#ef4444',
        strokeHex: '#f87171',
        bgClass: 'bg-red-500',
        textClass: 'text-red-500 dark:text-red-400',
        borderClass: 'border-red-500/30',
        badgeBg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      };
  }
}

/**
 * Custom Color-Coded High-Contrast SVG Chord Diagram Component
 */
function ChordDiagram({ 
  position, 
  numStrings = 6, 
  numFrets = 5,
  tuningMidi = [64, 59, 55, 50, 45, 40],
  rootPitchClass = 0,
  rootKey = 'C',
  selectedSuffix = 'major',
  dotDisplayMode = 'intervals',
}: { 
  position: GeneratedPosition | DBPosition; 
  numStrings?: number; 
  numFrets?: number;
  tuningMidi?: number[];
  rootPitchClass?: number;
  rootKey?: string;
  selectedSuffix?: string;
  dotDisplayMode?: DotDisplayMode;
}) {
  const { resolvedTheme } = useTheme();
  const S = 22; // Grid cell size
  const padding = 32;

  const isMuted = (fret: number) => fret === -1;
  const isOpen = (fret: number) => fret === 0;

  const frets = position.frets || [];
  const fingers = position.fingers || [];
  const barres = position.barres || [];

  const fretted = frets.filter(f => f > 0);
  const minFretted = fretted.length > 0 ? Math.min(...fretted) : 1;
  const maxFretted = fretted.length > 0 ? Math.max(...fretted) : 1;

  const effectiveBaseFret = position.baseFret && position.baseFret > 0 
    ? position.baseFret 
    : minFretted;

  const fretSpan = fretted.length > 0 ? (maxFretted - effectiveBaseFret + 1) : 0;
  const actualNumFrets = Math.max(numFrets, fretSpan, 5);

  const width = (numStrings - 1) * S + padding * 2;
  const height = actualNumFrets * S + padding * 2;

  return (
    <svg width={width} height={height + 25} viewBox={`0 0 ${width} ${height + 25}`} className="overflow-visible select-none">
      {/* Base Fret Number */}
      {effectiveBaseFret > 1 && (
        <text 
          x={padding - 8} 
          y={padding + S/2 + 4} 
          textAnchor="end"
          className="text-[10px] font-black fill-emerald-500 uppercase italic"
        >
          {effectiveBaseFret}fr
        </text>
      )}

      {/* Nut / Top Fret Line */}
      <line 
        x1={padding} 
        y1={padding} 
        x2={padding + (numStrings - 1) * S} 
        y2={padding} 
        stroke="currentColor" 
        strokeWidth={effectiveBaseFret === 1 ? 5 : 2}
        className={resolvedTheme === 'dark' ? "text-white/60" : "text-slate-800"}
      />

      {/* Horizontal Fret Lines */}
      {Array.from({ length: actualNumFrets }).map((_, i) => (
        <line 
          key={i}
          x1={padding} 
          y1={padding + (i + 1) * S} 
          x2={padding + (numStrings - 1) * S} 
          y2={padding + (i + 1) * S} 
          stroke="currentColor" 
          strokeWidth="1.5"
          className={resolvedTheme === 'dark' ? "text-white/15" : "text-black/15"}
        />
      ))}

      {/* Vertical String Lines */}
      {Array.from({ length: numStrings }).map((_, i) => (
        <line 
          key={i}
          x1={padding + i * S} 
          y1={padding} 
          x2={padding + i * S} 
          y2={padding + actualNumFrets * S} 
          stroke="currentColor" 
          strokeWidth="1.5"
          className={resolvedTheme === 'dark' ? "text-white/25" : "text-black/25"}
        />
      ))}

      {/* Barre Rectangles */}
      {barres.map((fret, i) => {
        const positionsOnFret = frets.map((f, idx) => (f === fret ? idx : -1)).filter(idx => idx !== -1);
        if (positionsOnFret.length < 2) return null;
        
        const start = positionsOnFret[0];
        const end = positionsOnFret[positionsOnFret.length - 1];
        const relativeFret = fret - (effectiveBaseFret > 0 ? effectiveBaseFret : 1) + 1;

        if (relativeFret < 1 || relativeFret > actualNumFrets) return null;
        
        const startMidi = tuningMidi[start] !== undefined ? tuningMidi[start] + fret : 0;
        const startPc = ((startMidi % 12) + 12) % 12;
        const startInterval = getIntervalInfo(startPc, rootPitchClass, selectedSuffix);

        return (
          <rect
            key={i}
            x={padding + start * S - 8}
            y={padding + relativeFret * S - S + 6}
            width={(end - start) * S + 16}
            height={12}
            rx="6"
            style={{
              fill: startInterval.hex,
              opacity: 0.35,
              stroke: startInterval.strokeHex,
              strokeWidth: 1.5,
            }}
          />
        );
      })}

      {/* Fingerings / Fret Markers / Color-Coded Note Dots */}
      {frets.map((fret, stringIdx) => {
        const stringMidi = tuningMidi[stringIdx] !== undefined ? tuningMidi[stringIdx] + Math.max(0, fret) : 0;
        const notePc = ((stringMidi % 12) + 12) % 12;
        const interval = getIntervalInfo(notePc, rootPitchClass, selectedSuffix);
        const noteName = getNoteName(stringMidi, rootKey);

        if (isMuted(fret)) {
          return (
            <text 
              key={stringIdx} 
              x={padding + stringIdx * S} 
              y={padding - 12} 
              textAnchor="middle" 
              className={cn("text-[12px] font-black", resolvedTheme === 'dark' ? "fill-white/30" : "fill-slate-400")}
            >
              ×
            </text>
          );
        }

        if (isOpen(fret)) {
          return (
            <g key={stringIdx}>
              <circle 
                cx={padding + stringIdx * S}
                cy={padding - 14}
                r="5.5"
                style={{ stroke: interval.hex, fill: 'none', strokeWidth: 2.5 }}
              />
              {dotDisplayMode === 'intervals' && (
                <text 
                  x={padding + stringIdx * S} 
                  y={padding - 23} 
                  textAnchor="middle" 
                  className="text-[8px] font-black"
                  fill={interval.hex}
                >
                  {interval.label}
                </text>
              )}
              {dotDisplayMode === 'notes' && (
                <text 
                  x={padding + stringIdx * S} 
                  y={padding - 23} 
                  textAnchor="middle" 
                  className="text-[8px] font-black"
                  fill={interval.hex}
                >
                  {noteName}
                </text>
              )}
            </g>
          );
        }

        const relativeFret = fret - (effectiveBaseFret > 0 ? effectiveBaseFret : 1) + 1;
        if (relativeFret < 1 || relativeFret > actualNumFrets) return null;
        
        let labelText = '';
        if (dotDisplayMode === 'fingers') {
          labelText = fingers[stringIdx] > 0 ? `${fingers[stringIdx]}` : interval.label;
        } else if (dotDisplayMode === 'intervals') {
          labelText = interval.label;
        } else if (dotDisplayMode === 'notes') {
          labelText = noteName;
        }

        return (
          <g key={stringIdx}>
            <circle 
              cx={padding + stringIdx * S}
              cy={padding + relativeFret * S - S/2}
              r="9.5"
              style={{
                fill: interval.hex,
                stroke: interval.strokeHex,
                strokeWidth: 1.5,
              }}
            />
            <text
              x={padding + stringIdx * S}
              y={padding + relativeFret * S - S/2 + 3.5}
              textAnchor="middle"
              className="text-[8.5px] font-black fill-white select-none"
            >
              {labelText}
            </text>
          </g>
        );
      })}

      {/* Diagram Footer Label */}
      <text 
        x={width / 2} 
        y={height + 18} 
        textAnchor="middle" 
        className={cn("text-[8px] font-black uppercase tracking-[0.25em]", resolvedTheme === 'dark' ? "fill-white/20" : "fill-black/30")}
      >
        Voicing Diagram
      </text>
    </svg>
  );
}

export default function ChordExplorer({ initialChord = 'C' }: { initialChord?: string }) {
  const [instrument, setInstrument] = useState<InstrumentName>('guitar');
  const [tuningKey, setTuningKey] = useState<string>('standard');
  const [engineMode, setEngineMode] = useState<EngineMode>('algo');
  const [db, setDb] = useState<InstrumentDB | null>(null);
  
  const [selectedKey, setSelectedKey] = useState('C');
  const [selectedSuffix, setSelectedSuffix] = useState('major');
  const [positionIndex, setPositionIndex] = useState(0);
  const [tagFilter, setTagFilter] = useState<string>('All');
  const [dotDisplayMode, setDotDisplayMode] = useState<DotDisplayMode>('fingers');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  const { resolvedTheme } = useTheme();
  const { playNote } = useAudio();

  // Sync with prop changes
  useEffect(() => {
    if (!initialChord) return;

    let key = '';
    let rawSuffix = '';

    if (initialChord.length >= 2 && (initialChord[1] === '#' || initialChord[1] === 'b')) {
      key = initialChord.substring(0, 2);
      rawSuffix = initialChord.substring(2);
    } else {
      key = initialChord[0];
      rawSuffix = initialChord.substring(1);
    }

    const normKey = normalizeKey(key);
    const normSuffix = normalizeSuffix(rawSuffix);

    setSelectedKey(normKey);
    setSelectedSuffix(normSuffix);
    setPositionIndex(0);
  }, [initialChord]);

  // Load static database in background for DB/Hybrid mode
  useEffect(() => {
    async function loadDb() {
      setIsLoadingDb(true);
      setDbError(null);
      try {
        const response = await fetch(`${DB_URL}/${instrument}.json`);
        if (!response.ok) throw new Error('Failed to load database');
        const data = await response.json();
        setDb(data);
      } catch (err) {
        setDbError(err instanceof Error ? err.message : 'Database offline');
      } finally {
        setIsLoadingDb(false);
      }
    }
    if (engineMode !== 'algo') {
      loadDb();
    }
  }, [instrument, engineMode]);

  const instConfig = INSTRUMENT_CONFIGS[instrument] || INSTRUMENT_CONFIGS['guitar'];
  const currentTuning = instConfig.tunings[tuningKey] || instConfig.tunings['standard'];

  // 1. Algorithmic Voicings Generation
  const algoVoicings = useMemo(() => {
    return generateChordVoicings(instrument, selectedKey, selectedSuffix, tuningKey);
  }, [instrument, selectedKey, selectedSuffix, tuningKey]);

  // 2. Database Voicings Lookup
  const dbVoicings = useMemo(() => {
    if (!db) return [];
    const dbKey = selectedKey.replace('#', 'sharp');
    const chordList = db.chords[dbKey] || [];
    const chordData = chordList.find(c => c.suffix === selectedSuffix);
    if (!chordData) return [];

    return chordData.positions.map((pos) => {
      const parsed = parseChordInfo(selectedKey, selectedSuffix);
      const fingering = computeFingersAndBarres(pos.frets, instConfig.strings);
      const fretted = pos.frets.filter(f => f > 0);
      const isOpenOnly = fretted.length === 0;
      const hasOpen = pos.frets.includes(0);

      const baseFret = pos.baseFret || (fretted.length > 0 ? Math.min(...fretted) : 1);
      const barres = fingering.barres.length > 0 ? fingering.barres : (pos.barres || []);
      const fingers = isOpenOnly ? new Array(pos.frets.length).fill(0) : (fingering.fingers || pos.fingers || []);

      const fretSpan = fretted.length > 0 ? Math.max(...fretted) - Math.min(...fretted) : 0;
      const noteNames = pos.frets.map((f, i) => {
        if (f >= 0) return `${currentTuning.midi[i] + f}`;
        return 'X';
      });

      const tags: string[] = ['DB Voicing'];
      if (pos.frets.includes(0) || isOpenOnly) tags.push('Open Position');
      if (barres.length > 0) tags.push('Barre Chord');

      return {
        frets: pos.frets,
        fingers,
        baseFret,
        barres,
        score: 90,
        noteNames,
        pitchClasses: parsed.targetPitchClasses,
        tags,
        inversionLabel: 'Standard Voicing',
        fretSpan
      } as GeneratedPosition;
    });
  }, [db, selectedKey, selectedSuffix, currentTuning]);

  // Combined Active Voicings list
  const activeVoicings = useMemo(() => {
    let list: GeneratedPosition[] = [];
    if (engineMode === 'algo') {
      list = algoVoicings;
    } else if (engineMode === 'db') {
      list = dbVoicings.length > 0 ? dbVoicings : algoVoicings;
    } else { // hybrid
      // Merge unique frets
      const map = new Map<string, GeneratedPosition>();
      algoVoicings.forEach(v => map.set(v.frets.join(','), v));
      dbVoicings.forEach(v => {
        const keyStr = v.frets.join(',');
        if (!map.has(keyStr)) map.set(keyStr, v);
      });
      list = Array.from(map.values());
    }

    // Deduplicate and normalize open string voicings across all modes
    const uniqueMap = new Map<string, GeneratedPosition>();
    for (const v of list) {
      const fretted = v.frets.filter(f => f > 0);
      const isOpenOnly = fretted.length === 0;
      const hasOpen = v.frets.includes(0);

      const normalized: GeneratedPosition = {
        ...v,
        baseFret: fretted.length > 0 ? Math.min(...fretted) : 1,
        barres: v.barres || [],
        fingers: isOpenOnly ? new Array(v.frets.length).fill(0) : v.fingers,
        fretSpan: isOpenOnly ? 0 : v.fretSpan,
      };

      const keyStr = normalized.frets.join(',');
      if (!uniqueMap.has(keyStr)) {
        uniqueMap.set(keyStr, normalized);
      }
    }

    let resultList = Array.from(uniqueMap.values());

    // Sort by fretted position from lowest to highest fret position
    resultList.sort((a, b) => {
      const frettedA = a.frets.filter(f => f > 0);
      const frettedB = b.frets.filter(f => f > 0);
      const minA = frettedA.length > 0 ? Math.min(...frettedA) : 0;
      const minB = frettedB.length > 0 ? Math.min(...frettedB) : 0;
      if (minA !== minB) return minA - minB;

      const maxA = frettedA.length > 0 ? Math.max(...frettedA) : 0;
      const maxB = frettedB.length > 0 ? Math.max(...frettedB) : 0;
      if (maxA !== maxB) return maxA - maxB;

      return (b.score || 0) - (a.score || 0);
    });

    if (tagFilter !== 'All') {
      return resultList.filter(v => v.tags.includes(tagFilter));
    }
    return resultList;
  }, [engineMode, algoVoicings, dbVoicings, tagFilter]);

  const currentVoicing = activeVoicings[positionIndex] || activeVoicings[0];

  const parsedChord = useMemo(() => {
    return parseChordInfo(selectedKey, selectedSuffix);
  }, [selectedKey, selectedSuffix]);

  // Audio Strum Playback
  const handleAuditionVoicing = (voicing?: GeneratedPosition) => {
    const target = voicing || currentVoicing;
    if (!target) return;

    const audioInstrument = (instrument === 'bass' || instrument === 'bass5')
      ? InstrumentType.Bass 
      : InstrumentType.Guitar;

    let delay = 0;
    target.frets.forEach((fret, stringIdx) => {
      if (fret >= 0) {
        const midiNote = currentTuning.midi[stringIdx] + fret;
        const intervalFromC4 = midiNote - 60; // C4 is MIDI 60

        setTimeout(() => {
          playNote(intervalFromC4, 1.6, audioInstrument, 0.7);
        }, delay);

        delay += 35; // 35ms strum stagger between strings
      }
    });
  };

  const handleNextPosition = () => {
    if (activeVoicings.length > 0) {
      setPositionIndex((prev) => (prev + 1) % activeVoicings.length);
    }
  };

  const handlePrevPosition = () => {
    if (activeVoicings.length > 0) {
      setPositionIndex((prev) => (prev - 1 + activeVoicings.length) % activeVoicings.length);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full h-full p-4 md:p-6 overflow-y-auto">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4">
        {/* Row 1: Instrument Selector */}
        <div className="flex flex-col gap-1.5 w-full">
          <div className={cn("text-[8px] font-black uppercase tracking-widest pl-1", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
            Instrument
          </div>
          <div className={cn(
            "flex p-1.5 rounded-xl border gap-1.5 transition-colors overflow-x-auto w-full no-scrollbar",
            resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-black/5"
          )}>
            {(Object.keys(INSTRUMENT_CONFIGS) as InstrumentName[]).map(instKey => {
              const config = INSTRUMENT_CONFIGS[instKey];
              return (
                <button
                  key={instKey}
                  onClick={() => { 
                    setInstrument(instKey); 
                    setTuningKey(config.defaultTuning || 'standard');
                    setPositionIndex(0); 
                  }}
                  className={cn(
                    "px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0",
                    instrument === instKey 
                      ? "bg-emerald-500 text-white shadow-lg" 
                      : (resolvedTheme === 'dark' ? "text-white/40 hover:text-white/70" : "text-slate-500 hover:text-slate-900")
                  )}
                >
                  {config.displayName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Engine Mode & Quick Settings */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className={cn("text-[8px] font-black uppercase tracking-widest pl-1", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
            Chord Search Parameters
          </div>
          {/* Engine Mode Pills */}
          <div className={cn(
            "flex p-1 rounded-xl border gap-1 transition-colors items-center",
            resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-black/5"
          )}>
            <button
              onClick={() => setEngineMode('algo')}
              title="Algorithmic Combinatorial Voicing Search"
              className={cn(
                "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all",
                engineMode === 'algo'
                  ? "bg-emerald-500 text-white shadow-md"
                  : (resolvedTheme === 'dark' ? "text-white/40 hover:text-white/70" : "text-slate-400 hover:text-slate-900")
              )}
            >
              <Cpu className="w-3 h-3" />
              Algo Engine
            </button>
            <button
              onClick={() => setEngineMode('hybrid')}
              title="Hybrid Mode (Algorithm + Static Database)"
              className={cn(
                "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all",
                engineMode === 'hybrid'
                  ? "bg-emerald-500 text-white shadow-md"
                  : (resolvedTheme === 'dark' ? "text-white/40 hover:text-white/70" : "text-slate-400 hover:text-slate-900")
              )}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              Hybrid
            </button>
            <button
              onClick={() => setEngineMode('db')}
              title="Static Database Lookup"
              className={cn(
                "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all",
                engineMode === 'db'
                  ? "bg-emerald-500 text-white shadow-md"
                  : (resolvedTheme === 'dark' ? "text-white/40 hover:text-white/70" : "text-slate-400 hover:text-slate-900")
              )}
            >
              <Database className="w-3 h-3" />
              DB
            </button>
          </div>
        </div>

        {/* Key, Suffix, & Tuning Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Key Dropdown */}
          <div className="flex flex-col gap-1">
            <label className={cn("text-[8px] font-black uppercase tracking-widest pl-1", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
              Key / Root
            </label>
            <select 
              value={selectedKey}
              onChange={(e) => { 
                setSelectedKey(e.target.value); 
                setPositionIndex(0); 
                e.target.blur();
              }}
              className={cn(
                "w-full border rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-emerald-500 appearance-none cursor-pointer transition-colors",
                resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-black/10 text-slate-900"
              )}
            >
              {ALL_KEYS.map(k => (
                <option key={k} value={k} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                  {formatChordName(k)}
                </option>
              ))}
            </select>
          </div>

          {/* Suffix Dropdown */}
          <div className="flex flex-col gap-1">
            <label className={cn("text-[8px] font-black uppercase tracking-widest pl-1", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
              Chord Quality
            </label>
            <select 
              value={selectedSuffix}
              onChange={(e) => { 
                setSelectedSuffix(e.target.value); 
                setPositionIndex(0); 
                e.target.blur();
              }}
              className={cn(
                "w-full border rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-emerald-500 appearance-none cursor-pointer transition-colors",
                resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-black/10 text-slate-900"
              )}
            >
              {ALL_SUFFIXES.map(s => (
                <option key={s} value={s} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                  {formatChordName(s)}
                </option>
              ))}
            </select>
          </div>

          {/* Tuning Dropdown */}
          <div className="flex flex-col gap-1">
            <label className={cn("text-[8px] font-black uppercase tracking-widest pl-1", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
              Tuning
            </label>
            <select 
              value={tuningKey}
              onChange={(e) => { 
                setTuningKey(e.target.value); 
                setPositionIndex(0); 
                e.target.blur();
              }}
              className={cn(
                "w-full border rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-emerald-500 appearance-none cursor-pointer transition-colors",
                resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-black/10 text-slate-900"
              )}
            >
              {Object.entries(instConfig.tunings).map(([tKey, tInfo]) => (
                <option key={tKey} value={tKey} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                  {(tInfo as { name: string }).name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chord Formula & Notes Info Banner */}
      <div className={cn(
        "p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 transition-colors",
        resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-black/5"
      )}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Music2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black tracking-wide">
              {formatChordName(`${parsedChord.normalizedRoot}${parsedChord.formula.label !== 'Major' ? parsedChord.suffix : ''}`)}
              <span className={cn("ml-2 text-[9px] font-bold uppercase tracking-widest", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
                ({parsedChord.formula.label})
              </span>
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {parsedChord.noteNames.map((note, idx) => (
                <span key={idx} className="text-[9px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {formatChordName(note)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Audition Play Strum Button */}
        <button
          onClick={() => handleAuditionVoicing()}
          disabled={!currentVoicing}
          className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-600 disabled:opacity-40 cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5" />
          Play Strum
        </button>
      </div>

      {/* Main Diagram Area: Directly below selectors & formula banner */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-[300px]">
        {currentVoicing ? (
          <div className="flex flex-col items-center gap-4 w-full">

            {/* Chord Diagram with Left / Right Arrows directly on sides */}
            <div className="flex items-center justify-center gap-3 sm:gap-6 w-full py-1">
              {/* Left Arrow Button */}
              <button 
                onClick={handlePrevPosition}
                disabled={activeVoicings.length <= 1}
                className={cn(
                  "p-2.5 sm:p-3 rounded-full transition-all active:scale-95 disabled:opacity-20 shrink-0 cursor-pointer",
                  resolvedTheme === 'dark' 
                    ? "bg-white/10 text-white hover:bg-emerald-500 hover:text-white" 
                    : "bg-slate-200 text-slate-800 hover:bg-emerald-500 hover:text-white shadow-xs"
                )}
                title="Previous Voicing"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* SVG Chord Diagram (Unbordered) */}
              <div className="relative group flex items-center justify-center px-2 py-1">
                <div className="absolute -inset-4 bg-emerald-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex flex-col items-center">
                  <ChordDiagram 
                    position={currentVoicing} 
                    numStrings={instConfig.strings}
                    numFrets={instConfig.fretsOnChord}
                    tuningMidi={currentTuning.midi}
                    rootPitchClass={parsedChord.rootPitchClass}
                    rootKey={selectedKey}
                    selectedSuffix={selectedSuffix}
                    dotDisplayMode={dotDisplayMode}
                  />
                </div>
              </div>

              {/* Right Arrow Button */}
              <button 
                onClick={handleNextPosition}
                disabled={activeVoicings.length <= 1}
                className={cn(
                  "p-2.5 sm:p-3 rounded-full transition-all active:scale-95 disabled:opacity-20 shrink-0 cursor-pointer",
                  resolvedTheme === 'dark' 
                    ? "bg-white/10 text-white hover:bg-emerald-500 hover:text-white" 
                    : "bg-slate-200 text-slate-800 hover:bg-emerald-500 hover:text-white shadow-xs"
                )}
                title="Next Voicing"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Voicing Counter & Badges Row */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-black tracking-widest uppercase transition-colors", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>
                  Voicing {positionIndex + 1}
                </span>
                <span className={cn("text-[8px] font-bold uppercase tracking-[0.15em]", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
                  of {activeVoicings.length} generated positions
                </span>
              </div>

              {/* Voicing Tags Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md">
                {currentVoicing.tags?.map((tag, i) => (
                  <span 
                    key={i} 
                    className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      tag === 'Barre Chord' ? "bg-purple-500/10 border-purple-500/30 text-purple-400" :
                      tag === 'Open Position' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                      tag === 'Root in Bass' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/40" : "bg-slate-200 border-black/10 text-slate-600"
                    )}
                  >
                    {tag}
                  </span>
                ))}
                {currentVoicing.inversionLabel && (
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
                    {currentVoicing.inversionLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Voicing Thumbnail Pills Selector */}
            {activeVoicings.length > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xs my-0.5">
                {activeVoicings.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPositionIndex(i);
                      handleAuditionVoicing(v);
                    }}
                    className={cn(
                      "w-6 h-6 rounded-lg text-[9px] font-mono font-bold flex items-center justify-center transition-all border cursor-pointer",
                      positionIndex === i 
                        ? "bg-emerald-500 border-emerald-400 text-white shadow-md scale-110"
                        : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/40 hover:text-white" : "bg-slate-100 border-black/5 text-slate-500 hover:bg-slate-200")
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Diagram Control Bar: Dot Mode Toggle & Harmonic Color Key */}
            <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-md px-1 mt-1">
              {/* Display Mode Pills */}
              <div className={cn(
                "flex p-1 rounded-xl border gap-1 transition-colors items-center",
                resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-black/5"
              )}>
                <span className={cn("text-[8px] font-black uppercase tracking-wider px-1.5", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>
                  Labels:
                </span>
                {(['fingers', 'intervals', 'notes'] as DotDisplayMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDotDisplayMode(mode)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      dotDisplayMode === mode
                        ? "bg-emerald-500 text-white shadow-md"
                        : (resolvedTheme === 'dark' ? "text-white/40 hover:text-white/70" : "text-slate-400 hover:text-slate-900")
                    )}
                  >
                    {mode === 'fingers' ? 'Fingers' : mode === 'intervals' ? 'Intervals' : 'Notes'}
                  </button>
                ))}
              </div>

              {/* Color Legend Badge Row */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  Root
                </span>
                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  3rd
                </span>
                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
                  5th
                </span>
                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                  7th
                </span>
                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Ext
                </span>
              </div>
            </div>

            {/* String-by-String Note & Interval Breakdown */}
            <div className={cn(
              "w-full max-w-md p-3.5 rounded-2xl border flex flex-col gap-2 transition-colors mt-1",
              resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-black/5"
            )}>
              <button 
                onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
                className={cn(
                  "w-full text-[9px] font-black uppercase tracking-widest flex items-center justify-between cursor-pointer group/btn select-none",
                  resolvedTheme === 'dark' ? "text-white/50 hover:text-white" : "text-slate-500 hover:text-slate-900"
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span>Voicing String Breakdown</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isBreakdownOpen && "rotate-180")} />
                </span>
                <span className="font-mono text-[8px] opacity-70">Treble ← Bass</span>
              </button>

              {isBreakdownOpen && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {currentVoicing.frets.map((fret, stringIdx) => {
                    const stringMidi = currentTuning.midi[stringIdx] !== undefined ? currentTuning.midi[stringIdx] + Math.max(0, fret) : 0;
                    const openMidi = currentTuning.midi[stringIdx] || 0;
                    const openNoteName = getNoteName(openMidi, selectedKey);
                    const notePc = ((stringMidi % 12) + 12) % 12;
                    const interval = getIntervalInfo(notePc, parsedChord.rootPitchClass, selectedSuffix);
                    const noteName = getNoteName(stringMidi, selectedKey);

                    return (
                      <div 
                        key={stringIdx}
                        className={cn(
                          "p-2 rounded-xl border flex flex-col gap-1 transition-all",
                          fret === -1
                            ? (resolvedTheme === 'dark' ? "bg-black/20 border-white/5 opacity-50" : "bg-slate-100 border-black/5 opacity-50")
                            : (resolvedTheme === 'dark' ? "bg-slate-900/60 border-white/10" : "bg-white border-black/5 shadow-xs")
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn("text-[8px] font-mono font-bold uppercase", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")}>
                            Str {instConfig.strings - stringIdx} ({openNoteName})
                          </span>
                          <span className={cn("text-[8px] font-mono font-black", fret === -1 ? "text-red-400" : fret === 0 ? "text-amber-400" : "text-emerald-400")}>
                            {fret === -1 ? 'Muted' : fret === 0 ? 'Open' : `Fret ${fret}`}
                          </span>
                        </div>

                        {fret >= 0 ? (
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[11px] font-black font-mono">
                              {noteName}
                            </span>
                            <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black border", interval.badgeBg)}>
                              {interval.label} ({interval.fullName})
                            </span>
                          </div>
                        ) : (
                          <span className={cn("text-[9px] font-bold italic mt-0.5", resolvedTheme === 'dark' ? "text-white/20" : "text-slate-300")}>
                            Unplayed
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className={cn("text-[10px] font-bold uppercase tracking-widest text-center px-8 py-12 transition-colors", resolvedTheme === 'dark' ? "text-white/30" : "text-slate-400")}>
            No playable voicing found for this chord combination.
          </div>
        )}
      </div>
    </div>
  );
}
