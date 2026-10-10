/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Gamepad2, 
  Sliders, 
  X, 
  Check, 
  Bookmark as BookmarkIcon,
  Compass,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useScores } from '../../contexts/ScoreContext.tsx';
import { useController } from '../../contexts/ControllerContext.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { Waypoint } from './annotationTypes.ts';

interface WaypointNavProps {
  className?: string;
  isCompact?: boolean;
}

export function WaypointNav({ className, isCompact = false }: WaypointNavProps) {
  const { 
    waypoints, 
    currentPage, 
    addWaypoint, 
    removeWaypoint, 
    updateWaypoint, 
    jumpToPage, 
    nextWaypoint, 
    prevWaypoint,
    totalPages,
    activeScore
  } = useScores();

  const { mappings, toggleControllerModal, gamepads, midiDevices, isMidiActive } = useController();
  const { resolvedTheme } = useTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
        setEditingId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find waypoint matching current page if any
  const currentWaypoint = waypoints.find(w => w.page === currentPage);
  const sortedWaypoints = [...waypoints].sort((a, b) => a.page - b.page);

  const handleAddWaypoint = () => {
    const title = newTitle.trim() || `Page ${currentPage}`;
    addWaypoint(currentPage, title);
    setNewTitle('');
  };

  const handleSaveEdit = (id: string) => {
    if (editingTitle.trim()) {
      updateWaypoint(id, { title: editingTitle.trim() });
    }
    setEditingId(null);
  };

  const nextShortcut = mappings.WAYPOINT_NEXT?.keyboardDisplay || 'W';
  const prevShortcut = mappings.WAYPOINT_PREV?.keyboardDisplay || 'Q';
  const hasHardware = gamepads.length > 0 || (isMidiActive && midiDevices.length > 0);

  return (
    <div className={cn("relative flex items-center gap-1.5 shrink-0 select-none", className)}>
      <div 
        ref={popoverRef}
        className={cn(
          "flex items-center gap-1 p-1 rounded-xl border transition-all shadow-sm",
          resolvedTheme === 'dark' 
            ? "bg-black/30 border-white/10 text-slate-200" 
            : "bg-slate-100/90 border-slate-200 text-slate-800"
        )}
      >
        {/* Previous Waypoint Button */}
        <button
          onClick={() => prevWaypoint()}
          disabled={waypoints.length === 0}
          className={cn(
            "p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group",
            resolvedTheme === 'dark' 
              ? "border-white/5 hover:bg-white/10 text-slate-300 hover:text-white" 
              : "border-black/5 hover:bg-white text-slate-600 hover:text-slate-900"
          )}
          title={`Previous Score Waypoint (Shortcut: ${prevShortcut})`}
        >
          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Current Waypoint Indicator / Popover Toggle */}
        <button
          onClick={() => setIsPopoverOpen(open => !open)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer truncate max-w-[170px] sm:max-w-[220px]",
            isPopoverOpen
              ? "bg-[#FF4E00] border-[#FF4E00] text-white shadow-md shadow-[#FF4E00]/20"
              : currentWaypoint
                ? "bg-orange-500/15 border-orange-500/30 text-orange-500 hover:bg-orange-500/25"
                : resolvedTheme === 'dark'
                  ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
          )}
          title="Click to view and manage all score waypoints"
        >
          <MapPin className={cn("w-3.5 h-3.5 shrink-0", isPopoverOpen ? "text-white" : "text-[#FF4E00]")} />
          <span className="truncate text-[11px] uppercase tracking-wider font-extrabold">
            {currentWaypoint ? (
              <span>{currentWaypoint.title} <span className="opacity-70 font-mono text-[9px]">(p.{currentWaypoint.page})</span></span>
            ) : waypoints.length > 0 ? (
              <span>Waypoints ({waypoints.length})</span>
            ) : (
              <span>Waypoints</span>
            )}
          </span>
          <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-black/10 dark:bg-white/10 shrink-0">
            {waypoints.length}
          </span>
        </button>

        {/* Next Waypoint Button */}
        <button
          onClick={() => nextWaypoint()}
          disabled={waypoints.length === 0}
          className={cn(
            "p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group relative",
            resolvedTheme === 'dark' 
              ? "border-white/5 hover:bg-white/10 text-slate-300 hover:text-white" 
              : "border-black/5 hover:bg-white text-slate-600 hover:text-slate-900"
          )}
          title={`Next Score Waypoint (Shortcut: ${nextShortcut})`}
        >
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          <span className="sr-only">Next Waypoint ({nextShortcut})</span>
        </button>

        {/* Quick Add Waypoint for current page */}
        <button
          onClick={handleAddWaypoint}
          className={cn(
            "px-2 py-1 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0",
            currentWaypoint
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 cursor-default"
              : resolvedTheme === 'dark'
                ? "bg-white/5 border-white/10 hover:bg-[#FF4E00] hover:border-[#FF4E00] hover:text-white text-slate-300"
                : "bg-white border-slate-200 hover:bg-[#FF4E00] hover:border-[#FF4E00] hover:text-white text-slate-700"
          )}
          title={currentWaypoint ? `Current page ${currentPage} is bookmarked as "${currentWaypoint.title}"` : `Bookmark current page ${currentPage} as waypoint`}
        >
          <Plus className="w-3 h-3 text-[#FF4E00] group-hover:text-white shrink-0" />
          <span className="hidden sm:inline">Set Waypoint</span>
        </button>

        {/* Controller / MIDI mapping button */}
        <button
          onClick={toggleControllerModal}
          className={cn(
            "p-1.5 rounded-lg border transition-all flex items-center gap-1.5 px-2 cursor-pointer shrink-0 group relative",
            hasHardware
              ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25"
              : resolvedTheme === 'dark'
                ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-400 hover:text-white"
                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
          )}
          title={`Controller & MIDI Pedal Mapping (Connected: ${gamepads.length} gamepad(s), ${midiDevices.length} MIDI device(s))`}
        >
          <Gamepad2 className={cn("w-3.5 h-3.5", hasHardware ? "text-indigo-400" : "text-[#FF4E00]")} />
          <span className="text-[10px] font-black uppercase tracking-wider hidden md:inline">Pedal / Pad</span>
          {hasHardware && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
          )}
        </button>

        {/* Waypoints Dropdown Popover */}
        {isPopoverOpen && (
          <div className={cn(
            "absolute left-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border p-3 shadow-2xl z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150",
            resolvedTheme === 'dark'
              ? "bg-[#141417]/95 border-white/15 text-white"
              : "bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50"
          )}>
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#FF4E00]" />
                <h4 className="text-xs font-black uppercase tracking-wider">Score Waypoints</h4>
                <span className="text-[9px] font-mono opacity-50">
                  {waypoints.length} saved
                </span>
              </div>
              <button
                onClick={() => setIsPopoverOpen(false)}
                className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Add Form */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                placeholder={`Name for Page ${currentPage} (e.g. Chorus, Solo)`}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddWaypoint();
                }}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-xl border text-xs outline-none transition-colors",
                  resolvedTheme === 'dark'
                    ? "bg-white/5 border-white/10 text-white focus:border-[#FF4E00]"
                    : "bg-slate-100 border-slate-200 text-slate-900 focus:border-[#FF4E00]"
                )}
              />
              <button
                onClick={handleAddWaypoint}
                className="px-3 py-1.5 bg-[#FF4E00] hover:bg-[#e04500] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Add (p.{currentPage})</span>
              </button>
            </div>

            {/* Waypoints List */}
            <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-0.5">
              {sortedWaypoints.length === 0 ? (
                <div className="p-4 text-center text-xs opacity-50 italic">
                  No waypoints set for this score yet. Set waypoints at key rehearsal marks (Intro, Verse, Chorus, Solo) for instant foot-switch or keyboard jumps.
                </div>
              ) : (
                sortedWaypoints.map((wp, idx) => {
                  const isCurrent = wp.page === currentPage;
                  const isEditing = editingId === wp.id;

                  return (
                    <div
                      key={wp.id}
                      className={cn(
                        "flex items-center justify-between gap-2 p-2 rounded-xl border text-xs transition-all group",
                        isCurrent
                          ? "bg-[#FF4E00]/10 border-[#FF4E00]/40 text-[#FF4E00]"
                          : resolvedTheme === 'dark'
                            ? "bg-white/5 border-white/5 hover:border-white/15 text-slate-200"
                            : "bg-slate-50 border-slate-200/80 hover:border-slate-300 text-slate-800"
                      )}
                    >
                      <div 
                        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          jumpToPage(wp.page);
                        }}
                      >
                        <span className="w-5 h-5 rounded-md bg-[#FF4E00]/10 text-[#FF4E00] font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {isEditing ? (
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(wp.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "flex-1 px-2 py-0.5 rounded border text-xs outline-none",
                              resolvedTheme === 'dark' ? "bg-black text-white border-white/20" : "bg-white text-slate-900 border-slate-300"
                            )}
                          />
                        ) : (
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold truncate text-xs">{wp.title}</span>
                            <span className="text-[9px] opacity-60 font-mono">Page {wp.page}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveEdit(wp.id)}
                            className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded cursor-pointer"
                            title="Save title"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(wp.id);
                              setEditingTitle(wp.title);
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all cursor-pointer"
                            title="Rename waypoint"
                          >
                            <span className="text-[10px]">Edit</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            jumpToPage(wp.page);
                          }}
                          className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 hover:bg-[#FF4E00] hover:text-white transition-colors text-[10px] font-bold cursor-pointer flex items-center gap-1"
                          title={`Jump to Page ${wp.page}`}
                        >
                          <span>Jump</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeWaypoint(wp.id);
                          }}
                          className="p-1 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500/20 rounded transition-all cursor-pointer"
                          title="Remove waypoint"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Popover Footer Info */}
            <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded font-bold text-[9px] text-[#FF4E00]">{nextShortcut}</span>
                <span>Next</span>
                <span className="mx-1">·</span>
                <span className="font-mono bg-black/10 dark:bg-white/10 px-1 rounded font-bold text-[9px] text-[#FF4E00]">{prevShortcut}</span>
                <span>Prev</span>
              </span>

              <button
                onClick={() => {
                  setIsPopoverOpen(false);
                  toggleControllerModal();
                }}
                className="text-[#FF4E00] hover:underline font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
                <span>Map Controllers</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
