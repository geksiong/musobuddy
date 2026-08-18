# System Architecture & State Management

This document details the architectural layout, state management strategy, Web Audio API integration, and persistence model of **MusoBuddy**.

---

## 1. High-Level Component Structure

```
App.tsx (Root & Navigation Header)
 ├── ThemeProvider (Theme Context - Light/Dark Theme)
 ├── AudioProvider (Native Web Audio API & Master Synthesizers)
 ├── ScoreProvider (Score Library, Formats, & Active Score State)
 └── AccompanimentProvider (Backing Tracks & Groove Engine State)
      ├── Header (View Switcher, Score Controls, Practice Tools Drawer Trigger)
      ├── Footer Bar (Quick Status & "About" Modal Button)
      ├── AboutModal (Modal with Core Features, App Info, & Formats)
      └── Active View Switcher:
           ├── ScoreView (Multi-Format Notation & Document Reader)
           │    ├── AbcRenderer / Abc2svgRenderer (ABC Notation + Live Editor)
           │    ├── GuitarProRenderer (AlphaTab + SoundFont Audio)
           │    ├── MusicXmlRenderer (OpenSheetMusicDisplay)
           │    ├── PdfRenderer (PDF.js + Canvas Render)
           │    ├── ChordSheetRenderer (ChordPro Lead Sheets)
           │    ├── AnnotationToolbar & PdfAnnotationLayer (Markup Overlay)
           │    └── ScoreAudioPlayer (A/B Looper & Playback Controls)
           ├── MetronomeView (Precision Click & Rhythm Engine)
           ├── TunerView (Microphone Autocorrelation Pitch Detector)
           ├── DroneView (Continuous Polyphonic Tone Generator)
           ├── ChordExplorer (Fretboard & Keyboard Diagrams)
           ├── AccompanimentView & GrooveEnginePanel (Groove Synthesizer)
           └── PracticeToolsPanel (Side Drawer for Quick Tool Access)
```

---

## 2. Global React Contexts

### `AudioContext.tsx`
The primary low-level audio engine for MusoBuddy built on top of the browser's native **Web Audio API**.

- **Responsibilities:**
  - Manages the singleton `AudioContext` instance and resume lifecycle (`resumeAudioContext`).
  - Synthesizes metronome ticks (Woodblock, Beep, Cowbell, Click, Drum) with precise gain ramps and exponential decay envelopes.
  - Implements pitch generation for chromatic tones and drone synthesis (Piano, Guitar, Organ, Pad, Brass voice types).
  - Handles volume scaling and safety clamps (`setValueAtTime`, `exponentialRampToValueAtTime`) to avoid audio clipping or click artifacts.

### `ScoreContext.tsx`
Manages score collection, library metadata, local storage persistence, active score selection, and annotation synchronization.

- **Key State Variables:**
  - `scores`: List of `ScoreData` objects stored locally in `localStorage` under `musobuddy_scores`.
  - `activeScore`: Currently viewed score item.
  - `selectedTablature`: Tablature overlay preference (`none`, `guitar`, `ukulele`, `banjo`, `dadgad`, `mandolin`).
  - `annotations`: Persisted markup strokes, text notes, shapes, and musical stamps per score.
- **Core Operations:**
  - Add, update, delete score routines.
  - Multi-file drag-and-drop importer supporting `.abc`, `.gp*`, `.pro`, `.xml`, `.mxl`, `.pdf`, `.png`, `.jpg`, `.mp3`.
  - Import / Export JSON backup of the score library.
  - Pre-populated sample scores (e.g. "Cooley's Reel", "Canon in D", "Hotel California TAB", "Amazing Grace Chord Sheet").

### `AccompanimentContext.tsx`
Controls backing track recordings and chord progression player state.

- **Responsibilities:**
  - Manages custom backing tracks with audio URLs, key signatures, tempo, and chord sequences.
  - Controls playback state, volume levels, pitch shifting, tempo scaling, and real-time groove style synthesis.

### `ThemeContext.tsx`
Handles application visual themes (`light`, `dark`, `system`) with automatic DOM root class toggling (`dark` class on `<html>`).

---

## 3. Audio Engine & Web Audio Scheduling

MusoBuddy uses a multi-tiered approach to web audio:

1. **Native Web Audio API (`AudioContext`):** Used for precise, low-latency audio generation like the metronome click, real-time drone oscillators, and groove drum/bass synthesis. Using native `AudioContext.currentTime` scheduling guarantees rock-solid timing independent of UI rendering.
2. **AlphaTab & SoundFont (`sonivox.sf2`):** Used by `GuitarProRenderer` for multi-track MIDI playback of Guitar Pro files with soundfont instrument samples.
3. **Tone.js (`Tone` & `@tonejs/midi`):** Used for audio processing including time-stretching, pitch-shifting (`Tone.GrainPlayer`, `Tone.PitchShift`), and MIDI synthesis.

---

## 4. Local Storage Persistence

All user data is stored client-side in browser storage:

| Storage Key | Content Description |
| :--- | :--- |
| `musobuddy_scores` | JSON array of user scores and imported files |
| `musobuddy_pdf_annotations` | Saved digital drawing annotations & stamps keyed by score ID |
| `musobuddy_accompaniments` | Saved accompaniment tracks & custom chord charts |
| `musobuddy_theme` | Saved theme preference (`light` / `dark`) |
| `musobuddy_metronome_presets` | Custom user metronome presets |

