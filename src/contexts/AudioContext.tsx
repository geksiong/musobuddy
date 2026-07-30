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

  const defaultPattern = DEFAULT_PRESETS.find(p => p.id === '4-4') || DEFAULT_PRESETS[0] || null;
  const [metronomeBpm, setMetronomeBpm] = useState(120);
  const [metronomePattern, _setMetronomePattern] = useState<BeatPattern | null>(defaultPattern);
  const metronomePatternRef = useRef<BeatPattern | null>(defaultPattern);
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
    masterGain.connect(ctx.destination);

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
