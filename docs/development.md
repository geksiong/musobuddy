# Development & Component Reference

This document provides developer guidelines for maintaining, extending, and building **MusoBuddy**.

---

## 1. Project Directory Structure

```
/
├── docs/                      # Documentation suite
│   ├── README.md              # Documentation entry point
│   ├── architecture.md        # State management, Web Audio, & persistence
│   ├── score-viewer.md        # Score renderers, ABC parser, ChordPro, & Annotations
│   ├── practice-tools.md      # Metronome, Tuner, Drone, Chords, Groove, & About Modal
│   └── development.md         # Developer guide (this file)
├── public/
│   ├── alphatab/              # AlphaTab engine & SoundFont soundbanks (`sonivox.sf2`)
│   └── pdfjs/                 # PDF.js CMaps & WASM decoders
├── src/
│   ├── components/            # UI Components grouped by domain
│   │   ├── AboutModal.tsx     # App description, feature list, & score formats modal
│   │   ├── Accompaniment/     # Backing tracks, Groove Engine, & chord progression explorer
│   │   │   ├── AccompanimentView.tsx
│   │   │   ├── ChordProgressionsModal.tsx
│   │   │   ├── GrooveEnginePanel.tsx
│   │   │   ├── SongLibraryPanel.tsx
│   │   │   ├── chordProgressionsData.ts
│   │   │   ├── grooveEngine.ts
│   │   │   ├── progressionPresets.ts
│   │   │   └── songLibrary.ts
│   │   ├── ChordExplorer/     # Fretboard & keyboard chord diagrams
│   │   │   └── ChordExplorer.tsx
│   │   ├── Drone/             # Reference tone generator view
│   │   │   └── DroneView.tsx
│   │   ├── Metronome/         # Precision metronome interface
│   │   │   └── MetronomeView.tsx
│   │   ├── Navigation/        # Quick practice tools side drawer
│   │   │   └── PracticeToolsPanel.tsx
│   │   ├── Score/             # Notation renderers, annotations, & audio player
│   │   │   ├── Abc2svgRenderer.tsx
│   │   │   ├── AbcRenderer.tsx
│   │   │   ├── AnnotationSidebar.tsx
│   │   │   ├── AnnotationToolbar.tsx
│   │   │   ├── ChordSheetRenderer.tsx
│   │   │   ├── GuitarProRenderer.tsx
│   │   │   ├── MusicXmlRenderer.tsx
│   │   │   ├── PdfAnnotationLayer.tsx
│   │   │   ├── PdfRenderer.tsx
│   │   │   ├── ScoreAudioPlayer.tsx
│   │   │   ├── ScoreErrorBoundary.tsx
│   │   │   ├── ScoreView.tsx
│   │   │   ├── annotationTypes.ts
│   │   │   └── usePdfAnnotations.ts
│   │   └── Tuner/             # Pitch detection view & needle gauge
│   │       └── TunerView.tsx
│   ├── contexts/              # React Context Providers
│   │   ├── AccompanimentContext.tsx
│   │   ├── AudioContext.tsx   # Master Web Audio API engine
│   │   ├── ScoreContext.tsx   # Score library state & local persistence
│   │   └── ThemeContext.tsx   # Light / Dark theme switcher
│   ├── hooks/                 # Reusable audio & tool hooks
│   │   ├── useDrone.ts
│   │   ├── useMetronome.ts
│   │   └── useTuner.ts
│   ├── lib/                   # Utility functions & parsers
│   │   ├── abcDetector.ts
│   │   ├── abcLanguage.ts
│   │   ├── abcTransposer.ts   # ABC pitch transposition logic
│   │   ├── chordEngine.ts     # Audio chord voicing synthesizer
│   │   ├── chordSheetUtils.ts # ChordPro parsing & transposition
│   │   ├── chordSuggestions.ts# Harmonic suggestion engine
│   │   ├── mxlUtils.ts        # Compressed MusicXML reader
│   │   └── utils.ts           # Classnames utility (cn)
│   ├── App.tsx                # App root, header, footer bar, & view switcher
│   ├── constants.ts          # Default score samples & preset data
│   ├── index.css              # Global styles & Tailwind imports
│   ├── main.tsx               # App entry point
│   └── types.ts               # Shared TypeScript interfaces & enums
├── metadata.json              # Applet metadata configuration
├── package.json               # Dependencies & scripts
└── vite.config.ts             # Vite build configuration
```

---

## 2. Scripts & Build Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Vite development server on port 3000 |
| `npm run build` | Builds production bundle into `dist/` |
| `npm run lint` | Runs TypeScript compiler check (`tsc --noEmit`) |
| `npm run preview` | Previews the production build locally |

---

## 3. Web Audio Safety Best Practices

When modifying audio nodes in `AudioContext.tsx` or audio components:

1. **Exponential Ramps Must Be Greater Than Zero:**
   `gain.exponentialRampToValueAtTime(target, time)` throws an error if `target <= 0` or if the initial value is `0`. Always start ramps at `0.0001` or greater:
   ```typescript
   gain.gain.setValueAtTime(0.0001, now);
   gain.gain.linearRampToValueAtTime(0.2, now + 0.005);
   gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
   ```

2. **User Interaction for Audio Resume:**
   Browsers block Web Audio auto-play. Call `Tone.start()` or `audioContext.resume()` inside a user click/touch event handler.

3. **Cleanup Audio Resources:**
   Always disconnect custom nodes and stop scheduled oscillators in `useEffect` cleanup callbacks to prevent memory leaks and background noise.

---

## 4. UI & Styling Guidelines

- **Theme Consistency:** Use Tailwind's `dark:` modifier classes paired with `resolvedTheme === 'dark'` conditional checks.
- **Icon Set:** Always import icons from `lucide-react`.
- **Animations:** Use `framer-motion` (`AnimatePresence`, `motion.div`) for smooth view transitions, collapsible sidebars, modals, and active state indicators.

