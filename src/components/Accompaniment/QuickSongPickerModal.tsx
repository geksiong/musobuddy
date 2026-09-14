/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Music, Sparkles, Check, X, Disc, Layers, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { POPULAR_STANDARDS, Song, getUserSongs } from './songLibrary.ts';
import { PROGRESSION_PRESETS, ProgressionPreset, getUserPresets } from './progressionPresets.ts';
import { formatChordName } from './constants.ts';

interface QuickSongPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (song: Song) => void;
  onSelectProgression: (progression: ProgressionPreset) => void;
  currentTitle?: string;
}

export default function QuickSongPickerModal({
  isOpen,
  onClose,
  onSelectSong,
  onSelectProgression,
  currentTitle,
}: QuickSongPickerModalProps) {
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'songs' | 'progressions'>('songs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('ALL');

  const userSongs = useMemo(() => getUserSongs(), [isOpen]);
  const userProgressions = useMemo(() => getUserPresets(), [isOpen]);

  const allSongs = useMemo(() => [...userSongs, ...POPULAR_STANDARDS], [userSongs]);
  const allProgressions = useMemo(() => [...userProgressions, ...PROGRESSION_PRESETS], [userProgressions]);

  const songGenres = useMemo(() => {
    const set = new Set(allSongs.map(s => s.genre));
    return ['ALL', ...Array.from(set)];
  }, [allSongs]);

  const progressionGenres = useMemo(() => {
    const set = new Set(allProgressions.map(p => p.genre));
    return ['ALL', ...Array.from(set)];
  }, [allProgressions]);

  const filteredSongs = useMemo(() => {
    return allSongs.filter(song => {
      const matchesSearch = 
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesGenre = selectedGenre === 'ALL' || song.genre === selectedGenre;
      return matchesSearch && matchesGenre;
    });
  }, [allSongs, searchQuery, selectedGenre]);

  const filteredProgressions = useMemo(() => {
    return allProgressions.filter(prog => {
      const matchesSearch = 
        prog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = selectedGenre === 'ALL' || prog.genre === selectedGenre;
      return matchesSearch && matchesGenre;
    });
  }, [allProgressions, searchQuery, selectedGenre]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className={cn(
          "w-full max-w-2xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all",
          resolvedTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
        )}
      >
        {/* Modal Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Disc className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-snug">Choose Song or Progression</h3>
              <p className="text-xs text-slate-400">Pick a tune or harmonic sequence to practice with</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col gap-3 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-white/10 border border-slate-300/60 dark:border-white/10">
              <button
                onClick={() => {
                  setActiveTab('songs');
                  setSelectedGenre('ALL');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  activeTab === 'songs'
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                )}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Songs & Standards ({allSongs.length})</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('progressions');
                  setSelectedGenre('ALL');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                  activeTab === 'progressions'
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Chord Progressions ({allProgressions.length})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'songs' ? "Search by title, artist, or tags..." : "Search progressions..."}
                className={cn(
                  "w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border outline-none transition-all",
                  resolvedTheme === 'dark' 
                    ? "bg-white/5 border-white/10 focus:border-emerald-500 text-white placeholder-white/30" 
                    : "bg-white border-slate-200 focus:border-emerald-500 text-slate-900 placeholder-slate-400"
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Genre Filter */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] no-scrollbar py-0.5">
              {(activeTab === 'songs' ? songGenres : progressionGenres).slice(0, 5).map(genre => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border",
                    selectedGenre === genre
                      ? "bg-emerald-500 text-white border-emerald-400 shadow-2xs"
                      : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/60 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100")
                  )}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 max-h-[50vh] divide-y divide-slate-100 dark:divide-white/5">
          {activeTab === 'songs' ? (
            filteredSongs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredSongs.map(song => {
                  const isCurrent = currentTitle === song.title;
                  return (
                    <div
                      key={song.id}
                      onClick={() => {
                        onSelectSong(song);
                        onClose();
                      }}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all cursor-pointer group text-left",
                        isCurrent
                          ? "bg-emerald-500/15 border-emerald-500 shadow-sm"
                          : resolvedTheme === 'dark'
                            ? "bg-white/[0.02] border-white/10 hover:border-emerald-500/50 hover:bg-white/[0.04]"
                            : "bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 shadow-2xs"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate group-hover:text-emerald-500 transition-colors">
                            {song.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">{song.artist}</p>
                        </div>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 shrink-0">
                          {song.genre}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100 dark:border-white/5">
                        <span>{song.key} • {song.bpm} BPM • {song.timeSignature}</span>
                        <div className="flex items-center gap-1 text-emerald-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Load</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No songs match your search.
              </div>
            )
          ) : (
            filteredProgressions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredProgressions.map(prog => {
                  const isCurrent = currentTitle === prog.name;
                  const previewChords = prog.chordsPerBeat.filter(c => c && c.trim() !== '').slice(0, 4);
                  return (
                    <div
                      key={prog.id}
                      onClick={() => {
                        onSelectProgression(prog);
                        onClose();
                      }}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all cursor-pointer group text-left",
                        isCurrent
                          ? "bg-emerald-500/15 border-emerald-500 shadow-sm"
                          : resolvedTheme === 'dark'
                            ? "bg-white/[0.02] border-white/10 hover:border-emerald-500/50 hover:bg-white/[0.04]"
                            : "bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 shadow-2xs"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate group-hover:text-emerald-500 transition-colors">
                            {prog.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{prog.description}</p>
                        </div>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 shrink-0">
                          {prog.genre}
                        </span>
                      </div>

                      {/* Chords preview chips */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {previewChords.map((c, i) => (
                          <span key={i} className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 font-mono text-[9px] font-black">
                            {formatChordName(c)}
                          </span>
                        ))}
                        {prog.chordsPerBeat.filter(c => c && c.trim() !== '').length > 4 && (
                          <span className="text-[9px] text-slate-400">...</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100 dark:border-white/5">
                        <span>{prog.timeSignature} {prog.bpm ? `• ${prog.bpm} BPM` : ''}</span>
                        <div className="flex items-center gap-1 text-emerald-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>Load</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No progressions match your search.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
