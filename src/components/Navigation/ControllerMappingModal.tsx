/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Gamepad2, 
  Keyboard, 
  Radio, 
  X, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Zap, 
  Activity, 
  Compass, 
  Volume2, 
  Gauge, 
  FolderSync, 
  HelpCircle,
  ExternalLink,
  Sliders,
  RefreshCw,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useController, ACTION_DEFINITIONS, ActionId } from '../../contexts/ControllerContext.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';

interface ControllerMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ControllerMappingModal({ isOpen, onClose }: ControllerMappingModalProps) {
  const { 
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
    executeAction
  } = useController();

  const { resolvedTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'waypoints' | 'navigation' | 'audio' | 'tempo' | 'app'>('all');
  const [isRequestingMidi, setIsRequestingMidi] = useState(false);

  if (!isOpen) return null;

  const filteredActions = ACTION_DEFINITIONS.filter(def => {
    if (selectedCategory === 'all') return true;
    return def.category === selectedCategory;
  });

  const handleRequestMidi = async () => {
    setIsRequestingMidi(true);
    try {
      await requestMidiAccess();
    } finally {
      setIsRequestingMidi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={cn(
          "w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-2xl transition-all",
          resolvedTheme === 'dark' 
            ? "bg-[#111114]/95 border-white/15 text-slate-100 shadow-black/80" 
            : "bg-white/95 border-slate-200 text-slate-900 shadow-slate-400/40"
        )}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF4E00] text-white flex items-center justify-center shadow-lg shadow-[#FF4E00]/30 shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <span>Controller &amp; Shortcut Mapping</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure gamepads, MIDI foot pedals, and keyboard shortcuts for seamless hands-free practice.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hardware Status Strip */}
        <div className={cn(
          "px-4 sm:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs",
          resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
        )}>
          {/* Gamepads Status */}
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-[#FF4E00] shrink-0" />
            <span className="font-bold">Gamepads:</span>
            {gamepads.length === 0 ? (
              <span className="text-slate-500">None detected (press any button on controller)</span>
            ) : (
              <span className="font-mono text-emerald-500 font-bold">
                {gamepads.length} connected ({gamepads.map(g => g.name.substring(0, 20)).join(', ')})
              </span>
            )}
          </div>

          {/* MIDI Status */}
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-bold">MIDI:</span>
            {!isMidiSupported ? (
              <span className="text-amber-500">Web MIDI not supported in this browser</span>
            ) : midiDevices.length === 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">No MIDI inputs connected</span>
                <button
                  onClick={handleRequestMidi}
                  disabled={isRequestingMidi}
                  className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 font-bold text-[10px] uppercase transition-colors cursor-pointer"
                >
                  {isRequestingMidi ? 'Scanning...' : 'Detect MIDI'}
                </button>
              </div>
            ) : (
              <span className="font-mono text-emerald-500 font-bold">
                {midiDevices.length} device(s) ({midiDevices.map(d => d.name.substring(0, 18)).join(', ')})
              </span>
            )}
          </div>

          {/* Live Activity Monitor */}
          {lastActivity && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 font-mono text-[10px] text-slate-400 shrink-0 animate-in fade-in">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Input: {lastActivity.detail}</span>
            </div>
          )}
        </div>

        {/* Learning Banner (when user clicked to reassign a button) */}
        {learningTarget && (
          <div className="px-6 py-3.5 bg-gradient-to-r from-[#FF4E00] to-orange-600 text-white flex items-center justify-between gap-4 animate-in slide-in-from-top-2 shrink-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-white animate-ping shrink-0" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">
                  Listening for {learningTarget.type.toUpperCase()} input...
                </h4>
                <p className="text-[11px] opacity-90">
                  Press any {learningTarget.type === 'keyboard' ? 'Key on your keyboard' : learningTarget.type === 'gamepad' ? 'Button on your Gamepad/pedal' : 'MIDI pedal, pad, or switch'} to assign to &ldquo;{ACTION_DEFINITIONS.find(d => d.id === learningTarget.actionId)?.label}&rdquo;.
                </p>
              </div>
            </div>

            <button
              onClick={cancelLearning}
              className="px-3 py-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-white text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center gap-1.5 border-b border-black/5 dark:border-white/10 overflow-x-auto custom-scrollbar shrink-0">
          {[
            { id: 'all', label: 'All Actions' },
            { id: 'waypoints', label: 'Score Waypoints' },
            { id: 'navigation', label: 'Page Turns' },
            { id: 'audio', label: 'Audio Playback' },
            { id: 'tempo', label: 'Tempo Control' },
            { id: 'app', label: 'App Controls' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                selectedCategory === tab.id
                  ? "bg-[#FF4E00] text-white shadow-sm shadow-[#FF4E00]/20"
                  : resolvedTheme === 'dark'
                    ? "text-slate-400 hover:text-white hover:bg-white/5"
                    : "text-slate-600 hover:text-slate-900 hover:bg-black/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions Mappings List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-2.5">
          {filteredActions.map(action => {
            const currentMap = mappings[action.id] || {
              keyboardKey: action.defaultKeyboardKey,
              keyboardDisplay: action.defaultKeyboardDisplay,
              gamepadButton: action.defaultGamepadButton,
              gamepadLabel: action.defaultGamepadLabel,
              midiType: action.defaultMidiType,
              midiNumber: action.defaultMidiNumber,
              midiDisplay: action.defaultMidiDisplay,
            };

            const isLearningThisKeyboard = learningTarget?.actionId === action.id && learningTarget.type === 'keyboard';
            const isLearningThisGamepad = learningTarget?.actionId === action.id && learningTarget.type === 'gamepad';
            const isLearningThisMidi = learningTarget?.actionId === action.id && learningTarget.type === 'midi';

            return (
              <div
                key={action.id}
                className={cn(
                  "p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5",
                  resolvedTheme === 'dark'
                    ? "bg-white/5 border-white/10 hover:border-white/20"
                    : "bg-slate-50/80 border-slate-200 hover:border-slate-300"
                )}
              >
                {/* Action Info */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-xs uppercase tracking-tight text-slate-900 dark:text-slate-100">
                      {action.label}
                    </span>
                    {action.id === 'WAYPOINT_NEXT' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-[#FF4E00] text-white">
                        Requested
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {action.description}
                  </p>
                </div>

                {/* Control Slots: Keyboard, Gamepad, MIDI */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Keyboard Assignment */}
                  <div className="flex flex-col gap-1 min-w-[90px]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Keyboard className="w-3 h-3 text-[#FF4E00]" />
                      <span>Key</span>
                    </span>
                    <button
                      onClick={() => startLearning(action.id, 'keyboard')}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all text-center cursor-pointer",
                        isLearningThisKeyboard
                          ? "bg-[#FF4E00] text-white border-[#FF4E00] animate-pulse"
                          : resolvedTheme === 'dark'
                            ? "bg-white/10 border-white/10 hover:bg-white/20 text-white"
                            : "bg-white border-slate-300 hover:bg-slate-100 text-slate-900 shadow-sm"
                      )}
                      title="Click to press a new key"
                    >
                      {isLearningThisKeyboard ? 'Press key...' : currentMap.keyboardDisplay || 'None'}
                    </button>
                  </div>

                  {/* Gamepad Assignment */}
                  <div className="flex flex-col gap-1 min-w-[110px]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Gamepad2 className="w-3 h-3 text-[#FF4E00]" />
                      <span>Gamepad</span>
                    </span>
                    <button
                      onClick={() => startLearning(action.id, 'gamepad')}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all text-center truncate cursor-pointer",
                        isLearningThisGamepad
                          ? "bg-[#FF4E00] text-white border-[#FF4E00] animate-pulse"
                          : currentMap.gamepadButton !== null
                            ? resolvedTheme === 'dark'
                              ? "bg-white/10 border-white/10 hover:bg-white/20 text-white"
                              : "bg-white border-slate-300 hover:bg-slate-100 text-slate-900 shadow-sm"
                            : "bg-black/5 dark:bg-white/5 border-transparent text-slate-400 hover:bg-black/10 dark:hover:bg-white/10"
                      )}
                      title="Click to press a gamepad button or pedal"
                    >
                      {isLearningThisGamepad ? 'Press button...' : currentMap.gamepadLabel || 'Unmapped'}
                    </button>
                  </div>

                  {/* MIDI Assignment */}
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Radio className="w-3 h-3 text-indigo-400" />
                      <span>MIDI Pedal</span>
                    </span>
                    <button
                      onClick={() => startLearning(action.id, 'midi')}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all text-center truncate cursor-pointer",
                        isLearningThisMidi
                          ? "bg-[#FF4E00] text-white border-[#FF4E00] animate-pulse"
                          : currentMap.midiNumber !== undefined
                            ? resolvedTheme === 'dark'
                              ? "bg-white/10 border-white/10 hover:bg-white/20 text-white"
                              : "bg-white border-slate-300 hover:bg-slate-100 text-slate-900 shadow-sm"
                            : "bg-black/5 dark:bg-white/5 border-transparent text-slate-400 hover:bg-black/10 dark:hover:bg-white/10"
                      )}
                      title="Click to trigger a MIDI foot switch or pad"
                    >
                      {isLearningThisMidi ? 'Trigger MIDI...' : currentMap.midiDisplay || 'Unmapped'}
                    </button>
                  </div>

                  {/* Action Test Button */}
                  <button
                    onClick={() => executeAction(action.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0 mt-3 sm:mt-0"
                    title="Test execute this action now"
                  >
                    <Zap className="w-4 h-4 text-[#FF4E00]" />
                  </button>

                  {/* Reset Single Action Button */}
                  <button
                    onClick={() => resetActionMapping(action.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0 mt-3 sm:mt-0"
                    title="Reset this action to defaults"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-[#FF4E00] shrink-0" />
            <span>Mappings save automatically and work across full-screen &amp; distraction-free modes.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetAllMappings}
              className="px-4 py-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#FF4E00] hover:bg-[#e04500] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#FF4E00]/20 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
