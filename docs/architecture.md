# System Architecture & State Management

This document details the architectural layout, state management strategy, and Web Audio API integration of **MusoBuddy**.

---

## 1. High-Level Component Structure

```
App.tsx (Root & Navigation)
 ├── ThemeProvider (Theme Context)
 ├── AudioProvider (Web Audio API & Synthesizers)
 ├── ScoreProvider (Score Library State)
 └── AccompanimentProvider (Backing Tracks State)
      ├── Header (Navigation & Active Tool Selection)
      └── Active View Switcher:
           ├── ScoreView (ABC / MusicXML / PDF Renderer)
           ├── MetronomeView (Precision Click Engine)
           ├── TunerView (Microphone Pitch Detector)
           ├── DroneView (Continuous Tone Generator)
           ├── ChordExplorer (Fretboard & Keyboard Diagrams)
           └── AccompanimentView (Backing Track Player)
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
Manages score collection, library metadata, local storage persistence, and active score selection.

- **Key State Variables:**
  - `scores`: List of `ScoreData` objects stored locally in `localStorage` under `musobuddy_scores`.
  - `activeScore`: Currently viewed score item.
  - `selectedTablature`: Tablature overlay preference (`none`, `guitar`, `ukulele`, `banjo`, `dadgad`, `mandolin`).
- **Core Operations:**
  - Add, update, delete score routines.
  - Import / Export JSON backup of the score library.
  - Pre-populated default scores (e.g. "Cooley's Reel", "The Kesh Jig", "Swallowtail Jig").

### `AccompanimentContext.tsx`
Controls backing track recordings and chord progression player state.

- **Responsibilities:**
  - Manages custom backing tracks with audio URLs, key signatures, tempo, and chord sequences.
  - Controls playback state, volume levels, pitch shifting, and tempo scaling.

### `ThemeContext.tsx`
Handles application visual themes (`light`, `dark`, `system`) with automatic DOM root class toggling (`dark` class on `<html>`).

---

## 3. Audio Engine & Web Audio Scheduling

MusoBuddy uses a dual approach to web audio:

1. **Native Web Audio API (`AudioContext`):** Used for precise, low-latency audio generation like the metronome click and real-time drone oscillators. Using native `AudioContext.currentTime` scheduling guarantees accurate timing without main-thread UI jank.
2. **Tone.js (`Tone` & `@tonejs/midi`):** Used for full-featured audio processing including time-stretching, pitch-shifting (`Tone.GrainPlayer`, `Tone.PitchShift`), and MIDI synthesis (`Tone.PolySynth`).

---

## 4. Local Storage Persistence

All user data is stored on the client side using standard browser storage:

| Storage Key | Content Description |
| :--- | :--- |
| `musobuddy_scores` | JSON array of user scores and imported files |
| `musobuddy_accompaniments` | Saved accompaniment tracks & chord charts |
| `musobuddy_theme` | Saved theme preference (`light` / `dark`) |
| `musobuddy_metronome_presets` | Custom user metronome presets |
