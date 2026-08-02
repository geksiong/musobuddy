import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { InstrumentType, ProgressionChord } from '../types.ts';
import { useMetronome } from '../hooks/useMetronome.ts';
import { useAudio } from './AudioContext.tsx';
import { getIntervalsForChord } from '../constants.ts';
import {
  GroovePatternPreset,
  GROOVE_PRESETS,
  ChordTriggerType,
  BassTriggerType,
  PercussionLayer,
  getUserGroovePresets,
  saveUserGroovePreset,
  deleteUserGroovePreset
} from '../components/Accompaniment/grooveEngine.ts';

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

interface EarlyPushNotification {
  sourceBeat: number;
  targetBeat: number;
  pushedChord: string;
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

  // Groove Engine
  isGrooveEngineEnabled: boolean;
  setIsGrooveEngineEnabled: (enabled: boolean) => void;
  activeGroovePattern: GroovePatternPreset;
  setActiveGroovePattern: React.Dispatch<React.SetStateAction<GroovePatternPreset>>;
  customGroovePresets: GroovePatternPreset[];
  saveCustomPreset: (preset: GroovePatternPreset) => void;
  deleteCustomPreset: (id: string) => void;
  updateActiveGroovePatternStep: (
    layerType: 'chord' | 'bass' | 'percussion',
    stepIndex: number,
    newValue: any,
    percussionLayerId?: string
  ) => void;
  updatePercussionLayerProps: (layerId: string, props: Partial<PercussionLayer>) => void;
  currentSubStepIndex: number;
  setCurrentSubStepIndex: React.Dispatch<React.SetStateAction<number>>;
  earlyPushEvent: EarlyPushNotification | null;
  setEarlyPushEvent: React.Dispatch<React.SetStateAction<EarlyPushNotification | null>>;

  // Measure / Section Labels
  measureLabels: Record<number, string>;
  setMeasureLabels: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setMeasureLabel: (measureIndex: number, label: string) => void;
  deleteMeasureLabel: (measureIndex: number) => void;

  // Backwards compatibility aliases
  isRhythmEngineEnabled: boolean;
  setIsRhythmEngineEnabled: (enabled: boolean) => void;
  activeRhythmPattern: GroovePatternPreset;
  setActiveRhythmPattern: React.Dispatch<React.SetStateAction<GroovePatternPreset>>;
  customRhythmPresets: GroovePatternPreset[];
  updateActiveRhythmPatternStep: (
    layerType: 'chord' | 'bass' | 'percussion',
    stepIndex: number,
    newValue: any,
    percussionLayerId?: string
  ) => void;
}

const AccompanimentContext = createContext<AccompanimentContextType | null>(null);

const SyncEngine: React.FC = () => {
  const { 
    isPlaying, progression, arpeggioPreset, arpeggioRate, selectedInstrument, isBassEnabled,
    setCurrentIndex, setIsPendingStart, accompanimentVolume,
    isRhythmEngineEnabled, activeRhythmPattern, setCurrentSubStepIndex, setEarlyPushEvent
  } = useAccompaniment();
  const { currentBeat, activePattern, bpm } = useMetronome();
  const { playChord, playNote, playPercussion, setIsAccompanimentPlaying, isMetronomePlaying } = useAudio();
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
      setCurrentSubStepIndex(0);
      setEarlyPushEvent(null);
    }
  }, [isPlaying, isMetronomePlaying, masterLength, setIsPendingStart, setCurrentSubStepIndex, setEarlyPushEvent]); 

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

        // Check if Rhythm Engine is active
        if (isRhythmEngineEnabled && activeRhythmPattern) {
          const subsPerBeat = activeRhythmPattern.subdivisionsPerBeat || 2;
          const totalPatternSteps = activeRhythmPattern.chordPattern?.length || (masterLength * subsPerBeat);
          const currentBpm = Math.max(30, bpm || 120);
          const beatDurationMs = (60 / currentBpm) * 1000;
          const subStepDurationMs = beatDurationMs / subsPerBeat;
          const swingRatio = activeRhythmPattern.swingRatio;

          for (let s = 0; s < subsPerBeat; s++) {
            let delayMs = s * subStepDurationMs;
            if (swingRatio && subsPerBeat === 2) {
              if (s === 1) {
                delayMs = beatDurationMs * swingRatio;
              }
            }

            const stepIndex = (beatInMeasure * subsPerBeat + s) % totalPatternSteps;

            const triggerRhythmStep = () => {
              setCurrentSubStepIndex(stepIndex);

              // 1. CHORD LAYER
              const chordTrigger = activeRhythmPattern.chordPattern?.[stepIndex] || 'OFF';
              if (chordTrigger !== 'OFF') {
                if (chordTrigger === 'PUSH_NEXT_CHORD' || chordTrigger === 'PUSH_NEXT_ACCENT' || chordTrigger === 'PUSH_NEXT_ROOT') {
                  // Early anticipation of NEXT beat's chord!
                  const targetBeatIndex = (beatIndex + 1) % progression.length;
                  const nextInfo = getEffectiveChord(progression, targetBeatIndex);
                  if (nextInfo) {
                    const nextChord = nextInfo.chord;
                    const isAccent = chordTrigger === 'PUSH_NEXT_ACCENT';
                    const vol = accompanimentVolume * (isAccent ? 1.15 : 0.95);

                    if (chordTrigger === 'PUSH_NEXT_ROOT') {
                      const nextIntervals = getIntervalsForChord(nextChord) || [0, 4, 7];
                      playNote(nextIntervals[0], 0.8, selectedInstrument, vol);
                    } else {
                      playChord(nextChord, selectedInstrument, vol);
                    }

                    setEarlyPushEvent({
                      sourceBeat: beatIndex + 1,
                      targetBeat: targetBeatIndex + 1,
                      pushedChord: nextChord
                    });
                  }
                } else if (chordTrigger === 'CHORD' || chordTrigger === 'CHORD_ACCENT') {
                  const isAccent = chordTrigger === 'CHORD_ACCENT';
                  const vol = accompanimentVolume * (isAccent ? 1.15 : 0.95);
                  playChord(currentChord, selectedInstrument, vol);
                  setEarlyPushEvent(null);
                } else if (chordTrigger === 'ROOT' || chordTrigger === 'ROOT_ACCENT') {
                  const isAccent = chordTrigger === 'ROOT_ACCENT';
                  const vol = accompanimentVolume * (isAccent ? 1.15 : 0.95);
                  playNote(baseIntervals[0], 0.8, selectedInstrument, vol);
                  setEarlyPushEvent(null);
                } else if (chordTrigger === 'ARPEGGIO') {
                  const arpNote = baseIntervals[s % baseIntervals.length];
                  playNote(arpNote, 0.6, selectedInstrument, accompanimentVolume);
                }
              }

              // 2. BASS LAYER
              const bassTrigger = activeRhythmPattern.bassPattern?.[stepIndex] || 'OFF';
              if (bassTrigger !== 'OFF' && isBassEnabled) {
                if (bassTrigger === 'PUSH_NEXT_ROOT' || bassTrigger === 'PUSH_NEXT_FIFTH') {
                  const targetBeatIndex = (beatIndex + 1) % progression.length;
                  const nextInfo = getEffectiveChord(progression, targetBeatIndex);
                  if (nextInfo) {
                    const nextIntervals = getIntervalsForChord(nextInfo.chord) || [0, 4, 7];
                    const noteInterval = (bassTrigger === 'PUSH_NEXT_ROOT' ? nextIntervals[0] : (nextIntervals[2] || nextIntervals[0] + 7)) - 24;
                    playNote(noteInterval, 1.2, InstrumentType.Bass, accompanimentVolume * 1.05);
                  }
                } else if (bassTrigger === 'ROOT' || bassTrigger === 'ROOT_ACCENT') {
                  const isAccent = bassTrigger === 'ROOT_ACCENT';
                  playNote(baseIntervals[0] - 24, 1.2, InstrumentType.Bass, accompanimentVolume * (isAccent ? 1.1 : 0.9));
                } else if (bassTrigger === 'FIFTH') {
                  const fifthInterval = (baseIntervals[2] || baseIntervals[0] + 7) - 24;
                  playNote(fifthInterval, 1.2, InstrumentType.Bass, accompanimentVolume * 0.9);
                } else if (bassTrigger === 'WALKING') {
                  const targetBeatIndex = (beatIndex + 1) % progression.length;
                  const nextInfo = getEffectiveChord(progression, targetBeatIndex);
                  const nextRoot = nextInfo ? (getIntervalsForChord(nextInfo.chord)?.[0] || 0) : baseIntervals[0];
                  // Walking approach step (half step below next root)
                  const walkNote = (nextRoot - 1) - 24;
                  playNote(walkNote, 0.8, InstrumentType.Bass, accompanimentVolume * 0.85);
                }
              }

              // 3. PERCUSSION LAYERS
              if (activeRhythmPattern.percussionLayers) {
                activeRhythmPattern.percussionLayers.forEach(layer => {
                  if (layer.muted) return;
                  const patValue = layer.pattern?.[stepIndex] || 0;
                  if (patValue > 0) {
                    const isAccent = patValue === 2;
                    playPercussion(layer.sound, isAccent, layer.volume * accompanimentVolume);
                  }
                });
              }
            };

            if (delayMs <= 2) {
              triggerRhythmStep();
            } else {
              const timer = setTimeout(triggerRhythmStep, delayMs);
              subBeatTimersRef.current.push(timer);
            }
          }
        } else {
          // Standard Arpeggiator Logic
          if (isBassEnabled && beatInMeasure === 0) {
            playNote(baseIntervals[0] - 24, 2.0, InstrumentType.Bass, accompanimentVolume);
          }

          let notesPerBeat = 1;
          if (arpeggioRate === '2x') notesPerBeat = 2;
          else if (arpeggioRate === '3x') notesPerBeat = 3;
          else if (arpeggioRate === '4x') notesPerBeat = 4;
          else if (arpeggioRate === '0.5x') notesPerBeat = 0.5;

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

          let intervals = [...baseIntervals];
          if (arpeggioPreset.includes('2 Octaves')) {
            intervals = [...baseIntervals, ...baseIntervals.map(i => i + 12)];
          }

          for (let s = 0; s < notesPerBeat; s++) {
            const delayMs = s * subStepDurationMs;
            const globalStepIndex = Math.floor(effectiveBeat * notesPerBeat + s);

            const triggerNote = () => {
              if (arpeggioPreset === 'Block') {
                if (s === 0 && (isExplicit || beatInMeasure === 0)) {
                  playChord(currentChord, selectedInstrument, accompanimentVolume);
                }
              } else if (arpeggioPreset === 'Double-Time Strum') {
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
                  default:
                    noteIndex = globalStepIndex % len;
                }

                const noteDuration = Math.min(0.8, (beatDurationMs / notesPerBeat) / 1000 * 1.4);
                const noteVolume = accompanimentVolume * (s === 0 ? 1.0 : 0.88);

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
      }
      lastBeatRef.current = currentBeat;
    } else {
      lastBeatRef.current = -1;
      clearSubBeatTimers();
    }
  }, [
    currentBeat, isPlaying, progression, arpeggioPreset, arpeggioRate, masterLength,
    selectedInstrument, isBassEnabled, setCurrentIndex, playChord, playNote, playPercussion,
    accompanimentVolume, setIsPendingStart, bpm, isRhythmEngineEnabled, activeRhythmPattern,
    setCurrentSubStepIndex, setEarlyPushEvent
  ]);

  return null;
};

export const AccompanimentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const [isBassEnabled, setIsBassEnabled] = useState(true);
  const [selectedLibraryRoot, setSelectedLibraryRoot] = useState('C');
  const [trackedChord, setTrackedChord] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [accompanimentVolume, setAccompanimentVolume] = useState(0.8);
  const [isPendingStart, setIsPendingStart] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Groove Engine State
  const [isGrooveEngineEnabled, setIsGrooveEngineEnabled] = useState(true);
  const [activeGroovePattern, setActiveGroovePattern] = useState<GroovePatternPreset>(GROOVE_PRESETS[0]);
  const [customGroovePresets, setCustomGroovePresets] = useState<GroovePatternPreset[]>(() => getUserGroovePresets());
  const [currentSubStepIndex, setCurrentSubStepIndex] = useState(0);
  const [earlyPushEvent, setEarlyPushEvent] = useState<EarlyPushNotification | null>(null);

  const { activePattern } = useMetronome();
  const masterVoice = activePattern?.voices[0];
  const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;

  const saveCustomPreset = (preset: GroovePatternPreset) => {
    const updated = saveUserGroovePreset(preset);
    setCustomGroovePresets(updated);
    setActiveGroovePattern(preset);
  };

  const deleteCustomPreset = (id: string) => {
    const updated = deleteUserGroovePreset(id);
    setCustomGroovePresets(updated);
    if (activeGroovePattern.id === id) {
      setActiveGroovePattern(GROOVE_PRESETS[0]);
    }
  };

  const updateActiveGroovePatternStep = (
    layerType: 'chord' | 'bass' | 'percussion',
    stepIndex: number,
    newValue: any,
    percussionLayerId?: string
  ) => {
    setActiveGroovePattern(prev => {
      if (!prev) return prev;
      if (layerType === 'chord') {
        const newPat = [...prev.chordPattern];
        newPat[stepIndex] = newValue as ChordTriggerType;
        return { ...prev, chordPattern: newPat };
      }
      if (layerType === 'bass') {
        const newPat = [...prev.bassPattern];
        newPat[stepIndex] = newValue as BassTriggerType;
        return { ...prev, bassPattern: newPat };
      }
      if (layerType === 'percussion' && percussionLayerId) {
        const newLayers = prev.percussionLayers.map(l => {
          if (l.id !== percussionLayerId) return l;
          const newPat = [...l.pattern];
          newPat[stepIndex] = newValue as number;
          return { ...l, pattern: newPat };
        });
        return { ...prev, percussionLayers: newLayers };
      }
      return prev;
    });
  };

  const updatePercussionLayerProps = (layerId: string, props: Partial<PercussionLayer>) => {
    setActiveGroovePattern(prev => {
      if (!prev) return prev;
      const newLayers = prev.percussionLayers.map(l => l.id === layerId ? { ...l, ...props } : l);
      return { ...prev, percussionLayers: newLayers };
    });
  };

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

  const [measureLabels, setMeasureLabels] = useState<Record<number, string>>({});

  const setMeasureLabel = (measureIndex: number, label: string) => {
    setMeasureLabels(prev => {
      if (!label || label.trim() === '') {
        const next = { ...prev };
        delete next[measureIndex];
        return next;
      }
      return { ...prev, [measureIndex]: label.trim() };
    });
  };

  const deleteMeasureLabel = (measureIndex: number) => {
    setMeasureLabels(prev => {
      const next = { ...prev };
      delete next[measureIndex];
      return next;
    });
  };

  const clearAll = () => {
    setProgression(Array.from({ length: masterLength }, () => ({
      id: Math.random().toString(36).substr(2, 9),
      name: ''
    })));
    setMeasureLabels({});
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
    currentIndex, setCurrentIndex,

    // Measure / Section Labels
    measureLabels, setMeasureLabels,
    setMeasureLabel, deleteMeasureLabel,

    // Groove Engine
    isGrooveEngineEnabled, setIsGrooveEngineEnabled,
    activeGroovePattern, setActiveGroovePattern,
    customGroovePresets, saveCustomPreset, deleteCustomPreset,
    updateActiveGroovePatternStep, updatePercussionLayerProps,
    currentSubStepIndex, setCurrentSubStepIndex,
    earlyPushEvent, setEarlyPushEvent,

    // Aliases
    isRhythmEngineEnabled: isGrooveEngineEnabled,
    setIsRhythmEngineEnabled: setIsGrooveEngineEnabled,
    activeRhythmPattern: activeGroovePattern,
    setActiveRhythmPattern: setActiveGroovePattern,
    customRhythmPresets: customGroovePresets,
    updateActiveRhythmPatternStep: updateActiveGroovePatternStep,
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

