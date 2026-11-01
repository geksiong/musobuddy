# Accompaniment UX Simplification & Lead-Sheet Redesign

A complete decluttering and structural reorganization of the Accompaniment screen, transforming it from a heavily boxed, multi-card interface with duplicate controls into an elegant, distraction-free music lead-sheet layout with a floating bottom playback dock and a collapsible reference drawer.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following design and architectural choices have been confirmed and will guide the implementation:
>
> - **Confirmed Transport Layout**: Primary playback controls, tempo, meter, and audio settings are consolidated into a sleek, floating bottom playback dock that stays accessible during practice while freeing up the main viewport.
> - **Confirmed Reference & Library UX**: The Chord Library, Song Explorer, and Preset tools are organized into a clean, collapsible right-side slide-over drawer with segmented tabs, giving 100% full width to the music chart when closed.
> - **Confirmed Chart Aesthetics**: The chord progression chart replaces heavy nested rounded boxes with a clean musical lead-sheet visual style featuring subtle hairline dividers, rhythmic measure bar-lines, clear typography, and active beat highlights.
> - **De-duplication Policy**: All redundant copies of controls (transposition buttons, import buttons, save buttons, groove triggers, and measure tracking toggles) will be deduplicated into single, authoritative locations.

---

### 1. Overview & Core Concept

- **What It Does**: Provides musicians with a clean, responsive chord progression chart and accompaniment backing band. Users can instantly load songs or presets, transpose keys, adjust tempo and groove styles, edit chords beat-by-beat, and practice without visual noise.
- **Target Audience / Persona**: Practicing musicians, jazz students, guitarists, pianists, and songwriters who need an immediate, legible chord chart with rhythmic backing and minimal distractions.
- **Key Value**: Replaces multiple stacked nested cards and duplicated toolbar buttons with an authentic lead-sheet experience, maximizing score readability while keeping all essential playback controls within immediate reach.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Instant Practice (Zero-State to Play)**: The musician opens Accompaniment and immediately sees a clean, legible lead-sheet chart with the current song or chord progression. Tapping **Play** in the floating bottom dock triggers the count-in and starts the rhythm backing.
2. **Key & Tempo Adjustments**: In the floating dock, the musician can transpose semitones, toggle enharmonic spellings (♯/♭), change tempo (BPM), or swap groove styles in a single unified strip.
3. **Song / Progression Selection**: Clicking the active song title in the top header or dock opens the fast search modal or the side drawer to pick from standards, anime/J-pop progressions, or custom presets.
4. **Beat & Chord Editing**: Clicking any measure or beat activates selection mode without page clutter. Opening the collapsible right drawer provides the Chord Palette and harmonic suggestions.
5. **Full-Width Immersion**: Toggling the tools drawer closed expands the lead-sheet chart across the full screen width, perfect for live practice or sheet-reading.

#### Visual Identity & Theme
- **Aesthetic Direction**: Minimalist, publication-grade music lead-sheet inspired by classic real-books and modern digital workstations. No heavy drop-shadows, no nested bordered cards inside bordered containers.
- **Color Palette & Contrast**:
  - *Dominant Canvas*: Clean neutral slate (`bg-slate-50` light / `bg-slate-950` dark).
  - *Lead-Sheet Surface*: Crisp paper-white (`bg-white` light / `bg-slate-900/80` dark) with refined hairline dividers (`border-slate-200/80` light / `border-white/10` dark).
  - *Accents*: Emerald (`text-emerald-500`, `bg-emerald-600`) reserved exclusively for active playback highlights, current beat indicator, and primary play action.
  - *Section Badges*: Subtle typographic markers and quiet indigo accents for rehearsal marks (Intro, Verse, Chorus).
- **Typography & Lead-Sheet Hierarchy**:
  - *Chord Symbols*: Bold monospace tabular figures (`font-mono font-black text-lg md:text-xl tracking-tight`) for instant readability at a glance.
  - *Measure Numbers & Bar-lines*: Quiet subscript markers (`text-[10px] text-slate-400 font-mono`) and vertical bar-lines imitating musical notation.
  - *Dock & Navigation*: Clean single-line sans typography with zero multi-line button wrapping.

---

### 3. Key Product Decisions & Trade-Offs

- **Consolidating Duplicate Controls**:
  - *What was removed/consolidated*: Previously, transposition controls (-1, +1, semitone badge, enharmonics) existed in three separate places: the top launchpad, the editor toolbar, and the sidebar. The "Import ABC" and "Save Preset" buttons existed in both the top stage bar and the editor toolbar. "Groove Sequencer" existed in three places. "Track Measures" was rendered in both the stage header and inside the compact HUD.
  - *Chosen Approach*: Single authoritative locations: Transposition, Key, Tempo, and Playback live in the floating bottom dock; Rehearsal/Section editing and Mode toggles live in the chart header; Chord tools and song libraries live in the collapsible drawer.
- **Lead-Sheet Layout vs. Boxed Measure Cards**:
  - *Chosen Approach*: Replace the nested 4-level card hierarchy with an authentic lead-sheet grid where measures are separated by vertical bar-lines and clean horizontal rules.
  - *Why*: Eliminates the "boxy" appearance and saves over 35% vertical screen space, allowing 4 to 8 measures per system to be visible simultaneously without scrolling.
- **Floating Bottom Playback Dock**:
  - *Chosen Approach*: A slim, rounded dock pinned to the bottom of the viewport with Play/Stop, BPM slider/stepper, Key/Transpose picker, and quick access to 4-Track mixer and Voicing style.
  - *Why*: Keeps the most frequently clicked practice controls anchored under the user's thumbs or mouse while giving the entire screen area to the musical score.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌────────────────────────────────────────────────────────────────────────┐
│ Accompaniment View Container                                           │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Chart Header: Song Title · Key Badge · View Mode · Drawer Toggle │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌───────────────────────────────────────────────┬──────────────────┐  │
│  │ Main Lead-Sheet Chart Canvas                  │ Collapsible      │  │
│  │                                               │ Drawer (Right)   │  │
│  │  [A] Verse 1                                  │                  │  │
│  │  | Cmaj7  | Am7    | Dm7    | G7alt  |        │ ┌──────────────┐ │  │
│  │  | Em7    | A7b9   | Dm7    | G7     |        │ │ Chords Tab   │ │  │
│  │                                               │ │ Song Lib Tab │ │  │
│  │  [B] Chorus                                   │ │ Explorer Tab │ │  │
│  │  | Fmaj7  | Fm7    | Em7    | A7     |        │ └──────────────┘ │  │
│  │  | Dm7    | G7     | Cmaj7  | Cmaj7  |        │                  │  │
│  │                                               │                  │  │
│  └───────────────────────────────────────────────┴──────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Floating Bottom Playback Dock                                    │  │
│  │ [ ▶ Play ] [ 120 BPM ± ] [ Key: C ±1 ] [ Groove: Bossa ] [ Mixer ]│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

#### State & Component Restructuring
- **`AccompanimentView.tsx`**:
  - Houses the top title banner, lead-sheet container, and bottom floating dock.
  - Manages drawer open/closed state and active modal triggers.
  - Replaces nested card boxes with a unified lead-sheet layout.
- **`CompactPlaybackChart.tsx`**:
  - Refactored to render clean musical bar lines (`|`), rehearsal mark badges (`[A]`, `[Chorus]`), and rhythmic beat ticks rather than heavy rounded card boxes.
  - Removes redundant internal HUD and duplicate Track Measures buttons, deferring transport display to the unified dock.
- **Floating Dock Component**:
  - Pinned at bottom (`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-5xl w-[calc(100%-2rem)]`).
  - Contains primary Play/Stop with pulse indicator, count-in toggle, metronome click toggle, key & transpose controls, tempo stepper, and drawers for 4-track groove mixer and voicings.
- **Collapsible Drawer Component**:
  - Slides in smoothly from the right without shifting the chart unexpectedly.
  - Houses the Chord Type Matrix, Root Key selector, harmonic suggestions, Song Library, and Chord Explorer.

---

### 5. Transposition & Footer Dock Fixes (Completed)
- **Standard Practice Tools Footer Dock**: Restored the multi-tool dock strip (Metronome, Drone, Accompaniment mini widget, A440 reference pitch, and Score Audio player) across ALL application views including Accompaniment view, preserving a unified practice layout.
- **Transposition Arithmetic**: Fixed the calculation in `transposeNoteInKey` and `transposeChord` to compute direct modulo-12 chromatic pitch classes without key-offset diatonic drift or negative modulo index issues. Transposing C up twice yields D; down twice yields C cleanly without double-sharps (`Cx`) or jumping to A.
- **In-Header Transposition Controls**: Added direct Key picker (`C`, `Db`, `D`, `Eb`...), semitone transposer buttons (`-1`, `+1`), enharmonic toggle (`♯/♭`), and 1-click transpose reset to the lead sheet header.
