/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Layers, Sliders, Music, Info, ArrowRight, Check } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useAccompaniment, getEffectiveChord } from '../../contexts/AccompanimentContext.tsx';
import { useAudio } from '../../contexts/AudioContext.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import {
  PianoVoicingStyle,
  PianoVoicing,
  midiToNoteName,
  generatePianoVoicingCandidates,
  calculateVoiceLeadingDistance
} from '../../lib/pianoVoicingEngine.ts';
import { formatChordName } from './constants.ts';

export const VOICING_STYLES: {
  id: PianoVoicingStyle;
  label: string;
  shortLabel: string;
  description: string;
  badge: string;
}[] = [
  {
    id: 'smooth_voice_leading',
    label: 'Smooth Voice Leading',
    shortLabel: 'Smooth Leading',
    description: 'Adaptive inversions with minimal voice movement between adjacent chords',
    badge: 'Recommended'
  },
  {
    id: 'lush_jazz_drop2',
    label: 'Lush Jazz Drop-2',
    shortLabel: 'Jazz Drop-2',
    description: 'Warm, open 4-part jazz voicings with rich color extensions and drop-2 spacing',
    badge: 'Jazz'
  },
  {
    id: 'pop_open_spread',
    label: 'Pop Open Spread',
    shortLabel: 'Pop Open (1-5-10)',
    description: 'Wide acoustic piano resonance with open left-hand 10ths and airy upper triads',
    badge: 'Pop / Ballad'
  },
  {
    id: 'close_inversions',
    label: 'Close Inversions',
    shortLabel: 'Close Inversions',
    description: 'Compact keyboard voicings centered in the middle register with smooth transitions',
    badge: 'Compact'
  },
  {
    id: 'root_position',
    label: 'Root Position',
    shortLabel: 'Root Position',
    description: 'Standard tertian chords in direct root position without voice-leading inversion',
    badge: 'Standard'
  }
];

// Mini Keyboard visualizer from MIDI 36 (C2) to 84 (C6) - 4 octaves
const KEYBOARD_START_MIDI = 36; // C2
const KEYBOARD_END_MIDI = 84;   // C6

const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11]; // semitones in octave

function isBlackKey(midi: number): boolean {
  const semitone = ((midi % 12) + 12) % 12;
  return !WHITE_KEYS.includes(semitone);
}

export default function VoicingInspectorPanel() {
  const {
    progression,
    selectedBeatIndex,
    currentIndex,
    isPlaying,
    voicingStyle,
    setVoicingStyle,
    progressionVoicings,
    selectedInstrument,
    accompanimentVolume
  } = useAccompaniment();
  const { playChord } = useAudio();
  const { resolvedTheme } = useTheme();

  // Active inspected beat index: current playing beat if playing, else selected beat
  const targetBeatIndex = isPlaying && currentIndex >= 0 ? currentIndex : (selectedBeatIndex ?? 0);
  const effectiveInfo = getEffectiveChord(progression, targetBeatIndex);
  const currentChord = effectiveInfo?.chord || null;
  const currentVoicing: PianoVoicing | null =
    targetBeatIndex >= 0 && targetBeatIndex < progressionVoicings.length
      ? progressionVoicings[targetBeatIndex]
      : null;

  // Previous chord & voicing in progression
  const prevBeatIndex = (targetBeatIndex - 1 + progression.length) % progression.length;
  const prevInfo = getEffectiveChord(progression, prevBeatIndex);
  const prevVoicing = prevBeatIndex >= 0 && prevBeatIndex < progressionVoicings.length ? progressionVoicings[prevBeatIndex] : null;

  // Next chord in progression
  const nextBeatIndex = (targetBeatIndex + 1) % progression.length;
  const nextInfo = getEffectiveChord(progression, nextBeatIndex);

  const activeMidiNotes = currentVoicing ? currentVoicing.allNotes : [];

  const handlePreviewVoicing = (voicing: PianoVoicing) => {
    if (!currentChord) return;
    playChord(currentChord, selectedInstrument, accompanimentVolume, {
      customMidiNotes: voicing.allNotes,
      voicingStyle
    });
  };

  // Generate candidate voicings for the current chord to display comparison options
  const candidateVoicings = React.useMemo(() => {
    if (!currentChord) return [];
    return generatePianoVoicingCandidates(currentChord, voicingStyle).slice(0, 4);
  }, [currentChord, voicingStyle]);

  return (
    <div className={cn(
      "flex flex-col p-3 rounded-2xl border transition-all",
      resolvedTheme === 'dark' ? "bg-white/[0.02] border-white/10" : "bg-slate-50 border-slate-200"
    )}>
      {/* Header & Voicing Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Piano Voicing & Voice Leading</span>
              <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Harmonic Engine
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Select voicing style to ensure smooth transitions between chords
            </p>
          </div>
        </div>

        {/* Style Selector Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {VOICING_STYLES.map(style => {
            const isSelected = voicingStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => setVoicingStyle(style.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border flex items-center gap-1",
                  isSelected
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                    : (resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100")
                )}
                title={style.description}
              >
                <span>{style.shortLabel}</span>
                {style.badge === 'Recommended' && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Voicing Inspection Card */}
      {currentChord && currentVoicing ? (
        <div className="space-y-3">
          {/* Active Voicing Details Banner */}
          <div className={cn(
            "p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2",
            resolvedTheme === 'dark' ? "bg-black/30 border-white/10" : "bg-white border-slate-200 shadow-2xs"
          )}>
            {/* Chord & Inversion Info */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
                  {isPlaying ? `Playing Beat ${targetBeatIndex + 1}` : `Selected Beat ${targetBeatIndex + 1}`}
                </span>
                <span className="text-base font-black font-mono text-emerald-500">
                  {formatChordName(currentChord)}
                </span>
              </div>

              <div className="h-7 w-px bg-slate-200 dark:bg-white/10" />

              <div className="flex flex-col">
                <span className="text-[9px] font-mono text-slate-400">Inversion / Voicing</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {currentVoicing.inversionName || currentVoicing.label}
                </span>
              </div>

              <div className="h-7 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

              {/* Hand Distribution */}
              <div className="hidden sm:flex flex-col">
                <span className="text-[9px] font-mono text-slate-400">Voiced Notes</span>
                <div className="text-[10px] font-mono flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="text-indigo-500 font-bold">LH: {midiToNoteName(currentVoicing.bassNote)}</span>
                  <span className="text-slate-300 dark:text-white/20">|</span>
                  <span className="text-emerald-500 font-bold">
                    RH: {currentVoicing.upperNotes.map(midiToNoteName).join(' · ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Voice Leading Step Delta & Preview Button */}
            <div className="flex items-center gap-2">
              {currentVoicing.voiceLeadingDistance !== undefined && currentVoicing.voiceLeadingDistance > 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-mono text-emerald-500 font-bold">
                  <span>Δ {currentVoicing.voiceLeadingDistance} semitones</span>
                </div>
              )}

              <button
                onClick={() => handlePreviewVoicing(currentVoicing)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[9px] font-bold border flex items-center gap-1.5 transition-all",
                  resolvedTheme === 'dark' ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                )}
                title="Play this voiced chord on the piano"
              >
                <Music className="w-3 h-3" />
                <span>Hear Voicing</span>
              </button>
            </div>
          </div>

          {/* Voice Leading Progression Flow: Prev -> Current -> Next */}
          <div className="flex items-center gap-2 text-[10px] font-mono flex-wrap p-2 rounded-lg bg-black/10 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
            <span className="text-slate-400 uppercase text-[8px] tracking-wider">Voice Flow:</span>
            {prevInfo?.chord && prevInfo.chord !== currentChord && (
              <>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold">
                  {formatChordName(prevInfo.chord)}
                  {prevVoicing ? ` (${prevVoicing.inversionName})` : ''}
                </span>
                <ArrowRight className="w-3 h-3 text-emerald-500 shrink-0" />
              </>
            )}

            <span className="px-2 py-0.5 rounded bg-emerald-500 text-white font-black shadow-xs">
              {formatChordName(currentChord)} ({currentVoicing.inversionName || currentVoicing.label})
            </span>

            {nextInfo?.chord && nextInfo.chord !== currentChord && (
              <>
                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold">
                  {formatChordName(nextInfo.chord)}
                </span>
              </>
            )}
          </div>

          {/* Mini Interactive Piano Visualizer */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span>Keyboard Voice Map (C2 to C6)</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>Bass / Root</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Right Hand Voices</span>
                </div>
              </div>
            </div>

            {/* Piano Keys Stage */}
            <div className="relative w-full h-14 bg-slate-900 rounded-lg p-1 overflow-hidden border border-slate-800 shadow-inner flex select-none">
              {/* Render White & Black Keys */}
              {(() => {
                const totalWhiteKeys = 29; // C2 to C6 has 29 white keys
                const whiteKeyWidthPercent = 100 / totalWhiteKeys;
                let whiteKeyIndex = 0;
                const keys = [];

                for (let midi = KEYBOARD_START_MIDI; midi <= KEYBOARD_END_MIDI; midi++) {
                  const isBlack = isBlackKey(midi);
                  const isBass = midi === currentVoicing.bassNote;
                  const isUpper = currentVoicing.upperNotes.includes(midi);
                  const isVoiced = isBass || isUpper;

                  if (!isBlack) {
                    const currentWhiteIdx = whiteKeyIndex;
                    whiteKeyIndex++;

                    keys.push(
                      <div
                        key={midi}
                        style={{
                          left: `${currentWhiteIdx * whiteKeyWidthPercent}%`,
                          width: `${whiteKeyWidthPercent}%`
                        }}
                        className={cn(
                          "absolute top-1 bottom-1 rounded-b border border-slate-300/40 transition-colors flex flex-col justify-end items-center pb-0.5",
                          isBass
                            ? "bg-indigo-500 text-white font-bold z-10 shadow-sm"
                            : isUpper
                              ? "bg-emerald-500 text-white font-bold z-10 shadow-sm"
                              : "bg-white hover:bg-slate-100 text-slate-400"
                        )}
                      >
                        {isVoiced && (
                          <span className="text-[7px] font-mono leading-none scale-90">
                            {midiToNoteName(midi)}
                          </span>
                        )}
                      </div>
                    );
                  } else {
                    // Position black key relative to the preceding white key
                    const prevWhiteIdx = whiteKeyIndex - 1;
                    const leftPos = (prevWhiteIdx + 0.68) * whiteKeyWidthPercent;

                    keys.push(
                      <div
                        key={midi}
                        style={{
                          left: `${leftPos}%`,
                          width: `${whiteKeyWidthPercent * 0.65}%`,
                          height: '62%'
                        }}
                        className={cn(
                          "absolute top-1 z-20 rounded-b border transition-colors flex flex-col justify-end items-center pb-0.5",
                          isBass
                            ? "bg-indigo-600 text-white border-indigo-400 font-bold shadow-md"
                            : isUpper
                              ? "bg-emerald-400 text-slate-900 border-emerald-300 font-bold shadow-md"
                              : "bg-slate-900 border-slate-950 hover:bg-slate-800"
                        )}
                      >
                        {isVoiced && (
                          <span className="text-[6px] font-mono leading-none scale-75">
                            {midiToNoteName(midi)}
                          </span>
                        )}
                      </div>
                    );
                  }
                }
                return keys;
              })()}
            </div>
          </div>

          {/* Alternative Voicing Options Comparison */}
          {candidateVoicings.length > 1 && (
            <div className="pt-1">
              <div className="text-[9px] font-mono text-slate-400 mb-1">
                Candidate Voicing Inversions for {formatChordName(currentChord)}:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {candidateVoicings.map((cVoicing, idx) => {
                  const isCurrentSelected =
                    cVoicing.inversionName === currentVoicing.inversionName &&
                    cVoicing.bassNote === currentVoicing.bassNote;

                  return (
                    <button
                      key={idx}
                      onClick={() => handlePreviewVoicing(cVoicing)}
                      className={cn(
                        "p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all text-[9px]",
                        isCurrentSelected
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                          : (resolvedTheme === 'dark' ? "bg-white/5 border-white/5 hover:bg-white/10 text-white/70" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700")
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold truncate">{cVoicing.inversionName}</span>
                        {isCurrentSelected && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                      </div>
                      <span className="text-[8px] font-mono text-slate-400 truncate">
                        {cVoicing.upperNotes.map(midiToNoteName).join(' ')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 text-center text-slate-400 text-xs font-mono">
          Select or add a chord in the progression timeline to view its piano voicing and voice-leading paths.
        </div>
      )}
    </div>
  );
}
