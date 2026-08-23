import React, { createContext, useContext, useState, useRef, useEffect, useMemo } from 'react';
import { InstrumentType, ProgressionChord, MetronomeSound } from '../types.ts';
import { useMetronome } from '../hooks/useMetronome.ts';
import { useAudio } from './AudioContext.tsx';
import { getIntervalsForChord } from '../constants.ts';
import {
  PianoVoicing,
  PianoVoicingStyle,
  solveProgressionVoicings,
  generatePianoVoicingCandidates,
  selectBestIsolatedVoicing
} from '../lib/pianoVoicingEngine.ts';
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

  // 1-Bar Count-In
  isCountInEnabled: boolean;
  setIsCountInEnabled: (enabled: boolean) => void;
  isCountingIn: boolean;
  setIsCountingIn: React.Dispatch<React.SetStateAction<boolean>>;
  countInBeat: number;
  setCountInBeat: React.Dispatch<React.SetStateAction<number>>;

  // Keyboard Voicing & Voice Leading Engine
  voicingStyle: PianoVoicingStyle;
  setVoicingStyle: (style: PianoVoicingStyle) => void;
  progressionVoicings: (PianoVoicing | null)[];
  currentVoicing: PianoVoicing | null;

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

const COUNT_IN_STORAGE_KEY = 'musobuddy_accompaniment_count_in_v1';

const SyncEngine: React.FC = () => {
  const { 
    isPlaying, progression, arpeggioPreset, arpeggioRate, selectedInstrument, isBassEnabled,
    setCurrentIndex, setIsPendingStart, accompanimentVolume,
    isRhythmEngineEnabled, activeRhythmPattern, setCurrentSubStepIndex, setEarlyPushEvent,
    progressionVoicings, voicingStyle,
    isCountInEnabled, isCountingIn, setIsCountingIn, countInBeat, setCountInBeat
  } = useAccompaniment();
  const { currentBeat, activePattern, bpm } = useMetronome();
  const { 
    playChord, playNote, playPercussion, setIsAccompanimentPlaying, 
    isMetronomePlaying, getAudioContext, registerBeatScheduler 
  } = useAudio();

  // Fresh refs to prevent audio scheduler from resetting or using stale closures
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const progressionRef = useRef(progression);
  progressionRef.current = progression;

  const progressionVoicingsRef = useRef(progressionVoicings);
  progressionVoicingsRef.current = progressionVoicings;

  const voicingStyleRef = useRef(voicingStyle);
  voicingStyleRef.current = voicingStyle;

  const activeRhythmPatternRef = useRef(activeRhythmPattern);
  activeRhythmPatternRef.current = activeRhythmPattern;

  const isRhythmEngineEnabledRef = useRef(isRhythmEngineEnabled);
  isRhythmEngineEnabledRef.current = isRhythmEngineEnabled;

  const arpeggioPresetRef = useRef(arpeggioPreset);
  arpeggioPresetRef.current = arpeggioPreset;

  const arpeggioRateRef = useRef(arpeggioRate);
  arpeggioRateRef.current = arpeggioRate;

  const selectedInstrumentRef = useRef(selectedInstrument);
  selectedInstrumentRef.current = selectedInstrument;

  const isBassEnabledRef = useRef(isBassEnabled);
  isBassEnabledRef.current = isBassEnabled;

  const accompanimentVolumeRef = useRef(accompanimentVolume);
  accompanimentVolumeRef.current = accompanimentVolume;

  const isCountInEnabledRef = useRef(isCountInEnabled);
  isCountInEnabledRef.current = isCountInEnabled;

  const activePatternRef = useRef(activePattern);
  activePatternRef.current = activePattern;

  const isMetronomePlayingRef = useRef(isMetronomePlaying);
  isMetronomePlayingRef.current = isMetronomePlaying;

  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  const masterVoice = activePattern?.voices[0];
  const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;
  const masterLengthRef = useRef(masterLength);
  masterLengthRef.current = masterLength;

  const lastScheduledBeatRef = useRef<number>(-1);
  const playbackStartBeatRef = useRef<number>(0);
  const pendingStartRef = useRef<boolean>(false);
  const subBeatTimersRef = useRef<NodeJS.Timeout[]>([]);

  const clearSubBeatTimers = () => {
    subBeatTimersRef.current.forEach(t => clearTimeout(t));
    subBeatTimersRef.current = [];
  };

  useEffect(() => {
    setIsAccompanimentPlaying(isPlaying);
    if (!isPlaying) {
      clearSubBeatTimers();
      pendingStartRef.current = false;
      setIsPendingStart(false);
      setIsCountingIn(false);
      setCountInBeat(0);
      lastScheduledBeatRef.current = -1;
      setCurrentSubStepIndex(0);
      setEarlyPushEvent(null);
    } else {
      // Initialize start state
      if (lastScheduledBeatRef.current === -1) {
        if (isMetronomePlayingRef.current && currentBeat % masterLengthRef.current !== 0) {
          pendingStartRef.current = true;
          setIsPendingStart(true);
          setIsCountingIn(false);
          setCountInBeat(0);
        } else {
          playbackStartBeatRef.current = currentBeat;
          pendingStartRef.current = false;
          setIsPendingStart(false);
          if (isCountInEnabledRef.current) {
            setIsCountingIn(true);
            setCountInBeat(1);
          }
        }
      }
    }
  }, [isPlaying, setIsAccompanimentPlaying, currentBeat, setIsPendingStart, setIsCountingIn, setCountInBeat, setCurrentSubStepIndex, setEarlyPushEvent]);

  useEffect(() => {
    if (!isPlaying) {
      registerBeatScheduler(null);
      return;
    }

    const scheduleBeat = (stepIndex: number, audioTime: number, baseBeatDurationSec: number) => {
      if (!isPlayingRef.current) return;
      if (stepIndex === lastScheduledBeatRef.current) return;
      lastScheduledBeatRef.current = stepIndex;

      const mLength = masterLengthRef.current || 4;

      if (pendingStartRef.current) {
        if (stepIndex % mLength === 0) {
          playbackStartBeatRef.current = stepIndex;
          pendingStartRef.current = false;
          setIsPendingStart(false);
          if (isCountInEnabledRef.current) {
            setIsCountingIn(true);
            setCountInBeat(1);
          }
        } else {
          return;
        }
      }

      const rawEffectiveBeat = stepIndex - playbackStartBeatRef.current;
      if (rawEffectiveBeat < 0) return;

      const isCountInActive = isCountInEnabledRef.current && rawEffectiveBeat < mLength;
      const ctx = getAudioContext?.() || null;
      const now = ctx ? ctx.currentTime : 0;

      // 1-MEASURE COUNT-IN LOGIC (Ahead-of-time audio + synced UI)
      if (isCountInActive) {
        const currentCountBeat = (rawEffectiveBeat % mLength) + 1;
        const uiDelayMs = Math.max(0, (audioTime - now) * 1000);
        const timer = setTimeout(() => {
          if (isPlayingRef.current) {
            setIsCountingIn(true);
            setCountInBeat(currentCountBeat);
            setCurrentIndex(0);
          }
        }, uiDelayMs);
        subBeatTimersRef.current.push(timer);

        // Sound count-in click if metronome is not already sounding clicks
        if (!isMetronomePlayingRef.current) {
          const isAccent = rawEffectiveBeat === 0;
          const clickSound = activePatternRef.current?.voices[0]?.sound || MetronomeSound.Woodblock;
          const countInVol = Math.max(0.85, accompanimentVolumeRef.current);
          playPercussion(clickSound, isAccent, countInVol, audioTime);
        }
        return;
      }

      // Count-in finished or disabled -> Play progression
      const effectiveBeat = isCountInEnabledRef.current
        ? (rawEffectiveBeat - mLength)
        : rawEffectiveBeat;

      if (effectiveBeat < 0) return;
      const prog = progressionRef.current;
      if (!prog || prog.length === 0) return;

      const beatIndex = effectiveBeat % prog.length;
      const effectiveInfo = getEffectiveChord(prog, beatIndex);
      if (!effectiveInfo) return;

      const currentChord = effectiveInfo.chord;
      const isExplicit = effectiveInfo.isExplicit;
      const progVoicings = progressionVoicingsRef.current;
      const currentVoicing = progVoicings?.[beatIndex] || null;
      const baseIntervals = getIntervalsForChord(currentChord) || [0, 4, 7];
      const beatInMeasure = effectiveBeat % mLength;

      const voicedMidiNotes = currentVoicing ? currentVoicing.allNotes : baseIntervals.map(i => i + 60);
      const voicedIntervals = voicedMidiNotes.map(m => m - 60);

      const isRhythmOn = isRhythmEngineEnabledRef.current;
      const activeGroove = activeRhythmPatternRef.current;
      const currentInstrument = selectedInstrumentRef.current;
      const currentAccompVol = accompanimentVolumeRef.current;
      const currentVoicingStyle = voicingStyleRef.current;
      const currentBassEnabled = isBassEnabledRef.current;
      const beatDurationSec = baseBeatDurationSec || (60 / Math.max(30, bpmRef.current || 120));

      if (isRhythmOn && activeGroove) {
        const subsPerBeat = activeGroove.subdivisionsPerBeat || 2;
        const totalPatternSteps = activeGroove.chordPattern?.length || (mLength * subsPerBeat);
        const subStepDurationSec = beatDurationSec / subsPerBeat;
        const swingRatio = activeGroove.swingRatio;

        for (let s = 0; s < subsPerBeat; s++) {
          let offsetSec = s * subStepDurationSec;
          if (swingRatio && subsPerBeat === 2 && s === 1) {
            offsetSec = beatDurationSec * swingRatio;
          }

          const eventTime = audioTime + offsetSec;
          const stepIdx = (beatInMeasure * subsPerBeat + s) % totalPatternSteps;

          // 1. CHORD LAYER (Scheduled in Web Audio)
          const chordTrigger = activeGroove.chordPattern?.[stepIdx] || 'OFF';
          if (chordTrigger !== 'OFF') {
            if (chordTrigger === 'PUSH_NEXT_CHORD' || chordTrigger === 'PUSH_NEXT_ACCENT' || chordTrigger === 'PUSH_NEXT_ROOT') {
              const targetBeatIndex = (beatIndex + 1) % prog.length;
              const nextInfo = getEffectiveChord(prog, targetBeatIndex);
              if (nextInfo) {
                const nextChord = nextInfo.chord;
                const nextVoicing = progVoicings?.[targetBeatIndex] || null;
                const isAccent = chordTrigger === 'PUSH_NEXT_ACCENT';
                const vol = currentAccompVol * (isAccent ? 1.15 : 0.95);

                if (chordTrigger === 'PUSH_NEXT_ROOT') {
                  const rootMidi = nextVoicing?.bassNote ?? (baseIntervals[0] + 36);
                  playNote(rootMidi - 60, 0.8, currentInstrument, vol, eventTime);
                } else {
                  playChord(nextChord, currentInstrument, vol, {
                    customMidiNotes: nextVoicing?.allNotes,
                    voicingStyle: currentVoicingStyle
                  }, eventTime);
                }
              }
            } else if (chordTrigger === 'CHORD' || chordTrigger === 'CHORD_ACCENT') {
              const isAccent = chordTrigger === 'CHORD_ACCENT';
              const vol = currentAccompVol * (isAccent ? 1.15 : 0.95);
              playChord(currentChord, currentInstrument, vol, {
                customMidiNotes: currentVoicing?.allNotes,
                voicingStyle: currentVoicingStyle
              }, eventTime);
            } else if (chordTrigger === 'ROOT' || chordTrigger === 'ROOT_ACCENT') {
              const isAccent = chordTrigger === 'ROOT_ACCENT';
              const vol = currentAccompVol * (isAccent ? 1.15 : 0.95);
              const rootMidi = currentVoicing?.bassNote ?? (baseIntervals[0] + 36);
              playNote(rootMidi - 60, 0.8, currentInstrument, vol, eventTime);
            } else if (chordTrigger === 'ARPEGGIO') {
              const arpInterval = voicedIntervals[s % voicedIntervals.length];
              playNote(arpInterval, 0.6, currentInstrument, currentAccompVol, eventTime);
            }
          }

          // 2. BASS LAYER (Scheduled in Web Audio)
          const bassTrigger = activeGroove.bassPattern?.[stepIdx] || 'OFF';
          if (bassTrigger !== 'OFF' && currentBassEnabled) {
            if (bassTrigger === 'PUSH_NEXT_ROOT' || bassTrigger === 'PUSH_NEXT_FIFTH') {
              const targetBeatIndex = (beatIndex + 1) % prog.length;
              const nextInfo = getEffectiveChord(prog, targetBeatIndex);
              if (nextInfo) {
                const nextVoicing = progVoicings?.[targetBeatIndex] || null;
                const nextBassMidi = nextVoicing?.bassNote ?? (baseIntervals[0] + 36);
                const noteMidi = bassTrigger === 'PUSH_NEXT_ROOT' ? nextBassMidi : (nextBassMidi + 7);
                playNote(noteMidi - 60, 1.2, InstrumentType.Bass, currentAccompVol * 1.05, eventTime);
              }
            } else if (bassTrigger === 'ROOT' || bassTrigger === 'ROOT_ACCENT') {
              const isAccent = bassTrigger === 'ROOT_ACCENT';
              const bassMidi = currentVoicing?.bassNote ?? (baseIntervals[0] + 36);
              playNote(bassMidi - 60, 1.2, InstrumentType.Bass, currentAccompVol * (isAccent ? 1.1 : 0.9), eventTime);
            } else if (bassTrigger === 'FIFTH') {
              const bassMidi = currentVoicing?.bassNote ?? (baseIntervals[0] + 36);
              playNote((bassMidi + 7) - 60, 1.2, InstrumentType.Bass, currentAccompVol * 0.9, eventTime);
            } else if (bassTrigger === 'WALKING') {
              const targetBeatIndex = (beatIndex + 1) % prog.length;
              const nextInfo = getEffectiveChord(prog, targetBeatIndex);
              const nextVoicing = progVoicings?.[targetBeatIndex] || null;
              const nextBassMidi = nextVoicing?.bassNote ?? (baseIntervals[0] + 36);
              playNote((nextBassMidi - 1) - 60, 0.8, InstrumentType.Bass, currentAccompVol * 0.85, eventTime);
            }
          }

          // 3. PERCUSSION LAYERS (Scheduled in Web Audio)
          if (activeGroove.percussionLayers) {
            activeGroove.percussionLayers.forEach(layer => {
              if (layer.muted) return;
              const patValue = layer.pattern?.[stepIdx] || 0;
              if (patValue > 0) {
                const isAccent = patValue === 2;
                playPercussion(layer.sound, isAccent, layer.volume * currentAccompVol, eventTime);
              }
            });
          }

          // 4. UI visual state updates decoupled from audio thread
          const visualDelayMs = Math.max(0, (eventTime - now) * 1000);
          const timer = setTimeout(() => {
            if (isPlayingRef.current) {
              if (s === 0) {
                setCurrentIndex(beatIndex);
                setIsCountingIn(false);
                setCountInBeat(0);
              }
              setCurrentSubStepIndex(stepIdx);
              if (chordTrigger === 'PUSH_NEXT_CHORD' || chordTrigger === 'PUSH_NEXT_ACCENT' || chordTrigger === 'PUSH_NEXT_ROOT') {
                const targetBeatIndex = (beatIndex + 1) % prog.length;
                const nextInfo = getEffectiveChord(prog, targetBeatIndex);
                if (nextInfo) {
                  setEarlyPushEvent({
                    sourceBeat: beatIndex + 1,
                    targetBeat: targetBeatIndex + 1,
                    pushedChord: nextInfo.chord
                  });
                }
              } else {
                setEarlyPushEvent(null);
              }
            }
          }, visualDelayMs);
          subBeatTimersRef.current.push(timer);
        }
      } else {
        // Standard Arpeggiator / Block Chords
        if (currentBassEnabled && beatInMeasure === 0) {
          const bassMidi = currentVoicing?.bassNote ?? (baseIntervals[0] + 36);
          playNote(bassMidi - 60, 2.0, InstrumentType.Bass, currentAccompVol, audioTime);
        }

        const arpPreset = arpeggioPresetRef.current;
        const arpRate = arpeggioRateRef.current;

        let notesPerBeat = 1;
        if (arpRate === '2x') notesPerBeat = 2;
        else if (arpRate === '3x') notesPerBeat = 3;
        else if (arpRate === '4x') notesPerBeat = 4;
        else if (arpRate === '0.5x') notesPerBeat = 0.5;

        if (notesPerBeat === 0.5) {
          if (effectiveBeat % 2 !== 0) return;
          notesPerBeat = 1;
        }

        const subStepDurationSec = beatDurationSec / notesPerBeat;
        let intervals = [...voicedIntervals];
        if (arpPreset.includes('2 Octaves')) {
          intervals = [...voicedIntervals, ...voicedIntervals.map(i => i + 12)];
        }

        for (let s = 0; s < notesPerBeat; s++) {
          const offsetSec = s * subStepDurationSec;
          const eventTime = audioTime + offsetSec;
          const globalStepIndex = Math.floor(effectiveBeat * notesPerBeat + s);

          if (arpPreset === 'Block') {
            if (s === 0 && (isExplicit || beatInMeasure === 0)) {
              playChord(currentChord, currentInstrument, currentAccompVol, {
                customMidiNotes: currentVoicing?.allNotes,
                voicingStyle: currentVoicingStyle
              }, eventTime);
            }
          } else if (arpPreset === 'Double-Time Strum') {
            playChord(currentChord, currentInstrument, currentAccompVol * (s === 0 ? 1.0 : 0.8), {
              customMidiNotes: currentVoicing?.allNotes,
              voicingStyle: currentVoicingStyle
            }, eventTime);
          } else {
            const len = intervals.length;
            let noteIndex = 0;
            switch (arpPreset) {
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
            const noteDuration = Math.min(0.8, subStepDurationSec * 1.4);
            const noteVolume = currentAccompVol * (s === 0 ? 1.0 : 0.88);
            playNote(intervals[noteIndex], noteDuration, currentInstrument, noteVolume, eventTime);
          }

          // UI visual update
          const visualDelayMs = Math.max(0, (eventTime - now) * 1000);
          const timer = setTimeout(() => {
            if (isPlayingRef.current) {
              if (s === 0) {
                setCurrentIndex(beatIndex);
                setIsCountingIn(false);
                setCountInBeat(0);
              }
            }
          }, visualDelayMs);
          subBeatTimersRef.current.push(timer);
        }
      }
    };

    registerBeatScheduler(scheduleBeat);

    return () => {
      registerBeatScheduler(null);
    };
  }, [isPlaying, registerBeatScheduler, getAudioContext, playChord, playNote, playPercussion, setIsCountingIn, setCountInBeat, setCurrentIndex, setCurrentSubStepIndex, setEarlyPushEvent, setIsPendingStart]);

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

  // 1-Bar Count-In State
  const [isCountInEnabled, setIsCountInEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(COUNT_IN_STORAGE_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const setIsCountInEnabled = (enabled: boolean) => {
    setIsCountInEnabledState(enabled);
    try {
      localStorage.setItem(COUNT_IN_STORAGE_KEY, String(enabled));
    } catch {}
  };

  const [isCountingIn, setIsCountingIn] = useState<boolean>(false);
  const [countInBeat, setCountInBeat] = useState<number>(0);

  // Keyboard Voicing & Voice Leading Engine State
  const [voicingStyle, setVoicingStyle] = useState<PianoVoicingStyle>('smooth_voice_leading');

  // Compute optimal piano voicings for the entire progression with cyclical voice leading
  const progressionVoicings = useMemo(() => {
    if (!progression || progression.length === 0) return [];

    // Extract ordered chord sequence across beat transitions
    const chordSeq: string[] = [];
    const beatToSeqIndex: number[] = [];

    let lastChord: string | null = null;
    let seqIdx = -1;

    for (let b = 0; b < progression.length; b++) {
      const eff = getEffectiveChord(progression, b);
      const chord = eff ? eff.chord : null;
      if (chord && chord !== lastChord) {
        chordSeq.push(chord);
        lastChord = chord;
        seqIdx++;
      } else if (!chord && lastChord !== null) {
        lastChord = null;
      }
      beatToSeqIndex.push(seqIdx);
    }

    if (chordSeq.length === 0) {
      return progression.map(() => null);
    }

    // Solve optimal smooth voice leading across all chord changes
    const solvedVoicings = solveProgressionVoicings(chordSeq, voicingStyle);

    // Map each beat to its corresponding PianoVoicing
    return beatToSeqIndex.map(idx => (idx >= 0 && idx < solvedVoicings.length ? solvedVoicings[idx] : null));
  }, [progression, voicingStyle]);

  const currentVoicing = (currentIndex >= 0 && currentIndex < progressionVoicings.length) 
    ? progressionVoicings[currentIndex] 
    : null;

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

    // 1-Bar Count-In
    isCountInEnabled, setIsCountInEnabled,
    isCountingIn, setIsCountingIn,
    countInBeat, setCountInBeat,

    // Keyboard Voicing & Voice Leading Engine
    voicingStyle, setVoicingStyle,
    progressionVoicings, currentVoicing,

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

