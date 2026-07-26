/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import MidiPlayer from 'midi-player-js';
import * as abcjs from 'abcjs';
import { 
  Play, 
  Square, 
  Pause, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Scissors,
  Music,
  Activity,
  Zap,
  MicOff,
  FastForward,
  Rewind,
  Gauge,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  PlusCircle,
  MinusCircle,
  Upload
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';

export interface AudioPlayerControls {
  isPlaying: boolean;
  togglePlay: () => void;
  stopPlayback: () => void;
  rewind: (seconds?: number) => void;
  volume: number;
  volumeUp: (step?: number) => void;
  volumeDown: (step?: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  currentTime: number;
  duration: number;
  formatTime: (time: number) => string;
  isLoaded: boolean;
  url?: string;
  filename?: string;
  seek: (time: number) => void;
  fullPlayerJSX?: React.ReactNode;
}

interface ScoreAudioPlayerProps {
  url?: string;
  filename?: string;
  resolvedTheme: string;
  onUploadRequested?: () => void;
  onFilesDropped?: (files: FileList) => void;
  onTimeUpdate?: (time: number) => void;
  renderTopBarControls?: (controls: AudioPlayerControls) => React.ReactNode;
}

export default function ScoreAudioPlayer({ 
  url, 
  filename, 
  resolvedTheme, 
  onUploadRequested,
  onFilesDropped,
  onTimeUpdate,
  renderTopBarControls
}: ScoreAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('audio_player_collapsed');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0); // dB
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(() => {
    const saved = localStorage.getItem('audio_player_rate');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [pitch, setPitch] = useState(() => {
    const saved = localStorage.getItem('audio_player_pitch');
    return saved !== null ? parseFloat(saved) : 0;
  });
  const [loopMode, setLoopMode] = useState(() => {
    const saved = localStorage.getItem('audio_player_loop');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);

  useEffect(() => { localStorage.setItem('audio_player_collapsed', JSON.stringify(isCollapsed)); }, [isCollapsed]);
  useEffect(() => { localStorage.setItem('audio_player_rate', playbackRate.toString()); }, [playbackRate]);
  useEffect(() => { localStorage.setItem('audio_player_pitch', pitch.toString()); }, [pitch]);
  useEffect(() => { localStorage.setItem('audio_player_loop', JSON.stringify(loopMode)); }, [loopMode]);
  const [vocalRemoved, setVocalRemoved] = useState(false);
  const [channels, setChannels] = useState<{ l: boolean; r: boolean }>({ l: true, r: true });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMidi, setIsMidi] = useState(false);
  const [midiChannels, setMidiChannels] = useState<{ [key: number]: { muted: boolean; program?: number; name?: string } }>({});

  const playerRef = useRef<Tone.Player | Tone.GrainPlayer | null>(null);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const midiPlayerRef = useRef<any>(null);
  const pitchShiftRef = useRef<Tone.PitchShift | null>(null);
  const analyserRef = useRef<Tone.Analyser | null>(null);
  const volumeRef = useRef<Tone.Volume | null>(null);
  const channelRef = useRef<Tone.Channel | null>(null);
  const vocalFadeRef = useRef<Tone.CrossFade | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const loopModeRef = useRef(loopMode);
  const playbackRateRef = useRef(playbackRate);
  const pitchRef = useRef(pitch);
  const volumeStateRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const channelsRef = useRef(channels);
  const vocalRemovedRef = useRef(vocalRemoved);
  const nativeTempoRef = useRef(120);
  const midiChannelsRef = useRef<{ [key: number]: { muted: boolean; program?: number; name?: string } }>({});

  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);
  useEffect(() => { pitchRef.current = pitch; }, [pitch]);
  useEffect(() => { volumeStateRef.current = volume; }, [volume]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { channelsRef.current = channels; }, [channels]);
  useEffect(() => { vocalRemovedRef.current = vocalRemoved; }, [vocalRemoved]);

  // Initialize Audio
  useEffect(() => {
    if (!url) {
      setIsLoaded(false);
      return;
    }

    setIsLoaded(false);
    setCurrentTime(0);
    setIsPlaying(false);

    const initAudio = async () => {
      try {
        await Tone.start();
        if (!url) return;
        
        setMidiChannels({});
        midiChannelsRef.current = {};
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch audio file');
        const arrayBuffer = await response.arrayBuffer();

        // Check magic bytes for MIDI: "MThd" -> [0x4D, 0x54, 0x68, 0x64]
        const uint8 = new Uint8Array(arrayBuffer);
        const isMidiBuffer = uint8.length >= 4 &&
          uint8[0] === 0x4d && uint8[1] === 0x54 && uint8[2] === 0x68 && uint8[3] === 0x64;
        
        const isMidiFile = isMidiBuffer || 
          filename?.toLowerCase().endsWith('.mid') || 
          filename?.toLowerCase().endsWith('.midi') || 
          url?.toLowerCase().includes('.mid') ||
          url?.toLowerCase().includes('midi');

        setIsMidi(!!isMidiFile);

        const pitchShift = new Tone.PitchShift({ pitch: pitchRef.current });
        const analyser = new Tone.Analyser('fft', 256);
        const vol = new Tone.Volume(isMutedRef.current ? -Infinity : volumeStateRef.current);
        const channel = new Tone.Channel();
        (channel as any).muteL = !channelsRef.current.l;
        (channel as any).muteR = !channelsRef.current.r;
        const vocalFade = new Tone.CrossFade(vocalRemovedRef.current ? 1 : 0);
        
        // Signal Flow for Vocal Removal (L - R)
        const splitter = new Tone.Split();
        const inverter = new Tone.Gain(-1);
        const monoSum = new Tone.Gain(1);

        pitchShift.connect(vocalFade.a);
        pitchShift.connect(splitter);
        splitter.connect(monoSum, 0, 0); 
        splitter.connect(inverter, 1, 0); 
        inverter.connect(monoSum, 0, 0); 
        
        monoSum.connect(vocalFade.b);
        
        vocalFade.chain(channel, vol, analyser, Tone.Destination);

        if (isMidiFile) {
          const polySynth = new Tone.PolySynth().connect(pitchShift);
          polySynth.set({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.05, release: 0.1 }
          });
          
          if (!MidiPlayer || !MidiPlayer.Player) {
            throw new Error('MidiPlayer not correctly loaded');
          }

          const player = new MidiPlayer.Player((event: any) => {
            try {
              if (event.name === 'Note on') {
                 if (event.velocity > 0 && !midiChannelsRef.current[event.channel]?.muted) {
                   polySynth.triggerAttack(Tone.Frequency(event.noteNumber, 'midi').toNote(), undefined, event.velocity / 127);
                 } else {
                   polySynth.triggerRelease(Tone.Frequency(event.noteNumber, 'midi').toNote());
                 }
              } else if (event.name === 'Note off') {
                 polySynth.triggerRelease(Tone.Frequency(event.noteNumber, 'midi').toNote());
              } else if (event.name === 'Program change') {
                 if (midiChannelsRef.current[event.channel]) {
                   midiChannelsRef.current[event.channel].program = event.value;
                   setMidiChannels({ ...midiChannelsRef.current });
                 }
              } else if (event.name === 'Set Tempo') {
                 if (event.tempo) {
                   nativeTempoRef.current = event.tempo;
                   setTimeout(() => {
                     if (midiPlayerRef.current) {
                        midiPlayerRef.current.tempo = nativeTempoRef.current * (playbackRateRef.current || 1);
                     }
                   }, 0);
                 }
              }
            } catch (err) {
              console.warn('MIDI Event Error:', err);
            }
          });

        player.on('endOfFile', () => {
          synthRef.current?.releaseAll();
          if ((abcjs as any).synth && (abcjs as any).synth.stopAllNotes) {
            (abcjs as any).synth.stopAllNotes();
          }
          if (loopModeRef.current) {
            player.stop();
            player.skipToPercent(0);
            player.tempo = nativeTempoRef.current * playbackRateRef.current;
            player.play();
          } else {
            setIsPlaying(false);
            setCurrentTime(0);
            onTimeUpdate?.(0);
            player.stop();
            player.skipToPercent(0);
          }
        });

        player.loadArrayBuffer(arrayBuffer);
        setDuration(player.getSongTime());
        setLoopEnd(player.getSongTime());

        // Proactively scan for channels
        const channelsFound: { [key: number]: any } = {};
        const events = player.getEvents();
        const processEvent = (event: any) => {
          if (event.channel && !channelsFound[event.channel]) {
            channelsFound[event.channel] = { muted: false };
          }
          if (event.name === 'Program change' && channelsFound[event.channel]) {
            channelsFound[event.channel].program = event.value;
          }
        };

        if (Array.isArray(events)) {
          events.forEach((item: any) => {
            if (Array.isArray(item)) {
              item.forEach(processEvent);
            } else {
              processEvent(item);
            }
          });
        }
        midiChannelsRef.current = channelsFound;
        setMidiChannels(channelsFound);
        
        synthRef.current = polySynth;
        midiPlayerRef.current = player;
        setIsLoaded(true);

        pitchShiftRef.current = pitchShift;
        analyserRef.current = analyser;
        volumeRef.current = vol;
        channelRef.current = channel;
        vocalFadeRef.current = vocalFade;
      } else {
        const player = new Tone.GrainPlayer({
          url: url,
          onload: () => {
            setDuration(player.buffer.duration);
            setLoopEnd(player.buffer.duration);
            setIsLoaded(true);
          },
          onerror: (e) => {
            console.error('GrainPlayer Error:', e);
          },
          loop: loopMode,
          grainSize: 0.1,
          overlap: 0.05
        });
        player.connect(pitchShift);
        playerRef.current = player;

        pitchShiftRef.current = pitchShift;
        analyserRef.current = analyser;
        volumeRef.current = vol;
        channelRef.current = channel;
        vocalFadeRef.current = vocalFade;
      }
    } catch (err) {
      console.error('Audio initialization error:', err);
    }
  };

    initAudio();

    return () => {
      midiPlayerRef.current?.stop();
      playerRef.current?.dispose();
      synthRef.current?.dispose();
      pitchShiftRef.current?.dispose();
      analyserRef.current?.dispose();
      volumeRef.current?.dispose();
      channelRef.current?.dispose();
      vocalFadeRef.current?.dispose();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [url, filename]);

  const togglePlay = async () => {
    if (Tone.context.state !== 'running') await Tone.start();

    if (isPlaying) {
      if (isMidi) {
        midiPlayerRef.current?.pause();
        synthRef.current?.releaseAll();
      }
      else {
        playerRef.current?.stop();
        (playerRef.current as any)._playbackStartTime = null;
      }
      setIsPlaying(false);
    } else {
      if (pitchShiftRef.current) {
        pitchShiftRef.current.pitch = pitch;
      }
      if (isMidi) {
        if (midiPlayerRef.current) {
          midiPlayerRef.current.tempo = nativeTempoRef.current * playbackRate;
          const currentTick = midiPlayerRef.current.getCurrentTick();
          const totalTicks = midiPlayerRef.current.totalTicks;
          if (currentTick >= totalTicks || currentTime >= duration - 0.05 || currentTime === 0) {
            midiPlayerRef.current.stop();
            midiPlayerRef.current.skipToPercent(0);
            setCurrentTime(0);
          }
          synthRef.current?.releaseAll();
          midiPlayerRef.current.play();
          setIsPlaying(true);
        }
      }
      else {
        if (currentTime >= duration - 0.05) {
          setCurrentTime(0);
          playerRef.current?.start(undefined, 0);
          (playerRef.current as any)._playbackStartTime = Tone.now();
        } else {
          playerRef.current?.start(undefined, currentTime);
          (playerRef.current as any)._playbackStartTime = Tone.now() - currentTime / playbackRate;
        }
        setIsPlaying(true);
      }
    }
  };

  const stopPlayback = () => {
    if (isMidi) {
      midiPlayerRef.current?.stop();
      midiPlayerRef.current?.skipToPercent(0);
      synthRef.current?.releaseAll();
    }
    else {
      playerRef.current?.stop();
      (playerRef.current as any)._playbackStartTime = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const seek = (time: number) => {
    const safeTime = Math.max(0, Math.min(time, duration));
    if (isMidi) {
      synthRef.current?.releaseAll();
      const wasPlaying = isPlaying;
      // midi-player-js doesn't seek easily in seconds, but we can try percentage
      const percent = (safeTime / duration) * 100;
      midiPlayerRef.current?.skipToPercent(percent);
      if (wasPlaying && !midiPlayerRef.current?.isPlaying()) {
        midiPlayerRef.current?.play();
      }
      setCurrentTime(safeTime);
    } else if (playerRef.current) {
      const wasPlaying = isPlaying;
      playerRef.current.stop();
      if (wasPlaying) {
        playerRef.current.start(undefined, safeTime);
        (playerRef.current as any)._playbackStartTime = Tone.now() - safeTime / playbackRate;
      }
      setCurrentTime(safeTime);
    }
  };

  // Playback Loop for UI
  useEffect(() => {
    const updateProgress = () => {
      if (isPlaying) {
        if (isMidi && midiPlayerRef.current) {
          const tick = midiPlayerRef.current.getCurrentTick();
          const totalTicks = midiPlayerRef.current.totalTicks;
          if (totalTicks > 0) {
            const time = (tick / totalTicks) * duration;
            // Handle sub-section looping for MIDI
            if (loopMode && time >= loopEnd) {
              const wasPlaying = isPlaying;
              seek(loopStart);
              if (wasPlaying && !midiPlayerRef.current?.isPlaying()) {
                midiPlayerRef.current?.play();
              }
            } else {
              setCurrentTime(time);
              onTimeUpdate?.(time);
            }
          }
        } else if (playerRef.current) {
          const startTime = (playerRef.current as any)._playbackStartTime;
          if (startTime) {
            let elapsed = (Tone.now() - startTime) * playbackRate;
            if (loopMode) {
              const loopLen = loopEnd - loopStart;
              if (elapsed >= loopEnd) {
                elapsed = loopStart + ((elapsed - loopStart) % loopLen);
              }
            }
            if (elapsed >= duration && !loopMode) {
              setIsPlaying(false);
              setCurrentTime(0);
              onTimeUpdate?.(0);
              playerRef.current?.stop();
              (playerRef.current as any)._playbackStartTime = null;
            } else {
              const time = Math.min(elapsed, duration);
              setCurrentTime(time);
              onTimeUpdate?.(time);
            }
          }
        }
      }
      
      // Visualization
      if (analyserRef.current) {
        const values = analyserRef.current.getValue() as Float32Array;
        
        const drawOnCanvas = (canvas: HTMLCanvasElement | null, opacity = 1) => {
          if (!canvas) return;
          const ctx = canvas.getContext('2d')!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const barCount = canvas === canvasRef.current ? 64 : 32;
          const barWidth = (canvas.width / barCount);
          
          for (let i = 0; i < barCount; i++) {
            const valIndex = Math.floor((i / barCount) * values.length);
            const db = values[valIndex];
            // Improve sensitivity for mini view and general scaling
            // Map db [-100, 0] to height [0, canvas.height]
            const normalizedHeight = Math.max(0.1, (db + 80) / 80); 
            const barHeight = normalizedHeight * canvas.height;
            
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, `rgba(249, 115, 22, ${opacity * 0.4})`);
            gradient.addColorStop(0.5, `rgba(249, 115, 22, ${opacity})`);
            gradient.addColorStop(1, `rgba(255, 170, 100, ${opacity * 0.8})`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(i * barWidth + 0.5, canvas.height - barHeight, barWidth - 1, barHeight, 2);
            ctx.fill();
          }
        };

        drawOnCanvas(canvasRef.current, 0.8);
        drawOnCanvas(miniCanvasRef.current, 0.5);
      }
      
      requestRef.current = requestAnimationFrame(updateProgress);
    };

    updateProgress();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, resolvedTheme, isMidi, duration, loopMode, loopStart, loopEnd]);

  // Handle loop jump
  useEffect(() => {
    if (isPlaying && !isMidi && playerRef.current && (playerRef.current as any)._playbackStartTime) {
      if (!loopMode) {
        // When turning off loop, adjust _playbackStartTime so that current elapsed time remains current
        (playerRef.current as any)._playbackStartTime = Tone.now() - currentTime / playbackRate;
      }
    }
  }, [loopMode]);

  // Update pitch/tempo
  useEffect(() => {
    if (playerRef.current) {
      if (playerRef.current instanceof Tone.GrainPlayer) {
        playerRef.current.playbackRate = playbackRate;
      } else {
        playerRef.current.playbackRate = playbackRate;
      }
    }
    if (midiPlayerRef.current) {
      midiPlayerRef.current.tempo = nativeTempoRef.current * playbackRate;
    }
    if (pitchShiftRef.current) pitchShiftRef.current.pitch = pitch;
  }, [playbackRate, pitch, isMidi]);

  // Update volume/mute
  useEffect(() => {
    if (volumeRef.current) {
      volumeRef.current.volume.value = isMuted ? -Infinity : volume;
    }
  }, [volume, isMuted]);

  // Update Channels and Vocal Removal
  useEffect(() => {
    if (channelRef.current) {
      channelRef.current.muteL = !channels.l;
      channelRef.current.muteR = !channels.r;
    }
    if (vocalFadeRef.current) {
      vocalFadeRef.current.fade.rampTo(vocalRemoved ? 1 : 0, 0.2);
    }
  }, [channels, vocalRemoved]);

  // Update loop settings
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.loop = loopMode;
      playerRef.current.loopStart = loopStart;
      playerRef.current.loopEnd = loopEnd;
    }
  }, [loopMode, loopStart, loopEnd]);


  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getInstrumentName = (program: number) => {
    if (program <= 8) return "Piano";
    if (program <= 16) return "Percussion";
    if (program <= 24) return "Organ";
    if (program <= 32) return "Guitar";
    if (program <= 40) return "Bass";
    if (program <= 48) return "Strings";
    if (program <= 56) return "Ensemble";
    if (program <= 64) return "Brass";
    if (program <= 72) return "Reed";
    if (program <= 80) return "Pipe";
    if (program <= 88) return "Synth Lead";
    if (program <= 96) return "Synth Pad";
    if (program <= 104) return "Synth SFX";
    if (program <= 112) return "Ethnic";
    if (program <= 120) return "Percussive";
    return "SFX";
  };

  const handleLoopMarkerDrag = (e: React.MouseEvent, type: 'start' | 'end') => {
    if (!progressBarRef.current) return;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const rect = progressBarRef.current!.getBoundingClientRect();
      const percent = (moveEvent.clientX - rect.left) / rect.width;
      const time = Math.max(0, Math.min(percent * duration, duration));
      
      if (type === 'start') {
        setLoopStart(Math.min(time, loopEnd - 0.1));
      } else {
        setLoopEnd(Math.max(time, loopStart + 0.1));
      }
    };
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onFilesDropped) {
        onFilesDropped(e.dataTransfer.files);
      }
    }
  };

  const rewind = (seconds = 5) => {
    seek(Math.max(0, currentTime - seconds));
  };

  const volumeUp = (step = 3) => {
    setVolume(prev => Math.min(0, prev + step));
  };

  const volumeDown = (step = 3) => {
    setVolume(prev => Math.max(-64, prev - step));
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const audioControls: AudioPlayerControls = {
    isPlaying,
    togglePlay: () => {
      if (!url || !isLoaded) {
        onUploadRequested?.();
      } else {
        togglePlay();
      }
    },
    stopPlayback,
    rewind,
    volume,
    volumeUp,
    volumeDown,
    isMuted,
    toggleMute,
    currentTime,
    duration,
    formatTime,
    isLoaded,
    url,
    filename,
    seek
  };

  const fullCard = (!isLoaded || !url) ? (
      <div 
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
        onDrop={handleDrop}
        className={cn(
          "p-6 rounded-2xl border transition-all flex items-center justify-between gap-6 relative",
          resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl",
          isDragging && "ring-4 ring-orange-500 ring-inset bg-orange-500/5"
        )}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-orange-500/10 backdrop-blur-sm rounded-2xl">
            <div className="text-orange-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
              Drop Audio Here
            </div>
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center text-slate-500">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h3 className={cn("text-sm font-black uppercase tracking-widest", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")}>Audio Engine Off</h3>
            <p className={cn("text-[10px] font-bold opacity-30 uppercase tracking-tighter", resolvedTheme === 'dark' ? "text-white" : "text-slate-500")}>No Audio File Loaded</p>
          </div>
        </div>
        
        <button 
          onClick={onUploadRequested}
          className="px-6 py-3 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-500/20"
        >
          Load Audio
        </button>
      </div>
    ) : (
      <motion.div 
        initial={false}
        animate={{ height: isCollapsed ? '80px' : 'auto' }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
        onDrop={handleDrop}
        className={cn(
          "rounded-2xl border transition-all flex flex-col overflow-hidden relative",
          resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-xl",
          isDragging && "ring-4 ring-orange-500 ring-inset bg-orange-500/5"
        )}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-orange-500/10 backdrop-blur-sm">
            <div className="bg-orange-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl animate-bounce">
              Drop Audio Files
            </div>
          </div>
        )}
        {/* Mini View Header */}
        <div className="flex items-center justify-between gap-4 h-20 px-6 shrink-0 relative select-none">

          {/* Title area - Explicit Expansion Trigger */}
          <div 
            className="flex items-center gap-4 z-10 cursor-pointer group/title"
            onClick={() => isCollapsed && setIsCollapsed(false)}
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover/title:scale-110 transition-transform">
              <Music className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <h3 className={cn("text-xs font-black uppercase tracking-widest leading-none group-hover/title:text-orange-500 transition-colors", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>
                {filename || 'Audio Engine'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] font-black tabular-nums text-orange-500 tracking-tighter">
                  {formatTime(currentTime)} / {formatTime(duration)}
                 </span>
              </div>
            </div>
          </div>

          {/* Dedicated Progress Slider for Mini View */}
          {isCollapsed && (
            <div className="flex-1 flex flex-col justify-center gap-1.5 z-10 max-w-sm px-4">
              {/* Spectrum behind progress in mini view */}
              <div className="h-4 bg-black/5 rounded-md overflow-hidden opacity-40">
                <canvas 
                  ref={miniCanvasRef} 
                  width={400} 
                  height={40} 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Progress Slider */}
              <div 
                className="relative h-4 select-none cursor-pointer group/mini-seek"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  seek(percent * duration);
                }}
              >
                <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden relative">
                  <div 
                    className="absolute h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                {/* Knob */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-orange-500 rounded-full shadow-md scale-0 group-hover/mini-seek:scale-100 transition-transform pointer-events-none"
                  style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 z-10">
            <button 
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-500/20"
            >
              {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 pl-0.5" fill="currentColor" />}
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); stopPlayback(); }}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                resolvedTheme === 'dark' ? "bg-white/5 text-white hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); onUploadRequested(); }}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                resolvedTheme === 'dark' ? "bg-white/5 text-white hover:bg-white/10" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
              title="Load New Audio"
            >
              <Upload className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-6 bg-black/10 mx-2" />

            <div className="hidden lg:flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsMuted(!isMuted)}>
                {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
              </button>
              <input 
                type="range" min="-64" max="0" step="1" 
                value={volume} onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-20 accent-orange-500 h-1 rounded-lg"
              />
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
              className={cn(
                "p-2 rounded-xl transition-all ml-2",
                resolvedTheme === 'dark' ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-900"
              )}
            >
              {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 pb-6 flex flex-col gap-6"
            >
              {/* Visualizer & Header Info */}
              <div className="flex items-center justify-between gap-8 pt-4 border-t border-black/5">
                <div className="hidden md:block">
                  <p className={cn("text-[10px] font-bold opacity-50 uppercase tracking-tighter", resolvedTheme === 'dark' ? "text-white" : "text-slate-500")}>Professional Playback Control</p>
                  <p className={cn("text-[8px] font-bold opacity-30 mt-0.5", resolvedTheme === 'dark' ? "text-white" : "text-slate-400")}>{isMidi ? 'MIDI SYMBOLIC ENGINE' : 'PCM AUDIO ENGINE'}</p>
                </div>
              </div>

              {/* Progress Bar with Loop Markers */}
              <div className="flex flex-col gap-3">
                {/* MIDI Channels (Conditional) */}
                {isMidi && Object.keys(midiChannels).length > 0 && (
                  <div className="flex flex-col gap-2 mb-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">MIDI Instrument Channels</span>
                      <button 
                        onClick={() => {
                          const newChannels = { ...midiChannelsRef.current };
                          Object.keys(newChannels).forEach(ch => newChannels[parseInt(ch)].muted = false);
                          midiChannelsRef.current = newChannels;
                          setMidiChannels({ ...newChannels });
                        }}
                        className="text-[8px] font-black uppercase tracking-widest text-orange-500/60 hover:text-orange-500"
                      >
                        Reset All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(midiChannels).map((chStr) => {
                        const ch = parseInt(chStr);
                        const channelInfo = midiChannels[ch];
                        return (
                          <button
                            key={ch}
                            onClick={() => {
                              const newChannels = { ...midiChannelsRef.current };
                              newChannels[ch].muted = !newChannels[ch].muted;
                              midiChannelsRef.current = newChannels;
                              setMidiChannels({ ...newChannels });
                              if (newChannels[ch].muted) {
                                synthRef.current?.releaseAll();
                              }
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                              channelInfo.muted 
                                ? "bg-black/5 border-transparent text-slate-300" 
                                : "bg-orange-500/10 border-orange-500/20 text-orange-600 shadow-sm"
                            )}
                          >
                            CH {ch} {channelInfo.program !== undefined ? `- ${getInstrumentName(channelInfo.program)}` : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Spectrum Display - Just above progress */}
                <div className="h-16 rounded-xl overflow-hidden opacity-80 pointer-events-none bg-black/5 mb-[-8px]">
                  <canvas 
                    ref={canvasRef} 
                    width={1200} 
                    height={160} 
                    className="w-full h-full object-cover"
                  />
                </div>

                <div 
                  ref={progressBarRef}
                  className="relative h-12 group cursor-pointer"
                >
                  
                  {/* Background Track */}
                  <div 
                    className="absolute inset-y-4 inset-x-0 rounded-full bg-black/5 overflow-hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const percent = (e.clientX - rect.left) / rect.width;
                      seek(percent * duration);
                    }}
                  >
                     <div 
                      className="absolute h-full bg-orange-500 opacity-40 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                    {loopMode && (
                      <div 
                        className="absolute h-full bg-orange-500/10 border-x border-orange-500/30"
                        style={{ left: `${(loopStart / duration) * 100}%`, width: `${((loopEnd - loopStart) / duration) * 100}%` }}
                      />
                    )}
                  </div>

                  {/* Current Time Marker */}
                  <div 
                    className="absolute inset-y-2 w-0.5 bg-orange-500 z-10 pointer-events-none shadow-[0_0_8px_rgba(249,115,22,0.6)]"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  />

                  {/* Loop Draggables */}
                  {loopMode && (
                    <>
                      <div 
                        onMouseDown={(e) => handleLoopMarkerDrag(e, 'start')}
                        className="absolute inset-y-0 w-4 -ml-2 cursor-col-resize z-20 flex items-center justify-center group/marker"
                        style={{ left: `${(loopStart / duration) * 100}%` }}
                      >
                        <div className="w-1 h-8 bg-orange-500 rounded-full group-hover/marker:w-2 transition-all shadow-lg" />
                      </div>
                      <div 
                        onMouseDown={(e) => handleLoopMarkerDrag(e, 'end')}
                        className="absolute inset-y-0 w-4 -ml-2 cursor-col-resize z-20 flex items-center justify-center group/marker"
                        style={{ left: `${(loopEnd / duration) * 100}%` }}
                      >
                        <div className="w-1 h-8 bg-orange-500 rounded-full group-hover/marker:w-2 transition-all shadow-lg" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Pitch Control */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-3 h-3" />
                      <span>Pitch Shifter</span>
                    </div>
                    <span className="text-orange-500">{pitch > 0 ? `+${pitch}` : pitch} ST</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPitch(Math.max(-12, pitch - 1))}
                      className="p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                    <div className="flex-1 relative h-1 bg-black/10 rounded-full">
                      <div 
                        className="absolute h-full bg-orange-500 rounded-full"
                        style={{ 
                          left: pitch < 0 ? `${50 + (pitch / 12) * 50}%` : '50%',
                          right: pitch > 0 ? `${50 - (pitch / 12) * 50}%` : '50%'
                        }}
                      />
                    </div>
                    <button 
                      onClick={() => setPitch(Math.min(12, pitch + 1))}
                      className="p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <button 
                    onClick={() => setPitch(0)}
                    className="text-[8px] font-black uppercase tracking-widest text-orange-500/50 hover:text-orange-500 self-center"
                  >Reset Pitch</button>
                </div>

                {/* Tempo Control */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3 h-3" />
                      <span>Tempo Engine</span>
                    </div>
                    <span className="text-orange-500">{Math.round(playbackRate * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPlaybackRate(Math.max(0.5, Math.round((playbackRate - 0.1) * 10) / 10))}
                      className="p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
                      title="-10%"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                    <div className="flex-1 relative h-1 bg-black/10 rounded-full overflow-hidden">
                      <div 
                        className="absolute h-full bg-orange-500 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((playbackRate - 0.5) / 1.5) * 100}%`
                        }}
                      />
                    </div>
                    <button 
                      onClick={() => setPlaybackRate(Math.min(2, Math.round((playbackRate + 0.1) * 10) / 10))}
                      className="p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
                      title="+10%"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <button 
                    onClick={() => setPlaybackRate(1)}
                    className="text-[8px] font-black uppercase tracking-widest text-orange-500/50 hover:text-orange-500 self-center"
                  >Standard Speed</button>
                </div>

                {/* Advanced Signal Options */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Signal Processing</span>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setLoopMode(!loopMode)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        loopMode ? "bg-orange-500 text-white shadow-lg shadow-orange-500/10" : "bg-black/5 text-slate-400"
                      )}
                    >
                      <RefreshCw className={cn("w-3 h-3", loopMode && "animate-spin-slow")} />
                      Repeat
                    </button>
                    <button 
                      onClick={() => !isMidi && setVocalRemoved(!vocalRemoved)}
                      disabled={isMidi}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                        isMidi ? "bg-black/5 text-slate-300 cursor-not-allowed opacity-50" : 
                        vocalRemoved ? "bg-purple-500 text-white" : "bg-black/5 text-slate-400"
                      )}
                      title={isMidi ? "Isolation not available for MIDI" : "Vocal Removal"}
                    >
                      <MicOff className="w-3 h-3" />
                      Isolation
                    </button>
                  </div>
                  <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl">
                    <button 
                      onClick={() => setChannels({ ...channels, l: !channels.l })}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all uppercase tracking-widest",
                        channels.l ? "bg-white text-orange-500 shadow-sm" : "opacity-30"
                      )}
                    >Left</button>
                    <button 
                      onClick={() => setChannels({ ...channels, r: !channels.r })}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all uppercase tracking-widest",
                        channels.r ? "bg-white text-orange-500 shadow-sm" : "opacity-30"
                      )}
                    >Right</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );

  if (renderTopBarControls) {
    return (
      <div className="w-full">
        {renderTopBarControls({
          ...audioControls,
          fullPlayerJSX: fullCard
        })}
      </div>
    );
  }

  return fullCard;
}
