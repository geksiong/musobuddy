/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import {
  GuqinSoundType,
  InstrumentType,
  MusoJianpuDocument,
  MusoJianpuMeasure,
  MusoJianpuNote,
  ShakuhachiBendType
} from './types.ts';
import { jianpuToMidi } from './erhuKeys.ts';
import { computeGuqinMidiFromJianzi } from './guqin.ts';
import { computeShakuhachiMidi } from './shakuhachi.ts';

export interface ScheduledErhuEvent {
  noteId: string;
  measureIndex: number;
  midi: number | null; // null = rest (primary/top pitch for chords)
  chordMidis?: number[]; // All simultaneous MIDI pitches (sorted low -> high) when chord
  startBeat: number;
  durationBeats: number;
  slideFromMidi?: number;
  slideTargetMidi?: number;
  hasVibrato: boolean;
  isStaccato: boolean;
  isTremolo: boolean;
  isPizzicato: boolean;
  isMuted?: boolean;
  isFlutter?: boolean;
  isMuraiki?: boolean;
  isKorokoro?: boolean;
  shakuhachiBends?: ShakuhachiBendType[];
  guqinSoundType?: GuqinSoundType;
  arpeggio?: 'up' | 'down' | 'roll';
  glissMidis?: number[];
  velocity: number;
}

const DYNAMIC_VELOCITIES: Record<string, number> = {
  ppp: 0.25,
  pp: 0.35,
  p: 0.48,
  mp: 0.60,
  mf: 0.74,
  f: 0.86,
  ff: 0.95,
  fff: 1.0,
  sfz: 0.98
};

/**
 * Parses a volta label (e.g. "1.", "2.", "1,2.", "1-3.") into the set of 1-based repeat pass numbers.
 */
function parseVoltaPasses(volta?: string): number[] | null {
  if (!volta) return null;
  const cleaned = volta.replace(/\.$/, '').trim();
  if (!cleaned) return null;
  const passes = new Set<number>();
  for (const part of cleaned.split(',')) {
    const rangeMatch = part.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const a = parseInt(rangeMatch[1], 10);
      const b = parseInt(rangeMatch[2], 10);
      for (let k = Math.min(a, b); k <= Math.max(a, b); k++) passes.add(k);
    } else {
      const num = parseInt(part.trim(), 10);
      if (!isNaN(num) && num >= 1) passes.add(num);
    }
  }
  return passes.size > 0 ? Array.from(passes) : null;
}

/**
 * Expands a score's measures into the actual performed sequence obeying repeats (|: :| :||:),
 * volta endings ([1. [2. [1,2.), Segno, Coda, To Coda, Fine, D.C., and D.S. jumps with loop guards.
 */
export function expandMeasurePlaybackOrder(
  measures: MusoJianpuMeasure[]
): { measure: MusoJianpuMeasure; measureIndex: number }[] {
  const result: { measure: MusoJianpuMeasure; measureIndex: number }[] = [];
  if (measures.length === 0) return result;

  const segnoIndex = measures.findIndex(m => m.startMarkers?.includes('segno'));
  const codaIndex = measures.findIndex(m => m.startMarkers?.includes('coda'));

  const repeatPassCount = new Map<number, number>();
  const usedNavJumps = new Set<number>();

  let currentRepeatStart = 0;
  let currentPass = 1;
  let activeJumpGoal: 'none' | 'fine' | 'coda' = 'none';
  let idx = 0;
  let guard = 0;
  const maxSteps = Math.max(200, measures.length * 8);

  while (idx >= 0 && idx < measures.length && guard < maxSteps) {
    guard++;
    const m = measures[idx];

    if (m.startBarline === '|:' || m.startBarline === ':||:') {
      if (currentRepeatStart !== idx) {
        currentRepeatStart = idx;
        currentPass = 1;
      }
    }

    const voltaPasses = parseVoltaPasses(m.volta);
    if (voltaPasses && !voltaPasses.includes(currentPass)) {
      let skipIdx = idx + 1;
      while (skipIdx < measures.length) {
        const nextVolta = parseVoltaPasses(measures[skipIdx].volta);
        if (nextVolta && nextVolta.includes(currentPass)) break;
        if (!nextVolta && (measures[skipIdx - 1].endBarline === ':|' || measures[skipIdx - 1].endBarline === ':||:')) {
          break;
        }
        skipIdx++;
      }
      idx = skipIdx;
      continue;
    }

    result.push({ measure: m, measureIndex: idx });

    const endMarks = m.endMarkers || [];

    if (activeJumpGoal === 'fine' && endMarks.includes('fine')) {
      break;
    }
    if (activeJumpGoal === 'coda' && endMarks.includes('toCoda') && codaIndex !== -1) {
      activeJumpGoal = 'none';
      idx = codaIndex;
      continue;
    }

    if (m.endBarline === ':|' || m.endBarline === ':||:') {
      let maxPasses = 2;
      for (let k = currentRepeatStart; k < measures.length; k++) {
        const vp = parseVoltaPasses(measures[k].volta);
        if (vp) {
          maxPasses = Math.max(maxPasses, ...vp);
        }
        if (k > idx && (measures[k].startBarline === '|:' || measures[k].startBarline === ':||:')) {
          break;
        }
      }
      const timesTaken = repeatPassCount.get(idx) || 0;
      if (activeJumpGoal === 'none' && timesTaken < maxPasses - 1) {
        repeatPassCount.set(idx, timesTaken + 1);
        currentPass = timesTaken + 2;
        idx = currentRepeatStart;
        continue;
      } else {
        currentPass = 1;
        if (m.endBarline === ':||:') {
          currentRepeatStart = idx + 1;
        }
      }
    }

    if (!usedNavJumps.has(idx)) {
      if (endMarks.includes('dcAlFine')) {
        usedNavJumps.add(idx);
        activeJumpGoal = 'fine';
        currentPass = 1;
        currentRepeatStart = 0;
        idx = 0;
        continue;
      }
      if (endMarks.includes('dcAlCoda')) {
        usedNavJumps.add(idx);
        activeJumpGoal = 'coda';
        currentPass = 1;
        currentRepeatStart = 0;
        idx = 0;
        continue;
      }
      if (endMarks.includes('dc')) {
        usedNavJumps.add(idx);
        activeJumpGoal = 'none';
        currentPass = 1;
        currentRepeatStart = 0;
        idx = 0;
        continue;
      }
      if (endMarks.includes('dsAlFine')) {
        usedNavJumps.add(idx);
        activeJumpGoal = 'fine';
        currentPass = 1;
        const target = segnoIndex !== -1 ? segnoIndex : 0;
        currentRepeatStart = target;
        idx = target;
        continue;
      }
      if (endMarks.includes('dsAlCoda')) {
        usedNavJumps.add(idx);
        activeJumpGoal = 'coda';
        currentPass = 1;
        const target = segnoIndex !== -1 ? segnoIndex : 0;
        currentRepeatStart = target;
        idx = target;
        continue;
      }
      if (endMarks.includes('ds')) {
        usedNavJumps.add(idx);
        activeJumpGoal = 'none';
        currentPass = 1;
        const target = segnoIndex !== -1 ? segnoIndex : 0;
        currentRepeatStart = target;
        idx = target;
        continue;
      }
    }

    idx++;
  }

  return result;
}

/**
 * Generates a 5-note Chinese pentatonic glissando lead-in (刮奏 / 花指) leading into `targetMidi`.
 */
function buildPentatonicGlissMidis(targetMidi: number, direction: 'up' | 'down', count: number = 6): number[] {
  const pentatonicSteps = [0, 2, 4, 7, 9]; // Major pentatonic intervals (1 2 3 5 6)
  const notes: number[] = [];
  const baseOct = Math.floor(targetMidi / 12) * 12;
  const tonicClass = targetMidi % 12;
  // Build a pool around targetMidi
  const pool: number[] = [];
  for (let oct = -2; oct <= 1; oct++) {
    for (const st of pentatonicSteps) {
      pool.push(baseOct + tonicClass + oct * 12 + st);
    }
  }
  const uniquePool = Array.from(new Set(pool)).sort((a, b) => a - b);
  if (direction === 'up') {
    const below = uniquePool.filter(m => m < targetMidi && m >= targetMidi - 17);
    notes.push(...below.slice(-count));
  } else {
    const above = uniquePool.filter(m => m > targetMidi && m <= targetMidi + 17).reverse();
    notes.push(...above.slice(-count));
  }
  return notes;
}

/**
 * Flattens a parsed MusoJianpuDocument into sequential timed musical events,
 * obeying repeats, voltas, Segno, Coda, D.C./D.S., Fine, chords, Pipa/Guzheng techniques, dashes ('-'), ties ('~'), and hairpins.
 */
export function buildErhuPlaybackTimeline(
  doc: MusoJianpuDocument,
  transposeSemitones: number = 0
): { events: ScheduledErhuEvent[]; totalBeats: number } {
  const allMeasures: MusoJianpuMeasure[] = [];
  for (const line of doc.lines) {
    if (line.kind !== 'music') continue;
    allMeasures.push(...line.measures);
  }

  const expandedMeasures = expandMeasurePlaybackOrder(allMeasures);
  const flatNotes: { note: MusoJianpuNote; measureIndex: number }[] = [];

  for (const { measure, measureIndex } of expandedMeasures) {
    for (const group of measure.groups) {
      for (const note of group.notes) {
        flatNotes.push({ note, measureIndex });
      }
    }
  }

  // Pre-compute note counts per hairpin span for smooth velocity ramps
  const hairpinTotals = new Map<number, number>();
  const hairpinSeen = new Map<number, number>();
  for (const { note } of flatNotes) {
    if (note.hairpinId !== undefined && note.degree >= 1 && note.degree <= 7) {
      hairpinTotals.set(note.hairpinId, (hairpinTotals.get(note.hairpinId) || 0) + 1);
    }
  }

  const events: ScheduledErhuEvent[] = [];
  let currentBeat = 0;
  let currentVelocity = 0.74;

  for (let i = 0; i < flatNotes.length; i++) {
    const { note, measureIndex } = flatNotes[i];

    if (note.markings.dynamic && DYNAMIC_VELOCITIES[note.markings.dynamic] !== undefined) {
      currentVelocity = DYNAMIC_VELOCITIES[note.markings.dynamic];
    }

    // Smoothly ramp velocity across crescendo/diminuendo hairpin passages
    let noteVelocity = currentVelocity;
    if (note.hairpinId !== undefined && note.hairpinType && note.degree >= 1 && note.degree <= 7) {
      const idx = hairpinSeen.get(note.hairpinId) || 0;
      hairpinSeen.set(note.hairpinId, idx + 1);
      const total = Math.max(1, hairpinTotals.get(note.hairpinId) || 1);
      const progress = total > 1 ? idx / (total - 1) : 1;
      const delta = 0.24 * progress;
      noteVelocity = note.hairpinType === 'cresc'
        ? Math.min(1.0, currentVelocity + delta)
        : Math.max(0.28, currentVelocity - delta);
      if (idx === total - 1) {
        currentVelocity = noteVelocity;
      }
    }

    // Calculate base duration in quarter-note beats
    const sh = note.markings.shakuhachi;
    const isFreeRhythm = doc.header.rhythmMode === 'free';
    let beats = 1 / Math.pow(2, note.underlines);
    if (note.dots === 1) beats *= 1.5;
    else if (note.dots === 2) beats *= 1.75;
    if (note.tupletStart === 3) beats *= (2 / 3);
    if (sh?.holdLength) {
      beats *= sh.holdLength;
    } else if (isFreeRhythm && note.underlines === 0 && note.degree !== -1) {
      beats *= 1.35; // Spacious contemplative Honkyoku base pulse
    }

    // Prolongation dash '-' extends previous pitched event by 1 beat
    if (note.degree === -1) {
      if (events.length > 0 && events[events.length - 1].midi !== null) {
        events[events.length - 1].durationBeats += beats;
      }
      currentBeat += beats;
      continue;
    }

    // Grace notes take a crisp slice just before the main note
    if (note.graceNotes.length > 0) {
      const graceDur = Math.min(0.14, (beats * 0.36) / note.graceNotes.length);
      for (const gn of note.graceNotes) {
        const gMidi = jianpuToMidi(gn.degree, gn.octave, gn.accidental, doc.header.key, transposeSemitones);
        if (gMidi !== null) {
          events.push({
            noteId: note.id,
            measureIndex,
            midi: gMidi,
            startBeat: currentBeat,
            durationBeats: graceDur,
            hasVibrato: false,
            isStaccato: false,
            isTremolo: false,
            isPizzicato: note.markings.bowing === 'pizz',
            velocity: noteVelocity * 0.85
          });
          currentBeat += graceDur;
          beats = Math.max(0.12, beats - graceDur);
        }
      }
    }

    // Compute chord or single-note MIDI pitches (including standalone pure Guqin/Shakuhachi degree === -2)
    const isGuqin = doc.header.instrument === 'guqin';
    const effectiveTranspose = transposeSemitones + (isGuqin ? -12 : 0);
    const jianzi = note.markings.jianzi;

    let chordMidis: number[] | undefined;
    let midi: number | null = null;
    if (note.degree === -2) {
      if (sh && sh.fingering) {
        midi = computeShakuhachiMidi(sh, doc.header.fluteKey, transposeSemitones);
      } else if (jianzi) {
        const computed = computeGuqinMidiFromJianzi(jianzi, transposeSemitones);
        if (computed.length >= 2) {
          chordMidis = computed;
          midi = computed[computed.length - 1];
        } else if (computed.length === 1) {
          midi = computed[0];
        }
      }
    } else if (note.chordPitches && note.chordPitches.length >= 2) {
      const mapped = note.chordPitches
        .map(p => jianpuToMidi(p.degree, p.octave, p.accidental, doc.header.key, effectiveTranspose))
        .filter((m): m is number => m !== null)
        .sort((a, b) => a - b); // Low-to-high for natural arpeggio/strum ordering
      if (mapped.length > 0) {
        chordMidis = mapped;
        midi = mapped[mapped.length - 1];
      }
    } else {
      midi = note.degree === 0
        ? null
        : jianpuToMidi(note.degree, note.octave, note.accidental, doc.header.key, effectiveTranspose);
    }

    const techs = note.markings.techniques || [];
    const jzActions = jianzi?.actions || [];
    const shBends = sh?.bends || [];
    const shTechs = sh?.techniques || [];
    const hasSu =
      note.markings.ornaments.includes('su') ||
      techs.includes('tuixian') ||
      techs.includes('an') ||
      jzActions.includes('shang') ||
      shBends.includes('suri-up');
    const hasSd =
      note.markings.ornaments.includes('sd') ||
      techs.includes('laxian') ||
      jzActions.includes('xia') ||
      shBends.includes('suri-down') ||
      shBends.includes('merikomi') ||
      shBends.includes('otoshi');

    const slideFromMidi = midi !== null
      ? (jzActions.includes('chuo') || shBends.includes('nayashi')
          ? midi - 2
          : jzActions.includes('zhu')
            ? midi + 2
            : undefined)
      : undefined;

    let slideTargetMidi: number | undefined;
    if (midi !== null) {
      if (sh?.bendTarget) {
        const targetComputed = computeShakuhachiMidi(
          { fingering: sh.bendTarget, register: sh.register },
          doc.header.fluteKey,
          transposeSemitones
        );
        slideTargetMidi = targetComputed ?? (hasSu ? midi + 2 : midi - 2);
      } else if (jianzi?.targetHui && jianzi.stringNum && (jzActions.includes('shang') || jzActions.includes('xia'))) {
        const targetComputed = computeGuqinMidiFromJianzi(
          { ...jianzi, soundType: 'an', hui: jianzi.targetHui, secondStringNum: undefined },
          transposeSemitones
        );
        slideTargetMidi = targetComputed[0] ?? (hasSu ? midi + 2 : midi - 2);
      } else if (shBends.includes('otoshi')) {
        slideTargetMidi = midi - 3;
      } else if (shBends.includes('merikomi')) {
        slideTargetMidi = midi - 1.5;
      } else {
        slideTargetMidi = hasSu ? midi + 2 : hasSd ? midi - 2 : undefined;
      }
    }

    const guqinSoundType: GuqinSoundType | undefined =
      jianzi?.soundType ||
      (isGuqin
        ? (note.markings.ornaments.includes('harm') || note.markings.ornaments.includes('aharm')
            ? 'fan'
            : 'san')
        : undefined);

    const isFermata = note.markings.ornaments.includes('fermata');
    let effectiveBeats = isFermata ? beats * 1.45 : beats;

    // Shakuhachi Atari / Uchi / Oshi fleeting articulation grace before main pitch
    if (
      midi !== null &&
      (shTechs.includes('atari') || shTechs.includes('uchi') || shTechs.includes('oshi')) &&
      note.graceNotes.length === 0
    ) {
      const ornDur = Math.min(0.06, effectiveBeats * 0.14);
      const ornOffset = shTechs.includes('oshi') ? 2 : -2;
      events.push({
        noteId: note.id,
        measureIndex,
        midi: midi + ornOffset,
        startBeat: currentBeat,
        durationBeats: ornDur,
        hasVibrato: false,
        isStaccato: false,
        isTremolo: false,
        isPizzicato: false,
        velocity: noteVelocity * 0.78
      });
      currentBeat += ornDur;
      effectiveBeats = Math.max(0.14, effectiveBeats - ornDur);
    }

    // Dizi/Xiao 叠音 (die) & 波音 (bo): inject a fleeting upper-neighbor ornament at attack
    if (midi !== null && (techs.includes('die') || techs.includes('bo')) && note.graceNotes.length === 0) {
      const ornDur = Math.min(0.08, effectiveBeats * 0.18);
      events.push({
        noteId: note.id,
        measureIndex,
        midi: midi + 2,
        startBeat: currentBeat,
        durationBeats: ornDur,
        hasVibrato: false,
        isStaccato: false,
        isTremolo: false,
        isPizzicato: false,
        velocity: noteVelocity * 0.86
      });
      currentBeat += ornDur;
      effectiveBeats = Math.max(0.12, effectiveBeats - ornDur);
    }

    // Reserve a short tail for optional trailing post-grace notes (后倚音) or Dizi/Xiao 赠音 (zeng)
    const postGraces = note.postGraceNotes || [];
    const hasImplicitZeng = midi !== null && techs.includes('zeng') && postGraces.length === 0;
    const totalPostCount = postGraces.length + (hasImplicitZeng ? 1 : 0);
    const postGraceDur = totalPostCount > 0
      ? Math.min(0.11, (effectiveBeats * 0.22) / totalPostCount)
      : 0;
    const totalPostDur = postGraceDur * totalPostCount;
    if (totalPostDur > 0) {
      effectiveBeats = Math.max(0.15, effectiveBeats - totalPostDur);
    }

    const arpeggio: 'up' | 'down' | 'roll' | undefined =
      techs.includes('arp') ? 'roll'
        : techs.includes('sao') ? 'up'
          : techs.includes('fu') ? 'down'
            : undefined;

    const glissMidis = midi !== null
      ? techs.includes('gua') || techs.includes('li') || techs.includes('feizhi')
        ? buildPentatonicGlissMidis(midi, 'up', techs.includes('li') ? 4 : 6)
        : techs.includes('guadown') || techs.includes('huazhi') || techs.includes('lidown')
          ? buildPentatonicGlissMidis(midi, 'down', techs.includes('huazhi') || techs.includes('lidown') ? 4 : 6)
          : undefined
      : undefined;

    const isFlutter = techs.includes('huashe') || shTechs.includes('tamane');
    const isMuraiki = shTechs.includes('muraiki');
    const isKorokoro = shTechs.includes('korokoro') || shTechs.includes('karakara');
    const isTremolo =
      note.markings.bowing === 'trem' ||
      techs.includes('lun') ||
      techs.includes('banlun') ||
      techs.includes('gun') ||
      techs.includes('yao') ||
      isFlutter;

    const isMuted = techs.includes('sha');
    const isDuo = techs.includes('duo');

    // Check if previous event was tied to this exact same pitch (and non-chord)
    const prev = events[events.length - 1];
    const prevFlat = i > 0 ? flatNotes[i - 1]?.note : null;
    if (prev && prevFlat?.tiedToNext && prev.midi !== null && prev.midi === midi && !chordMidis && !prev.chordMidis) {
      prev.durationBeats += effectiveBeats;
      currentBeat += effectiveBeats;
    } else {
      const hasShYuri =
        shTechs.includes('yuri') ||
        shTechs.includes('yokoyuri') ||
        shTechs.includes('tateyuri') ||
        shTechs.includes('mawashi');
      events.push({
        noteId: note.id,
        measureIndex,
        midi,
        chordMidis,
        startBeat: currentBeat,
        durationBeats: effectiveBeats,
        slideFromMidi,
        slideTargetMidi,
        hasVibrato:
          note.markings.ornaments.includes('vib') ||
          note.markings.ornaments.includes('pvib') ||
          techs.includes('qizhen') ||
          jzActions.includes('yin') ||
          jzActions.includes('nao') ||
          hasShYuri,
        isStaccato:
          note.markings.bowing === 'stacc' ||
          note.markings.bowing === 'spicc' ||
          isMuted ||
          isDuo ||
          shTechs.includes('kiri'),
        isTremolo: isTremolo || jianzi?.rightStroke === 'lun' || jianzi?.rightStroke === 'suo',
        isPizzicato: note.markings.bowing === 'pizz',
        isMuted,
        isFlutter,
        isMuraiki,
        isKorokoro,
        shakuhachiBends: shBends.length > 0 ? [...shBends] : undefined,
        guqinSoundType,
        arpeggio:
          arpeggio ||
          (jianzi?.rightStroke === 'gun' ? 'down' : jianzi?.rightStroke === 'fu' ? 'up' : undefined),
        glissMidis,
        velocity:
          note.markings.ornaments.includes('accent') || techs.includes('sao') || isDuo || isMuraiki
            ? Math.min(1.0, noteVelocity * 1.18)
            : noteVelocity
      });
      currentBeat += effectiveBeats;
      // Add organic breath space after explicit breath intake (息継ぎ) in free-rhythm Honkyoku
      if (shTechs.includes('breath') && midi !== null) {
        currentBeat += isFreeRhythm ? 0.55 : 0.15;
      }
    }

    if (postGraces.length > 0) {
      for (const pgn of postGraces) {
        const pgMidi = jianpuToMidi(pgn.degree, pgn.octave, pgn.accidental, doc.header.key, transposeSemitones);
        if (pgMidi !== null) {
          events.push({
            noteId: note.id,
            measureIndex,
            midi: pgMidi,
            startBeat: currentBeat,
            durationBeats: postGraceDur,
            hasVibrato: false,
            isStaccato: false,
            isTremolo: false,
            isPizzicato: note.markings.bowing === 'pizz',
            velocity: noteVelocity * 0.8
          });
          currentBeat += postGraceDur;
        }
      }
    } else if (hasImplicitZeng && midi !== null) {
      events.push({
        noteId: note.id,
        measureIndex,
        midi: midi + 2,
        startBeat: currentBeat,
        durationBeats: postGraceDur,
        hasVibrato: false,
        isStaccato: false,
        isTremolo: false,
        isPizzicato: false,
        velocity: noteVelocity * 0.72
      });
      currentBeat += postGraceDur;
    }
  }

  return { events, totalBeats: currentBeat };
}

/**
 * Multi-Instrument Tone.js Chinese Ensemble Synthesizer Player:
 * - Uses a 25ms lookahead Web Audio scheduler + instant output gate silencing so Stop is immediate (<15ms).
 * - Erhu (二胡): Expressive bowed resonator + vibrato + portamento + polyphonic double-stop support
 * - Pipa (琵琶): Woody pear-body plucked lute with zero sustain & rapid pluck-to-wood filter decay
 * - Guzheng (古筝): Shimmering silk-steel zither with long acoustic decay, 刮奏 glissando & 琶音 arpeggios
 * - Dizi (笛子): Pure singing bamboo flute with subtle dimo harmonic warmth, soft breath chiff & smooth 花舌 flutter tremolo
 * - Xiao (箫): Deep, mellow, hollow end-blown bamboo flute with gentle breathy swell & 气震音 vibrato
 */
export class MusoJianpuPlayer {
  private isPlayingState = false;
  private playSessionId = 0;
  private schedulerInterval: number | null = null;
  private timeouts: number[] = [];

  private bowedSynth: Tone.MonoSynth | null = null;
  private bowedPolySynth: Tone.PolySynth | null = null;
  private pipaSynth: Tone.PolySynth | null = null;
  private pipaBodyFilter: Tone.Filter | null = null;
  private guzhengSynth: Tone.PolySynth | null = null;
  private guqinOpenSynth: Tone.PolySynth | null = null;
  private guqinStoppedSynth: Tone.MonoSynth | null = null;
  private guqinHarmonicSynth: Tone.PolySynth | null = null;
  private guqinVibrato: Tone.Vibrato | null = null;
  private guqinBodyFilter: Tone.Filter | null = null;
  private diziSynth: Tone.MonoSynth | null = null;
  private diziFlutter: Tone.Tremolo | null = null;
  private xiaoSynth: Tone.MonoSynth | null = null;
  private shakuhachiSynth: Tone.MonoSynth | null = null;
  private shakuhachiVibrato: Tone.Vibrato | null = null;
  private shakuhachiFlutter: Tone.Tremolo | null = null;
  private shakuhachiBreath: Tone.NoiseSynth | null = null;
  private shakuhachiBreathFilter: Tone.Filter | null = null;
  private breathNoise: Tone.NoiseSynth | null = null;
  private breathFilter: Tone.Filter | null = null;
  private windVibrato: Tone.Vibrato | null = null;
  private windFilter: Tone.Filter | null = null;
  private pizzSynth: Tone.PluckSynth | null = null;
  private vibrato: Tone.Vibrato | null = null;
  private filter: Tone.Filter | null = null;
  private reverb: Tone.Reverb | null = null;
  private gain: Tone.Gain | null = null;

  private ensureAudioGraph() {
    if (this.bowedSynth) return;

    this.gain = new Tone.Gain(0.58).toDestination();
    this.reverb = new Tone.Reverb({ decay: 2.0, wet: 0.22 }).connect(this.gain);

    // Erhu wooden soundbox formant emphasis (~1.15kHz nasal warmth)
    this.filter = new Tone.Filter({
      type: 'peaking',
      frequency: 1150,
      Q: 1.8,
      gain: 5
    }).connect(this.reverb);

    this.vibrato = new Tone.Vibrato({
      frequency: 5.4,
      depth: 0.08,
      wet: 0.35
    }).connect(this.filter);

    this.bowedSynth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 2.2, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.065, decay: 0.12, sustain: 0.85, release: 0.22 },
      filterEnvelope: {
        attack: 0.06,
        decay: 0.15,
        sustain: 0.7,
        release: 0.2,
        baseFrequency: 420,
        octaves: 2.4
      }
    }).connect(this.vibrato);

    // Polyphonic bowed voice for chords & double-stops on Erhu
    this.bowedPolySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.06, decay: 0.15, sustain: 0.72, release: 0.24 }
    }).connect(this.vibrato);
    this.bowedPolySynth.volume.value = -5;

    // Pipa (琵琶): crisp nail-pluck attack decaying naturally into woody pear-body resonance (zero sustain!)
    this.pipaBodyFilter = new Tone.Filter({
      type: 'peaking',
      frequency: 460,
      Q: 1.2,
      gain: 4.5
    }).connect(this.reverb);

    this.pipaSynth = new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: {
        type: 'custom',
        partials: [1, 0.82, 0.52, 0.35, 0.22, 0.13, 0.07, 0.04]
      },
      filter: { Q: 1.2, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.003, decay: 0.52, sustain: 0.0, release: 0.22 },
      filterEnvelope: {
        attack: 0.002,
        decay: 0.11,
        sustain: 0.05,
        release: 0.14,
        baseFrequency: 460,
        octaves: 3.1
      }
    }).connect(this.pipaBodyFilter);
    this.pipaSynth.volume.value = -2;

    // Guzheng (古筝): warm, singing plucked zither with zero sustain & long resonant ring
    this.guzhengSynth = new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: {
        type: 'custom',
        partials: [1, 0.64, 0.34, 0.18, 0.1, 0.05, 0.02]
      },
      filter: { Q: 1.0, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.005, decay: 1.9, sustain: 0.0, release: 1.1 },
      filterEnvelope: {
        attack: 0.004,
        decay: 0.26,
        sustain: 0.1,
        release: 0.35,
        baseFrequency: 480,
        octaves: 3.0
      }
    }).connect(this.reverb);
    this.guzhengSynth.volume.value = -2;

    // Guqin (古琴) 3-timbre acoustic engine: 散音 (open warm silk), 按音 (stopped expressive glide), 泛音 (crystalline bell)
    this.guqinBodyFilter = new Tone.Filter({
      type: 'peaking',
      frequency: 260,
      Q: 1.1,
      gain: 4.5
    }).connect(this.reverb);

    this.guqinVibrato = new Tone.Vibrato({
      frequency: 4.1,
      depth: 0.085,
      wet: 0
    }).connect(this.guqinBodyFilter);

    // 散音 (Open string): deep, warm, lingering paulownia soundbox resonance
    this.guqinOpenSynth = new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: {
        type: 'custom',
        partials: [1, 0.48, 0.22, 0.1, 0.04, 0.015]
      },
      filter: { Q: 0.9, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.012, decay: 2.8, sustain: 0.0, release: 1.4 },
      filterEnvelope: {
        attack: 0.008,
        decay: 0.35,
        sustain: 0.08,
        release: 0.4,
        baseFrequency: 260,
        octaves: 2.5
      }
    }).connect(this.guqinBodyFilter);
    this.guqinOpenSynth.volume.value = -1;

    // 按音 (Stopped string): intimate singing fingerboard voice supporting 绰/注/上/下 glides and 吟/猱 vibrato
    this.guqinStoppedSynth = new Tone.MonoSynth({
      oscillator: {
        type: 'custom',
        partials: [1, 0.56, 0.28, 0.12, 0.05]
      },
      filter: { Q: 1.1, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.014, decay: 2.2, sustain: 0.02, release: 0.85 },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.28,
        sustain: 0.12,
        release: 0.3,
        baseFrequency: 310,
        octaves: 2.4
      }
    }).connect(this.guqinVibrato);
    this.guqinStoppedSynth.volume.value = -2;

    // 泛音 (Harmonics): pure crystalline bell overtone
    this.guqinHarmonicSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'custom',
        partials: [1, 0.14, 0.03]
      },
      envelope: { attack: 0.008, decay: 2.6, sustain: 0.0, release: 1.3 }
    }).connect(this.reverb);
    this.guqinHarmonicSynth.volume.value = -3;

    // Wind chain for Dizi (笛子) & Xiao (箫): warm lowpass (preserves strong fundamental!), subtle vibrato & flutter tremolo
    this.windFilter = new Tone.Filter({
      type: 'lowpass',
      frequency: 3400,
      Q: 0.7
    }).connect(this.reverb);

    this.windVibrato = new Tone.Vibrato({
      frequency: 5.1,
      depth: 0.065,
      wet: 0.22
    }).connect(this.windFilter);

    this.diziFlutter = new Tone.Tremolo({
      frequency: 17,
      depth: 0.58,
      wet: 0
    }).connect(this.windVibrato).start();

    // Dizi (笛子): pure bamboo fundamental + delicate dimo reed-membrane upper harmonics (never harsh FM/bandpass!)
    this.diziSynth = new Tone.MonoSynth({
      oscillator: {
        type: 'custom',
        partials: [1, 0.42, 0.24, 0.12, 0.06, 0.03]
      },
      filter: { Q: 0.8, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.036, decay: 0.1, sustain: 0.86, release: 0.2 },
      filterEnvelope: {
        attack: 0.03,
        decay: 0.12,
        sustain: 0.8,
        release: 0.18,
        baseFrequency: 1350,
        octaves: 1.6
      }
    }).connect(this.diziFlutter);
    this.diziSynth.volume.value = -3;

    // Xiao (箫): warm, hollow, contemplative vertical bamboo flute
    this.xiaoSynth = new Tone.MonoSynth({
      oscillator: {
        type: 'custom',
        partials: [1, 0.2, 0.06, 0.02]
      },
      filter: { Q: 0.7, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.08, decay: 0.16, sustain: 0.82, release: 0.34 },
      filterEnvelope: {
        attack: 0.08,
        decay: 0.18,
        sustain: 0.68,
        release: 0.28,
        baseFrequency: 620,
        octaves: 1.4
      }
    }).connect(this.windVibrato);
    this.xiaoSynth.volume.value = -2;

    // Delicate airy breath chiff for Dizi / Xiao attacks
    this.breathFilter = new Tone.Filter({
      type: 'bandpass',
      frequency: 2400,
      Q: 1.4
    }).connect(this.reverb);

    this.breathNoise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.015, decay: 0.055, sustain: 0.0, release: 0.03 }
    }).connect(this.breathFilter);
    this.breathNoise.volume.value = -26;

    // Shakuhachi (尺八): rich hollow end-blown bamboo flute + expressive yuri vibrato + utaguchi wind rush (ムラ息)
    this.shakuhachiVibrato = new Tone.Vibrato({
      frequency: 4.3,
      depth: 0.11,
      wet: 0.18
    }).connect(this.reverb);

    this.shakuhachiFlutter = new Tone.Tremolo({
      frequency: 15.5,
      depth: 0.52,
      wet: 0
    }).connect(this.shakuhachiVibrato).start();

    this.shakuhachiSynth = new Tone.MonoSynth({
      oscillator: {
        type: 'custom',
        partials: [1, 0.34, 0.15, 0.06, 0.025, 0.01]
      },
      filter: { Q: 1.0, type: 'lowpass', rolloff: -12 },
      envelope: { attack: 0.095, decay: 0.18, sustain: 0.84, release: 0.42 },
      filterEnvelope: {
        attack: 0.1,
        decay: 0.22,
        sustain: 0.72,
        release: 0.35,
        baseFrequency: 560,
        octaves: 1.85
      }
    }).connect(this.shakuhachiFlutter);
    this.shakuhachiSynth.volume.value = -2;

    // Utaguchi edge-tone bamboo breath layer (gentle normally, dramatic for Muraiki ムラ息)
    this.shakuhachiBreathFilter = new Tone.Filter({
      type: 'bandpass',
      frequency: 1850,
      Q: 1.25
    }).connect(this.reverb);

    this.shakuhachiBreath = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.04, decay: 0.28, sustain: 0.18, release: 0.25 }
    }).connect(this.shakuhachiBreathFilter);
    this.shakuhachiBreath.volume.value = -22;

    this.pizzSynth = new Tone.PluckSynth({
      attackNoise: 1.2,
      dampening: 3200,
      resonance: 0.92
    }).connect(this.reverb);
  }

  private triggerEvent(
    ev: ScheduledErhuEvent,
    instrument: InstrumentType,
    toneTime: number,
    durSec: number
  ) {
    if (ev.midi === null) return;
    const playDur = ev.isStaccato ? Math.min(durSec * 0.42, 0.16) : Math.max(0.05, durSec * 0.94);

    // Guqin (古琴) 3-Timbre Playback: 散音 (open), 按音 (stopped + 绰/注/上/下/吟/猱), 泛音 (crystalline harmonic)
    if (instrument === 'guqin') {
      const pitchList = ev.chordMidis && ev.chordMidis.length > 0 ? [...ev.chordMidis] : [ev.midi];
      const soundType: GuqinSoundType = ev.guqinSoundType || 'san';

      if (soundType === 'fan' && this.guqinHarmonicSynth) {
        const freqs = pitchList.map(m => Tone.Frequency(m, 'midi').toFrequency());
        this.guqinHarmonicSynth.triggerAttackRelease(freqs, Math.max(0.55, playDur), toneTime, ev.velocity * 0.85);
        return;
      }

      if (soundType === 'an' && pitchList.length === 1 && this.guqinStoppedSynth) {
        const targetFreq = Tone.Frequency(ev.midi, 'midi').toFrequency();
        const startFreq = ev.slideFromMidi !== undefined
          ? Tone.Frequency(ev.slideFromMidi, 'midi').toFrequency()
          : targetFreq;

        if (this.guqinVibrato) {
          this.guqinVibrato.wet.setValueAtTime(ev.hasVibrato ? 0.65 : 0.08, toneTime);
        }
        this.guqinStoppedSynth.portamento = 0.015;
        this.guqinStoppedSynth.triggerAttackRelease(startFreq, Math.max(0.35, playDur), toneTime, ev.velocity);

        if (ev.slideFromMidi !== undefined) {
          this.guqinStoppedSynth.frequency.exponentialRampToValueAtTime(
            targetFreq,
            toneTime + Math.min(0.18, playDur * 0.34)
          );
        }
        if (ev.slideTargetMidi !== undefined) {
          const slideOutFreq = Tone.Frequency(ev.slideTargetMidi, 'midi').toFrequency();
          const glideStart = toneTime + Math.min(0.24, playDur * 0.4);
          this.guqinStoppedSynth.frequency.setValueAtTime(targetFreq, glideStart);
          this.guqinStoppedSynth.frequency.exponentialRampToValueAtTime(
            slideOutFreq,
            toneTime + playDur * 0.85
          );
        }
        return;
      }

      if (this.guqinOpenSynth) {
        const ordered = ev.arpeggio === 'down' ? [...pitchList].reverse() : pitchList;
        const freqs = ordered.map(m => Tone.Frequency(m, 'midi').toFrequency());
        this.guqinOpenSynth.triggerAttackRelease(freqs, Math.max(0.5, playDur), toneTime, ev.velocity);
      }
      return;
    }

    // Shakuhachi (尺八) Expressive Bamboo Playback: Nayashi bloom, Yuri, Muraiki wind rush, Korokoro warble, Merikomi/Otoshi glides
    if (instrument === 'shakuhachi' && this.shakuhachiSynth) {
      const targetFreq = Tone.Frequency(ev.midi, 'midi').toFrequency();
      const startFreq = ev.slideFromMidi !== undefined
        ? Tone.Frequency(ev.slideFromMidi, 'midi').toFrequency()
        : targetFreq;

      if (this.shakuhachiVibrato) {
        this.shakuhachiVibrato.wet.setValueAtTime(ev.hasVibrato ? 0.72 : 0.14, toneTime);
      }
      if (this.shakuhachiFlutter) {
        this.shakuhachiFlutter.wet.setValueAtTime(ev.isFlutter ? 0.92 : 0, toneTime);
      }

      // Breath / Muraiki utaguchi wind noise burst
      if (this.shakuhachiBreath) {
        if (this.shakuhachiBreathFilter) {
          this.shakuhachiBreathFilter.frequency.setValueAtTime(
            ev.isMuraiki ? 1450 : 2100,
            toneTime
          );
        }
        const breathDur = ev.isMuraiki ? Math.min(playDur * 0.85, 0.75) : Math.min(0.18, playDur * 0.4);
        const breathVel = ev.isMuraiki ? Math.min(1.0, ev.velocity * 1.45) : ev.velocity * 0.38;
        this.shakuhachiBreath.volume.setValueAtTime(ev.isMuraiki ? -11 : -24, toneTime);
        this.shakuhachiBreath.triggerAttackRelease(breathDur, toneTime, breathVel);
      }

      // Korokoro / Karakara characteristic rapid bamboo finger warble
      if (ev.isKorokoro && playDur >= 0.24) {
        const subDur = 0.085;
        const count = Math.min(10, Math.max(3, Math.floor(playDur / subDur)));
        const altFreq = Tone.Frequency(ev.midi - 2, 'midi').toFrequency();
        this.shakuhachiSynth.portamento = 0.008;
        for (let k = 0; k < count; k++) {
          const t = toneTime + k * subDur;
          const f = k % 2 === 0 ? targetFreq : altFreq;
          this.shakuhachiSynth.triggerAttackRelease(f, subDur * 0.92, t, ev.velocity * (k % 2 === 0 ? 0.92 : 0.78));
        }
        return;
      }

      this.shakuhachiSynth.portamento = 0.025;
      this.shakuhachiSynth.triggerAttackRelease(startFreq, Math.max(0.12, playDur), toneTime, ev.velocity);

      // Nayashi (萎し): bloom smoothly upward from meri into target pitch
      if (ev.slideFromMidi !== undefined) {
        this.shakuhachiSynth.frequency.exponentialRampToValueAtTime(
          targetFreq,
          toneTime + Math.min(0.42, playDur * 0.36)
        );
      }

      // Sori (反り): subtle upward scoop then settle back
      if (ev.shakuhachiBends?.includes('sori')) {
        const scoopFreq = Tone.Frequency(ev.midi + 1.5, 'midi').toFrequency();
        this.shakuhachiSynth.frequency.exponentialRampToValueAtTime(scoopFreq, toneTime + playDur * 0.35);
        this.shakuhachiSynth.frequency.exponentialRampToValueAtTime(targetFreq, toneTime + playDur * 0.72);
      }

      // Suri / Merikomi / Otoshi tail glide
      if (ev.slideTargetMidi !== undefined) {
        const slideOutFreq = Tone.Frequency(ev.slideTargetMidi, 'midi').toFrequency();
        const isOtoshi = ev.shakuhachiBends?.includes('otoshi');
        const glideStart = toneTime + (isOtoshi ? playDur * 0.68 : Math.min(0.45, playDur * 0.48));
        this.shakuhachiSynth.frequency.setValueAtTime(targetFreq, glideStart);
        this.shakuhachiSynth.frequency.exponentialRampToValueAtTime(
          slideOutFreq,
          toneTime + playDur * 0.94
        );
      }
      return;
    }

    // Dizi (笛子) & Xiao (箫) Wind Playback
    if (instrument === 'dizi' || instrument === 'xiao') {
      const windVoice = instrument === 'dizi' ? this.diziSynth : this.xiaoSynth;
      if (!windVoice) return;

      if (this.windFilter) {
        this.windFilter.frequency.setValueAtTime(instrument === 'dizi' ? 3500 : 1700, toneTime);
      }

      // Rapid 历音 / 飞指 scale run lead-in on bamboo flute
      let mainStart = toneTime;
      let mainDur = playDur;
      if (ev.glissMidis && ev.glissMidis.length > 0) {
        const stepSec = Math.min(0.036, (playDur * 0.32) / ev.glissMidis.length);
        ev.glissMidis.forEach((gm, gIdx) => {
          const gFreq = Tone.Frequency(gm, 'midi').toFrequency();
          windVoice.triggerAttackRelease(gFreq, stepSec * 0.95, toneTime + gIdx * stepSec, ev.velocity * 0.72);
        });
        const runTotal = ev.glissMidis.length * stepSec;
        mainStart = toneTime + runTotal;
        mainDur = Math.max(0.05, playDur - runTotal);
      }

      const freq = Tone.Frequency(ev.midi, 'midi').toFrequency();

      // Smooth flutter-tongue tremolo on Dizi (花舌) instead of harsh clicky retriggers
      if (this.diziFlutter) {
        this.diziFlutter.wet.setValueAtTime(ev.isFlutter || ev.isTremolo ? 0.95 : 0, mainStart);
      }
      if (this.windVibrato) {
        this.windVibrato.wet.setValueAtTime(
          ev.hasVibrato ? 0.78 : (instrument === 'xiao' ? 0.24 : 0.18),
          mainStart
        );
      }
      if (this.breathNoise && mainDur >= 0.12) {
        if (this.breathFilter) {
          this.breathFilter.frequency.setValueAtTime(instrument === 'dizi' ? 2600 : 1500, mainStart);
        }
        this.breathNoise.triggerAttackRelease(0.05, mainStart, ev.velocity * (instrument === 'dizi' ? 0.65 : 0.45));
      }

      windVoice.portamento = ev.slideTargetMidi !== undefined ? 0.085 : 0.012;
      windVoice.triggerAttackRelease(freq, mainDur, mainStart, ev.velocity);
      if (ev.slideTargetMidi !== undefined) {
        const slideFreq = Tone.Frequency(ev.slideTargetMidi, 'midi').toFrequency();
        windVoice.frequency.exponentialRampToValueAtTime(slideFreq, mainStart + mainDur * 0.75);
      }
      return;
    }

    // Optional Guzheng/Pipa glissando lead-in (刮奏 / 花指)
    if (ev.glissMidis && ev.glissMidis.length > 0) {
      const glissVoice = instrument === 'pipa' ? this.pipaSynth : this.guzhengSynth;
      if (glissVoice) {
        const stepSec = Math.min(0.032, (durSec * 0.35) / ev.glissMidis.length);
        ev.glissMidis.forEach((gm, gIdx) => {
          const gFreq = Tone.Frequency(gm, 'midi').toFrequency();
          glissVoice.triggerAttackRelease(gFreq, 0.28, toneTime + gIdx * stepSec, ev.velocity * 0.65);
        });
      }
    }

    // Plucked instruments (Pipa & Guzheng)
    if (instrument === 'pipa' || instrument === 'guzheng') {
      const voice = instrument === 'pipa' ? this.pipaSynth : this.guzhengSynth;
      if (!voice) return;

      const pitchList = ev.chordMidis && ev.chordMidis.length > 0 ? [...ev.chordMidis] : [ev.midi];
      if (ev.arpeggio === 'down') pitchList.reverse();
      const staggerSec = ev.arpeggio === 'roll' ? 0.042 : ev.arpeggio ? 0.022 : 0;

      if (ev.isTremolo) {
        // Rapid 轮指 / 滚 (Pipa) or 摇指 (Guzheng)
        const subDur = instrument === 'pipa' ? 0.072 : 0.082;
        const count = Math.max(2, Math.floor(playDur / subDur));
        const freqs = pitchList.map(m => Tone.Frequency(m, 'midi').toFrequency());
        for (let k = 0; k < count; k++) {
          const t = toneTime + k * subDur;
          voice.triggerAttackRelease(freqs, subDur * 0.85, t, ev.velocity * (k % 2 === 0 ? 0.85 : 0.72));
        }
      } else if (staggerSec > 0 && pitchList.length > 1) {
        pitchList.forEach((m, pIdx) => {
          const f = Tone.Frequency(m, 'midi').toFrequency();
          const noteDur = ev.isMuted ? 0.045 : Math.max(0.2, playDur - pIdx * staggerSec);
          voice.triggerAttackRelease(f, noteDur, toneTime + pIdx * staggerSec, ev.velocity * 0.88);
        });
      } else {
        const freqs = pitchList.map(m => Tone.Frequency(m, 'midi').toFrequency());
        const noteDur = ev.isMuted ? 0.045 : (instrument === 'guzheng' ? Math.max(0.32, playDur) : Math.max(0.18, playDur));
        voice.triggerAttackRelease(freqs, noteDur, toneTime, ev.velocity);
      }
      return;
    }

    // Erhu playback (mono expressive voice for single notes, polyphonic bowed voice for chords/double-stops)
    if (ev.chordMidis && ev.chordMidis.length >= 2) {
      if (this.bowedPolySynth) {
        const ordered = ev.arpeggio === 'down' ? [...ev.chordMidis].reverse() : ev.chordMidis;
        const staggerSec = ev.arpeggio ? 0.035 : 0;
        if (staggerSec > 0) {
          ordered.forEach((m, pIdx) => {
            const f = Tone.Frequency(m, 'midi').toFrequency();
            this.bowedPolySynth!.triggerAttackRelease(f, Math.max(0.1, playDur - pIdx * staggerSec), toneTime + pIdx * staggerSec, ev.velocity * 0.85);
          });
        } else {
          const freqs = ordered.map(m => Tone.Frequency(m, 'midi').toFrequency());
          this.bowedPolySynth.triggerAttackRelease(freqs, playDur, toneTime, ev.velocity * 0.85);
        }
      }
      return;
    }

    const freq = Tone.Frequency(ev.midi, 'midi').toFrequency();
    if (ev.isPizzicato && this.pizzSynth) {
      this.pizzSynth.triggerAttack(freq, toneTime);
    } else if (this.bowedSynth) {
      if (ev.isTremolo) {
        const subDur = 0.09;
        const count = Math.max(2, Math.floor(playDur / subDur));
        for (let k = 0; k < count; k++) {
          this.bowedSynth.triggerAttackRelease(freq, subDur * 0.85, toneTime + k * subDur, ev.velocity * (k % 2 === 0 ? 1 : 0.82));
        }
      } else {
        this.bowedSynth.portamento = ev.slideTargetMidi !== undefined ? 0.08 : 0.015;
        if (this.vibrato) {
          this.vibrato.wet.setValueAtTime(ev.hasVibrato ? 0.85 : 0.22, toneTime);
        }
        this.bowedSynth.triggerAttackRelease(freq, playDur, toneTime, ev.velocity);
        if (ev.slideTargetMidi !== undefined) {
          const slideFreq = Tone.Frequency(ev.slideTargetMidi, 'midi').toFrequency();
          this.bowedSynth.frequency.exponentialRampToValueAtTime(slideFreq, toneTime + playDur * 0.78);
        }
      }
    }
  }

  async play(
    doc: MusoJianpuDocument,
    options: {
      tempoOverride?: number;
      transposeSemitones?: number;
      onNoteActive?: (noteId: string | null, measureIndex: number | null) => void;
      onComplete?: () => void;
    } = {}
  ) {
    this.stop();
    const sessionId = ++this.playSessionId;
    await Tone.start();
    if (sessionId !== this.playSessionId) return;

    this.ensureAudioGraph();
    if (this.gain) {
      const now = Tone.now();
      this.gain.gain.cancelScheduledValues(now);
      this.gain.gain.setValueAtTime(0.58, now);
    }

    const instrument: InstrumentType = doc.header.instrument || 'erhu';
    const bpm = options.tempoOverride || doc.header.tempo || 80;
    const secPerBeat = 60 / bpm;
    const { events, totalBeats } = buildErhuPlaybackTimeline(doc, options.transposeSemitones || 0);

    if (events.length === 0) {
      options.onComplete?.();
      return;
    }

    this.isPlayingState = true;
    const baseNow = Tone.now() + 0.06;
    const LOOKAHEAD_SEC = 0.095;
    let nextIdx = 0;

    const pump = () => {
      if (!this.isPlayingState || sessionId !== this.playSessionId) return;
      const now = Tone.now();
      const horizon = now + LOOKAHEAD_SEC;

      while (nextIdx < events.length) {
        const ev = events[nextIdx];
        const eventToneTime = baseNow + ev.startBeat * secPerBeat;
        if (eventToneTime > horizon) break;

        const durSec = Math.max(0.06, ev.durationBeats * secPerBeat);
        const safeToneTime = Math.max(now + 0.004, eventToneTime);
        this.triggerEvent(ev, instrument, safeToneTime, durSec);

        const uiDelayMs = Math.max(0, (safeToneTime - now) * 1000);
        const uiTimer = window.setTimeout(() => {
          if (!this.isPlayingState || sessionId !== this.playSessionId) return;
          options.onNoteActive?.(ev.noteId, ev.measureIndex);
        }, uiDelayMs);
        this.timeouts.push(uiTimer);

        nextIdx++;
      }

      if (nextIdx >= events.length) {
        if (this.schedulerInterval !== null) {
          window.clearInterval(this.schedulerInterval);
          this.schedulerInterval = null;
        }
        const remainingMs = Math.max(80, (baseNow + totalBeats * secPerBeat - Tone.now() + 0.35) * 1000);
        const endTimer = window.setTimeout(() => {
          if (!this.isPlayingState || sessionId !== this.playSessionId) return;
          this.isPlayingState = false;
          options.onNoteActive?.(null, null);
          options.onComplete?.();
        }, remainingMs);
        this.timeouts.push(endTimer);
      }
    };

    pump();
    if (nextIdx < events.length) {
      this.schedulerInterval = window.setInterval(pump, 25);
    }
  }

  stop() {
    this.isPlayingState = false;
    this.playSessionId++;
    if (this.schedulerInterval !== null) {
      window.clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    for (const id of this.timeouts) {
      window.clearTimeout(id);
    }
    this.timeouts = [];
    try {
      const now = Tone.now();
      // Instant click-free mute so no lingering lookahead note (<95ms) or release tail plays after Stop
      if (this.gain) {
        this.gain.gain.cancelScheduledValues(now);
        this.gain.gain.setTargetAtTime(0, now, 0.005);
      }
      this.bowedSynth?.frequency.cancelScheduledValues(now);
      this.guqinStoppedSynth?.frequency.cancelScheduledValues(now);
      this.diziSynth?.frequency.cancelScheduledValues(now);
      this.xiaoSynth?.frequency.cancelScheduledValues(now);
      this.shakuhachiSynth?.frequency.cancelScheduledValues(now);
      this.bowedSynth?.triggerRelease(now);
      this.bowedPolySynth?.releaseAll(now);
      this.pipaSynth?.releaseAll(now);
      this.guzhengSynth?.releaseAll(now);
      this.guqinOpenSynth?.releaseAll(now);
      this.guqinStoppedSynth?.triggerRelease(now);
      this.guqinHarmonicSynth?.releaseAll(now);
      this.diziSynth?.triggerRelease(now);
      this.xiaoSynth?.triggerRelease(now);
      this.shakuhachiSynth?.triggerRelease(now);
      this.shakuhachiBreath?.triggerRelease(now);
      this.breathNoise?.triggerRelease(now);
    } catch {
      // ignore if not triggered
    }
  }

  dispose() {
    this.stop();
    try {
      this.bowedSynth?.dispose();
      this.bowedPolySynth?.dispose();
      this.pipaSynth?.dispose();
      this.pipaBodyFilter?.dispose();
      this.guzhengSynth?.dispose();
      this.guqinOpenSynth?.dispose();
      this.guqinStoppedSynth?.dispose();
      this.guqinHarmonicSynth?.dispose();
      this.guqinVibrato?.dispose();
      this.guqinBodyFilter?.dispose();
      this.diziSynth?.dispose();
      this.diziFlutter?.dispose();
      this.xiaoSynth?.dispose();
      this.shakuhachiSynth?.dispose();
      this.shakuhachiVibrato?.dispose();
      this.shakuhachiFlutter?.dispose();
      this.shakuhachiBreath?.dispose();
      this.shakuhachiBreathFilter?.dispose();
      this.breathNoise?.dispose();
      this.breathFilter?.dispose();
      this.windVibrato?.dispose();
      this.windFilter?.dispose();
      this.pizzSynth?.dispose();
      this.vibrato?.dispose();
      this.filter?.dispose();
      this.reverb?.dispose();
      this.gain?.dispose();
    } catch {
      // ignore
    }
    this.bowedSynth = null;
    this.bowedPolySynth = null;
    this.pipaSynth = null;
    this.pipaBodyFilter = null;
    this.guzhengSynth = null;
    this.guqinOpenSynth = null;
    this.guqinStoppedSynth = null;
    this.guqinHarmonicSynth = null;
    this.guqinVibrato = null;
    this.guqinBodyFilter = null;
    this.diziSynth = null;
    this.diziFlutter = null;
    this.xiaoSynth = null;
    this.shakuhachiSynth = null;
    this.shakuhachiVibrato = null;
    this.shakuhachiFlutter = null;
    this.shakuhachiBreath = null;
    this.shakuhachiBreathFilter = null;
    this.breathNoise = null;
    this.breathFilter = null;
    this.windVibrato = null;
    this.windFilter = null;
    this.pizzSynth = null;
    this.vibrato = null;
    this.filter = null;
    this.reverb = null;
    this.gain = null;
  }
}

/**
 * Encodes a variable-length quantity (VLQ) for Standard MIDI File tracks.
 */
function encodeVLQ(value: number): number[] {
  let v = Math.max(0, Math.round(value));
  const bytes: number[] = [v & 0x7f];
  v >>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return bytes;
}

/**
 * Generates a real binary Standard MIDI File (.mid) Blob URL from a parsed MusoJianpuDocument,
 * supporting polyphonic chords, arpeggios, repeats/navigation, and instrument GM programs
 * (110 = Erhu/Fiddle, 105 = Pipa, 107 = Guzheng/Koto).
 */
export function generateMidiForMusoJianpu(doc: MusoJianpuDocument, transposeSemitones: number = 0): string | null {
  try {
    const { events } = buildErhuPlaybackTimeline(doc, transposeSemitones);
    if (events.length === 0) return null;

    const tpq = 480; // ticks per quarter note
    const bpm = doc.header.tempo || 80;
    const microsecPerBeat = Math.round(60_000_000 / bpm);

    const track: number[] = [];

    track.push(
      0x00, 0xff, 0x51, 0x03,
      (microsecPerBeat >> 16) & 0xff,
      (microsecPerBeat >> 8) & 0xff,
      microsecPerBeat & 0xff
    );

    const [numStr, denStr] = (doc.header.time || '4/4').split('/');
    const num = Math.max(1, parseInt(numStr, 10) || 4);
    const den = Math.max(1, parseInt(denStr, 10) || 4);
    const denPow = Math.round(Math.log2(den));
    track.push(0x00, 0xff, 0x58, 0x04, num, denPow, 24, 8);

    // Program Change on Channel 0 based on instrument (GM 77 = Shakuhachi!)
    const gmProgram = doc.header.instrument === 'pipa'
      ? 105
      : doc.header.instrument === 'guzheng'
        ? 107
        : doc.header.instrument === 'guqin'
          ? 24
          : doc.header.instrument === 'dizi'
            ? 73
            : doc.header.instrument === 'xiao' || doc.header.instrument === 'shakuhachi'
              ? 77
              : 110;
    track.push(0x00, 0xc0, gmProgram);

    interface RawMsg {
      tick: number;
      bytes: number[];
    }
    const msgs: RawMsg[] = [];

    for (const ev of events) {
      if (ev.midi === null) continue;
      const startTick = Math.round(ev.startBeat * tpq);
      const durRatio = ev.isStaccato ? 0.5 : 0.94;
      const endTick = Math.max(startTick + 20, Math.round((ev.startBeat + ev.durationBeats * durRatio) * tpq));
      const vel = Math.max(20, Math.min(127, Math.round(ev.velocity * 115)));

      const pitchList = ev.chordMidis && ev.chordMidis.length > 0 ? [...ev.chordMidis] : [ev.midi];
      if (ev.arpeggio === 'down') pitchList.reverse();
      const staggerTicks = ev.arpeggio === 'roll' ? 32 : ev.arpeggio ? 18 : 0;

      pitchList.forEach((m, idx) => {
        const noteStart = startTick + idx * staggerTicks;
        const noteEnd = Math.max(noteStart + 20, endTick);
        msgs.push({ tick: noteStart, bytes: [0x90, m, vel] });
        msgs.push({ tick: noteEnd, bytes: [0x80, m, 0] });
      });
    }

    msgs.sort((a, b) => a.tick - b.tick);

    let lastTick = 0;
    for (const msg of msgs) {
      const delta = Math.max(0, msg.tick - lastTick);
      track.push(...encodeVLQ(delta), ...msg.bytes);
      lastTick = msg.tick;
    }

    track.push(0x00, 0xff, 0x2f, 0x00);

    const header = [
      0x4d, 0x54, 0x68, 0x64,
      0x00, 0x00, 0x00, 0x06,
      0x00, 0x00,
      0x00, 0x01,
      (tpq >> 8) & 0xff, tpq & 0xff
    ];

    const trackLen = track.length;
    const trackHeader = [
      0x4d, 0x54, 0x72, 0x6b,
      (trackLen >>> 24) & 0xff,
      (trackLen >>> 16) & 0xff,
      (trackLen >>> 8) & 0xff,
      trackLen & 0xff
    ];

    const midiBytes = new Uint8Array([...header, ...trackHeader, ...track]);
    const blob = new Blob([midiBytes], { type: 'audio/midi' });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('Failed to generate MusoJianpu MIDI:', err);
    return null;
  }
}
