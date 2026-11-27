/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Piano,
  Volume2,
  VolumeX,
  Delete,
  CornerDownLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  X,
  Keyboard,
  Usb,
  Layers,
  Music,
  ArrowUp,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { useController, NoteEntryMidiEvent } from '../../contexts/ControllerContext.tsx';
import {
  NOTE_DURATIONS,
  NoteDurationId,
  NoteEntryFormat,
  ROOT_NOTES,
  SCALE_MODES,
  ScaleModeId,
  buildModalKeys,
  buildPianoKeys,
  getRootOption,
  getScaleMode,
  midiNotesToAbcToken,
  midiNotesToJianpuToken,
  midiToAbcPitch,
  midiToJianpuPitch,
  midiToScientificPitch,
  parseAbcScoreContext,
  restToAbcToken,
  restToJianpuToken
} from '../../lib/noteEntryEngine.ts';
import { getErhuKeyInfo } from '../../lib/musojianpu/erhuKeys.ts';
import { noteEntrySynth } from '../../lib/noteEntrySynth.ts';

export interface NoteEntryPanelProps {
  format: NoteEntryFormat;
  content: string;
  /** For Jianpu scores, active key from @key: header (e.g. 'D', 'G', 'C') */
  jianpuKey?: string;
  /** Whether score header is currently in free meter (M:none or @time: free) */
  isFreeMeter?: boolean;
  onInsertToken: (token: string) => void;
  onDeleteLastToken: () => void;
  onApplyKeyToScore?: (rootSemitone: number, modeId: ScaleModeId) => void;
  onToggleFreeMeter?: () => void;
  onClose?: () => void;
  className?: string;
}

const MODE_CATEGORIES: Array<'Chromatic' | 'Church Modes' | 'Minor' | 'Pentatonic & East Asian' | 'Other'> = [
  'Chromatic',
  'Church Modes',
  'Minor',
  'Pentatonic & East Asian',
  'Other',
];

function isEditableElementFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable ||
    el.closest('.cm-editor') !== null
  ) {
    return true;
  }
  return false;
}

export function NoteEntryPanel({
  format,
  content,
  jianpuKey = 'D',
  isFreeMeter = false,
  onInsertToken,
  onDeleteLastToken,
  onApplyKeyToScore,
  onToggleFreeMeter,
  onClose,
  className
}: NoteEntryPanelProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const {
    midiDevices,
    isMidiSupported,
    isMidiActive,
    requestMidiAccess,
    registerNoteEntryMidiHandler,
    setKeyboardShortcutsSuspended
  } = useController();

  // Parse score key / duration context
  const abcContext = useMemo(
    () => (format === 'abc' ? parseAbcScoreContext(content) : null),
    [format, content]
  );

  // Derive initial root & mode from score on first mount
  const initialKeySetup = useMemo(() => {
    if (format === 'abc' && abcContext) {
      return {
        root: abcContext.rootSemitone,
        mode: abcContext.modeId as ScaleModeId,
      };
    }
    const keyInfo = getErhuKeyInfo(jianpuKey);
    return {
      root: ((keyInfo.tonicMidi % 12) + 12) % 12,
      mode: 'major' as ScaleModeId,
    };
  }, []); // intentionally only on mount so user choices persist while editing

  const [rootSemitone, setRootSemitone] = useState<number>(initialKeySetup.root);
  const [baseOctave, setBaseOctave] = useState<number>(4);
  const [modeId, setModeId] = useState<ScaleModeId>(initialKeySetup.mode);
  const [keyboardLayout, setKeyboardLayout] = useState<'modal' | 'piano'>(
    initialKeySetup.mode === 'chromatic' ? 'piano' : 'modal'
  );

  // Duration & entry state
  const [durationId, setDurationId] = useState<NoteDurationId>('quarter');
  const [isDotted, setIsDotted] = useState<boolean>(false);
  const [isTied, setIsTied] = useState<boolean>(false);
  const [entryMode, setEntryMode] = useState<'melody' | 'chord'>('melody');

  // Input capture & audio state
  const [keyboardCaptureEnabled, setKeyboardCaptureEnabled] = useState<boolean>(true);
  const [midiArmed, setMidiArmed] = useState<boolean>(true);
  const [selectedMidiDeviceId, setSelectedMidiDeviceId] = useState<string>('all');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isShiftHeld, setIsShiftHeld] = useState<boolean>(false);
  const [editorHasFocus, setEditorHasFocus] = useState<boolean>(false);

  // Live visual press feedback
  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<number>>(() => new Set());
  const [lastEnteredPreview, setLastEnteredPreview] = useState<{ token: string; pitch: string; source: string } | null>(null);
  const [keyAppliedFeedback, setKeyAppliedFeedback] = useState<boolean>(false);
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('musobuddy_note_entry_compact');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const toggleCompactMode = useCallback(() => {
    setIsCompact(prev => {
      const next = !prev;
      try {
        localStorage.setItem('musobuddy_note_entry_compact', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  // Chord entry buffer (for simultaneous MIDI chord presses or virtual chord stacking)
  const chordBufferRef = useRef<number[]>([]);
  const chordFlushTimerRef = useRef<number | null>(null);
  // Track which MIDI note each QWERTY key code triggered so keyup releases the exact pitch (even if Shift changed mid-hold)
  const pressedCodeToMidiRef = useRef<Map<string, number>>(new Map());
  const panelRef = useRef<HTMLDivElement>(null);

  const rootOpt = useMemo(() => getRootOption(rootSemitone), [rootSemitone]);
  const modeDef = useMemo(() => getScaleMode(modeId), [modeId]);

  const preferFlats = useMemo(() => {
    if (modeDef.preferFlats !== undefined) return modeDef.preferFlats;
    if (format === 'abc' && abcContext) return abcContext.useFlats;
    return rootOpt.preferFlats;
  }, [modeDef.preferFlats, format, abcContext, rootOpt.preferFlats]);

  // Build keys for current view
  const modalKeys = useMemo(
    () => buildModalKeys(rootSemitone, baseOctave, modeId, isShiftHeld, preferFlats),
    [rootSemitone, baseOctave, modeId, isShiftHeld, preferFlats]
  );

  const pianoKeys = useMemo(
    () => buildPianoKeys(rootSemitone, baseOctave, modeId, isShiftHeld, preferFlats),
    [rootSemitone, baseOctave, modeId, isShiftHeld, preferFlats]
  );

  // Sync synth mute state
  useEffect(() => {
    noteEntrySynth.setMuted(!audioEnabled);
  }, [audioEnabled]);

  useEffect(() => {
    return () => {
      noteEntrySynth.stopAll();
      if (chordFlushTimerRef.current) {
        window.clearTimeout(chordFlushTimerRef.current);
      }
    };
  }, []);

  // Suspend global ControllerContext keyboard shortcuts while Note Entry keyboard capture is active
  useEffect(() => {
    setKeyboardShortcutsSuspended(keyboardCaptureEnabled);
    return () => {
      setKeyboardShortcutsSuspended(false);
    };
  }, [keyboardCaptureEnabled, setKeyboardShortcutsSuspended]);

  // Track whether an editable element (like CodeMirror) currently has focus so we can show a clear prompt
  useEffect(() => {
    const updateFocusState = () => {
      setEditorHasFocus(isEditableElementFocused());
    };
    window.addEventListener('focusin', updateFocusState);
    window.addEventListener('focusout', updateFocusState);
    updateFocusState();
    return () => {
      window.removeEventListener('focusin', updateFocusState);
      window.removeEventListener('focusout', updateFocusState);
    };
  }, []);

  // Helper to format a single pitch label in the target score's native notation (shown right on virtual keys)
  const getKeyNotationLabel = useCallback(
    (midi: number) => {
      if (format === 'abc' && abcContext) {
        return midiToAbcPitch(midi, abcContext, preferFlats);
      }
      return midiToJianpuPitch(midi, jianpuKey, preferFlats);
    },
    [format, abcContext, jianpuKey, preferFlats]
  );

  // Commit one or more MIDI notes into the score freely (no meter restrictions)
  const commitMidiNotes = useCallback(
    (midiNotes: number[], source: 'Keyboard' | 'Virtual' | 'MIDI') => {
      if (midiNotes.length === 0) return;
      const token =
        format === 'abc' && abcContext
          ? midiNotesToAbcToken(midiNotes, durationId, isDotted, abcContext, preferFlats, isTied)
          : midiNotesToJianpuToken(midiNotes, durationId, isDotted, jianpuKey, preferFlats, isTied);

      if (!token) return;
      onInsertToken(token);

      const pitchSummary = midiNotes
        .slice()
        .sort((a, b) => a - b)
        .map(m => midiToScientificPitch(m, preferFlats))
        .join('+');

      setLastEnteredPreview({ token, pitch: pitchSummary, source });

      // Reset one-shot tie toggle after applying
      if (isTied) {
        setIsTied(false);
      }
    },
    [format, abcContext, durationId, isDotted, preferFlats, isTied, jianpuKey, onInsertToken]
  );

  // Trigger a note input (handles both instant melody entry and chord buffering)
  const handleNoteInput = useCallback(
    (midi: number, source: 'Keyboard' | 'Virtual' | 'MIDI', velocity: number = 0.8) => {
      noteEntrySynth.noteOn(midi, velocity, source === 'Virtual' ? 0.55 : undefined);
      setActiveMidiNotes(prev => {
        const next = new Set(prev);
        next.add(midi);
        return next;
      });

      if (entryMode === 'chord') {
        if (!chordBufferRef.current.includes(midi)) {
          chordBufferRef.current.push(midi);
        }
        if (chordFlushTimerRef.current) {
          window.clearTimeout(chordFlushTimerRef.current);
        }
        chordFlushTimerRef.current = window.setTimeout(() => {
          const notes = [...chordBufferRef.current];
          chordBufferRef.current = [];
          chordFlushTimerRef.current = null;
          commitMidiNotes(notes, source);
        }, source === 'MIDI' ? 65 : 180);
      } else {
        commitMidiNotes([midi], source);
      }
    },
    [entryMode, commitMidiNotes]
  );

  const handleNoteRelease = useCallback((midi: number) => {
    noteEntrySynth.noteOff(midi);
    setActiveMidiNotes(prev => {
      if (!prev.has(midi)) return prev;
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }, []);

  const handleInsertRest = useCallback(() => {
    const token =
      format === 'abc' && abcContext
        ? restToAbcToken(durationId, isDotted, abcContext)
        : restToJianpuToken(durationId, isDotted);
    onInsertToken(token);
    setLastEnteredPreview({ token, pitch: 'Rest', source: 'Action' });
  }, [format, abcContext, durationId, isDotted, onInsertToken]);

  const handleInsertProlong = useCallback(() => {
    if (format === 'jianpu') {
      onInsertToken('-');
      setLastEnteredPreview({ token: '-', pitch: 'Hold', source: 'Action' });
    } else {
      setIsTied(prev => !prev);
    }
  }, [format, onInsertToken]);

  const handleInsertBarline = useCallback(() => {
    onInsertToken('|');
    setLastEnteredPreview({ token: '|', pitch: 'Barline', source: 'Action' });
  }, [onInsertToken]);

  const handleInsertNewLine = useCallback(() => {
    onInsertToken('\n');
    setLastEnteredPreview({ token: '↵', pitch: 'New Line', source: 'Action' });
  }, [onInsertToken]);

  // Register live MIDI Note On/Off handler via ControllerContext
  const midiHandlerRef = useRef<(ev: NoteEntryMidiEvent) => void>(() => {});
  midiHandlerRef.current = (ev: NoteEntryMidiEvent) => {
    if (!midiArmed) return;
    if (selectedMidiDeviceId !== 'all' && ev.deviceId !== selectedMidiDeviceId) return;

    if (ev.type === 'noteon') {
      const vel = Math.max(0.25, ev.velocity / 127);
      handleNoteInput(ev.note, 'MIDI', vel);
    } else {
      handleNoteRelease(ev.note);
    }
  };

  useEffect(() => {
    if (!midiArmed) {
      registerNoteEntryMidiHandler(null);
      return;
    }
    const bridge = (ev: NoteEntryMidiEvent) => midiHandlerRef.current(ev);
    registerNoteEntryMidiHandler(bridge);
    return () => {
      registerNoteEntryMidiHandler(null);
    };
  }, [midiArmed, registerNoteEntryMidiHandler]);

  // Shift-to-raise-octave & QWERTY virtual keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track Shift state globally so Shift+click on virtual keys works even if focus was elsewhere
      if (e.key === 'Shift') {
        setIsShiftHeld(true);
        return;
      }

      // Allow pressing Escape inside CodeMirror to blur back to Note Entry keyboard play
      if (e.key === 'Escape' && keyboardCaptureEnabled && isEditableElementFocused()) {
        const active = document.activeElement as HTMLElement | null;
        if (active && active.closest('.cm-editor')) {
          active.blur();
          setEditorHasFocus(false);
          e.preventDefault();
          return;
        }
      }

      if (!keyboardCaptureEnabled) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableElementFocused()) return;

      // Sync shift state from event in case Shift was already pressed before focus returned
      if (e.shiftKey !== isShiftHeld) {
        setIsShiftHeld(e.shiftKey);
      }

      // Octave down/up shortcuts: Z / X
      if (e.code === 'KeyZ') {
        e.preventDefault();
        e.stopPropagation();
        setBaseOctave(o => Math.max(2, o - 1));
        return;
      }
      if (e.code === 'KeyX') {
        e.preventDefault();
        e.stopPropagation();
        setBaseOctave(o => Math.min(6, o + 1));
        return;
      }

      // Duration shortcuts: 1-6
      const durMatch = NOTE_DURATIONS.find(d => d.shortcutCode === e.code);
      if (durMatch) {
        e.preventDefault();
        e.stopPropagation();
        setDurationId(durMatch.id);
        return;
      }

      // Dot toggle: .
      if (e.code === 'Period') {
        e.preventDefault();
        e.stopPropagation();
        setIsDotted(prev => !prev);
        return;
      }

      // Rest: Space or 0
      if (e.code === 'Space' || e.code === 'Digit0') {
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) handleInsertRest();
        return;
      }

      // Prolongation dash (Jianpu) or Tie toggle (ABC): Minus
      if (e.code === 'Minus') {
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) handleInsertProlong();
        return;
      }

      // Optional manual barline: Backslash
      if (e.code === 'Backslash') {
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) handleInsertBarline();
        return;
      }

      // New line: Enter
      if (e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) handleInsertNewLine();
        return;
      }

      // Undo / Delete last entered token: Backspace
      if (e.code === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        onDeleteLastToken();
        return;
      }

      // Note key lookup using e.code (reliable even while Shift is held!)
      let targetMidi: number | null = null;
      if (keyboardLayout === 'modal') {
        // Compute with live e.shiftKey in case state update hasn't flushed yet
        const liveKeys = e.shiftKey === isShiftHeld
          ? modalKeys
          : buildModalKeys(rootSemitone, baseOctave, modeId, e.shiftKey, preferFlats);
        const found = liveKeys.find(k => k.shortcutCode === e.code);
        if (found) targetMidi = found.midi;
      } else {
        const liveKeys = e.shiftKey === isShiftHeld
          ? pianoKeys
          : buildPianoKeys(rootSemitone, baseOctave, modeId, e.shiftKey, preferFlats);
        const found = liveKeys.find(k => k.shortcutCode === e.code);
        if (found) targetMidi = found.midi;
      }

      if (targetMidi !== null) {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return; // Don't spam repeated notes while holding key
        pressedCodeToMidiRef.current.set(e.code, targetMidi);
        handleNoteInput(targetMidi, 'Keyboard', 0.8);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftHeld(false);
        return;
      }
      const midi = pressedCodeToMidiRef.current.get(e.code);
      if (midi !== undefined) {
        pressedCodeToMidiRef.current.delete(e.code);
        handleNoteRelease(midi);
      }
    };

    const handleBlur = () => {
      setIsShiftHeld(false);
      for (const midi of pressedCodeToMidiRef.current.values()) {
        handleNoteRelease(midi);
      }
      pressedCodeToMidiRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleBlur);
    };
  }, [
    keyboardCaptureEnabled,
    keyboardLayout,
    isShiftHeld,
    modalKeys,
    pianoKeys,
    rootSemitone,
    baseOctave,
    modeId,
    preferFlats,
    handleNoteInput,
    handleNoteRelease,
    handleInsertRest,
    handleInsertProlong,
    handleInsertBarline,
    handleInsertNewLine,
    onDeleteLastToken
  ]);

  // Sync root/mode from active score header
  const handleSyncFromScore = () => {
    if (format === 'abc' && abcContext) {
      setRootSemitone(abcContext.rootSemitone);
      setModeId(abcContext.modeId);
      setKeyboardLayout(abcContext.modeId === 'chromatic' ? 'piano' : 'modal');
    } else {
      const info = getErhuKeyInfo(jianpuKey);
      setRootSemitone(((info.tonicMidi % 12) + 12) % 12);
    }
  };

  const handleApplyKey = () => {
    if (!onApplyKeyToScore) return;
    onApplyKeyToScore(rootSemitone, modeId);
    setKeyAppliedFeedback(true);
    window.setTimeout(() => setKeyAppliedFeedback(false), 1600);
  };

  const handleModeChange = (nextMode: ScaleModeId) => {
    setModeId(nextMode);
    if (nextMode === 'chromatic') {
      setKeyboardLayout('piano');
    } else if (modeId === 'chromatic') {
      setKeyboardLayout('modal');
    }
  };

  // Focus panel / blur CodeMirror when interacting with virtual keyboard
  const releaseEditorFocus = () => {
    const active = document.activeElement as HTMLElement | null;
    if (active && isEditableElementFocused()) {
      active.blur();
      setEditorHasFocus(false);
    }
  };

  const controlSurface = isDark
    ? 'bg-white/[0.04] border-white/[0.08] text-neutral-200 hover:bg-white/[0.08]'
    : 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:bg-neutral-100';

  const controlHeight = isCompact ? 'h-7' : 'h-8';

  const selectClass = cn(
    controlHeight,
    'px-1.5 rounded-md border text-xs font-medium outline-none cursor-pointer transition-colors',
    isDark
      ? 'bg-[#1D2026] border-white/[0.1] text-neutral-100 hover:border-white/20'
      : 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:border-neutral-300'
  );

  // Separate white & black piano keys for authentic rendering
  const whitePianoKeys = useMemo(() => pianoKeys.filter(k => !k.isBlack), [pianoKeys]);
  const blackPianoKeys = useMemo(() => {
    // Compute exact percentage left position relative to the white key grid
    const totalWhites = whitePianoKeys.length;
    const items: Array<{ key: typeof pianoKeys[number]; leftPercent: number }> = [];
    let whitesSeen = 0;
    for (const k of pianoKeys) {
      if (!k.isBlack) {
        whitesSeen++;
      } else {
        const leftPercent = (whitesSeen / totalWhites) * 100;
        items.push({ key: k, leftPercent });
      }
    }
    return items;
  }, [pianoKeys, whitePianoKeys.length]);

  const effectiveOctaveDisplay = Math.min(7, baseOctave + (isShiftHeld ? 1 : 0));

  return (
    <div
      ref={panelRef}
      className={cn(
        'no-print rounded-xl border overflow-hidden transition-colors select-none',
        isDark
          ? 'bg-[#17191E]/98 border-white/[0.11] text-neutral-200 shadow-2xl shadow-black/50 backdrop-blur-md'
          : 'bg-white/98 border-neutral-200 text-neutral-800 shadow-lg shadow-black/10 backdrop-blur-md',
        className
      )}
    >
      {isCompact ? (
        /* COMPACT MODE: Single ultra-tight studio control bar */
        <div
          className={cn(
            'px-2.5 py-1.5 border-b flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5',
            isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-neutral-200 bg-neutral-50/80'
          )}
        >
          {/* Left cluster: Scale (Root, Oct, Mode) + Durations */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Piano className="w-3.5 h-3.5 text-[#E05A2B] shrink-0" />

            {/* Root */}
            <select
              value={rootSemitone}
              onChange={e => {
                setRootSemitone(parseInt(e.target.value, 10));
                e.target.blur();
              }}
              className={selectClass}
              title="Set modal root note"
            >
              {ROOT_NOTES.map(r => (
                <option key={r.semitone} value={r.semitone} className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Octave Stepper + Shift Indicator */}
            <div
              className={cn(
                'flex items-center h-7 rounded-md border overflow-hidden',
                isShiftHeld
                  ? 'border-[#E05A2B] bg-[#E05A2B]/15'
                  : isDark
                    ? 'bg-[#1D2026] border-white/[0.1]'
                    : 'bg-neutral-50 border-neutral-200'
              )}
              title="Base octave (Z down, X up, hold Shift for +1 octave)"
            >
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  setBaseOctave(o => Math.max(2, o - 1));
                }}
                disabled={baseOctave <= 2}
                className="px-1 h-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                title="Octave Down (Z)"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="px-1 text-[11px] font-mono tabular-nums font-semibold whitespace-nowrap">
                O{baseOctave}
                {isShiftHeld && <span className="text-[#E05A2B] ml-0.5">↑{effectiveOctaveDisplay}</span>}
              </span>
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  setBaseOctave(o => Math.min(6, o + 1));
                }}
                disabled={baseOctave >= 6}
                className="px-1 h-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                title="Octave Up (X)"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Mode */}
            <select
              value={modeId}
              onChange={e => {
                handleModeChange(e.target.value as ScaleModeId);
                e.target.blur();
              }}
              className={cn(selectClass, 'max-w-[138px]')}
              title="Set scale or mode for modal melody entry"
            >
              {MODE_CATEGORIES.map(cat => (
                <optgroup
                  key={cat}
                  label={cat}
                  className={isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-white text-neutral-700'}
                >
                  {SCALE_MODES.filter(m => m.category === cat).map(m => (
                    <option
                      key={m.id}
                      value={m.id}
                      className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}
                    >
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Sync / Apply Key icon buttons */}
            <button
              type="button"
              onClick={() => {
                releaseEditorFocus();
                handleSyncFromScore();
              }}
              className={cn('h-7 w-7 rounded-md border flex items-center justify-center cursor-pointer transition-colors shrink-0', controlSurface)}
              title={format === 'abc' ? `Sync root & mode from score (K:${abcContext?.rawKey || 'C'})` : `Sync root from score (1=${jianpuKey})`}
            >
              <RefreshCw className="w-3 h-3 opacity-75" />
            </button>
            {onApplyKeyToScore && (
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  handleApplyKey();
                }}
                className={cn(
                  'h-7 px-1.5 rounded-md border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0',
                  keyAppliedFeedback
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-500'
                    : controlSurface
                )}
                title={
                  format === 'abc'
                    ? `Write K:${rootOpt.abcRoot}${modeDef.abcModeSuffix} to score header`
                    : `Write @key: ${rootOpt.jianpuKey} to score header`
                }
              >
                {keyAppliedFeedback ? <Check className="w-3 h-3" /> : <Music className="w-3 h-3 text-[#E05A2B]" />}
                <span className="hidden xl:inline">{keyAppliedFeedback ? 'Set' : 'Key'}</span>
              </button>
            )}

            <div className={cn('h-4 w-[1px] hidden md:block', isDark ? 'bg-white/10' : 'bg-neutral-200')} />

            {/* Compact Duration Segmented Strip */}
            <div
              className={cn(
                'flex items-center p-0.5 rounded-md border',
                isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-neutral-100 border-neutral-200'
              )}
              role="group"
              aria-label="Note duration"
            >
              {NOTE_DURATIONS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    releaseEditorFocus();
                    setDurationId(d.id);
                  }}
                  className={cn(
                    'h-6 px-1.5 rounded text-[11px] font-mono tabular-nums font-medium cursor-pointer transition-colors whitespace-nowrap',
                    durationId === d.id
                      ? 'bg-[#E05A2B] text-white'
                      : isDark
                        ? 'text-neutral-300 hover:bg-white/[0.08]'
                        : 'text-neutral-700 hover:bg-white'
                  )}
                  title={`${d.label} note (Shortcut: ${d.shortcutKey})`}
                >
                  {d.shortLabel}
                </button>
              ))}
            </div>

            {/* Dot, Tie, Chord */}
            <button
              type="button"
              onClick={() => {
                releaseEditorFocus();
                setIsDotted(prev => !prev);
              }}
              className={cn(
                'h-7 px-1.5 rounded-md border text-xs font-mono font-bold cursor-pointer transition-colors',
                isDotted ? 'bg-[#E05A2B] border-[#E05A2B] text-white' : controlSurface
              )}
              title="Toggle dotted duration (Shortcut: .)"
            >
              .
            </button>
            <button
              type="button"
              onClick={() => {
                releaseEditorFocus();
                setIsTied(prev => !prev);
              }}
              className={cn(
                'h-7 px-1.5 rounded-md border text-xs font-mono cursor-pointer transition-colors',
                isTied ? 'bg-[#E05A2B] border-[#E05A2B] text-white' : controlSurface
              )}
              title={format === 'abc' ? 'Tie next note (-)' : 'Tie next note (~)'}
            >
              ⌒
            </button>
            <button
              type="button"
              onClick={() => {
                releaseEditorFocus();
                setEntryMode(m => (m === 'melody' ? 'chord' : 'melody'));
              }}
              className={cn(
                'h-7 px-1.5 rounded-md border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap',
                entryMode === 'chord'
                  ? 'bg-[#E05A2B]/15 border-[#E05A2B]/50 text-[#E05A2B]'
                  : controlSurface
              )}
              title={entryMode === 'melody' ? 'Melody mode (click for Chord mode)' : 'Chord mode (click for Melody mode)'}
            >
              <Layers className="w-3 h-3" />
              <span className="hidden xl:inline">{entryMode === 'melody' ? 'Mono' : 'Chord'}</span>
            </button>

            <div className={cn('h-4 w-[1px] hidden md:block', isDark ? 'bg-white/10' : 'bg-neutral-200')} />

            {/* Free-Meter Quick Actions */}
            <button
              type="button"
              onClick={() => {
                releaseEditorFocus();
                handleInsertRest();
              }}
              className={cn('h-7 px-1.5 rounded-md border text-[11px] font-mono font-semibold cursor-pointer transition-colors', controlSurface)}
              title="Insert Rest (Space or 0)"
            >
              <span className="text-[#E05A2B]">{format === 'abc' ? 'z' : '0'}</span>
            </button>
            {format === 'jianpu' && (
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  handleInsertProlong();
                }}
                className={cn('h-7 px-1.5 rounded-md border text-[11px] font-mono font-semibold cursor-pointer transition-colors', controlSurface)}
                title="Insert Hold Dash - (Shortcut: -)"
              >
                –
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                releaseEditorFocus();
                handleInsertBarline();
              }}
              className={cn('h-7 px-1.5 rounded-md border text-[11px] font-mono font-semibold cursor-pointer transition-colors', controlSurface)}
              title="Insert optional Barline | (Shortcut: \)"
            >
              |
            </button>
            <button
              type="button"
              onClick={() => {
                releaseEditorFocus();
                handleInsertNewLine();
              }}
              className={cn('h-7 w-7 rounded-md border flex items-center justify-center cursor-pointer transition-colors', controlSurface)}
              title="New line (Enter)"
            >
              <CornerDownLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                releaseEditorFocus();
                onDeleteLastToken();
              }}
              className={cn('h-7 w-7 rounded-md border flex items-center justify-center cursor-pointer transition-colors', controlSurface)}
              title="Undo last token (Backspace)"
            >
              <Delete className="w-3 h-3" />
            </button>
            {onToggleFreeMeter && (
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  onToggleFreeMeter();
                }}
                className={cn(
                  'h-7 px-1.5 rounded-md border text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap',
                  isFreeMeter
                    ? 'border-[#E05A2B]/50 bg-[#E05A2B]/15 text-[#E05A2B]'
                    : controlSurface
                )}
                title={format === 'abc' ? 'Toggle M:none free-meter header' : 'Toggle @time: free header'}
              >
                {isFreeMeter ? 'Free' : 'Free Meter'}
              </button>
            )}
          </div>

          {/* Right cluster: Modal/Piano, Keys, MIDI, Audio, Expand, Close */}
          <div className="flex flex-wrap items-center gap-1.5">
            {editorHasFocus && keyboardCaptureEnabled && (
              <button
                type="button"
                onClick={releaseEditorFocus}
                className="text-[11px] text-[#E05A2B] font-medium hover:underline cursor-pointer mr-1 whitespace-nowrap"
                title="Text editor is focused — click or press Esc to resume QWERTY note play"
              >
                Esc to play
              </button>
            )}

            {lastEnteredPreview && !(editorHasFocus && keyboardCaptureEnabled) && (
              <span className="hidden 2xl:inline text-[11px] font-mono tabular-nums text-[#E05A2B] font-semibold mr-1">
                {lastEnteredPreview.token}
              </span>
            )}

            {/* Modal vs Piano */}
            <div
              className={cn(
                'flex items-center p-0.5 rounded-md border text-[11px] font-medium shrink-0',
                isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-neutral-100 border-neutral-200'
              )}
            >
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  setKeyboardLayout('modal');
                }}
                className={cn(
                  'px-2 py-0.5 rounded transition-colors cursor-pointer',
                  keyboardLayout === 'modal'
                    ? (isDark ? 'bg-[#E05A2B] text-white' : 'bg-white text-neutral-900 shadow-xs')
                    : (isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900')
                )}
                title="Scale-mapped modal keys"
              >
                Modal
              </button>
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  setKeyboardLayout('piano');
                }}
                className={cn(
                  'px-2 py-0.5 rounded transition-colors cursor-pointer',
                  keyboardLayout === 'piano'
                    ? (isDark ? 'bg-[#E05A2B] text-white' : 'bg-white text-neutral-900 shadow-xs')
                    : (isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900')
                )}
                title="2-octave chromatic piano keyboard"
              >
                Piano
              </button>
            </div>

            {/* QWERTY Capture */}
            <button
              type="button"
              onClick={() => {
                releaseEditorFocus();
                setKeyboardCaptureEnabled(prev => !prev);
              }}
              className={cn(
                'h-7 px-1.5 rounded-md border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0',
                keyboardCaptureEnabled
                  ? 'bg-[#E05A2B]/15 border-[#E05A2B]/50 text-[#E05A2B]'
                  : controlSurface
              )}
              title={keyboardCaptureEnabled ? 'QWERTY shortcuts active (hold Shift for +1 oct)' : 'QWERTY shortcuts paused'}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{keyboardCaptureEnabled ? 'Keys' : 'Off'}</span>
            </button>

            {/* MIDI */}
            {isMidiSupported && (
              midiDevices.length > 0 ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMidiArmed(prev => !prev)}
                    className={cn(
                      'h-7 px-1.5 rounded-md border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0',
                      midiArmed
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : controlSurface
                    )}
                    title={midiArmed ? 'MIDI input active (click to pause)' : 'MIDI paused (click to arm)'}
                  >
                    <Usb className="w-3 h-3" />
                    <span>MIDI</span>
                  </button>
                  <select
                    value={selectedMidiDeviceId}
                    onChange={e => {
                      setSelectedMidiDeviceId(e.target.value);
                      e.target.blur();
                    }}
                    className={cn(selectClass, 'max-w-[105px] truncate')}
                    title="Select MIDI input keyboard"
                  >
                    <option value="all" className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}>
                      All ({midiDevices.length})
                    </option>
                    {midiDevices.map(dev => (
                      <option key={dev.id} value={dev.id} className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}>
                        {dev.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    releaseEditorFocus();
                    requestMidiAccess();
                  }}
                  className={cn('h-7 px-1.5 rounded-md border text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0', controlSurface)}
                  title={isMidiActive ? 'Scan for MIDI keyboards' : 'Connect a MIDI keyboard'}
                >
                  <Usb className="w-3 h-3 opacity-70" />
                  <span className="hidden sm:inline">MIDI</span>
                </button>
              )
            )}

            {/* Audio preview */}
            <button
              type="button"
              onClick={() => {
                releaseEditorFocus();
                setAudioEnabled(prev => !prev);
              }}
              className={cn('h-7 w-7 rounded-md border flex items-center justify-center cursor-pointer transition-colors shrink-0', controlSurface)}
              title={audioEnabled ? 'Mute preview audio' : 'Unmute preview audio'}
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#E05A2B]" /> : <VolumeX className="w-3.5 h-3.5 opacity-50" />}
            </button>

            {/* Expand to Full View */}
            <button
              type="button"
              onClick={() => {
                releaseEditorFocus();
                toggleCompactMode();
              }}
              className={cn('h-7 w-7 rounded-md border flex items-center justify-center cursor-pointer transition-colors shrink-0', controlSurface)}
              title="Switch to expanded keyboard layout"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={cn('h-7 w-7 rounded-md border flex items-center justify-center cursor-pointer transition-colors shrink-0', controlSurface)}
                title="Close Note Entry panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* EXPANDED MODE: Two structured studio rows with full labels */
        <>
          {/* Row 1: Studio Header · Modal Scale Settings · MIDI & Keyboard Input Controls */}
          <div
            className={cn(
              'px-3.5 py-2 border-b flex flex-wrap items-center justify-between gap-x-4 gap-y-2',
              isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-neutral-200 bg-neutral-50/70'
            )}
          >
            {/* Left: Root, Octave, Mode */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 mr-1">
                <Piano className="w-4 h-4 text-[#E05A2B] shrink-0" />
                <span className="text-xs font-semibold tracking-tight whitespace-nowrap">
                  Note Entry
                </span>
              </div>

              <div className={cn('h-4 w-[1px] hidden sm:block', isDark ? 'bg-white/10' : 'bg-neutral-200')} />

              {/* Root Note Picker */}
              <label className="flex items-center gap-1.5 text-xs">
                <span className="text-neutral-500 font-medium whitespace-nowrap">Root</span>
                <select
                  value={rootSemitone}
                  onChange={e => {
                    setRootSemitone(parseInt(e.target.value, 10));
                    e.target.blur();
                  }}
                  className={selectClass}
                  title="Set modal root note"
                >
                  {ROOT_NOTES.map(r => (
                    <option key={r.semitone} value={r.semitone} className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Octave Stepper + Live Shift +1 Oct Indicator */}
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    'flex items-center h-8 rounded-lg border overflow-hidden',
                    isShiftHeld
                      ? 'border-[#E05A2B] bg-[#E05A2B]/10'
                      : isDark
                        ? 'bg-[#1D2026] border-white/[0.1]'
                        : 'bg-neutral-50 border-neutral-200'
                  )}
                  title="Base octave (shortcuts: Z down, X up, hold Shift for +1 octave)"
                >
                  <button
                    type="button"
                    onClick={() => {
                      releaseEditorFocus();
                      setBaseOctave(o => Math.max(2, o - 1));
                    }}
                    disabled={baseOctave <= 2}
                    className="px-1.5 h-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                    title="Octave Down (Z)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 text-xs font-mono tabular-nums font-semibold whitespace-nowrap">
                    Oct {baseOctave}
                    {isShiftHeld && (
                      <span className="text-[#E05A2B] ml-1">→{effectiveOctaveDisplay}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      releaseEditorFocus();
                      setBaseOctave(o => Math.min(6, o + 1));
                    }}
                    disabled={baseOctave >= 6}
                    className="px-1.5 h-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                    title="Octave Up (X)"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Live Shift Indicator */}
                <span
                  className={cn(
                    'hidden xl:inline-flex items-center gap-0.5 text-[11px] font-medium whitespace-nowrap px-1.5 py-1 rounded-md transition-colors',
                    isShiftHeld
                      ? 'bg-[#E05A2B] text-white font-semibold'
                      : isDark
                        ? 'text-neutral-400'
                        : 'text-neutral-500'
                  )}
                  title="Hold Shift while pressing virtual keys or keyboard shortcuts to raise by 1 octave"
                >
                  <ArrowUp className="w-3 h-3" />
                  Shift +1 Oct
                </span>
              </div>

              {/* Mode / Scale Picker */}
              <label className="flex items-center gap-1.5 text-xs">
                <span className="text-neutral-500 font-medium whitespace-nowrap">Mode</span>
                <select
                  value={modeId}
                  onChange={e => {
                    handleModeChange(e.target.value as ScaleModeId);
                    e.target.blur();
                  }}
                  className={cn(selectClass, 'max-w-[190px]')}
                  title="Set scale or mode for modal melody entry"
                >
                  {MODE_CATEGORIES.map(cat => (
                    <optgroup
                      key={cat}
                      label={cat}
                      className={isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-white text-neutral-700'}
                    >
                      {SCALE_MODES.filter(m => m.category === cat).map(m => (
                        <option
                          key={m.id}
                          value={m.id}
                          className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}
                        >
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              {/* Sync / Apply Score Key */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    releaseEditorFocus();
                    handleSyncFromScore();
                  }}
                  className={cn('h-8 px-2 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0', controlSurface)}
                  title={format === 'abc' ? `Sync root & mode from score header (K:${abcContext?.rawKey || 'C'})` : `Sync root from score header (1=${jianpuKey})`}
                >
                  <RefreshCw className="w-3 h-3 opacity-70" />
                  <span className="hidden md:inline">Sync</span>
                </button>
                {onApplyKeyToScore && (
                  <button
                    type="button"
                    onClick={() => {
                      releaseEditorFocus();
                      handleApplyKey();
                    }}
                    className={cn(
                      'h-8 px-2 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0',
                      keyAppliedFeedback
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-500'
                        : controlSurface
                    )}
                    title={
                      format === 'abc'
                        ? `Write K:${rootOpt.abcRoot}${modeDef.abcModeSuffix} to ABC score header`
                        : `Write @key: ${rootOpt.jianpuKey} (1=${rootOpt.jianpuKey}) to Jianpu header`
                    }
                  >
                    {keyAppliedFeedback ? <Check className="w-3 h-3" /> : <Music className="w-3 h-3 text-[#E05A2B]" />}
                    <span className="hidden lg:inline">{keyAppliedFeedback ? 'Applied' : 'Set Key'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Keyboard View Switch, QWERTY Toggle, MIDI Device, Audio, Compact, Close */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Modal Keys vs Piano View Switch */}
              <div
                className={cn(
                  'flex items-center p-0.5 rounded-lg border text-xs font-medium shrink-0',
                  isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-neutral-100 border-neutral-200'
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    releaseEditorFocus();
                    setKeyboardLayout('modal');
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap',
                    keyboardLayout === 'modal'
                      ? (isDark ? 'bg-[#E05A2B] text-white' : 'bg-white text-neutral-900 shadow-xs')
                      : (isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900')
                  )}
                  title="Scale-mapped keys starting on chosen Root & Mode (easy modal entry)"
                >
                  Modal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    releaseEditorFocus();
                    setKeyboardLayout('piano');
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap',
                    keyboardLayout === 'piano'
                      ? (isDark ? 'bg-[#E05A2B] text-white' : 'bg-white text-neutral-900 shadow-xs')
                      : (isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900')
                  )}
                  title="2-octave chromatic piano keyboard with modal notes highlighted"
                >
                  Piano
                </button>
              </div>

              {/* QWERTY Shortcut Capture Toggle */}
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  setKeyboardCaptureEnabled(prev => !prev);
                }}
                className={cn(
                  'h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0',
                  keyboardCaptureEnabled
                    ? 'bg-[#E05A2B]/15 border-[#E05A2B]/50 text-[#E05A2B]'
                    : controlSurface
                )}
                title="Enable or pause computer keyboard note shortcuts"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>{keyboardCaptureEnabled ? 'Keys On' : 'Keys Off'}</span>
              </button>

              {/* MIDI Keyboard Connection & Device Selector */}
              {isMidiSupported ? (
                midiDevices.length > 0 ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMidiArmed(prev => !prev)}
                      className={cn(
                        'h-8 px-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0',
                        midiArmed
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : controlSurface
                      )}
                      title={midiArmed ? 'MIDI keyboard note entry active (click to pause)' : 'MIDI keyboard paused (click to arm)'}
                    >
                      <Usb className="w-3.5 h-3.5" />
                      <span>MIDI</span>
                    </button>
                    <select
                      value={selectedMidiDeviceId}
                      onChange={e => {
                        setSelectedMidiDeviceId(e.target.value);
                        e.target.blur();
                      }}
                      className={cn(selectClass, 'max-w-[140px] truncate')}
                      title="Select MIDI input keyboard"
                    >
                      <option value="all" className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}>
                        All MIDI ({midiDevices.length})
                      </option>
                      {midiDevices.map(dev => (
                        <option key={dev.id} value={dev.id} className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}>
                          {dev.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      releaseEditorFocus();
                      requestMidiAccess();
                    }}
                    className={cn('h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0', controlSurface)}
                    title={isMidiActive ? 'Scan for MIDI keyboards' : 'Connect a USB or Bluetooth MIDI keyboard'}
                  >
                    <Usb className="w-3.5 h-3.5 opacity-70" />
                    <span>Connect MIDI</span>
                  </button>
                )
              ) : (
                <span className="text-[11px] text-neutral-500 whitespace-nowrap" title="Web MIDI API is supported in Chrome, Edge, and Opera">
                  MIDI N/A
                </span>
              )}

              {/* Live Audition Sound Toggle */}
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  setAudioEnabled(prev => !prev);
                }}
                className={cn('h-8 w-8 rounded-lg border flex items-center justify-center cursor-pointer transition-colors shrink-0', controlSurface)}
                title={audioEnabled ? 'Mute note entry preview audio' : 'Unmute note entry preview audio'}
              >
                {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#E05A2B]" /> : <VolumeX className="w-3.5 h-3.5 opacity-50" />}
              </button>

              {/* Compact Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  toggleCompactMode();
                }}
                className={cn('h-8 px-2 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0', controlSurface)}
                title="Switch to compact virtual keyboard"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Compact</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className={cn('h-8 w-8 rounded-lg border flex items-center justify-center cursor-pointer transition-colors shrink-0', controlSurface)}
                  title="Close Note Entry panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Duration Selector, Melody/Chord Mode, & Free-Meter Actions */}
          <div
            className={cn(
              'px-3.5 py-1.5 border-b flex flex-wrap items-center justify-between gap-2',
              isDark ? 'border-white/[0.06] bg-white/[0.01]' : 'border-neutral-100 bg-white'
            )}
          >
            {/* Left: Note Durations + Dot + Tie + Melody/Chord */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={cn(
                  'flex items-center p-0.5 rounded-lg border',
                  isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-neutral-100 border-neutral-200'
                )}
                role="group"
                aria-label="Note duration"
              >
                {NOTE_DURATIONS.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      releaseEditorFocus();
                      setDurationId(d.id);
                    }}
                    className={cn(
                      'h-7 px-2 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap',
                      durationId === d.id
                        ? 'bg-[#E05A2B] text-white'
                        : isDark
                          ? 'text-neutral-300 hover:bg-white/[0.08]'
                          : 'text-neutral-700 hover:bg-white'
                    )}
                    title={`${d.label} note (Shortcut: ${d.shortcutKey})`}
                  >
                    <span className="font-mono tabular-nums">{d.shortLabel}</span>
                    <span className="text-[10px] opacity-60 hidden sm:inline">[{d.shortcutKey}]</span>
                  </button>
                ))}
              </div>

              {/* Dot toggle */}
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  setIsDotted(prev => !prev);
                }}
                className={cn(
                  'h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap',
                  isDotted
                    ? 'bg-[#E05A2B] border-[#E05A2B] text-white'
                    : controlSurface
                )}
                title="Toggle dotted duration (Shortcut: .)"
              >
                <span className="font-mono font-bold">.</span>
                <span>Dot</span>
              </button>

              {/* Tie toggle */}
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  setIsTied(prev => !prev);
                }}
                className={cn(
                  'h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap',
                  isTied
                    ? 'bg-[#E05A2B] border-[#E05A2B] text-white'
                    : controlSurface
                )}
                title={format === 'abc' ? 'Tie next note to following note (-)' : 'Tie next note to following note (~)'}
              >
                <span className="font-mono">⌒</span>
                <span>Tie</span>
              </button>

              {/* Melody (Mono) vs Chord Entry */}
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  setEntryMode(m => (m === 'melody' ? 'chord' : 'melody'));
                }}
                className={cn(
                  'h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap',
                  entryMode === 'chord'
                    ? 'bg-[#E05A2B]/15 border-[#E05A2B]/50 text-[#E05A2B]'
                    : controlSurface
                )}
                title={
                  entryMode === 'melody'
                    ? 'Melody mode: every keypress enters a single note immediately. Click to switch to Chord mode.'
                    : 'Chord mode: simultaneous MIDI or rapid virtual key presses enter as a chord. Click for single-note Melody mode.'
                }
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{entryMode === 'melody' ? 'Melody' : 'Chord'}</span>
              </button>
            </div>

            {/* Right: Free-Meter Entry Actions */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  handleInsertRest();
                }}
                className={cn('h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap', controlSurface)}
                title="Insert Rest (Shortcut: Space or 0)"
              >
                <span className="font-mono font-semibold text-[#E05A2B]">{format === 'abc' ? 'z' : '0'}</span>
                <span>Rest</span>
              </button>

              {format === 'jianpu' && (
                <button
                  type="button"
                  onClick={() => {
                    releaseEditorFocus();
                    handleInsertProlong();
                  }}
                  className={cn('h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap', controlSurface)}
                  title="Insert Prolongation Dash - (Shortcut: -)"
                >
                  <span className="font-mono font-semibold text-[#E05A2B]">–</span>
                  <span>Hold</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  handleInsertBarline();
                }}
                className={cn('h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap', controlSurface)}
                title="Insert optional Barline | (Shortcut: \)"
              >
                <span className="font-mono font-semibold">|</span>
                <span>Bar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  handleInsertNewLine();
                }}
                className={cn('h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap', controlSurface)}
                title="Start a new line (Shortcut: Enter)"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Line</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  releaseEditorFocus();
                  onDeleteLastToken();
                }}
                className={cn('h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap', controlSurface)}
                title="Delete last entered token (Shortcut: Backspace)"
              >
                <Delete className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Undo</span>
              </button>

              {onToggleFreeMeter && (
                <button
                  type="button"
                  onClick={() => {
                    releaseEditorFocus();
                    onToggleFreeMeter();
                  }}
                  className={cn(
                    'h-8 px-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors whitespace-nowrap',
                    isFreeMeter
                      ? 'border-[#E05A2B]/50 bg-[#E05A2B]/15 text-[#E05A2B]'
                      : controlSurface
                  )}
                  title={
                    format === 'abc'
                      ? 'Toggle free-meter header (M:none). Note entry is always free-meter regardless.'
                      : 'Toggle free-rhythm header (@time: free). Note entry is always free-meter regardless.'
                  }
                >
                  {isFreeMeter ? 'Free Meter On' : 'Set Free Meter'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Interactive On-Screen Virtual Keyboard */}
      <div className={isCompact ? 'px-2.5 py-2' : 'px-3.5 py-2.5'}>
        {keyboardLayout === 'modal' ? (
          /* MODAL SCALE KEYBOARD: Direct scale-degree keys starting on Root + Octave (+1 if Shift held) */
          <div className={cn('grid grid-cols-6 sm:grid-cols-11', isCompact ? 'gap-1' : 'gap-1.5')}>
            {modalKeys.map(k => {
              const isPressed = activeMidiNotes.has(k.midi);
              const notationToken = getKeyNotationLabel(k.midi);
              return (
                <button
                  key={`${k.index}-${k.midi}`}
                  type="button"
                  onPointerDown={e => {
                    e.preventDefault();
                    releaseEditorFocus();
                    const liveMidi = e.shiftKey && !isShiftHeld
                      ? Math.min(108, k.midi + 12)
                      : k.midi;
                    handleNoteInput(liveMidi, 'Virtual', 0.82);
                  }}
                  onPointerUp={() => handleNoteRelease(k.midi)}
                  onPointerLeave={() => {
                    if (activeMidiNotes.has(k.midi)) handleNoteRelease(k.midi);
                  }}
                  onPointerCancel={() => handleNoteRelease(k.midi)}
                  className={cn(
                    'relative rounded-lg border flex flex-col items-center justify-between cursor-pointer transition-transform duration-100 active:scale-[0.97] touch-none',
                    isCompact ? 'h-[50px] py-1 px-1' : 'h-[74px] py-1.5 px-1',
                    isPressed
                      ? 'bg-[#E05A2B] border-[#E05A2B] text-white shadow-sm'
                      : k.isRoot
                        ? isDark
                          ? 'bg-[#E05A2B]/15 border-[#E05A2B]/45 text-white hover:bg-[#E05A2B]/25'
                          : 'bg-[#E05A2B]/10 border-[#E05A2B]/40 text-neutral-900 hover:bg-[#E05A2B]/15'
                        : isDark
                          ? 'bg-[#20232A] border-white/[0.1] text-neutral-100 hover:bg-[#272B33] hover:border-white/20'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-900 hover:bg-neutral-100 hover:border-neutral-300'
                  )}
                  title={`${k.pitchName} (Degree ${k.degreeLabel} → ${notationToken}) · Shortcut: ${k.shortcutLabel || ''} · Hold Shift for +1 octave`}
                >
                  {isCompact ? (
                    <>
                      <div className="w-full flex items-center justify-between px-0.5 leading-none">
                        <span
                          className={cn(
                            'text-[9px] font-mono',
                            isPressed ? 'text-white/90' : isDark ? 'text-neutral-400' : 'text-neutral-500'
                          )}
                        >
                          {k.shortcutLabel}
                        </span>
                        <span
                          className={cn(
                            'text-[9px] font-mono tabular-nums',
                            isPressed
                              ? 'text-white/90'
                              : k.isRoot
                                ? 'text-[#E05A2B] font-semibold'
                                : isDark
                                  ? 'text-neutral-400'
                                  : 'text-neutral-500'
                          )}
                        >
                          {k.pitchName}
                        </span>
                      </div>
                      <span className="text-sm font-mono font-bold tabular-nums leading-none pb-0.5">
                        {notationToken}
                      </span>
                    </>
                  ) : (
                    <>
                      {/* Top: QWERTY shortcut key */}
                      <span
                        className={cn(
                          'text-[10px] font-mono leading-none',
                          isPressed
                            ? 'text-white/90'
                            : isDark
                              ? 'text-neutral-400'
                              : 'text-neutral-500'
                        )}
                      >
                        {k.shortcutLabel}
                      </span>

                      {/* Center: Notation token to be inserted */}
                      <span className="text-base font-mono font-bold tabular-nums leading-none">
                        {notationToken}
                      </span>

                      {/* Bottom: Scientific pitch + modal degree */}
                      <div className="flex items-center gap-1 leading-none">
                        <span
                          className={cn(
                            'text-[10px] font-mono tabular-nums font-medium',
                            isPressed
                              ? 'text-white'
                              : k.isRoot
                                ? 'text-[#E05A2B]'
                                : isDark
                                  ? 'text-neutral-300'
                                  : 'text-neutral-700'
                          )}
                        >
                          {k.pitchName}
                        </span>
                        <span
                          className={cn(
                            'text-[9px] font-mono',
                            isPressed ? 'text-white/80' : 'text-neutral-500'
                          )}
                        >
                          {k.isRoot ? 'R' : k.degreeLabel}
                        </span>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* 2-OCTAVE CHROMATIC PIANO KEYBOARD with Root & Mode highlights */
          <div className="w-full overflow-x-auto">
            <div className={cn('relative w-full flex select-none', isCompact ? 'h-[72px] min-w-[460px]' : 'h-[108px] min-w-[560px]')}>
              {/* White Keys */}
              {whitePianoKeys.map(k => {
                const isPressed = activeMidiNotes.has(k.midi);
                const notationToken = getKeyNotationLabel(k.midi);
                return (
                  <button
                    key={k.midi}
                    type="button"
                    onPointerDown={e => {
                      e.preventDefault();
                      releaseEditorFocus();
                      const liveMidi = e.shiftKey && !isShiftHeld
                        ? Math.min(108, k.midi + 12)
                        : k.midi;
                      handleNoteInput(liveMidi, 'Virtual', 0.82);
                    }}
                    onPointerUp={() => handleNoteRelease(k.midi)}
                    onPointerLeave={() => {
                      if (activeMidiNotes.has(k.midi)) handleNoteRelease(k.midi);
                    }}
                    onPointerCancel={() => handleNoteRelease(k.midi)}
                    className={cn(
                      'relative flex-1 h-full border-r border-t border-b first:border-l first:rounded-bl-lg last:rounded-br-lg flex flex-col items-center justify-end px-0.5 cursor-pointer transition-colors duration-75 touch-none',
                      isCompact ? 'pb-1' : 'pb-1.5',
                      isPressed
                        ? 'bg-[#E05A2B] border-[#c8491c] text-white'
                        : k.isRoot
                          ? isDark
                            ? 'bg-[#FFF0EA] border-neutral-400 text-neutral-900 hover:bg-[#FFE4D9]'
                            : 'bg-[#FFF1EC] border-neutral-300 text-neutral-900 hover:bg-[#FFE6DC]'
                          : k.inScale
                            ? 'bg-white border-neutral-300 text-neutral-900 hover:bg-neutral-100'
                            : 'bg-neutral-100/90 border-neutral-300 text-neutral-400 hover:bg-neutral-200/80'
                    )}
                    title={`${k.pitchName} → ${notationToken}${k.degreeLabel ? ` (Mode deg ${k.degreeLabel})` : ''}${k.shortcutLabel ? ` · Key ${k.shortcutLabel}` : ''}`}
                  >
                    {/* In-scale / Root indicator */}
                    {modeId !== 'chromatic' && k.inScale && (
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          isCompact ? 'mb-0.5' : 'mb-1',
                          isPressed
                            ? 'bg-white'
                            : k.isRoot
                              ? 'bg-[#E05A2B]'
                              : 'bg-[#E05A2B]/45'
                        )}
                      />
                    )}
                    <span className={cn('font-mono font-bold leading-none tabular-nums', isCompact ? 'text-[10px]' : 'text-[11px]')}>
                      {notationToken}
                    </span>
                    {!isCompact && (
                      <span
                        className={cn(
                          'text-[9px] font-mono tabular-nums mt-0.5 leading-none',
                          isPressed ? 'text-white/90' : k.isRoot ? 'text-[#E05A2B] font-semibold' : 'opacity-65'
                        )}
                      >
                        {k.pitchName}
                      </span>
                    )}
                    {k.shortcutLabel && (
                      <span
                        className={cn(
                          'font-mono mt-0.5 leading-none',
                          isCompact ? 'text-[8px]' : 'text-[9px]',
                          isPressed ? 'text-white/80' : 'text-neutral-400'
                        )}
                      >
                        {k.shortcutLabel}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Black Keys Overlay */}
              {blackPianoKeys.map(({ key: k, leftPercent }) => {
                const isPressed = activeMidiNotes.has(k.midi);
                const notationToken = getKeyNotationLabel(k.midi);
                return (
                  <button
                    key={k.midi}
                    type="button"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${(100 / whitePianoKeys.length) * 0.64}%`,
                      transform: 'translateX(-50%)',
                    }}
                    onPointerDown={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      releaseEditorFocus();
                      const liveMidi = e.shiftKey && !isShiftHeld
                        ? Math.min(108, k.midi + 12)
                        : k.midi;
                      handleNoteInput(liveMidi, 'Virtual', 0.82);
                    }}
                    onPointerUp={e => {
                      e.stopPropagation();
                      handleNoteRelease(k.midi);
                    }}
                    onPointerLeave={() => {
                      if (activeMidiNotes.has(k.midi)) handleNoteRelease(k.midi);
                    }}
                    onPointerCancel={() => handleNoteRelease(k.midi)}
                    className={cn(
                      'absolute top-0 z-10 rounded-b-md border flex flex-col items-center justify-end px-0.5 cursor-pointer transition-colors duration-75 shadow-sm touch-none',
                      isCompact ? 'h-[56%] pb-1' : 'h-[60%] pb-1.5',
                      isPressed
                        ? 'bg-[#E05A2B] border-[#c8491c] text-white'
                        : k.isRoot
                          ? 'bg-[#3D2219] border-[#E05A2B] text-white hover:bg-[#522D21]'
                          : k.inScale
                            ? 'bg-[#1F232A] border-neutral-700 text-neutral-100 hover:bg-[#2B303A]'
                            : 'bg-[#121418] border-neutral-800 text-neutral-500 hover:bg-[#1E2128]'
                    )}
                    title={`${k.pitchName} → ${notationToken}${k.degreeLabel ? ` (Mode deg ${k.degreeLabel})` : ''}${k.shortcutLabel ? ` · Key ${k.shortcutLabel}` : ''}`}
                  >
                    {modeId !== 'chromatic' && k.inScale && (
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          isCompact ? 'mb-0.5' : 'mb-1',
                          isPressed ? 'bg-white' : k.isRoot ? 'bg-[#E05A2B]' : 'bg-[#E05A2B]/70'
                        )}
                      />
                    )}
                    {!isCompact && (
                      <span className="text-[10px] font-mono font-semibold leading-none tabular-nums">
                        {notationToken}
                      </span>
                    )}
                    {k.shortcutLabel && (
                      <span className={cn('font-mono opacity-70 leading-none', isCompact ? 'text-[8px]' : 'text-[9px] mt-0.5')}>
                        {k.shortcutLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Expanded Footer — Shortcut Cheat Sheet & Live Readout (hidden in compact mode) */}
      {!isCompact && (
        <div
          className={cn(
            'px-3.5 py-1.5 border-t flex flex-wrap items-center justify-between gap-2 text-[11px]',
            isDark ? 'border-white/[0.06] text-neutral-400 bg-white/[0.015]' : 'border-neutral-100 text-neutral-500 bg-neutral-50/50'
          )}
        >
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {editorHasFocus && keyboardCaptureEnabled ? (
              <button
                type="button"
                onClick={releaseEditorFocus}
                className="text-[#E05A2B] font-medium hover:underline cursor-pointer"
              >
                Text editor focused · Click here or press Esc to resume keyboard note entry
              </button>
            ) : (
              <span className="truncate">
                {keyboardLayout === 'modal'
                  ? "A–' play scale · Hold Shift +1 oct · Z/X oct · 1–6 length · . dot · Space rest · \\ bar · Backspace undo"
                  : "A–' & W/E/T/Y/U/O/P piano · Hold Shift +1 oct · Z/X oct · 1–6 length · . dot · Space rest · \\ bar · Backspace undo"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono tabular-nums whitespace-nowrap shrink-0">
            <span>
              {rootOpt.name} {modeDef.name.split(' (')[0]}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {format === 'abc'
                ? `K:${abcContext?.rawKey || 'C'}`
                : `1=${jianpuKey}`}
            </span>
            {lastEnteredPreview && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#E05A2B] font-semibold">
                  {lastEnteredPreview.token} ({lastEnteredPreview.pitch})
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
