# MusoBuddy Documentation

Welcome to the documentation for **MusoBuddy**, a comprehensive, interactive web-based music practice suite. MusoBuddy provides musician-focused tools including score viewing, transposition, audio accompaniment playback, high-precision metronome, chromatic tuner, reference tone drone generator, and chord exploration.

---

## Table of Contents

1. [Architecture & Overview](./architecture.md) — System design, state management, audio engine, and context hierarchy.
2. [Score Viewer Subsystem](./score-viewer.md) — Score parsing, ABC notation, MusicXML, PDF viewing, transposition, and MIDI sync.
3. [Practice Tools Subsystem](./practice-tools.md) — Detailed guide to Metronome, Tuner, Drone Generator, Chord Explorer, and Accompaniment.
4. [Development & Component Reference](./development.md) — Setup instructions, tech stack, directory structure, and coding standards.

---

## Tech Stack Overview

- **Core Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Framer Motion (UI transitions & animations)
- **Icons:** Lucide React
- **Audio Processing:** Web Audio API (Native `AudioContext`) + Tone.js + @tonejs/midi
- **Score Rendering:**
  - `abcjs` — ABC Notation rendering, MIDI generation, and timing synchronization
  - `opensheetmusicdisplay` — MusicXML score rendering
  - `pdfjs-dist` — PDF sheet music rendering
- **State & Storage:** React Context API + LocalStorage persistence

---

## Quick Navigation

| Document | Focus Area | Key Components |
| :--- | :--- | :--- |
| [Architecture](./architecture.md) | State & Audio Pipeline | `AudioContext.tsx`, `ScoreContext.tsx`, `AccompanimentContext.tsx`, `ThemeContext.tsx` |
| [Score Viewer](./score-viewer.md) | Notation & File Parsing | `ScoreView.tsx`, `AbcRenderer.tsx`, `MusicXmlRenderer.tsx`, `PdfRenderer.tsx` |
| [Practice Tools](./practice-tools.md) | Practice Modules | `MetronomeView.tsx`, `TunerView.tsx`, `DroneView.tsx`, `ChordExplorer.tsx`, `AccompanimentView.tsx` |
| [Development](./development.md) | Setup & Maintenance | `package.json`, project layout, build commands |
