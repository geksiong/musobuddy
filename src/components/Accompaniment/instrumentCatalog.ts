/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Instrument Catalog for MusoBuddy Accompaniment Engine
 * Provides categorized instrument selections across Percussion, Bass, Rhythm, and Synth tracks.
 */

export interface AccompanimentInstrument {
  id: string;
  name: string;
  category: string;
  description: string;
  badge?: string;
  iconName?: string;
}

// ============================================================================
// 1. PERCUSSION TRACK INSTRUMENTS (Drum Kit, 808/Electronic, Latin, Flamenco/World)
// ============================================================================
// 1. DRUM SETS (Cohesive acoustic kits, electronic 808, Latin, Flamenco, etc.)
// ============================================================================
export interface DrumSetPiece {
  id: string;
  name: string;
  sound: string;
  defaultVolume: number;
  role: 'kick' | 'snare' | 'hihat' | 'cymbal' | 'percussion';
}

export interface DrumSet {
  id: string;
  name: string;
  category: string;
  description: string;
  badge: string;
  pieces: DrumSetPiece[];
}

export const DRUM_SETS: DrumSet[] = [
  {
    id: 'drumset_acoustic_studio',
    name: 'Acoustic Studio Drum Kit',
    category: 'Acoustic Kits',
    badge: 'Studio',
    description: 'Punchy studio acoustic kit with crisp wooden snare, deep punch kick, and articulate closed/pedal hi-hat.',
    pieces: [
      { id: 'hihat', name: 'Studio Hi-Hat', sound: 'hihat_closed', defaultVolume: 0.8, role: 'hihat' },
      { id: 'snare', name: 'Acoustic Snare', sound: 'snare_acoustic', defaultVolume: 0.85, role: 'snare' },
      { id: 'kick', name: 'Punchy Bass Drum', sound: 'kick_acoustic', defaultVolume: 0.95, role: 'kick' }
    ]
  },
  {
    id: 'drumset_vintage_jazz_brush',
    name: 'Vintage Jazz Brush Kit',
    category: 'Jazz & Acoustic',
    badge: 'Jazz',
    description: 'Warm textured jazz brush swirls on snare, feathered bass drum, and gentle pedal hi-hat chick for swing comping.',
    pieces: [
      { id: 'hihat', name: 'Pedal Hi-Hat Chick', sound: 'hihat_pedal', defaultVolume: 0.75, role: 'hihat' },
      { id: 'snare', name: 'Jazz Brush Swirl', sound: 'snare_brush', defaultVolume: 0.75, role: 'snare' },
      { id: 'kick', name: 'Feathered Kick', sound: 'kick_acoustic', defaultVolume: 0.7, role: 'kick' }
    ]
  },
  {
    id: 'drumset_808_electronic',
    name: '808 Electronic Drum Machine',
    category: 'Electronic & Modern',
    badge: '808',
    description: 'Classic transistor drum machine with deep 50Hz sub bass sine kick, snappy white-noise snare, and electro metallic hat.',
    pieces: [
      { id: 'hihat', name: '808 Metallic Hat', sound: 'hihat_808', defaultVolume: 0.8, role: 'hihat' },
      { id: 'snare', name: '808 Snappy Snare', sound: 'snare_808', defaultVolume: 0.85, role: 'snare' },
      { id: 'kick', name: '808 Sub Boom Kick', sound: 'kick_808', defaultVolume: 0.95, role: 'kick' }
    ]
  },
  {
    id: 'drumset_latin_mambo',
    name: 'Afro-Cuban / Latin Percussion Kit',
    category: 'Latin & Hand',
    badge: 'Latin',
    description: 'Authentic Afro-Cuban percussion kit featuring open conga tumba, hardwood son clave, and tight bead shaker.',
    pieces: [
      { id: 'shaker', name: 'Cabasa / Shaker', sound: 'shaker', defaultVolume: 0.7, role: 'hihat' },
      { id: 'clave', name: 'Son / Rumba Clave', sound: 'clave', defaultVolume: 0.85, role: 'snare' },
      { id: 'conga', name: 'Conga Tumba Open', sound: 'conga_low', defaultVolume: 0.9, role: 'kick' }
    ]
  },
  {
    id: 'drumset_bossa_nova',
    name: 'Brazilian Bossa Nova Kit',
    category: 'Latin & Hand',
    badge: 'Bossa',
    description: 'Delicate Brazilian rhythm kit with soft surdo pulse, wooden cross-stick rimshot, and silky bead shaker.',
    pieces: [
      { id: 'shaker', name: 'Silky Shaker Pulse', sound: 'shaker', defaultVolume: 0.7, role: 'hihat' },
      { id: 'rimshot', name: 'Cross-Stick Rimshot', sound: 'snare_rimshot', defaultVolume: 0.8, role: 'snare' },
      { id: 'kick', name: 'Soft Surdo / Kick', sound: 'kick_acoustic', defaultVolume: 0.85, role: 'kick' }
    ]
  },
  {
    id: 'drumset_flamenco_cajon',
    name: 'Flamenco Cajón & Palmas Kit',
    category: 'Flamenco & World',
    badge: 'Flamenco',
    description: 'Traditional Andalusian flamenco rhythm setup: Peruvian cajón grave (bass), cajón agudo (slap), and palmas sordas.',
    pieces: [
      { id: 'palmas', name: 'Palmas Sordas', sound: 'palmas_sordas', defaultVolume: 0.85, role: 'hihat' },
      { id: 'cajon_slap', name: 'Cajón Agudo (Slap)', sound: 'cajon_slap', defaultVolume: 0.8, role: 'snare' },
      { id: 'cajon_bass', name: 'Cajón Grave (Bass)', sound: 'cajon_bass', defaultVolume: 0.9, role: 'kick' }
    ]
  },
  {
    id: 'drumset_funk_pocket',
    name: 'Funk & Soul Pocket Kit',
    category: 'Acoustic Kits',
    badge: 'Funk',
    description: 'Ultra-tight pocket drum kit with biting snare rimshot, tight 16th hi-hat chick, and focused bass drum punch.',
    pieces: [
      { id: 'hihat', name: 'Tight 14" Hi-Hat', sound: 'hihat_closed', defaultVolume: 0.8, role: 'hihat' },
      { id: 'snare', name: 'Cracking Rimshot Snare', sound: 'snare_rimshot', defaultVolume: 0.9, role: 'snare' },
      { id: 'kick', name: 'Tight Punchy Kick', sound: 'kick_acoustic', defaultVolume: 0.95, role: 'kick' }
    ]
  },
  {
    id: 'drumset_reggae_one_drop',
    name: 'Reggae / Dub One-Drop Kit',
    category: 'Electronic & Modern',
    badge: 'Reggae',
    description: 'Authentic Kingston one-drop drum setup with high-tuned snare rim crack, open hi-hat offbeats, and deep sub kick.',
    pieces: [
      { id: 'hihat', name: 'Offbeat Hi-Hat', sound: 'hihat_closed', defaultVolume: 0.8, role: 'hihat' },
      { id: 'snare', name: 'One-Drop Rimshot', sound: 'snare_rimshot', defaultVolume: 0.9, role: 'snare' },
      { id: 'kick', name: 'One-Drop Kick', sound: 'kick_acoustic', defaultVolume: 0.95, role: 'kick' }
    ]
  }
];

export const PERCUSSION_SOUNDS: { id: string; name: string; category: string; description: string }[] = [
  // Acoustic Drum Kit
  { id: 'kick_acoustic', name: 'Acoustic Punch Kick', category: 'Acoustic Kit', description: 'Punchy studio acoustic bass drum with woody thump' },
  { id: 'snare_acoustic', name: 'Crisp Studio Snare', category: 'Acoustic Kit', description: 'Bright wooden snare with crisp wire response' },
  { id: 'snare_rimshot', name: 'Snare Rimshot / Stick', category: 'Acoustic Kit', description: 'Sharp wood-on-metal rimshot crack' },
  { id: 'snare_brush', name: 'Jazz Brush Swirl', category: 'Acoustic Kit', description: 'Soft textured jazz brush whisk on snare head' },
  { id: 'hihat_closed', name: 'Closed Hi-Hat', category: 'Acoustic Kit', description: 'Crisp metallic 14-inch hi-hat chick' },
  { id: 'hihat_open', name: 'Open Hi-Hat', category: 'Acoustic Kit', description: 'Sizzling open hi-hat wash with natural decay' },
  { id: 'hihat_pedal', name: 'Pedal Hi-Hat Chick', category: 'Acoustic Kit', description: 'Subtle foot-pedal hi-hat snap for swing comping' },
  { id: 'ride_cymbal', name: 'Acoustic Warm Ride Cymbal', category: 'Acoustic Kit', description: 'Silky acoustic bronze ride cymbal with smooth stick ping and subtle wash' },
  { id: 'crash_cymbal', name: 'Studio Crash', category: 'Acoustic Kit', description: 'Full dynamic crash cymbal splash' },

  // Electronic & 808
  { id: 'kick_808', name: '808 Sub Boom Kick', category: 'Electronic & 808', description: 'Deep 50Hz sub bass sine boom with warm saturation' },
  { id: 'snare_808', name: '808 Snappy Snare', category: 'Electronic & 808', description: 'Iconic electro snare with snappy white noise burst' },
  { id: 'clap_808', name: '808 Handclap', category: 'Electronic & 808', description: 'Multi-burst synthesized electro clap' },
  { id: 'hihat_808', name: '808 Metallic Hat', category: 'Electronic & 808', description: 'Classic 6-oscillator transistor cymbal chime' },
  { id: 'cowbell_808', name: '808 Electro Cowbell', category: 'Electronic & 808', description: 'Dual square-wave syncopated electro bell' },

  // Latin & Hand Percussion
  { id: 'woodblock', name: 'Rosewood Block', category: 'Latin & Hand', description: 'Crisp pitched high rosewood percussion block' },
  { id: 'clave', name: 'Son / Rumba Clave', category: 'Latin & Hand', description: 'High hardwood striking stick with pure resonance' },
  { id: 'cowbell', name: 'Cha-Cha Cowbell', category: 'Latin & Hand', description: 'Warm acoustic cha-cha mambo hand bell' },
  { id: 'agogo', name: 'Agogô Brazilian Bell', category: 'Latin & Hand', description: 'High pitched dual-tone samba iron bells' },
  { id: 'shaker', name: 'Cabasa / Shaker', category: 'Latin & Hand', description: 'Tight metallic bead shaker with crisp back-and-forth swing' },
  { id: 'tambourine', name: 'Jingle Tambourine', category: 'Latin & Hand', description: 'Bright zill jingles with wooden frame thump' },
  { id: 'conga_high', name: 'Conga Quinto Slap', category: 'Latin & Hand', description: 'High-tension dry skin slap with fast cutoff' },
  { id: 'conga_low', name: 'Conga Tumba Open', category: 'Latin & Hand', description: 'Deep warm resonant open tone on large conga' },
  { id: 'bongo_high', name: 'Bongo Macho Sharp', category: 'Latin & Hand', description: 'High-tuned sharp finger tap on small bongo' },
  { id: 'bongo_low', name: 'Bongo Hembra Warm', category: 'Latin & Hand', description: 'Warm open resonant stroke on large bongo' },

  // Flamenco & World
  { id: 'palmas_sordas', name: 'Palmas Sordas (Muffled)', category: 'Flamenco & World', description: 'Traditional flamenco cupped handclaps for deep compás' },
  { id: 'palmas_claras', name: 'Palmas Claras (Bright)', category: 'Flamenco & World', description: 'Sharp bright finger-to-palm claps for accents' },
  { id: 'cajon_bass', name: 'Cajón Grave (Bass)', category: 'Flamenco & World', description: 'Deep wooden box soundhole thump' },
  { id: 'cajon_slap', name: 'Cajón Agudo (Slap)', category: 'Flamenco & World', description: 'Top corner wooden slap with internal snare wire buzz' },
  { id: 'bodhran', name: 'Irish Bodhrán Pulse', category: 'Flamenco & World', description: 'Deep goatskin frame drum with low resonant decay' },
  { id: 'clocktick', name: 'Mechanical Clock Tick', category: 'Flamenco & World', description: 'Crisp wooden metronome tick' }
];

// ============================================================================
// 2. BASS TRACK INSTRUMENTS (Acoustic, Electric, Funk, Moog, Acid, Sub)
// ============================================================================
export const BASS_INSTRUMENTS: AccompanimentInstrument[] = [
  {
    id: 'bass_upright',
    name: 'Acoustic Upright Bass',
    category: 'Acoustic & Electric',
    description: 'Rich carved spruce body resonance, warm fingerboard thud, and natural wood sustain.',
    badge: 'Acoustic'
  },
  {
    id: 'bass_electric_finger',
    name: 'Electric Precision Bass',
    category: 'Acoustic & Electric',
    description: 'Split-coil magnetic pickup warmth, punchy low-mids, and roundwound string bite.',
    badge: 'Electric'
  },
  {
    id: 'bass_slap_funk',
    name: 'Slap & Pop Funk Bass',
    category: 'Acoustic & Electric',
    description: 'Percussive thumb slap transient with bright scooped midrange and high snap.',
    badge: 'Funk'
  },
  {
    id: 'bass_picked_rock',
    name: 'Picked Rock Bass',
    category: 'Acoustic & Electric',
    description: 'Sharp plectrum scrape attack, aggressive upper-mid growl, and cutting drive.',
    badge: 'Rock'
  },
  {
    id: 'bass_fretless',
    name: 'Fretless Singing Bass',
    category: 'Acoustic & Electric',
    description: 'Smooth mwah harmonic bloom, gentle finger vibrato, and silky melodic sustain.',
    badge: 'Smooth'
  },
  {
    id: 'bass_moog_analog',
    name: 'Moog 24dB Ladder Sub',
    category: 'Synth & Electronic',
    description: 'Dual detuned analog saw oscillators driven into a resonant 4-pole transistor ladder filter.',
    badge: 'Analog'
  },
  {
    id: 'bass_acid_303',
    name: 'TB-303 Acid Resonant Bass',
    category: 'Synth & Electronic',
    description: 'Iconic squelchy resonant lowpass filter envelope with rubbery drive and accent glide.',
    badge: 'Acid'
  },
  {
    id: 'bass_sub_808',
    name: '808 Sub Sine Bass',
    category: 'Synth & Electronic',
    description: 'Pure chest-thumping 40Hz sub sine wave with warm soft-saturation harmonics.',
    badge: 'Sub'
  }
];

// ============================================================================
// 3. RHYTHM / HARMONY TRACK INSTRUMENTS (Pianos, Guitars, Organs, Orchestral)
// ============================================================================
export const RHYTHM_INSTRUMENTS: AccompanimentInstrument[] = [
  {
    id: 'rhythm_piano',
    name: 'Concert Grand Piano',
    category: 'Keyboards',
    description: 'Full 9-foot acoustic grand with felt hammer transients and soundboard resonance.',
    badge: 'Grand'
  },
  {
    id: 'rhythm_rhodes',
    name: 'Rhodes Mark I Electric Piano',
    category: 'Keyboards',
    description: 'Warm silver tine FM bell ping, magnetic pickup bark, and stereo suitcase chorus.',
    badge: 'Vintage'
  },
  {
    id: 'rhythm_wurlitzer',
    name: 'Wurlitzer 200A Reed Piano',
    category: 'Keyboards',
    description: 'Vibrating steel reed warmth, biting midrange growl, and lush tremolo.',
    badge: 'Soul'
  },
  {
    id: 'rhythm_clavinet',
    name: 'Funky Clavinet D6',
    category: 'Keyboards',
    description: 'Sharp snapped guitar-string pickup transient with ultra-crisp funk rhythm response.',
    badge: 'Funk'
  },
  {
    id: 'rhythm_dx7_keys',
    name: 'DX7 Shimmer FM Keys',
    category: 'Keyboards',
    description: 'Crystalline digital FM tines with glassy 80s ballad shimmer and chime harmonics.',
    badge: 'FM'
  },
  {
    id: 'rhythm_guitar_acoustic',
    name: 'Acoustic Steel Guitar',
    category: 'Guitars',
    description: 'Dreadnought steel-string acoustic with crisp plectrum pick attack, spruce soundboard air, highpass mud filtering, and natural decay.',
    badge: 'Acoustic'
  },
  {
    id: 'rhythm_guitar_nylon',
    name: 'Nylon Classical Guitar',
    category: 'Guitars',
    description: 'Warm cedar-top nylon plucks with soft finger transient, woody body resonance, and clean articulation for Bossa Nova and Flamenco.',
    badge: 'Latin'
  },
  {
    id: 'rhythm_guitar_electric',
    name: 'Clean Electric / Strat Guitar',
    category: 'Guitars',
    description: 'Clean Stratocaster / Jazz Hollowbody electric guitar with warm magnetic pickup punch, amp cabinet roll-off, and tight funk comping response.',
    badge: 'Electric'
  },
  {
    id: 'rhythm_organ_b3',
    name: 'Hammond B3 Tonewheel Organ',
    category: 'Organs & Mallets',
    description: 'Authentic 9-drawbar harmonics, mechanical key click percussion, and rotary Leslie swell.',
    badge: 'Organ'
  },
  {
    id: 'rhythm_marimba',
    name: 'Rosewood Acoustic Marimba',
    category: 'Organs & Mallets',
    description: 'Hard yarn mallet on Honduran rosewood with double-octave overtone resonator tubes.',
    badge: 'Mallet'
  },
  {
    id: 'rhythm_strings',
    name: 'Symphonic Strings Ensemble',
    category: 'Orchestral',
    description: 'Lush chorused violin, viola, and cello section with natural bowing decrescendo.',
    badge: 'Strings'
  },
  {
    id: 'rhythm_brass',
    name: 'Brass Horns Section',
    category: 'Orchestral',
    description: 'Tight trumpet and trombone section with lip swell and dynamic filter bite.',
    badge: 'Brass'
  }
];

// ============================================================================
// 4. SYNTH TRACK INSTRUMENTS (Leads, Pads, Arps, Bells, 80s PolySynths)
// ============================================================================
export const SYNTH_INSTRUMENTS: AccompanimentInstrument[] = [
  {
    id: 'synth_silk_pad',
    name: 'Lush Silk Ambient Pad',
    category: 'Pads & Textures',
    description: 'Airy background ambient pad with gentle 70ms bloom, highpass low-cut (no sub rumble), and disciplined musical release to prevent chord bleeding.',
    badge: 'Lush Pad'
  },
  {
    id: 'synth_analog_saw',
    name: '80s Analog Saw Lead',
    category: 'Leads & Arps',
    description: 'Dual detuned sawtooth oscillators with fast filter envelope punch and expressive pitch drift.',
    badge: 'Lead'
  },
  {
    id: 'synth_poly_brass',
    name: '1984 PolySynth Brass',
    category: 'Pads & Textures',
    description: 'Snappy vintage polysynth brass stabs with punchy 18ms lip swell, tight filter cutoff, and highpass mud filtering.',
    badge: 'PolySynth'
  },
  {
    id: 'synth_fm_bell',
    name: 'Crystal FM Glass Bell',
    category: 'Pads & Textures',
    description: 'Sparkling metallic FM bell chime with crystalline high frequencies and shimmering tail.',
    badge: 'Chime'
  },
  {
    id: 'synth_chiptune_square',
    name: '8-Bit Chiptune Square Lead',
    category: 'Vintage & Lo-Fi',
    description: 'Nostalgic retro game pulse wave with snappy arpeggio flourish and classic vibrato.',
    badge: '8-Bit'
  },
  {
    id: 'synth_acid_lead',
    name: 'Acid Resonant Arp Lead',
    category: 'Leads & Arps',
    description: 'Fast rubbery resonant lowpass filter sweep with sharp decay for high-energy syncopation.',
    badge: 'Acid'
  },
  {
    id: 'synth_modern_supersaw',
    name: 'Modern EDM Supersaw',
    category: 'Leads & Arps',
    description: 'Ultra-wide multi-oscillator detuned saw stack with highpass shimmer and euphoric energy.',
    badge: 'Supersaw'
  },
  {
    id: 'synth_lofi_tape',
    name: 'Lo-Fi Vintage Tape Synth',
    category: 'Vintage & Lo-Fi',
    description: 'Warm analog triangle/saw hybrid with subtle tape flutter pitch drift and rolled-off highs.',
    badge: 'Lo-Fi'
  }
];

// Sound mapping helpers
export function getPercussionInfo(id: string) {
  return PERCUSSION_SOUNDS.find(s => s.id === id) || PERCUSSION_SOUNDS[0];
}

export function getDrumSetInfo(id: string): DrumSet {
  return DRUM_SETS.find(d => d.id === id) || DRUM_SETS[0];
}

export function getBassInfo(id: string) {
  return BASS_INSTRUMENTS.find(b => b.id === id) || BASS_INSTRUMENTS[0];
}

export function getRhythmInfo(id: string) {
  return RHYTHM_INSTRUMENTS.find(r => r.id === id) || RHYTHM_INSTRUMENTS[0];
}

export function getSynthInfo(id: string) {
  return SYNTH_INSTRUMENTS.find(s => s.id === id) || SYNTH_INSTRUMENTS[0];
}
