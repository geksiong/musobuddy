/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useScores } from './ScoreContext.tsx';
import { useAudio } from './AudioContext.tsx';
import { useAccompaniment } from './AccompanimentContext.tsx';
import { useMetronome } from '../hooks/useMetronome.ts';
import { useDrone } from '../hooks/useDrone.ts';

export type ActionId =
  | 'WAYPOINT_NEXT'
  | 'WAYPOINT_PREV'
  | 'WAYPOINT_ADD'
  | 'PAGE_NEXT'
  | 'PAGE_PREV'
  | 'PAGE_UP'
  | 'PAGE_DOWN'
  | 'PAGE_HOME'
  | 'PAGE_END'
  | 'METRONOME_TOGGLE'
  | 'ACCOMPANIMENT_TOGGLE'
  | 'DRONE_TOGGLE'
  | 'AUDIO_TOGGLE'
  | 'STOP_ALL'
  | 'TEMPO_UP'
  | 'TEMPO_DOWN'
  | 'SCORE_NEXT'
  | 'SCORE_PREV'
  | 'DISTRACTION_FREE_TOGGLE';

export type ActionCategory = 'waypoints' | 'navigation' | 'audio' | 'tempo' | 'app';

export interface ActionDefinition {
  id: ActionId;
  label: string;
  category: 'waypoints' | 'navigation' | 'audio' | 'tempo' | 'app';
  description: string;
  defaultKeyboardKey: string;
  defaultKeyboardDisplay: string;
  defaultGamepadButton: number | null;
  defaultGamepadLabel: string;
  defaultMidiType?: 'cc' | 'note' | 'program';
  defaultMidiNumber?: number;
  defaultMidiDisplay?: string;
}

export const ACTION_DEFINITIONS: ActionDefinition[] = [
  // Bookmark Navigation
  {
    id: 'WAYPOINT_NEXT',
    label: 'Next Bookmark',
    category: 'waypoints',
    description: 'Jump to the next saved bookmark in the active score',
    defaultKeyboardKey: 'KeyW',
    defaultKeyboardDisplay: 'W',
    defaultGamepadButton: 5, // RB / R1
    defaultGamepadLabel: 'RB / R1',
    defaultMidiType: 'note',
    defaultMidiNumber: 62, // D4
    defaultMidiDisplay: 'Note 62 (D4)'
  },
  {
    id: 'WAYPOINT_PREV',
    label: 'Previous Bookmark',
    category: 'waypoints',
    description: 'Jump to the previous saved bookmark in the active score',
    defaultKeyboardKey: 'KeyQ',
    defaultKeyboardDisplay: 'Q',
    defaultGamepadButton: 4, // LB / L1
    defaultGamepadLabel: 'LB / L1',
    defaultMidiType: 'note',
    defaultMidiNumber: 60, // C4
    defaultMidiDisplay: 'Note 60 (C4)'
  },
  {
    id: 'WAYPOINT_ADD',
    label: 'Add / Toggle Bookmark',
    category: 'waypoints',
    description: 'Save a bookmark marker at the current score page',
    defaultKeyboardKey: 'KeyE',
    defaultKeyboardDisplay: 'E',
    defaultGamepadButton: 8, // Select / Share
    defaultGamepadLabel: 'Back / Select',
    defaultMidiType: 'note',
    defaultMidiNumber: 64, // E4
    defaultMidiDisplay: 'Note 64 (E4)'
  },

  // Page Navigation
  {
    id: 'PAGE_NEXT',
    label: 'Next Page / Flip Forward',
    category: 'navigation',
    description: 'Turn to the next page or scroll ahead in the current score',
    defaultKeyboardKey: 'PageDown',
    defaultKeyboardDisplay: 'PageDown',
    defaultGamepadButton: 15, // D-Pad Right
    defaultGamepadLabel: 'D-Pad Right',
    defaultMidiType: 'cc',
    defaultMidiNumber: 64, // Sustain Pedal
    defaultMidiDisplay: 'CC 64 (Sustain / Pedal 1)'
  },
  {
    id: 'PAGE_PREV',
    label: 'Previous Page / Flip Back',
    category: 'navigation',
    description: 'Turn to the previous page or scroll back in the current score',
    defaultKeyboardKey: 'PageUp',
    defaultKeyboardDisplay: 'PageUp',
    defaultGamepadButton: 14, // D-Pad Left
    defaultGamepadLabel: 'D-Pad Left',
    defaultMidiType: 'cc',
    defaultMidiNumber: 67, // Soft Pedal
    defaultMidiDisplay: 'CC 67 (Soft Pedal / Pedal 2)'
  },
  {
    id: 'PAGE_UP',
    label: 'Scroll Score Up',
    category: 'navigation',
    description: 'Scroll score view upwards by page fraction',
    defaultKeyboardKey: 'ArrowUp',
    defaultKeyboardDisplay: '↑ Up Arrow',
    defaultGamepadButton: 12, // D-Pad Up
    defaultGamepadLabel: 'D-Pad Up',
  },
  {
    id: 'PAGE_DOWN',
    label: 'Scroll Score Down',
    category: 'navigation',
    description: 'Scroll score view downwards by page fraction',
    defaultKeyboardKey: 'ArrowDown',
    defaultKeyboardDisplay: '↓ Down Arrow',
    defaultGamepadButton: 13, // D-Pad Down
    defaultGamepadLabel: 'D-Pad Down',
  },
  {
    id: 'PAGE_HOME',
    label: 'First Page / Beginning',
    category: 'navigation',
    description: 'Jump immediately to page 1 or top of score',
    defaultKeyboardKey: 'Home',
    defaultKeyboardDisplay: 'Home',
    defaultGamepadButton: 10, // Left Thumbstick Click
    defaultGamepadLabel: 'L3 (Stick Click)',
  },
  {
    id: 'PAGE_END',
    label: 'Last Page / Score End',
    category: 'navigation',
    description: 'Jump immediately to the final page or bottom of score',
    defaultKeyboardKey: 'End',
    defaultKeyboardDisplay: 'End',
    defaultGamepadButton: 11, // Right Thumbstick Click
    defaultGamepadLabel: 'R3 (Stick Click)',
  },

  // Audio & Practice Tools
  {
    id: 'METRONOME_TOGGLE',
    label: 'Start / Stop Metronome',
    category: 'audio',
    description: 'Toggle the high-precision audio metronome on/off',
    defaultKeyboardKey: 'KeyM',
    defaultKeyboardDisplay: 'M',
    defaultGamepadButton: 2, // X / Square
    defaultGamepadLabel: 'X / □',
    defaultMidiType: 'note',
    defaultMidiNumber: 36, // Bass Drum
    defaultMidiDisplay: 'Note 36 (C2)'
  },
  {
    id: 'ACCOMPANIMENT_TOGGLE',
    label: 'Start / Stop Accompaniment',
    category: 'audio',
    description: 'Toggle the accompaniment backing rhythm / chords on/off',
    defaultKeyboardKey: 'KeyA',
    defaultKeyboardDisplay: 'A',
    defaultGamepadButton: 3, // Y / Triangle
    defaultGamepadLabel: 'Y / △',
    defaultMidiType: 'note',
    defaultMidiNumber: 38,
    defaultMidiDisplay: 'Note 38 (D2)'
  },
  {
    id: 'DRONE_TOGGLE',
    label: 'Start / Stop Drone',
    category: 'audio',
    description: 'Toggle the practice drone tone sustained audio on/off',
    defaultKeyboardKey: 'KeyD',
    defaultKeyboardDisplay: 'D',
    defaultGamepadButton: 0, // A / Cross
    defaultGamepadLabel: 'A / ✕',
    defaultMidiType: 'note',
    defaultMidiNumber: 40,
    defaultMidiDisplay: 'Note 40 (E2)'
  },
  {
    id: 'AUDIO_TOGGLE',
    label: 'Start / Stop Audio Playback',
    category: 'audio',
    description: 'Play or pause the current score audio / loaded backing track',
    defaultKeyboardKey: 'Space',
    defaultKeyboardDisplay: 'Spacebar',
    defaultGamepadButton: 1, // B / Circle
    defaultGamepadLabel: 'B / ○',
    defaultMidiType: 'cc',
    defaultMidiNumber: 66,
    defaultMidiDisplay: 'CC 66 (Sostenuto)'
  },
  {
    id: 'STOP_ALL',
    label: 'Stop All Audio Playback',
    category: 'audio',
    description: 'Instantly silence all metronome, backing, drone, and track audio',
    defaultKeyboardKey: 'Escape',
    defaultKeyboardDisplay: 'Esc',
    defaultGamepadButton: 9, // Start / Options
    defaultGamepadLabel: 'Start / Menu',
    defaultMidiType: 'cc',
    defaultMidiNumber: 123,
    defaultMidiDisplay: 'CC 123 (All Notes Off)'
  },

  // Tempo Control
  {
    id: 'TEMPO_UP',
    label: 'Increase Tempo (+2 BPM)',
    category: 'tempo',
    description: 'Speed up practice tempo by 2 BPM',
    defaultKeyboardKey: 'BracketRight',
    defaultKeyboardDisplay: ']',
    defaultGamepadButton: 7, // RT / R2
    defaultGamepadLabel: 'RT / R2',
  },
  {
    id: 'TEMPO_DOWN',
    label: 'Decrease Tempo (-2 BPM)',
    category: 'tempo',
    description: 'Slow down practice tempo by 2 BPM',
    defaultKeyboardKey: 'BracketLeft',
    defaultKeyboardDisplay: '[',
    defaultGamepadButton: 6, // LT / L2
    defaultGamepadLabel: 'LT / L2',
  },

  // App Controls
  {
    id: 'SCORE_NEXT',
    label: 'Next Loaded Score',
    category: 'app',
    description: 'Switch to the next music score in your loaded library',
    defaultKeyboardKey: 'Period',
    defaultKeyboardDisplay: '.',
    defaultGamepadButton: null,
    defaultGamepadLabel: 'Unmapped',
  },
  {
    id: 'SCORE_PREV',
    label: 'Previous Loaded Score',
    category: 'app',
    description: 'Switch to the previous music score in your loaded library',
    defaultKeyboardKey: 'Comma',
    defaultKeyboardDisplay: ',',
    defaultGamepadButton: null,
    defaultGamepadLabel: 'Unmapped',
  },
  {
    id: 'DISTRACTION_FREE_TOGGLE',
    label: 'Toggle No Distraction Mode',
    category: 'app',
    description: 'Enter or exit full-screen clean performance mode',
    defaultKeyboardKey: 'KeyF',
    defaultKeyboardDisplay: 'F',
    defaultGamepadButton: null,
    defaultGamepadLabel: 'Unmapped',
  },
];

export interface ActionMapping {
  keyboardKey: string; // e.g. "KeyW"
  keyboardDisplay: string; // e.g. "W"
  gamepadButton: number | null; // e.g. 5
  gamepadLabel?: string;
  midiType?: 'cc' | 'note' | 'program';
  midiNumber?: number; // e.g. 64
  midiDisplay?: string;
}

export type MappingsMap = Record<ActionId, ActionMapping>;

export interface ConnectedMidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state?: string;
}

export interface ConnectedGamepadDevice {
  id: string;
  index: number;
  name: string;
  buttonsCount: number;
  axesCount: number;
  connected: boolean;
}

export interface ControllerToast {
  id: string;
  title: string;
  subtitle?: string;
  type: 'waypoint' | 'audio' | 'tempo' | 'page' | 'device';
  timestamp: number;
}

interface ControllerContextType {
  mappings: MappingsMap;
  updateMapping: (actionId: ActionId, updates: Partial<ActionMapping>) => void;
  resetAllMappings: () => void;
  resetActionMapping: (actionId: ActionId) => void;
  
  // Device lists
  gamepads: ConnectedGamepadDevice[];
  midiDevices: ConnectedMidiDevice[];
  isMidiSupported: boolean;
  isMidiActive: boolean;
  requestMidiAccess: () => Promise<boolean>;

  // Learn / Rebind mode
  learningTarget: {
    actionId: ActionId;
    type: 'keyboard' | 'gamepad' | 'midi';
  } | null;
  startLearning: (actionId: ActionId, type: 'keyboard' | 'gamepad' | 'midi') => void;
  cancelLearning: () => void;

  // Last input activity indicator
  lastActivity: {
    source: 'keyboard' | 'gamepad' | 'midi';
    detail: string;
    timestamp: number;
  } | null;

  // HUD Toasts
  activeToast: ControllerToast | null;
  triggerToast: (toast: Omit<ControllerToast, 'id' | 'timestamp'>) => void;

  // Modal State
  isControllerModalOpen: boolean;
  setIsControllerModalOpen: (open: boolean) => void;
  toggleControllerModal: () => void;

  // Execute Action programmatically
  executeAction: (actionId: ActionId) => void;
}

const STORAGE_KEY = 'musobuddy_controller_mappings_v2';

const getDefaultMappings = (): MappingsMap => {
  const result = {} as MappingsMap;
  ACTION_DEFINITIONS.forEach(def => {
    result[def.id] = {
      keyboardKey: def.defaultKeyboardKey,
      keyboardDisplay: def.defaultKeyboardDisplay,
      gamepadButton: def.defaultGamepadButton,
      gamepadLabel: def.defaultGamepadLabel,
      midiType: def.defaultMidiType,
      midiNumber: def.defaultMidiNumber,
      midiDisplay: def.defaultMidiDisplay,
    };
  });
  return result;
};

const getButtonStandardLabel = (idx: number): string => {
  switch (idx) {
    case 0: return 'A / ✕';
    case 1: return 'B / ○';
    case 2: return 'X / □';
    case 3: return 'Y / △';
    case 4: return 'LB / L1';
    case 5: return 'RB / R1';
    case 6: return 'LT / L2';
    case 7: return 'RT / R2';
    case 8: return 'Back / Select';
    case 9: return 'Start / Menu';
    case 10: return 'L3 (Stick Click)';
    case 11: return 'R3 (Stick Click)';
    case 12: return 'D-Pad Up';
    case 13: return 'D-Pad Down';
    case 14: return 'D-Pad Left';
    case 15: return 'D-Pad Right';
    case 16: return 'Guide / Home';
    default: return `Button ${idx}`;
  }
};

const formatKeyDisplay = (code: string, key: string): string => {
  if (code.startsWith('Key')) return code.substring(3).toUpperCase();
  if (code.startsWith('Digit')) return code.substring(5);
  if (code === 'Space') return 'Spacebar';
  if (code === 'ArrowUp') return '↑ Up';
  if (code === 'ArrowDown') return '↓ Down';
  if (code === 'ArrowLeft') return '← Left';
  if (code === 'ArrowRight') return '→ Right';
  if (code === 'BracketLeft') return '[';
  if (code === 'BracketRight') return ']';
  if (code === 'Period') return '.';
  if (code === 'Comma') return ',';
  if (code === 'Escape') return 'Esc';
  if (key && key.length === 1) return key.toUpperCase();
  return code || key;
};

const ControllerContext = createContext<ControllerContextType | undefined>(undefined);

export function ControllerProvider({ children }: { children: React.ReactNode }) {
  const { 
    scores, 
    activeScoreId, 
    setActiveScoreId, 
    nextWaypoint, 
    prevWaypoint, 
    addWaypoint, 
    currentPage, 
    jumpToPage, 
    scrollScore, 
    toggleDistractionFree,
    toggleAudioPlayback,
    totalPages
  } = useScores();

  const { isMetronomePlaying, startMetronome, stopMetronome, metronomeBpm, setMetronomeBpm } = useAudio();
  const { isPlaying: isAccompanimentPlaying, setIsPlaying: setIsAccompanimentPlaying } = useAccompaniment();
  const { isDronePlaying, setIsDronePlaying } = useDrone();

  const [mappings, setMappings] = useState<MappingsMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const defaults = getDefaultMappings();
        // Merge in case new actions were added
        return { ...defaults, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to parse saved controller mappings:', e);
    }
    return getDefaultMappings();
  });

  const [gamepads, setGamepads] = useState<ConnectedGamepadDevice[]>([]);
  const [midiDevices, setMidiDevices] = useState<ConnectedMidiDevice[]>([]);
  const [isMidiSupported] = useState<boolean>(() => typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator);
  const [isMidiActive, setIsMidiActive] = useState<boolean>(false);
  const [isControllerModalOpen, setIsControllerModalOpen] = useState<boolean>(false);
  const [learningTarget, setLearningTarget] = useState<{ actionId: ActionId; type: 'keyboard' | 'gamepad' | 'midi' } | null>(null);
  const [lastActivity, setLastActivity] = useState<{ source: 'keyboard' | 'gamepad' | 'midi'; detail: string; timestamp: number } | null>(null);
  const [activeToast, setActiveToast] = useState<ControllerToast | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Fresh refs to prevent stale closure loops
  const mappingsRef = useRef(mappings);
  mappingsRef.current = mappings;

  const learningTargetRef = useRef(learningTarget);
  learningTargetRef.current = learningTarget;

  const prevGamepadButtonsRef = useRef<{ [gamepadIndex: number]: boolean[] }>({});
  const animationFrameRef = useRef<number | null>(null);
  const midiAccessRef = useRef<any>(null);

  const triggerToast = useCallback((toastData: Omit<ControllerToast, 'id' | 'timestamp'>) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    const newToast: ControllerToast = {
      ...toastData,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now()
    };
    setActiveToast(newToast);
    toastTimeoutRef.current = window.setTimeout(() => {
      setActiveToast(null);
    }, 2800);
  }, []);

  // Save mappings to localStorage
  const saveMappings = useCallback((newMappings: MappingsMap) => {
    setMappings(newMappings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMappings));
    } catch (e) {
      console.error('Failed to save controller mappings:', e);
    }
  }, []);

  const updateMapping = useCallback((actionId: ActionId, updates: Partial<ActionMapping>) => {
    setMappings(prev => {
      const updated = {
        ...prev,
        [actionId]: {
          ...prev[actionId],
          ...updates
        }
      };
      saveMappings(updated);
      return updated;
    });
  }, [saveMappings]);

  const resetAllMappings = useCallback(() => {
    const defaults = getDefaultMappings();
    saveMappings(defaults);
    triggerToast({
      title: 'Controls Reset',
      subtitle: 'All controller and keyboard mappings restored to defaults',
      type: 'device'
    });
  }, [saveMappings, triggerToast]);

  const resetActionMapping = useCallback((actionId: ActionId) => {
    const def = ACTION_DEFINITIONS.find(d => d.id === actionId);
    if (!def) return;
    updateMapping(actionId, {
      keyboardKey: def.defaultKeyboardKey,
      keyboardDisplay: def.defaultKeyboardDisplay,
      gamepadButton: def.defaultGamepadButton,
      gamepadLabel: def.defaultGamepadLabel,
      midiType: def.defaultMidiType,
      midiNumber: def.defaultMidiNumber,
      midiDisplay: def.defaultMidiDisplay,
    });
  }, [updateMapping]);

  const startLearning = useCallback((actionId: ActionId, type: 'keyboard' | 'gamepad' | 'midi') => {
    setLearningTarget({ actionId, type });
  }, []);

  const cancelLearning = useCallback(() => {
    setLearningTarget(null);
  }, []);

  const toggleControllerModal = useCallback(() => {
    setIsControllerModalOpen(open => !open);
  }, []);

  // Action Dispatcher
  const executeAction = useCallback((actionId: ActionId) => {
    switch (actionId) {
      case 'WAYPOINT_NEXT': {
        const target = nextWaypoint();
        if (target) {
          triggerToast({
            title: `🔖 Bookmark: ${target.title}`,
            subtitle: `Page ${target.page}`,
            type: 'waypoint'
          });
        } else {
          triggerToast({
            title: 'No Bookmarks Set',
            subtitle: 'Press Add Bookmark to bookmark current page',
            type: 'waypoint'
          });
        }
        break;
      }
      case 'WAYPOINT_PREV': {
        const target = prevWaypoint();
        if (target) {
          triggerToast({
            title: `🔖 Bookmark: ${target.title}`,
            subtitle: `Page ${target.page}`,
            type: 'waypoint'
          });
        } else {
          triggerToast({
            title: 'No Bookmarks Set',
            subtitle: 'Press Add Bookmark to bookmark current page',
            type: 'waypoint'
          });
        }
        break;
      }
      case 'WAYPOINT_ADD': {
        const newWp = addWaypoint(currentPage);
        triggerToast({
          title: `🔖 Bookmark Saved: ${newWp.title}`,
          subtitle: `Page ${currentPage}`,
          type: 'waypoint'
        });
        break;
      }
      case 'PAGE_NEXT': {
        jumpToPage(currentPage + 1);
        triggerToast({
          title: `Next Page`,
          subtitle: `Page ${currentPage + 1}`,
          type: 'page'
        });
        break;
      }
      case 'PAGE_PREV': {
        if (currentPage > 1) {
          jumpToPage(currentPage - 1);
          triggerToast({
            title: `Previous Page`,
            subtitle: `Page ${currentPage - 1}`,
            type: 'page'
          });
        }
        break;
      }
      case 'PAGE_UP': {
        scrollScore('up');
        break;
      }
      case 'PAGE_DOWN': {
        scrollScore('down');
        break;
      }
      case 'PAGE_HOME': {
        jumpToPage(1);
        scrollScore('home');
        triggerToast({
          title: 'First Page',
          subtitle: 'Page 1',
          type: 'page'
        });
        break;
      }
      case 'PAGE_END': {
        jumpToPage(totalPages || 999);
        scrollScore('end');
        triggerToast({
          title: 'Last Page',
          subtitle: `End of Score`,
          type: 'page'
        });
        break;
      }
      case 'METRONOME_TOGGLE': {
        if (isMetronomePlaying) {
          stopMetronome();
          triggerToast({
            title: 'Metronome Stopped',
            type: 'audio'
          });
        } else {
          startMetronome();
          triggerToast({
            title: 'Metronome Started',
            subtitle: `${metronomeBpm} BPM`,
            type: 'audio'
          });
        }
        break;
      }
      case 'ACCOMPANIMENT_TOGGLE': {
        const next = !isAccompanimentPlaying;
        setIsAccompanimentPlaying(next);
        triggerToast({
          title: next ? 'Accompaniment Started' : 'Accompaniment Stopped',
          subtitle: next ? `${metronomeBpm} BPM Backing Engine` : undefined,
          type: 'audio'
        });
        break;
      }
      case 'DRONE_TOGGLE': {
        const next = !isDronePlaying;
        setIsDronePlaying(next);
        triggerToast({
          title: next ? 'Drone Tone Started' : 'Drone Tone Stopped',
          type: 'audio'
        });
        break;
      }
      case 'AUDIO_TOGGLE': {
        toggleAudioPlayback();
        triggerToast({
          title: 'Audio Playback Toggled',
          type: 'audio'
        });
        break;
      }
      case 'STOP_ALL': {
        if (isMetronomePlaying) stopMetronome();
        if (isAccompanimentPlaying) setIsAccompanimentPlaying(false);
        if (isDronePlaying) setIsDronePlaying(false);
        triggerToast({
          title: 'Silence: All Audio Stopped',
          type: 'audio'
        });
        break;
      }
      case 'TEMPO_UP': {
        const newBpm = Math.min(300, metronomeBpm + 2);
        setMetronomeBpm(newBpm);
        triggerToast({
          title: `Tempo: ${newBpm} BPM (+2)`,
          type: 'tempo'
        });
        break;
      }
      case 'TEMPO_DOWN': {
        const newBpm = Math.max(30, metronomeBpm - 2);
        setMetronomeBpm(newBpm);
        triggerToast({
          title: `Tempo: ${newBpm} BPM (-2)`,
          type: 'tempo'
        });
        break;
      }
      case 'SCORE_NEXT': {
        if (scores.length > 1 && activeScoreId) {
          const idx = scores.findIndex(s => s.id === activeScoreId);
          const nextIdx = (idx + 1) % scores.length;
          const targetScore = scores[nextIdx];
          setActiveScoreId(targetScore.id);
          triggerToast({
            title: `Score: ${targetScore.title}`,
            subtitle: `${targetScore.format.toUpperCase()} (${nextIdx + 1}/${scores.length})`,
            type: 'device'
          });
        }
        break;
      }
      case 'SCORE_PREV': {
        if (scores.length > 1 && activeScoreId) {
          const idx = scores.findIndex(s => s.id === activeScoreId);
          const prevIdx = (idx - 1 + scores.length) % scores.length;
          const targetScore = scores[prevIdx];
          setActiveScoreId(targetScore.id);
          triggerToast({
            title: `Score: ${targetScore.title}`,
            subtitle: `${targetScore.format.toUpperCase()} (${prevIdx + 1}/${scores.length})`,
            type: 'device'
          });
        }
        break;
      }
      case 'DISTRACTION_FREE_TOGGLE': {
        toggleDistractionFree();
        break;
      }
      default:
        break;
    }
  }, [
    nextWaypoint,
    prevWaypoint,
    addWaypoint,
    currentPage,
    jumpToPage,
    scrollScore,
    totalPages,
    isMetronomePlaying,
    stopMetronome,
    startMetronome,
    metronomeBpm,
    isAccompanimentPlaying,
    setIsAccompanimentPlaying,
    isDronePlaying,
    setIsDronePlaying,
    toggleAudioPlayback,
    setMetronomeBpm,
    scores,
    activeScoreId,
    setActiveScoreId,
    toggleDistractionFree,
    triggerToast
  ]);

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea, select, or CodeMirror editor
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        (activeEl as HTMLElement).isContentEditable ||
        activeEl.closest('.cm-editor') !== null
      )) {
        return;
      }

      // Check if we are currently in Learning Mode for Keyboard
      if (learningTargetRef.current) {
        if (learningTargetRef.current.type === 'keyboard') {
          e.preventDefault();
          e.stopPropagation();
          const targetAction = learningTargetRef.current.actionId;
          const display = formatKeyDisplay(e.code, e.key);
          updateMapping(targetAction, {
            keyboardKey: e.code,
            keyboardDisplay: display
          });
          setLearningTarget(null);
          setLastActivity({
            source: 'keyboard',
            detail: display,
            timestamp: Date.now()
          });
          triggerToast({
            title: 'Shortcut Assigned',
            subtitle: `Mapped ${display} to ${ACTION_DEFINITIONS.find(d => d.id === targetAction)?.label}`,
            type: 'device'
          });
          return;
        }
      }

      // Match against mapped keyboard keys
      const currentMap = mappingsRef.current;
      for (const [actionId, mapping] of Object.entries(currentMap) as [ActionId, ActionMapping][]) {
        if (mapping.keyboardKey === e.code || mapping.keyboardKey === e.key) {
          e.preventDefault();
          setLastActivity({
            source: 'keyboard',
            detail: mapping.keyboardDisplay,
            timestamp: Date.now()
          });
          executeAction(actionId);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [executeAction, updateMapping, triggerToast]);

  // Gamepad Polling Loop
  useEffect(() => {
    let isRunning = true;

    const scanGamepads = () => {
      if (!navigator.getGamepads) return;
      const rawPads = navigator.getGamepads();
      const padList: ConnectedGamepadDevice[] = [];

      for (let i = 0; i < rawPads.length; i++) {
        const pad = rawPads[i];
        if (pad && pad.connected) {
          padList.push({
            id: pad.id,
            index: pad.index,
            name: pad.id,
            buttonsCount: pad.buttons.length,
            axesCount: pad.axes.length,
            connected: pad.connected
          });

          // Check button states for pressed edges
          if (!prevGamepadButtonsRef.current[pad.index]) {
            prevGamepadButtonsRef.current[pad.index] = pad.buttons.map(b => b.pressed);
          }

          pad.buttons.forEach((btn, btnIdx) => {
            const wasPressed = prevGamepadButtonsRef.current[pad.index]?.[btnIdx] || false;
            const isPressed = btn.pressed || btn.value > 0.5;

            // Edge: Just pressed
            if (isPressed && !wasPressed) {
              const label = getButtonStandardLabel(btnIdx);
              setLastActivity({
                source: 'gamepad',
                detail: `${pad.id.substring(0, 16)} · ${label}`,
                timestamp: Date.now()
              });

              // Check if we are in Learning Mode for Gamepad
              if (learningTargetRef.current && learningTargetRef.current.type === 'gamepad') {
                const targetAction = learningTargetRef.current.actionId;
                updateMapping(targetAction, {
                  gamepadButton: btnIdx,
                  gamepadLabel: label
                });
                setLearningTarget(null);
                triggerToast({
                  title: 'Gamepad Button Assigned',
                  subtitle: `Mapped ${label} to ${ACTION_DEFINITIONS.find(d => d.id === targetAction)?.label}`,
                  type: 'device'
                });
              } else {
                // Find matching action
                const currentMap = mappingsRef.current;
                for (const [actionId, mapping] of Object.entries(currentMap) as [ActionId, ActionMapping][]) {
                  if (mapping.gamepadButton === btnIdx) {
                    executeAction(actionId);
                    break;
                  }
                }
              }
            }

            prevGamepadButtonsRef.current[pad.index][btnIdx] = isPressed;
          });
        }
      }

      setGamepads(prev => {
        if (prev.length !== padList.length) return padList;
        return prev;
      });

      if (isRunning) {
        animationFrameRef.current = requestAnimationFrame(scanGamepads);
      }
    };

    const handleGamepadConnected = (e: GamepadEvent) => {
      triggerToast({
        title: 'Gamepad Connected',
        subtitle: e.gamepad.id,
        type: 'device'
      });
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      triggerToast({
        title: 'Gamepad Disconnected',
        subtitle: e.gamepad.id,
        type: 'device'
      });
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    animationFrameRef.current = requestAnimationFrame(scanGamepads);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    };
  }, [executeAction, updateMapping, triggerToast]);

  // Web MIDI Setup and Listener
  const handleMidiMessage = useCallback((event: any) => {
    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0];
    const messageType = status >> 4;
    const channel = (status & 0x0f) + 1;
    const byte1 = data[1];
    const byte2 = data.length > 2 ? data[2] : 0;

    let isTrigger = false;
    let type: 'note' | 'cc' | 'program' = 'note';
    let number = byte1;
    let display = '';

    // Note On (0x9) with velocity > 0
    if (messageType === 0x9 && byte2 > 0) {
      isTrigger = true;
      type = 'note';
      number = byte1;
      display = `Note ${number} (Ch ${channel})`;
    } 
    // Control Change (0xB) e.g. Foot pedal / sustain / switch
    else if (messageType === 0xB) {
      // CC button press (value >= 64 is pedal down)
      if (byte2 >= 64) {
        isTrigger = true;
        type = 'cc';
        number = byte1;
        display = `CC ${number} (Ch ${channel})`;
      }
    }
    // Program Change (0xC)
    else if (messageType === 0xC) {
      isTrigger = true;
      type = 'program';
      number = byte1;
      display = `Program ${number} (Ch ${channel})`;
    }

    if (!isTrigger) return;

    setLastActivity({
      source: 'midi',
      detail: display,
      timestamp: Date.now()
    });

    // Check if we are in Learning Mode for MIDI
    if (learningTargetRef.current && learningTargetRef.current.type === 'midi') {
      const targetAction = learningTargetRef.current.actionId;
      updateMapping(targetAction, {
        midiType: type,
        midiNumber: number,
        midiDisplay: display
      });
      setLearningTarget(null);
      triggerToast({
        title: 'MIDI Control Assigned',
        subtitle: `Mapped ${display} to ${ACTION_DEFINITIONS.find(d => d.id === targetAction)?.label}`,
        type: 'device'
      });
      return;
    }

    // Match against mappings
    const currentMap = mappingsRef.current;
    for (const [actionId, mapping] of Object.entries(currentMap) as [ActionId, ActionMapping][]) {
      if (mapping.midiType === type && mapping.midiNumber === number) {
        executeAction(actionId);
        break;
      }
    }
  }, [executeAction, updateMapping, triggerToast]);

  const attachMidiInputs = useCallback((midiAccess: any) => {
    const devices: ConnectedMidiDevice[] = [];
    const inputs = midiAccess.inputs.values();
    for (const input of inputs) {
      devices.push({
        id: input.id,
        name: input.name || `MIDI Device ${input.id}`,
        manufacturer: input.manufacturer,
        state: input.state
      });
      input.onmidimessage = handleMidiMessage;
    }
    setMidiDevices(devices);
    setIsMidiActive(devices.length > 0);
  }, [handleMidiMessage]);

  const requestMidiAccess = useCallback(async (): Promise<boolean> => {
    if (!navigator.requestMIDIAccess) return false;
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      midiAccessRef.current = access;
      attachMidiInputs(access);

      access.onstatechange = (e: any) => {
        attachMidiInputs(access);
        if (e.port.state === 'connected') {
          triggerToast({
            title: 'MIDI Device Connected',
            subtitle: e.port.name,
            type: 'device'
          });
        }
      };

      return true;
    } catch (err) {
      console.warn('Web MIDI Access request rejected or not available:', err);
      return false;
    }
  }, [attachMidiInputs, triggerToast]);

  // Attempt auto-connecting to MIDI silently on mount if already permitted
  useEffect(() => {
    if (isMidiSupported) {
      requestMidiAccess();
    }
  }, [isMidiSupported, requestMidiAccess]);

  const value = {
    mappings,
    updateMapping,
    resetAllMappings,
    resetActionMapping,
    gamepads,
    midiDevices,
    isMidiSupported,
    isMidiActive,
    requestMidiAccess,
    learningTarget,
    startLearning,
    cancelLearning,
    lastActivity,
    activeToast,
    triggerToast,
    isControllerModalOpen,
    setIsControllerModalOpen,
    toggleControllerModal,
    executeAction,
  };

  return (
    <ControllerContext.Provider value={value}>
      {children}
    </ControllerContext.Provider>
  );
}

export function useController() {
  const context = useContext(ControllerContext);
  if (!context) {
    throw new Error('useController must be used within a ControllerProvider');
  }
  return context;
}
