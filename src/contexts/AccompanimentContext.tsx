import React, { createContext, useContext, useState, useRef, useEffect, useMemo } from 'react';
import { InstrumentType, ProgressionChord, MetronomeSound } from '../types.ts';
import { useMetronome } from '../hooks/useMetronome.ts';
import { useAudio } from './AudioContext.tsx';
import { getIntervalsForChord } from '../constants.ts';
import {
  PianoVoicing,
  PianoVoicingStyle,
  solveProgressionVoicings,
} from '../lib/pianoVoicingEngine.ts';
import {
  GroovePatternPreset,
  GROOVE_PRESETS,
  ChordTriggerType,
  BassTriggerType,
  SynthTriggerType,
  PercussionLayer,
  getUserGroovePresets,
  saveUserGroovePreset,
  deleteUserGroovePreset
} from '../components/Accompaniment/grooveEngine.ts';
import {
  playPercussionSound,
  playBassSound,
  playRhythmChordSound,
  playSynthSound
} from '../lib/accompanimentAudioEngine.ts';
import { getDrumSetInfo } from '../components/Accompaniment/instrumentCatalog.ts';
import { 
  transposeChord, 
  toggleEnharmonicSpelling, 
  ROOT_OFFSETS_MAP 
} from '../components/Accompaniment/constants.ts';

export function isValidChordName(name?: string | null): boolean {
  if (!name) return false;
  const t = name.trim();
  return t !== '' && t !== '-' && t !== '—' && t !== '–' && t !== '_';
}

export function getEffectiveChord(
  progression: ProgressionChord[],
  beatIndex: number
): { chord: string; isExplicit: boolean } | null {
  if (!progression || progression.length === 0) return null;
  if (beatIndex < 0 || beatIndex >= progression.length) return null;

  const target = progression[beatIndex];
  if (target && isValidChordName(target.name)) {
    return { chord: target.name.trim(), isExplicit: true };
  }

  // Search backward from beatIndex - 1
  for (let i = beatIndex - 1; i >= 0; i--) {
    if (progression[i] && isValidChordName(progression[i].name)) {
      return { chord: progression[i].name.trim(), isExplicit: false };
    }
  }

  // Search backward from end of progression (wrap around)
  for (let i = progression.length - 1; i > beatIndex; i--) {
    if (progression[i] && isValidChordName(progression[i].name)) {
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

export interface TrackVolumes {
  rhythm: number;
  bass: number;
  synth: number;
  percussion: number;
}

export interface TrackMutes {
  rhythm: boolean;
  bass: boolean;
  synth: boolean;
  percussion: boolean;
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

  // Selected Instruments per Track
  selectedRhythmInstrument: string;
  setSelectedRhythmInstrument: (inst: string) => void;
  selectedBassInstrument: string;
  setSelectedBassInstrument: (inst: string) => void;
  selectedSynthInstrument: string;
  setSelectedSynthInstrument: (inst: string) => void;
  selectedDrumSet: string;
  setSelectedDrumSet: (drumSetId: string) => void;

  // Track Mixer (Volumes & Mutes)
  trackVolumes: TrackVolumes;
  setTrackVolume: (track: keyof TrackVolumes, volume: number) => void;
  trackMutes: TrackMutes;
  setTrackMute: (track: keyof TrackMutes, muted: boolean) => void;

  // Legacy mappings
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

  // Measure Tracking / Auto-Scroll
  isTrackMeasuresEnabled: boolean;
  setIsTrackMeasuresEnabled: (enabled: boolean) => void;

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
    layerType: 'chord' | 'bass' | 'synth' | 'percussion',
    stepIndex: number,
    newValue: any,
    percussionLayerId?: string
  ) => void;
  updatePercussionLayerProps: (layerId: string, props: Partial<PercussionLayer>) => void;
  addPercussionLayer: (soundId?: string, name?: string) => void;
  removePercussionLayer: (layerId: string) => void;
  currentSubStepIndex: number;
  setCurrentSubStepIndex: React.Dispatch<React.SetStateAction<number>>;
  earlyPushEvent: EarlyPushNotification | null;
  setEarlyPushEvent: React.Dispatch<React.SetStateAction<EarlyPushNotification | null>>;

  // Measure / Section Labels
  measureLabels: Record<number, string>;
  setMeasureLabels: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setMeasureLabel: (measureIndex: number, label: string) => void;
  deleteMeasureLabel: (measureIndex: number) => void;

  // Tools Drawer & Playback Navigation Integration
  isToolsDrawerOpen: boolean;
  setIsToolsDrawerOpen: (open: boolean) => void;
  activeToolsTab: 'library' | 'songs' | 'explorer';
  setActiveToolsTab: (tab: 'library' | 'songs' | 'explorer') => void;
  currentSongTitle: string;
  setCurrentSongTitle: (title: string) => void;
  currentKey: string;
  setCurrentKey: (key: string) => void;
  transposeShift: number;
  setTransposeShift: React.Dispatch<React.SetStateAction<number>>;
  handleTranspose: (semitones: number, mode?: 'sharp' | 'flat') => void;
  handleToggleProgressionEnharmonics: () => void;
  handleSelectDirectKey: (newKeyRoot: string) => void;
  isGrooveEngineOpen: boolean;
  setIsGrooveEngineOpen: (open: boolean) => void;
  isVoicingInspectorOpen: boolean;
  setIsVoicingInspectorOpen: (open: boolean) => void;

  // Backwards compatibility aliases
  isRhythmEngineEnabled: boolean;
  setIsRhythmEngineEnabled: (enabled: boolean) => void;
  activeRhythmPattern: GroovePatternPreset;
  setActiveRhythmPattern: React.Dispatch<React.SetStateAction<GroovePatternPreset>>;
  customRhythmPresets: GroovePatternPreset[];
  updateActiveRhythmPatternStep: (
    layerType: 'chord' | 'bass' | 'synth' | 'percussion',
    stepIndex: number,
    newValue: any,
    percussionLayerId?: string
  ) => void;
}

const AccompanimentContext = createContext<AccompanimentContextType | null>(null);

const COUNT_IN_STORAGE_KEY = 'musobuddy_accompaniment_count_in_v1';
const TRACK_VOLUMES_STORAGE_KEY = 'musobuddy_track_volumes_v2';
const TRACK_MUTES_STORAGE_KEY = 'musobuddy_track_mutes_v2';
const TRACK_MEASURES_STORAGE_KEY = 'musobuddy_track_measures_v1';

const SyncEngine: React.FC = () => {
  const { 
    isPlaying, progression, arpeggioPreset, arpeggioRate,
    selectedRhythmInstrument, selectedBassInstrument, selectedSynthInstrument,
    trackVolumes, trackMutes, isBassEnabled,
    setCurrentIndex, setIsPendingStart, accompanimentVolume,
    isRhythmEngineEnabled, activeRhythmPattern, setCurrentSubStepIndex, setEarlyPushEvent,
    progressionVoicings,
    isCountInEnabled, isCountingIn, setIsCountingIn, countInBeat, setCountInBeat
  } = useAccompaniment();
  const { currentBeat, activePattern, bpm } = useMetronome();
  const { 
    setIsAccompanimentPlaying, 
    isMetronomePlaying, getAudioContext, getMasterOutput, registerBeatScheduler 
  } = useAudio();

  // Fresh refs to prevent stale audio closures
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const progressionRef = useRef(progression);
  progressionRef.current = progression;

  const progressionVoicingsRef = useRef(progressionVoicings);
  progressionVoicingsRef.current = progressionVoicings;

  const activeRhythmPatternRef = useRef(activeRhythmPattern);
  activeRhythmPatternRef.current = activeRhythmPattern;

  const isRhythmEngineEnabledRef = useRef(isRhythmEngineEnabled);
  isRhythmEngineEnabledRef.current = isRhythmEngineEnabled;

  const arpeggioPresetRef = useRef(arpeggioPreset);
  arpeggioPresetRef.current = arpeggioPreset;

  const arpeggioRateRef = useRef(arpeggioRate);
  arpeggioRateRef.current = arpeggioRate;

  const selectedRhythmInstrumentRef = useRef(selectedRhythmInstrument);
  selectedRhythmInstrumentRef.current = selectedRhythmInstrument;

  const selectedBassInstrumentRef = useRef(selectedBassInstrument);
  selectedBassInstrumentRef.current = selectedBassInstrument;

  const selectedSynthInstrumentRef = useRef(selectedSynthInstrument);
  selectedSynthInstrumentRef.current = selectedSynthInstrument;

  const trackVolumesRef = useRef(trackVolumes);
  trackVolumesRef.current = trackVolumes;

  const trackMutesRef = useRef(trackMutes);
  trackMutesRef.current = trackMutes;

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
      if (!ctx) return;
      const masterOut = getMasterOutput?.() || ctx.destination;
      const now = ctx.currentTime;

      // 1-MEASURE COUNT-IN LOGIC
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
          const clickSound = activePatternRef.current?.voices[0]?.sound || 'woodblock';
          const countInVol = Math.max(0.85, accompanimentVolumeRef.current);
          playPercussionSound(ctx, String(clickSound), isAccent, countInVol, audioTime, masterOut);
        }
        return;
      }

      // Progression playback
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

      const isRhythmOn = isRhythmEngineEnabledRef.current;
      const activeGroove = activeRhythmPatternRef.current;
      const currentRhythmInst = selectedRhythmInstrumentRef.current;
      const currentBassInst = selectedBassInstrumentRef.current;
      const currentSynthInst = selectedSynthInstrumentRef.current;
      const currentAccompVol = accompanimentVolumeRef.current;
      const currentTrackVols = trackVolumesRef.current;
      const currentTrackMutes = trackMutesRef.current;
      const currentBassEnabled = isBassEnabledRef.current && !currentTrackMutes.bass;
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

          // 1. RHYTHM / CHORD TRACK LAYER
          const chordTrigger = activeGroove.chordPattern?.[stepIdx] || 'OFF';
          if (chordTrigger !== 'OFF' && !currentTrackMutes.rhythm) {
            const rhythmVol = currentAccompVol * (currentTrackVols.rhythm ?? 1.0);
            if (chordTrigger === 'PUSH_NEXT_CHORD' || chordTrigger === 'PUSH_NEXT_ACCENT' || chordTrigger === 'PUSH_NEXT_ROOT') {
              const targetBeatIndex = (beatIndex + 1) % prog.length;
              const nextInfo = getEffectiveChord(prog, targetBeatIndex);
              if (nextInfo) {
                const nextChord = nextInfo.chord;
                const nextVoicing = progVoicings?.[targetBeatIndex] || null;
                const nextNotes = nextVoicing ? nextVoicing.allNotes : (getIntervalsForChord(nextChord) || [0, 4, 7]).map(i => i + 60);
                const isAccent = chordTrigger === 'PUSH_NEXT_ACCENT';
                const vol = rhythmVol * (isAccent ? 1.15 : 0.95);

                if (chordTrigger === 'PUSH_NEXT_ROOT') {
                  const rootMidi = nextVoicing?.bassNote ?? (nextNotes[0]);
                  playRhythmChordSound(ctx, currentRhythmInst, [rootMidi], 0.8, vol, isAccent, eventTime, masterOut);
                } else {
                  playRhythmChordSound(ctx, currentRhythmInst, nextNotes, 1.4, vol, isAccent, eventTime, masterOut);
                }
              }
            } else if (chordTrigger === 'CHORD' || chordTrigger === 'CHORD_ACCENT') {
              const isAccent = chordTrigger === 'CHORD_ACCENT';
              const vol = rhythmVol * (isAccent ? 1.15 : 0.95);
              playRhythmChordSound(ctx, currentRhythmInst, voicedMidiNotes, 1.4, vol, isAccent, eventTime, masterOut);
            } else if (chordTrigger === 'ROOT' || chordTrigger === 'ROOT_ACCENT') {
              const isAccent = chordTrigger === 'ROOT_ACCENT';
              const vol = rhythmVol * (isAccent ? 1.15 : 0.95);
              const rootMidi = currentVoicing?.bassNote ?? voicedMidiNotes[0];
              playRhythmChordSound(ctx, currentRhythmInst, [rootMidi], 0.8, vol, isAccent, eventTime, masterOut);
            } else if (chordTrigger === 'ARPEGGIO') {
              const arpMidi = voicedMidiNotes[s % voicedMidiNotes.length];
              playRhythmChordSound(ctx, currentRhythmInst, [arpMidi], 0.65, rhythmVol * 0.9, false, eventTime, masterOut);
            }
          }

          // 2. BASS TRACK LAYER
          const bassTrigger = activeGroove.bassPattern?.[stepIdx] || 'OFF';
          if (bassTrigger !== 'OFF' && currentBassEnabled) {
            const bassVol = currentAccompVol * (currentTrackVols.bass ?? 1.0);
            const bassMidi = currentVoicing?.bassNote ?? (baseIntervals[0] + 36);

            if (bassTrigger === 'PUSH_NEXT_ROOT' || bassTrigger === 'PUSH_NEXT_FIFTH') {
              const targetBeatIndex = (beatIndex + 1) % prog.length;
              const nextInfo = getEffectiveChord(prog, targetBeatIndex);
              if (nextInfo) {
                const nextVoicing = progVoicings?.[targetBeatIndex] || null;
                const nextBassMidi = nextVoicing?.bassNote ?? ((getIntervalsForChord(nextInfo.chord)?.[0] ?? 0) + 36);
                const noteMidi = bassTrigger === 'PUSH_NEXT_ROOT' ? nextBassMidi : (nextBassMidi + 7);
                playBassSound(ctx, currentBassInst, noteMidi, 1.2, bassVol * 1.05, true, eventTime, masterOut);
              }
            } else if (bassTrigger === 'ROOT' || bassTrigger === 'ROOT_ACCENT') {
              const isAccent = bassTrigger === 'ROOT_ACCENT';
              playBassSound(ctx, currentBassInst, bassMidi, 1.2, bassVol * (isAccent ? 1.15 : 0.95), isAccent, eventTime, masterOut);
            } else if (bassTrigger === 'FIFTH') {
              playBassSound(ctx, currentBassInst, bassMidi + 7, 1.2, bassVol * 0.95, false, eventTime, masterOut);
            } else if (bassTrigger === 'WALKING') {
              const targetBeatIndex = (beatIndex + 1) % prog.length;
              const nextInfo = getEffectiveChord(prog, targetBeatIndex);
              const nextVoicing = progVoicings?.[targetBeatIndex] || null;
              const nextBassMidi = nextVoicing?.bassNote ?? bassMidi;
              playBassSound(ctx, currentBassInst, nextBassMidi - 1, 0.85, bassVol * 0.9, false, eventTime, masterOut);
            }
          }

          // 3. SYNTH TRACK LAYER
          const synthTrigger: SynthTriggerType = activeGroove.synthPattern?.[stepIdx] || 'OFF';
          if (synthTrigger !== 'OFF' && !currentTrackMutes.synth) {
            const synthVol = currentAccompVol * (currentTrackVols.synth ?? 1.0);
            const leadOctaveOffset = 12;
            const rootMidi = (currentVoicing?.bassNote ? (currentVoicing.bassNote + 24) : (baseIntervals[0] + 60)) + leadOctaveOffset;

            if (synthTrigger === 'PUSH_NEXT_LEAD') {
              const targetBeatIndex = (beatIndex + 1) % prog.length;
              const nextInfo = getEffectiveChord(prog, targetBeatIndex);
              if (nextInfo) {
                const nextVoicing = progVoicings?.[targetBeatIndex] || null;
                const nextRootMidi = (nextVoicing?.bassNote ? (nextVoicing.bassNote + 24) : (getIntervalsForChord(nextInfo.chord)?.[0] ?? 0) + 60) + leadOctaveOffset;
                playSynthSound(ctx, currentSynthInst, [nextRootMidi], 1.2, synthVol * 1.1, true, eventTime, masterOut);
              }
            } else if (synthTrigger === 'PAD') {
              playSynthSound(ctx, currentSynthInst, voicedMidiNotes, Math.max(1.5, beatDurationSec * 1.8), synthVol * 0.85, false, eventTime, masterOut);
            } else if (synthTrigger === 'LEAD_ROOT' || synthTrigger === 'LEAD_ACCENT') {
              const isAccent = synthTrigger === 'LEAD_ACCENT';
              playSynthSound(ctx, currentSynthInst, [rootMidi], 0.9, synthVol * (isAccent ? 1.2 : 0.95), isAccent, eventTime, masterOut);
            } else if (synthTrigger === 'LEAD_FIFTH') {
              playSynthSound(ctx, currentSynthInst, [rootMidi + 7], 0.9, synthVol * 0.95, false, eventTime, masterOut);
            } else if (synthTrigger === 'LEAD_OCTAVE') {
              playSynthSound(ctx, currentSynthInst, [rootMidi + 12], 0.9, synthVol * 1.0, true, eventTime, masterOut);
            } else if (synthTrigger === 'ARP_FLOURISH') {
              const arpFlourish = [rootMidi, rootMidi + 4, rootMidi + 7, rootMidi + 12];
              const note = arpFlourish[s % arpFlourish.length];
              playSynthSound(ctx, currentSynthInst, [note], 0.45, synthVol * 0.9, false, eventTime, masterOut);
            }
          }

          // 4. PERCUSSION TRACK LAYERS
          if (activeGroove.percussionLayers && !currentTrackMutes.percussion) {
            const percVol = currentAccompVol * (currentTrackVols.percussion ?? 1.0);
            activeGroove.percussionLayers.forEach(layer => {
              if (layer.muted) return;
              const patValue = layer.pattern?.[stepIdx] || 0;
              if (patValue > 0) {
                const isAccent = patValue === 2;
                playPercussionSound(ctx, String(layer.sound), isAccent, layer.volume * percVol, eventTime, masterOut);
              }
            });
          }

          // 5. Visual state updates
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
          const bassVol = currentAccompVol * (currentTrackVols.bass ?? 1.0);
          playBassSound(ctx, currentBassInst, bassMidi, 2.0, bassVol, true, audioTime, masterOut);
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
        let midiNotesList = [...voicedMidiNotes];
        if (arpPreset.includes('2 Octaves')) {
          midiNotesList = [...voicedMidiNotes, ...voicedMidiNotes.map(m => m + 12)];
        }

        const rhythmVol = currentAccompVol * (currentTrackVols.rhythm ?? 1.0);

        for (let s = 0; s < notesPerBeat; s++) {
          const offsetSec = s * subStepDurationSec;
          const eventTime = audioTime + offsetSec;

          if (!currentTrackMutes.rhythm) {
            if (arpPreset === 'Block') {
              if (s === 0 && (isExplicit || beatInMeasure === 0)) {
                playRhythmChordSound(ctx, currentRhythmInst, voicedMidiNotes, 1.6, rhythmVol, false, eventTime, masterOut);
              }
            } else if (arpPreset === 'Double-Time Strum') {
              playRhythmChordSound(ctx, currentRhythmInst, voicedMidiNotes, 0.8, rhythmVol * (s === 0 ? 1.0 : 0.8), false, eventTime, masterOut);
            } else {
              const len = midiNotesList.length;
              let noteIndex = 0;
              switch (arpPreset) {
                case 'Up':
                case 'Up (2 Octaves)':
                case 'Double-Time Up':
                  noteIndex = (effectiveBeat * notesPerBeat + s) % len;
                  break;
                case 'Down':
                case 'Down (2 Octaves)':
                  noteIndex = (len - 1) - ((effectiveBeat * notesPerBeat + s) % len);
                  break;
                case 'Up-Down':
                case 'Up-Down (2 Octaves)':
                case 'Double-Time Up-Down': {
                  const cycle = len > 1 ? (len * 2 - 2) : 1;
                  const phase = (effectiveBeat * notesPerBeat + s) % cycle;
                  noteIndex = phase < len ? phase : cycle - phase;
                  break;
                }
                case 'Random':
                  noteIndex = Math.floor(Math.random() * len);
                  break;
                default:
                  noteIndex = (effectiveBeat * notesPerBeat + s) % len;
              }
              const noteMidi = midiNotesList[noteIndex];
              playRhythmChordSound(ctx, currentRhythmInst, [noteMidi], subStepDurationSec * 1.2, rhythmVol, false, eventTime, masterOut);
            }
          }

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
  }, [isPlaying, registerBeatScheduler, getAudioContext, getMasterOutput, setIsCountingIn, setCountInBeat, setCurrentIndex, setCurrentSubStepIndex, setEarlyPushEvent, setIsPendingStart]);

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

  // Multi-Track Instruments
  const [selectedRhythmInstrument, setSelectedRhythmInstrument] = useState<string>('rhythm_piano');
  const [selectedBassInstrument, setSelectedBassInstrument] = useState<string>('bass_upright');
  const [selectedSynthInstrument, setSelectedSynthInstrument] = useState<string>('synth_silk_pad');

  // Track Mixer (Volumes & Mutes)
  const [trackVolumes, setTrackVolumes] = useState<TrackVolumes>(() => {
    try {
      const saved = localStorage.getItem(TRACK_VOLUMES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { rhythm: 1.0, bass: 1.0, synth: 0.9, percussion: 1.0 };
  });

  const [trackMutes, setTrackMutes] = useState<TrackMutes>(() => {
    try {
      const saved = localStorage.getItem(TRACK_MUTES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { rhythm: false, bass: false, synth: false, percussion: false };
  });

  const setTrackVolume = (track: keyof TrackVolumes, vol: number) => {
    setTrackVolumes(prev => {
      const updated = { ...prev, [track]: Math.max(0, Math.min(1.5, vol)) };
      try { localStorage.setItem(TRACK_VOLUMES_STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const setTrackMute = (track: keyof TrackMutes, muted: boolean) => {
    setTrackMutes(prev => {
      const updated = { ...prev, [track]: muted };
      try { localStorage.setItem(TRACK_MUTES_STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  // Backwards compatibility mappings
  const selectedInstrument = useMemo<InstrumentType>(() => {
    if (selectedRhythmInstrument.includes('rhodes') || selectedRhythmInstrument.includes('wurlitzer') || selectedRhythmInstrument.includes('dx7')) return InstrumentType.ElectricPiano;
    if (selectedRhythmInstrument.includes('guitar')) return InstrumentType.Guitar;
    if (selectedRhythmInstrument.includes('organ')) return InstrumentType.Organ;
    if (selectedRhythmInstrument.includes('strings')) return InstrumentType.Strings;
    if (selectedRhythmInstrument.includes('marimba')) return InstrumentType.Marimba;
    return InstrumentType.Piano;
  }, [selectedRhythmInstrument]);

  const setSelectedInstrument = (inst: InstrumentType) => {
    if (inst === InstrumentType.ElectricPiano) setSelectedRhythmInstrument('rhythm_rhodes');
    else if (inst === InstrumentType.Guitar) setSelectedRhythmInstrument('rhythm_guitar_acoustic');
    else if (inst === InstrumentType.Organ) setSelectedRhythmInstrument('rhythm_organ_b3');
    else if (inst === InstrumentType.Strings) setSelectedRhythmInstrument('rhythm_strings');
    else if (inst === InstrumentType.Marimba) setSelectedRhythmInstrument('rhythm_marimba');
    else setSelectedRhythmInstrument('rhythm_piano');
  };

  const isBassEnabled = !trackMutes.bass;
  const setIsBassEnabled = (enabled: boolean) => setTrackMute('bass', !enabled);

  const [selectedLibraryRoot, setSelectedLibraryRoot] = useState('C');
  const [trackedChord, setTrackedChord] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [accompanimentVolume, setAccompanimentVolume] = useState(0.85);
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

  // Measure Tracking / Auto-scroll toggle
  const [isTrackMeasuresEnabled, setIsTrackMeasuresEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(TRACK_MEASURES_STORAGE_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const setIsTrackMeasuresEnabled = (enabled: boolean) => {
    setIsTrackMeasuresEnabledState(enabled);
    try {
      localStorage.setItem(TRACK_MEASURES_STORAGE_KEY, String(enabled));
    } catch {}
  };

  // Keyboard Voicing & Voice Leading Engine State
  const [voicingStyle, setVoicingStyle] = useState<PianoVoicingStyle>('smooth_voice_leading');

  const progressionVoicings = useMemo(() => {
    if (!progression || progression.length === 0) return [];

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

    const solvedVoicings = solveProgressionVoicings(chordSeq, voicingStyle);
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

  // Selected Drum Set State (Cohesive Drum Kit selector)
  const [selectedDrumSet, setSelectedDrumSetState] = useState<string>(() => {
    return activeGroovePattern.drumSetId || 'drumset_acoustic_studio';
  });

  const setSelectedDrumSet = (drumSetId: string) => {
    setSelectedDrumSetState(drumSetId);
    const drumSet = getDrumSetInfo(drumSetId);
    if (drumSet && activeGroovePattern) {
      setActiveGroovePattern(prev => {
        const updatedLayers = prev.percussionLayers.map((layer, idx) => {
          const piece = drumSet.pieces[idx % drumSet.pieces.length];
          return {
            ...layer,
            name: piece.name,
            sound: piece.sound
          };
        });
        return {
          ...prev,
          drumSetId,
          percussionLayers: updatedLayers
        };
      });
    }
  };

  // Sync instruments from active groove preset if specified
  useEffect(() => {
    if (activeGroovePattern) {
      if (activeGroovePattern.rhythmInstrument) setSelectedRhythmInstrument(activeGroovePattern.rhythmInstrument);
      if (activeGroovePattern.bassInstrument) setSelectedBassInstrument(activeGroovePattern.bassInstrument);
      if (activeGroovePattern.synthInstrument) setSelectedSynthInstrument(activeGroovePattern.synthInstrument);
      if (activeGroovePattern.drumSetId) setSelectedDrumSetState(activeGroovePattern.drumSetId);
    }
  }, [activeGroovePattern.id]);

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
    layerType: 'chord' | 'bass' | 'synth' | 'percussion',
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
      if (layerType === 'synth') {
        const existingSynth = prev.synthPattern && prev.synthPattern.length > 0 
          ? [...prev.synthPattern] 
          : Array(prev.chordPattern.length).fill('OFF');
        existingSynth[stepIndex] = newValue as SynthTriggerType;
        return { ...prev, synthPattern: existingSynth };
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

  const addPercussionLayer = (soundId: string = 'snare_rimshot', name: string = 'Percussion Layer') => {
    setActiveGroovePattern(prev => {
      if (!prev) return prev;
      const totalSteps = prev.chordPattern.length || 8;
      const newLayer: PercussionLayer = {
        id: `p_custom_${Date.now()}`,
        name,
        sound: soundId,
        volume: 0.8,
        pattern: Array(totalSteps).fill(0)
      };
      return { ...prev, percussionLayers: [...prev.percussionLayers, newLayer] };
    });
  };

  const removePercussionLayer = (layerId: string) => {
    setActiveGroovePattern(prev => {
      if (!prev || prev.percussionLayers.length <= 1) return prev;
      return {
        ...prev,
        percussionLayers: prev.percussionLayers.filter(l => l.id !== layerId)
      };
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

  // Tools Drawer & Navigation Integration State
  const [isToolsDrawerOpen, setIsToolsDrawerOpen] = useState(true);
  const [activeToolsTab, setActiveToolsTab] = useState<'library' | 'songs' | 'explorer'>('library');
  const [currentSongTitle, setCurrentSongTitle] = useState('Standard Progression');
  const [currentKey, setCurrentKey] = useState('C');
  const [transposeShift, setTransposeShift] = useState(0);
  const [isGrooveEngineOpen, setIsGrooveEngineOpen] = useState(false);
  const [isVoicingInspectorOpen, setIsVoicingInspectorOpen] = useState(false);

  const handleTranspose = (semitones: number, mode?: 'sharp' | 'flat') => {
    const keyCtx = currentKey;
    setProgression(prev => prev.map(slot => ({
      ...slot,
      name: slot.name ? transposeChord(slot.name, semitones, mode, keyCtx) : '',
    })));
    setCurrentKey(prev => transposeChord(prev, semitones, mode, keyCtx));
    setTransposeShift(prev => prev + semitones);
  };

  const handleToggleProgressionEnharmonics = () => {
    setProgression(prev => prev.map(slot => ({
      ...slot,
      name: slot.name ? toggleEnharmonicSpelling(slot.name) : '',
    })));
    setCurrentKey(prev => toggleEnharmonicSpelling(prev));
  };

  const handleSelectDirectKey = (newKeyRoot: string) => {
    const getCleanRoot = (k: string) => {
      const match = k.match(/^[A-G](?:#|b)?/i);
      return match ? match[0] : 'C';
    };
    const oldRoot = getCleanRoot(currentKey);
    const oldOffset = ROOT_OFFSETS_MAP[oldRoot] ?? 0;
    const newOffset = ROOT_OFFSETS_MAP[newKeyRoot] ?? 0;
    let delta = (newOffset - oldOffset + 12) % 12;
    if (delta > 6) delta -= 12;
    if (delta !== 0) {
      const targetMode: 'sharp' | 'flat' = (newKeyRoot.includes('b') || newKeyRoot === 'F') ? 'flat' : 'sharp';
      handleTranspose(delta, targetMode);
    }
    setCurrentKey(newKeyRoot);
  };

  const value = {
    progression, setProgression,
    selectedBeatIndex, setSelectedBeatIndex,
    clearBeat, deleteBeat, insertBeat, addBeat, addMeasure, clearAll,
    arpeggioPreset, setArpeggioPreset,
    arpeggioRate, setArpeggioRate,

    // Refreshed Instruments
    selectedRhythmInstrument, setSelectedRhythmInstrument,
    selectedBassInstrument, setSelectedBassInstrument,
    selectedSynthInstrument, setSelectedSynthInstrument,
    selectedDrumSet, setSelectedDrumSet,

    // Track Mixer
    trackVolumes, setTrackVolume,
    trackMutes, setTrackMute,

    // Legacy
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

    // Measure Tracking / Auto-Scroll
    isTrackMeasuresEnabled, setIsTrackMeasuresEnabled,

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
    addPercussionLayer, removePercussionLayer,
    currentSubStepIndex, setCurrentSubStepIndex,
    earlyPushEvent, setEarlyPushEvent,

    // Tools Drawer & Navigation Integration
    isToolsDrawerOpen, setIsToolsDrawerOpen,
    activeToolsTab, setActiveToolsTab,
    currentSongTitle, setCurrentSongTitle,
    currentKey, setCurrentKey,
    transposeShift, setTransposeShift,
    handleTranspose, handleToggleProgressionEnharmonics, handleSelectDirectKey,
    isGrooveEngineOpen, setIsGrooveEngineOpen,
    isVoicingInspectorOpen, setIsVoicingInspectorOpen,

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
