# Score Viewer & Notation Subsystem

The **Score Viewer** module is one of MusoBuddy's central features. It renders sheet music across multiple formats, performs key transposition on the fly, generates instrument tablature overlays, and provides synchronized audio playback.

---

## 1. Supported Notation Formats

| Format | Renderer Component | Underlying Library | Key Features |
| :--- | :--- | :--- | :--- |
| **ABC Notation** | `AbcRenderer.tsx` | `abcjs` | Dynamic notation, inline editing, TAB generation, transpose, MIDI playback sync |
| **MusicXML** | `MusicXmlRenderer.tsx` | `OpenSheetMusicDisplay` (OSMD) | Standard XML music scores, multi-staff rendering, auto-layout |
| **PDF Documents** | `PdfRenderer.tsx` | `pdfjs-dist` | Page-by-page rendering, zoom controls, responsive canvas rendering |

---

## 2. ABC Notation Processing & Directives

### Directives Filtering Logic
To ensure clean rendering and prevent header directive conflicts in multi-tune tunebooks, `AbcRenderer.tsx` and `ScoreView.tsx` strip out top-level global `%%` directives **specifically before the first tune header (`X:`)** while preserving any tune-internal formatting or style directives:

```typescript
// Filter out any lines starting with %% before the first tune (X:)
let targetAbc = abc;
const firstXMatch = targetAbc.match(/^X:/m);
if (firstXMatch && firstXMatch.index !== undefined) {
  const header = targetAbc.substring(0, firstXMatch.index);
  const rest = targetAbc.substring(firstXMatch.index);
  targetAbc = header.replace(/^%%[^\n]*\n?/gm, '') + rest;
} else {
  targetAbc = targetAbc.replace(/^%%[^\n]*\n?/gm, '');
}
```

### Automatic Tablature Generation
MusoBuddy dynamically injects `%%tablature` directives into ABC scores based on the selected target instrument:

- **Supported Instruments:** Guitar, Ukulele, Banjo, DADGAD Guitar, Mandolin.
- **Directive Injection:** Inserts `%%tablature <instrument> tuning=<notes>` directly into the ABC string after key declarations (`K:`).

---

## 3. Transposition Engine (`abcTransposer.ts`)

MusoBuddy includes a custom ABC notation transposition utility (`transposeAbc`) capable of shifting pitches by any semitone delta:

- **Key Header Transposition (`K:`):** Calculates new tonic key using circle-of-fifths key maps.
- **Note Transposition:** Shifts pitches while handling sharps, flats, naturals, accidentals, and octave marks (`'` and `,`).
- **Chord Symbol Transposition (`"G"`, `"Am7"`, `"D7/F#"`):** Parses chord roots and bass slash notes and transposes them to match the new score key.

---

## 4. MIDI Playback & Visual Synchronization

Visual note highlighting during audio playback is managed via `abcjs` timing callbacks:

1. **MIDI Generation:** `abcjs.renderAbc` generates synthetic MIDI sequence events from ABC score source code.
2. **Timing Callbacks:** An instance of `TimingCallbacks` maps playback time offsets to SVG note elements in the rendered DOM.
3. **Active Note Highlighting:** Adds the `.abcjs-highlight` CSS class to the active notes on beat updates.
