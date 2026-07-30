/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProgressionPreset {
  id: string;
  name: string;
  genre: string;
  timeSignature: '4/4' | '3/4' | '6/8' | '5/4';
  description: string;
  bpm?: number;
  chordsPerBeat: string[];
}

export const PROGRESSION_PRESETS: ProgressionPreset[] = [
  // --- 4/4 TIME SIGNATURE ---
  {
    id: '12-bar-blues-c',
    name: '12-Bar Blues in C',
    genre: 'Blues',
    timeSignature: '4/4',
    description: 'Classic 12-bar dominant 7th quick-change blues progression',
    bpm: 110,
    chordsPerBeat: [
      // m1: C7
      'C7', '', '', '',
      // m2: F7
      'F7', '', '', '',
      // m3: C7
      'C7', '', '', '',
      // m4: C7
      'C7', '', '', '',
      // m5: F7
      'F7', '', '', '',
      // m6: F7
      'F7', '', '', '',
      // m7: C7
      'C7', '', '', '',
      // m8: C7
      'C7', '', '', '',
      // m9: G7
      'G7', '', '', '',
      // m10: F7
      'F7', '', '', '',
      // m11: C7
      'C7', '', '', '',
      // m12: G7
      'G7', '', '', '',
    ],
  },
  {
    id: 'pop-i-v-vi-iv',
    name: 'Axis of Awesome (I–V–vi–IV)',
    genre: 'Pop',
    timeSignature: '4/4',
    description: 'The iconic 4-chord pop progression used in hundreds of hit songs',
    bpm: 120,
    chordsPerBeat: [
      'C', '', '', '',
      'G', '', '', '',
      'Am', '', '', '',
      'F', '', '', '',
    ],
  },
  {
    id: 'jpop-oudou',
    name: 'Royal Road / Oudou (王道進行)',
    genre: 'J-Pop / Anime',
    timeSignature: '4/4',
    description: 'The famous IVmaj7–V7–iiim7–vim7 progression ubiquitous in J-Pop & Anime',
    bpm: 128,
    chordsPerBeat: [
      'Fmaj7', '', '', '',
      'G7', '', '', '',
      'Em7', '', '', '',
      'Am7', '', '', '',
    ],
  },
  {
    id: 'bossa-ipanema',
    name: 'Bossa Nova Standard',
    genre: 'Bossa Nova',
    timeSignature: '4/4',
    description: 'Lush Brazilian jazz samba progression with smooth extensions',
    bpm: 124,
    chordsPerBeat: [
      'Fmaj7', '', '', '',
      'G7', '', '', '',
      'Gm7', '', '', '',
      'C7', '', '', '',
    ],
  },
  {
    id: 'jazz-ii-v-i-vi',
    name: 'Jazz Turnaround (ii–V–I–VI)',
    genre: 'Jazz',
    timeSignature: '4/4',
    description: 'Essential bebop & American songbook turnaround in C major',
    bpm: 130,
    chordsPerBeat: [
      'Dm7', '', '', '',
      'G7', '', '', '',
      'Cmaj7', '', '', '',
      'A7', '', '', '',
    ],
  },
  {
    id: 'andalusian-cadence',
    name: 'Andalusian Cadence',
    genre: 'Flamenco / Rock',
    timeSignature: '4/4',
    description: 'Dramatic descending minor cadence (i–♭VII–♭VI–V)',
    bpm: 115,
    chordsPerBeat: [
      'Am', '', '', '',
      'G', '', '', '',
      'F', '', '', '',
      'E', '', '', '',
    ],
  },
  {
    id: '50s-doo-wop',
    name: '50s Doo-Wop (I–vi–IV–V)',
    genre: 'Oldies / Pop',
    timeSignature: '4/4',
    description: 'Heart and Soul style classic 1950s ballad progression',
    bpm: 100,
    chordsPerBeat: [
      'C', '', '', '',
      'Am', '', '', '',
      'F', '', '', '',
      'G', '', '', '',
    ],
  },
  {
    id: 'neo-soul-groove',
    name: 'Neo-Soul Groove',
    genre: 'R&B / Soul',
    timeSignature: '4/4',
    description: 'Rich extended 9th & 13th chords with altered dominant tension',
    bpm: 85,
    chordsPerBeat: [
      'Dm9', '', '', '',
      'G13', '', '', '',
      'Cmaj9', '', '', '',
      'A7#9', '', '', '',
    ],
  },
  {
    id: 'rock-creep',
    name: 'Alternative Rock Major-Minor',
    genre: 'Rock',
    timeSignature: '4/4',
    description: 'Moody chromatic rock progression featuring the minor IV chord (I–III–IV–iv)',
    bpm: 92,
    chordsPerBeat: [
      'C', '', '', '',
      'E', '', '', '',
      'F', '', '', '',
      'Fm', '', '', '',
    ],
  },

  // --- 3/4 TIME SIGNATURE (Waltz / Triple Meter) ---
  {
    id: 'jazz-waltz-ii-v-i',
    name: 'Jazz Waltz (ii–V–I)',
    genre: 'Jazz',
    timeSignature: '3/4',
    description: 'Smooth 3/4 jazz waltz swing progression',
    bpm: 110,
    chordsPerBeat: [
      'Dm7', '', '',
      'G7', '', '',
      'Cmaj7', '', '',
      'Cmaj7', '', '',
    ],
  },
  {
    id: 'pop-ballad-waltz',
    name: 'Pop Ballad Waltz',
    genre: 'Pop',
    timeSignature: '3/4',
    description: 'Sentimental 3/4 triple-meter ballad loop',
    bpm: 96,
    chordsPerBeat: [
      'C', '', '',
      'Am', '', '',
      'F', '', '',
      'G', '', '',
    ],
  },
  {
    id: 'minor-romance-waltz',
    name: 'Minor Romance Waltz',
    genre: 'Classical / Folk',
    timeSignature: '3/4',
    description: 'Melancholic European folk & classical waltz cadence (i–iv–V7–i)',
    bpm: 105,
    chordsPerBeat: [
      'Am', '', '',
      'Dm', '', '',
      'E7', '', '',
      'Am', '', '',
    ],
  },
  {
    id: 'jpop-waltz-theme',
    name: 'J-Pop Emotional Waltz',
    genre: 'J-Pop / Anime',
    timeSignature: '3/4',
    description: 'Expressive anime soundtrack waltz theme (IV–V–iii–vi)',
    bpm: 120,
    chordsPerBeat: [
      'F', '', '',
      'G', '', '',
      'Em', '', '',
      'Am', '', '',
    ],
  },

  // --- 6/8 TIME SIGNATURE (Compound Meter) ---
  {
    id: '68-slow-blues-gospel',
    name: 'Slow 6/8 Soul Blues',
    genre: 'Blues / Gospel',
    timeSignature: '6/8',
    description: 'Soulful compound 6/8 blues ballad groove',
    bpm: 68,
    chordsPerBeat: [
      'C', '', '', '', '', '',
      'C7', '', '', '', '', '',
      'F', '', '', '', '', '',
      'Fm', '', '', '', '', '',
    ],
  },
  {
    id: '68-epic-rock-ballad',
    name: 'Epic 6/8 Rock Ballad',
    genre: 'Rock',
    timeSignature: '6/8',
    description: 'Dramatic compound meter power ballad (i–♭VI–♭III–♭VII)',
    bpm: 72,
    chordsPerBeat: [
      'Am', '', '', '', '', '',
      'F', '', '', '', '', '',
      'C', '', '', '', '', '',
      'G', '', '', '', '', '',
    ],
  },
  {
    id: '68-acoustic-folk',
    name: '6/8 Acoustic Folk Strum',
    genre: 'Folk',
    timeSignature: '6/8',
    description: 'Warm, rolling acoustic compound rhythm',
    bpm: 76,
    chordsPerBeat: [
      'C', '', '', '', '', '',
      'G', '', '', '', '', '',
      'Am', '', '', '', '', '',
      'F', '', '', '', '', '',
    ],
  },

  // --- 5/4 TIME SIGNATURE (Odd Meter) ---
  {
    id: '54-take-five-jazz',
    name: 'Take Five Style Vamp',
    genre: 'Jazz',
    timeSignature: '5/4',
    description: 'Iconic 5/4 cool jazz vamp inspired by Paul Desmond & Dave Brubeck',
    bpm: 140,
    chordsPerBeat: [
      'Ebm7', '', '', '', '',
      'Bbm7', '', '', '', '',
      'Ebm7', '', '', '', '',
      'Bbm7', '', '', '', '',
    ],
  },
  {
    id: '54-cinematic-tension',
    name: '5/4 Cinematic Pulse',
    genre: 'Rock / Cinematic',
    timeSignature: '5/4',
    description: 'Tense 5/4 asymmetric rhythm loop',
    bpm: 110,
    chordsPerBeat: [
      'Am', '', '', '', '',
      'F', '', '', '', '',
      'Dm', '', '', '', '',
      'E', '', '', '', '',
    ],
  },
];
