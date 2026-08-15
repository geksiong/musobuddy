/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as alphaTab from '@coderline/alphatab';
import { 
  Play, 
  Square, 
  Volume2, 
  VolumeX, 
  Layers, 
  Sliders, 
  Music, 
  RotateCcw, 
  Printer, 
  Download,
  Eye,
  Settings2,
  Gauge
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

interface GuitarProRendererProps {
  data: string | ArrayBuffer | Uint8Array;
  zoom?: number;
  scoreTitle?: string;
  onExportMidi?: () => void;
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

export default function GuitarProRenderer({ 
  data, 
  zoom = 1,
  scoreTitle,
  onExportMidi 
}: GuitarProRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);
  const { resolvedTheme } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [soundFontProgress, setSoundFontProgress] = useState<number>(0);
  const [isSoundFontLoaded, setIsSoundFontLoaded] = useState(false);

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
  const [showMixer, setShowMixer] = useState<boolean>(false);

  // Initialize and load score into AlphaTab
  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);
    setError(null);

    // Destroy existing instance if any
    if (apiRef.current) {
      try {
        apiRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying existing AlphaTab instance:', e);
      }
      apiRef.current = null;
    }

    // Clear previous DOM contents
    containerRef.current.innerHTML = '';

    try {
      const settings: alphaTab.Settings = new alphaTab.Settings();
      settings.core.fontDirectory = '/alphatab/font/';
      settings.core.useWorkers = false;
      settings.display.scale = zoom;
      settings.display.layoutMode = layoutMode;
      settings.display.staveProfile = staveProfile;
      settings.player.enablePlayer = true;
      settings.player.enableCursor = true;
      settings.player.enableUserInteraction = true;
      settings.player.soundFont = '/alphatab/soundfont/sonivox.sf2';
      if (viewportRef.current) {
        settings.player.scrollElement = viewportRef.current;
      }
      settings.notation.rhythmMode = alphaTab.TabRhythmMode.Automatic;

      const api = new alphaTab.AlphaTabApi(containerRef.current, settings);
      apiRef.current = api;

      // Event Listeners
      api.scoreLoaded.on((score) => {
        setIsLoading(false);
        setError(null);

        const tracks: TrackInfo[] = score.tracks.map((t) => ({
          index: t.index,
          name: t.name || `Track ${t.index + 1}`,
          shortName: t.shortName,
          tuning: t.staves[0]?.stringTuning ? Array.from(t.staves[0].stringTuning.tunings).map(n => String(n)) : [],
          volume: t.playbackInfo ? t.playbackInfo.volume / 16 : 1,
          isMute: t.playbackInfo ? t.playbackInfo.isMute : false,
          isSolo: t.playbackInfo ? t.playbackInfo.isSolo : false,
        }));

        setSongInfo({
          title: score.title || scoreTitle || 'Guitar Pro Score',
          artist: score.artist || '',
          album: score.album || '',
          tempo: score.tempo || 120,
          tracks
        });

        if (tracks.length > 0 && selectedTrackIndexes.length === 0) {
          setSelectedTrackIndexes([0]);
        }
      });

      api.playerReady.on(() => {
        setIsPlayerReady(true);
      });

      api.soundFontLoad.on((e) => {
        if (e && typeof e.loaded === 'number' && typeof e.total === 'number' && e.total > 0) {
          setSoundFontProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      api.soundFontLoaded.on(() => {
        setIsSoundFontLoaded(true);
        setIsPlayerReady(true);
      });

      api.playerStateChanged.on((e) => {
        setIsPlaying(e.state === 1); // 1 = Playing, 0 = Paused
      });

      api.renderStarted.on(() => {
        setIsLoading(true);
      });

      api.renderFinished.on(() => {
        setIsLoading(false);
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
      setError(err instanceof Error ? err.message : 'Failed to render Guitar Pro score.');
      setIsLoading(false);
    }

    return () => {
      if (apiRef.current) {
        try {
          apiRef.current.destroy();
        } catch (e) {
          console.warn('Error during AlphaTab cleanup:', e);
        }
        apiRef.current = null;
      }
    };
  }, [data]);

  // Update zoom when zoom prop changes
  useEffect(() => {
    if (apiRef.current && apiRef.current.settings) {
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
      apiRef.current.settings.display.layoutMode = mode;
      apiRef.current.updateSettings();
      apiRef.current.render();
    }
  };

  // Update stave profile (Notation vs Tab)
  const handleStaveProfileChange = (profile: alphaTab.StaveProfile) => {
    setStaveProfile(profile);
    if (apiRef.current && apiRef.current.settings) {
      apiRef.current.settings.display.staveProfile = profile;
      apiRef.current.updateSettings();
      apiRef.current.render();
    }
  };

  // Track selection
  const handleTrackChange = (trackIndex: number) => {
    setSelectedTrackIndexes([trackIndex]);
    if (apiRef.current && apiRef.current.score) {
      const targetTrack = apiRef.current.score.tracks.find(t => t.index === trackIndex);
      if (targetTrack) {
        apiRef.current.renderTracks([targetTrack]);
      }
    }
  };

  // Play / Pause
  const togglePlayPause = () => {
    if (!apiRef.current) return;
    try {
      apiRef.current.playPause();
    } catch (e) {
      console.error('Error toggling play/pause in AlphaTab:', e);
    }
  };

  // Stop
  const handleStop = () => {
    if (!apiRef.current) return;
    try {
      apiRef.current.stop();
      setIsPlaying(false);
    } catch (e) {
      console.error('Error stopping AlphaTab playback:', e);
    }
  };

  // Playback speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (apiRef.current) {
      apiRef.current.playbackSpeed = speed;
    }
  };

  // Master Volume
  const handleVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    if (apiRef.current) {
      apiRef.current.masterVolume = vol;
    }
  };

  // Metronome
  const toggleMetronome = () => {
    const next = !isMetronomeActive;
    setIsMetronomeActive(next);
    if (apiRef.current) {
      apiRef.current.metronomeVolume = next ? 0.7 : 0;
    }
  };

  // Looping
  const toggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    if (apiRef.current) {
      apiRef.current.isLooping = next;
    }
  };

  // Track Solo / Mute
  const handleTrackMute = (trackIndex: number) => {
    if (!apiRef.current || !apiRef.current.score) return;
    const track = apiRef.current.score.tracks.find(t => t.index === trackIndex);
    if (track) {
      const newMuteState = !track.playbackInfo.isMute;
      apiRef.current.changeTrackMute([track], newMuteState);
      setSongInfo(prev => ({
        ...prev,
        tracks: prev.tracks.map(t => t.index === trackIndex ? { ...t, isMute: newMuteState } : t)
      }));
    }
  };

  const handleTrackSolo = (trackIndex: number) => {
    if (!apiRef.current || !apiRef.current.score) return;
    const track = apiRef.current.score.tracks.find(t => t.index === trackIndex);
    if (track) {
      const newSoloState = !track.playbackInfo.isSolo;
      apiRef.current.changeTrackSolo([track], newSoloState);
      setSongInfo(prev => ({
        ...prev,
        tracks: prev.tracks.map(t => t.index === trackIndex ? { ...t, isSolo: newSoloState } : t)
      }));
    }
  };

  // Track volume
  const handleTrackVolumeChange = (trackIndex: number, vol: number) => {
    if (!apiRef.current || !apiRef.current.score) return;
    const track = apiRef.current.score.tracks.find(t => t.index === trackIndex);
    if (track) {
      apiRef.current.changeTrackVolume([track], vol);
      setSongInfo(prev => ({
        ...prev,
        tracks: prev.tracks.map(t => t.index === trackIndex ? { ...t, volume: vol } : t)
      }));
    }
  };

  // Download MIDI
  const handleDownloadMidi = () => {
    if (apiRef.current) {
      apiRef.current.downloadMidi();
    }
  };

  // Print score
  const handlePrint = () => {
    if (apiRef.current) {
      apiRef.current.print();
    }
  };

  const activeTrack = songInfo.tracks.find(t => selectedTrackIndexes.includes(t.index)) || songInfo.tracks[0];

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
                value={playbackSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="bg-transparent text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer pr-1"
              >
                <option value="0.5" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>0.5x</option>
                <option value="0.75" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>0.75x</option>
                <option value="1.0" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>1.0x</option>
                <option value="1.25" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>1.25x</option>
                <option value="1.5" className={resolvedTheme === 'dark' ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>1.5x</option>
              </select>
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
                          "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all",
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
                          "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all",
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
