/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CHORD_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CHORD_TYPES = [
  { label: 'Major', suffix: '', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { label: 'Minor', suffix: 'm', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { label: '7th', suffix: '7', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { label: 'Major 7th', suffix: 'maj7', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { label: 'Minor 7th', suffix: 'min7', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { label: 'Minor 6th', suffix: 'm6', color: 'bg-cyan-600/10 text-cyan-400 border-cyan-600/20' },
  { label: 'Minor 6/9', suffix: 'm69', color: 'bg-teal-600/10 text-teal-400 border-teal-600/20' },
  { label: 'Minor 9th', suffix: 'm9', color: 'bg-sky-600/10 text-sky-400 border-sky-600/20' },
  { label: 'Minor Add 9', suffix: 'madd9', color: 'bg-blue-400/10 text-blue-300 border-blue-400/20' },
  { label: 'Minor 11th', suffix: 'm11', color: 'bg-indigo-400/10 text-indigo-300 border-indigo-400/20' },
  { label: 'Minor Maj 7', suffix: 'mmaj7', color: 'bg-violet-600/10 text-violet-400 border-violet-600/20' },
  { label: 'Minor Maj 7b5', suffix: 'mmaj7b5', color: 'bg-fuchsia-600/10 text-fuchsia-400 border-fuchsia-600/20' },
  { label: 'Minor Maj 9', suffix: 'mmaj9', color: 'bg-rose-600/10 text-rose-400 border-rose-600/20' },
  { label: '7 #9', suffix: '7#9', color: 'bg-orange-600/10 text-orange-400 border-orange-600/20' },
  { label: 'Suspended 2', suffix: 'sus2', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { label: 'Suspended 4', suffix: 'sus4', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { label: 'Add 9', suffix: 'add9', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  { label: 'Diminished', suffix: 'dim', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { label: 'Diminished 7', suffix: 'dim7', color: 'bg-red-600/10 text-red-500 border-red-600/20' },
  { label: 'Half-Dim 7', suffix: 'm7b5', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  { label: '6/9 Chord', suffix: '69', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { label: '9th Chord', suffix: '9', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  { label: '11th Chord', suffix: '11', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  { label: '13th Chord', suffix: '13', color: 'bg-lime-500/10 text-lime-400 border-lime-500/20' },
];

export const ARPEGGIO_PRESETS = ['Block', 'Up', 'Down', 'Up-Down', 'Converge', 'Diverge', 'Stutter', 'Random'];
