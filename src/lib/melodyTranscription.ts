/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Melody Transcription, Beat Quantization, Key Signature and Time Signature Detection Engine
 * for MusoBuddy. Transcribes real-time microphone melody input into clean, idiomatic ABC scores.
 */

export interface RawNoteEvent {
  id: string;
  midiNote: number;
  continuousMidi?: number; // exact continuous pitch in fractional semitones (e.g. 64.32)
  frequency: number;
  noteName: string; // e.g. "G4", "C#5"
  octave: number;
  startTime: number; // in seconds from recording start
  duration: number; // in seconds
  clarity: number;
  driftOffsetCents?: number; // intonation offset relative to running key anchor
}

export type PitchTrackingStrategy = 'adaptive_drift' | 'relative_intervals' | 'scale_aware' | 'absolute';

export interface QuantizedNote {
  id: string;
  midiNote: number;
  noteName: string;
  startBeat: number; // in beats (1 beat = quarter note)
  durationBeats: number; // in beats (0.5 = eighth note, 1.0 = quarter, etc.)
  abcSymbol: string;
  isRest?: boolean;
  measureIndex?: number;
}

export interface KeySignatureResult {
  key: string; // e.g. "G", "C", "Am", "Em", "F", "Bb", "D"
  mode: 'major' | 'minor';
  root: string; // "C", "G", "D", "A", "E", "B", "F#", "F", "Bb", "Eb", "Ab", "Db"
  confidence: number;
  allScores: { key: string; score: number }[];
}

export interface TimeSignatureResult {
  timeSignature: '4/4' | '3/4' | '2/4' | '6/8';
  beatsPerMeasure: number;
  beatUnit: number;
  confidence: number;
}

export interface TranscriptionConfig {
  bpm?: number;
  autoBpm?: boolean;
  timeSignature?: '4/4' | '3/4' | '2/4' | '6/8' | 'auto';
  keySignature?: string | 'auto';
  quantizationGrid?: '1/16' | '1/8' | '1/4' | '1/12' | 'auto';
  minNoteDurationSec?: number;
  inputMode?: 'voice' | 'whistle' | 'instrument';
  pitchStrategy?: PitchTrackingStrategy;
  title?: string;
}

export interface TranscriptionResult {
  abc: string;
  title: string;
  keySignature: KeySignatureResult;
  timeSignature: TimeSignatureResult;
  bpm: number;
  quantizedNotes: QuantizedNote[];
  rawNotes: RawNoteEvent[];
  totalDuration: number;
  driftCents?: number; // cumulative drift in cents across the performance
  pitchStrategy?: PitchTrackingStrategy;
}

const PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Krumhansl-Kessler Key Profiles for Krumhansl-Schmuckler Key-Finding Algorithm
const KRUMHANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KRUMHANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// Standard key accidentals dictionary for sharp and flat keys
const SHARP_KEYS_MAP: Record<string, string[]> = {
  'C': [],
  'G': ['F#'],
  'D': ['F#', 'C#'],
  'A': ['F#', 'C#', 'G#'],
  'E': ['F#', 'C#', 'G#', 'D#'],
  'B': ['F#', 'C#', 'G#', 'D#', 'A#'],
  'F#': ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
  'Am': [],
  'Em': ['F#'],
  'Bm': ['F#', 'C#'],
  'F#m': ['F#', 'C#', 'G#'],
  'C#m': ['F#', 'C#', 'G#', 'D#'],
  'G#m': ['F#', 'C#', 'G#', 'D#', 'A#']
};

const FLAT_KEYS_MAP: Record<string, string[]> = {
  'F': ['Bb'],
  'Bb': ['Bb', 'Eb'],
  'Eb': ['Bb', 'Eb', 'Ab'],
  'Ab': ['Bb', 'Eb', 'Ab', 'Db'],
  'Db': ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
  'Gb': ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
  'Dm': ['Bb'],
  'Gm': ['Bb', 'Eb'],
  'Cm': ['Bb', 'Eb', 'Ab'],
  'Fm': ['Bb', 'Eb', 'Ab', 'Db'],
  'Bbm': ['Bb', 'Eb', 'Ab', 'Db', 'Gb']
};

/**
 * Calculates the Pearson correlation between two numeric arrays
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;

  let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
    sumXY += x[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denomX = n * sumX2 - sumX * sumX;
  const denomY = n * sumY2 - sumY * sumY;

  if (denomX <= 0 || denomY <= 0) return 0;
  return numerator / Math.sqrt(denomX * denomY);
}

/**
 * Determines the most likely key signature from raw or quantized notes
 * using the Krumhansl-Schmuckler pitch-class profile correlation algorithm.
 */
export function detectKeySignature(notes: { midiNote: number; duration: number }[]): KeySignatureResult {
  if (!notes || notes.length === 0) {
    return {
      key: 'C',
      mode: 'major',
      root: 'C',
      confidence: 1.0,
      allScores: [{ key: 'C', score: 1.0 }]
    };
  }

  // 1. Compute Pitch Class Duration Histogram (12 bins: C, C#, D, ... B)
  const pitchProfile = new Array(12).fill(0);
  let totalDuration = 0;

  for (const n of notes) {
    const pc = ((n.midiNote % 12) + 12) % 12;
    // Weight duration, giving a slight bonus to notes that end on long tones (possible tonics)
    const weight = Math.max(0.05, n.duration);
    pitchProfile[pc] += weight;
    totalDuration += weight;
  }

  // Bonus for the first note and last note (often the tonic or dominant)
  if (notes.length > 0) {
    const firstPc = ((notes[0].midiNote % 12) + 12) % 12;
    const lastPc = ((notes[notes.length - 1].midiNote % 12) + 12) % 12;
    pitchProfile[firstPc] += totalDuration * 0.15;
    pitchProfile[lastPc] += totalDuration * 0.25;
  }

  const keyCandidates: { key: string; root: string; mode: 'major' | 'minor'; score: number }[] = [];

  const majorNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const minorNames = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

  // Test all 12 Major keys
  for (let root = 0; root < 12; root++) {
    const rotatedProfile = new Array(12);
    for (let i = 0; i < 12; i++) {
      rotatedProfile[i] = KRUMHANSL_MAJOR[(i - root + 12) % 12];
    }
    const score = pearsonCorrelation(pitchProfile, rotatedProfile);
    keyCandidates.push({
      key: majorNames[root],
      root: majorNames[root],
      mode: 'major',
      score
    });
  }

  // Test all 12 Minor keys
  for (let root = 0; root < 12; root++) {
    const rotatedProfile = new Array(12);
    for (let i = 0; i < 12; i++) {
      rotatedProfile[i] = KRUMHANSL_MINOR[(i - root + 12) % 12];
    }
    const score = pearsonCorrelation(pitchProfile, rotatedProfile);
    keyCandidates.push({
      key: minorNames[root],
      root: minorNames[root].replace('m', ''),
      mode: 'minor',
      score
    });
  }

  keyCandidates.sort((a, b) => b.score - a.score);

  const best = keyCandidates[0];
  const maxScore = Math.max(0.001, best.score);
  const confidence = Math.max(0.1, Math.min(1.0, (best.score - (keyCandidates[1]?.score || 0)) * 2 + 0.5));

  return {
    key: best.key,
    mode: best.mode,
    root: best.root,
    confidence,
    allScores: keyCandidates.map(c => ({ key: c.key, score: parseFloat(c.score.toFixed(3)) }))
  };
}

/**
 * Estimates the musical tempo (BPM) from inter-onset intervals of recorded notes
 */
export function detectTempoFromNotes(notes: RawNoteEvent[]): number {
  if (!notes || notes.length < 2) {
    return 120; // Default tempo
  }

  // Collect Inter-Onset Intervals (IOIs)
  const iois: number[] = [];
  for (let i = 0; i < notes.length - 1; i++) {
    const ioi = notes[i + 1].startTime - notes[i].startTime;
    if (ioi >= 0.15 && ioi <= 2.5) {
      iois.push(ioi);
    }
  }

  if (iois.length === 0) return 120;

  // Generate candidate BPMs in the range 60 to 180 (step 2 BPM)
  const bpmCandidates: { bpm: number; score: number }[] = [];

  for (let testBpm = 60; testBpm <= 180; testBpm += 2) {
    const beatSec = 60 / testBpm;
    let score = 0;

    for (const ioi of iois) {
      // Check how close the IOI is to a multiple or division of the beat (0.5, 1.0, 1.5, 2.0, 3.0, 4.0)
      const divisions = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0];
      for (const div of divisions) {
        const targetSec = beatSec * div;
        const diff = Math.abs(ioi - targetSec);
        if (diff < 0.08 * div) {
          score += (1 - diff / (0.08 * div)) * (div === 1.0 ? 2.0 : 1.0);
        }
      }
    }

    // Slight preference for standard medium tempos (100 - 130 BPM)
    const tempoPreference = 1 - Math.abs(testBpm - 116) / 200;
    bpmCandidates.push({ bpm: testBpm, score: score * tempoPreference });
  }

  bpmCandidates.sort((a, b) => b.score - a.score);

  const bestBpm = bpmCandidates[0]?.bpm || 120;
  // Round to clean multiples of 2 or 5
  return Math.round(bestBpm / 2) * 2;
}

/**
 * Determines a suitable time signature (4/4, 3/4, 2/4, 6/8) based on note positions and accents
 */
export function detectTimeSignature(
  notes: { startTime: number; duration: number }[],
  bpm: number
): TimeSignatureResult {
  const beatSec = 60 / bpm;
  if (!notes || notes.length < 3) {
    return { timeSignature: '4/4', beatsPerMeasure: 4, beatUnit: 4, confidence: 0.9 };
  }

  // Test 4/4 (4 beats), 3/4 (3 beats), 2/4 (2 beats), 6/8 (3 eighths per beat)
  const candidateSigs: { sig: '4/4' | '3/4' | '2/4' | '6/8'; beats: number; unit: number; score: number }[] = [
    { sig: '4/4', beats: 4, unit: 4, score: 0 },
    { sig: '3/4', beats: 3, unit: 4, score: 0 },
    { sig: '2/4', beats: 2, unit: 4, score: 0 },
    { sig: '6/8', beats: 6, unit: 8, score: 0 }
  ];

  for (const cand of candidateSigs) {
    const measureDuration = cand.unit === 8 ? (beatSec * (cand.beats / 2)) : (beatSec * cand.beats);
    let strongBeatAlignments = 0;

    for (const n of notes) {
      const posInMeasure = (n.startTime % measureDuration) / measureDuration;
      // Check if note is near downbeat (0.0) or middle strong beat (0.5 for 4/4)
      if (posInMeasure < 0.08 || posInMeasure > 0.92) {
        strongBeatAlignments += 2.0;
      } else if (cand.sig === '4/4' && Math.abs(posInMeasure - 0.5) < 0.08) {
        strongBeatAlignments += 1.2;
      } else if (cand.sig === '3/4' && (Math.abs(posInMeasure - 0.333) < 0.08 || Math.abs(posInMeasure - 0.666) < 0.08)) {
        strongBeatAlignments += 1.0;
      }
    }

    cand.score = strongBeatAlignments / notes.length;
    // Slight baseline bias to 4/4 if all else is equal
    if (cand.sig === '4/4') cand.score += 0.25;
  }

  candidateSigs.sort((a, b) => b.score - a.score);
  const best = candidateSigs[0];

  return {
    timeSignature: best.sig,
    beatsPerMeasure: best.beats,
    beatUnit: best.unit,
    confidence: Math.min(1.0, best.score)
  };
}

/**
 * Converts MIDI note number and key signature to proper ABC note notation
 */
export function midiToAbcNote(midiNote: number, key: string): string {
  const pc = ((midiNote % 12) + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1; // MIDI 60 = C4

  // Check key signature accidentals
  const keySharps = SHARP_KEYS_MAP[key] || [];
  const keyFlats = FLAT_KEYS_MAP[key] || [];
  const isFlatKey = FLAT_KEYS_MAP[key] !== undefined || ['F', 'Dm', 'Bb', 'Gm', 'Eb', 'Cm', 'Ab', 'Fm', 'Db', 'Gb'].includes(key);

  const sharpNames = ['C', '^C', 'D', '^D', 'E', 'F', '^F', 'G', '^G', 'A', '^A', 'B'];
  const flatNames = ['C', '_D', 'D', '_E', 'E', 'F', '_G', 'G', '_A', 'A', '_B', 'B'];

  const rawName = isFlatKey ? flatNames[pc] : sharpNames[pc];
  let accidental = '';
  let letter = rawName;

  if (rawName.startsWith('^') || rawName.startsWith('_')) {
    accidental = rawName.charAt(0);
    letter = rawName.substring(1);
  }

  // Adjust for notes naturally in key
  if (accidental === '^' && keySharps.includes(`${letter}#`)) {
    accidental = ''; // Already sharp in key signature!
  } else if (accidental === '_' && keyFlats.includes(`${letter}b`)) {
    accidental = ''; // Already flat in key signature!
  } else if (accidental === '') {
    // Check if natural accidental sign is needed to cancel a key sharp/flat
    if (keySharps.some(s => s.startsWith(letter))) {
      accidental = '=';
    } else if (keyFlats.some(f => f.startsWith(letter))) {
      accidental = '=';
    }
  }

  // Octave formatting in ABC:
  // C3 and below: C, C,, C,,,
  // C4 (Middle C) to B4: c, d, e, f, g, a, b
  // C5: c', d', e', f', g', a', b'
  // C2: C,
  let resultLetter = '';
  let octaveMarks = '';

  if (octave < 4) {
    resultLetter = letter.toUpperCase();
    const commas = 3 - octave;
    if (commas > 0) octaveMarks = ','.repeat(commas);
  } else if (octave === 4) {
    resultLetter = letter.toLowerCase();
  } else {
    resultLetter = letter.toLowerCase();
    const primes = octave - 4;
    if (primes > 0) octaveMarks = "'".repeat(primes);
  }

  return `${accidental}${resultLetter}${octaveMarks}`;
}

/**
 * Formats note duration into ABC length modifier relative to unit note length L: 1/8
 */
export function formatAbcDuration(durationBeats: number, unitNoteLength: '1/8' | '1/16' = '1/8'): string {
  // If L: 1/8 (1 beat = quarter note = 2 eighth units)
  const eighthUnits = durationBeats * 2;
  const rounded = Math.round(eighthUnits * 4) / 4;

  if (unitNoteLength === '1/8') {
    if (rounded === 1) return ''; // 1 eighth
    if (rounded === 0.5) return '/2'; // 1 sixteenth
    if (rounded === 0.25) return '/4'; // 1 thirty-second
    if (rounded === 2) return '2'; // quarter note
    if (rounded === 3) return '3'; // dotted quarter
    if (rounded === 4) return '4'; // half note
    if (rounded === 6) return '6'; // dotted half
    if (rounded === 8) return '8'; // whole note
    if (rounded > 0) {
      if (Number.isInteger(rounded)) return `${rounded}`;
      // Fraction fallback
      return `/${Math.round(1 / rounded)}`;
    }
  }

  return '2';
}

/**
 * Post-processes raw notes to eliminate vocal humming glitches, vibrato fragments, and micro-gaps.
 */
export function cleanAndConsolidateNotes(
  notes: RawNoteEvent[], 
  minDurationSec: number = 0.08,
  inputMode: 'voice' | 'whistle' | 'instrument' = 'voice'
): RawNoteEvent[] {
  if (!notes || notes.length === 0) return [];

  // 1. Initial filter for extreme micro-blips
  const baseMin = inputMode === 'voice' ? 0.05 : minDurationSec * 0.7;
  const initial = notes.filter(n => n.duration >= baseMin);
  if (initial.length === 0) return [];

  // 2. Merge consecutive notes with identical MIDI pitch separated by small gaps (< 140ms for voice)
  const maxGap = inputMode === 'voice' ? 0.16 : 0.10;
  const merged: RawNoteEvent[] = [];
  let cur = { ...initial[0] };

  for (let i = 1; i < initial.length; i++) {
    const next = initial[i];
    const gap = next.startTime - (cur.startTime + cur.duration);

    // If same MIDI note and small gap, merge into one continuous note
    if (next.midiNote === cur.midiNote && gap <= maxGap) {
      cur.duration = (next.startTime + next.duration) - cur.startTime;
      cur.clarity = (cur.clarity + next.clarity) / 2;
    } else {
      merged.push(cur);
      cur = { ...next };
    }
  }
  merged.push(cur);

  // 3. Filter out transient vocal transition glides (< 70ms) between two longer notes
  const finalFiltered: RawNoteEvent[] = [];
  for (let i = 0; i < merged.length; i++) {
    const note = merged[i];
    const isVeryShort = note.duration < minDurationSec;
    const isSandwiched = i > 0 && i < merged.length - 1;

    if (isVeryShort && isSandwiched) {
      const prev = merged[i - 1];
      const next = merged[i + 1];
      // If sandwiched between two longer notes of different pitches, this is a vocal glide artifact
      if (prev.duration >= minDurationSec && next.duration >= minDurationSec && prev.midiNote !== next.midiNote) {
        continue;
      }
    }

    if (note.duration >= (inputMode === 'voice' ? minDurationSec * 0.8 : minDurationSec)) {
      finalFiltered.push(note);
    }
  }

  return finalFiltered.length > 0 ? finalFiltered : merged;
}

/**
 * Scale degree intervals for major and minor scales (semitones from root)
 */
const DIATONIC_SCALE_INTERVALS: Record<string, number[]> = {
  'major': [0, 2, 4, 5, 7, 9, 11],
  'minor': [0, 2, 3, 5, 7, 8, 10]
};

/**
 * Compensates for natural human vocal intonation drift and focuses on relative pitch jumps.
 * Humans hum and whistle using relative intervals (e.g., major third = +4 semitones, fifth = +7 semitones)
 * rather than absolute standard A440 tuning. Over 10-30 seconds, unassisted singers
 * frequently drift by 30-120 cents without losing the internal structure of the melody.
 *
 * This algorithm tracks the running key drift accumulator and snaps relative interval jumps,
 * preventing cumulative flatting/sharping from throwing melody notes onto the wrong semitone.
 */
export function compensateRelativePitchAndDrift(
  notes: RawNoteEvent[],
  strategy: PitchTrackingStrategy = 'adaptive_drift',
  inputMode: 'voice' | 'whistle' | 'instrument' = 'voice'
): { notes: RawNoteEvent[]; cumulativeDriftCents: number } {
  if (!notes || notes.length === 0) return { notes: [], cumulativeDriftCents: 0 };
  if (strategy === 'absolute') {
    return { notes, cumulativeDriftCents: 0 };
  }

  // 1. Compute exact continuous fractional MIDI for every note based on fundamental frequency
  const continuousNotes: RawNoteEvent[] = notes.map(n => {
    const f = n.frequency > 0 ? n.frequency : 440 * Math.pow(2, (n.midiNote - 69) / 12);
    const contMidi = 12 * Math.log2(f / 440) + 69;
    return {
      ...n,
      continuousMidi: n.continuousMidi !== undefined ? n.continuousMidi : contMidi
    };
  });

  // Step A: Initialize tonal reference anchor with the first note
  const first = continuousNotes[0];
  const firstMidiRound = Math.round(first.continuousMidi!);
  // Initial intonation offset (e.g. +0.28 semitones = +28 cents sharp of 12-TET)
  let runningDriftSemitones = first.continuousMidi! - firstMidiRound;
  const initialDrift = runningDriftSemitones;

  const result: RawNoteEvent[] = [];
  let prevAssignedMidi = firstMidiRound;
  let prevContMidi = first.continuousMidi!;
  let prevEndTime = first.startTime + first.duration;

  // First note assignment
  const { noteName: n0Name, octave: n0Oct } = midiToNoteDetails(firstMidiRound);
  result.push({
    ...first,
    midiNote: firstMidiRound,
    noteName: n0Name,
    octave: n0Oct,
    driftOffsetCents: Math.round(runningDriftSemitones * 100)
  });

  // Adaptation rate (how quickly we integrate vocal drift into the key center)
  // Higher for voice (drifts faster), lower for whistle/instruments
  const alpha = inputMode === 'voice' ? 0.28 : inputMode === 'whistle' ? 0.20 : 0.12;

  for (let i = 1; i < continuousNotes.length; i++) {
    const current = continuousNotes[i];
    const contMidi = current.continuousMidi!;
    const restGap = current.startTime - prevEndTime;

    // 1. Relative continuous interval jump from previous note
    const relativeJump = contMidi - prevContMidi;
    const roundedRelativeJump = Math.round(relativeJump);

    // 2. Pitch relative to the drift-compensated key anchor
    const anchorCompensated = contMidi - runningDriftSemitones;
    const roundedAnchorMidi = Math.round(anchorCompensated);

    let assignedMidi: number;

    if (strategy === 'relative_intervals') {
      // Pure relative interval mode: step directly from previous note
      assignedMidi = prevAssignedMidi + roundedRelativeJump;
    } else {
      // Adaptive Drift Mode:
      // For adjacent stepwise melodic phrases, human relative interval jumps are very accurate.
      // If there was a long pause (> 1.2s) or large jump (> 8 semitones), anchor consensus prevents runaway drift.
      const candidateRel = prevAssignedMidi + roundedRelativeJump;
      
      if (restGap > 1.2 || Math.abs(roundedRelativeJump) > 8) {
        // Rest or octave leap: balance between relative jump and drift anchor
        assignedMidi = roundedAnchorMidi;
      } else {
        // Continuous melody: prioritize relative interval jump
        assignedMidi = candidateRel;
      }
    }

    // 3. Update the key drift accumulator (leaky integrator)
    // The difference between actual sung continuous pitch and chosen semitone represents instant drift + microtonal error
    const instantError = contMidi - assignedMidi;
    
    // Weight update by note duration (longer held notes are stronger key anchors)
    const durationWeight = Math.min(1.5, Math.max(0.6, current.duration / 0.3));
    const effectiveAlpha = Math.min(0.45, alpha * durationWeight);
    
    runningDriftSemitones = runningDriftSemitones * (1 - effectiveAlpha) + instantError * effectiveAlpha;

    // 4. Update note details
    const { noteName, octave } = midiToNoteDetails(assignedMidi);
    result.push({
      ...current,
      midiNote: assignedMidi,
      noteName,
      octave,
      driftOffsetCents: Math.round((contMidi - (assignedMidi + runningDriftSemitones)) * 100)
    });

    prevAssignedMidi = assignedMidi;
    prevContMidi = contMidi;
    prevEndTime = current.startTime + current.duration;
  }

  // Step B: If scale-aware strategy is active, gently snap ambiguous accidental notes to the detected diatonic scale
  if (strategy === 'scale_aware') {
    const key = detectKeySignature(result);
    const rootPc = PITCH_NAMES.indexOf(key.root);
    if (rootPc >= 0) {
      const scaleIntervals = DIATONIC_SCALE_INTERVALS[key.mode] || DIATONIC_SCALE_INTERVALS.major;
      const validPitchClasses = new Set(scaleIntervals.map(step => (rootPc + step) % 12));

      for (let i = 0; i < result.length; i++) {
        const note = result[i];
        const pc = ((note.midiNote % 12) + 12) % 12;

        if (!validPitchClasses.has(pc)) {
          // If note is an accidental, check if continuous pitch was closer to a diatonic neighbor
          const cont = continuousNotes[i].continuousMidi!;
          const lowerMidi = note.midiNote - 1;
          const upperMidi = note.midiNote + 1;
          const lowerPc = ((lowerMidi % 12) + 12) % 12;
          const upperPc = ((upperMidi % 12) + 12) % 12;

          const distToLower = Math.abs(cont - (lowerMidi + runningDriftSemitones));
          const distToUpper = Math.abs(cont - (upperMidi + runningDriftSemitones));

          if (validPitchClasses.has(lowerPc) && distToLower < 0.65 && distToLower < distToUpper) {
            const { noteName: nName, octave: nOct } = midiToNoteDetails(lowerMidi);
            result[i].midiNote = lowerMidi;
            result[i].noteName = nName;
            result[i].octave = nOct;
          } else if (validPitchClasses.has(upperPc) && distToUpper < 0.65) {
            const { noteName: nName, octave: nOct } = midiToNoteDetails(upperMidi);
            result[i].midiNote = upperMidi;
            result[i].noteName = nName;
            result[i].octave = nOct;
          }
        }
      }
    }
  }

  const cumulativeDriftCents = Math.round((runningDriftSemitones - initialDrift) * 100);
  return { notes: result, cumulativeDriftCents };
}

/**
 * Main Transcription & Quantization Engine
 */
export function transcribeMelody(
  rawNotes: RawNoteEvent[],
  config: TranscriptionConfig = {}
): TranscriptionResult {
  const minDuration = config.minNoteDurationSec || 0.08;
  const inputMode = config.inputMode || 'voice';
  const pitchStrategy = config.pitchStrategy || (inputMode === 'instrument' ? 'absolute' : 'adaptive_drift');
  
  // 1. Clean and consolidate vocal/humming fragments
  const cleanedNotes = cleanAndConsolidateNotes(rawNotes, minDuration, inputMode);

  // 2. Compensate for relative pitch jumps and gradual key drift
  const { notes: validNotes, cumulativeDriftCents } = compensateRelativePitchAndDrift(
    cleanedNotes,
    pitchStrategy,
    inputMode
  );

  if (validNotes.length === 0) {
    const defaultKey = config.keySignature && config.keySignature !== 'auto' ? config.keySignature : 'C';
    const defaultTime = config.timeSignature && config.timeSignature !== 'auto' ? config.timeSignature : '4/4';
    const defaultBpm = config.bpm || 120;
    const emptyAbc = `X: 1\nT: ${config.title || 'Transcribed Melody'}\nC: MusoBuddy Transcription\nM: ${defaultTime}\nL: 1/8\nQ: 1/4=${defaultBpm}\nK: ${defaultKey}\n| z8 |]`;
    
    return {
      abc: emptyAbc,
      title: config.title || 'Transcribed Melody',
      keySignature: { key: defaultKey, mode: 'major', root: defaultKey, confidence: 1, allScores: [] },
      timeSignature: { timeSignature: defaultTime as any, beatsPerMeasure: 4, beatUnit: 4, confidence: 1 },
      bpm: defaultBpm,
      quantizedNotes: [],
      rawNotes: [],
      totalDuration: 0,
      driftCents: 0,
      pitchStrategy
    };
  }

  // 1. Detect or assign Tempo (BPM)
  const bpm = config.bpm && !config.autoBpm ? config.bpm : detectTempoFromNotes(validNotes);
  const beatSec = 60 / bpm;

  // 2. Detect or assign Key Signature
  const keyResult = config.keySignature && config.keySignature !== 'auto'
    ? {
        key: config.keySignature,
        mode: config.keySignature.endsWith('m') ? ('minor' as const) : ('major' as const),
        root: config.keySignature.replace('m', ''),
        confidence: 1.0,
        allScores: []
      }
    : detectKeySignature(validNotes);

  // 3. Detect or assign Time Signature
  const timeResult = config.timeSignature && config.timeSignature !== 'auto'
    ? {
        timeSignature: config.timeSignature,
        beatsPerMeasure: config.timeSignature === '3/4' ? 3 : config.timeSignature === '2/4' ? 2 : config.timeSignature === '6/8' ? 6 : 4,
        beatUnit: config.timeSignature === '6/8' ? 8 : 4,
        confidence: 1.0
      }
    : detectTimeSignature(validNotes, bpm);

  // 4. Quantization Resolution
  let gridStep = 0.5; // default 1/8 note (0.5 beats)
  if (config.quantizationGrid === '1/16') gridStep = 0.25;
  else if (config.quantizationGrid === '1/4') gridStep = 1.0;
  else if (config.quantizationGrid === '1/12') gridStep = 1 / 3;
  else if (config.quantizationGrid === 'auto') {
    // Check if there are rapid notes requiring 1/16 precision
    const hasFastNotes = validNotes.some(n => n.duration < beatSec * 0.4);
    gridStep = hasFastNotes ? 0.25 : 0.5;
  }

  const measureBeats = timeResult.timeSignature === '6/8' ? 3.0 : timeResult.beatsPerMeasure;
  const startOffsetSec = validNotes[0].startTime;

  // 5. Quantize Notes & Fill Rests
  const quantizedNotes: QuantizedNote[] = [];
  let currentBeat = 0;

  for (let i = 0; i < validNotes.length; i++) {
    const raw = validNotes[i];
    const rawStartBeat = (raw.startTime - startOffsetSec) / beatSec;
    const rawDurationBeats = raw.duration / beatSec;

    // Snap start to grid
    const startBeat = Math.round(rawStartBeat / gridStep) * gridStep;
    // Snap duration to grid (minimum 1 grid step)
    const durationBeats = Math.max(gridStep, Math.round(rawDurationBeats / gridStep) * gridStep);

    // If there is a rest gap before this note, insert rest(s)
    if (startBeat > currentBeat + (gridStep * 0.6)) {
      const restDuration = startBeat - currentBeat;
      quantizedNotes.push({
        id: `rest-${currentBeat}`,
        midiNote: 0,
        noteName: 'Rest',
        startBeat: currentBeat,
        durationBeats: restDuration,
        abcSymbol: 'z',
        isRest: true
      });
    }

    const abcNoteSymbol = midiToAbcNote(raw.midiNote, keyResult.key);
    quantizedNotes.push({
      id: raw.id,
      midiNote: raw.midiNote,
      noteName: raw.noteName,
      startBeat: Math.max(currentBeat, startBeat),
      durationBeats,
      abcSymbol: abcNoteSymbol,
      isRest: false
    });

    currentBeat = Math.max(currentBeat, startBeat) + durationBeats;
  }

  // 6. Build Formatted ABC Score with Measures, Bar Lines and Ties
  const totalBeats = currentBeat;
  const measureCount = Math.ceil(totalBeats / measureBeats);
  const totalMeasures = Math.max(1, measureCount);

  const measureEighths = measureBeats * 2; // relative to L: 1/8
  let abcBody = '| ';
  let currentMeasureEighths = 0;
  let measuresInLine = 0;

  for (let i = 0; i < quantizedNotes.length; i++) {
    const note = quantizedNotes[i];
    let remainingEighths = Math.round(note.durationBeats * 2);

    while (remainingEighths > 0) {
      const spaceLeftInMeasure = measureEighths - currentMeasureEighths;
      const eighthsToPlace = Math.min(remainingEighths, spaceLeftInMeasure);

      const durationStr = formatAbcDuration(eighthsToPlace / 2, '1/8');
      const symbol = note.isRest ? `z${durationStr}` : `${note.abcSymbol}${durationStr}`;

      const willCrossMeasure = remainingEighths > spaceLeftInMeasure && !note.isRest;
      abcBody += symbol;
      if (willCrossMeasure) {
        abcBody += '- '; // ABC Tie across measure bar line
      } else {
        abcBody += ' ';
      }

      currentMeasureEighths += eighthsToPlace;
      remainingEighths -= eighthsToPlace;

      if (currentMeasureEighths >= measureEighths) {
        abcBody += '| ';
        currentMeasureEighths = 0;
        measuresInLine++;

        // Add a newline every 4 measures for readability
        if (measuresInLine % 4 === 0 && i < quantizedNotes.length - 1) {
          abcBody += '\n| ';
        }
      }
    }
  }

  // If the last measure is incomplete, pad with rest or close
  if (currentMeasureEighths > 0 && currentMeasureEighths < measureEighths) {
    const padEighths = measureEighths - currentMeasureEighths;
    abcBody += `z${formatAbcDuration(padEighths / 2, '1/8')} |]`;
  } else {
    // Close double bar line
    abcBody = abcBody.trim();
    if (!abcBody.endsWith('|]')) {
      if (abcBody.endsWith('|')) {
        abcBody = abcBody.slice(0, -1) + '|]';
      } else {
        abcBody += ' |]';
      }
    }
  }

  const scoreTitle = config.title || `Transcribed Melody in ${keyResult.key}`;

  const fullAbc = [
    'X: 1',
    `T: ${scoreTitle}`,
    'C: Transcribed via MusoBuddy Mic',
    `M: ${timeResult.timeSignature}`,
    'L: 1/8',
    `Q: 1/4=${bpm}`,
    `K: ${keyResult.key}`,
    abcBody
  ].join('\n');

  const totalDuration = validNotes[validNotes.length - 1].startTime + validNotes[validNotes.length - 1].duration - startOffsetSec;

  return {
    abc: fullAbc,
    title: scoreTitle,
    keySignature: keyResult,
    timeSignature: timeResult,
    bpm,
    quantizedNotes,
    rawNotes: validNotes,
    totalDuration,
    driftCents: cumulativeDriftCents,
    pitchStrategy
  };
}

/**
 * Calculates MIDI note number to Note Name and Octave (e.g. 60 -> C4)
 */
export function midiToNoteDetails(midiNote: number): { noteName: string; octave: number; baseNote: string } {
  const pc = ((midiNote % 12) + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1;
  const baseNote = PITCH_NAMES[pc];
  return {
    noteName: `${baseNote}${octave}`,
    octave,
    baseNote
  };
}
