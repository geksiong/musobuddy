/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CHORD_ROOTS_SHARP, CHORD_ROOTS_FLAT, ROOT_OFFSETS_MAP, transposeChord } from '../components/Accompaniment/constants.ts';

export interface ChordSuggestion {
  chord: string;
  label: string;
  reason: string;
  type?: 'extension' | 'substitute' | 'cadence' | 'passing' | 'modal';
}

/**
 * Standardizes root note to index 0-11
 */
function getRootIndex(root: string): number {
  return ROOT_OFFSETS_MAP[root] ?? 0;
}

/**
 * Get root note from chromatic index 0-11
 */
function getRootFromIndex(index: number, useFlats = false): string {
  const normIndex = (index % 12 + 12) % 12;
  const roots = useFlats ? CHORD_ROOTS_FLAT : CHORD_ROOTS_SHARP;
  return roots[normIndex];
}

/**
 * Parses a chord string into root and suffix
 */
export function parseChordParts(chordName: string): { root: string; suffix: string } | null {
  if (!chordName || !chordName.trim()) return null;
  const match = chordName.trim().match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;
  return { root: match[1], suffix: match[2] };
}

/**
 * Deterministic music theory chord suggestion engine.
 * Generates alternative chords or context-aware suggestions without AI.
 */
export function getSuggestedChords(
  currentChordName: string | null | undefined,
  prevChordName: string | null | undefined = null,
  nextChordName: string | null | undefined = null,
  useFlats = false
): ChordSuggestion[] {
  const suggestions: ChordSuggestion[] = [];
  const addedChords = new Set<string>();

  const add = (chord: string, label: string, reason: string, type?: ChordSuggestion['type']) => {
    if (!chord || addedChords.has(chord)) return;
    // Don't suggest the exact same chord as current unless it's a specific variation
    if (currentChordName && chord === currentChordName) return;
    addedChords.add(chord);
    suggestions.push({ chord, label, reason, type });
  };

  const parsedCurrent = currentChordName ? parseChordParts(currentChordName) : null;

  // CASE 1: An explicit chord is currently on the selected beat
  if (parsedCurrent) {
    const { root, suffix } = parsedCurrent;
    const rootIdx = getRootIndex(root);
    const isFlat = useFlats || root.includes('b');

    // 1. Quality & Color Extensions
    if (suffix === '' || suffix === 'M' || suffix === 'maj') {
      // Major Chord Extensions
      add(`${root}maj7`, 'Major 7th', `Lush jazz/pop color adding the major 7th to ${root}`, 'extension');
      add(`${root}add9`, 'Add 9', `Bright acoustic ring with the 9th added to ${root}`, 'extension');
      add(`${root}7`, 'Dominant 7th', `Converts ${root} to a bluesy/funky dominant 7th`, 'extension');
      add(`${root}sus4`, 'Suspended 4', `Floating tension resolving naturally back to ${root}`, 'extension');
      add(`${root}6`, 'Major 6th', `Warm, vintage swing quality for ${root}`, 'extension');
    } else if (suffix === 'm' || suffix === 'min') {
      // Minor Chord Extensions
      add(`${root}m7`, 'Minor 7th', `Softer, smoother minor 7th color for ${root}m`, 'extension');
      add(`${root}m9`, 'Minor 9th', `Deep, emotional jazz/R&B minor extension`, 'extension');
      add(`${root}m6`, 'Minor 6th', `Cinematic, noir-style minor 6th color`, 'extension');
      add(`${root}madd9`, 'Minor Add 9', `Modern atmospheric minor sound`, 'extension');
    } else if (suffix === '7') {
      // Dominant 7th Extensions
      add(`${root}9`, 'Dominant 9th', `Rich 9th extension over ${root}7`, 'extension');
      add(`${root}7b9`, 'Dominant ♭9', `Spanish / Flamenco minor 9th tension over ${root}7`, 'extension');
      add(`${root}7sus4`, '7 Suspended 4', `Suspended dominant tension before resolution`, 'extension');
      add(`${root}7#9`, '7 ♯9 (Hendrix)', `Edgy blues/funk alteration`, 'extension');
      add(`${root}13`, '13th Chord', `Full jazz dominant extension`, 'extension');
    } else if (suffix === 'maj7') {
      add(`${root}69`, '6/9 Chord', `Ultra-smooth, relaxed major ending sound`, 'extension');
      add(`${root}maj7#11`, 'Maj7 ♯11', `Lydian atmospheric / Flamenco color`, 'extension');
      add(root, 'Basic Major', `Simplifies ${root}maj7 to a clean triads`, 'extension');
    } else if (suffix === 'm7' || suffix === 'min7') {
      add(`${root}m9`, 'Minor 9th', `Adds upper R&B/neo-soul extensions`, 'extension');
      add(`${root}m11`, 'Minor 11th', `Open, airy modern minor chord`, 'extension');
      add(`${root}m`, 'Basic Minor', `Simplifies ${root}m7 to a basic minor triad`, 'extension');
    } else if (suffix.includes('sus')) {
      add(root, 'Major Resolution', `Resolves suspended tension to ${root} major`, 'cadence');
      add(`${root}m`, 'Minor Resolution', `Resolves suspended tension to ${root} minor`, 'cadence');
    }

    // 2. Harmonic Substitutions
    const isMinor = suffix === 'm' || suffix === 'min' || suffix === 'm7' || suffix === 'm9' || suffix === 'm6';

    if (!isMinor) {
      // Relative Minor (vi of Major) e.g., C -> Am
      const relMinRoot = getRootFromIndex(rootIdx + 9, isFlat);
      add(`${relMinRoot}m`, 'Relative Minor', `Shares notes with ${root}; warmer, melancholic substitute`, 'substitute');

      // Mediant Minor (iii of Major) e.g., C -> Em
      const medMinRoot = getRootFromIndex(rootIdx + 4, isFlat);
      add(`${medMinRoot}m`, 'Mediant Minor', `Smooth tonic substitute sharing E and G notes`, 'substitute');

      // Parallel Minor e.g., C -> Cm
      add(`${root}m`, 'Parallel Minor', `Dramatic modal shift from major to minor`, 'modal');

      // Subdominant (IV) e.g., C -> F
      const subdomRoot = getRootFromIndex(rootIdx + 5, isFlat);
      add(subdomRoot, 'Subdominant (IV)', `Moves harmony forward with open subdominant feel`, 'substitute');

      // Dominant (V or V7) e.g., C -> G or G7
      const domRoot = getRootFromIndex(rootIdx + 7, isFlat);
      add(`${domRoot}7`, 'Dominant (V7)', `Strong harmonic anchor pulling back to ${root}`, 'substitute');

      // Tritone Substitution e.g., C -> Gb7
      const tritoneRoot = getRootFromIndex(rootIdx + 6, isFlat);
      add(`${tritoneRoot}7`, 'Tritone Sub', `Jazz chromatic substitution a half-step above resolution`, 'substitute');
    } else {
      // Relative Major (III of Minor) e.g., Am -> C
      const relMajRoot = getRootFromIndex(rootIdx + 3, isFlat);
      add(relMajRoot, 'Relative Major', `Brightens ${root}m with its relative major counterpart`, 'substitute');

      // Submediant Major (VI of Minor) e.g., Am -> F
      const submedRoot = getRootFromIndex(rootIdx + 8, isFlat);
      add(submedRoot, 'Submediant (VI)', `Expands minor feel into a powerful major shift`, 'substitute');

      // Subdominant Minor (iv) e.g., Am -> Dm
      const subdomMinRoot = getRootFromIndex(rootIdx + 5, isFlat);
      add(`${subdomMinRoot}m`, 'Subdominant (iv)', `Natural minor progression step`, 'substitute');

      // Major V7 Dominant e.g., Am -> E7
      const domRoot = getRootFromIndex(rootIdx + 7, isFlat);
      add(`${domRoot}7`, 'Dominant (V7)', `Strong harmonic turnaround pulling back to ${root}m`, 'substitute');

      // Parallel Major e.g., Am -> A
      add(root, 'Parallel Major', `Lifts minor sadness into a bright parallel major`, 'modal');
    }
  }

  // CASE 2: No explicit chord on current beat, or context-driven suggestions
  const parsedPrev = prevChordName ? parseChordParts(prevChordName) : null;
  const parsedNext = nextChordName ? parseChordParts(nextChordName) : null;

  if (parsedPrev) {
    const { root: pRoot, suffix: pSuffix } = parsedPrev;
    const pIdx = getRootIndex(pRoot);
    const pFlat = useFlats || pRoot.includes('b');
    const pIsMinor = pSuffix.includes('m') && !pSuffix.includes('maj');

    if (!pIsMinor) {
      // Prev was Major (e.g. C)
      const vRoot = getRootFromIndex(pIdx + 7, pFlat);
      const viRoot = getRootFromIndex(pIdx + 9, pFlat);
      const ivRoot = getRootFromIndex(pIdx + 5, pFlat);
      const iiRoot = getRootFromIndex(pIdx + 2, pFlat);

      add(`${vRoot}7`, 'Dominant (V7)', `Classic 5-1 motion following ${pRoot}`, 'cadence');
      add(`${viRoot}m`, 'Relative Minor (vi)', `Pop standard movement from ${pRoot} to ${viRoot}m`, 'passing');
      add(ivRoot, 'Subdominant (IV)', `Classic pop/rock step from ${pRoot} to ${ivRoot}`, 'passing');
      add(`${iiRoot}m`, 'Supertonic (ii)', `Prepares a smooth ii-V-I progression`, 'passing');
    } else {
      // Prev was Minor (e.g. Am)
      const ivMinRoot = getRootFromIndex(pIdx + 5, pFlat);
      const viMajRoot = getRootFromIndex(pIdx + 8, pFlat);
      const viiMajRoot = getRootFromIndex(pIdx + 10, pFlat);
      const v7Root = getRootFromIndex(pIdx + 7, pFlat);

      add(`${ivMinRoot}m`, 'Subdominant (iv)', `Flows naturally from ${pRoot}m`, 'passing');
      add(viMajRoot, 'Submediant (VI)', `Dramatic minor-to-major movement from ${pRoot}m`, 'passing');
      add(viiMajRoot, 'Subtonic (VII)', `Stepwise natural minor transition`, 'passing');
      add(`${v7Root}7`, 'Dominant (V7)', `Harmonic minor turnaround chord`, 'cadence');
    }
  }

  if (parsedNext) {
    const { root: nRoot, suffix: nSuffix } = parsedNext;
    const nIdx = getRootIndex(nRoot);
    const nFlat = useFlats || nRoot.includes('b');

    // Suggest approach chords leading into nextChord
    const v5Root = getRootFromIndex(nIdx + 7, nFlat);
    const ii2Root = getRootFromIndex(nIdx + 2, nFlat);
    const halfStepAbove = getRootFromIndex(nIdx + 1, nFlat);

    add(`${v5Root}7`, 'Leading Dominant', `Creates strong pull resolving into ${nRoot}`, 'cadence');
    add(`${ii2Root}m7`, 'ii-V Prep', `Sets up a smooth ii-V resolution into ${nRoot}`, 'passing');
    add(`${halfStepAbove}7`, 'Tritone Approach', `Chromatic half-step slide down into ${nRoot}`, 'cadence');
  }

  // CASE 3: Blank / default baseline suggestions if grid is empty or few suggestions exist
  if (suggestions.length < 6) {
    add('C', 'Tonic (C Major)', 'Universal major starting foundation', 'cadence');
    add('Am', 'Relative Minor (Am)', 'Emotional minor foundation', 'cadence');
    add('G7', 'Dominant 7th (G7)', 'Classic tension chord pulling to C', 'cadence');
    add('F', 'Subdominant (F)', 'Warm, open major structure', 'substitute');
    add('E7', 'Spanish V7 (E7)', 'Spanish / Flamenco turnaround chord', 'cadence');
    add('Dm', 'D Minor', 'Classic minor 2nd/4th step', 'passing');
    add('Cmaj7', 'C Major 7th', 'Lush jazz starting chord', 'extension');
  }

  return suggestions.slice(0, 8);
}
