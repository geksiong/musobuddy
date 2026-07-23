# MusoBuddy 🎵

**MusoBuddy** is an interactive, web-based music practice suite and score management applet designed for musicians, teachers, students, and performers. It brings together high-precision audio tools, multi-format sheet music viewing, dynamic ABC transposition, interactive tablature overlays, and backing track synchronization into a single responsive web interface.

---

## 🌟 Key Features

### 🎼 Interactive Score Viewer & Library
- **Multi-Format Support:** Render and view scores in **ABC Notation**, **MusicXML**, and **PDF** formats.
- **Dynamic Key Transposition:** Instant semitone key shifting (-17 to +17 semitones) with automatic chord and note symbol transposition.
- **Instrument Tablature Overlays:** Generate tablature on the fly for Guitar, DADGAD, Ukulele, Banjo, and Mandolin.
- **ABC Tunebook Support:** Multi-tune selection, header directive filtering, and inline score editing.
- **MIDI & Audio Sync:** Synchronized score playback with real-time visual note highlighting.
- **Local Storage Library:** Save, organize, load, and back up custom score collections directly in your browser.

### ⏱️ Precision Practice Tools
- **Precision Metronome:** High-accuracy timing engine built with the Web Audio API, featuring customizable time signatures, subdivisions, accent patterns, tap tempo, and sound presets (Woodblock, Beep, Cowbell, Click, Drum).
- **Chromatic Tuner:** Real-time microphone input pitch detector with frequency analysis (Hz), cents deviation gauge, and configurable reference pitches (A4 = 432Hz - 444Hz).
- **Drone Generator:** Continuous pitch reference for intonation training with customizable oscillator voices (Sine, Saw, Organ, Pad, Brass), harmonic layers (5ths, Octaves), and micro-tuning offsets.
- **Chord Explorer:** Interactive visual fretboard diagrams (Guitar, Ukulele) and piano keyboard view with audio chord auditioning.
- **Accompaniment Player:** Practice along with synchronized backing tracks, chord charts, and pitch/tempo controls.

---

## 🛠️ Tech Stack

- **Frontend Framework:** React 18 + TypeScript + Vite
- **Styling & UI:** Tailwind CSS + Framer Motion + Lucide React Icons
- **Audio Engine:** Native Web Audio API + Tone.js + @tonejs/midi
- **Notation Processing:** `abcjs`, `opensheetmusicdisplay` (MusicXML), `pdfjs-dist` (PDF)

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
- **[Score Viewer Subsystem](./docs/score-viewer.md)** — Notation renderers, ABC directive handling, and transposition engine.
- **[Practice Tools Subsystem](./docs/practice-tools.md)** — Details on Metronome, Tuner, Drone, Chord Explorer, and Accompaniment.
- **[Development & Component Reference](./docs/development.md)** — Project structure, build commands, and Web Audio safety practices.

---

## 📄 License

This project is licensed under the MIT License.
