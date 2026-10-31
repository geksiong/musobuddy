import { MetronomeSound } from '../Metronome/types.ts';

export type ChordTriggerType =
  | 'OFF'              // Silent / sustain previous chord
  | 'CHORD'            // Play current beat chord
  | 'CHORD_ACCENT'     // Play current beat chord with accent
  | 'PUSH_NEXT_CHORD'  // Play NEXT beat's chord early (Syncopation / Anticipation!)
  | 'PUSH_NEXT_ACCENT' // Play NEXT beat's chord early with accent!
  | 'ROOT'             // Play current beat's root note
  | 'ROOT_ACCENT'      // Play current beat's root note with accent
  | 'PUSH_NEXT_ROOT'   // Play NEXT beat's root note early!
  | 'ARPEGGIO';        // Play arpeggiated note from current chord

export type BassTriggerType =
  | 'OFF'
  | 'ROOT'
  | 'ROOT_ACCENT'
  | 'FIFTH'
  | 'PUSH_NEXT_ROOT'
  | 'PUSH_NEXT_FIFTH'
  | 'WALKING';

export type SynthTriggerType =
  | 'OFF'              // Silent / sustain previous note
  | 'PAD'              // Lush chord pad
  | 'LEAD_ROOT'        // Lead melody on chord root (high octave)
  | 'LEAD_ACCENT'      // Accented lead melody hit
  | 'LEAD_FIFTH'       // Lead fifth interval
  | 'LEAD_OCTAVE'      // High octave lead chime
  | 'PUSH_NEXT_LEAD'   // Early melodic lead push to next root
  | 'ARP_FLOURISH';    // Arpeggiated melody flourish

export interface PercussionLayer {
  id: string;
  name: string;
  sound: string | MetronomeSound;
  volume: number;
  muted?: boolean;
  pattern: number[]; // 0: off, 1: normal, 2: accent for each step
}

export type GrooveGenre = 'Rock' | 'Pop' | 'Funk' | 'Jazz' | 'Latin' | 'World' | 'Flamenco';

export interface GroovePatternPreset {
  id: string;
  name: string;
  genre: GrooveGenre;
  timeSignature: '4/4' | '3/4' | '6/8' | '5/4';
  subdivisionsPerBeat: number; // e.g. 4 for 16th notes, 2 for 8th notes
  defaultBpm: number;
  swingRatio?: number; // e.g. 0.667 for swing
  description: string;
  hasEarlyPush?: boolean; // Highlights early chord anticipation in UI
  chordPattern: ChordTriggerType[];
  bassPattern: BassTriggerType[];
  synthPattern?: SynthTriggerType[];
  percussionLayers: PercussionLayer[];
  drumSetId?: string;
  rhythmInstrument?: string;
  bassInstrument?: string;
  synthInstrument?: string;
  isUserPreset?: boolean;
}

export function getChordTriggerLabel(trigger: ChordTriggerType): { label: string; short: string; style: string } {
  switch (trigger) {
    case 'CHORD':
      return { label: 'Chord Hit', short: 'CHORD', style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    case 'CHORD_ACCENT':
      return { label: 'Accent Chord', short: 'CHORD !', style: 'bg-emerald-500 text-slate-950 font-bold border-emerald-400' };
    case 'PUSH_NEXT_CHORD':
      return { label: 'Push Next Chord ➜', short: 'PUSH ➜', style: 'bg-amber-500/30 text-amber-300 border-amber-400/60 font-semibold animate-pulse' };
    case 'PUSH_NEXT_ACCENT':
      return { label: 'Accent Push Next ➜!', short: 'PUSH ➜!', style: 'bg-amber-500 text-slate-950 font-bold border-amber-300 animate-pulse' };
    case 'ROOT':
      return { label: 'Root Note', short: 'ROOT', style: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
    case 'ROOT_ACCENT':
      return { label: 'Accent Root', short: 'ROOT !', style: 'bg-sky-500 text-slate-950 font-bold border-sky-400' };
    case 'PUSH_NEXT_ROOT':
      return { label: 'Push Next Root ➜', short: 'P-ROOT ➜', style: 'bg-cyan-500/30 text-cyan-300 border-cyan-400/60' };
    case 'ARPEGGIO':
      return { label: 'Arpeggio Note', short: 'ARP', style: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
    case 'OFF':
    default:
      return { label: 'Rest / Sustain', short: '-', style: 'bg-slate-900/40 text-slate-600 border-slate-800' };
  }
}

export function getBassTriggerLabel(trigger: BassTriggerType): { label: string; short: string; style: string } {
  switch (trigger) {
    case 'ROOT':
      return { label: 'Bass Root', short: 'ROOT', style: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
    case 'ROOT_ACCENT':
      return { label: 'Accent Bass Root', short: 'ROOT !', style: 'bg-blue-500 text-slate-950 font-bold border-blue-400' };
    case 'FIFTH':
      return { label: 'Bass 5th', short: '5TH', style: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
    case 'PUSH_NEXT_ROOT':
      return { label: 'Push Next Bass Root ➜', short: 'P-ROOT ➜', style: 'bg-amber-500/30 text-amber-300 border-amber-400/60 font-semibold' };
    case 'PUSH_NEXT_FIFTH':
      return { label: 'Push Next Bass 5th ➜', short: 'P-5TH ➜', style: 'bg-orange-500/30 text-orange-300 border-orange-400/60' };
    case 'WALKING':
      return { label: 'Walking Step', short: 'WALK', style: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
    case 'OFF':
    default:
      return { label: 'Rest', short: '-', style: 'bg-slate-900/40 text-slate-600 border-slate-800' };
  }
}

export function getSynthTriggerLabel(trigger: SynthTriggerType): { label: string; short: string; style: string } {
  switch (trigger) {
    case 'PAD':
      return { label: 'Synth Pad', short: 'PAD', style: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' };
    case 'LEAD_ROOT':
      return { label: 'Lead Root', short: 'LEAD', style: 'bg-violet-500/20 text-violet-300 border-violet-500/40' };
    case 'LEAD_ACCENT':
      return { label: 'Lead Accent !', short: 'LEAD !', style: 'bg-violet-500 text-white font-bold border-violet-400' };
    case 'LEAD_FIFTH':
      return { label: 'Lead 5th', short: 'L-5TH', style: 'bg-pink-500/20 text-pink-300 border-pink-500/40' };
    case 'LEAD_OCTAVE':
      return { label: 'Lead 8va', short: 'OCT', style: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    case 'PUSH_NEXT_LEAD':
      return { label: 'Push Next Lead ➜', short: 'P-LEAD ➜', style: 'bg-amber-500/30 text-amber-300 border-amber-400/60 font-semibold' };
    case 'ARP_FLOURISH':
      return { label: 'Arp Flourish', short: 'FLOURISH', style: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
    case 'OFF':
    default:
      return { label: 'Rest / Sustain', short: '-', style: 'bg-slate-900/40 text-slate-600 border-slate-800' };
  }
}

// Default Presets across Rock, Pop, Funk, Jazz, Latin, World, Flamenco
export const GROOVE_PRESETS: GroovePatternPreset[] = [
  // ==========================================
  // --- 1. ROCK ---
  // ==========================================
  {
    id: 'rock-driving-push',
    name: 'Driving 8th Rock Push',
    genre: 'Rock',
    timeSignature: '4/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 124,
    hasEarlyPush: true,
    description: 'Driving syncopated rock rhythm. Strums Beat 1, then anticipates (pushes) Beat 3 on the "and" of Beat 2, and Beat 1 on the "and" of Beat 4.',
    rhythmInstrument: 'rhythm_guitar_acoustic',
    bassInstrument: 'bass_picked_rock',
    synthInstrument: 'synth_analog_saw',
    chordPattern: [
      'CHORD_ACCENT',  // Beat 1
      'OFF',           // 1 and
      'OFF',           // Beat 2
      'PUSH_NEXT_ACCENT', // 2 and (Pushes Beat 3 chord early!)
      'OFF',           // Beat 3 (Sustains pushed chord)
      'CHORD',         // 3 and
      'OFF',           // Beat 4
      'PUSH_NEXT_CHORD'  // 4 and (Pushes next measure Beat 1 early!)
    ],
    bassPattern: [
      'ROOT_ACCENT', 'ROOT', 'ROOT', 'PUSH_NEXT_ROOT',
      'ROOT', 'ROOT', 'ROOT', 'PUSH_NEXT_ROOT'
    ],
    synthPattern: [
      'PAD', 'OFF', 'OFF', 'PUSH_NEXT_LEAD',
      'PAD', 'OFF', 'OFF', 'PUSH_NEXT_LEAD'
    ],
    percussionLayers: [
      { id: 'p1', name: '8th Hi-Hat', sound: 'hihat_closed', volume: 0.8, pattern: [2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Rock Snare (2 & 4)', sound: 'snare_acoustic', volume: 0.9, pattern: [0, 0, 2, 0, 0, 0, 2, 0] },
      { id: 'p3', name: 'Punchy Kick', sound: 'kick_acoustic', volume: 0.95, pattern: [2, 0, 0, 1, 2, 0, 0, 0] }
    ]
  },
  {
    id: 'funk-rock-16th',
    name: 'Funky 16th Rock Groove',
    genre: 'Rock',
    timeSignature: '4/4',
    subdivisionsPerBeat: 4,
    defaultBpm: 108,
    hasEarlyPush: true,
    description: 'High-energy 16th-note funk rock rhythm with sharp guitar cuts and early chord pushes on step 8 and step 16.',
    rhythmInstrument: 'rhythm_clavinet',
    bassInstrument: 'bass_slap_funk',
    synthInstrument: 'synth_poly_brass',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'OFF',
      'OFF', 'CHORD', 'OFF', 'PUSH_NEXT_CHORD',
      'OFF', 'CHORD', 'OFF', 'CHORD',
      'OFF', 'CHORD', 'OFF', 'PUSH_NEXT_ACCENT'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'ROOT', 'OFF',
      'FIFTH', 'OFF', 'PUSH_NEXT_ROOT', 'OFF',
      'ROOT', 'OFF', 'ROOT', 'OFF',
      'FIFTH', 'OFF', 'PUSH_NEXT_ROOT', 'OFF'
    ],
    synthPattern: [
      'LEAD_ROOT', 'OFF', 'LEAD_FIFTH', 'OFF',
      'OFF', 'LEAD_ROOT', 'OFF', 'PUSH_NEXT_LEAD',
      'OFF', 'LEAD_ROOT', 'OFF', 'LEAD_OCTAVE',
      'OFF', 'LEAD_ROOT', 'OFF', 'PUSH_NEXT_LEAD'
    ],
    percussionLayers: [
      { id: 'p1', name: '16th Hi-Hat', sound: 'hihat_closed', volume: 0.75, pattern: [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1] },
      { id: 'p2', name: 'Snare + Ghost Notes', sound: 'snare_rimshot', volume: 0.85, pattern: [0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0] },
      { id: 'p3', name: 'Funk Kick', sound: 'kick_acoustic', volume: 0.9, pattern: [2, 0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 0, 0, 1, 0, 0] }
    ]
  },
  {
    id: 'blues-128-shuffle',
    name: '12-Bar Blues Shuffle',
    genre: 'Rock',
    timeSignature: '4/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 108,
    swingRatio: 0.667,
    hasEarlyPush: true,
    description: 'Authentic 12-bar blues shuffle rhythm with triplet swing feel, walking bassline, and backbeat snare.',
    drumSetId: 'drumset_acoustic_studio',
    rhythmInstrument: 'rhythm_organ_b3',
    bassInstrument: 'bass_electric_finger',
    synthInstrument: 'synth_lofi_tape',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_CHORD',
      'CHORD_ACCENT', 'OFF', 'CHORD', 'OFF'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'WALKING', 'FIFTH', 'WALKING',
      'ROOT', 'WALKING', 'FIFTH', 'WALKING'
    ],
    synthPattern: [
      'PAD', 'OFF', 'LEAD_ROOT', 'PUSH_NEXT_LEAD',
      'PAD', 'OFF', 'LEAD_FIFTH', 'OFF'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Shuffle Hi-Hat', sound: 'hihat_closed', volume: 0.8, pattern: [2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Backbeat Snare', sound: 'snare_brush', volume: 0.85, pattern: [0, 0, 2, 0, 0, 0, 2, 0] },
      { id: 'p3', name: 'Blues Kick', sound: 'kick_acoustic', volume: 0.9, pattern: [2, 0, 0, 1, 2, 0, 0, 0] }
    ]
  },

  // ==========================================
  // --- 2. POP ---
  // ==========================================
  {
    id: 'pop-acoustic-push',
    name: 'Pop Acoustic Strum & Push',
    genre: 'Pop',
    timeSignature: '4/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 110,
    hasEarlyPush: true,
    description: 'Standard modern Pop acoustic strum pattern with syncopated chord anticipation on the "and" of Beat 2.',
    rhythmInstrument: 'rhythm_piano',
    bassInstrument: 'bass_electric_finger',
    synthInstrument: 'synth_silk_pad',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_CHORD', 'OFF', 'CHORD', 'CHORD', 'PUSH_NEXT_CHORD'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'ROOT', 'PUSH_NEXT_ROOT', 'ROOT', 'OFF', 'FIFTH', 'PUSH_NEXT_ROOT'
    ],
    synthPattern: [
      'PAD', 'OFF', 'OFF', 'PUSH_NEXT_LEAD', 'PAD', 'OFF', 'LEAD_ROOT', 'PUSH_NEXT_LEAD'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Hi-Hat', sound: 'hihat_closed', volume: 0.75, pattern: [2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Snare / Clap', sound: 'clap_acoustic', volume: 0.8, pattern: [0, 0, 2, 0, 0, 0, 2, 0] },
      { id: 'p3', name: 'Kick', sound: 'kick_acoustic', volume: 0.9, pattern: [2, 0, 0, 1, 2, 0, 0, 0] }
    ]
  },
  {
    id: 'ballad-68',
    name: '6/8 Slow Soul / Acoustic Ballad',
    genre: 'Pop',
    timeSignature: '6/8',
    subdivisionsPerBeat: 2,
    defaultBpm: 68,
    hasEarlyPush: false,
    description: 'Rolling 6/8 compound meter rhythm with arpeggiated piano/guitar feels, snare rim click on beat 4, and warm bass pulses.',
    rhythmInstrument: 'rhythm_rhodes',
    bassInstrument: 'bass_upright',
    synthInstrument: 'synth_silk_pad',
    chordPattern: [
      'CHORD_ACCENT', 'ARPEGGIO', 'ARPEGGIO', 'CHORD', 'ARPEGGIO', 'ARPEGGIO',
      'CHORD', 'ARPEGGIO', 'ARPEGGIO', 'CHORD', 'ARPEGGIO', 'ARPEGGIO'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'OFF', 'FIFTH', 'OFF', 'OFF',
      'ROOT', 'OFF', 'OFF', 'FIFTH', 'OFF', 'OFF'
    ],
    synthPattern: [
      'PAD', 'OFF', 'OFF', 'LEAD_ROOT', 'OFF', 'OFF',
      'PAD', 'OFF', 'OFF', 'LEAD_FIFTH', 'OFF', 'OFF'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Hi-Hat 6/8 Pulse', sound: 'hihat_pedal', volume: 0.7, pattern: [2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1] },
      { id: 'p2', name: 'Snare Rim (Beat 4)', sound: 'snare_rimshot', volume: 0.85, pattern: [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0] },
      { id: 'p3', name: 'Kick (Beats 1 & 4)', sound: 'kick_acoustic', volume: 0.9, pattern: [2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0] }
    ]
  },

  // ==========================================
  // --- 3. FUNK ---
  // ==========================================
  {
    id: 'city-pop-funk-16th',
    name: 'Japanese City Pop 80s Groove',
    genre: 'Funk',
    timeSignature: '4/4',
    subdivisionsPerBeat: 4,
    defaultBpm: 112,
    hasEarlyPush: true,
    description: 'Bouncy 80s Japanese City Pop rhythm with crisp 16th guitar muted chugs, synth slap bass, and driving disco hi-hats.',
    rhythmInstrument: 'rhythm_dx7_keys',
    bassInstrument: 'bass_moog_analog',
    synthInstrument: 'synth_poly_brass',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_CHORD',
      'OFF', 'CHORD', 'OFF', 'CHORD',
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_ACCENT',
      'OFF', 'CHORD', 'OFF', 'CHORD'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'ROOT', 'OFF',
      'FIFTH', 'OFF', 'PUSH_NEXT_ROOT', 'OFF',
      'ROOT_ACCENT', 'OFF', 'ROOT', 'OFF',
      'FIFTH', 'OFF', 'PUSH_NEXT_ROOT', 'OFF'
    ],
    synthPattern: [
      'LEAD_ROOT', 'OFF', 'LEAD_FIFTH', 'PUSH_NEXT_LEAD',
      'OFF', 'LEAD_OCTAVE', 'OFF', 'LEAD_ROOT',
      'LEAD_ROOT', 'OFF', 'LEAD_FIFTH', 'PUSH_NEXT_LEAD',
      'OFF', 'LEAD_OCTAVE', 'OFF', 'LEAD_ROOT'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Disco 16th Hi-Hat', sound: 'hihat_808', volume: 0.8, pattern: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Snare Slap (2 & 4)', sound: 'snare_808', volume: 0.85, pattern: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0] },
      { id: 'p3', name: 'Four-on-the-Floor Kick', sound: 'kick_808', volume: 0.95, pattern: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0] }
    ]
  },
  {
    id: 'funk-16th-soul-push',
    name: '16th Soul / Funk Push',
    genre: 'Funk',
    timeSignature: '4/4',
    subdivisionsPerBeat: 4,
    defaultBpm: 100,
    hasEarlyPush: true,
    description: 'Classic Funk 16th strumming pattern. Features tight syncopated chord scratches and anticipated hits on 16th sub-steps.',
    rhythmInstrument: 'rhythm_clavinet',
    bassInstrument: 'bass_slap_funk',
    synthInstrument: 'synth_acid_lead',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'OFF',
      'OFF', 'PUSH_NEXT_CHORD', 'OFF', 'CHORD',
      'CHORD', 'OFF', 'CHORD', 'OFF',
      'OFF', 'PUSH_NEXT_ACCENT', 'OFF', 'CHORD'
    ],
    bassPattern: [
      'ROOT', 'OFF', 'ROOT', 'OFF',
      'OFF', 'PUSH_NEXT_FIFTH', 'FIFTH', 'OFF',
      'ROOT', 'OFF', 'ROOT', 'OFF',
      'OFF', 'PUSH_NEXT_ROOT', 'ROOT', 'OFF'
    ],
    synthPattern: [
      'OFF', 'OFF', 'LEAD_ROOT', 'OFF',
      'OFF', 'PUSH_NEXT_LEAD', 'OFF', 'LEAD_FIFTH',
      'OFF', 'OFF', 'LEAD_ROOT', 'OFF',
      'OFF', 'PUSH_NEXT_LEAD', 'OFF', 'LEAD_OCTAVE'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Funk Hi-Hat', sound: 'hihat_closed', volume: 0.8, pattern: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Snare Clap', sound: 'snare_acoustic', volume: 0.8, pattern: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0] },
      { id: 'p3', name: 'Kick Drum', sound: 'kick_acoustic', volume: 0.9, pattern: [2, 0, 1, 0, 0, 0, 2, 0, 1, 0, 0, 1, 0, 0, 0, 0] }
    ]
  },

  // ==========================================
  // --- 4. JAZZ ---
  // ==========================================
  {
    id: 'jazz-charleston-swing',
    name: 'Jazz Charleston Swing',
    genre: 'Jazz',
    timeSignature: '4/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 140,
    swingRatio: 0.667,
    hasEarlyPush: true,
    description: 'Iconic Jazz Charleston comping with swing feel. Hits Beat 1 then pushes the Beat 3 chord early on the "and" of Beat 2.',
    drumSetId: 'drumset_vintage_jazz_brush',
    rhythmInstrument: 'rhythm_piano',
    bassInstrument: 'bass_upright',
    synthInstrument: 'synth_fm_bell',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'OFF', 'PUSH_NEXT_ACCENT',
      'OFF', 'OFF', 'OFF', 'OFF'
    ],
    bassPattern: [
      'ROOT', 'WALKING', 'FIFTH', 'WALKING',
      'ROOT', 'WALKING', 'FIFTH', 'WALKING'
    ],
    synthPattern: [
      'LEAD_ROOT', 'OFF', 'OFF', 'PUSH_NEXT_LEAD',
      'OFF', 'OFF', 'LEAD_FIFTH', 'OFF'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Pedal Hi-Hat Chick', sound: 'hihat_pedal', volume: 0.75, pattern: [2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Snare Brush Accent', sound: 'snare_brush', volume: 0.7, pattern: [0, 0, 0, 2, 0, 0, 0, 1] },
      { id: 'p3', name: 'Feathered Kick', sound: 'kick_acoustic', volume: 0.7, pattern: [2, 0, 0, 0, 1, 0, 0, 0] }
    ]
  },
  {
    id: 'bossa-jazz-fusion',
    name: 'Bossa-Jazz Fusion',
    genre: 'Jazz',
    timeSignature: '4/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 120,
    swingRatio: 0.600,
    hasEarlyPush: true,
    description: 'Smooth Bossa-Jazz comping with medium swing and early chord stabs pushing beats 3 and 1.',
    drumSetId: 'drumset_bossa_nova',
    rhythmInstrument: 'rhythm_guitar_nylon',
    bassInstrument: 'bass_upright',
    synthInstrument: 'synth_silk_pad',
    chordPattern: [
      'CHORD', 'PUSH_NEXT_CHORD', 'OFF', 'CHORD', 'CHORD', 'PUSH_NEXT_CHORD', 'OFF', 'CHORD'
    ],
    bassPattern: [
      'ROOT', 'OFF', 'FIFTH', 'OFF', 'ROOT', 'OFF', 'WALKING', 'OFF'
    ],
    synthPattern: [
      'PAD', 'PUSH_NEXT_LEAD', 'OFF', 'PAD', 'PAD', 'PUSH_NEXT_LEAD', 'OFF', 'LEAD_ROOT'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Silky Shaker Pulse', sound: 'shaker', volume: 0.7, pattern: [2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Cross-Stick Rimshot', sound: 'snare_rimshot', volume: 0.8, pattern: [1, 0, 1, 2, 1, 0, 1, 0] },
      { id: 'p3', name: 'Soft Surdo / Kick', sound: 'kick_acoustic', volume: 0.75, pattern: [1, 0, 1, 0, 1, 0, 1, 0] }
    ]
  },

  // ==========================================
  // --- 5. LATIN ---
  // ==========================================
  {
    id: 'bossa-nova',
    name: 'Bossa Nova Strum & Push',
    genre: 'Latin',
    timeSignature: '4/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 128,
    hasEarlyPush: true,
    description: 'Classic Brazilian Bossa Nova guitar/piano rhythm. Features early chord anticipation on beat 2 "and" and beat 4 "and".',
    rhythmInstrument: 'rhythm_guitar_nylon',
    bassInstrument: 'bass_upright',
    synthInstrument: 'synth_fm_bell',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'PUSH_NEXT_CHORD', 'CHORD',
      'OFF', 'CHORD', 'PUSH_NEXT_CHORD', 'CHORD'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'PUSH_NEXT_FIFTH', 'FIFTH',
      'ROOT', 'OFF', 'PUSH_NEXT_ROOT', 'ROOT'
    ],
    synthPattern: [
      'LEAD_ROOT', 'OFF', 'PUSH_NEXT_LEAD', 'OFF',
      'LEAD_FIFTH', 'OFF', 'PUSH_NEXT_LEAD', 'OFF'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Cabasa / Shaker', sound: 'shaker', volume: 0.65, pattern: [1, 1, 1, 1, 1, 1, 1, 1] },
      { id: 'p2', name: 'Clave / Rim', sound: 'clave', volume: 0.8, pattern: [2, 0, 1, 0, 0, 2, 1, 0] },
      { id: 'p3', name: 'Surdo / Kick', sound: 'kick_acoustic', volume: 0.9, pattern: [1, 0, 2, 0, 1, 0, 2, 0] }
    ]
  },
  {
    id: 'afro-cuban-montuno',
    name: 'Afro-Cuban Piano Montuno',
    genre: 'Latin',
    timeSignature: '4/4',
    subdivisionsPerBeat: 4,
    defaultBpm: 180,
    hasEarlyPush: true,
    description: 'Authentic 16th-note Piano Montuno pattern. Pushes the upcoming chord on the 4th sixteenth of beats 1 and 3 before downbeats arrive.',
    rhythmInstrument: 'rhythm_piano',
    bassInstrument: 'bass_upright',
    synthInstrument: 'synth_marimba',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_CHORD',
      'OFF', 'CHORD', 'OFF', 'CHORD',
      'OFF', 'CHORD', 'OFF', 'PUSH_NEXT_CHORD',
      'OFF', 'CHORD', 'OFF', 'CHORD'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'OFF', 'OFF',
      'OFF', 'OFF', 'PUSH_NEXT_FIFTH', 'OFF',
      'OFF', 'OFF', 'OFF', 'OFF',
      'OFF', 'OFF', 'PUSH_NEXT_ROOT', 'OFF'
    ],
    synthPattern: [
      'LEAD_ROOT', 'OFF', 'LEAD_FIFTH', 'PUSH_NEXT_LEAD',
      'OFF', 'LEAD_ROOT', 'OFF', 'LEAD_OCTAVE',
      'OFF', 'LEAD_ROOT', 'OFF', 'PUSH_NEXT_LEAD',
      'OFF', 'LEAD_ROOT', 'OFF', 'LEAD_FIFTH'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Cascara / Shaker', sound: 'shaker', volume: 0.7, pattern: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Son Clave (3:2)', sound: 'clave', volume: 0.9, pattern: [2, 0, 0, 1, 0, 0, 2, 0, 0, 0, 2, 0, 2, 0, 0, 0] },
      { id: 'p3', name: 'Conga / Kick', sound: 'conga_low', volume: 0.85, pattern: [1, 0, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 2, 0] }
    ]
  },

  // ==========================================
  // --- 6. WORLD ---
  // ==========================================
  {
    id: 'reggae-one-drop',
    name: 'Reggae / Ska One-Drop',
    genre: 'World',
    timeSignature: '4/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 84,
    hasEarlyPush: true,
    description: 'Reggae One-Drop rhythm with offbeat skank chords on the "and" of each beat and early push into Beat 3.',
    rhythmInstrument: 'rhythm_organ_b3',
    bassInstrument: 'bass_sub_808',
    synthInstrument: 'synth_fm_bell',
    chordPattern: [
      'OFF', 'CHORD_ACCENT', 'OFF', 'PUSH_NEXT_ACCENT',
      'OFF', 'CHORD_ACCENT', 'OFF', 'CHORD_ACCENT'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'OFF', 'OFF',
      'ROOT', 'OFF', 'FIFTH', 'OFF'
    ],
    synthPattern: [
      'OFF', 'LEAD_ROOT', 'OFF', 'PUSH_NEXT_LEAD',
      'OFF', 'LEAD_ROOT', 'OFF', 'LEAD_FIFTH'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Hi-Hat Offbeats', sound: 'hihat_closed', volume: 0.8, pattern: [0, 2, 0, 2, 0, 2, 0, 2] },
      { id: 'p2', name: 'One-Drop Snare/Rim', sound: 'snare_rimshot', volume: 0.9, pattern: [0, 0, 0, 0, 2, 0, 0, 0] },
      { id: 'p3', name: 'One-Drop Kick', sound: 'kick_acoustic', volume: 0.95, pattern: [0, 0, 0, 0, 2, 0, 0, 0] }
    ]
  },

  // ==========================================
  // --- 7. FLAMENCO ---
  // ==========================================
  {
    id: 'flamenco-tangos-rasgueado',
    name: 'Tangos Flamencos (Contratiempo)',
    genre: 'Flamenco',
    timeSignature: '4/4',
    subdivisionsPerBeat: 4,
    defaultBpm: 118,
    hasEarlyPush: true,
    description: 'Authentic 4/4 Tangos Flamencos with 16th-note contratiempo rasgueado syncopation, palmas sordas, and cajón accents.',
    rhythmInstrument: 'rhythm_guitar_nylon',
    bassInstrument: 'bass_upright',
    synthInstrument: 'synth_lofi_tape',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_CHORD',
      'CHORD_ACCENT', 'OFF', 'CHORD', 'OFF',
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_ACCENT',
      'CHORD_ACCENT', 'OFF', 'CHORD', 'OFF'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'OFF', 'OFF',
      'FIFTH', 'OFF', 'PUSH_NEXT_ROOT', 'OFF',
      'ROOT_ACCENT', 'OFF', 'OFF', 'OFF',
      'FIFTH', 'OFF', 'PUSH_NEXT_ROOT', 'OFF'
    ],
    synthPattern: [
      'LEAD_ROOT', 'OFF', 'LEAD_ROOT', 'PUSH_NEXT_LEAD',
      'LEAD_ROOT', 'OFF', 'OFF', 'OFF',
      'LEAD_ROOT', 'OFF', 'LEAD_ROOT', 'PUSH_NEXT_LEAD',
      'LEAD_ROOT', 'OFF', 'OFF', 'OFF'
    ],
    percussionLayers: [
      { id: 'palmas', name: 'Palmas Sordas', sound: 'palmas_sordas', volume: 0.85, pattern: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'cajon_slap', name: 'Cajón Agudo', sound: 'cajon_slap', volume: 0.75, pattern: [0, 2, 0, 1, 2, 0, 1, 0, 0, 2, 0, 1, 2, 0, 1, 0] },
      { id: 'cajon_bass', name: 'Cajón Grave', sound: 'cajon_bass', volume: 0.9, pattern: [2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0] }
    ]
  }
];

const LOCAL_STORAGE_KEY = 'accompaniment_user_groove_presets_v2';

export function getUserGroovePresets(): GroovePatternPreset[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse user groove presets', e);
    return [];
  }
}

export function saveUserGroovePreset(preset: GroovePatternPreset): GroovePatternPreset[] {
  try {
    const existing = getUserGroovePresets();
    const idx = existing.findIndex(p => p.id === preset.id);
    let updated: GroovePatternPreset[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = { ...preset, isUserPreset: true };
    } else {
      updated = [{ ...preset, isUserPreset: true }, ...existing];
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save user groove preset', e);
    return getUserGroovePresets();
  }
}

export function deleteUserGroovePreset(id: string): GroovePatternPreset[] {
  try {
    const existing = getUserGroovePresets();
    const updated = existing.filter(p => p.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete user groove preset', e);
    return getUserGroovePresets();
  }
}
