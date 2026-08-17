/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as alphaTab from '@coderline/alphatab';
import * as Tone from 'tone';
import MidiPlayer from 'midi-player-js';
import { 
  Play, 
  Square, 
  Volume2, 
  Layers, 
  Sliders, 
  Music, 
  RotateCcw, 
  Printer, 
  Download,
  Gauge
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

const getAssetUrl = (path: string) => {
  const base = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(`${cleanBase}${cleanPath}`, window.location.href).href;
};

// Ensure alphaTab global detection has valid fallback paths
if (typeof window !== 'undefined') {
  (window as any).ALPHATAB_ROOT = getAssetUrl('alphatab/alphaTab.js');
  (window as any).ALPHATAB_FONT = getAssetUrl('alphatab/font/');
}

const generateMidiBuffer = (score: alphaTab.model.Score, settings: alphaTab.Settings): Uint8Array | null => {
  try {
    const midiFile = new alphaTab.midi.MidiFile();
    midiFile.format = alphaTab.midi.MidiFileFormat.MultiTrack;
    const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(midiFile, true);
    new alphaTab.midi.MidiFileGenerator(score, settings, handler).generate();
    return midiFile.toBinary();
  } catch (e) {
    console.warn('Error generating MultiTrack MIDI from alphaTab score, falling back to SingleTrack:', e);
    try {
      const midiFile = new alphaTab.midi.MidiFile();
      midiFile.format = alphaTab.midi.MidiFileFormat.SingleTrackMultiChannel;
      const handler = new alphaTab.midi.AlphaSynthMidiFileHandler(midiFile, true);
      new alphaTab.midi.MidiFileGenerator(score, settings, handler).generate();
      return midiFile.toBinary();
    } catch (e2) {
      console.warn('Error generating MIDI fallback:', e2);
      return null;
    }
  }
};

interface GuitarProRendererProps {
  data: string | ArrayBuffer | Uint8Array;
  zoom?: number;
  scoreTitle?: string;
  onExportMidi?: () => void;
  onMidiReady?: (midiUrl: string, midiName: string) => void;
}

interface TrackInfo {
  index: number;
  name: string;
  shortName?: string;
  tuning?: string[];
  volume: number;
  isMute: boolean;
  isSolo: boolean;
}

function formatDuration(millis: number): string {
  if (!millis || isNaN(millis) || millis < 0) return '0:00';
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function fixMidiBuffer(buffer: ArrayBuffer): ArrayBuffer {
  try {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 14 || bytes[0] !== 0x4d || bytes[1] !== 0x54 || bytes[2] !== 0x68 || bytes[3] !== 0x64) {
      return buffer;
    }

    const chunks: Uint8Array[] = [];
    let pos = 0;

    // Header chunk
    const headerLen = 8 + ((bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7]);
    if (headerLen > bytes.length) return buffer;
    chunks.push(bytes.subarray(0, headerLen));
    pos = headerLen;

    while (pos < bytes.length) {
      if (pos + 8 > bytes.length) break;
      // Check for MTrk
      if (bytes[pos] === 0x4d && bytes[pos+1] === 0x54 && bytes[pos+2] === 0x72 && bytes[pos+3] === 0x6b) {
        const trackLen = ((bytes[pos+4] << 24) >>> 0) + (bytes[pos+5] << 16) + (bytes[pos+6] << 8) + bytes[pos+7];
        let trackDataEnd = pos + 8 + trackLen;
        if (trackDataEnd > bytes.length) {
          trackDataEnd = bytes.length;
        }
        const trackData = Array.from(bytes.subarray(pos + 8, trackDataEnd));

        const len = trackData.length;
        const endsWithEndTrack = len >= 3 && trackData[len - 3] === 0xff && trackData[len - 2] === 0x2f && trackData[len - 1] === 0x00;

        if (!endsWithEndTrack) {
          trackData.push(0x00, 0xff, 0x2f, 0x00);
        }

        const newTrackLen = trackData.length;
        const trackHeader = new Uint8Array([
          0x4d, 0x54, 0x72, 0x6b,
          (newTrackLen >>> 24) & 0xff,
          (newTrackLen >>> 16) & 0xff,
          (newTrackLen >>> 8) & 0xff,
          newTrackLen & 0xff
        ]);
        chunks.push(trackHeader);
        chunks.push(new Uint8Array(trackData));

        pos = pos + 8 + trackLen;
      } else {
        pos++;
      }
    }

    const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
    const fixed = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      fixed.set(c, offset);
      offset += c.length;
    }
    return fixed.buffer;
  } catch (e) {
    console.warn('fixMidiBuffer error:', e);
    return buffer;
  }
}

export default function GuitarProRenderer({ 
  data, 
  zoom = 1,
  scoreTitle,
  onExportMidi,
  onMidiReady
}: GuitarProRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const { resolvedTheme } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [endTimeMs, setEndTimeMs] = useState<number>(0);

  // Stored refs for callbacks to prevent infinite re-render loops
  const onMidiReadyRef = useRef(onMidiReady);
  onMidiReadyRef.current = onMidiReady;
  const scoreTitleRef = useRef(scoreTitle);
  scoreTitleRef.current = scoreTitle;

  const createdBlobUrlRef = useRef<string | null>(null);
  const lastMidiDataRef = useRef<any>(null);

  // Audio Engine Refs
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const volNodeRef = useRef<Tone.Volume | null>(null);
  const midiPlayerRef = useRef<any>(null);
  const nativeTempoRef = useRef<number>(120);
  const playbackSpeedRef = useRef<number>(1.0);
  const isLoopingRef = useRef<boolean>(false);
  const masterVolumeRef = useRef<number>(1.0);
  const animFrameRef = useRef<number | null>(null);
  const trackSettingsRef = useRef<{ [trackIndex: number]: { muted: boolean; solo: boolean; volume: number } }>({});
  const channelToTrackMapRef = useRef<{ [channel: number]: number }>({});

  // Score & Track metadata
  const [songInfo, setSongInfo] = useState<{
    title: string;
    artist: string;
    album: string;
    tempo: number;
    tracks: TrackInfo[];
  }>({
    title: '',
    artist: '',
    album: '',
    tempo: 120,
    tracks: []
  });

  const [selectedTrackIndexes, setSelectedTrackIndexes] = useState<number[]>([0]);
  const [staveProfile, setStaveProfile] = useState<alphaTab.StaveProfile>(alphaTab.StaveProfile.Default);
  const [layoutMode, setLayoutMode] = useState<alphaTab.LayoutMode>(alphaTab.LayoutMode.Page);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const isMetronomeActiveRef = useRef<boolean>(false);
  const lastClickBeatRef = useRef<number>(-1);
  const timeSigNumeratorRef = useRef<number>(4);
  const [showMixer, setShowMixer] = useState<boolean>(false);

  useEffect(() => {
    isMetronomeActiveRef.current = isMetronomeActive;
  }, [isMetronomeActive]);

  // Crisp Woodblock Metronome Click Sound Generator
  const playClickSound = useCallback((isAccent: boolean) => {
    try {
      const rawCtx = (Tone.getContext().rawContext as AudioContext) || ((Tone.context as any)._context as AudioContext);
      if (!rawCtx) return;
      if (rawCtx.state === 'suspended') {
        rawCtx.resume();
      }

      const time = rawCtx.currentTime;
      const masterGain = rawCtx.createGain();
      const outputTarget = rawCtx.destination;
      masterGain.connect(outputTarget);

      const amplitude = isAccent ? 1.0 : 0.4;
      const baseVol = Math.max(0.0001, (masterVolumeRef.current || 1.0) * amplitude * 0.4);
      masterGain.gain.setValueAtTime(baseVol, time);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);

      const osc = rawCtx.createOscillator();
      const crack = rawCtx.createOscillator();
      const crackGain = rawCtx.createGain();

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
      osc.stop(time + 0.08);
      crack.start(time);
      crack.stop(time + 0.012);
    } catch (err) {
      console.warn('Click sound playback error:', err);
    }
  }, []);

  // Synchronize state to refs
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    if (midiPlayerRef.current) {
      if (typeof midiPlayerRef.current.isPlaying === 'function' && midiPlayerRef.current.isPlaying()) {
        const currentTick = midiPlayerRef.current.getCurrentTick();
        midiPlayerRef.current.startTick = currentTick;
        midiPlayerRef.current.startTime = Date.now();
        midiPlayerRef.current.scheduledTime = Date.now();
      }
      midiPlayerRef.current.speedRate = playbackSpeed;
      if (nativeTempoRef.current) {
        midiPlayerRef.current.tempo = nativeTempoRef.current * playbackSpeed;
      }
    }
    if (apiRef.current) {
      try {
        apiRef.current.playbackSpeed = playbackSpeed;
      } catch {}
    }
  }, [playbackSpeed]);

  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    masterVolumeRef.current = masterVolume;
    if (volNodeRef.current) {
      volNodeRef.current.volume.value = Tone.gainToDb(Math.max(0.0001, masterVolume));
    }
  }, [masterVolume]);

  // Audio Engine Lifecycle
  const loadMidiIntoAudioEngine = useCallback((sanitizedBuffer: ArrayBuffer, scoreTempo?: number) => {
    try {
      if (!isMountedRef.current) return;

      if (!synthRef.current) {
        const vol = new Tone.Volume(Tone.gainToDb(Math.max(0.0001, masterVolumeRef.current))).toDestination();
        const synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.35 }
        }).connect(vol);
        synth.maxPolyphony = 32;
        volNodeRef.current = vol;
        synthRef.current = synth;
      }

      if (midiPlayerRef.current) {
        try {
          midiPlayerRef.current.stop();
        } catch {}
      }

      const player = new (MidiPlayer as any).Player((event: any) => {
        try {
          if (!isMountedRef.current) return;

          if (event.name === 'Note on') {
            let trackIdx = 0;
            if (typeof event.channel === 'number' && channelToTrackMapRef.current[event.channel] !== undefined) {
              trackIdx = channelToTrackMapRef.current[event.channel];
            } else if (typeof event.track === 'number') {
              if (event.track > 1 && trackSettingsRef.current[event.track - 2] !== undefined) {
                trackIdx = event.track - 2;
              } else if (trackSettingsRef.current[event.track - 1] !== undefined) {
                trackIdx = event.track - 1;
              }
            }

            const trackInfo = trackSettingsRef.current[trackIdx];
            const anySolo = (Object.values(trackSettingsRef.current) as Array<{ muted: boolean; solo: boolean; volume: number }>).some(t => t.solo);
            
            if (trackInfo?.muted) return;
            if (anySolo && !trackInfo?.solo) return;

            const trackVol = typeof trackInfo?.volume === 'number' ? trackInfo.volume : 1;
            if (trackVol <= 0.001) return;

            const velocity = Math.min(1, Math.max(0.05, ((event.velocity || 80) / 127) * trackVol));
            
            if (typeof event.noteNumber === 'number' && event.noteNumber >= 0 && event.noteNumber <= 127) {
              if (event.velocity > 0) {
                const noteName = Tone.Frequency(event.noteNumber, 'midi').toNote();
                synthRef.current?.triggerAttack(noteName, undefined, velocity);
              } else {
                const noteName = Tone.Frequency(event.noteNumber, 'midi').toNote();
                synthRef.current?.triggerRelease(noteName);
              }
            }
          } else if (event.name === 'Note off') {
            if (typeof event.noteNumber === 'number' && event.noteNumber >= 0 && event.noteNumber <= 127) {
              const noteName = Tone.Frequency(event.noteNumber, 'midi').toNote();
              synthRef.current?.triggerRelease(noteName);
            }
          } else if (event.name === 'Set Tempo') {
            const bpm = event.data || event.tempo || 120;
            nativeTempoRef.current = bpm;
            if (midiPlayerRef.current) {
              midiPlayerRef.current.tempo = bpm * (playbackSpeedRef.current || 1.0);
            }
          } else if (event.name === 'Time Signature') {
            if (event.param1) {
              timeSigNumeratorRef.current = event.param1;
            }
          }
        } catch (err) {
          console.warn('GuitarPro audio player event error:', err);
        }
      });

      player.speedRate = playbackSpeedRef.current || 1.0;
      player.getCurrentTick = function () {
        if (!this.startTime) return this.startTick;
        const elapsedSeconds = ((Date.now() - this.startTime) / 1000) * (this.speedRate || 1.0);
        const startSeconds = this.ticksToSeconds(0, this.startTick);
        return this.secondsToTicks(startSeconds + elapsedSeconds);
      };

      player.on('endOfFile', () => {
        if (!isMountedRef.current) return;
        synthRef.current?.releaseAll();
        if (isLoopingRef.current) {
          player.stop();
          player.speedRate = playbackSpeedRef.current || 1.0;
          player.tempo = (nativeTempoRef.current || 120) * playbackSpeedRef.current;
          player.play();
          setCurrentTimeMs(0);
        } else {
          setIsPlaying(false);
          setCurrentTimeMs(0);
          player.stop();
          if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
          }
          if (apiRef.current) {
            try { apiRef.current.timePosition = 0; } catch {}
          }
        }
      });

      player.loadArrayBuffer(sanitizedBuffer);
      if (scoreTempo) {
        nativeTempoRef.current = scoreTempo;
        player.tempo = scoreTempo * playbackSpeedRef.current;
      }

      const durationSec = player.getSongTime() || 0;
      const durationMs = durationSec * 1000;
      if (durationMs > 0 && isMountedRef.current) {
        setEndTimeMs(durationMs);
      }
      midiPlayerRef.current = player;
    } catch (err) {
      console.error('Failed to load MIDI into Guitar Pro Audio Engine:', err);
    }
  }, []);

  const startCursorSync = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const tick = () => {
      if (!isMountedRef.current) return;

      if (midiPlayerRef.current && midiPlayerRef.current.isPlaying()) {
        const totalTicks = midiPlayerRef.current.totalTicks || 1;
        const currentTick = midiPlayerRef.current.getCurrentTick() || 0;
        const percent = Math.min(1, Math.max(0, currentTick / totalTicks));
        const songDuration = (midiPlayerRef.current.getSongTime() || 0) * 1000;
        const currentMs = percent * (songDuration || endTimeMs || 1);

        setCurrentTimeMs(currentMs);

        if (apiRef.current) {
          try {
            apiRef.current.timePosition = currentMs;
          } catch {}
        }

        // Metronome Click Engine during MIDI playback
        if (isMetronomeActiveRef.current) {
          const division = midiPlayerRef.current.division || 384;
          const beatNumber = Math.floor(currentTick / division);
          if (beatNumber !== lastClickBeatRef.current && beatNumber >= 0) {
            lastClickBeatRef.current = beatNumber;
            const beatsPerMeasure = timeSigNumeratorRef.current || 4;
            const isAccent = (beatNumber % beatsPerMeasure) === 0;
            playClickSound(isAccent);
          }
        }

        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [endTimeMs, playClickSound]);

  // Main Initialize and load score into AlphaTab - ONLY triggers when data actually changes
  useEffect(() => {
    isMountedRef.current = true;
    if (!containerRef.current) return;

    setIsLoading(true);
    setError(null);
    setCurrentTimeMs(0);
    setEndTimeMs(0);

    // Cancel pending animation frames
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Stop and release previous audio playback
    if (midiPlayerRef.current) {
      try { midiPlayerRef.current.stop(); } catch {}
    }
    synthRef.current?.releaseAll();
    setIsPlaying(false);

    // Safely destroy existing AlphaTab instance
    if (apiRef.current) {
      try {
        apiRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying existing AlphaTab instance:', e);
      }
      apiRef.current = null;
    }

    // Clear previous DOM contents safely
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    let isEffectActive = true;

    try {
      const scriptFile = getAssetUrl('alphatab/alphaTab.js');
      const fontDir = getAssetUrl('alphatab/font/');
      const soundFontUrl = getAssetUrl('alphatab/soundfont/sonivox.sf2');

      const settings: alphaTab.Settings = new alphaTab.Settings();
      settings.core.scriptFile = scriptFile;
      settings.core.fontDirectory = fontDir;
      settings.core.useWorkers = false;

      settings.display.scale = zoom;
      settings.display.layoutMode = layoutMode;
      settings.display.staveProfile = staveProfile;

      settings.player.enablePlayer = true;
      settings.player.enableCursor = true;
      settings.player.enableUserInteraction = true;
      settings.player.soundFont = soundFontUrl;
      settings.player.outputMode = alphaTab.PlayerOutputMode.WebAudioScriptProcessor;
      if (viewportRef.current) {
        settings.player.scrollElement = viewportRef.current;
      }
      settings.notation.rhythmMode = alphaTab.TabRhythmMode.Automatic;

      const api = new alphaTab.AlphaTabApi(containerRef.current, settings);
      apiRef.current = api;

      // Event Listeners
      api.scoreLoaded.on((score) => {
        if (!isEffectActive || !isMountedRef.current) return;
        setIsLoading(false);
        setError(null);

        timeSigNumeratorRef.current = score.masterBars?.[0]?.timeSignatureNumerator || 4;
        lastClickBeatRef.current = -1;

        const tracks: TrackInfo[] = score.tracks.map((t) => ({
          index: t.index,
          name: t.name || `Track ${t.index + 1}`,
          shortName: t.shortName,
          tuning: t.staves[0]?.stringTuning ? Array.from(t.staves[0].stringTuning.tunings).map(n => String(n)) : [],
          volume: t.playbackInfo ? t.playbackInfo.volume / 16 : 1,
          isMute: t.playbackInfo ? t.playbackInfo.isMute : false,
          isSolo: t.playbackInfo ? t.playbackInfo.isSolo : false,
        }));

        const chMap: { [channel: number]: number } = {};
        tracks.forEach(t => {
          trackSettingsRef.current[t.index] = {
            muted: t.isMute,
            solo: t.isSolo,
            volume: t.volume
          };
          const atTrack = score.tracks[t.index];
          if (atTrack?.playbackInfo) {
            chMap[atTrack.playbackInfo.primaryChannel] = t.index;
            chMap[atTrack.playbackInfo.secondaryChannel] = t.index;
            chMap[atTrack.playbackInfo.primaryChannel + 1] = t.index;
            chMap[atTrack.playbackInfo.secondaryChannel + 1] = t.index;
          }
        });
        channelToTrackMapRef.current = chMap;

        setSongInfo({
          title: score.title || scoreTitleRef.current || 'Guitar Pro Score',
          artist: score.artist || '',
          album: score.album || '',
          tempo: score.tempo || 120,
          tracks
        });

        if (tracks.length > 0 && selectedTrackIndexes.length === 0) {
          setSelectedTrackIndexes([0]);
        }
      });

      api.midiLoaded.on((e) => {
        if (!isEffectActive || !isMountedRef.current) return;
        if (e && typeof e.endTime === 'number' && e.endTime > 0) {
          setEndTimeMs(e.endTime);
        }
      });

      api.renderStarted.on(() => {
        if (isEffectActive && isMountedRef.current) {
          setIsLoading(true);
        }
      });

      api.renderFinished.on(() => {
        if (!isEffectActive || !isMountedRef.current) return;
        setIsLoading(false);

        // Only generate and broadcast MIDI once per score data to avoid flashing/infinite loops
        if (lastMidiDataRef.current !== data) {
          lastMidiDataRef.current = data;
          try {
            if (api.score) {
              const midiBytes = generateMidiBuffer(api.score, api.settings);
              if (midiBytes && midiBytes.length > 0) {
                const buffer = midiBytes.buffer.slice(midiBytes.byteOffset, midiBytes.byteOffset + midiBytes.byteLength);
                const sanitized = fixMidiBuffer(buffer);
                loadMidiIntoAudioEngine(sanitized, api.score.tempo || 120);

                const blob = new Blob([sanitized], { type: 'audio/midi' });
                const midiUrl = URL.createObjectURL(blob);
                createdBlobUrlRef.current = midiUrl;
                onMidiReadyRef.current?.(midiUrl, `${api.score.title || scoreTitleRef.current || 'score'}.mid`);
              }
            }
          } catch (err) {
            console.warn('Error generating MIDI for audio engine:', err);
          }
        }
      });

      api.beatMouseDown.on((beat) => {
        if (!isEffectActive || !isMountedRef.current) return;
        if (beat && typeof (beat as any).playbackStart === 'number' && !isNaN((beat as any).playbackStart)) {
          handleSeek((beat as any).playbackStart);
        }
      });

      api.error.on((err) => {
        console.error('AlphaTab error event:', err);
        if (isEffectActive && isMountedRef.current) {
          setError(err?.message || 'Error rendering Guitar Pro score.');
          setIsLoading(false);
        }
      });

      // Load score data
      if (typeof data === 'string') {
        if (data.startsWith('\\') || data.includes('\\title') || data.includes('\\tempo') || data.includes('\\track')) {
          api.tex(data);
        } else {
          api.load(data);
        }
      } else {
        api.load(data);
      }

    } catch (err) {
      console.error('Failed to initialize AlphaTab:', err);
      if (isEffectActive && isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to render Guitar Pro score.');
        setIsLoading(false);
      }
    }

    return () => {
      isEffectActive = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (midiPlayerRef.current) {
        try { midiPlayerRef.current.stop(); } catch {}
      }
      synthRef.current?.releaseAll();
      if (apiRef.current) {
        try {
          apiRef.current.destroy();
        } catch (e) {
          console.warn('Error during AlphaTab cleanup:', e);
        }
        apiRef.current = null;
      }
    };
  }, [data, loadMidiIntoAudioEngine]);

  // Global Tone & Animation cleanup on component unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (midiPlayerRef.current) {
        try { midiPlayerRef.current.stop(); } catch {}
        midiPlayerRef.current = null;
      }
      if (synthRef.current) {
        try { 
          synthRef.current.releaseAll();
          synthRef.current.dispose(); 
        } catch {}
        synthRef.current = null;
      }
      if (volNodeRef.current) {
        try { volNodeRef.current.dispose(); } catch {}
        volNodeRef.current = null;
      }
      if (apiRef.current) {
        try {
          apiRef.current.pause();
          apiRef.current.destroy();
        } catch (e) {
          console.warn('Error during AlphaTab cleanup on unmount:', e);
        }
        apiRef.current = null;
      }
      createdBlobUrlRef.current = null;
    };
  }, []);

  // Update zoom when zoom prop changes without destroying AlphaTab
  useEffect(() => {
    if (apiRef.current && apiRef.current.settings && apiRef.current.settings.display.scale !== zoom) {
      try {
        apiRef.current.settings.display.scale = zoom;
        apiRef.current.updateSettings();
        apiRef.current.render();
      } catch (err) {
        console.warn('Failed to update AlphaTab zoom:', err);
      }
    }
  }, [zoom]);

  // Update layout mode
  const handleLayoutModeChange = (mode: alphaTab.LayoutMode) => {
    setLayoutMode(mode);
    if (apiRef.current && apiRef.current.settings) {
      try {
        apiRef.current.settings.display.layoutMode = mode;
        apiRef.current.updateSettings();
        apiRef.current.render();
      } catch (err) {
        console.warn('Failed to update layout mode:', err);
      }
    }
  };

  // Update stave profile (Notation vs Tab)
  const handleStaveProfileChange = (profile: alphaTab.StaveProfile) => {
    setStaveProfile(profile);
    if (apiRef.current && apiRef.current.settings) {
      try {
        apiRef.current.settings.display.staveProfile = profile;
        apiRef.current.updateSettings();
        apiRef.current.render();
      } catch (err) {
        console.warn('Failed to update stave profile:', err);
      }
    }
  };

  // Track selection
  const handleTrackChange = (trackIndex: number) => {
    setSelectedTrackIndexes([trackIndex]);
    if (apiRef.current && apiRef.current.score) {
      try {
        const targetTrack = apiRef.current.score.tracks.find(t => t.index === trackIndex);
        if (targetTrack) {
          apiRef.current.renderTracks([targetTrack]);
        }
      } catch (err) {
        console.warn('Failed to change rendered track:', err);
      }
    }
  };

  // Play / Pause
  const togglePlayPause = async () => {
    try {
      await Tone.start();
      if (Tone.context.state === 'suspended') {
        await Tone.context.resume();
      }

      if (isPlaying) {
        if (midiPlayerRef.current) {
          try { midiPlayerRef.current.pause(); } catch {}
        }
        synthRef.current?.releaseAll();
        setIsPlaying(false);
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        try { apiRef.current?.pause(); } catch {}
      } else {
        if (midiPlayerRef.current) {
          const songDurationMs = (midiPlayerRef.current.getSongTime() || 0) * 1000;
          const maxDuration = songDurationMs > 0 ? songDurationMs : endTimeMs;
          if (maxDuration > 0 && currentTimeMs >= maxDuration - 100) {
            try {
              midiPlayerRef.current.stop();
              setCurrentTimeMs(0);
              if (apiRef.current) {
                try { apiRef.current.timePosition = 0; } catch {}
              }
            } catch {}
          }

          midiPlayerRef.current.speedRate = playbackSpeedRef.current || 1.0;
          midiPlayerRef.current.tempo = (nativeTempoRef.current || 120) * (playbackSpeedRef.current || 1.0);
          
          if (!midiPlayerRef.current.isPlaying()) {
            midiPlayerRef.current.play();
          }
          setIsPlaying(true);
          startCursorSync();
        } else {
          try {
            apiRef.current?.playPause();
          } catch (e) {
            console.error('Error in alphaTab playPause fallback:', e);
          }
        }
      }
    } catch (e) {
      console.error('Error toggling play/pause in Guitar Pro view:', e);
    }
  };

  // Seek position
  const handleSeek = (timeInMs: number) => {
    if (!isMountedRef.current) return;
    const safeTimeMs = Math.max(0, timeInMs);
    setCurrentTimeMs(safeTimeMs);
    const targetDuration = endTimeMs > 0 ? endTimeMs : ((midiPlayerRef.current?.getSongTime() || 0) * 1000);
    if (midiPlayerRef.current && targetDuration > 0) {
      const percent = Math.min(100, Math.max(0, (safeTimeMs / targetDuration) * 100));
      const wasPlaying = isPlaying;
      try {
        midiPlayerRef.current.speedRate = playbackSpeedRef.current || 1.0;
        midiPlayerRef.current.skipToPercent(percent);
        if (wasPlaying && !midiPlayerRef.current.isPlaying()) {
          midiPlayerRef.current.tempo = (nativeTempoRef.current || 120) * (playbackSpeedRef.current || 1.0);
          midiPlayerRef.current.play();
          startCursorSync();
        }
      } catch (e) {
        console.warn('Error skipping to percent in midi player:', e);
      }
    }
    if (apiRef.current) {
      try {
        apiRef.current.timePosition = safeTimeMs;
      } catch {}
    }
  };

  // Stop
  const handleStop = () => {
    try {
      if (midiPlayerRef.current) {
        try { midiPlayerRef.current.stop(); } catch {}
      }
      synthRef.current?.releaseAll();
      setIsPlaying(false);
      setCurrentTimeMs(0);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (apiRef.current) {
        try {
          apiRef.current.stop();
          apiRef.current.timePosition = 0;
        } catch {}
      }
    } catch (e) {
      console.error('Error stopping Guitar Pro playback:', e);
    }
  };

  // Playback speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    playbackSpeedRef.current = speed;
    if (midiPlayerRef.current) {
      if (typeof midiPlayerRef.current.isPlaying === 'function' && midiPlayerRef.current.isPlaying()) {
        const currentTick = midiPlayerRef.current.getCurrentTick();
        midiPlayerRef.current.startTick = currentTick;
        midiPlayerRef.current.startTime = Date.now();
        midiPlayerRef.current.scheduledTime = Date.now();
      }
      midiPlayerRef.current.speedRate = speed;
      if (nativeTempoRef.current) {
        midiPlayerRef.current.tempo = nativeTempoRef.current * speed;
      }
    }
    if (apiRef.current) {
      try {
        apiRef.current.playbackSpeed = speed;
      } catch {}
    }
  };

  // Master Volume
  const handleVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    if (volNodeRef.current) {
      volNodeRef.current.volume.value = Tone.gainToDb(Math.max(0.0001, vol));
    }
    if (apiRef.current) {
      try {
        apiRef.current.masterVolume = vol;
      } catch {}
    }
  };

  // Metronome
  const toggleMetronome = () => {
    const next = !isMetronomeActive;
    setIsMetronomeActive(next);
    isMetronomeActiveRef.current = next;
    lastClickBeatRef.current = -1;
    if (apiRef.current) {
      try {
        apiRef.current.metronomeVolume = next ? 0.7 : 0;
      } catch {}
    }
  };

  // Looping
  const toggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    if (apiRef.current) {
      try {
        apiRef.current.isLooping = next;
      } catch {}
    }
  };

  // Track Solo / Mute
  const handleTrackMute = (trackIndex: number) => {
    setSongInfo(prev => {
      const nextTracks = prev.tracks.map(t => t.index === trackIndex ? { ...t, isMute: !t.isMute } : t);
      const updated = nextTracks.find(t => t.index === trackIndex);
      if (updated) {
        trackSettingsRef.current[trackIndex] = {
          muted: updated.isMute,
          solo: updated.isSolo,
          volume: updated.volume
        };
      }
      return { ...prev, tracks: nextTracks };
    });
    if (apiRef.current?.score) {
      const track = apiRef.current.score.tracks.find(t => t.index === trackIndex);
      if (track) {
        try {
          apiRef.current.changeTrackMute([track], !track.playbackInfo?.isMute);
        } catch {}
      }
    }
  };

  const handleTrackSolo = (trackIndex: number) => {
    setSongInfo(prev => {
      const nextTracks = prev.tracks.map(t => t.index === trackIndex ? { ...t, isSolo: !t.isSolo } : t);
      const updated = nextTracks.find(t => t.index === trackIndex);
      if (updated) {
        trackSettingsRef.current[trackIndex] = {
          muted: updated.isMute,
          solo: updated.isSolo,
          volume: updated.volume
        };
      }
      return { ...prev, tracks: nextTracks };
    });
    if (apiRef.current?.score) {
      const track = apiRef.current.score.tracks.find(t => t.index === trackIndex);
      if (track) {
        try {
          apiRef.current.changeTrackSolo([track], !track.playbackInfo?.isSolo);
        } catch {}
      }
    }
  };

  // Track volume
  const handleTrackVolumeChange = (trackIndex: number, vol: number) => {
    setSongInfo(prev => {
      const nextTracks = prev.tracks.map(t => t.index === trackIndex ? { ...t, volume: vol } : t);
      const updated = nextTracks.find(t => t.index === trackIndex);
      if (updated) {
        trackSettingsRef.current[trackIndex] = {
          muted: updated.isMute,
          solo: updated.isSolo,
          volume: updated.volume
        };
      }
      return { ...prev, tracks: nextTracks };
    });
    if (apiRef.current?.score) {
      const track = apiRef.current.score.tracks.find(t => t.index === trackIndex);
      if (track) {
        try {
          apiRef.current.changeTrackVolume([track], vol);
        } catch {}
      }
    }
  };

  // Download MIDI
  const handleDownloadMidi = () => {
    if (apiRef.current) {
      try {
        apiRef.current.downloadMidi();
      } catch (e) {
        console.error('Error downloading MIDI:', e);
      }
    }
  };

  // Print score
  const handlePrint = () => {
    if (apiRef.current) {
      try {
        apiRef.current.print();
      } catch (e) {
        console.error('Error printing score:', e);
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Control & Playback Bar */}
      <div className={cn(
        "w-full rounded-2xl p-4 sm:p-5 border shadow-xl flex flex-col gap-3 transition-colors backdrop-blur-xl",
        resolvedTheme === 'dark' 
          ? "bg-[#16171a]/95 border-white/10 text-white" 
          : "bg-white/95 border-black/10 text-slate-900"
      )}>
        {/* Upper Row: Title, Artist, & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black uppercase tracking-tight truncate max-w-[280px] sm:max-w-md">
                {songInfo.title || scoreTitle || 'Guitar Pro Score'}
              </h2>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-60">
                {songInfo.artist && <span>{songInfo.artist}</span>}
                {songInfo.album && <span>• {songInfo.album}</span>}
                <span>• {songInfo.tempo} BPM</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Print */}
            <button
              onClick={handlePrint}
              className={cn(
                "p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95",
                resolvedTheme === 'dark' ? "border-white/10 hover:bg-white/10 text-white/70 hover:text-white" : "border-black/10 hover:bg-slate-100 text-slate-700"
              )}
              title="Print Score"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Print</span>
            </button>

            {/* MIDI Export */}
            <button
              onClick={handleDownloadMidi}
              className={cn(
                "p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95",
                resolvedTheme === 'dark' ? "border-white/10 hover:bg-white/10 text-orange-400 hover:text-orange-300" : "border-black/10 hover:bg-slate-100 text-orange-600"
              )}
              title="Export as MIDI"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">MIDI</span>
            </button>
          </div>
        </div>

        {/* Middle Row: Playback & Track selection */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          {/* Audio Engine Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className={cn(
                "px-4 py-2 rounded-xl flex items-center gap-2 font-black uppercase tracking-wider text-xs shadow-lg transition-all active:scale-95 cursor-pointer",
                isPlaying 
                  ? "bg-orange-500 text-white shadow-orange-500/30" 
                  : "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20"
              )}
              title={isPlaying ? "Pause Playback" : "Start Playback"}
            >
              {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={handleStop}
              className={cn(
                "p-2 rounded-xl border transition-all cursor-pointer",
                resolvedTheme === 'dark' ? "border-white/10 hover:bg-white/10 text-white/70" : "border-black/10 hover:bg-slate-100 text-slate-700"
              )}
              title="Stop Playback"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Loop button */}
            <button
              onClick={toggleLoop}
              className={cn(
                "p-2 rounded-xl border transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest flex items-center gap-1",
                isLooping
                  ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                  : (resolvedTheme === 'dark' ? "border-white/10 text-white/50 hover:text-white" : "border-black/10 text-slate-400 hover:text-slate-900")
              )}
              title="Toggle Looping"
            >
              Loop
            </button>

            {/* Metronome */}
            <button
              onClick={toggleMetronome}
              className={cn(
                "p-2 rounded-xl border transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest flex items-center gap-1",
                isMetronomeActive
                  ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                  : (resolvedTheme === 'dark' ? "border-white/10 text-white/50 hover:text-white" : "border-black/10 text-slate-400 hover:text-slate-900")
              )}
              title="Toggle Metronome Click"
            >
              Click
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
              <Gauge className="w-3 h-3 opacity-40 ml-1" />
              <select
                value={String(playbackSpeed)}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="bg-transparent text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer pr-1"
              >
                <option value="0.5" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>0.5x</option>
                <option value="0.75" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>0.75x</option>
                <option value="1" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>1.0x</option>
                <option value="1.25" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>1.25x</option>
                <option value="1.5" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>1.5x</option>
              </select>
            </div>

            {/* Master Volume */}
            <div className="hidden md:flex items-center gap-2 bg-black/5 dark:bg-white/5 px-2.5 py-1.5 rounded-xl">
              <Volume2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={masterVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                title="Master Volume"
              />
            </div>
          </div>

          {/* Track and Notation Profiles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Track Selector */}
            {songInfo.tracks.length > 0 && (
              <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-xl">
                <Layers className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Track:</span>
                <select
                  value={selectedTrackIndexes[0] ?? 0}
                  onChange={(e) => handleTrackChange(parseInt(e.target.value))}
                  className="bg-transparent text-xs font-bold outline-none cursor-pointer max-w-[160px] truncate"
                >
                  {songInfo.tracks.map((t) => (
                    <option 
                      key={t.index} 
                      value={t.index} 
                      className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}
                    >
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notation Stave Profile */}
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-40 px-1">View:</span>
              <select
                value={staveProfile}
                onChange={(e) => handleStaveProfileChange(parseInt(e.target.value) as alphaTab.StaveProfile)}
                className="bg-transparent text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer pr-1"
              >
                <option value={alphaTab.StaveProfile.Default} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>Default</option>
                <option value={alphaTab.StaveProfile.ScoreTab} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>Score + TAB</option>
                <option value={alphaTab.StaveProfile.Tab} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>TAB Only</option>
                <option value={alphaTab.StaveProfile.Score} className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>Score Only</option>
              </select>
            </div>

            {/* Mixer Toggle */}
            {songInfo.tracks.length > 1 && (
              <button
                onClick={() => setShowMixer(!showMixer)}
                className={cn(
                  "p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                  showMixer
                    ? "bg-orange-500 text-white border-orange-500"
                    : (resolvedTheme === 'dark' ? "border-white/10 hover:bg-white/10 text-white/70" : "border-black/10 hover:bg-slate-100 text-slate-700")
                )}
                title="Toggle Track Mixer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Mixer</span>
              </button>
            )}
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-[10px] font-mono tabular-nums opacity-60 shrink-0 w-10 text-left">
            {formatDuration(currentTimeMs)}
          </span>
          <div className="relative flex-1 flex items-center h-4 group">
            <input
              type="range"
              min="0"
              max={endTimeMs > 0 ? endTimeMs : 1000}
              value={currentTimeMs}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500 group-hover:h-2 transition-all"
            />
          </div>
          <span className="text-[10px] font-mono tabular-nums opacity-60 shrink-0 w-10 text-right">
            {formatDuration(endTimeMs)}
          </span>
        </div>

        {/* Multi-Track Mixer Panel */}
        {showMixer && songInfo.tracks.length > 0 && (
          <div className="mt-2 pt-3 border-t border-black/5 dark:border-white/10 flex flex-col gap-2">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-50">
              Track Mixer & Volume Controls
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {songInfo.tracks.map((track) => (
                <div 
                  key={track.index} 
                  className={cn(
                    "p-2.5 rounded-xl border flex flex-col gap-2 transition-all",
                    selectedTrackIndexes.includes(track.index)
                      ? "border-orange-500/40 bg-orange-500/5"
                      : (resolvedTheme === 'dark' ? "border-white/5 bg-white/5" : "border-black/5 bg-slate-50")
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold truncate max-w-[140px]" title={track.name}>
                      {track.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTrackMute(track.index)}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                          track.isMute 
                            ? "bg-red-500 text-white" 
                            : (resolvedTheme === 'dark' ? "bg-white/10 text-white/50" : "bg-black/5 text-slate-400")
                        )}
                        title="Mute Track"
                      >
                        M
                      </button>
                      <button
                        onClick={() => handleTrackSolo(track.index)}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                          track.isSolo 
                            ? "bg-amber-500 text-black" 
                            : (resolvedTheme === 'dark' ? "bg-white/10 text-white/50" : "bg-black/5 text-slate-400")
                        )}
                        title="Solo Track"
                      >
                        S
                      </button>
                    </div>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-3 h-3 opacity-40 shrink-0" />
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={track.volume}
                      onChange={(e) => handleTrackVolumeChange(track.index, parseFloat(e.target.value))}
                      className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <span className="text-[9px] font-mono tabular-nums opacity-60 w-6 text-right">
                      {Math.round(track.volume * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Score Display Container */}
      <div 
        ref={viewportRef}
        className={cn(
          "w-full rounded-2xl p-6 sm:p-10 shadow-2xl min-h-[500px] overflow-x-auto relative flex flex-col items-center justify-start transition-colors",
          resolvedTheme === 'dark' ? "bg-white text-black" : "bg-white text-black border border-black/5"
        )}
      >
        {/* Loading / Error States */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/80 dark:bg-black/60 backdrop-blur-sm rounded-2xl">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
              Rendering Guitar Pro Tab...
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold uppercase tracking-widest text-center">
            {error}
          </div>
        )}

        {/* AlphaTab Root Mount Target */}
        <div ref={containerRef} className="w-full flex flex-col items-center" />
      </div>
    </div>
  );
}
