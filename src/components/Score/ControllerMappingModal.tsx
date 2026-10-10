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
  BookOpen, 
  Layers,
  HelpCircle,
  Play,
  Trash2,
  AlertCircle,
  Cpu
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { 
  useController, 
  ACTION_DEFINITIONS, 
  ActionId, 
  ActionCategory 
} from '../../contexts/ControllerContext.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';

export interface ControllerMappingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function ControllerMappingModal({ isOpen, onClose }: ControllerMappingModalProps = {}) {
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
    isControllerModalOpen,
    setIsControllerModalOpen,
    executeAction
  } = useController();

  const { resolvedTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory | 'all'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [testTriggeredAction, setTestTriggeredAction] = useState<string | null>(null);

  const effectiveOpen = isOpen !== undefined ? isOpen : isControllerModalOpen;

  const handleClose = () => {
    if (onClose) onClose();
    setIsControllerModalOpen(false);
  };

  if (!effectiveOpen) return null;

  const filteredActions = ACTION_DEFINITIONS.filter(action => {
    const matchesCategory = selectedCategory === 'all' || action.category === selectedCategory;
    const matchesSearch = searchFilter === '' || 
      action.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
      action.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTestAction = (actionId: ActionId) => {
    executeAction(actionId);
    setTestTriggeredAction(actionId);
    setTimeout(() => {
      setTestTriggeredAction(null);
    }, 600);
  };

  const handleClearSlot = (actionId: ActionId, type: 'keyboard' | 'gamepad' | 'midi') => {
    if (type === 'keyboard') {
      updateMapping(actionId, { keyboardKey: '', keyboardDisplay: 'None' });
    } else if (type === 'gamepad') {
      updateMapping(actionId, { gamepadButton: null, gamepadLabel: 'None' });
    } else if (type === 'midi') {
      updateMapping(actionId, { midiType: undefined, midiNumber: undefined, midiDisplay: 'None' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={cn(
          "relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden",
          resolvedTheme === 'dark' 
            ? "bg-slate-900 border-slate-800 text-slate-100" 
            : "bg-white border-slate-200 text-slate-900"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-6 py-4 border-b shrink-0",
          resolvedTheme === 'dark' ? "bg-slate-900/90 border-slate-800" : "bg-slate-50/80 border-slate-200"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shadow-inner">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Controller & Shortcut Mappings</h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  MIDI + Gamepad + Keyboard
                </span>
              </div>
              <p className={cn("text-xs", resolvedTheme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                Map Bluetooth page turners, foot pedals, gamepads, and keyboard shortcuts to score page turning and bookmarks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetAllMappings}
              title="Reset all bindings to factory defaults"
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border",
                resolvedTheme === 'dark' 
                  ? "bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white" 
                  : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
              )}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All
            </button>
            <button
              onClick={handleClose}
              className={cn(
                "p-2 rounded-lg transition-colors",
                resolvedTheme === 'dark' ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
              )}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Hardware Device Status Bar */}
        <div className={cn(
          "px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs shrink-0",
          resolvedTheme === 'dark' ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-200"
        )}>
          <div className="flex flex-wrap items-center gap-3">
            {/* Gamepad Status */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400 flex items-center gap-1">
                <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
                Gamepad:
              </span>
              {gamepads.length > 0 ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {gamepads[0].id.slice(0, 24)} {gamepads.length > 1 ? `(+${gamepads.length - 1})` : ''}
                </div>
              ) : (
                <span className="text-slate-400 italic">None detected (press any button to wake)</span>
              )}
            </div>

            <div className="h-4 w-px bg-slate-700/50 hidden sm:block" />

            {/* MIDI Status */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                MIDI:
              </span>
              {midiDevices.length > 0 ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {midiDevices[0].name.slice(0, 24)} {midiDevices.length > 1 ? `(+${midiDevices.length - 1})` : ''}
                </div>
              ) : isMidiSupported ? (
                <button
                  onClick={() => requestMidiAccess()}
                  className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium transition-colors"
                >
                  Connect MIDI Devices
                </button>
              ) : (
                <span className="text-slate-500 italic">Web MIDI unavailable</span>
              )}
            </div>
          </div>

          {/* Last Activity Monitor */}
          {lastActivity ? (
            <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>{lastActivity.source.toUpperCase()}: {lastActivity.detail}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Cpu className="w-3.5 h-3.5" />
              <span>Hardware input listener active</span>
            </div>
          )}
        </div>

        {/* Learning Banner if Active */}
        {learningTarget && (
          <div className="px-6 py-3 bg-indigo-600 text-white flex items-center justify-between text-xs font-medium animate-pulse shrink-0 shadow-inner">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
              <span>
                Listening for <strong>{learningTarget.type.toUpperCase()}</strong> input to map to{' '}
                <strong>{ACTION_DEFINITIONS.find(d => d.id === learningTarget.actionId)?.label}</strong>...
              </span>
            </div>
            <button
              onClick={cancelLearning}
              className="px-2 py-0.5 bg-black/30 hover:bg-black/50 text-white rounded text-[11px] transition-colors"
            >
              Cancel (Esc)
            </button>
          </div>
        )}

        {/* Filter Bar & Tabs */}
        <div className={cn(
          "px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0",
          resolvedTheme === 'dark' ? "bg-slate-900/50 border-slate-800" : "bg-slate-50/50 border-slate-200"
        )}>
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Actions', icon: Layers },
              { id: 'waypoints', label: 'Bookmarks', icon: Compass },
              { id: 'navigation', label: 'Page & Navigation', icon: BookOpen },
              { id: 'audio', label: 'Audio & Playback', icon: Volume2 },
              { id: 'tempo', label: 'Tempo Control', icon: Gauge },
              { id: 'app', label: 'App / Library', icon: Zap }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all",
                    isActive 
                      ? "bg-indigo-600 text-white shadow-sm font-semibold"
                      : resolvedTheme === 'dark'
                        ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="w-full sm:w-56">
            <input
              type="text"
              placeholder="Search actions..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className={cn(
                "w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500",
                resolvedTheme === 'dark'
                  ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                  : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
              )}
            />
          </div>
        </div>

        {/* Actions List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-slate-800/50">
          {filteredActions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No actions match your search filter.
            </div>
          ) : (
            filteredActions.map(action => {
              const current = mappings[action.id] || {
                keyboardKey: action.defaultKeyboardKey,
                keyboardDisplay: action.defaultKeyboardDisplay,
                gamepadButton: action.defaultGamepadButton,
                gamepadLabel: action.defaultGamepadLabel,
                midiType: action.defaultMidiType,
                midiNumber: action.defaultMidiNumber,
                midiDisplay: action.defaultMidiDisplay || 'None'
              };

              const isLearningThis = learningTarget?.actionId === action.id;
              const isJustTested = testTriggeredAction === action.id;

              return (
                <div 
                  key={action.id}
                  className={cn(
                    "py-3.5 px-3 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 my-1",
                    isJustTested && "bg-emerald-500/10 ring-1 ring-emerald-500/30",
                    isLearningThis 
                      ? "bg-indigo-500/10 ring-2 ring-indigo-500/40" 
                      : resolvedTheme === 'dark'
                        ? "hover:bg-slate-800/40"
                        : "hover:bg-slate-50"
                  )}
                >
                  {/* Action Description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm tracking-tight">{action.label}</span>
                      {action.category === 'waypoints' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Waypoint
                        </span>
                      )}
                    </div>
                    <p className={cn("text-xs line-clamp-1", resolvedTheme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                      {action.description}
                    </p>
                  </div>

                  {/* Binding Slots: Keyboard, Gamepad, MIDI */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Keyboard Slot */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startLearning(action.id, 'keyboard')}
                        title={`Click to remap keyboard shortcut for ${action.label}`}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm",
                          isLearningThis && learningTarget?.type === 'keyboard'
                            ? "bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400 animate-pulse"
                            : current.keyboardDisplay && current.keyboardDisplay !== 'None'
                              ? resolvedTheme === 'dark'
                                ? "bg-slate-800 border-slate-700 text-slate-200 hover:border-indigo-500/50"
                                : "bg-slate-100 border-slate-200 text-slate-800 hover:border-indigo-500/50"
                              : resolvedTheme === 'dark'
                                ? "bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700"
                                : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                        )}
                      >
                        <Keyboard className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="max-w-[80px] truncate">{current.keyboardDisplay || 'None'}</span>
                      </button>
                      {current.keyboardDisplay && current.keyboardDisplay !== 'None' && (
                        <button
                          onClick={() => handleClearSlot(action.id, 'keyboard')}
                          title="Clear keyboard shortcut"
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Gamepad Slot */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startLearning(action.id, 'gamepad')}
                        title={`Click to remap gamepad button for ${action.label}`}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm",
                          isLearningThis && learningTarget?.type === 'gamepad'
                            ? "bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400 animate-pulse"
                            : current.gamepadLabel && current.gamepadLabel !== 'None' && current.gamepadLabel !== 'Unmapped'
                              ? resolvedTheme === 'dark'
                                ? "bg-slate-800 border-slate-700 text-slate-200 hover:border-indigo-500/50"
                                : "bg-slate-100 border-slate-200 text-slate-800 hover:border-indigo-500/50"
                              : resolvedTheme === 'dark'
                                ? "bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700"
                                : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                        )}
                      >
                        <Gamepad2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="max-w-[80px] truncate">{current.gamepadLabel || 'None'}</span>
                      </button>
                      {current.gamepadLabel && current.gamepadLabel !== 'None' && current.gamepadLabel !== 'Unmapped' && (
                        <button
                          onClick={() => handleClearSlot(action.id, 'gamepad')}
                          title="Clear gamepad button mapping"
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* MIDI Slot */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startLearning(action.id, 'midi')}
                        title={`Click to remap MIDI command for ${action.label}`}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm",
                          isLearningThis && learningTarget?.type === 'midi'
                            ? "bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400 animate-pulse"
                            : current.midiDisplay && current.midiDisplay !== 'None'
                              ? resolvedTheme === 'dark'
                                ? "bg-slate-800 border-slate-700 text-slate-200 hover:border-indigo-500/50"
                                : "bg-slate-100 border-slate-200 text-slate-800 hover:border-indigo-500/50"
                              : resolvedTheme === 'dark'
                                ? "bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700"
                                : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                        )}
                      >
                        <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="max-w-[100px] truncate">{current.midiDisplay || 'None'}</span>
                      </button>
                      {current.midiDisplay && current.midiDisplay !== 'None' && (
                        <button
                          onClick={() => handleClearSlot(action.id, 'midi')}
                          title="Clear MIDI mapping"
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Test Button & Reset Single */}
                    <div className="flex items-center gap-1 pl-1">
                      <button
                        onClick={() => handleTestAction(action.id)}
                        title="Simulate / Trigger this action now"
                        className={cn(
                          "p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1",
                          isJustTested
                            ? "bg-emerald-500 text-white border-emerald-400"
                            : resolvedTheme === 'dark'
                              ? "bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border-slate-700"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-emerald-600 border-slate-200"
                        )}
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                      <button
                        onClick={() => resetActionMapping(action.id)}
                        title="Reset to default binding"
                        className={cn(
                          "p-1.5 rounded-lg border transition-colors text-xs",
                          resolvedTheme === 'dark'
                            ? "bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-amber-400 border-slate-700"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-amber-600 border-slate-200"
                        )}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          "px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs shrink-0",
          resolvedTheme === 'dark' ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
        )}>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Tip: Click any badge to enter <em>Learn Mode</em>, then press your foot pedal, controller button, or keyboard key.
            </span>
          </div>

          <button
            onClick={handleClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ControllerMappingModal;
