import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { InstrumentType, ProgressionChord } from '../types.ts';
import { useMetronome } from '../hooks/useMetronome.ts';
import { useAudio } from './AudioContext.tsx';
import { getIntervalsForChord } from '../constants.ts';

export function getEffectiveChord(
  progression: ProgressionChord[],
  beatIndex: number
): { chord: string; isExplicit: boolean } | null {
  if (!progression || progression.length === 0) return null;
  if (beatIndex < 0 || beatIndex >= progression.length) return null;

  const target = progression[beatIndex];
  if (target && target.name && target.name.trim() !== '') {
    return { chord: target.name.trim(), isExplicit: true };
  }

  // Search backward from beatIndex - 1
  for (let i = beatIndex - 1; i >= 0; i--) {
    if (progression[i] && progression[i].name && progression[i].name.trim() !== '') {
      return { chord: progression[i].name.trim(), isExplicit: false };
    }
  }

  // Search backward from end of progression (wrap around)
  for (let i = progression.length - 1; i > beatIndex; i--) {
    if (progression[i] && progression[i].name && progression[i].name.trim() !== '') {
      return { chord: progression[i].name.trim(), isExplicit: false };
    }
  }

  return null;
}

interface AccompanimentContextType {
  progression: ProgressionChord[];
  setProgression: React.Dispatch<React.SetStateAction<ProgressionChord[]>>;
  selectedBeatIndex: number | null;
  setSelectedBeatIndex: (index: number | null) => void;
  clearBeat: (index: number) => void;
  deleteBeat: (index: number) => void;
  insertBeat: (index: number, chordName?: string) => void;
  addBeat: (chordName?: string) => void;
  addMeasure: () => void;
  clearAll: () => void;
  arpeggioPreset: string;
  setArpeggioPreset: (preset: string) => void;
  arpeggioRate: string;
  setArpeggioRate: (rate: string) => void;
  selectedInstrument: InstrumentType;
  setSelectedInstrument: (inst: InstrumentType) => void;
  isBassEnabled: boolean;
  setIsBassEnabled: (enabled: boolean) => void;
  selectedLibraryRoot: string;
  setSelectedLibraryRoot: (root: string) => void;
  trackedChord: string | null;
  setTrackedChord: (chord: string | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  accompanimentVolume: number;
  setAccompanimentVolume: (volume: number) => void;
  isPendingStart: boolean;
  setIsPendingStart: React.Dispatch<React.SetStateAction<boolean>>;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
}

const AccompanimentContext = createContext<AccompanimentContextType | null>(null);

const SyncEngine: React.FC = () => {
  const { 
    isPlaying, progression, arpeggioPreset, arpeggioRate, selectedInstrument, isBassEnabled,
    setCurrentIndex, setIsPendingStart, accompanimentVolume
  } = useAccompaniment();
  const { currentBeat, activePattern, bpm } = useMetronome();
  const { playChord, playNote, setIsAccompanimentPlaying, isMetronomePlaying } = useAudio();
  const lastBeatRef = useRef<number>(-1);
  const playbackStartBeatRef = useRef<number>(0);
  const pendingStartRef = useRef<boolean>(false);
  const subBeatTimersRef = useRef<NodeJS.Timeout[]>([]);

  const masterVoice = activePattern?.voices[0];
  const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;

  const clearSubBeatTimers = () => {
    subBeatTimersRef.current.forEach(t => clearTimeout(t));
    subBeatTimersRef.current = [];
  };

  useEffect(() => {
    setIsAccompanimentPlaying(isPlaying);
    if (!isPlaying) clearSubBeatTimers();
  }, [isPlaying, setIsAccompanimentPlaying]);

  useEffect(() => {
    if (isPlaying) {
      if (lastBeatRef.current === -1) {
        if (isMetronomePlaying && currentBeat % masterLength !== 0) {
          pendingStartRef.current = true;
          setIsPendingStart(true);
        } else {
          playbackStartBeatRef.current = currentBeat;
          pendingStartRef.current = false;
          setIsPendingStart(false);
        }
      }
    } else {
      pendingStartRef.current = false;
      setIsPendingStart(false);
      lastBeatRef.current = -1;
      clearSubBeatTimers();
    }
  }, [isPlaying, isMetronomePlaying, masterLength, setIsPendingStart]); 

  useEffect(() => {
    if (isPlaying) {
      if (pendingStartRef.current) {
        if (currentBeat % masterLength === 0) {
          playbackStartBeatRef.current = currentBeat;
          pendingStartRef.current = false;
          setIsPendingStart(false);
        } else {
          return;
        }
      }

      const effectiveBeat = currentBeat - playbackStartBeatRef.current;
      if (effectiveBeat < 0) return;

      if (progression.length === 0) return;

      const beatIndex = effectiveBeat % progression.length;
      setCurrentIndex(beatIndex);

      const effectiveInfo = getEffectiveChord(progression, beatIndex);
      if (!effectiveInfo) return;

      const currentChord = effectiveInfo.chord;
      const isExplicit = effectiveInfo.isExplicit;
      const baseIntervals = getIntervalsForChord(currentChord) || [0, 4, 7];
      const beatInMeasure = effectiveBeat % masterLength;

      if (currentBeat !== lastBeatRef.current) {
        clearSubBeatTimers();

        // 1. Play Bass Note on Measure Downbeat if enabled
        if (isBassEnabled && beatInMeasure === 0) {
          playNote(baseIntervals[0] - 24, 2.0, InstrumentType.Bass, accompanimentVolume);
        }

        // 2. Determine Sub-Beat Subdivisions & Rate
        let notesPerBeat = 1;
        if (arpeggioRate === '2x') notesPerBeat = 2;
        else if (arpeggioRate === '3x') notesPerBeat = 3;
        else if (arpeggioRate === '4x') notesPerBeat = 4;
        else if (arpeggioRate === '0.5x') notesPerBeat = 0.5;

        // Override subdivision for preset-specific rhythmic patterns
        if (arpeggioPreset.includes('Double-Time') || arpeggioPreset === 'Bossa Nova Rhythm' || arpeggioPreset === 'Montuno / Latin') {
          notesPerBeat = Math.max(notesPerBeat, 2);
        } else if (arpeggioPreset === '16th Quad Arpeggio' || arpeggioPreset === 'Fingerstyle Folk') {
          notesPerBeat = Math.max(notesPerBeat, 4);
        }

        // Handle 0.5x Half Time (play only on even beats)
        if (notesPerBeat === 0.5) {
          if (effectiveBeat % 2 !== 0) {
            lastBeatRef.current = currentBeat;
            return;
          }
          notesPerBeat = 1;
        }

        const currentBpm = Math.max(30, bpm || 120);
        const beatDurationMs = (60 / currentBpm) * 1000;
        const subStepDurationMs = beatDurationMs / notesPerBeat;

        // Extended 2-octave intervals for multi-octave presets
        let intervals = [...baseIntervals];
        if (arpeggioPreset.includes('2 Octaves')) {
          intervals = [...baseIntervals, ...baseIntervals.map(i => i + 12)];
        }

        // Trigger Sub-Beats
        for (let s = 0; s < notesPerBeat; s++) {
          const delayMs = s * subStepDurationMs;
          const globalStepIndex = Math.floor(effectiveBeat * notesPerBeat + s);

          const triggerNote = () => {
            if (arpeggioPreset === 'Block') {
              if (s === 0 && (isExplicit || beatInMeasure === 0)) {
                playChord(currentChord, selectedInstrument, accompanimentVolume);
              }
            } else if (arpeggioPreset === 'Double-Time Strum') {
              // Alternating strum on sub-beats
              playChord(currentChord, selectedInstrument, accompanimentVolume * (s === 0 ? 1.0 : 0.8));
            } else {
              const len = intervals.length;
              let noteIndex = 0;

              switch (arpeggioPreset) {
                case 'Up':
                case 'Double-Time Up':
                  noteIndex = globalStepIndex % len;
                  break;

                case 'Down':
                  noteIndex = (len - 1) - (globalStepIndex % len);
                  break;

                case 'Up-Down':
                case 'Double-Time Up-Down': {
                  const mod = globalStepIndex % (len * 2 - 2 || 1);
                  noteIndex = mod < len ? mod : (len * 2 - 2) - mod;
                  break;
                }

                case 'Up (2 Octaves)':
                  noteIndex = globalStepIndex % len;
                  break;

                case 'Down (2 Octaves)':
                  noteIndex = (len - 1) - (globalStepIndex % len);
                  break;

                case 'Up-Down (2 Octaves)': {
                  const mod = globalStepIndex % (len * 2 - 2 || 1);
                  noteIndex = mod < len ? mod : (len * 2 - 2) - mod;
                  break;
                }

                case 'Alberti Bass': {
                  // Classic Alberti Pattern: Root, 5th, 3rd, 5th
                  const albertiSeq = [0, len - 1, Math.min(1, len - 1), len - 1];
                  noteIndex = albertiSeq[globalStepIndex % albertiSeq.length];
                  break;
                }

                case 'Pedal Point': {
                  // Alternates root note with moving chord tones
                  if (globalStepIndex % 2 === 0) {
                    noteIndex = 0;
                  } else {
                    const movingIdx = Math.floor(globalStepIndex / 2) % (len - 1 || 1) + 1;
                    noteIndex = Math.min(movingIdx, len - 1);
                  }
                  break;
                }

                case 'Fingerstyle Folk': {
                  // Folk pattern: Root, 3rd, 5th, 3rd, Octave/Upper, 5th, 3rd, 5th
                  const folkSeq = [0, 1, 2, 1, Math.min(3, len - 1), 2, 1, 2];
                  noteIndex = folkSeq[globalStepIndex % folkSeq.length] % len;
                  break;
                }

                case 'Bossa Nova Rhythm': {
                  // Syncopated Brazilian Bossa pattern
                  const bossaSeq = [0, len - 1, Math.min(1, len - 1), 0, len - 1];
                  noteIndex = bossaSeq[globalStepIndex % bossaSeq.length] % len;
                  break;
                }

                case 'Montuno / Latin': {
                  // Afro-Cuban Piano Montuno pattern with octave jumps
                  const montunoSeq = [0, len - 1, Math.min(1, len - 1), len - 1, 0, len - 1];
                  noteIndex = montunoSeq[globalStepIndex % montunoSeq.length] % len;
                  break;
                }

                case '16th Quad Arpeggio': {
                  noteIndex = globalStepIndex % len;
                  break;
                }

                case 'Converge': {
                  const cIdx = globalStepIndex % len;
                  noteIndex = cIdx % 2 === 0 ? cIdx / 2 : (len - 1) - Math.floor(cIdx / 2);
                  break;
                }

                case 'Diverge': {
                  const mid = Math.floor(len / 2);
                  const dIdx = globalStepIndex % len;
                  noteIndex = dIdx % 2 === 0 ? mid + dIdx / 2 : mid - (dIdx + 1) / 2;
                  break;
                }

                case 'Stutter':
                  noteIndex = Math.floor(globalStepIndex / 2) % len;
                  break;

                case 'Random':
                  noteIndex = Math.floor(Math.random() * len);
                  break;

                default:
                  noteIndex = globalStepIndex % len;
              }

              // Dynamic duration based on sub-step rate
              const noteDuration = Math.min(0.8, (beatDurationMs / notesPerBeat) / 1000 * 1.4);
              const noteVolume = accompanimentVolume * (s === 0 ? 1.0 : 0.88); // Accent beat downbeat

              playNote(intervals[noteIndex], noteDuration, selectedInstrument, noteVolume);
            }
          };

          if (delayMs <= 2) {
            triggerNote();
          } else {
            const timer = setTimeout(triggerNote, delayMs);
            subBeatTimersRef.current.push(timer);
          }
        }
      }
      lastBeatRef.current = currentBeat;
    } else {
      lastBeatRef.current = -1;
      clearSubBeatTimers();
    }
  }, [currentBeat, isPlaying, progression, arpeggioPreset, arpeggioRate, masterLength, selectedInstrument, isBassEnabled, setCurrentIndex, playChord, playNote, accompanimentVolume, setIsPendingStart, bpm]);

  return null;
};

export const AccompanimentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default progression: 4 measures of 4/4 (16 beats) with C, G, Am, F on Beat 1 of each measure
  const [progression, setProgression] = useState<ProgressionChord[]>([
    { id: '1a', name: 'C' },  { id: '1b', name: '' }, { id: '1c', name: '' }, { id: '1d', name: '' },
    { id: '2a', name: 'G' },  { id: '2b', name: '' }, { id: '2c', name: '' }, { id: '2d', name: '' },
    { id: '3a', name: 'Am' }, { id: '3b', name: '' }, { id: '3c', name: '' }, { id: '3d', name: '' },
    { id: '4a', name: 'F' },  { id: '4b', name: '' }, { id: '4c', name: '' }, { id: '4d', name: '' },
  ]);
  const [selectedBeatIndex, setSelectedBeatIndex] = useState<number | null>(0);
  const [arpeggioPreset, setArpeggioPreset] = useState('Block');
  const [arpeggioRate, setArpeggioRate] = useState('1x');
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>(InstrumentType.Piano);
  const [isBassEnabled, setIsBassEnabled] = useState(false);
  const [selectedLibraryRoot, setSelectedLibraryRoot] = useState('C');
  const [trackedChord, setTrackedChord] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [accompanimentVolume, setAccompanimentVolume] = useState(0.8);
  const [isPendingStart, setIsPendingStart] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { activePattern } = useMetronome();
  const masterVoice = activePattern?.voices[0];
  const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;

  const clearBeat = (index: number) => {
    setProgression(prev => prev.map((item, idx) => idx === index ? { ...item, name: '' } : item));
  };

  const deleteBeat = (index: number) => {
    setProgression(prev => {
      if (prev.length <= 1) {
        return [{ id: Math.random().toString(36).substr(2, 9), name: '' }];
      }
      return prev.filter((_, idx) => idx !== index);
    });
    setSelectedBeatIndex(prev => {
      if (prev === null) return 0;
      if (prev >= index && prev > 0) return prev - 1;
      return prev;
    });
  };

  const insertBeat = (index: number, chordName: string = '') => {
    const newId = Math.random().toString(36).substr(2, 9);
    setProgression(prev => {
      const next = [...prev];
      next.splice(index, 0, { id: newId, name: chordName });
      return next;
    });
    setSelectedBeatIndex(index);
  };

  const addBeat = (chordName: string = '') => {
    const newId = Math.random().toString(36).substr(2, 9);
    setProgression(prev => [...prev, { id: newId, name: chordName }]);
    setSelectedBeatIndex(progression.length);
  };

  const addMeasure = () => {
    setProgression(prev => {
      const newBeats: ProgressionChord[] = Array.from({ length: masterLength }, () => ({
        id: Math.random().toString(36).substr(2, 9),
        name: ''
      }));
      return [...prev, ...newBeats];
    });
  };

  const clearAll = () => {
    setProgression(Array.from({ length: masterLength }, () => ({
      id: Math.random().toString(36).substr(2, 9),
      name: ''
    })));
    setSelectedBeatIndex(0);
    setIsPlaying(false);
  };

  const value = {
    progression, setProgression,
    selectedBeatIndex, setSelectedBeatIndex,
    clearBeat, deleteBeat, insertBeat, addBeat, addMeasure, clearAll,
    arpeggioPreset, setArpeggioPreset,
    arpeggioRate, setArpeggioRate,
    selectedInstrument, setSelectedInstrument,
    isBassEnabled, setIsBassEnabled,
    selectedLibraryRoot, setSelectedLibraryRoot,
    trackedChord, setTrackedChord,
    isPlaying, setIsPlaying,
    accompanimentVolume, setAccompanimentVolume,
    isPendingStart, setIsPendingStart,
    currentIndex, setCurrentIndex
  };

  return (
    <AccompanimentContext.Provider value={value}>
      {children}
      <SyncEngine />
    </AccompanimentContext.Provider>
  );
};

export const useAccompaniment = () => {
  const context = useContext(AccompanimentContext);
  if (!context) throw new Error('useAccompaniment must be used within an AccompanimentProvider');
  return context;
};

