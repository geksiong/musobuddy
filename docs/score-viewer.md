# Score Viewer & Notation Subsystem

The **Score Viewer** module is one of MusoBuddy's central features. It renders sheet music across multiple formats, performs key transposition on the fly, generates instrument tablature overlays, provides digital drawing annotations, and enables synchronized audio playback with A/B looping.

---

## 1. Supported Notation & Document Formats

| Format | Renderer Component | Underlying Engine | Key Features |
| :--- | :--- | :--- | :--- |
| **ABC Notation** | `AbcRenderer.tsx` / `Abc2svgRenderer.tsx` | `abcjs` & `abc2svg` | Dynamic notation, inline code editing, automatic TAB generation, transposition, audio synthesis |
| **Guitar Pro / Tablature** | `GuitarProRenderer.tsx` | `@coderline/alphatab` | `.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx`, `.ptb`, SoundFont playback (`sonivox.sf2`), track solo/mute, speed scaling |
| **ChordPro / Lead Sheets** | `ChordSheetRenderer.tsx` | Custom Chord Engine (`chordSheetUtils.ts`) | `.pro`, `.chordpro`, `.cho`, `.crd`, inline chords, key transposition, interactive chord diagrams, auto-scroll |
| **MusicXML** | `MusicXmlRenderer.tsx` | `OpenSheetMusicDisplay` (OSMD) | Standard XML & compressed `.mxl` scores, multi-staff rendering, responsive layout |
| **PDF Documents** | `PdfRenderer.tsx` | `pdfjs-dist` | Crisp canvas vector rendering, page navigation, zoom controls, and interactive drawing annotation layer |

---

## 2. Digital Score Annotations & Markup Toolbar

MusoBuddy includes a full digital score markup subsystem (`AnnotationToolbar.tsx`, `PdfAnnotationLayer.tsx`, `usePdfAnnotations.ts`):

- **Drawing Tools:**
  - **Pen:** Freehand drawing with custom stroke color and thickness options.
  - **Highlighter:** Semi-transparent highlighting for measures or passages.
  - **Text Notes:** Drop text boxes onto any measure or page location.
  - **Musical Stamps:** Quick stamp placement for musical symbols (fermata, accent, staccato, tenuto, breath mark, clefs, dynamics $p$, $f$, $mf$, $ff$).
  - **Geometric Shapes:** Rectangles, circles, lines, and arrows for highlighting score structures.
- **Annotation Management:** Undo/redo stack, erase tool, clear page, and local storage persistence (`musobuddy_pdf_annotations`) per score ID.

---

## 3. ABC Notation Processing & Directives

### Directives Filtering Logic
To ensure clean rendering and prevent header directive conflicts in multi-tune tunebooks, global `%%` directives before the first tune header (`X:`) are filtered while preserving tune-internal formatting directives:

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

## 4. Transposition Engine (`abcTransposer.ts` & `chordSheetUtils.ts`)

MusoBuddy includes semitone transposition for both ABC scores and ChordPro lead sheets:

- **Key Header Transposition (`K:` / `Key:`):** Shifts key signatures using the circle-of-fifths key map.
- **Note Transposition:** Shifts score pitches while correctly maintaining accidentals, sharps/flats, and octaves.
- **Chord Symbol Transposition:** Parses root notes, accidental modifiers, chord qualities (e.g. `Am7`, `D7b5`), and slash bass notes (`"G/B"`), transposing them to match the target key.

---

## 5. Audio Playback, Looping & Synchronization (`ScoreAudioPlayer.tsx`)

Sheet music audio playback and practice tools include:

1. **A/B Region Looping:** Set point A and point B markers to loop difficult passages continuously during practice.
2. **Speed Scaling:** Adjustable tempo playback from 0.25x to 2.0x without changing audio pitch.
3. **Multi-Track Mixing:** Separate volume and solo/mute controls for individual instrument tracks in Guitar Pro files.
4. **Visual Cursor Sync:** Highlights active notes, measures, or chord lyrics in real time during playback.

