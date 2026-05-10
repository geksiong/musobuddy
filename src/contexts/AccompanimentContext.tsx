import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { InstrumentType } from '../types.ts';
import { useMetronome } from '../hooks/useMetronome.ts';
import { useAudio } from './AudioContext.tsx';

interface ProgressionChord {
  id: string;
  name: string;
}

interface AccompanimentContextType {
  progression: ProgressionChord[];
  setProgression: React.Dispatch<React.SetStateAction<ProgressionChord[]>>;
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
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
}

const AccompanimentContext = createContext<AccompanimentContextType | null>(null);

const CHORD_INTERVALS: Record<string, number[]> = {
  'major': [0, 4, 7],
  'minor': [0, 3, 7],
  '7': [0, 4, 7, 10],
  'maj7': [0, 4, 7, 11],
  'min7': [0, 3, 7, 10],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  'add9': [0, 4, 7, 14],
  'dim': [0, 3, 6],
  'dim7': [0, 3, 6, 9],
  'm7b5': [0, 3, 6, 10],
  '69': [0, 4, 7, 9, 14],
  '9': [0, 4, 7, 10, 14],
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 17, 21],
  'aug': [0, 4, 8],
  'm': [0, 3, 7],
  'm7': [0, 3, 7, 10],
  'm6': [0, 3, 7, 9],
  'm69': [0, 3, 7, 9, 14],
  'm9': [0, 3, 7, 10, 14],
  'madd9': [0, 3, 7, 14],
  'm11': [0, 3, 7, 10, 14, 17],
  'mmaj7': [0, 3, 7, 11],
  'mmaj7b5': [0, 3, 6, 11],
  'mmaj9': [0, 3, 7, 11, 14],
  '7#9': [0, 4, 7, 10, 15],
};

const ROOT_OFFSETS: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

function getIntervalsForChord(chordName: string): number[] {
  let root = '';
  let suffix = '';
  if (chordName.length >= 2 && (chordName[1] === '#' || chordName[1] === 'b')) {
    root = chordName.substring(0, 2);
    suffix = chordName.substring(2);
  } else {
    root = chordName[0];
    suffix = chordName.substring(1);
  }
  const offset = ROOT_OFFSETS[root] || 0;
  let type = suffix === '' ? 'major' : suffix;
  if (type === 'm') type = 'minor';
  if (type === 'min7') type = 'm7';
  if (type === 'major7') type = 'maj7';
  if (type === 'mmajor7') type = 'mmaj7';
  
  const intervals = CHORD_INTERVALS[type] || CHORD_INTERVALS['major'];
  return intervals.map(v => v + offset);
}

const SyncEngine: React.FC = () => {
  const { 
    isPlaying, progression, arpeggioPreset, selectedInstrument, isBassEnabled,
    setCurrentIndex, setIsPendingStart, accompanimentVolume
  } = useAccompaniment();
  const { currentBeat, isPlaying: isMetronomeRunning, activePattern } = useMetronome();
  const { playChord, playNote } = useAudio();
  const lastBeatRef = useRef<number>(-1);
  const playbackStartBeatRef = useRef<number>(0);
  const pendingStartRef = useRef<boolean>(false);

  const masterVoice = activePattern?.voices[0];
  const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;

  useEffect(() => {
    if (isPlaying) {
      if (isMetronomeRunning && currentBeat % masterLength !== 0) {
        pendingStartRef.current = true;
        setIsPendingStart(true);
      } else {
        playbackStartBeatRef.current = currentBeat;
        pendingStartRef.current = false;
        setIsPendingStart(false);
      }
    } else {
      pendingStartRef.current = false;
      setIsPendingStart(false);
    }
  }, [isPlaying, isMetronomeRunning, masterLength, setIsPendingStart]); 

  useEffect(() => {
    if (isPlaying && isMetronomeRunning) {
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

      const totalMeasures = Math.floor(effectiveBeat / masterLength);
      const idx = progression.length > 0 ? totalMeasures % progression.length : 0;
      setCurrentIndex(idx);

      const currentChordObj = progression[idx];
      if (!currentChordObj) return;
      const currentChord = currentChordObj.name;
      const intervals = getIntervalsForChord(currentChord);
      const beatInMeasure = effectiveBeat % masterLength;

      if (beatInMeasure === 0 && currentBeat !== lastBeatRef.current) {
        if (arpeggioPreset === 'Block') {
          playChord(currentChord, selectedInstrument, accompanimentVolume);
        }
        if (isBassEnabled) {
          playNote(intervals[0] - 24, 2.0, InstrumentType.Bass, accompanimentVolume);
        }
      }

      if (currentBeat !== lastBeatRef.current) {
        if (arpeggioPreset !== 'Block') {
          const len = intervals.length;
          let noteIndex = 0;
          switch (arpeggioPreset) {
            case 'Up': noteIndex = effectiveBeat % len; break;
            case 'Down': noteIndex = (len - 1) - (effectiveBeat % len); break;
            case 'Up-Down':
              const mod = effectiveBeat % (len * 2 - 2);
              noteIndex = mod < len ? mod : (len * 2 - 2) - mod;
              break;
            case 'Converge':
              const cIdx = effectiveBeat % len;
              noteIndex = cIdx % 2 === 0 ? cIdx / 2 : (len - 1) - Math.floor(cIdx / 2);
              break;
            case 'Diverge':
              const mid = Math.floor(len / 2);
              const dIdx = effectiveBeat % len;
              noteIndex = dIdx % 2 === 0 ? mid + dIdx / 2 : mid - (dIdx + 1) / 2;
              break;
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
  }, [currentBeat, isPlaying, isMetronomeRunning, progression, arpeggioPreset, masterLength, selectedInstrument, isBassEnabled, setCurrentIndex, playChord, playNote]);

  return null;
};

export const AccompanimentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progression, setProgression] = useState<ProgressionChord[]>([
    { id: '1', name: 'C' },
    { id: '2', name: 'G' },
    { id: '3', name: 'Am' },
    { id: '4', name: 'F' }
  ]);
  const [arpeggioPreset, setArpeggioPreset] = useState('Block');
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>(InstrumentType.Piano);
  const [isBassEnabled, setIsBassEnabled] = useState(false);
  const [selectedLibraryRoot, setSelectedLibraryRoot] = useState('C');
  const [trackedChord, setTrackedChord] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [accompanimentVolume, setAccompanimentVolume] = useState(0.8);
  const [isPendingStart, setIsPendingStart] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const value = {
    progression, setProgression,
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
