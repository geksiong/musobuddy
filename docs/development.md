# Development & Component Reference

This document provides developer guidelines for maintaining, extending, and building **MusoBuddy**.

---

## 1. Project Directory Structure

```
/
├── docs/                      # Documentation suite
│   ├── README.md              # Documentation entry point
│   ├── architecture.md        # State management & Web Audio
│   ├── score-viewer.md        # Notation renderers & ABC parser
│   ├── practice-tools.md      # Metronome, Tuner, Drone, Chords
│   └── development.md         # Developer guide (this file)
├── src/
│   ├── components/            # UI Components grouped by domain
│   │   ├── Accompaniment/     # Backing track player components
│   │   ├── ChordExplorer/     # Fretboard & keyboard chord diagrams
│   │   ├── Drone/             # Reference tone generator view
│   │   ├── Metronome/         # Precision metronome interface
│   │   ├── Score/             # Notation renderers (ABC, MusicXML, PDF, Player)
│   │   └── Tuner/             # Pitch detection view & needle display
│   ├── contexts/              # React Context Providers
│   │   ├── AccompanimentContext.tsx
│   │   ├── AudioContext.tsx   # Master Web Audio API engine
│   │   ├── ScoreContext.tsx   # Score library state & storage
│   │   └── ThemeContext.tsx   # Light / Dark theme management
│   ├── hooks/                 # Reusable audio & tool hooks
│   │   ├── useDrone.ts
│   │   ├── useMetronome.ts
│   │   └── useTuner.ts
│   ├── lib/                   # Utility functions & parsers
│   │   ├── abcLanguage.ts
│   │   ├── abcTransposer.ts   # ABC pitch transposition logic
│   │   └── utils.ts           # Classnames utility (cn)
│   ├── App.tsx                # App root & main navigation tab switcher
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
- **Animations:** Use `framer-motion` (`AnimatePresence`, `motion.div`) for smooth view transitions, collapsible sidebars, and active state indicators.
