/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { MusoJianpuDocument, MusoJianpuNote } from './types.ts';
import { jianpuToMidi } from './erhuKeys.ts';

export interface ScheduledErhuEvent {
  noteId: string;
  measureIndex: number;
  midi: number | null; // null = rest
  startBeat: number;
  durationBeats: number;
  slideTargetMidi?: number;
  hasVibrato: boolean;
  isStaccato: boolean;
  isTremolo: boolean;
  isPizzicato: boolean;
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
 * Flattens a parsed MusoJianpuDocument into sequential timed musical events,
 * combining prolongation dashes ('-') and ties ('~') into accurate note durations.
 */
export function buildErhuPlaybackTimeline(
  doc: MusoJianpuDocument,
  transposeSemitones: number = 0
): { events: ScheduledErhuEvent[]; totalBeats: number } {
  const flatNotes: { note: MusoJianpuNote; measureIndex: number }[] = [];
  let measureIdx = 0;

  for (const line of doc.lines) {
    if (line.kind !== 'music') continue;
    for (const measure of line.measures) {
      for (const group of measure.groups) {
        for (const note of group.notes) {
          flatNotes.push({ note, measureIndex: measureIdx });
        }
      }
      measureIdx++;
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

    // Calculate base duration in quarter-note beats
    let beats = 1 / Math.pow(2, note.underlines);
    if (note.dots === 1) beats *= 1.5;
    else if (note.dots === 2) beats *= 1.75;
    if (note.tupletStart === 3) beats *= (2 / 3);

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
            velocity: currentVelocity * 0.85
          });
          currentBeat += graceDur;
          beats = Math.max(0.12, beats - graceDur);
        }
      }
    }

    const midi = note.degree === 0
      ? null
      : jianpuToMidi(note.degree, note.octave, note.accidental, doc.header.key, transposeSemitones);

    const hasSu = note.markings.ornaments.includes('su');
    const hasSd = note.markings.ornaments.includes('sd');
    const slideTargetMidi = midi !== null
      ? (hasSu ? midi + 2 : hasSd ? midi - 2 : undefined)
      : undefined;

    const isFermata = note.markings.ornaments.includes('fermata');
    let effectiveBeats = isFermata ? beats * 1.45 : beats;

    // Reserve a short tail for optional trailing post-grace notes (后倚音)
    const postGraces = note.postGraceNotes || [];
    const postGraceDur = postGraces.length > 0
      ? Math.min(0.12, (effectiveBeats * 0.25) / postGraces.length)
      : 0;
    const totalPostDur = postGraceDur * postGraces.length;
    if (totalPostDur > 0) {
      effectiveBeats = Math.max(0.15, effectiveBeats - totalPostDur);
    }

    // Check if previous event was tied to this exact same pitch
    const prev = events[events.length - 1];
    const prevFlat = i > 0 ? flatNotes[i - 1]?.note : null;
    if (prev && prevFlat?.tiedToNext && prev.midi !== null && prev.midi === midi) {
      prev.durationBeats += effectiveBeats;
      currentBeat += effectiveBeats;
    } else {
      events.push({
        noteId: note.id,
        measureIndex,
        midi,
        startBeat: currentBeat,
        durationBeats: effectiveBeats,
        slideTargetMidi,
        hasVibrato: note.markings.ornaments.includes('vib') || note.markings.ornaments.includes('pvib'),
        isStaccato: note.markings.bowing === 'stacc' || note.markings.bowing === 'spicc',
        isTremolo: note.markings.bowing === 'trem',
        isPizzicato: note.markings.bowing === 'pizz',
        velocity: note.markings.ornaments.includes('accent')
          ? Math.min(1.0, currentVelocity * 1.18)
          : currentVelocity
      });
      currentBeat += effectiveBeats;
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
            velocity: currentVelocity * 0.8
          });
          currentBeat += postGraceDur;
        }
      }
    }
  }

  return { events, totalBeats: currentBeat };
}

/**
 * Expressive Tone.js Erhu Synthesizer Player (bowed resonator tone + vibrato + portamento slides)
 */
export class MusoJianpuPlayer {
  private isPlayingState = false;
  private timeouts: number[] = [];
  private bowedSynth: Tone.MonoSynth | null = null;
  private pizzSynth: Tone.PluckSynth | null = null;
  private vibrato: Tone.Vibrato | null = null;
  private filter: Tone.Filter | null = null;
  private reverb: Tone.Reverb | null = null;
  private gain: Tone.Gain | null = null;

  private ensureAudioGraph() {
    if (this.bowedSynth) return;

    this.gain = new Tone.Gain(0.55).toDestination();
    this.reverb = new Tone.Reverb({ decay: 1.8, wet: 0.22 }).connect(this.gain);
    // Wooden soundbox formant emphasis (~1.1kHz nasal Erhu warmth)
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
      filter: {
        Q: 2.2,
        type: 'lowpass',
        rolloff: -12
      },
      envelope: {
        attack: 0.065,
        decay: 0.12,
        sustain: 0.85,
        release: 0.22
      },
      filterEnvelope: {
        attack: 0.06,
        decay: 0.15,
        sustain: 0.7,
        release: 0.2,
        baseFrequency: 420,
        octaves: 2.4
      }
    }).connect(this.vibrato);

    this.pizzSynth = new Tone.PluckSynth({
      attackNoise: 1.2,
      dampening: 3200,
      resonance: 0.92
    }).connect(this.reverb);
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
    await Tone.start();
    this.ensureAudioGraph();

    const bpm = options.tempoOverride || doc.header.tempo || 80;
    const secPerBeat = 60 / bpm;
    const { events, totalBeats } = buildErhuPlaybackTimeline(doc, options.transposeSemitones || 0);

    if (events.length === 0) {
      options.onComplete?.();
      return;
    }

    this.isPlayingState = true;
    const baseNow = Tone.now() + 0.08;

    for (const ev of events) {
      const startSec = ev.startBeat * secPerBeat;
      const durSec = Math.max(0.06, ev.durationBeats * secPerBeat);

      // Schedule UI playhead highlight
      const uiTimer = window.setTimeout(() => {
        if (!this.isPlayingState) return;
        options.onNoteActive?.(ev.noteId, ev.measureIndex);
      }, Math.max(0, startSec * 1000));
      this.timeouts.push(uiTimer);

      if (ev.midi === null) continue;

      const freq = Tone.Frequency(ev.midi, 'midi').toFrequency();
      const toneTime = baseNow + startSec;

      if (ev.isPizzicato && this.pizzSynth) {
        this.pizzSynth.triggerAttack(freq, toneTime);
      } else if (this.bowedSynth) {
        const playDur = ev.isStaccato ? Math.min(durSec * 0.45, 0.18) : Math.max(0.05, durSec * 0.94);

        if (ev.isTremolo) {
          // Rapid bowed tremolo subdivisions
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

    const endTimer = window.setTimeout(() => {
      if (!this.isPlayingState) return;
      this.isPlayingState = false;
      options.onNoteActive?.(null, null);
      options.onComplete?.();
    }, (totalBeats * secPerBeat + 0.35) * 1000);
    this.timeouts.push(endTimer);
  }

  stop() {
    this.isPlayingState = false;
    for (const id of this.timeouts) {
      window.clearTimeout(id);
    }
    this.timeouts = [];
    try {
      this.bowedSynth?.triggerRelease();
    } catch {
      // ignore if not triggered
    }
  }

  dispose() {
    this.stop();
    try {
      this.bowedSynth?.dispose();
      this.pizzSynth?.dispose();
      this.vibrato?.dispose();
      this.filter?.dispose();
      this.reverb?.dispose();
      this.gain?.dispose();
    } catch {
      // ignore
    }
    this.bowedSynth = null;
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
 * using General MIDI Program 110 (Fiddle / Erhu) so MusoBuddy's ScoreAudioPlayer plays it seamlessly!
 */
export function generateMidiForMusoJianpu(doc: MusoJianpuDocument, transposeSemitones: number = 0): string | null {
  try {
    const { events } = buildErhuPlaybackTimeline(doc, transposeSemitones);
    if (events.length === 0) return null;

    const tpq = 480; // ticks per quarter note
    const bpm = doc.header.tempo || 80;
    const microsecPerBeat = Math.round(60_000_000 / bpm);

    const track: number[] = [];

    // Tempo Meta Event: FF 51 03 tt tt tt
    track.push(
      0x00, 0xff, 0x51, 0x03,
      (microsecPerBeat >> 16) & 0xff,
      (microsecPerBeat >> 8) & 0xff,
      microsecPerBeat & 0xff
    );

    // Time Signature Meta Event
    const [numStr, denStr] = (doc.header.time || '4/4').split('/');
    const num = Math.max(1, parseInt(numStr, 10) || 4);
    const den = Math.max(1, parseInt(denStr, 10) || 4);
    const denPow = Math.round(Math.log2(den));
    track.push(0x00, 0xff, 0x58, 0x04, num, denPow, 24, 8);

    // Program Change on Channel 0 -> 110 (GM Fiddle / Erhu)
    track.push(0x00, 0xc0, 110);

    // Flatten into tick-sorted Note On / Note Off messages
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

      msgs.push({ tick: startTick, bytes: [0x90, ev.midi, vel] });
      msgs.push({ tick: endTick, bytes: [0x80, ev.midi, 0] });
    }

    msgs.sort((a, b) => a.tick - b.tick);

    let lastTick = 0;
    for (const msg of msgs) {
      const delta = Math.max(0, msg.tick - lastTick);
      track.push(...encodeVLQ(delta), ...msg.bytes);
      lastTick = msg.tick;
    }

    // End of track
    track.push(0x00, 0xff, 0x2f, 0x00);

    // Build MThd + MTrk
    const header = [
      0x4d, 0x54, 0x68, 0x64, // MThd
      0x00, 0x00, 0x00, 0x06, // length 6
      0x00, 0x00,             // format 0
      0x00, 0x01,             // 1 track
      (tpq >> 8) & 0xff, tpq & 0xff
    ];

    const trackLen = track.length;
    const trackHeader = [
      0x4d, 0x54, 0x72, 0x6b, // MTrk
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
