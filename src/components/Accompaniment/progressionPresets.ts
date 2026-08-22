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
  isCustom?: boolean;
}

export const USER_PRESETS_STORAGE_KEY = 'accompaniment_user_presets';

export function getUserPresets(): ProgressionPreset[] {
  try {
    const data = localStorage.getItem(USER_PRESETS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load user presets from localStorage', e);
    return [];
  }
}

export function saveUserPreset(preset: Omit<ProgressionPreset, 'id' | 'isCustom'> & { id?: string }): ProgressionPreset[] {
  try {
    const current = getUserPresets();
    const newPreset: ProgressionPreset = {
      ...preset,
      id: preset.id || `user_preset_${Date.now()}`,
      isCustom: true,
    };
    const updated = [newPreset, ...current.filter(p => p.id !== newPreset.id)];
    localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save user preset to localStorage', e);
    return getUserPresets();
  }
}

export function deleteUserPreset(id: string): ProgressionPreset[] {
  try {
    const current = getUserPresets();
    const updated = current.filter(p => p.id !== id);
    localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete user preset from localStorage', e);
    return getUserPresets();
  }
}

export const PROGRESSION_PRESETS: ProgressionPreset[] = [
  // ==========================================
  // --- 1. ROCK ---
  // ==========================================
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
    id: '54-cinematic-tension',
    name: '5/4 Cinematic Pulse',
    genre: 'Rock',
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
  {
    id: '12-bar-blues-c',
    name: '12-Bar Blues in C',
    genre: 'Rock',
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

  // ==========================================
  // --- 2. POP ---
  // ==========================================
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
    genre: 'Pop',
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
    id: 'pop-fast-doo-wop',
    name: 'Fast Pop / Doo-Wop (2 Chords/Bar: I–vi | IV–V)',
    genre: 'Pop',
    timeSignature: '4/4',
    description: 'Classic 50s pop ballad progression compressed to 2 chords per measure',
    bpm: 110,
    chordsPerBeat: [
      'C', '', 'Am', '',
      'F', '', 'G', '',
    ],
  },
  {
    id: '50s-doo-wop',
    name: '50s Doo-Wop (I–vi–IV–V)',
    genre: 'Pop',
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
    id: 'jpop-waltz-theme',
    name: 'J-Pop Emotional Waltz',
    genre: 'Pop',
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

  // ==========================================
  // --- 3. FUNK ---
  // ==========================================
  {
    id: 'neo-soul-groove',
    name: 'Neo-Soul Groove',
    genre: 'Funk',
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
    id: '68-slow-blues-gospel',
    name: 'Slow 6/8 Soul Blues',
    genre: 'Funk',
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

  // ==========================================
  // --- 4. JAZZ ---
  // ==========================================
  {
    id: 'jazz-ii-v-i-vi',
    name: 'Jazz Turnaround (1 Chord/Bar)',
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
    id: 'jazz-turnaround-2chords',
    name: 'Jazz Turnaround (2 Chords/Bar: ii–V | I–VI)',
    genre: 'Jazz',
    timeSignature: '4/4',
    description: 'Bebop turnaround changing chords twice per measure (Dm7–G7 in bar 1, Cmaj7–A7 in bar 2)',
    bpm: 130,
    chordsPerBeat: [
      'Dm7', '', 'G7', '',
      'Cmaj7', '', 'A7', '',
    ],
  },
  {
    id: 'rhythm-changes-a-section',
    name: 'Rhythm Changes A-Section (2 Chords/Bar)',
    genre: 'Jazz',
    timeSignature: '4/4',
    description: 'Classic Gershwin / Parker 2-chords-per-measure rhythm turnaround (Bbmaj7–G7 | Cm7–F7)',
    bpm: 160,
    chordsPerBeat: [
      'Bbmaj7', '', 'G7', '',
      'Cm7', '', 'F7', '',
      'Dm7', '', 'G7', '',
      'Cm7', '', 'F7', '',
    ],
  },
  {
    id: 'coltrane-changes-2chords',
    name: 'Coltrane Changes (2 Chords/Bar)',
    genre: 'Jazz',
    timeSignature: '4/4',
    description: 'John Coltrane major-3rd key modulation cycle with 2 chords per measure',
    bpm: 180,
    chordsPerBeat: [
      'Bmaj7', '', 'D7', '',
      'Gmaj7', '', 'Bb7', '',
      'Ebmaj7', '', 'F#7', '',
      'Bmaj7', '', '', '',
    ],
  },
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

  // ==========================================
  // --- 5. LATIN ---
  // ==========================================
  {
    id: 'bossa-ipanema',
    name: 'Bossa Nova Standard',
    genre: 'Latin',
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

  // ==========================================
  // --- 6. WORLD ---
  // ==========================================
  {
    id: '68-acoustic-folk',
    name: '6/8 Acoustic Folk Strum',
    genre: 'World',
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
  {
    id: 'minor-romance-waltz',
    name: 'Minor Romance Waltz',
    genre: 'World',
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

  // ==========================================
  // --- 7. FLAMENCO ---
  // ==========================================
  {
    id: 'flamenco-tangos-por-arriba',
    name: 'Tangos Flamencos (Por Arriba)',
    genre: 'Flamenco',
    timeSignature: '4/4',
    description: 'Authentic Tangos in E Phrygian mode (Por Arriba). Uses real Flamenco guitar voicings: Am9, G6, Fmaj7#11 with open E and B strings, and E7b9.',
    bpm: 115,
    chordsPerBeat: [
      'Am9', '', '', '',
      'G6', '', '', '',
      'Fmaj7#11', '', '', '',
      'E7b9', '', '', '',
      'Dm6', '', '', '',
      'Cmaj7', '', '', '',
      'Fmaj7#11', '', '', '',
      'E7b9', '', '', '',
    ],
  },
  {
    id: 'flamenco-tangos-por-medio',
    name: 'Tangos Flamencos (Por Medio)',
    genre: 'Flamenco',
    timeSignature: '4/4',
    description: 'Tangos in A Phrygian mode (Por Medio), popular in Jerez and Triana. Features Dm6, C7, Bbmaj7#11, and A7b9.',
    bpm: 120,
    chordsPerBeat: [
      'Dm6', '', '', '',
      'C7', '', '', '',
      'Bbmaj7#11', '', '', '',
      'A7b9', '', '', '',
      'Gm6', '', '', '',
      'Fmaj7', '', '', '',
      'Bbmaj7#11', '', '', '',
      'A7b9', '', '', '',
    ],
  },
  {
    id: 'flamenco-rumba-paco',
    name: 'Rumba Flamenca (Por Arriba - Paco Style)',
    genre: 'Flamenco',
    timeSignature: '4/4',
    description: 'Lively Paco de Lucía & Gipsy Kings style Rumba in E Phrygian: Am9, Dm7, G7, Cmaj7, Fmaj7#11, B7, and E7b9.',
    bpm: 132,
    chordsPerBeat: [
      'Am9', '', '', '',
      'Dm7', '', '', '',
      'G7', '', '', '',
      'Cmaj7', '', '', '',
      'Fmaj7#11', '', '', '',
      'B7', '', '', '',
      'E7b9', '', '', '',
      'E7', '', '', '',
    ],
  },
  {
    id: 'flamenco-rumba-por-medio',
    name: 'Rumba Flamenca (Por Medio)',
    genre: 'Flamenco',
    timeSignature: '4/4',
    description: 'Energetic Rumba in A Phrygian / Dm. Uses rich extended voicings: Dm9, Gm6, C7, Fmaj7, Bbmaj7#11, E7b9, and A7b9.',
    bpm: 136,
    chordsPerBeat: [
      'Dm9', '', '', '',
      'Gm6', '', '', '',
      'C7', '', '', '',
      'Fmaj7', '', '', '',
      'Bbmaj7#11', '', '', '',
      'E7b9', '', '', '',
      'A7b9', '', '', '',
      'A7', '', '', '',
    ],
  },
  {
    id: 'flamenco-bulerias-jerez',
    name: 'Bulerías de Jerez (12-Beat Compás in 3/4)',
    genre: 'Flamenco',
    timeSignature: '3/4',
    description: 'Traditional 12-beat Bulerías compás (4 measures of 3/4 = 12 beats). Accents on 3, 6, 8, 10, 12 with open Flamenco voicings: Amadd9, G6, Fmaj7#11, E7b9.',
    bpm: 182,
    chordsPerBeat: [
      'Amadd9', '', '',
      'G6', '', '',
      'Fmaj7#11', '', '',
      'E7b9', '', '',
    ],
  },
  {
    id: 'flamenco-solea-por-bulerias',
    name: 'Soleá por Bulerías (12-Beat Compás in 3/4)',
    genre: 'Flamenco',
    timeSignature: '3/4',
    description: 'Mid-tempo 12-beat Soleá por Bulerías in A Phrygian (Por Medio). Soleá rhythm with Bulerías swing: Dm6, C7, Bbmaj7#11, A7b9.',
    bpm: 138,
    chordsPerBeat: [
      'Dm6', '', '',
      'C7', '', '',
      'Bbmaj7#11', '', '',
      'A7b9', '', '',
    ],
  },
  {
    id: 'flamenco-taranto-modal',
    name: 'Taranto / Taranta (F# Phrygian Modal)',
    genre: 'Flamenco',
    timeSignature: '4/4',
    description: 'Mysterious Levante toque in F# Phrygian (4/4 binary compás). Features rare open guitar voicings: F#7b9, Gmaj7#11, D69, Bm7, C#7b9.',
    bpm: 90,
    chordsPerBeat: [
      'F#7b9', '', '', '',
      'Gmaj7#11', '', '', '',
      'D69', '', '', '',
      'C#7b9', '', '', '',
      'Bm7', '', '', '',
      'Gmaj7#11', '', '', '',
      'C#7b9', '', '', '',
      'F#7b9', '', '', '',
    ],
  },
  {
    id: 'flamenco-alegrias-cadiz',
    name: 'Alegrías de Cádiz (12-Beat Compás in 3/4)',
    genre: 'Flamenco',
    timeSignature: '3/4',
    description: 'Joyful 12-beat Cantiñas compás from Cádiz in 3/4 (4 measures = 12 beats). E major with modal Phrygian turnaround: E, A, B7, Fmaj7#11, E7b9.',
    bpm: 140,
    chordsPerBeat: [
      'E', '', '',
      'A', '', '',
      'B7', '', '',
      'E', '', '',
      'E', '', '',
      'Fmaj7#11', '', '',
      'E7b9', '', '',
      'E', '', '',
    ],
  },
  {
    id: 'andalusian-cadence',
    name: 'Andalusian Cadence',
    genre: 'Flamenco',
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
];
