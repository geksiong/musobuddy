/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProgressionVariation {
  id: string;
  name: string;
  description?: string;
  chordsPerBeat: string[];
}

export interface DetailedProgression {
  id: string;
  name: string;
  genre: 'J-Pop / Anime' | 'Pop' | 'Jazz' | 'Rock' | 'Blues' | 'R&B / Soul' | 'Bossa Nova' | 'Flamenco' | 'Country / Folk';
  timeSignature: '4/4' | '3/4' | '6/8' | '5/4';
  bpm?: number;
  description: string;
  popularSongs: string[];
  variations: ProgressionVariation[];
}

export const CHORD_PROGRESSIONS_LIBRARY: DetailedProgression[] = [
  // --- ROCK ---
  {
    id: 'rock-alternative-creep',
    name: 'Alternative Rock Minor IV (I–III–IV–iv)',
    genre: 'Rock',
    timeSignature: '4/4',
    bpm: 92,
    description: 'Moody, dramatic chromatic progression featuring major III and the melancholic borrowing of minor iv.',
    popularSongs: [
      'Creep - Radiohead',
      'Desperado - Eagles',
      'Wake Me Up When September Ends - Green Day',
      'Don\'t Look Back in Anger - Oasis'
    ],
    variations: [
      {
        id: 'creep-basic',
        name: 'Radiohead Creep Progression (G–B–C–Cm)',
        description: 'Chromatic major to minor IV resolution',
        chordsPerBeat: ['G', '', '', '', 'B', '', '', '', 'C', '', '', '', 'Cm', '', '', '']
      },
      {
        id: 'creep-7th-extensions',
        name: '7th Extensions (Gmaj7–B7–Cmaj7–Cm6)',
        description: 'Rich atmospheric guitar voicings',
        chordsPerBeat: ['Gmaj7', '', '', '', 'B7', '', '', '', 'Cmaj7', '', '', '', 'Cm', '', '', '']
      }
    ]
  },
  {
    id: 'blues-12-bar',
    name: '12-Bar Quick-Change Blues',
    genre: 'Blues',
    timeSignature: '4/4',
    bpm: 110,
    description: 'The foundation of blues, rock-and-roll, and jazz jams. A 12-measure dominant 7th quick-change cycle.',
    popularSongs: [
      'Sweet Home Chicago - Robert Johnson',
      'Johnny B. Goode - Chuck Berry',
      'Pride and Joy - Stevie Ray Vaughan',
      'Stormy Monday - T-Bone Walker'
    ],
    variations: [
      {
        id: 'blues-12bar-dominant',
        name: '12-Bar Dominant 7th Quick-Change',
        description: '12-bar form in C Major with bar 2 quick change to F7',
        chordsPerBeat: [
          'C7', '', '', '', 'F7', '', '', '', 'C7', '', '', '', 'C7', '', '', '',
          'F7', '', '', '', 'F7', '', '', '', 'C7', '', '', '', 'C7', '', '', '',
          'G7', '', '', '', 'F7', '', '', '', 'C7', '', '', '', 'G7', '', '', ''
        ]
      },
      {
        id: 'blues-12bar-minor',
        name: '12-Bar Minor Blues (Cm7–Fm7)',
        description: 'Deep minor blues in C Minor featuring Ab7 to G7 turnaround',
        chordsPerBeat: [
          'Cm7', '', '', '', 'Fm7', '', '', '', 'Cm7', '', '', '', 'Cm7', '', '', '',
          'Fm7', '', '', '', 'Fm7', '', '', '', 'Cm7', '', '', '', 'Cm7', '', '', '',
          'Ab7', '', '', '', 'G7', '', '', '', 'Cm7', '', '', '', 'G7', '', '', ''
        ]
      }
    ]
  },

  // --- POP ---
  {
    id: 'pop-axis-of-awesome',
    name: 'Axis of Awesome (I–V–vi–IV)',
    genre: 'Pop',
    timeSignature: '4/4',
    bpm: 120,
    description: 'The most famous 4-chord progression in modern popular music, powering hundreds of top-40 chart toppers.',
    popularSongs: [
      'Don\'t Stop Believin\' - Journey',
      'Let It Be - The Beatles',
      'With or Without You - U2',
      'Poker Face - Lady Gaga',
      'Where Is the Love? - Black Eyed Peas'
    ],
    variations: [
      {
        id: 'axis-basic',
        name: 'Standard 4-Chord Pop (C–G–Am–F)',
        description: 'Clear, versatile major pop progression',
        chordsPerBeat: ['C', '', '', '', 'G', '', '', '', 'Am', '', '', '', 'F', '', '', '']
      },
      {
        id: 'axis-add9-modern',
        name: 'Modern Acoustic Add9 (Cadd9–G/B–Am7–Fadd9)',
        description: 'Resonant acoustic guitar open voicings',
        chordsPerBeat: ['C', '', '', '', 'G', '', '', '', 'Am7', '', '', '', 'F', '', '', '']
      },
      {
        id: 'axis-fast-2chords',
        name: 'Fast Pop Push (2 Chords/Bar: C–G | Am–F)',
        description: 'Doubled pace changing chords twice per measure',
        chordsPerBeat: ['C', '', 'G', '', 'Am', '', 'F', '']
      }
    ]
  },
  {
    id: 'pop-50s-doo-wop',
    name: '50s Doo-Wop / Stand by Me (I–vi–IV–V)',
    genre: 'Pop',
    timeSignature: '4/4',
    bpm: 110,
    description: 'Golden era 1950s rock-and-roll ballad progression that laid the foundation for modern pop and R&B.',
    popularSongs: [
      'Stand by Me - Ben E. King',
      'Heart and Soul - Hoagy Carmichael',
      'Earth Angel - The Penguins',
      'Blue Moon - The Marcels'
    ],
    variations: [
      {
        id: 'doowop-basic',
        name: 'Classic 50s Ballad (C–Am–F–G)',
        description: 'Authentic mid-century pop loop',
        chordsPerBeat: ['C', '', '', '', 'Am', '', '', '', 'F', '', '', '', 'G', '', '', '']
      },
      {
        id: 'doowop-7th-extensions',
        name: 'Smooth Jazz-Pop 7ths (Cmaj7–Am7–Dm7–G7)',
        description: 'Sophisticated 7ths replacing IV with ii7 for smooth bass leading',
        chordsPerBeat: ['Cmaj7', '', '', '', 'Am7', '', '', '', 'Dm7', '', '', '', 'G7', '', '', '']
      }
    ]
  },
  {
    id: 'jpop-royal-road',
    name: 'Royal Road / Oudou (王道進行)',
    genre: 'J-Pop / Anime',
    timeSignature: '4/4',
    bpm: 128,
    description: 'The legendary IVmaj7–V7–iiim7–vim7 progression ubiquitous across J-Pop, Anime openings, and Japanese vocaloid tracks.',
    popularSongs: [
      'Pretender - Official HIGE DANdism',
      'Gurenge - LiSA (Demon Slayer)',
      'Cruel Angel\'s Thesis - NGE',
      'Silhouettes - KANA-BOON (Naruto)',
      'God Knows... - Haruhi Suzumiya'
    ],
    variations: [
      {
        id: 'royal-road-7ths',
        name: 'Standard J-Pop 7ths (IVmaj7–V7–iiim7–vim7)',
        description: 'Lush 7th voicings used in modern J-Pop and Anime hooks',
        chordsPerBeat: ['Fmaj7', '', '', '', 'G7', '', '', '', 'Em7', '', '', '', 'Am7', '', '', '']
      },
      {
        id: 'royal-road-basic',
        name: 'Basic Triads (F–G–Em–Am)',
        description: 'Clean triad version ideal for acoustic strumming or beginner backing',
        chordsPerBeat: ['F', '', '', '', 'G', '', '', '', 'Em', '', '', '', 'Am', '', '', '']
      },
      {
        id: 'royal-road-anime-spice',
        name: 'Anime Opening Spice (E7/G# Passing)',
        description: 'Features dramatic secondary dominant E7/G# leading into Am7',
        chordsPerBeat: ['Fmaj7', '', '', '', 'G', '', '', '', 'E7', '', '', '', 'Am7', '', 'C', '']
      },
      {
        id: 'royal-road-city-pop',
        name: 'Just the Two of Us Sub (City Pop)',
        description: 'Replaces iiim7 with E7 for a nostalgic Japanese City Pop flavor',
        chordsPerBeat: ['Fmaj7', '', '', '', 'E7', '', '', '', 'Am7', '', '', '', 'Gm7', '', 'C7', '']
      }
    ]
  },
  {
    id: 'jpop-komuro',
    name: 'Komuro Progression (小室進行)',
    genre: 'J-Pop / Anime',
    timeSignature: '4/4',
    bpm: 135,
    description: 'Pioneered by Tetsuya Komuro, this energetic vi–IV–V–I movement powers Japanese dance pop, Eurobeat, and high-tempo Anime themes.',
    popularSongs: [
      'Get Wild - TM Network (City Hunter)',
      'Running in the 90s - Initial D',
      'Only My Railgun - fripSide',
      'My Soul, Your Beats! - Angel Beats'
    ],
    variations: [
      {
        id: 'komuro-basic',
        name: 'Classic Komuro (vi–IV–V–I)',
        description: 'High-energy driving progression in A Minor / C Major',
        chordsPerBeat: ['Am', '', '', '', 'F', '', '', '', 'G', '', '', '', 'C', '', '', '']
      },
      {
        id: 'komuro-7ths',
        name: 'Extended J-Dance 7ths',
        description: 'Rich synth-pop 7ths (Am7–Fmaj7–G7–Cmaj7)',
        chordsPerBeat: ['Am7', '', '', '', 'Fmaj7', '', '', '', 'G7', '', '', '', 'Cmaj7', '', '', '']
      },
      {
        id: 'komuro-inverted-bass',
        name: 'Eurobeat Driving Bass (Am–F/A–G/B–C)',
        description: 'Stepwise ascending bassline driving momentum forward',
        chordsPerBeat: ['Am', '', '', '', 'F', '', '', '', 'G', '', '', '', 'C', '', '', '']
      }
    ]
  },
  {
    id: 'jpop-koime-citypop',
    name: 'City Pop / Koime Cadence (IVmaj7–III7–vim7)',
    genre: 'J-Pop / Anime',
    timeSignature: '4/4',
    bpm: 118,
    description: 'Sensual, sophisticated Japanese retro cadence featuring dominant III7 resolving to vim7, popular in 80s City Pop and modern viral hits.',
    popularSongs: [
      'Plastic Love - Mariya Takeuchi',
      'Stay With Me - Miki Matsubara',
      'Shinunoga E-Wa - Fujii Kaze',
      'Flyday Chinatown - Yasuha'
    ],
    variations: [
      {
        id: 'koime-standard',
        name: 'Retro City Pop (Fmaj7–E7–Am7–Gm7–C7)',
        description: 'Iconic 80s Tokyo nightlife groove with 2-beat turnaround',
        chordsPerBeat: ['Fmaj7', '', '', '', 'E7', '', '', '', 'Am7', '', '', '', 'Gm7', '', 'C7', '']
      },
      {
        id: 'koime-extended-9ths',
        name: 'Modern Neo-City Pop (Fmaj7–E7b9–Am9)',
        description: 'Jazz-influenced altered dominants and extended 9th colors',
        chordsPerBeat: ['Fmaj7', '', '', '', 'E7', '', '', '', 'Am9', '', '', '', 'A7', '', '', '']
      }
    ]
  },
  {
    id: 'jpop-canon-pachelbel',
    name: 'Japanese Canon Variant (I–V–vi–iii–IV–I–IV–V)',
    genre: 'J-Pop / Anime',
    timeSignature: '4/4',
    bpm: 120,
    description: 'An adapted 8-measure Pachelbel Canon progression widely used for emotional J-Pop ballads and graduation anthems.',
    popularSongs: [
      'Memories - Maroon 5',
      'First Love - Utada Hikaru',
      'Graduation - Vitamin C',
      'Kokoronotomo - Mayumi Itsuwa'
    ],
    variations: [
      {
        id: 'canon-basic',
        name: 'Standard Canon (8-Measure Loop)',
        description: 'Full 8-bar stepwise descending bass loop',
        chordsPerBeat: [
          'C', '', '', '', 'G', '', '', '', 'Am', '', '', '', 'Em', '', '', '',
          'F', '', '', '', 'C', '', '', '', 'F', '', '', '', 'G', '', '', ''
        ]
      },
      {
        id: 'canon-ballad-7ths',
        name: 'Anime Ballad 7ths & Bass Inversions',
        description: 'Smooth voice-leading with bass inversions (C–G/B–Am–Em/G)',
        chordsPerBeat: [
          'C', '', '', '', 'G', '', '', '', 'Am7', '', '', '', 'Em7', '', '', '',
          'Fmaj7', '', '', '', 'C', '', '', '', 'Dm7', '', '', '', 'G7', '', '', ''
        ]
      }
    ]
  },
  {
    id: 'jpop-waltz-34',
    name: 'J-Pop / Anime Emotional Waltz (3/4)',
    genre: 'J-Pop / Anime',
    timeSignature: '3/4',
    bpm: 115,
    description: 'Sweeping 3/4 triple-meter theme used in Studio Ghibli soundtracks and emotional anime anime film climaxes.',
    popularSongs: [
      'Merry-Go-Round of Life - Howl\'s Moving Castle',
      'Sparkle - Your Name (Kimi no Na wa)',
      'Dango Daik家族 - Clannad'
    ],
    variations: [
      {
        id: 'jpop-waltz-standard',
        name: 'Emotional Anime Waltz (F–G–Em–Am in 3/4)',
        description: '3/4 adaptation of the Royal Road progression',
        chordsPerBeat: ['F', '', '', 'G', '', '', 'Em', '', '', 'Am', '', '']
      },
      {
        id: 'jpop-waltz-rich-7ths',
        name: 'Orchestral Soundtrack 7ths (Fmaj7–G7–Em7–Am7)',
        description: 'Lush symphonic voicings for cinematic strings and piano',
        chordsPerBeat: ['Fmaj7', '', '', 'G7', '', '', 'Em7', '', '', 'Am7', '', '']
      }
    ]
  },

  // --- FUNK / SOUL ---
  {
    id: 'neosoul-9th-extensions',
    name: 'Neo-Soul Smooth 9th Extensions',
    genre: 'R&B / Soul',
    timeSignature: '4/4',
    bpm: 85,
    description: 'Modern R&B and Neo-Soul chord loop utilizing extended 9ths, 13ths, and altered dominant tension.',
    popularSongs: [
      'Redbone - Childish Gambino',
      'Best Part - Daniel Caesar & H.E.R.',
      'Unaware - Allen Stone',
      'Untitled (How Does It Feel) - D\'Angelo'
    ],
    variations: [
      {
        id: 'neosoul-smooth',
        name: 'Smooth Neo-Soul Loop (Dm9–G13–Cmaj9–A7#9)',
        description: 'Classic lay-back groove with hendrix/soul altered A7#9 chord',
        chordsPerBeat: ['Dm9', '', '', '', 'G13', '', '', '', 'Cmaj9', '', '', '', 'A7#9', '', '', '']
      },
      {
        id: 'neosoul-passing-dim',
        name: 'Passing Diminished (Dm9–G13–Cmaj9–C#dim7)',
        description: 'Features chromatic passing diminished 7th back into Dm9',
        chordsPerBeat: ['Dm9', '', '', '', 'G13', '', '', '', 'Cmaj9', '', '', '', 'C#dim7', '', '', '']
      }
    ]
  },

  // --- JAZZ ---
  {
    id: 'jazz-ii-v-i-vi',
    name: 'Jazz ii–V–I–VI Turnaround',
    genre: 'Jazz',
    timeSignature: '4/4',
    bpm: 130,
    description: 'The fundamental harmonic unit of American jazz standards, bebop, and swing turnarounds.',
    popularSongs: [
      'Autumn Leaves - Joseph Kosma',
      'Fly Me to the Moon - Frank Sinatra',
      'Take the \'A\' Train - Duke Ellington',
      'All the Things You Are - Jerome Kern'
    ],
    variations: [
      {
        id: 'jazz-1chord-bar',
        name: 'Standard 1 Chord/Bar (Dm7–G7–Cmaj7–A7)',
        description: 'Spacious 4-measure turnaround in C Major',
        chordsPerBeat: ['Dm7', '', '', '', 'G7', '', '', '', 'Cmaj7', '', '', '', 'A7', '', '', '']
      },
      {
        id: 'jazz-2chords-bar',
        name: 'Bebop 2 Chords/Bar (Dm7–G7 | Cmaj7–A7)',
        description: 'Fast-moving 2-measure turnaround changing chords every 2 beats',
        chordsPerBeat: ['Dm7', '', 'G7', '', 'Cmaj7', '', 'A7', '']
      },
      {
        id: 'jazz-tritone-sub',
        name: 'Tritone Substitution (Dm7–Db7–Cmaj7–A7)',
        description: 'Replaces G7 with chromatic tritone sub Db7 for smooth bassline drop',
        chordsPerBeat: ['Dm7', '', '', '', 'Db7', '', '', '', 'Cmaj7', '', '', '', 'A7', '', '', '']
      }
    ]
  },
  {
    id: '54-take-five-vamp',
    name: '5/4 Cool Jazz Vamp (Take Five)',
    genre: 'Jazz',
    timeSignature: '5/4',
    bpm: 140,
    description: 'Iconic asymmetric 5-beat cool jazz groove inspired by Paul Desmond & Dave Brubeck.',
    popularSongs: [
      'Take Five - Dave Brubeck Quartet',
      'Mission Impossible Theme (5/4 adaptation)',
      '15 Step - Radiohead'
    ],
    variations: [
      {
        id: '54-take-five-standard',
        name: 'Take Five Minor 7th Vamp (Ebm7–Bbm7)',
        description: 'Hypnotic 5-beat swing vamp in Eb minor',
        chordsPerBeat: ['Ebm7', '', '', '', '', 'Bbm7', '', '', '', '', 'Ebm7', '', '', '', '', 'Bbm7', '', '', '', '']
      }
    ]
  },

  // --- LATIN ---
  {
    id: 'jazz-bossa-nova-cycle',
    name: 'Bossa Nova Standard Cycle',
    genre: 'Bossa Nova',
    timeSignature: '4/4',
    bpm: 124,
    description: 'Lush Brazilian jazz samba progression featuring II7 major dominant sub-vamps and minor ii–V cadences.',
    popularSongs: [
      'The Girl from Ipanema - Jobim',
      'Wave - Jobim',
      'Desafinado - Stan Getz',
      'Corcovado (Quiet Nights of Quiet Stars)'
    ],
    variations: [
      {
        id: 'bossa-standard',
        name: 'Classic Bossa Nova (Fmaj7–G7–Gm7–C7)',
        description: 'Classic Jobim 4-measure major-to-minor cycle',
        chordsPerBeat: ['Fmaj7', '', '', '', 'G7', '', '', '', 'Gm7', '', '', '', 'C7', '', '', '']
      },
      {
        id: 'bossa-extended',
        name: 'Lush Extended Voicings (Fmaj7–G13–Gm9–C7b9)',
        description: 'Rich altered dominant colors for jazz guitar and electric piano',
        chordsPerBeat: ['Fmaj7', '', '', '', 'G7', '', '', '', 'Gm7', '', '', '', 'C7', '', '', '']
      }
    ]
  },

  // --- WORLD ---
  {
    id: '68-compound-ballad',
    name: '6/8 Compound Power Ballad',
    genre: 'Country / Folk',
    timeSignature: '6/8',
    bpm: 72,
    description: 'Rolling 6/8 compound meter progression used for soul, rock, and acoustic anthems.',
    popularSongs: [
      'Hallelujah - Jeff Buckley',
      'House of the Rising Sun - The Animals',
      'Perfect - Ed Sheeran',
      'Shallow - Lady Gaga'
    ],
    variations: [
      {
        id: '68-minor-epic',
        name: 'Epic Minor 6/8 (Am–F–C–G)',
        description: 'Dramatic 6/8 compound rolling rhythm',
        chordsPerBeat: ['Am', '', '', '', '', '', 'F', '', '', '', '', '', 'C', '', '', '', '', '', 'G', '', '', '', '', '']
      },
      {
        id: '68-gospel-soul',
        name: 'Gospel Soul 6/8 (C–C7–F–Fm)',
        description: 'Warm gospel major-to-minor IV movement in compound meter',
        chordsPerBeat: ['C', '', '', '', '', '', 'C7', '', '', '', '', '', 'F', '', '', '', '', '', 'Fm', '', '', '', '', '']
      }
    ]
  },

  // --- FLAMENCO ---
  {
    id: 'rock-flamenco-andalusian',
    name: 'Andalusian Cadence (i–♭VII–♭VI–V)',
    genre: 'Flamenco',
    timeSignature: '4/4',
    bpm: 115,
    description: 'Dramatic descending Phrygian minor cadence found in Spanish Flamenco, classic rock solos, and cinematic themes.',
    popularSongs: [
      'Sultans of Swing - Dire Straits',
      'Smooth - Santana',
      'Habanera - Bizet (Carmen)',
      'Generique - Cowboy Bebop'
    ],
    variations: [
      {
        id: 'andalusian-basic',
        name: 'Classic Descending Minor (Am–G–F–E)',
        description: 'Fundamental 4-measure descending Phrygian cadence',
        chordsPerBeat: ['Am', '', '', '', 'G', '', '', '', 'F', '', '', '', 'E', '', '', '']
      },
      {
        id: 'andalusian-flamenco-open',
        name: 'Flamenco Por Arriba (Am9–G6–Fmaj7#11–E7b9)',
        description: 'Authentic Spanish guitar open string voicings',
        chordsPerBeat: ['Am9', '', '', '', 'G6', '', '', '', 'Fmaj7#11', '', '', '', 'E7b9', '', '', '']
      }
    ]
  }
];
