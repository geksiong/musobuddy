/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Music, Play, Disc, Trash2, Plus, X, BookmarkPlus, 
  Sparkles, Check, ChevronRight, Tag, Activity, ArrowLeftRight
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useAccompaniment } from '../../contexts/AccompanimentContext.tsx';
import { useMetronome } from '../../hooks/useMetronome.ts';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { DEFAULT_PRESETS } from '../Metronome/constants.ts';
import { GROOVE_PRESETS } from './grooveEngine.ts';
import { 
  POPULAR_STANDARDS, Song, getUserSongs, saveUserSong, deleteUserSong 
} from './songLibrary.ts';
import { formatChordName, transposeChord } from './constants.ts';

interface SongLibraryPanelProps {
  onClose?: () => void;
  compact?: boolean;
}

export default function SongLibraryPanel({ onClose, compact = false }: SongLibraryPanelProps) {
  const { 
    setProgression, setSelectedBeatIndex, setTrackedChord, 
    selectedInstrument, accompanimentVolume, setActiveGroovePattern, 
    setIsGrooveEngineEnabled, progression, activeGroovePattern,
    setMeasureLabels, measureLabels
  } = useAccompaniment();

  const { setBpm, setActivePattern, bpm, activePattern } = useMetronome();
  const { playChord } = useAudio();
  const { resolvedTheme } = useTheme();

  const [userSongs, setUserSongs] = useState<Song[]>(() => getUserSongs());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('ALL');
  const [selectedTimeSigFilter, setSelectedTimeSigFilter] = useState<string>('ALL');
  const [loadedNotification, setLoadedNotification] = useState<string | null>(null);

  // Transpose shift preview state for selected song
  const [songTranspose, setSongTranspose] = useState<Record<string, number>>({});

  // Save Modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [songTitleInput, setSongTitleInput] = useState('');
  const [songArtistInput, setSongArtistInput] = useState('');
  const [songGenreInput, setSongGenreInput] = useState<Song['genre']>('Pop');
  const [songKeyInput, setSongKeyInput] = useState('C Major');
  const [songDescInput, setSongDescInput] = useState('');

  const allSongs = [...userSongs, ...POPULAR_STANDARDS];

  // Transpose song helper
  const getTransposedSongChords = (song: Song): string[] => {
    const shift = songTranspose[song.id] || 0;
    if (shift === 0) return song.chordsPerBeat;
    return song.chordsPerBeat.map(chord => chord ? transposeChord(chord, shift, 'sharp') : '');
  };

  const handleShiftSongKey = (songId: string, semitones: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSongTranspose(prev => ({
      ...prev,
      [songId]: (prev[songId] || 0) + semitones
    }));
  };

  const handleResetSongKey = (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSongTranspose(prev => ({
      ...prev,
      [songId]: 0
    }));
  };

  const handleLoadSong = (song: Song) => {
    const chords = getTransposedSongChords(song);

    // 1. Set Progression & Section Labels
    const newProg = chords.map((chordName, i) => ({
      id: `song_beat_${Date.now()}_${i}`,
      name: chordName,
    }));
    setProgression(newProg);
    setMeasureLabels(song.sectionLabels || {});
    setSelectedBeatIndex(0);

    // 2. Set Metronome Time Signature & BPM
    const targetPattern = DEFAULT_PRESETS.find(p => p.timeSignature === song.timeSignature);
    if (targetPattern) {
      setActivePattern(targetPattern);
    }
    if (song.bpm) {
      setBpm(song.bpm);
    }

    // 3. Set Groove Pattern
    const matchingGroove = GROOVE_PRESETS.find(g => g.id === song.grooveId);
    if (matchingGroove) {
      setActiveGroovePattern(matchingGroove);
      setIsGrooveEngineEnabled(true);
    }

    // 4. Play first chord audio feedback
    const firstChord = chords.find(c => c.trim() !== '');
    if (firstChord) {
      playChord(firstChord, selectedInstrument, accompanimentVolume);
      setTrackedChord(firstChord);
    }

    const shift = songTranspose[song.id] || 0;
    const shiftText = shift !== 0 ? ` (${shift > 0 ? '+' : ''}${shift} st)` : '';

    setLoadedNotification(`Loaded "${song.title}" • ${song.bpm} BPM • ${song.key}${shiftText}`);
    setTimeout(() => setLoadedNotification(null), 3500);

    if (onClose) onClose();
  };

  const handleDeleteUserSong = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteUserSong(id);
    setUserSongs(updated);
  };

  const handleSaveCurrentAsSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitleInput.trim()) return;

    const chordsPerBeat = progression.map(p => p.name || '');
    const timeSig = (activePattern?.timeSignature as '4/4' | '3/4' | '6/8' | '5/4') || '4/4';

    const updated = saveUserSong({
      title: songTitleInput.trim(),
      artist: songArtistInput.trim() || 'Custom Arrangement',
      genre: songGenreInput,
      key: songKeyInput.trim() || 'C Major',
      bpm: bpm || 120,
      timeSignature: timeSig,
      grooveId: activeGroovePattern?.id || 'pop-acoustic-push',
      description: songDescInput.trim() || 'Custom song progression created in accompaniment view.',
      chordsPerBeat,
      sectionLabels: measureLabels,
      tags: ['Custom Song', songGenreInput],
    });

    setUserSongs(updated);
    setIsSaveModalOpen(false);
    setSongTitleInput('');
    setSongArtistInput('');
    setSongDescInput('');
    setSelectedGenre('★ Custom');

    setLoadedNotification(`Saved "${songTitleInput.trim()}" to Custom Songs!`);
    setTimeout(() => setLoadedNotification(null), 3000);
  };

  // Filter songs
  const filteredSongs = allSongs.filter(song => {
    // Genre Filter
    const matchesGenre = selectedGenre === 'ALL'
      ? true
      : selectedGenre === '★ Custom'
        ? song.isCustom
        : song.genre.toLowerCase().includes(selectedGenre.toLowerCase());

    // Time Sig Filter
    const matchesTs = selectedTimeSigFilter === 'ALL'
      ? true
      : song.timeSignature === selectedTimeSigFilter;

    // Search Query Filter
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesGenre && matchesTs;

    const matchTitle = song.title.toLowerCase().includes(query);
    const matchArtist = song.artist.toLowerCase().includes(query);
    const matchGenre = song.genre.toLowerCase().includes(query);
    const matchKey = song.key.toLowerCase().includes(query);
    const matchDesc = song.description.toLowerCase().includes(query);
    const matchTag = song.tags.some(t => t.toLowerCase().includes(query));
    const matchChords = song.chordsPerBeat.some(c => c.toLowerCase().includes(query));

    return matchesGenre && matchesTs && (matchTitle || matchArtist || matchGenre || matchKey || matchDesc || matchTag || matchChords);
  });

  const genresList = ['ALL', '★ Custom', 'Jazz', 'Bossa Nova', 'Blues', 'R&B / Soul', 'Funk', 'Rock', 'Pop', 'Reggae', 'Flamenco / Latin', 'Country / Folk', 'J-Pop / Anime'];

  return (
    <div className="flex flex-col h-full w-full min-h-0 relative">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {loadedNotification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-2 left-2 right-2 z-30 bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-bold gap-2"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 animate-bounce" />
              <span>{loadedNotification}</span>
            </div>
            <button onClick={() => setLoadedNotification(null)} className="p-0.5 hover:bg-emerald-700 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex flex-col gap-2.5 pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                Standard Song Library
                <span className="text-[9px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.2 rounded-full border border-emerald-500/20">
                  {filteredSongs.length} Songs
                </span>
              </h2>
              <p className="text-[9px] text-slate-400 font-medium">
                Complete standards with progressions, grooves & tempos
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSaveModalOpen(true)}
            disabled={progression.every(p => !p.name || p.name.trim() === '')}
            className={cn(
              "px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-[9px] font-bold transition-all shadow-xs shrink-0",
              progression.some(p => p.name && p.name.trim() !== '')
                ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
                : "opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/20"
            )}
            title="Save current accompaniment as a custom song"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Save Current Song</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full">
          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5", resolvedTheme === 'dark' ? "text-white/40" : "text-slate-400")} />
          <input
            type="text"
            placeholder="Search standards by title, artist, genre, chord, or key (e.g. Miles Davis, Cm7, Bossa Nova)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-8 pr-8 py-1.5 rounded-xl border text-xs font-medium outline-none transition-all focus:border-emerald-500",
              resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white placeholder:text-white/30" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Genre Pill Selector */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {genresList.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 border",
                selectedGenre === genre
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-xs"
                  : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/50 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200")
              )}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Time Signature Filter */}
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 px-1 pt-1">
          <span>Time Signature:</span>
          <div className="flex items-center gap-1">
            {['ALL', '4/4', '3/4', '6/8', '5/4'].map(ts => (
              <button
                key={ts}
                onClick={() => setSelectedTimeSigFilter(ts)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[8px] font-mono transition-all border",
                  selectedTimeSigFilter === ts
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold"
                    : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/40 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200")
                )}
              >
                {ts}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Songs Scrollable List */}
      <div className="flex-1 overflow-y-auto pt-2 pr-1 flex flex-col gap-2.5 min-h-0 max-h-[540px] custom-scrollbar">
        {filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center gap-2 text-slate-400 my-auto">
            <Music className="w-8 h-8 opacity-30" />
            <span className="text-xs font-bold">No matching standards found</span>
            <span className="text-[10px] opacity-75">Try adjusting your search query or genre filter</span>
          </div>
        ) : (
          filteredSongs.map(song => {
            const shift = songTranspose[song.id] || 0;
            const transposedChords = getTransposedSongChords(song);
            const explicitChords = transposedChords.filter(c => c.trim() !== '');
            const uniqueExplicitChords = Array.from(new Set<string>(explicitChords));

            const matchingGroove = GROOVE_PRESETS.find(g => g.id === song.grooveId);
            const beatsPerMeasure = song.timeSignature === '4/4' ? 4 : song.timeSignature === '3/4' ? 3 : song.timeSignature === '6/8' ? 6 : 5;
            const totalMeasures = Math.ceil(song.chordsPerBeat.length / beatsPerMeasure);

            return (
              <div
                key={song.id}
                className={cn(
                  "group p-3 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden shrink-0",
                  resolvedTheme === 'dark'
                    ? "bg-white/[0.03] border-white/10 hover:border-emerald-500/40 hover:bg-white/[0.06]"
                    : "bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md"
                )}
              >
                {/* Top Bar: Title, Artist & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-black tracking-tight group-hover:text-emerald-500 transition-colors">
                        {song.title}
                      </h3>
                      {song.isCustom && (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
                          ★ Custom
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {song.artist}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {song.key} {shift !== 0 ? `(${shift > 0 ? '+' : ''}${shift}st)` : ''}
                    </span>
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      ♩ = {song.bpm}
                    </span>
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      {song.timeSignature}
                    </span>

                    {song.isCustom && (
                      <button
                        onClick={(e) => handleDeleteUserSong(song.id, e)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                        title="Delete custom song"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description & Groove Preset Info */}
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  {song.description}
                </p>

                {matchingGroove && (
                  <div className={cn(
                    "flex items-center justify-between p-2 rounded-xl border text-[9px] font-medium gap-2",
                    resolvedTheme === 'dark' ? "bg-black/30 border-white/5" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <Disc className="w-3 h-3 text-emerald-500 shrink-0 animate-spin-slow" />
                      <span className="font-bold text-emerald-400 truncate">Groove: {matchingGroove.name}</span>
                    </div>
                    <span className="text-[8px] font-mono text-slate-400 shrink-0">
                      {matchingGroove.genre}
                    </span>
                  </div>
                )}

                {/* Transposition Controls Preview */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-white/5 text-[9px]">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-mono text-slate-400 text-[8px] mr-1">Chords ({totalMeasures} bars):</span>
                    {uniqueExplicitChords.slice(0, 8).map((chord, idx) => (
                      <span
                        key={idx}
                        className="font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px]"
                      >
                        {formatChordName(chord)}
                      </span>
                    ))}
                    {uniqueExplicitChords.length > 8 && (
                      <span className="text-[8px] text-slate-400 font-mono">+{uniqueExplicitChords.length - 8} more</span>
                    )}
                  </div>

                  {/* Transpose Key Adjustment Buttons */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={(e) => handleShiftSongKey(song.id, -1, e)}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all",
                        resolvedTheme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
                      )}
                      title="Transpose key down 1 semitone (-1 st)"
                    >
                      -1st
                    </button>
                    <button
                      onClick={(e) => handleShiftSongKey(song.id, 1, e)}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all",
                        resolvedTheme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
                      )}
                      title="Transpose key up 1 semitone (+1 st)"
                    >
                      +1st
                    </button>
                    {shift !== 0 && (
                      <button
                        onClick={(e) => handleResetSongKey(song.id, e)}
                        className="text-[8px] font-mono text-emerald-500 hover:underline px-1"
                        title="Reset key"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {song.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[8px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 border border-slate-200 dark:border-white/5 flex items-center gap-1"
                      >
                        <Tag className="w-2 h-2" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => handleLoadSong(song)}
                    className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-md active:scale-95 shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Load Song</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Save Custom Song Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "w-full max-w-md rounded-2xl border p-6 flex flex-col gap-4 shadow-2xl relative",
              resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
            )}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-black uppercase tracking-wider">Save Custom Standard Song</h3>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrentAsSong} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Song Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Autumn Leaves in E Minor"
                  value={songTitleInput}
                  onChange={(e) => setSongTitleInput(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-emerald-500",
                    resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Artist / Origin</label>
                  <input
                    type="text"
                    placeholder="e.g. Bill Evans Arrangement"
                    value={songArtistInput}
                    onChange={(e) => setSongArtistInput(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-emerald-500",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Genre</label>
                  <select
                    value={songGenreInput}
                    onChange={(e) => setSongGenreInput(e.target.value as Song['genre'])}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none focus:border-emerald-500 cursor-pointer",
                      resolvedTheme === 'dark' ? "bg-slate-800 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  >
                    {['Jazz', 'Pop', 'Rock', 'Bossa Nova', 'Blues', 'R&B / Soul', 'Funk', 'Reggae', 'Flamenco / Latin', 'Country / Folk', 'J-Pop / Anime'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Key Signature</label>
                  <input
                    type="text"
                    placeholder="e.g. G Minor"
                    value={songKeyInput}
                    onChange={(e) => setSongKeyInput(e.target.value)}
                    className={cn(
                      "w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-emerald-500",
                      resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Tempo (BPM)</label>
                  <div className={cn(
                    "w-full px-3 py-2 rounded-xl border text-xs font-bold font-mono opacity-80",
                    resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
                  )}>
                    {bpm || 120} BPM
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Musical Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Extended 7th chords with syncopated groove rhythm"
                  value={songDescInput}
                  onChange={(e) => setSongDescInput(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-emerald-500",
                    resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" /> Save Song
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
