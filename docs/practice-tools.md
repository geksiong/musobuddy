# Practice Tools Subsystem

MusoBuddy provides five dedicated musical practice modules and quick-access panels accessible via the top navigation header and bottom status bar.

---

## 1. Precision Metronome (`MetronomeView.tsx` & `useMetronome.ts`)

A high-precision timing engine designed for practice, scale work, and tempo training.

### Key Capabilities
- **Tempo Range:** 30 BPM to 300 BPM with tap tempo detection.
- **Time Signatures:** 2/4, 3/4, 4/4, 6/8, 7/8, 9/8, 12/8.
- **Subdivisions:** Quarter notes, 8ths, 16ths, Triplets, Swing 8ths.
- **Accent Patterns:** Customizable beat weighting (Accent, Normal, Mute).
- **Sound Presets:** Woodblock, Beep, Cowbell, Click, Drum kit.
- **Visual Feedback:** Pulse animations and beat indicators synchronized with Web Audio `currentTime`.

---

## 2. Chromatic Tuner (`TunerView.tsx` & `useTuner.ts`)

A real-time instrument tuner utilizing the user's microphone input.

### Key Capabilities
- **Pitch Detection Algorithm:** Autocorrelation on audio time-domain buffers (`getFloatTimeDomainData`).
- **Frequency Analysis:** Calculates detected frequency (Hz), nearest musical note (e.g. A4 = 440 Hz), octave, and deviation in **cents** (-50 to +50 cents).
- **Reference Pitch Customization:** Adjustable A4 calibration (432 Hz, 440 Hz, 442 Hz, etc.).
- **Visual Needle Gauge:** High-contrast needle display with color-coded feedback (In-Tune green indicator when within ±3 cents).

---

## 3. Drone / Reference Tone Generator (`DroneView.tsx` & `useDrone.ts`)

Continuous pitch reference generator for intonation training and modal practice.

### Key Capabilities
- **Root Pitch & Key:** Full 12-chromatic octave selection (C through B).
- **Oscillator Voices:** Sine, Sawtooth, Square, Organ, Rich Pad, Brass.
- **Harmonic Layers:** Option to enable 5ths, Octaves, and Sub-octaves for full tonal depth.
- **Micro-Tuning:** Cent offset adjustment (±50 cents) for microtonal and non-equal-temperament practice.

---

## 4. Chord Explorer (`ChordExplorer.tsx`)

Visual chord reference tool for stringed instruments and piano.

### Key Capabilities
- **Diagram Types:** Interactive Guitar Fretboard, Ukulele Fretboard, and Piano Keyboard.
- **Chord Database:** Major, Minor, Dominant 7th, Major 7th, Minor 7th, Diminished, Augmented, Sus2, Sus4 voicings.
- **Audio Auditioning:** Click any chord diagram or key to hear the synthesized voicing via Web Audio.

---

## 5. Groove & Backing Accompaniment Engine (`AccompanimentView.tsx` & `GrooveEnginePanel.tsx`)

A real-time Web Audio accompaniment synthesizer that generates dynamic drum patterns, basslines, and chord rhythms.

### Key Capabilities
- **Arrangement Styles:** Jazz Swing, Bossa Nova, Pop Rhythm, Hard Rock, Funk Groove, Reggae Bounce, Slow Ballad.
- **Custom Chord Progressions:** Edit measures, pick root/quality combinations, and explore progression presets (`progressionPresets.ts`).
- **Chord Suggestions Engine:** Intelligent next-chord recommendation based on harmonic voice leading (`chordSuggestions.ts`).
- **Song Library:** Pre-loaded standard chord progressions and backing songs (`songLibrary.ts`).
- **Real-Time Mix & Swing Control:** Adjust tempo (40–240 BPM), swing feel percentage, master volume, and individual stem levels (Drums, Bass, Chords).

---

## 6. Quick Practice Tools Panel & About Modal (`PracticeToolsPanel.tsx` & `AboutModal.tsx`)

- **Practice Tools Panel:** A slide-out side drawer accessible from the header allowing quick parameter adjustments (metronome BPM, drone root, tuner, backing tracks) without navigating away from the active score.
- **About Modal:** Opened via the "About" button in the footer bar. Displays app metadata ("by Gek S. Low"), version info, a comprehensive breakdown of core practice features, and detailed descriptions of all supported score formats.

