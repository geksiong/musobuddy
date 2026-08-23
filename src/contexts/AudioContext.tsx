import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { MetronomeSound, BeatPattern, TimeSignatureType } from '../components/Metronome/types.ts';
import { DEFAULT_PRESETS } from '../components/Metronome/constants.ts';
import { DroneTone } from '../components/Drone/types.ts';
import { InstrumentType } from '../types.ts';
import { NOTES, getIntervalsForChord } from '../constants.ts';
import { getVoicedMidiNotes, PianoVoicing, PianoVoicingStyle } from '../lib/pianoVoicingEngine.ts';

export interface PlayChordOptions {
  prevChord?: string | null;
  nextChord?: string | null;
  prevVoicing?: PianoVoicing | null;
  customMidiNotes?: number[];
  customIntervals?: number[];
  duration?: number;
  voicingStyle?: PianoVoicingStyle;
  isStrummed?: boolean;
}

interface AudioContextType {
  // Metronome
  isMetronomePlaying: boolean;
  metronomeBpm: number;
  setMetronomeBpm: (bpm: number) => void;
  startMetronome: () => void;
  stopMetronome: () => void;
  metronomePattern: BeatPattern | null;
  setMetronomePattern: (pattern: BeatPattern) => void;
  currentBeat: number;
  metronomeVolume: number;
  setMetronomeVolume: (volume: number) => void;

  // Accompaniment
  isAccompanimentPlaying: boolean;
  setIsAccompanimentPlaying: (playing: boolean) => void;

  // Drone
  activeDrones: Record<string, { tone: DroneTone; volume: number; pulseBpm: number }>;
  isDronePlaying: boolean;
  setIsDronePlaying: (playing: boolean) => void;
  userDroneNotes: string[];
  toggleDroneNote: (note: string) => void;
  selectedDroneNote: string;
  setSelectedDroneNote: (note: string) => void;
  droneTone: DroneTone;
  setDroneTone: (tone: DroneTone) => void;
  droneVolume: number;
  setDroneVolume: (volume: number) => void;
  dronePulseBpm: number;
  setDronePulseBpm: (bpm: number) => void;
  stopAllDrones: () => void;

  // Reference Notes (Tuner)
  playingRefNote: string | null;
  playRefNote: (note: string) => void;
  stopRefNote: () => void;

  // Chord & Instrument Player
  playChord: (chord: string, instrument?: InstrumentType, volume?: number, options?: PlayChordOptions, time?: number) => void;
  playNote: (noteIndex: number, duration?: number, instrument?: InstrumentType, volume?: number, time?: number) => void;
  playPercussion: (sound: MetronomeSound, isAccent?: boolean, volume?: number, time?: number) => void;
  getAudioContext: () => AudioContext;
  registerBeatScheduler: (callback: ((stepIndex: number, audioTime: number, beatDuration: number) => void) | null) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

const LOOKAHEAD = 20.0;
const SCHEDULE_AHEAD_TIME = 0.35;

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Metronome & Accompaniment State
  const [isMetronomePlaying, _setIsMetronomePlaying] = useState(false);
  const isMetronomePlayingRef = useRef(false);

  const [isAccompanimentPlaying, _setIsAccompanimentPlaying] = useState(false);
  const isAccompanimentPlayingRef = useRef(false);

  const defaultPattern = DEFAULT_PRESETS.find(p => p.id === '4-4') || DEFAULT_PRESETS[0] || null;
  const [metronomeBpm, setMetronomeBpm] = useState(120);
  const [metronomePattern, _setMetronomePattern] = useState<BeatPattern | null>(defaultPattern);
  const metronomePatternRef = useRef<BeatPattern | null>(defaultPattern);
  const [metronomeVolume, setMetronomeVolume] = useState(0.8);
  const metronomeVolumeRef = useRef(0.8);
  const [currentBeat, setCurrentBeat] = useState(0);
  const metronomeTimerRef = useRef<number | null>(null);
  const voiceStatesRef = useRef<{ nextNoteTime: number; stepIndex: number }[]>([]);
  const beatSchedulerCallbackRef = useRef<((stepIndex: number, audioTime: number, beatDuration: number) => void) | null>(null);

  const registerBeatScheduler = useCallback((callback: ((stepIndex: number, audioTime: number, beatDuration: number) => void) | null) => {
    beatSchedulerCallbackRef.current = callback;
  }, []);

  // Drone State
  const [activeDrones, setActiveDrones] = useState<Record<string, { tone: DroneTone; volume: number; pulseBpm: number }>>({});
  const [isDronePlaying, setIsDronePlaying] = useState(false);
  const [userDroneNotes, setUserDroneNotes] = useState<string[]>(['D3']);
  const [selectedDroneNote, setSelectedDroneNote] = useState('D3');
  const [droneTone, setDroneTone] = useState<DroneTone>(DroneTone.Strings);
  const [droneVolume, setDroneVolume] = useState(0.5);
  const [dronePulseBpm, setDronePulseBpm] = useState(0);

  const droneNodesRef = useRef<Map<string, { 
    oscillators: OscillatorNode[];
    gains: GainNode[];
    filters: BiquadFilterNode[];
    lfo?: OscillatorNode;
    lfoGain?: GainNode;
    masterGain: GainNode;
    modGain: GainNode;
    tone: DroneTone;
  }>>(new Map());

  // Ref Note State
  const [playingRefNote, setPlayingRefNote] = useState<string | null>(null);
  const refOscRef = useRef<OscillatorNode | null>(null);
  const refGainRef = useRef<GainNode | null>(null);

  // Master Gain & Limiter Bus (prevents digital clipping/distortion across all voices)
  const masterBusGainRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);

  // Cached Audio Buffers & Periodic Waves to avoid constant heap allocations & GC stutter
  const cachedBuffersRef = useRef<{
    hammer?: AudioBuffer;
    pluck?: AudioBuffer;
    hiHat?: AudioBuffer;
    clap?: AudioBuffer;
    snare?: AudioBuffer;
  }>({});
  const cachedPeriodicWavesRef = useRef<{
    piano?: PeriodicWave;
  }>({});

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass({ latencyHint: 'interactive' });
      audioCtxRef.current = ctx;

      // Master Bus Gain
      const masterBus = ctx.createGain();
      masterBus.gain.setValueAtTime(0.85, ctx.currentTime);
      masterBusGainRef.current = masterBus;

      // Transparent Dynamics Compressor / Limiter
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-6.0, ctx.currentTime);
      compressor.knee.setValueAtTime(18.0, ctx.currentTime);
      compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
      compressor.attack.setValueAtTime(0.005, ctx.currentTime);
      compressor.release.setValueAtTime(0.20, ctx.currentTime);

      masterBus.connect(compressor);
      compressor.connect(ctx.destination);
      compressorRef.current = compressor;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const getAudioContext = useCallback(() => {
    return initAudio();
  }, []);

  const getMasterOutput = (ctx: AudioContext): AudioNode => {
    if (masterBusGainRef.current) return masterBusGainRef.current;
    if (compressorRef.current) return compressorRef.current;
    return ctx.destination;
  };

  // Buffer caching helpers
  const getHammerBuffer = (ctx: AudioContext): AudioBuffer => {
    if (cachedBuffersRef.current.hammer) return cachedBuffersRef.current.hammer;
    const bufferSize = Math.max(128, Math.floor(ctx.sampleRate * 0.012));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    cachedBuffersRef.current.hammer = buffer;
    return buffer;
  };

  const getPluckBuffer = (ctx: AudioContext): AudioBuffer => {
    if (cachedBuffersRef.current.pluck) return cachedBuffersRef.current.pluck;
    const bufferSize = Math.max(128, Math.floor(ctx.sampleRate * 0.008));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    cachedBuffersRef.current.pluck = buffer;
    return buffer;
  };

  const getMarimbaClickBuffer = (ctx: AudioContext): AudioBuffer => {
    const key = 'marimbaClick' as any;
    if ((cachedBuffersRef.current as any)[key]) return (cachedBuffersRef.current as any)[key];
    const bufferSize = Math.max(128, Math.floor(ctx.sampleRate * 0.006));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.18));
    }
    (cachedBuffersRef.current as any)[key] = buffer;
    return buffer;
  };

  const getOrganKeyClickBuffer = (ctx: AudioContext): AudioBuffer => {
    const key = 'organClick' as any;
    if ((cachedBuffersRef.current as any)[key]) return (cachedBuffersRef.current as any)[key];
    const bufferSize = Math.max(128, Math.floor(ctx.sampleRate * 0.005));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.20));
    }
    (cachedBuffersRef.current as any)[key] = buffer;
    return buffer;
  };

  const getFluteBreathBuffer = (ctx: AudioContext): AudioBuffer => {
    const key = 'fluteBreath' as any;
    if ((cachedBuffersRef.current as any)[key]) return (cachedBuffersRef.current as any)[key];
    const bufferSize = Math.max(256, Math.floor(ctx.sampleRate * 0.035));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }
    (cachedBuffersRef.current as any)[key] = buffer;
    return buffer;
  };

  const getBassPluckBuffer = (ctx: AudioContext): AudioBuffer => {
    const key = 'bassPluck' as any;
    if ((cachedBuffersRef.current as any)[key]) return (cachedBuffersRef.current as any)[key];
    const bufferSize = Math.max(128, Math.floor(ctx.sampleRate * 0.010));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }
    (cachedBuffersRef.current as any)[key] = buffer;
    return buffer;
  };

  const getPercussionNoiseBuffer = (ctx: AudioContext, type: 'hiHat' | 'clap' | 'snare', durationSec: number): AudioBuffer => {
    if (cachedBuffersRef.current[type]) return cachedBuffersRef.current[type]!;
    const bufferSize = Math.max(256, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    cachedBuffersRef.current[type] = buffer;
    return buffer;
  };

  const getPianoPeriodicWave = (ctx: AudioContext): PeriodicWave => {
    if (cachedPeriodicWavesRef.current.piano) return cachedPeriodicWavesRef.current.piano;
    const realHarmonics = new Float32Array([0, 1.0, 0.62, 0.42, 0.28, 0.16, 0.09, 0.04, 0.02, 0.01]);
    const imagHarmonics = new Float32Array(realHarmonics.length);
    const wave = ctx.createPeriodicWave(realHarmonics, imagHarmonics);
    cachedPeriodicWavesRef.current.piano = wave;
    return wave;
  };

  // Safe disconnection helper to prevent memory leaks and graph degradation
  const scheduleNodeCleanup = (nodes: { disconnect: () => void }[], delayMs: number) => {
    setTimeout(() => {
      nodes.forEach(n => {
        try { n.disconnect(); } catch (e) {}
      });
    }, delayMs);
  };

  // --- Metronome Logic ---
  const playClick = (time: number, sound: MetronomeSound, volume: number, isAccent: boolean) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const outputTarget = getMasterOutput(ctx);

    // Accents are full volume (1.0), non-accented beats are softer (0.30 amplitude)
    const amplitude = isAccent ? 1.0 : 0.30;
    const startVol = Math.max(0.0001, volume * amplitude * 0.7);
    const masterGain = ctx.createGain();

    masterGain.connect(outputTarget);

    // Keep duration uniform for a sound type so decay is clean
    let clickDuration = 0.08;
    if (sound === MetronomeSound.Kick || sound === MetronomeSound.Bass || sound === MetronomeSound.Bodhran) {
      clickDuration = 0.15;
    } else if (sound === MetronomeSound.Cowbell || sound === MetronomeSound.Snare || sound === MetronomeSound.Clap) {
      clickDuration = 0.12;
    } else if (sound === MetronomeSound.ClockTick) {
      clickDuration = 0.03;
    }

    masterGain.gain.setValueAtTime(startVol, time);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, time + clickDuration);

    const nodesToCleanup: { disconnect: () => void }[] = [masterGain];

    switch (sound) {
      case MetronomeSound.Woodblock: {
        const osc = ctx.createOscillator();
        const crack = ctx.createOscillator();
        const crackGain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isAccent ? 1200 : 750, time);
        osc.frequency.exponentialRampToValueAtTime(isAccent ? 800 : 500, time + 0.015);
        
        crack.type = 'square';
        crack.frequency.setValueAtTime(isAccent ? 2600 : 1700, time);
        crackGain.gain.setValueAtTime(isAccent ? 0.06 : 0.02, time);
        crackGain.gain.exponentialRampToValueAtTime(0.001, time + 0.012);
        
        osc.connect(masterGain);
        crack.connect(crackGain);
        crackGain.connect(masterGain);
        
        osc.start(time);
        osc.stop(time + clickDuration);
        crack.start(time);
        crack.stop(time + 0.012);
        nodesToCleanup.push(osc, crack, crackGain);
        break;
      }
      case MetronomeSound.Cowbell: {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'square';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(isAccent ? 880 : 580, time);
        osc2.frequency.setValueAtTime(isAccent ? 580 : 380, time);
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(isAccent ? 880 : 580, time);
        filter.Q.setValueAtTime(2, time);
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(masterGain);
        
        osc1.start(time);
        osc1.stop(time + clickDuration);
        osc2.start(time);
        osc2.stop(time + clickDuration);
        nodesToCleanup.push(osc1, osc2, filter);
        break;
      }
      case MetronomeSound.Kick: {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isAccent ? 160 : 100, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
        osc.connect(masterGain);
        osc.start(time);
        osc.stop(time + clickDuration);
        nodesToCleanup.push(osc);
        break;
      }
      case MetronomeSound.HiHat: {
        const noise = ctx.createBufferSource();
        noise.buffer = getPercussionNoiseBuffer(ctx, 'hiHat', clickDuration);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(isAccent ? 8500 : 5500, time);
        
        noise.connect(filter);
        filter.connect(masterGain);
        noise.start(time);
        noise.stop(time + clickDuration);
        nodesToCleanup.push(noise, filter);
        break;
      }
      case MetronomeSound.Clap: {
        const noise = ctx.createBufferSource();
        noise.buffer = getPercussionNoiseBuffer(ctx, 'clap', clickDuration);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(isAccent ? 1200 : 800, time);
        filter.Q.setValueAtTime(1.2, time);

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start(time);
        noise.stop(time + clickDuration);
        nodesToCleanup.push(noise, filter);
        break;
      }
      case MetronomeSound.Snare: {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isAccent ? 220 : 150, time);
        osc.frequency.exponentialRampToValueAtTime(70, time + 0.06);

        const noise = ctx.createBufferSource();
        noise.buffer = getPercussionNoiseBuffer(ctx, 'snare', clickDuration);
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(isAccent ? 1800 : 1100, time);

        osc.connect(masterGain);
        noise.connect(noiseFilter);
        noiseFilter.connect(masterGain);

        osc.start(time);
        osc.stop(time + clickDuration);
        noise.start(time);
        noise.stop(time + clickDuration);
        nodesToCleanup.push(osc, noise, noiseFilter);
        break;
      }
      case MetronomeSound.ClockTick: {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isAccent ? 1800 : 1100, time);
        osc.frequency.exponentialRampToValueAtTime(isAccent ? 1200 : 750, time + 0.015);
        osc.connect(masterGain);
        osc.start(time);
        osc.stop(time + clickDuration);
        nodesToCleanup.push(osc);
        break;
      }
      case MetronomeSound.Bodhran:
      case MetronomeSound.Bass: {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isAccent ? 140 : 90, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.1);
        osc.connect(masterGain);
        osc.start(time);
        osc.stop(time + clickDuration);
        nodesToCleanup.push(osc);
        break;
      }
      default: {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isAccent ? 1200 : 750, time);
        osc.connect(masterGain);
        osc.start(time);
        osc.stop(time + clickDuration);
        nodesToCleanup.push(osc);
      }
    }

    const cleanupDelayMs = Math.max(100, Math.ceil((time - ctx.currentTime + clickDuration + 0.05) * 1000));
    scheduleNodeCleanup(nodesToCleanup, cleanupDelayMs);
  };

  useEffect(() => {
    isMetronomePlayingRef.current = isMetronomePlaying;
  }, [isMetronomePlaying]);

  useEffect(() => {
    isAccompanimentPlayingRef.current = isAccompanimentPlaying;
  }, [isAccompanimentPlaying]);

  useEffect(() => {
    metronomeVolumeRef.current = metronomeVolume;
  }, [metronomeVolume]);

  const metronomeScheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    const pattern = metronomePatternRef.current;
    if (!ctx || !pattern) return;

    const masterVoice = pattern.voices[0];
    const masterLength = masterVoice?.pattern?.length || masterVoice?.beats || 4;
    const masterSubdivision = masterVoice?.isTripleTime ? 3 : (masterVoice?.isDoubleTime || masterVoice?.isSwing ? 2 : 1);
    const masterBaseBeats = (masterLength / masterSubdivision) || 4;
    const quarterDuration = 60.0 / metronomeBpm;
    const measureDuration = quarterDuration * masterBaseBeats;
    const swingRatio = pattern.swingRatio ?? (2 / 3);

    pattern.voices.forEach((voice, i) => {
      if (!voice.active) return;
      if (!voiceStatesRef.current[i]) {
        const initialTime = ctx.currentTime + 0.05;
        voiceStatesRef.current[i] = { nextNoteTime: initialTime, stepIndex: 0 };
      }
      
      const vState = voiceStatesRef.current[i];
      const length = voice.pattern?.length || voice.beats || 4;
      const voiceSubdivision = voice.isTripleTime ? 3 : (voice.isDoubleTime || voice.isSwing ? 2 : 1);
      const voiceBaseBeats = (length / voiceSubdivision) || 4;
      const baseBeatDuration = measureDuration / voiceBaseBeats;

      const is12Beat = pattern.type === TimeSignatureType.Flamenco || pattern.timeSignature === '12-Beat' || masterBaseBeats === 12;
      const startBeat = pattern.startBeat || 1;
      
      const startIndex = 0;

      while (vState.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
        let playValue = 0;
        const patternIdx = (vState.stepIndex + startIndex) % length;
        if (voice.pattern && voice.pattern.length > 0) {
          playValue = voice.pattern[patternIdx % voice.pattern.length];
        } else {
          playValue = (patternIdx === 0) ? 2 : 1;
        }

        // Only emit audible metronome click if metronome sound is enabled
        if (isMetronomePlayingRef.current && playValue > 0 && !voice.muted) {
          playClick(vState.nextNoteTime, voice.sound, voice.volume * metronomeVolumeRef.current, playValue === 2);
        }

        // Handle visual & beat state update timing
        if (i === 0) {
          const beatToUpdate = vState.stepIndex;
          const timeToUpdate = vState.nextNoteTime;
          
          if (isAccompanimentPlayingRef.current && beatSchedulerCallbackRef.current) {
            try {
              beatSchedulerCallbackRef.current(beatToUpdate, timeToUpdate, baseBeatDuration);
            } catch (err) {
              console.error('Error in beatSchedulerCallback:', err);
            }
          }

          const delay = (timeToUpdate - ctx.currentTime) * 1000;
          setTimeout(() => {
            if (isMetronomePlayingRef.current || isAccompanimentPlayingRef.current) {
              setCurrentBeat(beatToUpdate);
            }
          }, Math.max(0, delay));
        }

        // Calculate step interval based on subdivision mode
        let stepInterval = measureDuration / length;
        if (voice.isSwing && length % 2 === 0) {
          // In swing mode: even step = on-beat (duration = baseBeatDuration * swingRatio)
          // odd step = off-beat (duration = baseBeatDuration * (1 - swingRatio))
          if (patternIdx % 2 === 0) {
            stepInterval = baseBeatDuration * swingRatio;
          } else {
            stepInterval = baseBeatDuration * (1 - swingRatio);
          }
        }

        vState.nextNoteTime += stepInterval;
        vState.stepIndex++;
      }
    });
  }, [metronomeBpm]);

  const ensureRhythmEngine = useCallback(() => {
    const ctx = initAudio();
    if (!metronomePatternRef.current && DEFAULT_PRESETS.length > 0) {
      metronomePatternRef.current = DEFAULT_PRESETS[0];
      _setMetronomePattern(DEFAULT_PRESETS[0]);
    }

    if (voiceStatesRef.current.length === 0 && metronomePatternRef.current) {
      const startTime = ctx.currentTime + 0.05;
      voiceStatesRef.current = metronomePatternRef.current.voices.map(() => ({
        nextNoteTime: startTime,
        stepIndex: 0
      }));
      setCurrentBeat(0);
    }

    if (!metronomeTimerRef.current) {
      metronomeTimerRef.current = window.setInterval(metronomeScheduler, LOOKAHEAD);
    }
  }, [metronomeScheduler]);

  const stopRhythmEngineIfUnused = useCallback(() => {
    if (!isMetronomePlayingRef.current && !isAccompanimentPlayingRef.current) {
      if (metronomeTimerRef.current) {
        window.clearInterval(metronomeTimerRef.current);
        metronomeTimerRef.current = null;
      }
      voiceStatesRef.current = [];
      setCurrentBeat(0);
    }
  }, []);

  const startMetronome = useCallback(() => {
    isMetronomePlayingRef.current = true;
    _setIsMetronomePlaying(true);
    ensureRhythmEngine();
  }, [ensureRhythmEngine]);

  const stopMetronome = useCallback(() => {
    isMetronomePlayingRef.current = false;
    _setIsMetronomePlaying(false);
    stopRhythmEngineIfUnused();
  }, [stopRhythmEngineIfUnused]);

  const setIsAccompanimentPlaying = useCallback((playing: boolean) => {
    isAccompanimentPlayingRef.current = playing;
    _setIsAccompanimentPlaying(playing);
    if (playing) {
      ensureRhythmEngine();
    } else {
      stopRhythmEngineIfUnused();
    }
  }, [ensureRhythmEngine, stopRhythmEngineIfUnused]);

  const setMetronomePattern = (pattern: BeatPattern) => {
    metronomePatternRef.current = pattern;
    _setMetronomePattern(pattern);
    if (isMetronomePlayingRef.current || isAccompanimentPlayingRef.current) {
      const ctx = audioCtxRef.current;
      const now = ctx ? ctx.currentTime : 0;
      const anchorTime = voiceStatesRef.current[0]?.nextNoteTime || (now + 0.05);
      const anchorStep = voiceStatesRef.current[0]?.stepIndex || 0;
      voiceStatesRef.current = pattern.voices.map((_, idx) => ({
        nextNoteTime: voiceStatesRef.current[idx]?.nextNoteTime || anchorTime,
        stepIndex: voiceStatesRef.current[idx]?.stepIndex || anchorStep
      }));
    }
  };

  useEffect(() => {
    if (isMetronomePlaying || isAccompanimentPlaying) {
      if (metronomeTimerRef.current) window.clearInterval(metronomeTimerRef.current);
      metronomeTimerRef.current = window.setInterval(metronomeScheduler, LOOKAHEAD);
    }
  }, [metronomeScheduler, isMetronomePlaying, isAccompanimentPlaying]);

  const toggleDroneNote = (note: string) => {
    setSelectedDroneNote(note);
    setUserDroneNotes(prev => {
      const isSelected = prev.includes(note);
      return isSelected ? prev.filter(n => n !== note) : [...prev, note];
    });
  };

  const stopDroneAudio = useCallback((note: string) => {
    const nodes = droneNodesRef.current.get(note);
    if (!nodes || !audioCtxRef.current) return;

    const ctx = audioCtxRef.current;
    const { masterGain, oscillators, gains, filters, lfo, lfoGain, modGain } = nodes;

    try {
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.15);
      
      droneNodesRef.current.delete(note);
      setActiveDrones(prev => {
        const next = { ...prev };
        delete next[note];
        return next;
      });

      setTimeout(() => {
        try {
          const stopTime = ctx.currentTime;
          oscillators.forEach(osc => {
            try { osc.stop(stopTime); osc.disconnect(); } catch (e) {}
          });
          lfo?.stop(stopTime);
          lfo?.disconnect();
          lfoGain?.disconnect();
          filters.forEach(f => { try { f.disconnect(); } catch (e) {} });
          gains.forEach(g => { try { g.disconnect(); } catch (e) {} });
          modGain.disconnect();
          masterGain.disconnect();
        } catch (e) {}
      }, 200);
    } catch (e) {}
  }, []);

  const stopAllDrones = useCallback(() => {
    const keys = Array.from(droneNodesRef.current.keys());
    keys.forEach(note => stopDroneAudio(note));
  }, [stopDroneAudio]);

  const startDroneAudio = (noteWithOctave: string, tone: DroneTone, volume: number, pulseBpm: number) => {
    const ctx = initAudio();
    if (droneNodesRef.current.has(noteWithOctave)) {
      return;
    }

    const noteMatch = noteWithOctave.match(/^([A-G]#?)(\d)$/);
    if (!noteMatch) return;
    const [, name, octaveStr] = noteMatch;
    const octave = parseInt(octaveStr);
    const noteIndex = NOTES.indexOf(name);
    if (noteIndex === -1) return;
    
    const midiNote = (octave + 1) * 12 + noteIndex;
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const now = ctx.currentTime;

    // Master Volume Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.25);
    masterGain.connect(getMasterOutput(ctx));

    // Modulation Gain (for pulse BPM slider LFO)
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(1, now);
    modGain.connect(masterGain);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const filters: BiquadFilterNode[] = [];

    if (tone === DroneTone.Bagpipe) {
      // --- Great Highland Bagpipes ---
      // Reedy, bright, buzzing drone with Bass drone (1 octave down), Tenor drones (1 octave down with detune), and fifth harmonic.
      const filterBP = ctx.createBiquadFilter();
      filterBP.type = 'bandpass';
      filterBP.frequency.setValueAtTime(2200, now);
      filterBP.Q.setValueAtTime(2.8, now);

      const filterLP = ctx.createBiquadFilter();
      filterLP.type = 'lowpass';
      filterLP.frequency.setValueAtTime(3200, now);
      filterLP.Q.setValueAtTime(1.5, now);

      filterBP.connect(modGain);
      filterLP.connect(modGain);
      filters.push(filterBP, filterLP);

      // Bass drone (1 octave down)
      const oscBass = ctx.createOscillator();
      oscBass.type = 'sawtooth';
      oscBass.frequency.setValueAtTime(freq / 2, now);
      const gainBass = ctx.createGain();
      gainBass.gain.setValueAtTime(0.5, now);
      oscBass.connect(gainBass);
      gainBass.connect(filterLP);
      oscillators.push(oscBass); gains.push(gainBass);

      // Tenor drone 1 (1 octave down, -5 cents)
      const oscTenor1 = ctx.createOscillator();
      oscTenor1.type = 'sawtooth';
      oscTenor1.frequency.setValueAtTime(freq / 2, now);
      oscTenor1.detune.setValueAtTime(-5, now);
      const gainTenor1 = ctx.createGain();
      gainTenor1.gain.setValueAtTime(0.4, now);
      oscTenor1.connect(gainTenor1);
      gainTenor1.connect(filterBP);
      oscillators.push(oscTenor1); gains.push(gainTenor1);

      // Tenor drone 2 (1 octave down, +6 cents)
      const oscTenor2 = ctx.createOscillator();
      oscTenor2.type = 'sawtooth';
      oscTenor2.frequency.setValueAtTime(freq / 2, now);
      oscTenor2.detune.setValueAtTime(6, now);
      const gainTenor2 = ctx.createGain();
      gainTenor2.gain.setValueAtTime(0.4, now);
      oscTenor2.connect(gainTenor2);
      gainTenor2.connect(filterBP);
      oscillators.push(oscTenor2); gains.push(gainTenor2);

      // Chanter/Reed harmonic bite (fundamental frequency)
      const oscChanter = ctx.createOscillator();
      oscChanter.type = 'sawtooth';
      oscChanter.frequency.setValueAtTime(freq, now);
      const gainChanter = ctx.createGain();
      gainChanter.gain.setValueAtTime(0.3, now);
      oscChanter.connect(gainChanter);
      gainChanter.connect(filterBP);
      gainChanter.connect(filterLP);
      oscillators.push(oscChanter); gains.push(gainChanter);

      // Fifth drone (Fundamental * 1.5)
      const oscFifth = ctx.createOscillator();
      oscFifth.type = 'sawtooth';
      oscFifth.frequency.setValueAtTime((freq / 2) * 1.5, now);
      const gainFifth = ctx.createGain();
      gainFifth.gain.setValueAtTime(0.2, now);
      oscFifth.connect(gainFifth);
      gainFifth.connect(filterLP);
      oscillators.push(oscFifth); gains.push(gainFifth);

    } else if (tone === DroneTone.UilleannPipes) {
      // --- Uilleann Pipes (Irish Bagpipe) ---
      // Sweeter, warmer, smooth reedy tone with wood pipe body resonance and subtle air bellows drift.
      const filterLP = ctx.createBiquadFilter();
      filterLP.type = 'lowpass';
      filterLP.frequency.setValueAtTime(1600, now);
      filterLP.Q.setValueAtTime(1.8, now);

      const filterPeak = ctx.createBiquadFilter();
      filterPeak.type = 'peaking';
      filterPeak.frequency.setValueAtTime(650, now);
      filterPeak.Q.setValueAtTime(2.0, now);
      filterPeak.gain.setValueAtTime(5, now);

      filterPeak.connect(filterLP);
      filterLP.connect(modGain);
      filters.push(filterLP, filterPeak);

      // Fundamental pipe (smooth saw/triangle blend)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.35, now);
      osc1.connect(gain1);
      gain1.connect(filterPeak);
      oscillators.push(osc1); gains.push(gain1);

      // Bass drone (1 octave down triangle)
      const oscBass = ctx.createOscillator();
      oscBass.type = 'triangle';
      oscBass.frequency.setValueAtTime(freq / 2, now);
      const gainBass = ctx.createGain();
      gainBass.gain.setValueAtTime(0.45, now);
      oscBass.connect(gainBass);
      gainBass.connect(filterPeak);
      oscillators.push(oscBass); gains.push(gainBass);

      // Baritone / Fifth drone
      const oscFifth = ctx.createOscillator();
      oscFifth.type = 'sine';
      oscFifth.frequency.setValueAtTime((freq / 2) * 1.5, now);
      const gainFifth = ctx.createGain();
      gainFifth.gain.setValueAtTime(0.25, now);
      oscFifth.connect(gainFifth);
      gainFifth.connect(filterPeak);
      oscillators.push(oscFifth); gains.push(gainFifth);

      // Gentle bellows air LFO pitch modulation
      const bellowsLfo = ctx.createOscillator();
      const bellowsGain = ctx.createGain();
      bellowsLfo.type = 'sine';
      bellowsLfo.frequency.setValueAtTime(0.25, now);
      bellowsGain.gain.setValueAtTime(1.5, now);
      bellowsLfo.connect(bellowsGain);
      bellowsGain.connect(osc1.frequency);
      bellowsGain.connect(oscBass.frequency);
      bellowsLfo.start(now);
      oscillators.push(bellowsLfo);

    } else if (tone === DroneTone.Accordion) {
      // --- Free-reed Accordion (Musette) ---
      // Free reeds with musette tremolo detune (+14 cents), bass reed 1 octave down, and clarinet rank 1 octave up.
      const filterLP = ctx.createBiquadFilter();
      filterLP.type = 'lowpass';
      filterLP.frequency.setValueAtTime(2600, now);
      filterLP.Q.setValueAtTime(1.2, now);
      filterLP.connect(modGain);
      filters.push(filterLP);

      // Main Reed (Square wave)
      const osc1 = ctx.createOscillator();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(freq, now);
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.3, now);
      osc1.connect(gain1);
      gain1.connect(filterLP);
      oscillators.push(osc1); gains.push(gain1);

      // Musette Reed (Square wave, +14 cents sharp detune)
      const oscMusette = ctx.createOscillator();
      oscMusette.type = 'square';
      oscMusette.frequency.setValueAtTime(freq, now);
      oscMusette.detune.setValueAtTime(14, now);
      const gainMusette = ctx.createGain();
      gainMusette.gain.setValueAtTime(0.28, now);
      oscMusette.connect(gainMusette);
      gainMusette.connect(filterLP);
      oscillators.push(oscMusette); gains.push(gainMusette);

      // Bass Reed (1 octave down sawtooth wave)
      const oscBass = ctx.createOscillator();
      oscBass.type = 'sawtooth';
      oscBass.frequency.setValueAtTime(freq / 2, now);
      oscBass.detune.setValueAtTime(-3, now);
      const gainBass = ctx.createGain();
      gainBass.gain.setValueAtTime(0.4, now);
      oscBass.connect(gainBass);
      gainBass.connect(filterLP);
      oscillators.push(oscBass); gains.push(gainBass);

      // High Octave Reed (1 octave up triangle wave)
      const oscHigh = ctx.createOscillator();
      oscHigh.type = 'triangle';
      oscHigh.frequency.setValueAtTime(freq * 2, now);
      const gainHigh = ctx.createGain();
      gainHigh.gain.setValueAtTime(0.12, now);
      oscHigh.connect(gainHigh);
      gainHigh.connect(filterLP);
      oscillators.push(oscHigh); gains.push(gainHigh);

    } else if (tone === DroneTone.SynthLead) {
      // --- Analog Synth Lead ---
      // Dual saw + pulse + sub-oscillator + resonant lowpass filter with slow cutoff LFO sweep.
      const filterLP1 = ctx.createBiquadFilter();
      filterLP1.type = 'lowpass';
      filterLP1.frequency.setValueAtTime(2200, now);
      filterLP1.Q.setValueAtTime(3.2, now);

      const filterLP2 = ctx.createBiquadFilter();
      filterLP2.type = 'lowpass';
      filterLP2.frequency.setValueAtTime(2800, now);
      filterLP2.Q.setValueAtTime(1.0, now);

      filterLP1.connect(filterLP2);
      filterLP2.connect(modGain);
      filters.push(filterLP1, filterLP2);

      // Osc 1: Sawtooth
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);
      osc1.detune.setValueAtTime(-5, now);
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.35, now);
      osc1.connect(gain1);
      gain1.connect(filterLP1);
      oscillators.push(osc1); gains.push(gain1);

      // Osc 2: Square
      const osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(freq, now);
      osc2.detune.setValueAtTime(8, now);
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.3, now);
      osc2.connect(gain2);
      gain2.connect(filterLP1);
      oscillators.push(osc2); gains.push(gain2);

      // Sub-Oscillator
      const oscSub = ctx.createOscillator();
      oscSub.type = 'square';
      oscSub.frequency.setValueAtTime(freq / 2, now);
      const gainSub = ctx.createGain();
      gainSub.gain.setValueAtTime(0.4, now);
      oscSub.connect(gainSub);
      gainSub.connect(filterLP1);
      oscillators.push(oscSub); gains.push(gainSub);

      // Filter Cutoff LFO Sweep
      const filterLfo = ctx.createOscillator();
      const filterLfoGain = ctx.createGain();
      filterLfo.type = 'sine';
      filterLfo.frequency.setValueAtTime(0.12, now);
      filterLfoGain.gain.setValueAtTime(400, now);
      filterLfo.connect(filterLfoGain);
      filterLfoGain.connect(filterLP1.frequency);
      filterLfo.start(now);
      oscillators.push(filterLfo);

    } else if (tone === DroneTone.Cello) {
      // --- Bowed Cello ---
      const filterLP = ctx.createBiquadFilter();
      filterLP.type = 'lowpass';
      filterLP.frequency.setValueAtTime(1200, now);
      filterLP.Q.setValueAtTime(1.6, now);
      filterLP.connect(modGain);
      filters.push(filterLP);

      // Cello fundamental (1 octave down)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq / 2, now);
      osc1.detune.setValueAtTime(2, now);
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.5, now);
      osc1.connect(gain1);
      gain1.connect(filterLP);
      oscillators.push(osc1); gains.push(gain1);

      // Cello octave body
      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq, now);
      osc2.detune.setValueAtTime(-2, now);
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.35, now);
      osc2.connect(gain2);
      gain2.connect(filterLP);
      oscillators.push(osc2); gains.push(gain2);

      // Triangle core
      const osc3 = ctx.createOscillator();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(freq / 2, now);
      const gain3 = ctx.createGain();
      gain3.gain.setValueAtTime(0.3, now);
      osc3.connect(gain3);
      gain3.connect(filterLP);
      oscillators.push(osc3); gains.push(gain3);

      // Cello Bow Vibrato
      const vibLfo = ctx.createOscillator();
      const vibGain = ctx.createGain();
      vibLfo.type = 'sine';
      vibLfo.frequency.setValueAtTime(4.2, now);
      vibGain.gain.setValueAtTime(3.0, now);
      vibLfo.connect(vibGain);
      vibGain.connect(osc1.detune);
      vibGain.connect(osc2.detune);
      vibLfo.start(now);
      oscillators.push(vibLfo);

    } else {
      // --- Strings Ensemble ---
      const filterLP = ctx.createBiquadFilter();
      filterLP.type = 'lowpass';
      filterLP.frequency.setValueAtTime(3000, now);
      filterLP.Q.setValueAtTime(0.8, now);
      filterLP.connect(modGain);
      filters.push(filterLP);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);
      osc1.detune.setValueAtTime(-6, now);
      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.35, now);
      osc1.connect(gain1);
      gain1.connect(filterLP);
      oscillators.push(osc1); gains.push(gain1);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq, now);
      osc2.detune.setValueAtTime(6, now);
      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.35, now);
      osc2.connect(gain2);
      gain2.connect(filterLP);
      oscillators.push(osc2); gains.push(gain2);

      const osc3 = ctx.createOscillator();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(freq / 2, now);
      const gain3 = ctx.createGain();
      gain3.gain.setValueAtTime(0.3, now);
      osc3.connect(gain3);
      gain3.connect(filterLP);
      oscillators.push(osc3); gains.push(gain3);
    }

    oscillators.forEach(osc => {
      try { osc.start(now); } catch (e) {}
    });

    let lfo: OscillatorNode | undefined;
    let lfoGain: GainNode | undefined;

    if (pulseBpm > 0) {
      lfo = ctx.createOscillator();
      lfoGain = ctx.createGain();
      const lfoFreq = pulseBpm / 60;
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(lfoFreq, now);
      lfoGain.gain.setValueAtTime(0, now);
      lfoGain.gain.linearRampToValueAtTime(0.35, now + 0.2); 
      lfo.connect(lfoGain);
      lfoGain.connect(modGain.gain);
      lfo.start(now);
    }

    droneNodesRef.current.set(noteWithOctave, { 
      oscillators, gains, filters, lfo, lfoGain, masterGain, modGain, tone 
    });

    setActiveDrones(prev => ({
      ...prev,
      [noteWithOctave]: { tone, volume, pulseBpm }
    }));
  };

  useEffect(() => {
    if (isDronePlaying) {
      userDroneNotes.forEach(note => {
        const existing = droneNodesRef.current.get(note);
        if (!existing) {
          startDroneAudio(note, droneTone, droneVolume, dronePulseBpm);
        } else if (existing.tone !== droneTone) {
          stopDroneAudio(note);
          startDroneAudio(note, droneTone, droneVolume, dronePulseBpm);
        }
      });
      const currentNodes = Array.from(droneNodesRef.current.keys());
      currentNodes.forEach(note => {
        if (!userDroneNotes.includes(note)) {
          stopDroneAudio(note);
        }
      });
    } else {
      stopAllDrones();
    }
  }, [isDronePlaying, userDroneNotes, droneTone, stopAllDrones]);

  // Real-time parameter updates (Volume, Pulse)
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    
    droneNodesRef.current.forEach((nodes) => {
      // Update Volume
      nodes.masterGain.gain.setTargetAtTime(droneVolume * 0.35, ctx.currentTime, 0.05);

      // Update Pulse BPM (LFO)
      if (dronePulseBpm > 0) {
        if (!nodes.lfo || !nodes.lfoGain) {
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.type = 'sine';
          lfo.frequency.setValueAtTime(dronePulseBpm / 60, ctx.currentTime);
          lfoGain.gain.setValueAtTime(0, ctx.currentTime);
          lfoGain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.1);
          lfo.connect(lfoGain);
          lfoGain.connect(nodes.modGain.gain);
          lfo.start();
          nodes.lfo = lfo;
          nodes.lfoGain = lfoGain;
        } else {
          nodes.lfo.frequency.setTargetAtTime(dronePulseBpm / 60, ctx.currentTime, 0.05);
        }
      } else if (nodes.lfo && nodes.lfoGain) {
        const lfo = nodes.lfo;
        const lfoGain = nodes.lfoGain;
        lfoGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        setTimeout(() => {
          try {
            lfo.stop();
            lfo.disconnect();
            lfoGain.disconnect();
          } catch (e) {}
        }, 100);
        nodes.lfo = undefined;
        nodes.lfoGain = undefined;
      }
    });
  }, [droneVolume, dronePulseBpm]);

  // --- Ref Note Logic ---
  const stopRefNote = useCallback(() => {
    setPlayingRefNote(null);
    if (refGainRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      const g = refGainRef.current;
      const o = refOscRef.current;
      try {
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
        refGainRef.current = null;
        refOscRef.current = null;
        setTimeout(() => {
          try { o?.stop(); o?.disconnect(); g.disconnect(); } catch (e) {}
        }, 150);
      } catch (e) {}
    }
  }, []);

  const playRefNote = (noteName: string) => {
    if (playingRefNote === noteName) {
      stopRefNote();
      return;
    }
    stopRefNote();
    const noteMatch = noteName.match(/^([A-G]#?)(\d)$/);
    if (!noteMatch) return;
    const [, name, octaveStr] = noteMatch;
    const octave = parseInt(octaveStr);
    const noteIndex = NOTES.indexOf(name);
    if (noteIndex === -1) return;
    const midiNote = (octave + 1) * 12 + noteIndex;
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(getMasterOutput(ctx));
    osc.start();
    refOscRef.current = osc;
    refGainRef.current = gain;
    setPlayingRefNote(noteName);
  };

  // --- Chord & Note Synthesis Logic ---
  const applyTone = (osc: OscillatorNode, gain: GainNode, instrument: InstrumentType, freq: number, now: number, duration: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const cleanupNodes: { disconnect: () => void }[] = [];

    switch (instrument) {
      case InstrumentType.Piano: {
        // --- Acoustic Concert Grand Piano ---
        // 1. Felt Hammer Attack Transient (Reuses cached buffer)
        const hammerSource = ctx.createBufferSource();
        hammerSource.buffer = getHammerBuffer(ctx);

        const hammerFilter = ctx.createBiquadFilter();
        hammerFilter.type = 'bandpass';
        hammerFilter.frequency.setValueAtTime(1600, now);
        hammerFilter.Q.setValueAtTime(1.8, now);

        const hammerGain = ctx.createGain();
        hammerGain.gain.setValueAtTime(0.025, now);

        hammerSource.connect(hammerFilter);
        hammerFilter.connect(hammerGain);
        hammerGain.connect(gain);
        hammerSource.start(now);
        hammerSource.stop(now + 0.02);
        cleanupNodes.push(hammerSource, hammerFilter, hammerGain);

        // Low frequency wooden body thump
        const thumpOsc = ctx.createOscillator();
        const thumpGain = ctx.createGain();
        thumpOsc.type = 'sine';
        thumpOsc.frequency.setValueAtTime(110, now);
        thumpGain.gain.setValueAtTime(0.015, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
        thumpOsc.connect(thumpGain);
        thumpGain.connect(gain);
        thumpOsc.start(now);
        thumpOsc.stop(now + 0.02);
        cleanupNodes.push(thumpOsc, thumpGain);

        // 2. Soundboard Body Resonator & Dynamic Lowpass Filter
        const soundboardFilter1 = ctx.createBiquadFilter();
        soundboardFilter1.type = 'peaking';
        soundboardFilter1.frequency.setValueAtTime(280, now);
        soundboardFilter1.Q.setValueAtTime(1.2, now);
        soundboardFilter1.gain.setValueAtTime(2.5, now);

        const lpFilter = ctx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        const initialCutoff = Math.min(8000, Math.max(2400, freq * 5.0));
        const sustainCutoff = Math.min(2800, Math.max(950, freq * 2.0));
        lpFilter.frequency.setValueAtTime(initialCutoff, now);
        lpFilter.frequency.exponentialRampToValueAtTime(sustainCutoff, now + 0.16);

        soundboardFilter1.connect(lpFilter);
        lpFilter.connect(gain);
        cleanupNodes.push(soundboardFilter1, lpFilter);

        // 3. Reusable Realistic Piano Harmonic PeriodicWave
        const pianoWave = getPianoPeriodicWave(ctx);

        // 4. 2-String Chorused Unison (Center & Detuned) for warmth
        const mainGain = ctx.createGain();
        mainGain.gain.setValueAtTime(0.0001, now);
        mainGain.gain.linearRampToValueAtTime(0.12, now + 0.003);
        mainGain.gain.exponentialRampToValueAtTime(0.065, now + 0.14);
        mainGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.05);

        // Primary string
        osc.setPeriodicWave(pianoWave);
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(mainGain);

        // Detuned unison string 2
        const uOsc1 = ctx.createOscillator();
        uOsc1.setPeriodicWave(pianoWave);
        uOsc1.frequency.setValueAtTime(freq, now);
        uOsc1.detune.setValueAtTime(-1.5, now);
        uOsc1.connect(mainGain);
        uOsc1.start(now);
        uOsc1.stop(now + duration);
        cleanupNodes.push(uOsc1, mainGain);

        mainGain.connect(soundboardFilter1);
        break;
      }

      case InstrumentType.ElectricPiano: {
        // --- Vintage Rhodes Electric Piano (FM Tine + Bell Chime + Magnetic Pickup Bark) ---
        // Operator 1: Silver Tine FM Modulator (ratio 14.0x) for dynamic metallic tine ping
        const tineModOsc = ctx.createOscillator();
        const tineModGain = ctx.createGain();
        tineModOsc.type = 'sine';
        tineModOsc.frequency.setValueAtTime(freq * 14.0, now);
        tineModGain.gain.setValueAtTime(freq * 1.8, now);
        tineModGain.gain.exponentialRampToValueAtTime(0.01, now + 0.045);

        tineModOsc.connect(tineModGain);
        tineModGain.connect(osc.frequency);
        tineModOsc.start(now);
        tineModOsc.stop(now + 0.06);

        // Operator 2: Bell Chime Overtone (ratio 7.0x)
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(freq * 7.0, now);
        bellGain.gain.setValueAtTime(0.035, now);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        bellOsc.connect(bellGain);
        bellOsc.start(now);
        bellOsc.stop(now + 0.15);

        // Warm Pickup 2nd Harmonic Body (velvety mid-range warmth)
        const h2Osc = ctx.createOscillator();
        const h2Gain = ctx.createGain();
        h2Osc.type = 'sine';
        h2Osc.frequency.setValueAtTime(freq * 2.0, now);
        h2Gain.gain.setValueAtTime(0.0001, now);
        h2Gain.gain.linearRampToValueAtTime(0.045, now + 0.006);
        h2Gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.95);
        h2Osc.connect(h2Gain);
        h2Osc.start(now);
        h2Osc.stop(now + duration);

        // Warm Suitcase Tremolo / Chorus LFO
        const tremLfo = ctx.createOscillator();
        const tremGain = ctx.createGain();
        tremLfo.type = 'sine';
        tremLfo.frequency.setValueAtTime(0.75, now);
        tremGain.gain.setValueAtTime(0.015, now);
        tremLfo.connect(tremGain);
        tremGain.connect(gain.gain);
        tremLfo.start(now);
        tremLfo.stop(now + duration);

        // Warm Rhodes Tone Filter
        const rhodesFilter = ctx.createBiquadFilter();
        rhodesFilter.type = 'lowpass';
        rhodesFilter.frequency.setValueAtTime(2800, now);

        // Carrier Envelope: Singing Electric Piano Decay
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(rhodesFilter);
        bellGain.connect(rhodesFilter);
        h2Gain.connect(rhodesFilter);
        rhodesFilter.connect(gain);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.05);

        cleanupNodes.push(tineModOsc, tineModGain, bellOsc, bellGain, h2Osc, h2Gain, tremLfo, tremGain, rhodesFilter);
        break;
      }

      case InstrumentType.Guitar: {
        // --- Acoustic Guitar (Steel/Nylon Plucked String Modeling) ---
        const pluckSource = ctx.createBufferSource();
        pluckSource.buffer = getPluckBuffer(ctx);

        const pluckFilter = ctx.createBiquadFilter();
        pluckFilter.type = 'bandpass';
        pluckFilter.frequency.setValueAtTime(2800, now);
        pluckFilter.Q.setValueAtTime(1.2, now);

        const pluckGain = ctx.createGain();
        pluckGain.gain.setValueAtTime(0.035, now);

        pluckSource.connect(pluckFilter);
        pluckFilter.connect(pluckGain);
        pluckGain.connect(gain);
        pluckSource.start(now);
        pluckSource.stop(now + 0.02);

        // Guitar Body Cavity Resonant Filters
        const bodyWoodFilter = ctx.createBiquadFilter();
        bodyWoodFilter.type = 'peaking';
        bodyWoodFilter.frequency.setValueAtTime(220, now);
        bodyWoodFilter.Q.setValueAtTime(2.0, now);
        bodyWoodFilter.gain.setValueAtTime(3.5, now);

        const guitarLP = ctx.createBiquadFilter();
        guitarLP.type = 'lowpass';
        guitarLP.frequency.setValueAtTime(3400, now);

        bodyWoodFilter.connect(guitarLP);
        guitarLP.connect(gain);

        // Primary Plucked String Waveform
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.85);

        // String Overtones
        const overtone = ctx.createOscillator();
        const oGain = ctx.createGain();
        overtone.type = 'sawtooth';
        overtone.frequency.setValueAtTime(freq * 2, now);
        oGain.gain.setValueAtTime(0.0001, now);
        oGain.gain.linearRampToValueAtTime(0.025, now + 0.005);
        oGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.35);

        overtone.connect(oGain);
        oGain.connect(bodyWoodFilter);
        osc.connect(bodyWoodFilter);

        overtone.start(now);
        overtone.stop(now + duration);
        cleanupNodes.push(pluckSource, pluckFilter, pluckGain, bodyWoodFilter, guitarLP, overtone, oGain);
        break;
      }

      case InstrumentType.Bass: {
        // --- Acoustic / Electric Plucked Bass (Articulate Finger Pluck, Punchy Filter Sweep & Tight Damping) ---
        // 1. Finger Pluck Attack Transient
        const pluckSrc = ctx.createBufferSource();
        pluckSrc.buffer = getBassPluckBuffer(ctx);
        const pluckFilt = ctx.createBiquadFilter();
        pluckFilt.type = 'bandpass';
        pluckFilt.frequency.setValueAtTime(1400, now);
        pluckFilt.Q.setValueAtTime(1.5, now);
        const pluckVol = ctx.createGain();
        pluckVol.gain.setValueAtTime(0.04, now);
        pluckSrc.connect(pluckFilt);
        pluckFilt.connect(pluckVol);
        pluckVol.connect(gain);
        pluckSrc.start(now);
        pluckSrc.stop(now + 0.015);
        cleanupNodes.push(pluckSrc, pluckFilt, pluckVol);

        // 2. Dynamic Lowpass Filter Sweep (snappy high-frequency damping like real steel string)
        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(1800, now);
        bassFilter.frequency.exponentialRampToValueAtTime(320, now + 0.065);
        bassFilter.connect(gain);

        // 3. String Body: Triangle (string buzz) + Sine (fundamental pitch definition)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(bassFilter);

        const sineFund = ctx.createOscillator();
        const fundGain = ctx.createGain();
        sineFund.type = 'sine';
        sineFund.frequency.setValueAtTime(freq, now);
        fundGain.gain.setValueAtTime(0.0001, now);
        fundGain.gain.linearRampToValueAtTime(0.12, now + 0.004);
        fundGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(duration * 0.9, 0.75));
        sineFund.connect(fundGain);
        fundGain.connect(gain);
        sineFund.start(now);
        sineFund.stop(now + duration);

        // Sub-octave reinforcement for focused low-end weight
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(freq * 0.5, now);
        subGain.gain.setValueAtTime(0.0001, now);
        subGain.gain.linearRampToValueAtTime(0.09, now + 0.008);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(duration * 0.85, 0.65));
        subOsc.connect(subGain);
        subGain.connect(gain);
        subOsc.start(now);
        subOsc.stop(now + duration);

        // Tight, punchy master envelope to prevent muddy bass overhang
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.13, now + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(duration * 0.9, 0.75));

        cleanupNodes.push(bassFilter, sineFund, fundGain, subOsc, subGain);
        break;
      }

      case InstrumentType.Strings: {
        // --- Symphonic String Ensemble (Warm Bow Bite, Lush Chorusing, Natural Decrescendo & Articulate Release) ---
        const stringFilter = ctx.createBiquadFilter();
        stringFilter.type = 'peaking';
        stringFilter.frequency.setValueAtTime(340, now);
        stringFilter.Q.setValueAtTime(1.4, now);
        stringFilter.gain.setValueAtTime(3.5, now);

        const stringLP = ctx.createBiquadFilter();
        stringLP.type = 'lowpass';
        stringLP.frequency.setValueAtTime(2400, now);

        stringFilter.connect(stringLP);
        stringLP.connect(gain);

        // Center Voice Sawtooth
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(stringFilter);

        // Multi-voice Ensemble Detuning (-6 cents, +6 cents, -12 cents sub-saw for cello richness)
        const detunes = [-6, 6, -12];
        const gains = [0.035, 0.035, 0.02];
        detunes.forEach((cents, i) => {
          const sOsc = ctx.createOscillator();
          const sGain = ctx.createGain();
          sOsc.type = 'sawtooth';
          sOsc.frequency.setValueAtTime(i === 2 ? freq * 0.5 : freq, now);
          sOsc.detune.setValueAtTime(cents, now);
          sGain.gain.setValueAtTime(gains[i], now);

          sOsc.connect(sGain);
          sGain.connect(stringFilter);
          sOsc.start(now);
          sOsc.stop(now + duration);
          cleanupNodes.push(sOsc, sGain);
        });

        // Articulate Bow Envelope: Smooth attack (45ms), natural bowing decrescendo down to 40% sustain, fast clean release
        const peakTime = now + 0.05;
        const decayTime = now + Math.min(duration * 0.6, 0.45);
        const releaseStartTime = Math.max(decayTime, now + duration - 0.08);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.085, peakTime);
        gain.gain.exponentialRampToValueAtTime(0.035, decayTime);
        gain.gain.setValueAtTime(0.035, releaseStartTime);
        gain.gain.linearRampToValueAtTime(0.0001, now + duration);

        cleanupNodes.push(stringFilter, stringLP);
        break;
      }

      case InstrumentType.Organ: {
        // --- Hammond B3 Organ (B3 Drawbars, Key Click Percussion, Rotary Chorus & Crisp Chords) ---
        // 1. Mechanical B3 Key Click Transient
        const keyClickSrc = ctx.createBufferSource();
        keyClickSrc.buffer = getOrganKeyClickBuffer(ctx);
        const clickFilt = ctx.createBiquadFilter();
        clickFilt.type = 'bandpass';
        clickFilt.frequency.setValueAtTime(4500, now);
        clickFilt.Q.setValueAtTime(2.0, now);
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0.035, now);
        keyClickSrc.connect(clickFilt);
        clickFilt.connect(clickGain);
        clickGain.connect(gain);
        keyClickSrc.start(now);
        keyClickSrc.stop(now + 0.008);
        cleanupNodes.push(keyClickSrc, clickFilt, clickGain);

        // 2. Rotary Leslie Speaker Emulation (Subtle dual-chorus vibrato modulation)
        const leslieLfo = ctx.createOscillator();
        const leslieGain = ctx.createGain();
        leslieLfo.type = 'sine';
        leslieLfo.frequency.setValueAtTime(1.2, now); // Slow rotary chorusing
        leslieGain.gain.setValueAtTime(2.5, now);
        leslieLfo.connect(leslieGain);
        leslieGain.connect(osc.detune);
        leslieLfo.start(now);
        leslieLfo.stop(now + duration);

        // 3. Full B3 Drawbar Harmonics: 16' (0.5x), 8' (1.0x), 5 1/3' (1.5x), 4' (2.0x), 2 2/3' (3.0x), 2' (4.0x)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(gain);

        const drawbarRatios = [0.5, 1.5, 2.0, 3.0, 4.0];
        const drawbarGains  = [0.035, 0.025, 0.03, 0.015, 0.01];

        drawbarRatios.forEach((ratio, i) => {
          const dOsc = ctx.createOscillator();
          const dGain = ctx.createGain();
          dOsc.type = 'sine';
          dOsc.frequency.setValueAtTime(freq * ratio, now);
          dGain.gain.setValueAtTime(drawbarGains[i], now);

          dOsc.connect(dGain);
          dGain.connect(gain);
          dOsc.start(now);
          dOsc.stop(now + duration);
          cleanupNodes.push(dOsc, dGain);
        });

        // Articulate Envelope: Instant punchy onset, smooth decay to 50% warm sustain, snappy 30ms release
        const decayTime = now + Math.min(duration * 0.55, 0.35);
        const relStartTime = Math.max(decayTime, now + duration - 0.035);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.09, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.045, decayTime);
        gain.gain.setValueAtTime(0.045, relStartTime);
        gain.gain.linearRampToValueAtTime(0.0001, now + duration);

        cleanupNodes.push(leslieLfo, leslieGain);
        break;
      }

      case InstrumentType.Flute: {
        // --- Concert Flute (Embouchure Chiff, Octave Overblowing, Warm Air & Lyrical Vibrato) ---
        // 1. Embouchure Breath Chiff Attack Transient
        const chiffSrc = ctx.createBufferSource();
        chiffSrc.buffer = getFluteBreathBuffer(ctx);
        const chiffFilt = ctx.createBiquadFilter();
        chiffFilt.type = 'bandpass';
        chiffFilt.frequency.setValueAtTime(2400, now);
        chiffFilt.Q.setValueAtTime(1.8, now);
        const chiffGain = ctx.createGain();
        chiffGain.gain.setValueAtTime(0.025, now);
        chiffSrc.connect(chiffFilt);
        chiffFilt.connect(chiffGain);
        chiffGain.connect(gain);
        chiffSrc.start(now);
        chiffSrc.stop(now + 0.035);
        cleanupNodes.push(chiffSrc, chiffFilt, chiffGain);

        // 2. Pure Fundamental Tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(gain);

        // 3. 2nd Harmonic Octave Overblowing (18%) + 3rd Harmonic Air Column (5%)
        const h2Osc = ctx.createOscillator();
        const h2Gain = ctx.createGain();
        h2Osc.type = 'sine';
        h2Osc.frequency.setValueAtTime(freq * 2, now);
        h2Gain.gain.setValueAtTime(0.015, now);
        h2Osc.connect(h2Gain);
        h2Gain.connect(gain);
        h2Osc.start(now);
        h2Osc.stop(now + duration);

        const h3Osc = ctx.createOscillator();
        const h3Gain = ctx.createGain();
        h3Osc.type = 'sine';
        h3Osc.frequency.setValueAtTime(freq * 3, now);
        h3Gain.gain.setValueAtTime(0.005, now);
        h3Osc.connect(h3Gain);
        h3Gain.connect(gain);
        h3Osc.start(now);
        h3Osc.stop(now + duration);

        // 4. Lyrical Vibrato LFO (5.4 Hz blooming in after 60ms)
        const vibLfo = ctx.createOscillator();
        const vibGain = ctx.createGain();
        vibLfo.type = 'sine';
        vibLfo.frequency.setValueAtTime(5.4, now);
        vibGain.gain.setValueAtTime(0, now);
        vibGain.gain.linearRampToValueAtTime(3.2, now + 0.12);
        vibLfo.connect(vibGain);
        vibGain.connect(osc.frequency);
        vibGain.connect(h2Osc.frequency);
        vibLfo.start(now);
        vibLfo.stop(now + duration);

        // Articulate Flute Envelope: Smooth breath rise (25ms), natural decrescendo to 45%, clean 60ms breath release
        const decayTime = now + Math.min(duration * 0.65, 0.45);
        const relStartTime = Math.max(decayTime, now + duration - 0.06);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.04, decayTime);
        gain.gain.setValueAtTime(0.04, relStartTime);
        gain.gain.linearRampToValueAtTime(0.0001, now + duration);

        cleanupNodes.push(h2Osc, h2Gain, h3Osc, h3Gain, vibLfo, vibGain);
        break;
      }

      case InstrumentType.Brass: {
        // --- Acoustic Brass Section (Lip Swell, Dynamic Filter Opening, Warm Saw/Tri Blend) ---
        const brassFilter = ctx.createBiquadFilter();
        brassFilter.type = 'lowpass';
        brassFilter.Q.setValueAtTime(1.1, now);
        brassFilter.frequency.setValueAtTime(freq * 1.5, now);
        brassFilter.frequency.exponentialRampToValueAtTime(Math.min(3200, freq * 3.8), now + 0.045);
        brassFilter.frequency.exponentialRampToValueAtTime(Math.min(1600, freq * 2.0), now + duration * 0.6);

        brassFilter.connect(gain);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(-4, now);
        osc.connect(brassFilter);

        const bOsc2 = ctx.createOscillator();
        bOsc2.type = 'sawtooth';
        bOsc2.frequency.setValueAtTime(freq, now);
        bOsc2.detune.setValueAtTime(5, now);
        bOsc2.connect(brassFilter);

        const bOsc3 = ctx.createOscillator();
        bOsc3.type = 'triangle';
        bOsc3.frequency.setValueAtTime(freq, now);
        bOsc3.connect(brassFilter);

        // Dynamic Brass Swell & Articulate Release
        const peakTime = now + 0.035;
        const decayTime = now + Math.min(duration * 0.6, 0.45);
        const relStartTime = Math.max(decayTime, now + duration - 0.06);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.085, peakTime);
        gain.gain.exponentialRampToValueAtTime(0.045, decayTime);
        gain.gain.setValueAtTime(0.045, relStartTime);
        gain.gain.linearRampToValueAtTime(0.0001, now + duration);

        bOsc2.start(now);
        bOsc2.stop(now + duration);
        bOsc3.start(now);
        bOsc3.stop(now + duration);
        cleanupNodes.push(brassFilter, bOsc2, bOsc3);
        break;
      }

      case InstrumentType.Marimba: {
        // --- Acoustic Rosewood Marimba (Wooden Mallet Click, 4x Double-Octave Overtone, Resonator Pipe Body) ---
        // 1. Hard Mallet on Rosewood Strike Transient
        const clickSrc = ctx.createBufferSource();
        clickSrc.buffer = getMarimbaClickBuffer(ctx);
        const clickFilt = ctx.createBiquadFilter();
        clickFilt.type = 'bandpass';
        clickFilt.frequency.setValueAtTime(2600, now);
        clickFilt.Q.setValueAtTime(2.2, now);
        const clickVol = ctx.createGain();
        clickVol.gain.setValueAtTime(0.045, now);
        clickSrc.connect(clickFilt);
        clickFilt.connect(clickVol);
        clickVol.connect(gain);
        clickSrc.start(now);
        clickSrc.stop(now + 0.008);
        cleanupNodes.push(clickSrc, clickFilt, clickVol);

        // 2. Tubular Resonator Pipe Peaking Filter (amplifies warm acoustic bar resonance)
        const resonatorPipe = ctx.createBiquadFilter();
        resonatorPipe.type = 'peaking';
        resonatorPipe.frequency.setValueAtTime(480, now);
        resonatorPipe.Q.setValueAtTime(2.0, now);
        resonatorPipe.gain.setValueAtTime(4.0, now);
        resonatorPipe.connect(gain);

        // 3. Fundamental Sine Tone (warm hollow wooden bar)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(resonatorPipe);

        // 4. Acoustic Marimba Bar 1st Overtone (4.0x double octave mode, decays quickly in ~45ms)
        const overtone4x = ctx.createOscillator();
        const o4Gain = ctx.createGain();
        overtone4x.type = 'sine';
        overtone4x.frequency.setValueAtTime(freq * 4.0, now);
        o4Gain.gain.setValueAtTime(0.04, now);
        o4Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
        overtone4x.connect(o4Gain);
        o4Gain.connect(resonatorPipe);
        overtone4x.start(now);
        overtone4x.stop(now + 0.06);

        // 5. Acoustic Marimba Bar 2nd Overtone (9.8x transverse mode, decays in 15ms)
        const overtone9x = ctx.createOscillator();
        const o9Gain = ctx.createGain();
        overtone9x.type = 'sine';
        overtone9x.frequency.setValueAtTime(freq * 9.8, now);
        o9Gain.gain.setValueAtTime(0.02, now);
        o9Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
        overtone9x.connect(o9Gain);
        o9Gain.connect(resonatorPipe);
        overtone9x.start(now);
        overtone9x.stop(now + 0.03);

        // Crisp, snappy wooden mallet decay curve (unmistakably percussive marimba)
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.13, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(duration * 0.55, 0.38));

        cleanupNodes.push(resonatorPipe, overtone4x, o4Gain, overtone9x, o9Gain);
        break;
      }

      default:
        osc.type = 'triangle';
        osc.connect(gain);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    }

    if (cleanupNodes.length > 0) {
      const cleanupDelayMs = Math.max(100, Math.ceil((now - ctx.currentTime + duration + 0.1) * 1000));
      scheduleNodeCleanup(cleanupNodes, cleanupDelayMs);
    }
  };

  const playChord = (
    chord: string,
    instrument: InstrumentType = InstrumentType.Piano,
    volume: number = 1.0,
    options?: PlayChordOptions,
    time?: number
  ) => {
    const ctx = initAudio();
    const duration = options?.duration || 1.6;
    const now = time ?? ctx.currentTime;

    let frequencies: { freq: number; isBass: boolean; idx: number }[] = [];

    if (options?.customMidiNotes && options.customMidiNotes.length > 0) {
      const sorted = [...options.customMidiNotes].sort((a, b) => a - b);
      frequencies = sorted.map((midi, idx) => ({
        freq: 440 * Math.pow(2, (midi - 69) / 12),
        isBass: idx === 0 && sorted.length > 2 && midi < 54,
        idx
      }));
    } else if (options?.customIntervals && options.customIntervals.length > 0) {
      const rootFreq = 261.63;
      frequencies = options.customIntervals.map((interval, idx) => ({
        freq: rootFreq * Math.pow(2, interval / 12),
        isBass: idx === 0,
        idx
      }));
    } else if (chord && chord.trim() !== '') {
      const midiNotes = getVoicedMidiNotes(chord, {
        prevChord: options?.prevChord,
        nextChord: options?.nextChord,
        prevVoicing: options?.prevVoicing,
        style: options?.voicingStyle
      });

      frequencies = midiNotes.map((midi, idx) => ({
        freq: 440 * Math.pow(2, (midi - 69) / 12),
        isBass: idx === 0 && midi < 54,
        idx
      }));
    } else {
      const intervals = getIntervalsForChord(chord);
      if (!intervals) return;
      const rootFreq = 261.63;
      frequencies = intervals.map((interval, idx) => ({
        freq: rootFreq * Math.pow(2, interval / 12),
        isBass: idx === 0,
        idx
      }));
    }

    if (frequencies.length === 0) return;

    let staggerStepMs = 0;
    if (options?.isStrummed !== false) {
      if (instrument === InstrumentType.Guitar) {
        staggerStepMs = 22;
      } else if (instrument === InstrumentType.Piano || instrument === InstrumentType.ElectricPiano) {
        staggerStepMs = 12;
      } else if (instrument === InstrumentType.Marimba) {
        staggerStepMs = 8;
      }
    }

    const outputTarget = getMasterOutput(ctx);

    const nodesToCleanup: { disconnect: () => void }[] = [];

    frequencies.forEach(({ freq, isBass, idx }) => {
      const noteStartTime = now + (idx * staggerStepMs / 1000);

      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      const volumeGain = ctx.createGain();

      osc.frequency.setValueAtTime(freq, noteStartTime);
      applyTone(osc, voiceGain, instrument, freq, noteStartTime, duration);

      let noteVelocity = 0.95;
      if (isBass) {
        noteVelocity = 1.05;
      } else if (idx === frequencies.length - 1) {
        noteVelocity = 1.02;
      } else {
        noteVelocity = 0.90;
      }

      const humanVelocity = noteVelocity * (0.94 + Math.random() * 0.12);
      volumeGain.gain.setValueAtTime(volume * humanVelocity, noteStartTime);

      voiceGain.connect(volumeGain);
      volumeGain.connect(outputTarget);

      osc.start(noteStartTime);
      osc.stop(noteStartTime + duration);

      nodesToCleanup.push(osc, voiceGain, volumeGain);
    });

    const cleanupDelayMs = Math.max(100, Math.ceil((now - ctx.currentTime + duration + 0.1) * 1000));
    scheduleNodeCleanup(nodesToCleanup, cleanupDelayMs);
  };

  // --- Note Logic ---
  const playNote = (
    interval: number,
    duration: number = 0.8,
    instrument: InstrumentType = InstrumentType.Piano,
    volume: number = 1.0,
    time?: number
  ) => {
    const ctx = initAudio();
    const rootFreq = 261.63;
    const now = time ?? ctx.currentTime;
    const freq = rootFreq * Math.pow(2, interval / 12);
    
    const outputTarget = getMasterOutput(ctx);
    
    const osc = ctx.createOscillator();
    const voiceGain = ctx.createGain();
    const volumeGain = ctx.createGain();

    osc.frequency.setValueAtTime(freq, now);
    applyTone(osc, voiceGain, instrument, freq, now, duration);
    
    volumeGain.gain.setValueAtTime(volume, now);
    
    voiceGain.connect(volumeGain);
    volumeGain.connect(outputTarget);
    
    osc.start(now);
    osc.stop(now + duration);

    const cleanupDelayMs = Math.max(100, Math.ceil((now - ctx.currentTime + duration + 0.1) * 1000));
    scheduleNodeCleanup([osc, voiceGain, volumeGain], cleanupDelayMs);
  };

  const playPercussion = useCallback((sound: MetronomeSound, isAccent: boolean = false, volume: number = 0.8, time?: number) => {
    const ctx = initAudio();
    if (!ctx) return;
    playClick(time ?? ctx.currentTime, sound, volume, isAccent);
  }, []);

  const value = {
    isMetronomePlaying, metronomeBpm, setMetronomeBpm, startMetronome, stopMetronome, metronomePattern, setMetronomePattern, currentBeat, metronomeVolume, setMetronomeVolume,
    isAccompanimentPlaying, setIsAccompanimentPlaying,
    activeDrones, isDronePlaying, setIsDronePlaying,
    userDroneNotes, toggleDroneNote,
    selectedDroneNote, setSelectedDroneNote, 
    droneTone, setDroneTone, 
    droneVolume, setDroneVolume, 
    dronePulseBpm, setDronePulseBpm,
    stopAllDrones,
    playingRefNote, playRefNote, stopRefNote,
    playChord,
    playNote,
    playPercussion,
    getAudioContext,
    registerBeatScheduler
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};
