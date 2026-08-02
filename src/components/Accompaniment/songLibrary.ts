/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Song {
  id: string;
  title: string;
  artist: string;
  genre: 'Jazz' | 'Pop' | 'Rock' | 'Bossa Nova' | 'Blues' | 'R&B / Soul' | 'Funk' | 'Reggae' | 'Flamenco / Latin' | 'Country / Folk' | 'J-Pop / Anime';
  key: string;
  bpm: number;
  timeSignature: '4/4' | '3/4' | '6/8' | '5/4';
  grooveId: string;
  description: string;
  chordsPerBeat: string[];
  tags: string[];
  sectionLabels?: Record<number, string> | string[];
  isCustom?: boolean;
}

export const USER_SONGS_STORAGE_KEY = 'accompaniment_user_songs_v1';

export function getUserSongs(): Song[] {
  try {
    const data = localStorage.getItem(USER_SONGS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load user songs from localStorage', e);
    return [];
  }
}

export function saveUserSong(song: Omit<Song, 'id' | 'isCustom'> & { id?: string }): Song[] {
  try {
    const current = getUserSongs();
    const newSong: Song = {
      ...song,
      id: song.id || `user_song_${Date.now()}`,
      isCustom: true,
    };
    const updated = [newSong, ...current.filter(s => s.id !== newSong.id)];
    localStorage.setItem(USER_SONGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save user song to localStorage', e);
    return getUserSongs();
  }
}

export function deleteUserSong(id: string): Song[] {
  try {
    const current = getUserSongs();
    const updated = current.filter(s => s.id !== id);
    localStorage.setItem(USER_SONGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete user song from localStorage', e);
    return getUserSongs();
  }
}

export const POPULAR_STANDARDS: Song[] = [
  // --- JAZZ STANDARDS (FULL FORMS & MULTI-CHORD BAR) ---
  {
    id: 'song-giant-steps',
    title: 'Giant Steps',
    artist: 'John Coltrane',
    genre: 'Jazz',
    key: 'B Major',
    bpm: 180,
    timeSignature: '4/4',
    grooveId: 'jazz-charleston-swing',
    description: 'John Coltrane\'s complete 16-bar harmonic milestone featuring rapid major-3rd key modulations with 2 chords per measure.',
    tags: ['Jazz Standard', 'Coltrane Changes', '2 Chords / Bar', 'Bebop', 'Complete Form'],
    sectionLabels: {
      0: 'Coltrane Cycle (Part 1)',
      4: 'Coltrane Cycle (Part 2)',
      8: 'ii-V Descending Sequence',
      12: 'Final Turnaround'
    },
    chordsPerBeat: [
      'Bmaj7', '', 'D7', '', 'Gmaj7', '', 'Bb7', '', 'Ebmaj7', '', 'F#7', '', 'Bmaj7', '', '', '',
      'Fm7', '', 'Bb7', '', 'Ebmaj7', '', 'F#7', '', 'Bmaj7', '', 'D7', '', 'Gmaj7', '', 'Bb7', '',
      'Ebmaj7', '', '', '', 'Am7', '', 'D7', '', 'Gmaj7', '', '', '', 'C#m7', '', 'F#7', '',
      'Bmaj7', '', '', '', 'Fm7', '', 'Bb7', '', 'Ebmaj7', '', '', '', 'C#m7', '', 'F#7', ''
    ]
  },
  {
    id: 'song-i-got-rhythm',
    title: 'Rhythm Changes (I Got Rhythm)',
    artist: 'George Gershwin / Charlie Parker',
    genre: 'Jazz',
    key: 'Bb Major',
    bpm: 180,
    timeSignature: '4/4',
    grooveId: 'jazz-charleston-swing',
    description: 'Complete 32-bar AABA Rhythm Changes. Measures in A sections change twice per bar (I–VI–ii–V) into a dominant bridge cycle.',
    tags: ['Jazz Standard', 'Rhythm Changes', '2 Chords / Bar', '32-Bar AABA', 'Bebop'],
    sectionLabels: {
      0: 'A1 Section (2 Chords/Bar)',
      4: 'A1 Turnaround',
      8: 'A2 Section',
      12: 'A2 Turnaround',
      16: 'B Section (Dominant Bridge Cycle)',
      20: 'B Section (C7 to F7)',
      24: 'A3 Final Section',
      28: 'Final Turnaround'
    },
    chordsPerBeat: [
      // A1 Section (8 bars)
      'Bbmaj7', '', 'G7', '', 'Cm7', '', 'F7', '', 'Dm7', '', 'G7', '', 'Cm7', '', 'F7', '',
      'Fm7', '', 'Bb7', '', 'Eb7', '', 'Edim7', '', 'Bbmaj7', '', 'G7', '', 'Cm7', '', 'F7', '',
      // A2 Section (8 bars)
      'Bbmaj7', '', 'G7', '', 'Cm7', '', 'F7', '', 'Dm7', '', 'G7', '', 'Cm7', '', 'F7', '',
      'Fm7', '', 'Bb7', '', 'Eb7', '', 'Edim7', '', 'Bbmaj7', '', 'Cm7', '', 'Bbmaj7', '', '', '',
      // B Section Bridge (8 bars)
      'D7', '', '', '', 'D7', '', '', '', 'G7', '', '', '', 'G7', '', '', '',
      'C7', '', '', '', 'C7', '', '', '', 'F7', '', '', '', 'F7', '', '', '',
      // A3 Section (8 bars)
      'Bbmaj7', '', 'G7', '', 'Cm7', '', 'F7', '', 'Dm7', '', 'G7', '', 'Cm7', '', 'F7', '',
      'Fm7', '', 'Bb7', '', 'Eb7', '', 'Edim7', '', 'Bbmaj7', '', 'G7', '', 'Cm7', '', 'F7', ''
    ]
  },
  {
    id: 'song-satin-doll',
    title: 'Satin Doll',
    artist: 'Duke Ellington & Billy Strayhorn',
    genre: 'Jazz',
    key: 'C Major',
    bpm: 120,
    timeSignature: '4/4',
    grooveId: 'jazz-charleston-swing',
    description: 'Complete 32-bar AABA Duke Ellington swing favorite featuring sequential ii–V progressions changing 2 chords per bar.',
    tags: ['Jazz Standard', 'Duke Ellington', '2 Chords / Bar', '32-Bar AABA', 'Swing'],
    sectionLabels: {
      0: 'A1 Section (Sequential ii-Vs)',
      4: 'A1 Resolution',
      8: 'A2 Section',
      12: 'A2 Resolution to C',
      16: 'B Section (Bridge in F & G)',
      20: 'B Section (G7 Turnaround)',
      24: 'A3 Final Section',
      28: 'Outro Cadence'
    },
    chordsPerBeat: [
      // A1 (8 bars)
      'Dm7', '', 'G7', '', 'Dm7', '', 'G7', '', 'Em7', '', 'A7', '', 'Em7', '', 'A7', '',
      'Am7', '', 'D7', '', 'Abm7', '', 'Db7', '', 'Cmaj7', '', 'Em7', '', 'A7', '', 'D7', '',
      // A2 (8 bars)
      'Dm7', '', 'G7', '', 'Dm7', '', 'G7', '', 'Em7', '', 'A7', '', 'Em7', '', 'A7', '',
      'Am7', '', 'D7', '', 'Abm7', '', 'Db7', '', 'Cmaj7', '', '', '', 'Gm7', '', 'C7', '',
      // B Section Bridge (8 bars)
      'Gm7', '', '', '', 'C7', '', '', '', 'Fmaj7', '', '', '', 'Fmaj7', '', '', '',
      'Am7', '', '', '', 'D7', '', '', '', 'G7', '', '', '', 'Em7', '', 'A7', '',
      // A3 (8 bars)
      'Dm7', '', 'G7', '', 'Dm7', '', 'G7', '', 'Em7', '', 'A7', '', 'Em7', '', 'A7', '',
      'Am7', '', 'D7', '', 'Abm7', '', 'Db7', '', 'Cmaj7', '', 'Dm7', '', 'Cmaj7', '', '', ''
    ]
  },
  {
    id: 'song-autumn-leaves',
    title: 'Autumn Leaves',
    artist: 'Joseph Kosma / Miles Davis',
    genre: 'Jazz',
    key: 'G Minor',
    bpm: 120,
    timeSignature: '4/4',
    grooveId: 'jazz-charleston-swing',
    description: 'Complete 32-bar AABC jazz standard featuring minor and relative major ii–V–I progressions.',
    tags: ['Jazz Standard', 'ii-V-I', '32-Bar Form', 'Miles Davis'],
    sectionLabels: {
      0: 'A1 Section (Relative Major ii-V-I)',
      4: 'A1 Section (Minor ii-V-I)',
      8: 'A2 Section (Major ii-V-I)',
      12: 'A2 Section (Minor ii-V-I)',
      16: 'B Section (Climax on Minor Peak)',
      20: 'B Section (Resolution to Gm)',
      24: 'C Section (Descending Line Cliché)',
      28: 'C Section (Final Turnaround)'
    },
    chordsPerBeat: [
      // A1 (8 bars)
      'Cm7', '', '', '', 'F7', '', '', '', 'Bbmaj7', '', '', '', 'Ebmaj7', '', '', '',
      'Am7b5', '', '', '', 'D7b9', '', '', '', 'Gm7', '', '', '', 'Gm7', '', '', '',
      // A2 (8 bars)
      'Cm7', '', '', '', 'F7', '', '', '', 'Bbmaj7', '', '', '', 'Ebmaj7', '', '', '',
      'Am7b5', '', '', '', 'D7b9', '', '', '', 'Gm7', '', '', '', 'Gm7', '', '', '',
      // B Section (8 bars)
      'Am7b5', '', '', '', 'D7b9', '', '', '', 'Gm7', '', '', '', 'Gm7', '', '', '',
      'Cm7', '', '', '', 'F7', '', '', '', 'Bbmaj7', '', '', '', 'Ebmaj7', '', '', '',
      // C Section (8 bars)
      'Am7b5', '', '', '', 'D7b9', '', '', '', 'Gm7', '', 'Fm7', '', 'E7', '', '', '',
      'Am7b5', '', '', '', 'D7b9', '', '', '', 'Gm7', '', '', '', 'D7b9', '', '', ''
    ]
  },
  {
    id: 'song-fly-me-to-the-moon',
    title: 'Fly Me to the Moon',
    artist: 'Bart Howard / Frank Sinatra',
    genre: 'Jazz',
    key: 'A Minor',
    bpm: 128,
    timeSignature: '4/4',
    grooveId: 'jazz-charleston-swing',
    description: 'Complete 32-bar ABAC Great American Songbook standard built on a rich circle-of-fifths progression.',
    tags: ['Swing', 'Circle of 5ths', '32-Bar ABAC', 'Sinatra'],
    sectionLabels: {
      0: 'A1 Section (Circle of 5ths)',
      4: 'A1 Section (Turnaround to E7)',
      8: 'B Section (Resolution to C)',
      12: 'B Section (Turnaround)',
      16: 'A2 Section (Circle of 5ths)',
      20: 'A2 Section (Turnaround)',
      24: 'C Section (Final Climax)',
      28: 'C Section (Outro Cadence)'
    },
    chordsPerBeat: [
      // A1 (8 bars)
      'Am7', '', '', '', 'Dm7', '', '', '', 'G7', '', '', '', 'Cmaj7', '', '', '',
      'Fmaj7', '', '', '', 'Bm7b5', '', '', '', 'E7', '', '', '', 'Am7', '', 'A7', '',
      // B (8 bars)
      'Dm7', '', '', '', 'G7', '', '', '', 'Cmaj7', '', '', '', 'Am7', '', '', '',
      'Dm7', '', '', '', 'G7', '', '', '', 'Cmaj7', '', '', '', 'Em7', '', 'A7', '',
      // A2 (8 bars)
      'Am7', '', '', '', 'Dm7', '', '', '', 'G7', '', '', '', 'Cmaj7', '', '', '',
      'Fmaj7', '', '', '', 'Bm7b5', '', '', '', 'E7', '', '', '', 'Am7', '', 'A7', '',
      // C (8 bars)
      'Dm7', '', '', '', 'G7', '', '', '', 'Cmaj7', '', 'B7', '', 'Em7', '', 'A7', '',
      'Dm7', '', '', '', 'G7', '', '', '', 'Cmaj7', '', '', '', 'E7', '', '', ''
    ]
  },
  {
    id: 'song-all-of-me',
    title: 'All of Me',
    artist: 'Gerald Marks / Frank Sinatra',
    genre: 'Jazz',
    key: 'C Major',
    bpm: 135,
    timeSignature: '4/4',
    grooveId: 'jazz-charleston-swing',
    description: 'Complete 32-bar ABAC upbeat swing staple with secondary dominants (E7, A7) resolving to Dm.',
    tags: ['Swing', 'Secondary Dominants', '32-Bar ABAC', 'Frank Sinatra'],
    sectionLabels: {
      0: 'A1 Section (C to E7)',
      4: 'A1 Section (A7 to Dm)',
      8: 'B Section (E7 to Am)',
      12: 'B Section (D7 to G7)',
      16: 'A2 Section (C to E7)',
      20: 'A2 Section (A7 to Dm)',
      24: 'C Section (F to Fm Minor IV)',
      28: 'C Section (Final Cadence)'
    },
    chordsPerBeat: [
      // A1 (8 bars)
      'C', '', '', '', 'C', '', '', '', 'E7', '', '', '', 'E7', '', '', '',
      'A7', '', '', '', 'A7', '', '', '', 'Dm', '', '', '', 'Dm', '', '', '',
      // B (8 bars)
      'E7', '', '', '', 'E7', '', '', '', 'Am', '', '', '', 'Am', '', '', '',
      'D7', '', '', '', 'D7', '', '', '', 'Dm7', '', '', '', 'G7', '', '', '',
      // A2 (8 bars)
      'C', '', '', '', 'C', '', '', '', 'E7', '', '', '', 'E7', '', '', '',
      'A7', '', '', '', 'A7', '', '', '', 'Dm', '', '', '', 'Dm', '', '', '',
      // C (8 bars)
      'F', '', '', '', 'Fm', '', '', '', 'Em7', '', '', '', 'A7', '', '', '',
      'Dm7', '', '', '', 'G7', '', '', '', 'C', '', '', '', 'G7', '', '', ''
    ]
  },
  {
    id: 'song-girl-from-ipanema',
    title: 'The Girl from Ipanema',
    artist: 'Antônio Carlos Jobim',
    genre: 'Bossa Nova',
    key: 'F Major',
    bpm: 124,
    timeSignature: '4/4',
    grooveId: 'bossa-nova',
    description: 'Complete 40-bar AABA Bossa Nova masterpiece with gentle II7 dominant sub-vamps and modulating bridge key centers.',
    tags: ['Bossa Nova', 'Jobim', '40-Bar AABA', 'Brazilian Jazz'],
    sectionLabels: {
      0: 'A1 Section (Fmaj7 - G7)',
      4: 'A1 Cadence (Gm7 - Gb7)',
      8: 'A2 Section',
      12: 'A2 Cadence to Gb7',
      16: 'B Section (Bridge Key Cycle: Gbmaj7)',
      20: 'B Section (F#m7 to B7)',
      24: 'B Section (Gmaj7 to Gm7)',
      28: 'B Section (Eb7 Turnaround)',
      32: 'A3 Final Section',
      36: 'Outro Fade'
    },
    chordsPerBeat: [
      // A1 (8 bars)
      'Fmaj7', '', '', '', 'Fmaj7', '', '', '', 'G7', '', '', '', 'G7', '', '', '',
      'Gm7', '', '', '', 'Gb7', '', '', '', 'Fmaj7', '', '', '', 'Gb7', '', '', '',
      // A2 (8 bars)
      'Fmaj7', '', '', '', 'Fmaj7', '', '', '', 'G7', '', '', '', 'G7', '', '', '',
      'Gm7', '', '', '', 'Gb7', '', '', '', 'Fmaj7', '', '', '', 'Fmaj7', '', '', '',
      // B Section Bridge (16 bars)
      'Gbmaj7', '', '', '', 'Gbmaj7', '', '', '', 'B9', '', '', '', 'B9', '', '', '',
      'F#m7', '', '', '', 'F#m7', '', '', '', 'D9', '', '', '', 'D9', '', '', '',
      'Gmaj7', '', '', '', 'Gmaj7', '', '', '', 'Eb9', '', '', '', 'Eb9', '', '', '',
      'Am7', '', '', '', 'D7b9', '', '', '', 'Gm7', '', '', '', 'C7b9', '', '', '',
      // A3 (8 bars)
      'Fmaj7', '', '', '', 'Fmaj7', '', '', '', 'G7', '', '', '', 'G7', '', '', '',
      'Gm7', '', '', '', 'Gb7', '', '', '', 'Fmaj7', '', '', '', 'Gb7', '', '', ''
    ]
  },
  {
    id: 'song-blue-bossa',
    title: 'Blue Bossa',
    artist: 'Kenny Dorham',
    genre: 'Bossa Nova',
    key: 'C Minor',
    bpm: 130,
    timeSignature: '4/4',
    grooveId: 'bossa-jazz-fusion',
    description: 'Complete 16-bar Hard-Bop meets Bossa Nova head. Shifts seamlessly from C Minor into a half-step transposed Db Major section.',
    tags: ['Hard Bop', 'Bossa Nova', 'Complete Head', 'Key Modulation'],
    sectionLabels: {
      0: 'A Section (Cm Minor Bossa)',
      4: 'A Section (ii-V-I in Cm)',
      8: 'B Section (Db Major Key Shift)',
      12: 'Turnaround to Cm'
    },
    chordsPerBeat: [
      'Cm7', '', '', '', 'Cm7', '', '', '', 'Fm7', '', '', '', 'Fm7', '', '', '',
      'Dm7b5', '', '', '', 'G7b9', '', '', '', 'Cm7', '', '', '', 'Cm7', '', '', '',
      'Ebm7', '', '', '', 'Ab7', '', '', '', 'Dbmaj7', '', '', '', 'Dbmaj7', '', '', '',
      'Dm7b5', '', '', '', 'G7b9', '', '', '', 'Cm7', '', '', '', 'G7b9', '', '', ''
    ]
  },

  // --- POP & ROCK CLASSICS ---
  {
    id: 'song-hotel-california',
    title: 'Hotel California',
    artist: 'Eagles',
    genre: 'Rock',
    key: 'B Minor',
    bpm: 75,
    timeSignature: '4/4',
    grooveId: 'rock-driving-push',
    description: 'Complete Verse + Chorus + Solo form featuring the distinct descending stepwise Spanish-influenced minor rock progression.',
    tags: ['Classic Rock', 'Descending Bass', 'Verse & Chorus', 'Complete Song'],
    sectionLabels: {
      0: 'Verse 1 (On a Dark Desert Highway)',
      8: 'Verse 2 (There She Stood in the Doorway)',
      16: 'Chorus 1 (Welcome to the Hotel California)',
      24: 'Guitar Solo / Outro'
    },
    chordsPerBeat: [
      // Verse 1 (8 bars)
      'Bm', '', '', '', 'F#7', '', '', '', 'A', '', '', '', 'E', '', '', '',
      'G', '', '', '', 'D', '', '', '', 'Em', '', '', '', 'F#7', '', '', '',
      // Verse 2 (8 bars)
      'Bm', '', '', '', 'F#7', '', '', '', 'A', '', '', '', 'E', '', '', '',
      'G', '', '', '', 'D', '', '', '', 'Em', '', '', '', 'F#7', '', '', '',
      // Chorus 1 (8 bars)
      'G', '', '', '', 'D', '', '', '', 'F#7', '', '', '', 'Bm', '', '', '',
      'G', '', '', '', 'D', '', '', '', 'Em', '', '', '', 'F#7', '', '', '',
      // Guitar Solo (8 bars)
      'Bm', '', '', '', 'F#7', '', '', '', 'A', '', '', '', 'E', '', '', '',
      'G', '', '', '', 'D', '', '', '', 'Em', '', '', '', 'F#7', '', '', ''
    ]
  },
  {
    id: 'song-hallelujah',
    title: 'Hallelujah',
    artist: 'Leonard Cohen / Jeff Buckley',
    genre: 'Country / Folk',
    key: 'C Major',
    bpm: 68,
    timeSignature: '6/8',
    grooveId: 'ballad-68',
    description: 'Complete Verse and Chorus form in 6/8 compound meter following "the fourth, the fifth, the minor fall, the major lift".',
    tags: ['6/8 Ballad', 'Folk Anthem', 'Verse & Chorus', 'Leonard Cohen'],
    sectionLabels: {
      0: 'Verse 1 (I Heard There Was a Secret Chord)',
      8: 'Verse 1 Build (The Fourth, The Fifth)',
      12: 'Chorus 1 (Hallelujah)',
      18: 'Chorus 1 Outro'
    },
    chordsPerBeat: [
      // Verse 1
      'C', '', '', '', '', '', 'Am', '', '', '', '', '',
      'C', '', '', '', '', '', 'Am', '', '', '', '', '',
      'F', '', '', '', '', '', 'G', '', '', '', '', '',
      'C', '', '', '', '', '', 'G', '', '', '', '', '',
      // Verse 1 Build
      'C', '', '', '', '', '', 'F', '', '', '', '', '',
      'G', '', '', '', '', '', 'Am', '', '', '', '', '',
      'F', '', '', '', '', '', 'G', '', '', '', '', '',
      'E7', '', '', '', '', '', 'Am', '', '', '', '', '',
      // Chorus 1
      'F', '', '', '', '', '', 'F', '', '', '', '', '',
      'Am', '', '', '', '', '', 'Am', '', '', '', '', '',
      'F', '', '', '', '', '', 'F', '', '', '', '', '',
      'C', '', '', '', '', '', 'G', '', '', '', '', '',
      'C', '', '', '', '', '', 'Am', '', '', '', '', ''
    ]
  },
  {
    id: 'song-stand-by-me',
    title: 'Stand by Me',
    artist: 'Ben E. King',
    genre: 'Pop',
    key: 'C Major',
    bpm: 118,
    timeSignature: '4/4',
    grooveId: 'pop-acoustic-push',
    description: 'Complete Verse + Chorus arrangement of the legendary 1950s Doo-Wop / Pop ballad progression (I–vi–IV–V).',
    tags: ['Pop Classic', 'Doo-Wop', '50s Ballad', 'Complete Form'],
    sectionLabels: {
      0: 'Verse 1 (When the Night Has Come)',
      8: 'Chorus 1 (Darling Stand by Me)',
      16: 'Verse 2 (If the Sky Should Tumble)',
      24: 'Chorus 2 & Outro'
    },
    chordsPerBeat: [
      // Verse 1
      'C', '', '', '', 'C', '', '', '', 'Am', '', '', '', 'Am', '', '', '',
      'F', '', '', '', 'G', '', '', '', 'C', '', '', '', 'C', '', '', '',
      // Chorus 1
      'C', '', '', '', 'C', '', '', '', 'Am', '', '', '', 'Am', '', '', '',
      'F', '', '', '', 'G', '', '', '', 'C', '', '', '', 'C', '', '', '',
      // Verse 2
      'C', '', '', '', 'C', '', '', '', 'Am', '', '', '', 'Am', '', '', '',
      'F', '', '', '', 'G', '', '', '', 'C', '', '', '', 'C', '', '', '',
      // Chorus 2
      'C', '', '', '', 'C', '', '', '', 'Am', '', '', '', 'Am', '', '', '',
      'F', '', '', '', 'G', '', '', '', 'C', '', '', '', 'C', '', '', ''
    ]
  },
  {
    id: 'song-layla',
    title: 'Layla (Unplugged Chorus & Verse)',
    artist: 'Eric Clapton / Derek and the Dominos',
    genre: 'Rock',
    key: 'D Minor',
    bpm: 116,
    timeSignature: '4/4',
    grooveId: 'rock-driving-push',
    description: 'Complete Chorus + Verse + Chorus rock anthem structure featuring 2 chords per bar (Dm–Bb | C–Dm) and modulating verse.',
    tags: ['Classic Rock', 'Eric Clapton', '2 Chords / Bar', 'Verse & Chorus'],
    sectionLabels: {
      0: 'Chorus 1 (Layla You Got Me On My Knees)',
      4: 'Chorus 1 Turnaround',
      8: 'Verse 1 (Tried to Give You Consolation)',
      12: 'Verse 1 Build',
      16: 'Chorus 2 (Layla You Got Me On My Knees)',
      20: 'Outro Riff'
    },
    chordsPerBeat: [
      // Chorus 1 (8 bars)
      'Dm', '', 'Bb', '', 'C', '', 'Dm', '', 'Dm', '', 'Bb', '', 'C', '', 'A7', '',
      'Dm', '', 'Bb', '', 'C', '', 'Dm', '', 'Dm', '', 'Bb', '', 'C', '', 'C', '',
      // Verse 1 (8 bars)
      'C#m', '', '', '', 'G#7', '', '', '', 'C#m', '', 'C', '', 'D', '', 'E', '',
      'F#m', '', 'B', '', 'E', '', 'A', '', 'F#m', '', 'B', '', 'E', '', 'A7', '',
      // Chorus 2 (8 bars)
      'Dm', '', 'Bb', '', 'C', '', 'Dm', '', 'Dm', '', 'Bb', '', 'C', '', 'A7', '',
      'Dm', '', 'Bb', '', 'C', '', 'Dm', '', 'Dm', '', 'Bb', '', 'C', '', '', ''
    ]
  },
  {
    id: 'song-yesterday',
    title: 'Yesterday',
    artist: 'The Beatles',
    genre: 'Pop',
    key: 'F Major',
    bpm: 90,
    timeSignature: '4/4',
    grooveId: 'pop-acoustic-push',
    description: 'Complete Verse + Bridge + Verse form featuring quick secondary dominant movements with 2 chords per measure.',
    tags: ['Pop Standard', 'The Beatles', '2 Chords / Bar', 'Complete Song'],
    sectionLabels: {
      0: 'Verse 1 (Yesterday All My Troubles Seemed So Far Away)',
      4: 'Verse 1 Cadence',
      7: 'Bridge (Why She Had to Go)',
      11: 'Bridge Resolution',
      13: 'Verse 2 (Yesterday Love Was Such an Easy Game)',
      17: 'Outro'
    },
    chordsPerBeat: [
      // Verse 1 (7 bars)
      'F', '', '', '', 'Em7', '', 'A7', '', 'Dm', '', 'Bb', '', 'C', '', 'F', '',
      'Dm', '', 'G7', '', 'Bb', '', 'F', '', 'F', '', '', '',
      // Bridge (6 bars)
      'Em7', '', 'A7', '', 'Dm', '', 'C', '', 'Bb', '', 'Dm', '', 'Gm', '', 'C', '', 'F', '',
      'Em7', '', 'A7', '', 'Dm', '', 'C', '', 'Bb', '', 'Dm', '', 'Gm', '', 'C', '', 'F', '',
      // Verse 2 (7 bars)
      'F', '', '', '', 'Em7', '', 'A7', '', 'Dm', '', 'Bb', '', 'C', '', 'F', '',
      'Dm', '', 'G7', '', 'Bb', '', 'F', '', 'F', '', 'Dm', '', 'G7', '', 'Bb', '', 'F', '', '', ''
    ]
  },
  {
    id: 'song-tears-in-heaven',
    title: 'Tears in Heaven',
    artist: 'Eric Clapton',
    genre: 'Pop',
    key: 'A Major',
    bpm: 80,
    timeSignature: '4/4',
    grooveId: 'pop-acoustic-push',
    description: 'Complete Verse + Chorus + Bridge form with gentle passing bass chords changing twice per measure (A–E | F#m–A | D–E7 | A).',
    tags: ['Acoustic Ballad', 'Eric Clapton', '2 Chords / Bar', 'Verse Chorus Bridge'],
    sectionLabels: {
      0: 'Verse 1 (Would You Know My Name)',
      4: 'Verse 1 Resolution',
      8: 'Chorus 1 (I Must Be Strong)',
      12: 'Chorus 1 Cadence',
      16: 'Bridge (Time Can Bring You Down)',
      20: 'Bridge Resolution to A'
    },
    chordsPerBeat: [
      // Verse 1 (8 bars)
      'A', '', 'E', '', 'F#m', '', 'A', '', 'D', '', 'E7', '', 'A', '', '', '',
      'A', '', 'E', '', 'F#m', '', 'A', '', 'D', '', 'E7', '', 'A', '', '', '',
      // Chorus 1 (8 bars)
      'F#m', '', '', '', 'C#7', '', '', '', 'Em', '', '', '', 'F#7', '', '', '',
      'Bm7', '', '', '', 'E7', '', '', '', 'A', '', 'E', '', 'A', '', '', '',
      // Bridge (8 bars)
      'C', '', '', '', 'G', '', '', '', 'Am', '', '', '', 'D', '', 'G', '',
      'C', '', '', '', 'G', '', '', '', 'Am', '', '', '', 'D', '', 'E7', ''
    ]
  },
  {
    id: 'song-creep',
    title: 'Creep',
    artist: 'Radiohead',
    genre: 'Rock',
    key: 'G Major',
    bpm: 92,
    timeSignature: '4/4',
    grooveId: 'rock-driving-push',
    description: 'Complete Verse + Chorus + Climax form built around the melancholic major-to-minor IV movement (G–B–C–Cm).',
    tags: ['Alternative Rock', '90s Hit', 'Minor IV Chord', 'Complete Song'],
    sectionLabels: {
      0: 'Verse 1 (When You Were Here Before)',
      8: 'Chorus 1 (I am a Creep)',
      16: 'Climax / Guitar Noise',
      24: 'Outro (She is Running Out)'
    },
    chordsPerBeat: [
      // Verse 1 (8 bars)
      'G', '', '', '', 'G', '', '', '', 'B', '', '', '', 'B', '', '', '',
      'C', '', '', '', 'C', '', '', '', 'Cm', '', '', '', 'Cm', '', '', '',
      // Chorus 1 (8 bars)
      'G', '', '', '', 'G', '', '', '', 'B', '', '', '', 'B', '', '', '',
      'C', '', '', '', 'C', '', '', '', 'Cm', '', '', '', 'Cm', '', '', '',
      // Climax (8 bars)
      'G', '', '', '', 'G', '', '', '', 'B', '', '', '', 'B', '', '', '',
      'C', '', '', '', 'C', '', '', '', 'Cm', '', '', '', 'Cm', '', '', '',
      // Outro (8 bars)
      'G', '', '', '', 'G', '', '', '', 'B', '', '', '', 'B', '', '', '',
      'C', '', '', '', 'C', '', '', '', 'Cm', '', '', '', 'G', '', '', ''
    ]
  },
  {
    id: 'song-sunny',
    title: 'Sunny',
    artist: 'Bobby Hebb / Boney M',
    genre: 'R&B / Soul',
    key: 'A Minor',
    bpm: 118,
    timeSignature: '4/4',
    grooveId: 'funk-16th-soul-push',
    description: 'Complete Verse and Turnaround structure with smooth 2-chords-per-measure shifts (Am7–C7 | Fmaj7–B7).',
    tags: ['R&B', 'Soul Classic', '2 Chords / Bar', 'Complete Song'],
    sectionLabels: {
      0: 'Verse 1 (Sunny Thank You for the Sunshine)',
      4: 'Verse 1 Resolution',
      8: 'Verse 2 (Sunny Thank You for the Smile)',
      12: 'Outro Turnaround'
    },
    chordsPerBeat: [
      'Am7', '', 'C7', '', 'Fmaj7', '', 'B7', '', 'E7', '', '', '', 'Am7', '', 'C7', '',
      'Fmaj7', '', 'B7', '', 'E7', '', '', '', 'Dm7', '', 'G7', '', 'Cmaj7', '', 'Fmaj7', '',
      'Bm7b5', '', 'E7', '', 'Am7', '', 'E7', '',
      'Am7', '', 'C7', '', 'Fmaj7', '', 'B7', '', 'E7', '', '', '', 'Am7', '', 'C7', '',
      'Fmaj7', '', 'B7', '', 'E7', '', '', '', 'Dm7', '', 'G7', '', 'Cmaj7', '', 'Fmaj7', '',
      'Bm7b5', '', 'E7', '', 'Am7', '', '', ''
    ]
  }
];
