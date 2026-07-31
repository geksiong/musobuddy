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
  // --- JAZZ STANDARDS ---
  {
    id: 'song-autumn-leaves',
    title: 'Autumn Leaves',
    artist: 'Joseph Kosma / Miles Davis',
    genre: 'Jazz',
    key: 'G Minor',
    bpm: 120,
    timeSignature: '4/4',
    grooveId: 'jazz-charleston-swing',
    description: 'The definitive jazz standard featuring a seamless minor ii–V–I–IV sequence looping into relative major and back.',
    tags: ['Jazz Standard', 'ii-V-I', 'Bebop', 'Swing'],
    chordsPerBeat: [
      'Cm7', '', '', '', 'F7', '', '', '', 'Bbmaj7', '', '', '', 'Ebmaj7', '', '', '',
      'Am7b5', '', '', '', 'D7b9', '', '', '', 'Gm7', '', '', '', 'G7', '', '', ''
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
    description: 'Classic Great American Songbook standard built on a full circle-of-fifths progression ending with a sharp A7 turnaround.',
    tags: ['Swing', 'Circle of 5ths', 'Vocal Standard'],
    chordsPerBeat: [
      'Am7', '', '', '', 'Dm7', '', '', '', 'G7', '', '', '', 'Cmaj7', '', '', '',
      'Fmaj7', '', '', '', 'Bm7b5', '', '', '', 'E7', '', '', '', 'Am7', '', '', ''
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
    description: 'Upbeat swing staple with dramatic secondary dominants (E7, A7) resolving smoothly to Dm.',
    tags: ['Swing', 'Secondary Dominants', 'Jam Favorite'],
    chordsPerBeat: [
      'C', '', '', '', 'C', '', '', '', 'E7', '', '', '', 'E7', '', '', '',
      'A7', '', '', '', 'A7', '', '', '', 'Dm', '', '', '', 'Dm', '', '', ''
    ]
  },
  {
    id: 'song-take-five',
    title: 'Take Five',
    artist: 'Paul Desmond / Dave Brubeck',
    genre: 'Jazz',
    key: 'Eb Minor',
    bpm: 140,
    timeSignature: '5/4',
    grooveId: '54-cool-jazz',
    description: 'The quintessential 5/4 asymmetric cool-jazz groove built around a hypnotic Eb Minor to Bb Minor vamp.',
    tags: ['Cool Jazz', '5/4 Time', 'Odd Meter'],
    chordsPerBeat: [
      'Ebm7', '', '', '', '', 'Bbm7', '', '', '', '',
      'Ebm7', '', '', '', '', 'Bbm7', '', '', '', ''
    ]
  },
  {
    id: 'song-someday-my-prince-will-come',
    title: 'Someday My Prince Will Come',
    artist: 'Miles Davis / Bill Evans',
    genre: 'Jazz',
    key: 'Bb Major',
    bpm: 115,
    timeSignature: '3/4',
    grooveId: 'jazz-waltz-34',
    description: 'Celebrated 3/4 jazz waltz rendered famous by Miles Davis and Bill Evans with lush major and secondary dominant extensions.',
    tags: ['Jazz Waltz', '3/4 Time', 'Bill Evans'],
    chordsPerBeat: [
      'Bbmaj7', '', '', 'D7', '', '', 'Ebmaj7', '', '', 'G7', '', '',
      'Cm7', '', '', 'G7', '', '', 'Cm7', '', '', 'F7', '', ''
    ]
  },

  // --- BOSSA NOVA & LATIN ---
  {
    id: 'song-girl-from-ipanema',
    title: 'The Girl from Ipanema',
    artist: 'Antônio Carlos Jobim',
    genre: 'Bossa Nova',
    key: 'F Major',
    bpm: 124,
    timeSignature: '4/4',
    grooveId: 'bossa-nova',
    description: 'The world-renowned Bossa Nova masterpiece featuring gentle II7 dominant sub-vamps and smooth Brazilian syncopation.',
    tags: ['Bossa Nova', 'Jobim', 'Brazilian Jazz'],
    chordsPerBeat: [
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
    description: 'Hard-bop meets Bossa Nova. Shifts seamlessly from C Minor into a half-step transposed Db Major section.',
    tags: ['Hard Bop', 'Bossa Nova', 'Key Change'],
    chordsPerBeat: [
      'Cm7', '', '', '', 'Cm7', '', '', '', 'Fm7', '', '', '', 'Fm7', '', '', '',
      'Dm7b5', '', '', '', 'G7b9', '', '', '', 'Cm7', '', '', '', 'Cm7', '', '', '',
      'Ebm7', '', '', '', 'Ab7', '', '', '', 'Dbmaj7', '', '', '', 'Dbmaj7', '', '', '',
      'Dm7b5', '', '', '', 'G7b9', '', '', '', 'Cm7', '', '', '', 'G7b9', '', '', ''
    ]
  },
  {
    id: 'song-oye-como-va',
    title: 'Oye Como Va',
    artist: 'Santana / Tito Puente',
    genre: 'Flamenco / Latin',
    key: 'A Minor',
    bpm: 128,
    timeSignature: '4/4',
    grooveId: 'afro-cuban-montuno',
    description: 'Infectious Latin Rock Cha-Cha / Montuno standard based on a driving Am7 to D7 modal vamp.',
    tags: ['Latin Rock', 'Montuno', 'Santana'],
    chordsPerBeat: [
      'Am7', '', '', '', 'D7', '', '', '', 'Am7', '', '', '', 'D7', '', '', ''
    ]
  },

  // --- BLUES, FUNK & SOUL ---
  {
    id: 'song-sweet-home-chicago',
    title: 'Sweet Home Chicago',
    artist: 'Robert Johnson / Buddy Guy',
    genre: 'Blues',
    key: 'C Major',
    bpm: 115,
    timeSignature: '4/4',
    grooveId: 'rock-driving-push',
    description: 'Essential 12-Bar Quick-Change dominant blues standard that shaped electric Chicago Blues.',
    tags: ['12-Bar Blues', 'Chicago Blues', 'Quick-Change'],
    chordsPerBeat: [
      'C7', '', '', '', 'F7', '', '', '', 'C7', '', '', '', 'C7', '', '', '',
      'F7', '', '', '', 'F7', '', '', '', 'C7', '', '', '', 'C7', '', '', '',
      'G7', '', '', '', 'F7', '', '', '', 'C7', '', '', '', 'G7', '', '', ''
    ]
  },
  {
    id: 'song-superstition',
    title: 'Superstition',
    artist: 'Stevie Wonder',
    genre: 'Funk',
    key: 'Eb Minor',
    bpm: 100,
    timeSignature: '4/4',
    grooveId: 'funk-16th-soul-push',
    description: 'Iconic funk anthem driven by a tight 16th-note clavinet groove and sharp dominant brass hits.',
    tags: ['Funk', 'Clavinet Groove', 'Stevie Wonder'],
    chordsPerBeat: [
      'Ebm7', '', '', '', 'Ebm7', '', '', '', 'Ebm7', '', '', '', 'Ebm7', '', '', '',
      'Bb7', '', '', '', 'Ab7', '', '', '', 'Ebm7', '', '', '', 'Ebm7', '', '', ''
    ]
  },
  {
    id: 'song-isnt-she-lovely',
    title: 'Isn\'t She Lovely',
    artist: 'Stevie Wonder',
    genre: 'R&B / Soul',
    key: 'E Major',
    bpm: 115,
    timeSignature: '4/4',
    grooveId: 'funk-16th-soul-push',
    description: 'Joyful R&B soul standard with extended minor 7th and dominant 9th chords over a bouncy 16th groove.',
    tags: ['R&B', 'Soul', '9th Chords'],
    chordsPerBeat: [
      'C#m7', '', '', '', 'F#7', '', '', '', 'B9', '', '', '', 'E', '', '', '',
      'C#m7', '', '', '', 'F#7', '', '', '', 'B9', '', '', '', 'E', '', '', ''
    ]
  },
  {
    id: 'song-aint-no-sunshine',
    title: 'Ain\'t No Sunshine',
    artist: 'Bill Withers',
    genre: 'R&B / Soul',
    key: 'A Minor',
    bpm: 78,
    timeSignature: '4/4',
    grooveId: 'funk-16th-soul-push',
    description: 'Soulful minor groove featuring Bill Withers\' passionate delivery and sparse, hypnotic rhythm section.',
    tags: ['Soul', 'Bill Withers', 'Minor Blues'],
    chordsPerBeat: [
      'Am', '', '', '', 'Em', '', '', '', 'G', '', '', '', 'Am', '', '', '',
      'Dm', '', '', '', 'Am', '', '', '', 'Em', '', '', '', 'Am', '', '', ''
    ]
  },

  // --- POP & ROCK CLASSICS ---
  {
    id: 'song-stand-by-me',
    title: 'Stand by Me',
    artist: 'Ben E. King',
    genre: 'Pop',
    key: 'C Major',
    bpm: 118,
    timeSignature: '4/4',
    grooveId: 'pop-acoustic-push',
    description: 'The legendary 1950s Doo-Wop / Pop ballad progression (I–vi–IV–V) instantly recognizable worldwide.',
    tags: ['Pop Classic', 'Doo-Wop', '50s Ballad'],
    chordsPerBeat: [
      'C', '', '', '', 'C', '', '', '', 'Am', '', '', '', 'Am', '', '', '',
      'F', '', '', '', 'G', '', '', '', 'C', '', '', '', 'C', '', '', ''
    ]
  },
  {
    id: 'song-hotel-california',
    title: 'Hotel California',
    artist: 'Eagles',
    genre: 'Rock',
    key: 'B Minor',
    bpm: 75,
    timeSignature: '4/4',
    grooveId: 'rock-driving-push',
    description: 'Dramatic Spanish-influenced minor rock progression featuring a distinct descending stepwise bassline.',
    tags: ['Classic Rock', 'Descending Bass', '70s Rock'],
    chordsPerBeat: [
      'Bm', '', '', '', 'F#7', '', '', '', 'A', '', '', '', 'E', '', '', '',
      'G', '', '', '', 'D', '', '', '', 'Em', '', '', '', 'F#7', '', '', ''
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
    description: 'Iconic 90s alternative rock progression built around the melancholic major-to-minor IV movement (G–B–C–Cm).',
    tags: ['Alternative Rock', '90s Hit', 'Minor IV Chord'],
    chordsPerBeat: [
      'G', '', '', '', 'G', '', '', '', 'B', '', '', '', 'B', '', '', '',
      'C', '', '', '', 'C', '', '', '', 'Cm', '', '', '', 'Cm', '', '', ''
    ]
  },
  {
    id: 'song-careless-whisper',
    title: 'Careless Whisper',
    artist: 'George Michael',
    genre: 'Pop',
    key: 'D Minor',
    bpm: 76,
    timeSignature: '4/4',
    grooveId: 'pop-acoustic-push',
    description: 'Sultry 80s pop ballad driven by an unmistakable saxophone riff and minor 7th chord loop.',
    tags: ['80s Pop', 'Saxophone Anthem', 'Ballad'],
    chordsPerBeat: [
      'Dm', '', '', '', 'Gm', '', '', '', 'Bb', '', '', '', 'Am', '', '', ''
    ]
  },

  // --- FLAMENCO & WORLD ---
  {
    id: 'song-entre-dos-aguas',
    title: 'Entre Dos Aguas',
    artist: 'Paco de Lucía',
    genre: 'Flamenco / Latin',
    key: 'E Phrygian',
    bpm: 134,
    timeSignature: '4/4',
    grooveId: 'flamenco-rumba-ventilador',
    description: 'Paco de Lucía\'s legendary Rumba Flamenca toque featuring the Andalusian cadence with virtuoso ventilador rhythm.',
    tags: ['Rumba Flamenca', 'Paco de Lucía', 'Andalusian Cadence'],
    chordsPerBeat: [
      'Em', '', '', '', 'D', '', '', '', 'C', '', '', '', 'B7', '', '', '',
      'Em', '', '', '', 'D', '', '', '', 'C', '', '', '', 'B7', '', '', ''
    ]
  },
  {
    id: 'song-volare-bamboleo',
    title: 'Volare / Bamboleo (Rumba Flamenca)',
    artist: 'Gipsy Kings',
    genre: 'Flamenco / Latin',
    key: 'A Minor',
    bpm: 132,
    timeSignature: '4/4',
    grooveId: 'flamenco-rumba-ventilador',
    description: 'Energetic Rumba Flamenca standard popularized worldwide by the Gipsy Kings with driving palmas and cajón.',
    tags: ['Gipsy Kings', 'Rumba Flamenca', 'World Hit'],
    chordsPerBeat: [
      'Am', '', '', '', 'Dm', '', '', '', 'G7', '', '', '', 'Cmaj7', '', '', '',
      'Fmaj7', '', '', '', 'B7', '', '', '', 'E7', '', '', '', 'E7', '', '', ''
    ]
  },

  // --- REGGAE ---
  {
    id: 'song-no-woman-no-cry',
    title: 'No Woman No Cry',
    artist: 'Bob Marley & The Wailers',
    genre: 'Reggae',
    key: 'C Major',
    bpm: 78,
    timeSignature: '4/4',
    grooveId: 'reggae-one-drop',
    description: 'Deeply emotional roots reggae standard utilizing a classic diatonic bass walk over one-drop skank rhythm.',
    tags: ['Roots Reggae', 'Bob Marley', 'One-Drop'],
    chordsPerBeat: [
      'C', '', '', '', 'G', '', '', '', 'Am', '', '', '', 'F', '', '', '',
      'C', '', '', '', 'F', '', '', '', 'C', '', '', '', 'G', '', '', ''
    ]
  },

  // --- 6/8 BALLADS & COUNTRY WALTZ ---
  {
    id: 'song-hallelujah',
    title: 'Hallelujah',
    artist: 'Leonard Cohen / Jeff Buckley',
    genre: 'Country / Folk',
    key: 'C Major',
    bpm: 68,
    timeSignature: '6/8',
    grooveId: 'ballad-68',
    description: 'Universal 6/8 compound-meter hymn following "the fourth, the fifth, the minor fall, the major lift".',
    tags: ['6/8 Ballad', 'Folk Anthem', 'Jeff Buckley'],
    chordsPerBeat: [
      'C', '', '', '', '', '', 'Am', '', '', '', '', '',
      'C', '', '', '', '', '', 'Am', '', '', '', '', '',
      'F', '', '', '', '', '', 'G', '', '', '', '', '',
      'C', '', '', '', '', '', 'G', '', '', '', '', ''
    ]
  },
  {
    id: 'song-tennessee-waltz',
    title: 'Tennessee Waltz',
    artist: 'Pee Wee King / Patti Page',
    genre: 'Country / Folk',
    key: 'C Major',
    bpm: 92,
    timeSignature: '3/4',
    grooveId: 'country-waltz-34',
    description: 'Charming 3/4 country waltz standard featuring simple, resonant open acoustic guitar harmonies.',
    tags: ['Country Waltz', '3/4 Time', 'Folk Standard'],
    chordsPerBeat: [
      'C', '', '', 'C7', '', '', 'F', '', '', 'C', '', '',
      'C', '', '', 'Am', '', '', 'G7', '', '', 'G7', '', ''
    ]
  },

  // --- J-POP / ANIME ---
  {
    id: 'song-jpop-royal-road',
    title: 'Royal Road Standard (王道進行)',
    artist: 'J-Pop & Anime Classics',
    genre: 'J-Pop / Anime',
    key: 'F Major',
    bpm: 128,
    timeSignature: '4/4',
    grooveId: 'pop-acoustic-push',
    description: 'The iconic IVmaj7–V7–iiim7–vim7 Oudou progression found in thousands of J-Pop, City Pop, and Anime theme songs.',
    tags: ['J-Pop', 'Anime Theme', 'Oudou Progression'],
    chordsPerBeat: [
      'Fmaj7', '', '', '', 'G7', '', '', '', 'Em7', '', '', '', 'Am7', '', '', ''
    ]
  }
];
