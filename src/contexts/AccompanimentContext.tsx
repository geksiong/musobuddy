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
    isPlaying, progression, arpeggioPreset, selectedInstrument, isBassEnabled,
    setCurrentIndex, setIsPendingStart, accompanimentVolume
  } = useAccompaniment();
  const { currentBeat, activePattern } = useMetronome();
  const { playChord, playNote, setIsAccompanimentPlaying, isMetronomePlaying } = useAudio();
  const lastBeatRef = useRef<number>(-1);
  const playbackStartBeatRef = useRef<number>(0);
  const pendingStartRef = useRef<boolean>(false);

  const masterVoice = activePattern?.voices[0];
  const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;

  useEffect(() => {
    setIsAccompanimentPlaying(isPlaying);
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
      const intervals = getIntervalsForChord(currentChord);
      const beatInMeasure = effectiveBeat % masterLength;

      if (currentBeat !== lastBeatRef.current) {
        if (arpeggioPreset === 'Block') {
          if (isExplicit || beatInMeasure === 0) {
            playChord(currentChord, selectedInstrument, accompanimentVolume);
          }
        }

        if (isBassEnabled && beatInMeasure === 0) {
          playNote(intervals[0] - 24, 2.0, InstrumentType.Bass, accompanimentVolume);
        }

        if (arpeggioPreset !== 'Block') {
          const len = intervals.length;
          let noteIndex = 0;
          switch (arpeggioPreset) {
            case 'Up': noteIndex = effectiveBeat % len; break;
            case 'Down': noteIndex = (len - 1) - (effectiveBeat % len); break;
            case 'Up-Down': {
              const mod = effectiveBeat % (len * 2 - 2);
              noteIndex = mod < len ? mod : (len * 2 - 2) - mod;
              break;
            }
            case 'Converge': {
              const cIdx = effectiveBeat % len;
              noteIndex = cIdx % 2 === 0 ? cIdx / 2 : (len - 1) - Math.floor(cIdx / 2);
              break;
            }
            case 'Diverge': {
              const mid = Math.floor(len / 2);
              const dIdx = effectiveBeat % len;
              noteIndex = dIdx % 2 === 0 ? mid + dIdx / 2 : mid - (dIdx + 1) / 2;
              break;
            }
            case 'Stutter': noteIndex = Math.floor(effectiveBeat / 2) % len; break;
            case 'Random': noteIndex = Math.floor(Math.random() * len); break;
          }
          playNote(intervals[noteIndex], 0.4, selectedInstrument, accompanimentVolume);
        }
      }
      lastBeatRef.current = currentBeat;
    } else {
      lastBeatRef.current = -1;
    }
  }, [currentBeat, isPlaying, progression, arpeggioPreset, masterLength, selectedInstrument, isBassEnabled, setCurrentIndex, playChord, playNote, accompanimentVolume, setIsPendingStart]);

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

