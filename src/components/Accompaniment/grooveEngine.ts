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

export interface PercussionLayer {
  id: string;
  name: string;
  sound: MetronomeSound;
  volume: number;
  muted?: boolean;
  pattern: number[]; // 0: off, 1: normal, 2: accent for each step
}

export type GrooveGenre = 'Rock' | 'Jazz' | 'Latin' | 'Funk' | 'Pop' | 'Flamenco' | 'World';

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
  percussionLayers: PercussionLayer[];
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
      return { label: 'Bass 5th', short: '5TH', style: 'bg-violet-500/20 text-violet-300 border-violet-500/40' };
    case 'PUSH_NEXT_ROOT':
      return { label: 'Push Next Bass Root ➜', short: 'P-ROOT ➜', style: 'bg-amber-500/30 text-amber-300 border-amber-400/60 font-semibold' };
    case 'PUSH_NEXT_FIFTH':
      return { label: 'Push Next Bass 5th ➜', short: 'P-5TH ➜', style: 'bg-orange-500/30 text-orange-300 border-orange-400/60' };
    case 'WALKING':
      return { label: 'Walking Step', short: 'WALK', style: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' };
    case 'OFF':
    default:
      return { label: 'Rest', short: '-', style: 'bg-slate-900/40 text-slate-600 border-slate-800' };
  }
}

// Default Presets across Latin, Jazz, Rock, Funk, Pop, World
export const GROOVE_PRESETS: GroovePatternPreset[] = [
  // --- FLAMENCO ---
  {
    id: 'flamenco-tangos-rasgueado',
    name: 'Tangos Flamencos (Contratiempo)',
    genre: 'Flamenco',
    timeSignature: '4/4',
    subdivisionsPerBeat: 4, // 16th notes (16 steps per measure)
    defaultBpm: 118,
    hasEarlyPush: true,
    description: 'Authentic 4/4 Tangos Flamencos with 16th-note contratiempo rasgueado syncopation, palmas sordas, and cajón accents.',
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
    percussionLayers: [
      { id: 'palmas', name: 'Palmas Sordas', sound: MetronomeSound.Clap, volume: 0.8, pattern: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'cajon_slap', name: 'Cajón Agudo', sound: MetronomeSound.Woodblock, volume: 0.7, pattern: [0, 2, 0, 1, 2, 0, 1, 0, 0, 2, 0, 1, 2, 0, 1, 0] },
      { id: 'cajon_bass', name: 'Cajón Grave', sound: MetronomeSound.Kick, volume: 0.85, pattern: [2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0] }
    ]
  },
  {
    id: 'flamenco-rumba-ventilador',
    name: 'Rumba Flamenca (Ventilador)',
    genre: 'Flamenco',
    timeSignature: '4/4',
    subdivisionsPerBeat: 4, // 16th notes
    defaultBpm: 134,
    hasEarlyPush: true,
    description: 'High-energy Rumba Flamenca with iconic "ventilador" strumming, golpe slap accents, and driving cajón rumbero.',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_CHORD',
      'CHORD_ACCENT', 'OFF', 'CHORD', 'OFF',
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_ACCENT',
      'CHORD_ACCENT', 'OFF', 'CHORD', 'OFF'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'ROOT', 'OFF',
      'OFF', 'OFF', 'PUSH_NEXT_FIFTH', 'OFF',
      'ROOT_ACCENT', 'OFF', 'ROOT', 'OFF',
      'OFF', 'OFF', 'PUSH_NEXT_ROOT', 'OFF'
    ],
    percussionLayers: [
      { id: 'palmas_clear', name: 'Palmas Claras', sound: MetronomeSound.Clap, volume: 0.75, pattern: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'cajon_snare', name: 'Cajón Slap', sound: MetronomeSound.Snare, volume: 0.7, pattern: [0, 0, 2, 0, 2, 0, 0, 1, 0, 0, 2, 0, 2, 0, 0, 1] },
      { id: 'cajon_bass', name: 'Cajón Bass', sound: MetronomeSound.Kick, volume: 0.85, pattern: [2, 0, 0, 1, 0, 0, 2, 0, 2, 0, 0, 1, 0, 0, 2, 0] }
    ]
  },
  {
    id: 'flamenco-bulerias-compas',
    name: 'Bulerías Remate (4/4 Strum)',
    genre: 'Flamenco',
    timeSignature: '4/4',
    subdivisionsPerBeat: 4,
    defaultBpm: 180,
    hasEarlyPush: true,
    description: 'Driving 4/4 Bulerías remate rhythm with sharp rasgueado accents and syncopated pushes.',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_ACCENT',
      'CHORD_ACCENT', 'OFF', 'CHORD', 'OFF',
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_ACCENT',
      'CHORD_ACCENT', 'OFF', 'CHORD', 'OFF'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'OFF', 'PUSH_NEXT_ROOT',
      'ROOT', 'OFF', 'OFF', 'OFF',
      'ROOT_ACCENT', 'OFF', 'OFF', 'PUSH_NEXT_ROOT',
      'ROOT', 'OFF', 'OFF', 'OFF'
    ],
    percussionLayers: [
      { id: 'palmas', name: 'Palmas', sound: MetronomeSound.Clap, volume: 0.8, pattern: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'cajon_tac', name: 'Cajón Tacón', sound: MetronomeSound.Woodblock, volume: 0.75, pattern: [2, 0, 1, 2, 0, 2, 1, 0, 2, 0, 1, 2, 0, 2, 1, 0] },
      { id: 'cajon_bass', name: 'Cajón Bass', sound: MetronomeSound.Kick, volume: 0.85, pattern: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0] }
    ]
  },
  {
    id: 'flamenco-12beat-compas',
    name: 'Soleá / Bulerías / Alegrías (12-Beat Compás in 3/4)',
    genre: 'Flamenco',
    timeSignature: '3/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 145,
    hasEarlyPush: true,
    description: 'Traditional 12-beat Flamenco compás in 3/4 (4 bars of 3/4 = 12 beats). Highlights accents on beats 3, 6, 8, 10, 12.',
    chordPattern: [
      'CHORD', 'OFF', 'CHORD', 'OFF', 'CHORD_ACCENT', 'OFF'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'OFF', 'OFF', 'ROOT', 'OFF'
    ],
    percussionLayers: [
      { id: 'palmas', name: 'Palmas Sordas', sound: MetronomeSound.Clap, volume: 0.8, pattern: [1, 1, 1, 1, 2, 1] },
      { id: 'cajon_slap', name: 'Cajón Slap', sound: MetronomeSound.Woodblock, volume: 0.75, pattern: [0, 1, 0, 1, 2, 0] },
      { id: 'cajon_bass', name: 'Cajón Bass', sound: MetronomeSound.Kick, volume: 0.85, pattern: [2, 0, 0, 0, 1, 0] }
    ]
  },

  // --- LATIN ---
  {
    id: 'bossa-nova',
    name: 'Bossa Nova Strum & Push',
    genre: 'Latin',
    timeSignature: '4/4',
    subdivisionsPerBeat: 2, // 8th notes (8 steps per measure)
    defaultBpm: 128,
    hasEarlyPush: true,
    description: 'Classic Brazilian Bossa Nova guitar/piano rhythm. Features early chord anticipation (Push) on beat 2 "and" and beat 4 "and" into the next beats.',
    chordPattern: [
      'CHORD_ACCENT',  // Beat 1
      'OFF',           // 1 and
      'PUSH_NEXT_CHORD', // Beat 2 (Pushes Beat 2 chord early!)
      'CHORD',         // 2 and
      'OFF',           // Beat 3
      'CHORD',         // 3 and
      'PUSH_NEXT_CHORD', // Beat 4 (Pushes Beat 1 of next chord early!)
      'CHORD'          // 4 and
    ],
    bassPattern: [
      'ROOT_ACCENT',   // Beat 1
      'OFF',           // 1 and
      'PUSH_NEXT_FIFTH', // 2
      'FIFTH',         // 2 and
      'ROOT',          // 3
      'OFF',           // 3 and
      'PUSH_NEXT_ROOT', // 4
      'ROOT'           // 4 and
    ],
    percussionLayers: [
      { id: 'p1', name: 'Cabasa / Shaker', sound: MetronomeSound.HiHat, volume: 0.6, pattern: [1, 1, 1, 1, 1, 1, 1, 1] },
      { id: 'p2', name: 'Clave / Rim', sound: MetronomeSound.Woodblock, volume: 0.8, pattern: [2, 0, 1, 0, 0, 2, 1, 0] },
      { id: 'p3', name: 'Surdo / Kick', sound: MetronomeSound.Kick, volume: 0.9, pattern: [1, 0, 2, 0, 1, 0, 2, 0] }
    ]
  },
  {
    id: 'afro-cuban-montuno',
    name: 'Afro-Cuban Piano Montuno',
    genre: 'Latin',
    timeSignature: '4/4',
    subdivisionsPerBeat: 4, // 16th notes (16 steps total)
    defaultBpm: 180,
    hasEarlyPush: true,
    description: 'Authentic 16th-note Piano Montuno pattern. Pushes the upcoming chord on the 4th sixteenth of beats 1 and 3 before the downbeats arrive.',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_CHORD', // Beat 1 (Step 4 pushes Beat 2 chord early!)
      'OFF', 'CHORD', 'OFF', 'CHORD',                   // Beat 2
      'OFF', 'CHORD', 'OFF', 'PUSH_NEXT_CHORD',          // Beat 3 (Step 12 pushes Beat 4 chord early!)
      'OFF', 'CHORD', 'OFF', 'CHORD'                    // Beat 4
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'OFF', 'OFF',               // Beat 1
      'OFF', 'OFF', 'PUSH_NEXT_FIFTH', 'OFF',           // Beat 2 (Tumbao anticipation)
      'OFF', 'OFF', 'OFF', 'OFF',                       // Beat 3
      'OFF', 'OFF', 'PUSH_NEXT_ROOT', 'OFF'            // Beat 4 (Tumbao anticipation)
    ],
    percussionLayers: [
      { id: 'p1', name: 'Cascara / Hi-Hat', sound: MetronomeSound.HiHat, volume: 0.7, pattern: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Son Clave (3:2)', sound: MetronomeSound.Woodblock, volume: 0.9, pattern: [2, 0, 0, 1, 0, 0, 2, 0, 0, 0, 2, 0, 2, 0, 0, 0] },
      { id: 'p3', name: 'Conga / Kick', sound: MetronomeSound.Kick, volume: 0.8, pattern: [1, 0, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 2, 0] }
    ]
  },
  {
    id: 'samba-de-roda',
    name: 'Samba de Roda (Rio)',
    genre: 'Latin',
    timeSignature: '4/4',
    subdivisionsPerBeat: 4,
    defaultBpm: 200,
    hasEarlyPush: true,
    description: 'High-energy Rio Samba rhythm with syncopated chord stabs pushing the downbeats of beats 2 and 4.',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'PUSH_NEXT_CHORD', 'CHORD', // Beat 1
      'OFF', 'CHORD', 'OFF', 'CHORD',                   // Beat 2
      'CHORD', 'OFF', 'PUSH_NEXT_CHORD', 'CHORD',        // Beat 3
      'OFF', 'CHORD', 'OFF', 'CHORD'                    // Beat 4
    ],
    bassPattern: [
      'ROOT', 'OFF', 'OFF', 'OFF',
      'PUSH_NEXT_FIFTH', 'OFF', 'FIFTH', 'OFF',
      'ROOT', 'OFF', 'OFF', 'OFF',
      'PUSH_NEXT_ROOT', 'OFF', 'ROOT', 'OFF'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Agogo Cowbell', sound: MetronomeSound.Cowbell, volume: 0.85, pattern: [2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0] },
      { id: 'p2', name: 'Tamborim / HiHat', sound: MetronomeSound.HiHat, volume: 0.7, pattern: [1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1] },
      { id: 'p3', name: 'Surdo Bass Kick', sound: MetronomeSound.Kick, volume: 0.9, pattern: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0] }
    ]
  },

  // --- JAZZ ---
  {
    id: 'jazz-charleston-swing',
    name: 'Jazz Charleston Swing',
    genre: 'Jazz',
    timeSignature: '4/4',
    subdivisionsPerBeat: 2, // 8th notes swing
    defaultBpm: 140,
    swingRatio: 0.667, // 2:1 swing feel
    hasEarlyPush: true,
    description: 'Iconic Jazz Charleston comping with swing feel. Hits Beat 1 then pushes the Beat 3 chord early on the "and" of Beat 2.',
    chordPattern: [
      'CHORD_ACCENT',  // Beat 1
      'OFF',           // 1 and
      'OFF',           // Beat 2
      'PUSH_NEXT_ACCENT', // 2 and (Pushes Beat 3 chord early!)
      'OFF',           // Beat 3
      'OFF',           // 3 and
      'OFF',           // Beat 4
      'OFF'            // 4 and
    ],
    bassPattern: [
      'ROOT',          // Beat 1
      'WALKING',       // 1 and
      'FIFTH',         // Beat 2
      'WALKING',       // 2 and
      'ROOT',          // Beat 3
      'WALKING',       // 3 and
      'FIFTH',         // Beat 4
      'WALKING'        // 4 and
    ],
    percussionLayers: [
      { id: 'p1', name: 'Ride Cymbal Swing', sound: MetronomeSound.HiHat, volume: 0.8, pattern: [2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Snare Brush Accent', sound: MetronomeSound.Snare, volume: 0.6, pattern: [0, 0, 0, 2, 0, 0, 0, 1] },
      { id: 'p3', name: 'Hi-Hat Foot (2 & 4)', sound: MetronomeSound.Woodblock, volume: 0.7, pattern: [0, 0, 2, 0, 0, 0, 2, 0] }
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
    chordPattern: [
      'CHORD', 'PUSH_NEXT_CHORD', 'OFF', 'CHORD', 'CHORD', 'PUSH_NEXT_CHORD', 'OFF', 'CHORD'
    ],
    bassPattern: [
      'ROOT', 'OFF', 'FIFTH', 'OFF', 'ROOT', 'OFF', 'WALKING', 'OFF'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Ride Cymbal', sound: MetronomeSound.HiHat, volume: 0.75, pattern: [2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Snare Feathering', sound: MetronomeSound.Snare, volume: 0.5, pattern: [1, 0, 1, 2, 1, 0, 1, 0] },
      { id: 'p3', name: 'Feathered Kick', sound: MetronomeSound.Kick, volume: 0.6, pattern: [1, 0, 1, 0, 1, 0, 1, 0] }
    ]
  },

  // --- ROCK ---
  {
    id: 'rock-driving-push',
    name: 'Driving 8th Rock Push',
    genre: 'Rock',
    timeSignature: '4/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 124,
    hasEarlyPush: true,
    description: 'Driving syncopated rock rhythm. Strums Beat 1, then anticipates (pushes) Beat 3 on the "and" of Beat 2, and Beat 1 on the "and" of Beat 4.',
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
      'ROOT_ACCENT',   // Beat 1
      'ROOT',          // 1 and
      'ROOT',          // Beat 2
      'PUSH_NEXT_ROOT',// 2 and
      'ROOT',          // Beat 3
      'ROOT',          // 3 and
      'ROOT',          // Beat 4
      'PUSH_NEXT_ROOT' // 4 and
    ],
    percussionLayers: [
      { id: 'p1', name: '8th Hi-Hat', sound: MetronomeSound.HiHat, volume: 0.8, pattern: [2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Rock Snare (2 & 4)', sound: MetronomeSound.Snare, volume: 0.9, pattern: [0, 0, 2, 0, 0, 0, 2, 0] },
      { id: 'p3', name: 'Punchy Kick', sound: MetronomeSound.Kick, volume: 0.95, pattern: [2, 0, 0, 1, 2, 0, 0, 0] }
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
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'OFF',           // Beat 1
      'OFF', 'CHORD', 'OFF', 'PUSH_NEXT_CHORD',        // Beat 2 (Step 8 pushes Beat 3!)
      'OFF', 'CHORD', 'OFF', 'CHORD',                 // Beat 3
      'OFF', 'CHORD', 'OFF', 'PUSH_NEXT_ACCENT'        // Beat 4 (Step 16 pushes Beat 1!)
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'ROOT', 'OFF',
      'FIFTH', 'OFF', 'PUSH_NEXT_ROOT', 'OFF',
      'ROOT', 'OFF', 'ROOT', 'OFF',
      'FIFTH', 'OFF', 'PUSH_NEXT_ROOT', 'OFF'
    ],
    percussionLayers: [
      { id: 'p1', name: '16th Hi-Hat', sound: MetronomeSound.HiHat, volume: 0.75, pattern: [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1] },
      { id: 'p2', name: 'Snare + Ghost Notes', sound: MetronomeSound.Snare, volume: 0.85, pattern: [0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0] },
      { id: 'p3', name: 'Funk Kick', sound: MetronomeSound.Kick, volume: 0.9, pattern: [2, 0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 0, 0, 1, 0, 0] }
    ]
  },

  // --- FUNK ---
  {
    id: 'city-pop-funk-16th',
    name: 'Japanese City Pop 80s Groove',
    genre: 'Funk',
    timeSignature: '4/4',
    subdivisionsPerBeat: 4,
    defaultBpm: 112,
    hasEarlyPush: true,
    description: 'Bouncy 80s Japanese City Pop rhythm with crisp 16th guitar muted chugs, synth slap bass, and driving disco hi-hats.',
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
    percussionLayers: [
      { id: 'p1', name: 'Disco 16th Hi-Hat', sound: MetronomeSound.HiHat, volume: 0.8, pattern: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Snare Slap (2 & 4)', sound: MetronomeSound.Snare, volume: 0.85, pattern: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0] },
      { id: 'p3', name: 'Four-on-the-Floor Kick', sound: MetronomeSound.Kick, volume: 0.95, pattern: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0] }
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
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_CHORD',
      'CHORD_ACCENT', 'OFF', 'CHORD', 'OFF'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'WALKING', 'FIFTH', 'WALKING',
      'ROOT', 'WALKING', 'FIFTH', 'WALKING'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Shuffle Hi-Hat', sound: MetronomeSound.HiHat, volume: 0.8, pattern: [2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Backbeat Snare', sound: MetronomeSound.Snare, volume: 0.85, pattern: [0, 0, 2, 0, 0, 0, 2, 0] },
      { id: 'p3', name: 'Blues Kick', sound: MetronomeSound.Kick, volume: 0.9, pattern: [2, 0, 0, 1, 2, 0, 0, 0] }
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
    percussionLayers: [
      { id: 'p1', name: 'Funk Hi-Hat', sound: MetronomeSound.HiHat, volume: 0.8, pattern: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Snare Clap', sound: MetronomeSound.Clap, volume: 0.8, pattern: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0] },
      { id: 'p3', name: 'Kick Drum', sound: MetronomeSound.Kick, volume: 0.9, pattern: [2, 0, 1, 0, 0, 0, 2, 0, 1, 0, 0, 1, 0, 0, 0, 0] }
    ]
  },

  // --- POP & WORLD ---
  {
    id: 'reggae-one-drop',
    name: 'Reggae / Ska One-Drop',
    genre: 'World',
    timeSignature: '4/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 84,
    hasEarlyPush: true,
    description: 'Reggae One-Drop rhythm with offbeat skank chords on the "and" of each beat and early push into Beat 3.',
    chordPattern: [
      'OFF',           // Beat 1
      'CHORD_ACCENT',  // 1 and (Offbeat Skank)
      'OFF',           // Beat 2
      'PUSH_NEXT_ACCENT', // 2 and (Pushes Beat 3 early!)
      'OFF',           // Beat 3
      'CHORD_ACCENT',  // 3 and
      'OFF',           // Beat 4
      'CHORD_ACCENT'   // 4 and
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'OFF', 'OFF', 'ROOT', 'OFF', 'FIFTH', 'OFF'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Hi-Hat Offbeats', sound: MetronomeSound.HiHat, volume: 0.8, pattern: [0, 2, 0, 2, 0, 2, 0, 2] },
      { id: 'p2', name: 'One-Drop Snare/Rim', sound: MetronomeSound.Snare, volume: 0.9, pattern: [0, 0, 0, 0, 2, 0, 0, 0] },
      { id: 'p3', name: 'One-Drop Kick', sound: MetronomeSound.Kick, volume: 0.95, pattern: [0, 0, 0, 0, 2, 0, 0, 0] }
    ]
  },
  {
    id: 'pop-acoustic-push',
    name: 'Pop Acoustic Strum & Push',
    genre: 'Pop',
    timeSignature: '4/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 110,
    hasEarlyPush: true,
    description: 'Standard modern Pop acoustic strum pattern with syncopated chord anticipation on the "and" of Beat 2.',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'PUSH_NEXT_CHORD', 'OFF', 'CHORD', 'CHORD', 'PUSH_NEXT_CHORD'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'ROOT', 'PUSH_NEXT_ROOT', 'ROOT', 'OFF', 'FIFTH', 'PUSH_NEXT_ROOT'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Hi-Hat', sound: MetronomeSound.HiHat, volume: 0.75, pattern: [2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Snare / Clap', sound: MetronomeSound.Clap, volume: 0.8, pattern: [0, 0, 2, 0, 0, 0, 2, 0] },
      { id: 'p3', name: 'Kick', sound: MetronomeSound.Kick, volume: 0.9, pattern: [2, 0, 0, 1, 2, 0, 0, 0] }
    ]
  },
  {
    id: 'jazz-waltz-34',
    name: '3/4 Jazz Swing Waltz',
    genre: 'Jazz',
    timeSignature: '3/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 115,
    swingRatio: 0.667,
    hasEarlyPush: true,
    description: 'Elegant 3/4 Jazz waltz with swinging ride cymbal, walking bass, and soft comping on beat 2 and 3.',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'CHORD', 'OFF', 'CHORD', 'PUSH_NEXT_CHORD'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'WALKING', 'OFF', 'FIFTH', 'OFF'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Ride Cymbal Swing', sound: MetronomeSound.HiHat, volume: 0.8, pattern: [2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Snare Brush', sound: MetronomeSound.Snare, volume: 0.5, pattern: [0, 0, 1, 0, 1, 0] },
      { id: 'p3', name: 'Hi-Hat Foot (2 & 3)', sound: MetronomeSound.Woodblock, volume: 0.6, pattern: [0, 0, 2, 0, 2, 0] }
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
    chordPattern: [
      'CHORD_ACCENT', 'ARPEGGIO', 'ARPEGGIO', 'CHORD', 'ARPEGGIO', 'ARPEGGIO',
      'CHORD', 'ARPEGGIO', 'ARPEGGIO', 'CHORD', 'ARPEGGIO', 'ARPEGGIO'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'OFF', 'FIFTH', 'OFF', 'OFF',
      'ROOT', 'OFF', 'OFF', 'FIFTH', 'OFF', 'OFF'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Hi-Hat 6/8 Pulse', sound: MetronomeSound.HiHat, volume: 0.7, pattern: [2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1] },
      { id: 'p2', name: 'Snare Rim (Beat 4)', sound: MetronomeSound.Snare, volume: 0.85, pattern: [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0] },
      { id: 'p3', name: 'Kick (Beats 1 & 4)', sound: MetronomeSound.Kick, volume: 0.9, pattern: [2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0] }
    ]
  },
  {
    id: '54-cool-jazz',
    name: '5/4 Cool Jazz Stride',
    genre: 'Jazz',
    timeSignature: '5/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 140,
    swingRatio: 0.667,
    hasEarlyPush: true,
    description: 'Asymmetric 3+2 5/4 cool jazz groove with syncopated chord comping and walking bassline.',
    chordPattern: [
      'CHORD_ACCENT', 'OFF', 'OFF', 'CHORD', 'PUSH_NEXT_CHORD', 'OFF', 'CHORD', 'OFF', 'CHORD', 'OFF'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'WALKING', 'OFF', 'FIFTH', 'OFF', 'ROOT', 'OFF', 'WALKING', 'OFF'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Ride Cymbal 5/4', sound: MetronomeSound.HiHat, volume: 0.8, pattern: [2, 1, 2, 1, 2, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Snare Accent', sound: MetronomeSound.Snare, volume: 0.6, pattern: [0, 0, 0, 2, 0, 0, 2, 0, 0, 0] },
      { id: 'p3', name: 'Kick', sound: MetronomeSound.Kick, volume: 0.8, pattern: [2, 0, 0, 0, 0, 0, 1, 0, 0, 0] }
    ]
  },
  {
    id: 'country-waltz-34',
    name: '3/4 Country / Folk Waltz',
    genre: 'World',
    timeSignature: '3/4',
    subdivisionsPerBeat: 2,
    defaultBpm: 92,
    hasEarlyPush: false,
    description: 'Warm acoustic boom-chick country waltz with bass on beat 1 and acoustic strum on beats 2 and 3.',
    chordPattern: [
      'OFF', 'OFF', 'CHORD', 'OFF', 'CHORD', 'OFF'
    ],
    bassPattern: [
      'ROOT_ACCENT', 'OFF', 'OFF', 'OFF', 'FIFTH', 'OFF'
    ],
    percussionLayers: [
      { id: 'p1', name: 'Brushed Hi-Hat', sound: MetronomeSound.HiHat, volume: 0.65, pattern: [1, 1, 2, 1, 2, 1] },
      { id: 'p2', name: 'Snare Tap', sound: MetronomeSound.Snare, volume: 0.5, pattern: [0, 0, 1, 0, 1, 0] },
      { id: 'p3', name: 'Kick (Beat 1)', sound: MetronomeSound.Kick, volume: 0.85, pattern: [2, 0, 0, 0, 0, 0] }
    ]
  }
];

const LOCAL_STORAGE_KEY = 'accompaniment_user_groove_presets_v1';

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
