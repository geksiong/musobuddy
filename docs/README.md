# MusoBuddy Documentation

Welcome to the documentation for **MusoBuddy**, a comprehensive, interactive web-based music practice suite and sheet music reader. MusoBuddy provides musician-focused tools including multi-format score viewing and rendering, key transposition, digital score annotations, audio accompaniment playback & groove generation, a high-precision metronome, chromatic tuner, reference tone drone generator, and chord exploration.

---

## Table of Contents

1. [Architecture & Overview](./architecture.md) — System design, state management, audio engine, context hierarchy, and modal layout.
2. [Score Viewer Subsystem](./score-viewer.md) — ABC notation, Guitar Pro (AlphaTab), MusicXML, PDF viewing, ChordPro lead sheets, transposition, A/B looper, and Digital Score Annotations.
3. [Practice Tools Subsystem](./practice-tools.md) — Detailed guide to Metronome, Tuner, Drone Generator, Chord Explorer, Groove & Accompaniment Engine, Practice Tools Panel, and About Modal.
4. [Development & Component Reference](./development.md) — Setup instructions, tech stack, complete directory structure, and coding standards.

---

## Tech Stack Overview

- **Core Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Framer Motion (UI transitions & animations)
- **Icons:** Lucide React
- **Audio Processing:** Native Web Audio API (`AudioContext`) + Tone.js + @tonejs/midi + SoundFont Synthesizer (`sonivox.sf2`)
- **Score Rendering Subsystem:**
  - `@coderline/alphatab` — Guitar Pro tablature & SoundFont audio playback engine
  - `abcjs` & `abc2svg` — ABC Notation rendering, live editing, TAB generation, and MIDI synthesis
  - `opensheetmusicdisplay` — MusicXML score rendering
  - `pdfjs-dist` — Vector PDF sheet music rendering
  - Custom ChordPro Parser — Lead sheet lyrics, inline chords, transposition, and chord diagrams
- **Digital Annotations:** Canvas/SVG drawing layer for freehand pen, highlighter, text notes, musical stamps, and shapes
- **State & Storage:** React Context API + Browser LocalStorage persistence

---

## Quick Navigation

| Document | Focus Area | Key Components |
| :--- | :--- | :--- |
| [Architecture](./architecture.md) | State & Audio Pipeline | `AudioContext.tsx`, `ScoreContext.tsx`, `AccompanimentContext.tsx`, `ThemeContext.tsx`, `AboutModal.tsx` |
| [Score Viewer](./score-viewer.md) | Notation & Annotations | `ScoreView.tsx`, `AbcRenderer.tsx`, `GuitarProRenderer.tsx`, `MusicXmlRenderer.tsx`, `PdfRenderer.tsx`, `ChordSheetRenderer.tsx`, `AnnotationToolbar.tsx` |
| [Practice Tools](./practice-tools.md) | Practice Modules & Groove | `MetronomeView.tsx`, `TunerView.tsx`, `DroneView.tsx`, `ChordExplorer.tsx`, `AccompanimentView.tsx`, `GrooveEnginePanel.tsx`, `PracticeToolsPanel.tsx` |
| [Development](./development.md) | Setup & Maintenance | `package.json`, project directory tree, build commands |

