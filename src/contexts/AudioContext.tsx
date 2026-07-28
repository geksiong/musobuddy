import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { MetronomeSound, BeatPattern, TimeSignatureType } from '../components/Metronome/types.ts';
import { DEFAULT_PRESETS } from '../components/Metronome/constants.ts';
import { DroneTone } from '../components/Drone/types.ts';
import { InstrumentType } from '../types.ts';
import { NOTES, getIntervalsForChord } from '../constants.ts';

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

  // Chord Player
  playChord: (chord: string, instrument?: InstrumentType, volume?: number) => void;
  playNote: (noteIndex: number, duration?: number, instrument?: InstrumentType, volume?: number) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

const LOOKAHEAD = 25.0;
const SCHEDULE_AHEAD_TIME = 0.1;

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Metronome & Accompaniment State
  const [isMetronomePlaying, _setIsMetronomePlaying] = useState(false);
  const isMetronomePlayingRef = useRef(false);

  const [isAccompanimentPlaying, _setIsAccompanimentPlaying] = useState(false);
  const isAccompanimentPlayingRef = useRef(false);

  const [metronomeBpm, setMetronomeBpm] = useState(120);
  const [metronomePattern, _setMetronomePattern] = useState<BeatPattern | null>(DEFAULT_PRESETS[0] || null);
  const metronomePatternRef = useRef<BeatPattern | null>(DEFAULT_PRESETS[0] || null);
  const [metronomeVolume, setMetronomeVolume] = useState(0.8);
  const metronomeVolumeRef = useRef(0.8);
  const [currentBeat, setCurrentBeat] = useState(0);
  const metronomeTimerRef = useRef<number | null>(null);
  const voiceStatesRef = useRef<{ nextNoteTime: number; stepIndex: number }[]>([]);

  // Drone State
  const [activeDrones, setActiveDrones] = useState<Record<string, { tone: DroneTone; volume: number; pulseBpm: number }>>({});
  const [isDronePlaying, setIsDronePlaying] = useState(false);
  const [userDroneNotes, setUserDroneNotes] = useState<string[]>(['D3']);
  const [selectedDroneNote, setSelectedDroneNote] = useState('D3');
  const [droneTone, setDroneTone] = useState<DroneTone>(DroneTone.Strings);
  const [droneVolume, setDroneVolume] = useState(0.5);
  const [dronePulseBpm, setDronePulseBpm] = useState(0);

  const droneNodesRef = useRef<Map<string, { 
    osc1: OscillatorNode; 
    osc2: OscillatorNode; 
    lfo?: OscillatorNode;
    lfoGain?: GainNode;
    gain: GainNode;
    modGain: GainNode;
  }>>(new Map());

  // Ref Note State
  const [playingRefNote, setPlayingRefNote] = useState<string | null>(null);
  const refOscRef = useRef<OscillatorNode | null>(null);
  const refGainRef = useRef<GainNode | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // --- Metronome Logic ---
  const playClick = (time: number, sound: MetronomeSound, volume: number, isAccent: boolean) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Accents are full volume (1.0), non-accented beats are softer (0.30 amplitude)
    const amplitude = isAccent ? 1.0 : 0.30;
    const startVol = Math.max(0.0001, volume * amplitude);
    const masterGain = ctx.createGain();

    masterGain.connect(ctx.destination);

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
        break;
      }
      case MetronomeSound.HiHat: {
        const bufferSize = Math.floor(ctx.sampleRate * clickDuration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(isAccent ? 8500 : 5500, time);
        
        noise.connect(filter);
        filter.connect(masterGain);
        noise.start(time);
        break;
      }
      case MetronomeSound.Clap: {
        const bufferSize = Math.floor(ctx.sampleRate * clickDuration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(isAccent ? 1200 : 800, time);
        filter.Q.setValueAtTime(1.2, time);

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start(time);
        break;
      }
      case MetronomeSound.Snare: {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isAccent ? 220 : 150, time);
        osc.frequency.exponentialRampToValueAtTime(70, time + 0.06);

        const bufferSize = Math.floor(ctx.sampleRate * clickDuration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(isAccent ? 1800 : 1100, time);

        osc.connect(masterGain);
        noise.connect(noiseFilter);
        noiseFilter.connect(masterGain);

        osc.start(time);
        osc.stop(time + clickDuration);
        noise.start(time);
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
        break;
      }
      default: {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isAccent ? 1200 : 750, time);
        osc.connect(masterGain);
        osc.start(time);
        osc.stop(time + clickDuration);
      }
    }
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
      
      let startIndex = 0;
      if (is12Beat) {
        if (voiceSubdivision === 2 && length === 24) {
          startIndex = ((startBeat - 1) * 2 + 24) % 24;
        } else if (voiceSubdivision === 3 && length === 36) {
          startIndex = ((startBeat - 1) * 3 + 36) % 36;
        } else if (length === 12) {
          startIndex = ((startBeat - 1) + 12) % 12;
        } else {
          startIndex = ((startBeat - 1) + length) % length;
        }
      } else {
        startIndex = ((startBeat - 1) * voiceSubdivision + length) % length;
      }

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
    const { osc1, osc2, lfo, lfoGain, gain } = nodes;

    try {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.2);
      
      droneNodesRef.current.delete(note);
      setActiveDrones(prev => {
        const next = { ...prev };
        delete next[note];
        return next;
      });

      setTimeout(() => {
        try {
          const stopTime = ctx.currentTime;
          osc1.stop(stopTime); osc2.stop(stopTime); lfo?.stop(stopTime);
          osc1.disconnect(); osc2.disconnect(); lfo?.disconnect(); lfoGain?.disconnect(); gain.disconnect();
        } catch (e) {}
      }, 250);
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
    
    // Main volume gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(volume * 0.35, ctx.currentTime + 0.3);
    
    // Filter for richness
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.Q.setValueAtTime(1, ctx.currentTime);
    
    masterGain.connect(filter);
    filter.connect(ctx.destination);

    // Modulation gain (for pulse)
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(1, ctx.currentTime);
    modGain.connect(masterGain);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator(); // Extra harmonic
    
    switch (tone) {
      case DroneTone.Strings:
        osc1.type = 'sine'; osc2.type = 'triangle'; osc3.type = 'sine';
        osc2.detune.setValueAtTime(4, ctx.currentTime);
        osc3.frequency.setValueAtTime(freq * 2, ctx.currentTime);
        filter.frequency.setValueAtTime(3000, ctx.currentTime);
        break;
      case DroneTone.Cello:
        osc1.type = 'sawtooth'; osc2.type = 'sine'; osc3.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq / 2, ctx.currentTime);
        osc1.detune.setValueAtTime(2, ctx.currentTime);
        osc3.frequency.setValueAtTime(freq, ctx.currentTime);
        osc3.detune.setValueAtTime(-2, ctx.currentTime);
        filter.frequency.setValueAtTime(1200, ctx.currentTime);
        break;
      default:
        osc1.type = 'sine'; osc2.type = 'sine'; osc3.type = 'sine';
    }
    
    osc1.frequency.setValueAtTime(freq, ctx.currentTime);
    osc2.frequency.setValueAtTime(freq, ctx.currentTime);
    
    osc1.connect(modGain);
    osc2.connect(modGain);
    osc3.connect(modGain);
    const now = ctx.currentTime;
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    let lfo: OscillatorNode | undefined;
    let lfoGain: GainNode | undefined;

    if (pulseBpm > 0) {
      lfo = ctx.createOscillator();
      lfoGain = ctx.createGain();
      const lfoFreq = pulseBpm / 60;
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(lfoFreq, now);
      lfoGain.gain.setValueAtTime(0, now);
      lfoGain.gain.linearRampToValueAtTime(0.3, now + 0.3); 
      lfo.connect(lfoGain);
      lfoGain.connect(modGain.gain);
      lfo.start(now);
    }

    droneNodesRef.current.set(noteWithOctave, { 
      osc1, osc2, lfo, lfoGain, gain: masterGain, modGain 
    });

    setActiveDrones(prev => ({
      ...prev,
      [noteWithOctave]: { tone, volume, pulseBpm }
    }));
  };

  useEffect(() => {
    if (isDronePlaying) {
      userDroneNotes.forEach(note => {
        if (!droneNodesRef.current.has(note)) {
          startDroneAudio(note, droneTone, droneVolume, dronePulseBpm);
        }
      });
      // Cleanup any nodes that are no longer in userDroneNotes
      const currentNodes = Array.from(droneNodesRef.current.keys());
      currentNodes.forEach(note => {
        if (!userDroneNotes.includes(note)) {
          stopDroneAudio(note);
        }
      });
    } else {
      stopAllDrones();
    }
  }, [isDronePlaying, userDroneNotes, stopAllDrones]);

  // Real-time parameter updates (Volume, Pulse, Tone)
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    
    droneNodesRef.current.forEach((nodes, note) => {
      // Update Volume
      nodes.gain.gain.setTargetAtTime(droneVolume * 0.4, ctx.currentTime, 0.05);

      // Update Pulse BPM (LFO)
      if (dronePulseBpm > 0) {
        if (!nodes.lfo || !nodes.lfoGain) {
          // Create LFO if it doesn't exist
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
          // Update existing LFO
          nodes.lfo.frequency.setTargetAtTime(dronePulseBpm / 60, ctx.currentTime, 0.05);
        }
      } else if (nodes.lfo && nodes.lfoGain) {
        // Fade out and stop LFO
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

      // Update Tone (Oscillator types and scaling)
      const noteMatch = note.match(/^([A-G]#?)(\d)$/);
      if (noteMatch) {
        const [, name, octaveStr] = noteMatch;
        const octave = parseInt(octaveStr);
        const noteIndex = NOTES.indexOf(name);
        const midiNote = (octave + 1) * 12 + noteIndex;
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

        switch (droneTone) {
          case DroneTone.Strings:
            nodes.osc1.type = 'sine'; nodes.osc2.type = 'triangle';
            nodes.osc1.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
            nodes.osc2.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
            nodes.osc2.detune.setTargetAtTime(2, ctx.currentTime, 0.05);
            nodes.osc1.detune.setTargetAtTime(0, ctx.currentTime, 0.05);
            break;
          case DroneTone.Cello:
            nodes.osc1.type = 'sawtooth'; nodes.osc2.type = 'sine';
            nodes.osc1.frequency.setTargetAtTime(freq / 2, ctx.currentTime, 0.05);
            nodes.osc2.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
            nodes.osc1.detune.setTargetAtTime(1, ctx.currentTime, 0.05);
            nodes.osc2.detune.setTargetAtTime(0, ctx.currentTime, 0.05);
            break;
          default:
            nodes.osc1.type = 'sine'; nodes.osc2.type = 'sine';
            nodes.osc1.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
            nodes.osc2.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
            nodes.osc1.detune.setTargetAtTime(0, ctx.currentTime, 0.05);
            nodes.osc2.detune.setTargetAtTime(0, ctx.currentTime, 0.05);
        }
      }
    });
  }, [droneVolume, dronePulseBpm, droneTone]);

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
    gain.connect(ctx.destination);
    osc.start();
    refOscRef.current = osc;
    refGainRef.current = gain;
    setPlayingRefNote(noteName);
  };

  // --- Chord Logic ---
  const applyTone = (osc: OscillatorNode, gain: GainNode, instrument: InstrumentType, freq: number, now: number, duration: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    switch (instrument) {
      case InstrumentType.Piano: {
        // Piano: Additive synthesis with fast attack and natural decay
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        
        // Harmonics
        const harmonics = [2, 3, 4];
        harmonics.forEach((h, idx) => {
          const hOsc = ctx.createOscillator();
          const hGain = ctx.createGain();
          hOsc.type = idx === 0 ? 'sine' : 'triangle';
          hOsc.frequency.setValueAtTime(freq * h, now);
          hGain.gain.setValueAtTime(0.0001, now);
          hGain.gain.linearRampToValueAtTime(0.05 / (idx + 1), now + 0.01);
          hGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * (0.8 / (idx + 1)));
          hOsc.connect(hGain);
          hGain.connect(gain);
          hOsc.start(now);
          hOsc.stop(now + duration);
        });
        break;
      }

      case InstrumentType.Organ: {
        // Organ: Stationary tones with multiple drawbars
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain.gain.linearRampToValueAtTime(0.1, now + duration - 0.1);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        const drawbars = [0.5, 1.5, 2, 3];
        drawbars.forEach(d => {
          const dOsc = ctx.createOscillator();
          const dGain = ctx.createGain();
          dOsc.type = 'sine';
          dOsc.frequency.setValueAtTime(freq * d, now);
          dGain.gain.setValueAtTime(0, now);
          dGain.gain.linearRampToValueAtTime(0.04, now + 0.05);
          dGain.gain.linearRampToValueAtTime(0, now + duration);
          dOsc.connect(dGain);
          dGain.connect(gain);
          dOsc.start(now);
          dOsc.stop(now + duration);
        });
        break;
      }

      case InstrumentType.Strings: {
        // Strings: Detuned oscillators with slow attack
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.25);
        gain.gain.linearRampToValueAtTime(0.06, now + duration - 0.25);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        osc.detune.setValueAtTime(6, now);

        const ensemble = [1, 2];
        ensemble.forEach(detune => {
          const sOsc = ctx.createOscillator();
          const sGain = ctx.createGain();
          sOsc.type = 'sawtooth';
          sOsc.frequency.setValueAtTime(freq, now);
          sOsc.detune.setValueAtTime(detune * 4, now);
          sGain.gain.setValueAtTime(0, now);
          sGain.gain.linearRampToValueAtTime(0.04, now + 0.3);
          sGain.gain.linearRampToValueAtTime(0, now + duration);
          sOsc.connect(sGain);
          sGain.connect(gain);
          sOsc.start(now);
          sOsc.stop(now + duration);
        });
        break;
      }

      case InstrumentType.Guitar: {
        // Guitar: Plucked triangle with high harmonic
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.8);
        
        const overtone = ctx.createOscillator();
        const oGain = ctx.createGain();
        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(freq * 3, now);
        oGain.gain.setValueAtTime(0.0001, now);
        oGain.gain.linearRampToValueAtTime(0.05, now + 0.01);
        oGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.2);
        overtone.connect(oGain);
        oGain.connect(gain);
        overtone.start(now);
        overtone.stop(now + duration);
        break;
      }

      case InstrumentType.Bass: {
        // Bass: Deep sine with sub-harmonic and slight "fret" noise
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(freq * 0.5, now);
        subGain.gain.setValueAtTime(0.0001, now);
        subGain.gain.linearRampToValueAtTime(0.2, now + 0.02);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.5);
        sub.connect(subGain);
        subGain.connect(gain);
        sub.start(now);
        sub.stop(now + duration);

        const click = ctx.createOscillator();
        const clickGain = ctx.createGain();
        click.type = 'square';
        click.frequency.setValueAtTime(800, now);
        clickGain.gain.setValueAtTime(0.02, now);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.01);
        click.connect(clickGain);
        clickGain.connect(gain);
        click.start(now);
        click.stop(now + 0.01);
        break;
      }

      default:
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + duration);
    }
  };

  const playChord = (chord: string, instrument: InstrumentType = InstrumentType.Piano, volume: number = 1.0) => {
    const ctx = initAudio();
    const intervals = getIntervalsForChord(chord);
    if (!intervals) return;

    const rootFreq = 261.63; // C4
    const now = ctx.currentTime;
    const duration = 1.5;

    intervals.forEach(interval => {
      const freq = rootFreq * Math.pow(2, interval / 12);
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      const volumeGain = ctx.createGain();
      
      osc.frequency.setValueAtTime(freq, now);
      applyTone(osc, voiceGain, instrument, freq, now, duration);
      
      // Apply volume scaling via a dedicated gain node
      volumeGain.gain.setValueAtTime(volume, now);
      
      osc.connect(voiceGain);
      voiceGain.connect(volumeGain);
      volumeGain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + duration);
    });
  };

  // --- Note Logic ---
  const playNote = (interval: number, duration: number = 0.8, instrument: InstrumentType = InstrumentType.Piano, volume: number = 1.0) => {
    const ctx = initAudio();
    const rootFreq = 261.63; // C4
    const now = ctx.currentTime;
    const freq = rootFreq * Math.pow(2, interval / 12);
    
    const osc = ctx.createOscillator();
    const voiceGain = ctx.createGain();
    const volumeGain = ctx.createGain();
    
    osc.frequency.setValueAtTime(freq, now);
    applyTone(osc, voiceGain, instrument, freq, now, duration);
    
    // Apply volume scaling via a dedicated gain node
    volumeGain.gain.setValueAtTime(volume, now);
    
    osc.connect(voiceGain);
    voiceGain.connect(volumeGain);
    volumeGain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + duration);
  };

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
    playNote
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};
