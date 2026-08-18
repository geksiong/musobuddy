# MusoBuddy 🎵

**MusoBuddy** is a comprehensive, interactive, web-based music practice suite and sheet music reader designed for musicians, teachers, students, and performers. It brings together high-precision audio practice tools, multi-format score viewing and rendering, dynamic key transposition, interactive tablature overlays, digital score annotations, real-time groove accompaniment generation, and audio playback into a single responsive web interface.

---

## 🌟 Key Features

### 🎼 Interactive Multi-Format Score Reader
- **Multi-Format Support:** Render and view sheet music in **ABC Notation** (`.abc`, `.txt`), **Guitar Pro** (`.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx`, `.ptb`), **ChordPro / Chord Sheets** (`.pro`, `.chordpro`, `.cho`, `.crd`), **MusicXML** (`.xml`, `.musicxml`, `.mxl`), and **PDF** Documents (`.pdf`).
- **Dynamic Key Transposition:** Instant semitone key shifting (-17 to +17 semitones) with automatic chord symbol and note transposition.
- **Instrument Tablature Overlays:** Dynamic TAB generation for Guitar, DADGAD, Ukulele, Banjo, and Mandolin.
- **Guitar Pro & Soundfont Playback:** Multi-track score rendering powered by AlphaTab with realistic SoundFont audio (`sonivox.sf2`), track solo/mute controls, and speed adjustments.
- **ChordPro & Lead Sheet Engine:** Transposable inline chords, interactive chord diagrams, lyric rendering, and smooth auto-scrolling.
- **Score Markup & Digital Annotations:** Full drawing toolbar overlay featuring freehand pen, highlighter, text notes, musical stamps (fermata, accent, staccato, dynamics), geometric shapes, and persistent markup storage.
- **Interactive Audio Player & A/B Looper:** Synchronized playback, speed control (0.25x - 2.0x), volume adjustment, and A/B marker looping for focused section practice.
- **Local Score Library:** Save, organize, search, tags, and backup score collections directly in your browser.

### ⏱️ Precision Practice & Groove Engine
- **Precision Metronome:** High-accuracy timing engine built with the Web Audio API, featuring customizable time signatures, subdivisions, accent patterns, tap tempo, sound presets (Woodblock, Beep, Cowbell, Click, Drum), and visual pulse meters.
- **Chromatic Tuner:** Real-time microphone input pitch detector with frequency analysis (Hz), cents deviation gauge (-50 to +50 cents), tuning needle visualization, and configurable reference pitches (A4 = 432Hz - 444Hz).
- **Tone Drone Generator:** Continuous polyphonic reference tones for intonation training with customizable oscillator voices (Sine, Saw, Organ, Pad, Brass), harmonic layers (5ths, Octaves), and micro-tuning offsets.
- **Chord Explorer:** Interactive visual fretboard diagrams (Guitar, Ukulele) and piano keyboard view with audio chord auditioning.
- **Groove & Backing Engine:** Procedural Web Audio accompaniment synthesizer that generates drum patterns, basslines, and chord rhythms across multiple genres (Jazz, Bossa Nova, Pop, Rock, Funk, Reggae, Ballad). Includes customizable chord progressions, swing feel, chord suggestions, and preset song libraries.

---

## 🛠️ Tech Stack

- **Frontend Framework:** React 18 + TypeScript + Vite
- **Styling & UI:** Tailwind CSS + Framer Motion + Lucide React Icons
- **Audio Engine:** Native Web Audio API + Tone.js + @tonejs/midi + Custom Audio Synthesisers
- **Score Rendering Engines:**
  - `@coderline/alphatab` — Guitar Pro tablature & SoundFont audio engine
  - `abcjs` & `abc2svg` — ABC Notation rendering, MIDI synthesis, and live editing
  - `opensheetmusicdisplay` (OSMD) — MusicXML score rendering
  - `pdfjs-dist` — PDF document parsing and canvas rendering
  - Custom ChordPro parser — Lead sheet chord transpose and diagram rendering
- **Score Markup:** SVG & Canvas Annotation Layer with local state persistence

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation & Run

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`.

---

## 📚 Documentation

Detailed architectural and developer guides are available in the [`/docs`](./docs/README.md) folder:

- **[Architecture & State Management](./docs/architecture.md)** — Context hierarchy, Web Audio scheduling, and storage persistence.
- **[Score Viewer Subsystem](./docs/score-viewer.md)** — Multi-format renderers, ABC directives, ChordPro engine, and Digital Markup annotations.
- **[Practice Tools Subsystem](./docs/practice-tools.md)** — Details on Metronome, Tuner, Drone, Chord Explorer, and Groove/Accompaniment Engine.
- **[Development & Component Reference](./docs/development.md)** — Project layout, build scripts, and Web Audio safety practices.

---

## 📄 License

This project is licensed under the MIT License.

