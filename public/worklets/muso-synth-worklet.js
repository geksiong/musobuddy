/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MusoSynthAudioWorkletProcessor
 * High-performance, zero-allocation polyphonic synthesis and percussion engine
 * running on the dedicated WebAudio real-time rendering thread.
 */

const MAX_SYNTH_VOICES = 64;
const MAX_DRUM_VOICES = 16;
const TWO_PI = 2 * Math.PI;

// Biquad filter state
class SimpleBiquad {
  constructor() {
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
    this.b0 = 1;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;
  }

  setLowpass(freq, q, sampleRate) {
    const w0 = (TWO_PI * Math.min(freq, sampleRate * 0.49)) / sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * Math.max(0.1, q));

    const a0 = 1 + alpha;
    this.b0 = ((1 - cosw0) / 2) / a0;
    this.b1 = (1 - cosw0) / a0;
    this.b2 = ((1 - cosw0) / 2) / a0;
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  setHighpass(freq, q, sampleRate) {
    const w0 = (TWO_PI * Math.min(freq, sampleRate * 0.49)) / sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * Math.max(0.1, q));

    const a0 = 1 + alpha;
    this.b0 = ((1 + cosw0) / 2) / a0;
    this.b1 = (-(1 + cosw0)) / a0;
    this.b2 = ((1 + cosw0) / 2) / a0;
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  setBandpass(freq, q, sampleRate) {
    const w0 = (TWO_PI * Math.min(freq, sampleRate * 0.49)) / sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * Math.max(0.1, q));

    const a0 = 1 + alpha;
    this.b0 = alpha / a0;
    this.b1 = 0;
    this.b2 = -alpha / a0;
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  setPeaking(freq, q, gainDb, sampleRate) {
    const w0 = (TWO_PI * Math.min(freq, sampleRate * 0.49)) / sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * Math.max(0.1, q));
    const A = Math.pow(10, gainDb / 40);

    const a0 = 1 + alpha / A;
    this.b0 = (1 + alpha * A) / a0;
    this.b1 = (-2 * cosw0) / a0;
    this.b2 = (1 - alpha * A) / a0;
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha / A) / a0;
  }

  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }

  reset() {
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }
}

function normalizeInstrument(inst) {
  if (!inst) return 'piano';
  const s = String(inst).toLowerCase().replace(/[\s_-]/g, '');
  if (s.includes('epiano') || s.includes('rhodes') || s.includes('electricpiano')) return 'epiano';
  if (s.includes('piano')) return 'piano';
  if (s.includes('guitar')) return 'guitar';
  if (s.includes('bass')) return 'bass';
  if (s.includes('string')) return 'strings';
  if (s.includes('organ') || s.includes('hammond')) return 'organ';
  if (s.includes('flute') || s.includes('woodwind')) return 'flute';
  if (s.includes('brass') || s.includes('horn')) return 'brass';
  if (s.includes('marimba')) return 'marimba';
  return 'piano';
}

function normalizeDrumSound(snd) {
  if (!snd) return 'woodblock';
  const s = String(snd).toLowerCase().replace(/[\s_-]/g, '');
  if (s.includes('kick')) return 'kick';
  if (s.includes('snare')) return 'snare';
  if (s.includes('hihat') || s.includes('hat')) return 'hihat';
  if (s.includes('clap')) return 'clap';
  if (s.includes('cowbell')) return 'cowbell';
  if (s.includes('bodhran')) return 'bodhran';
  if (s.includes('bass')) return 'bass';
  if (s.includes('tick') || s.includes('clock')) return 'clocktick';
  return 'woodblock';
}

class SynthVoice {
  constructor() {
    this.active = false;
    this.id = 0;
    this.midi = 60;
    this.freq = 440;
    this.instrument = 'piano';
    this.velocity = 1.0;
    this.duration = 1.0;
    this.sampleCount = 0;
    this.totalSamples = 0;
    this.delaySamples = 0;
    this.phase = 0;
    this.phase2 = 0;
    this.phase3 = 0;
    this.fmPhase = 0;
    this.pan = 0.5;
    this.filter = new SimpleBiquad();
  }

  trigger(id, midi, freq, instrument, velocity, duration, delaySamples, pan = 0.5, sampleRate = 44100) {
    this.active = true;
    this.id = id;
    this.midi = midi;
    this.freq = freq;
    this.instrument = normalizeInstrument(instrument);
    this.velocity = velocity;
    this.duration = duration;
    this.sampleCount = 0;
    this.totalSamples = Math.floor(duration * sampleRate);
    this.delaySamples = delaySamples;
    this.phase = Math.random();
    this.phase2 = Math.random();
    this.phase3 = Math.random();
    this.fmPhase = 0;
    this.pan = pan;
    this.filter.reset();

    const inst = this.instrument;
    // Configure initial filter
    if (inst === 'piano') {
      this.filter.setLowpass(Math.min(8000, Math.max(2200, freq * 4.5)), 1.2, sampleRate);
    } else if (inst === 'epiano') {
      this.filter.setLowpass(2800, 0.7, sampleRate);
    } else if (inst === 'bass') {
      this.filter.setLowpass(1800, 1.2, sampleRate);
    } else if (inst === 'guitar') {
      this.filter.setLowpass(3400, 1.0, sampleRate);
    } else if (inst === 'strings') {
      this.filter.setLowpass(2400, 1.1, sampleRate);
    } else if (inst === 'organ') {
      this.filter.setLowpass(4800, 0.7, sampleRate);
    } else if (inst === 'flute') {
      this.filter.setLowpass(3600, 0.8, sampleRate);
    } else if (inst === 'brass') {
      this.filter.setLowpass(Math.min(3200, freq * 3.8), 1.2, sampleRate);
    } else if (inst === 'marimba') {
      this.filter.setPeaking(480, 2.0, 3.5, sampleRate);
    } else {
      this.filter.setLowpass(4500, 0.7, sampleRate);
    }
  }

  release(fadeSamples = 512) {
    if (!this.active) return;
    const remaining = this.totalSamples - this.sampleCount;
    if (remaining > fadeSamples) {
      this.totalSamples = this.sampleCount + fadeSamples;
    }
  }
}

class DrumVoice {
  constructor() {
    this.active = false;
    this.sound = 'kick';
    this.isAccent = false;
    this.volume = 1.0;
    this.sampleCount = 0;
    this.totalSamples = 0;
    this.delaySamples = 0;
    this.phase = 0;
    this.phase2 = 0;
    this.filter = new SimpleBiquad();
  }

  trigger(sound, isAccent, volume, delaySamples, sampleRate = 44100) {
    this.active = true;
    this.sound = normalizeDrumSound(sound);
    this.isAccent = isAccent;
    this.volume = volume;
    this.sampleCount = 0;
    this.delaySamples = delaySamples;
    this.phase = 0;
    this.phase2 = 0;
    this.filter.reset();

    let durationSec = 0.08;
    const snd = this.sound;
    if (snd === 'kick' || snd === 'bodhran' || snd === 'bass') {
      durationSec = 0.16;
    } else if (snd === 'snare' || snd === 'clap' || snd === 'cowbell') {
      durationSec = 0.14;
    } else if (snd === 'hihat' || snd === 'woodblock') {
      durationSec = 0.09;
    } else if (snd === 'clocktick') {
      durationSec = 0.03;
    }
    this.totalSamples = Math.floor(durationSec * sampleRate);

    if (snd === 'hihat') {
      this.filter.setHighpass(isAccent ? 7500 : 5800, 1.2, sampleRate);
    } else if (snd === 'clap') {
      this.filter.setBandpass(isAccent ? 1200 : 850, 1.4, sampleRate);
    } else if (snd === 'snare') {
      this.filter.setHighpass(isAccent ? 1600 : 1200, 0.8, sampleRate);
    } else if (snd === 'cowbell') {
      this.filter.setBandpass(isAccent ? 880 : 580, 2.2, sampleRate);
    }
  }
}

class MusoSynthProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.synthVoices = Array.from({ length: MAX_SYNTH_VOICES }, () => new SynthVoice());
    this.drumVoices = Array.from({ length: MAX_DRUM_VOICES }, () => new DrumVoice());
    this.masterVolume = 1.0;
    this.voiceCounter = 0;

    this.port.onmessage = (e) => {
      this.handleMessage(e.data);
    };
  }

  handleMessage(data) {
    if (!data) return;
    const sampleRate = globalThis.sampleRate || 44100;

    switch (data.type) {
      case 'noteOn': {
        const { note, midi, freq, instrument, velocity, duration, timeOffsetSec } = data;
        const delaySamples = Math.max(0, Math.floor((timeOffsetSec || 0) * sampleRate));
        const effectiveFreq = freq || (midi ? 440 * Math.pow(2, (midi - 69) / 12) : 440);
        const effectiveMidi = midi || (note ? 60 : Math.round(69 + 12 * Math.log2(effectiveFreq / 440)));
        this.allocSynthVoice(
          data.id || ++this.voiceCounter,
          effectiveMidi,
          effectiveFreq,
          instrument || 'Piano',
          velocity ?? 1.0,
          duration || 1.2,
          delaySamples,
          data.pan ?? 0.5,
          sampleRate
        );
        break;
      }

      case 'noteOff': {
        const { id, midi, note } = data;
        for (let i = 0; i < MAX_SYNTH_VOICES; i++) {
          const v = this.synthVoices[i];
          if (v.active) {
            if ((id && v.id === id) || (midi && v.midi === midi)) {
              v.release();
            }
          }
        }
        break;
      }

      case 'chord': {
        const { notes, instrument, volume, duration, staggerMs, timeOffsetSec } = data;
        if (!notes || !Array.isArray(notes)) return;
        const baseDelaySamples = Math.max(0, Math.floor((timeOffsetSec || 0) * sampleRate));
        const staggerSamples = Math.floor(((staggerMs || 0) / 1000) * sampleRate);

        const chordLen = notes.length;
        for (let i = 0; i < chordLen; i++) {
          const item = notes[i];
          const nFreq = typeof item === 'number' ? item : item.freq;
          const nVel = typeof item === 'number' ? 1.0 : (item.velocity ?? 1.0);
          const nMidi = typeof item === 'number' ? Math.round(69 + 12 * Math.log2(nFreq / 440)) : (item.midi || 60);
          const pan = chordLen > 1 ? 0.35 + (0.3 * i) / (chordLen - 1) : 0.5;
          const delay = baseDelaySamples + i * staggerSamples;

          this.allocSynthVoice(
            ++this.voiceCounter,
            nMidi,
            nFreq,
            instrument || 'Piano',
            (volume || 1.0) * nVel,
            duration || 1.6,
            delay,
            pan,
            sampleRate
          );
        }
        break;
      }

      case 'percussion': {
        const { sound, isAccent, volume, timeOffsetSec } = data;
        const delaySamples = Math.max(0, Math.floor((timeOffsetSec || 0) * sampleRate));
        this.allocDrumVoice(sound || 'Woodblock', !!isAccent, volume ?? 0.8, delaySamples, sampleRate);
        break;
      }

      case 'allNotesOff': {
        for (let i = 0; i < MAX_SYNTH_VOICES; i++) {
          this.synthVoices[i].release(128);
        }
        for (let i = 0; i < MAX_DRUM_VOICES; i++) {
          this.drumVoices[i].active = false;
        }
        break;
      }

      case 'setMasterVolume': {
        if (typeof data.volume === 'number') {
          this.masterVolume = Math.max(0, Math.min(2, data.volume));
        }
        break;
      }
    }
  }

  allocSynthVoice(id, midi, freq, instrument, velocity, duration, delaySamples, pan, sampleRate) {
    // 1. Find free voice
    for (let i = 0; i < MAX_SYNTH_VOICES; i++) {
      if (!this.synthVoices[i].active) {
        this.synthVoices[i].trigger(id, midi, freq, instrument, velocity, duration, delaySamples, pan, sampleRate);
        return;
      }
    }
    // 2. Steal voice closest to ending
    let oldestIdx = 0;
    let maxProgress = -1;
    for (let i = 0; i < MAX_SYNTH_VOICES; i++) {
      const v = this.synthVoices[i];
      const prog = v.sampleCount / Math.max(1, v.totalSamples);
      if (prog > maxProgress) {
        maxProgress = prog;
        oldestIdx = i;
      }
    }
    this.synthVoices[oldestIdx].trigger(id, midi, freq, instrument, velocity, duration, delaySamples, pan, sampleRate);
  }

  allocDrumVoice(sound, isAccent, volume, delaySamples, sampleRate) {
    for (let i = 0; i < MAX_DRUM_VOICES; i++) {
      if (!this.drumVoices[i].active) {
        this.drumVoices[i].trigger(sound, isAccent, volume, delaySamples, sampleRate);
        return;
      }
    }
    this.drumVoices[0].trigger(sound, isAccent, volume, delaySamples, sampleRate);
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const left = output[0];
    const right = output.length > 1 ? output[1] : left;
    const numSamples = left.length;
    const sampleRate = globalThis.sampleRate || 44100;

    // Zero output buffers
    for (let i = 0; i < numSamples; i++) {
      left[i] = 0;
      right[i] = 0;
    }

    // Render Synth Voices
    for (let vIdx = 0; vIdx < MAX_SYNTH_VOICES; vIdx++) {
      const v = this.synthVoices[vIdx];
      if (!v.active) continue;

      const fInc = v.freq / sampleRate;
      const panL = Math.cos(v.pan * Math.PI * 0.5);
      const panR = Math.sin(v.pan * Math.PI * 0.5);

      for (let i = 0; i < numSamples; i++) {
        if (v.delaySamples > 0) {
          v.delaySamples--;
          continue;
        }

        if (v.sampleCount >= v.totalSamples) {
          v.active = false;
          break;
        }

        const t = v.sampleCount / sampleRate;
        const progress = v.sampleCount / Math.max(1, v.totalSamples);
        v.sampleCount++;

        let rawSample = 0;
        const inst = v.instrument;

        if (inst === 'piano') {
          // Acoustic piano: multi-harmonic rich decay with hammer click
          const env = Math.exp(-t * 2.5) * Math.min(1.0, t * 450);
          const h1 = Math.sin(TWO_PI * v.phase);
          const h2 = 0.55 * Math.sin(TWO_PI * v.phase * 2);
          const h3 = 0.35 * Math.sin(TWO_PI * v.phase * 3);
          const h4 = 0.20 * Math.sin(TWO_PI * v.phase * 4);
          const unison = 0.4 * Math.sin(TWO_PI * v.phase2);
          
          let hammer = 0;
          if (t < 0.015) {
            hammer = (Math.random() * 2 - 1) * Math.exp(-t * 300) * 0.25;
          }

          rawSample = (h1 + h2 + h3 + h4 + unison + hammer) * env * 0.28;
          rawSample = v.filter.process(rawSample);
        } else if (inst === 'epiano') {
          // Vintage Rhodes FM Tine synthesis: metallic tine FM ping + bell chime + warm 2nd harmonic
          const tineEnv = Math.exp(-t * 28.0);
          const modFreq = v.freq * 14.0;
          v.fmPhase += modFreq / sampleRate;
          if (v.fmPhase > 1) v.fmPhase -= Math.floor(v.fmPhase);
          const tineMod = Math.sin(TWO_PI * v.fmPhase) * tineEnv * 2.0;

          // 7.0x Bell Chime Overtone
          const bellPhase = (v.phase * 7.0) % 1;
          const bell = Math.sin(TWO_PI * bellPhase) * 0.25 * Math.exp(-t * 14.0);

          // Warm pickup 2nd harmonic
          const h2 = 0.35 * Math.sin(TWO_PI * v.phase * 2) * Math.exp(-t * 2.5);

          // Singing Rhodes carrier envelope + soft suitcase tremolo
          const tremolo = 1.0 + 0.08 * Math.sin(TWO_PI * 0.75 * t);
          const carEnv = Math.exp(-t * 1.3) * Math.min(1.0, t * 400);
          const mainTone = Math.sin(TWO_PI * v.phase + tineMod);

          rawSample = (mainTone + bell + h2) * carEnv * tremolo * 0.28;
          rawSample = v.filter.process(rawSample);
        } else if (inst === 'guitar') {
          // Plucked acoustic guitar string
          const env = Math.exp(-t * 2.5) * Math.min(1.0, t * 350);
          const tri = 2 * Math.abs(2 * (v.phase - Math.floor(v.phase + 0.5))) - 1;
          const saw = 2 * (v.phase - Math.floor(v.phase + 0.5));
          let pluck = 0;
          if (t < 0.012) {
            pluck = (Math.random() * 2 - 1) * Math.exp(-t * 400) * 0.3;
          }
          rawSample = (tri * 0.7 + saw * 0.3 + pluck) * env * 0.28;
          rawSample = v.filter.process(rawSample);
        } else if (inst === 'bass') {
          // Articulate Plucked Bass: finger pluck transient, dynamic filter damping, tight envelope
          let pluck = 0;
          if (t < 0.010) {
            pluck = (Math.random() * 2 - 1) * Math.exp(-t * 500) * 0.35;
          }

          // Dynamic lowpass filter sweep
          const currentCutoff = Math.max(280, 1800 * Math.exp(-t * 16));
          v.filter.setLowpass(currentCutoff, 1.2, sampleRate);

          const env = Math.exp(-t * 3.6) * Math.min(1.0, t * 400);
          const sine = Math.sin(TWO_PI * v.phase);
          const sub = 0.55 * Math.sin(TWO_PI * v.phase * 0.5);
          const tri = 0.45 * (2 * Math.abs(2 * (v.phase - Math.floor(v.phase + 0.5))) - 1);
          rawSample = (sine + sub + tri + pluck) * env * 0.36;
          rawSample = v.filter.process(rawSample);
        } else if (inst === 'strings') {
          // Symphonic String Ensemble: bow attack, musical decrescendo, articulate release, 3 detuned saws + sub-saw
          const bowAttack = Math.min(1.0, t / 0.045);
          const bowDecay = 0.40 + 0.60 * Math.exp(-t * 1.6);
          const releaseEnv = (progress > 0.85) ? (1.0 - progress) / 0.15 : 1.0;
          const env = bowAttack * bowDecay * releaseEnv;

          const saw1 = 2 * (v.phase - Math.floor(v.phase + 0.5));
          const saw2 = 2 * (v.phase2 - Math.floor(v.phase2 + 0.5));
          const saw3 = 2 * (v.phase3 - Math.floor(v.phase3 + 0.5));
          const subSawPhase = (v.phase * 0.5) % 1;
          const subSaw = 2 * (subSawPhase - Math.floor(subSawPhase + 0.5));

          rawSample = (saw1 * 0.35 + saw2 * 0.28 + saw3 * 0.28 + subSaw * 0.15) * env * 0.22;
          rawSample = v.filter.process(rawSample);
        } else if (inst === 'organ') {
          // Hammond B3: Key click transient, 6 drawbars, rotary Doppler modulation, articulate envelope
          let click = 0;
          if (t < 0.006) {
            click = (Math.random() * 2 - 1) * Math.exp(-t * 600) * 0.3;
          }

          const attack = Math.min(1.0, t / 0.005);
          const decay = 0.50 + 0.50 * Math.exp(-t * 2.2);
          const rel = progress > 0.92 ? (1.0 - progress) / 0.08 : 1.0;
          const env = attack * decay * rel;

          // Rotary Leslie Doppler vibrato (1.2 Hz)
          const rotaryMod = 1.0 + 0.004 * Math.sin(TWO_PI * 1.2 * t);
          const p = v.phase * rotaryMod;

          const sub = 0.35 * Math.sin(TWO_PI * p * 0.5);
          const fund = 0.55 * Math.sin(TWO_PI * p);
          const quint = 0.25 * Math.sin(TWO_PI * p * 1.5);
          const h2 = 0.30 * Math.sin(TWO_PI * p * 2.0);
          const h3 = 0.15 * Math.sin(TWO_PI * p * 3.0);
          const h4 = 0.10 * Math.sin(TWO_PI * p * 4.0);

          rawSample = (sub + fund + quint + h2 + h3 + h4 + click) * env * 0.22;
        } else if (inst === 'flute') {
          // Concert Flute: breath chiff onset, fundamental + 2nd harmonic octave overblow + 3rd harmonic air tube, lyrical vibrato, clean breath release
          let chiff = 0;
          if (t < 0.030) {
            chiff = (Math.random() * 2 - 1) * Math.exp(-t * 120) * 0.12;
          }

          const attack = Math.min(1.0, t / 0.025);
          const breathDecay = 0.45 + 0.55 * Math.exp(-t * 1.5);
          const rel = progress > 0.88 ? (1.0 - progress) / 0.12 : 1.0;
          const env = attack * breathDecay * rel;

          // Lyrical vibrato blooming in after 60ms
          const vibAmount = t < 0.06 ? (t / 0.06) * 0.005 : 0.005;
          const vib = 1.0 + vibAmount * Math.sin(TWO_PI * 5.4 * t);

          const fund = Math.sin(TWO_PI * v.phase * vib);
          const h2 = 0.18 * Math.sin(TWO_PI * v.phase * 2 * vib);
          const h3 = 0.05 * Math.sin(TWO_PI * v.phase * 3 * vib);

          rawSample = (fund + h2 + h3 + chiff) * env * 0.26;
        } else if (inst === 'brass') {
          // Horn Section: Lip swell attack, dynamic filter sweep, detuned saw/tri blend
          const attack = Math.min(1.0, t / 0.035);
          const brassDecay = 0.50 + 0.50 * Math.exp(-t * 1.6);
          const rel = progress > 0.88 ? (1.0 - progress) / 0.12 : 1.0;
          const env = attack * brassDecay * rel;

          const saw = 2 * (v.phase - Math.floor(v.phase + 0.5));
          const saw2 = 2 * (v.phase2 - Math.floor(v.phase2 + 0.5));
          const tri = 2 * Math.abs(2 * (v.phase3 - Math.floor(v.phase3 + 0.5))) - 1;

          rawSample = (saw * 0.45 + saw2 * 0.30 + tri * 0.25) * env * 0.25;
          rawSample = v.filter.process(rawSample);
        } else if (inst === 'marimba') {
          // Acoustic Rosewood Marimba: wooden mallet click, 4.0x double-octave overtone, 9.8x transverse mode, hollow resonator filter
          let mallet = 0;
          if (t < 0.006) {
            mallet = (Math.random() * 2 - 1) * Math.exp(-t * 600) * 0.4;
          }

          const env = Math.exp(-t * 6.5) * Math.min(1.0, t * 550);
          const fund = Math.sin(TWO_PI * v.phase);
          const overtone4x = 0.40 * Math.sin(TWO_PI * v.phase * 4.0) * Math.exp(-t * 25.0);
          const overtone9x = 0.20 * Math.sin(TWO_PI * v.phase * 9.8) * Math.exp(-t * 50.0);

          rawSample = (fund + overtone4x + overtone9x + mallet) * env * 0.35;
          rawSample = v.filter.process(rawSample);
        } else {
          // Default triangle
          const env = Math.exp(-t * 2.0) * Math.min(1.0, t * 300);
          const tri = 2 * Math.abs(2 * (v.phase - Math.floor(v.phase + 0.5))) - 1;
          rawSample = tri * env * 0.25;
        }

        // Advance phases
        v.phase += fInc;
        if (v.phase > 1) v.phase -= Math.floor(v.phase);

        v.phase2 += fInc * (1.002);
        if (v.phase2 > 1) v.phase2 -= Math.floor(v.phase2);

        v.phase3 += fInc * (0.998);
        if (v.phase3 > 1) v.phase3 -= Math.floor(v.phase3);

        const finalSample = rawSample * v.velocity * this.masterVolume;
        left[i] += finalSample * panL;
        right[i] += finalSample * panR;
      }
    }

    // Render Drum / Percussion Voices
    for (let dIdx = 0; dIdx < MAX_DRUM_VOICES; dIdx++) {
      const d = this.drumVoices[dIdx];
      if (!d.active) continue;

      for (let i = 0; i < numSamples; i++) {
        if (d.delaySamples > 0) {
          d.delaySamples--;
          continue;
        }

        if (d.sampleCount >= d.totalSamples) {
          d.active = false;
          break;
        }

        const t = d.sampleCount / sampleRate;
        d.sampleCount++;

        let sample = 0;
        const isAccent = d.isAccent;
        const accentMult = isAccent ? 1.25 : 0.85;

        switch (d.sound) {
          case 'kick': {
            // Pitch dropping sine (160 -> 40 Hz)
            const kickFreq = 40 + (isAccent ? 130 : 90) * Math.exp(-t * 45);
            d.phase += kickFreq / sampleRate;
            const env = Math.exp(-t * 18) * Math.min(1.0, t * 800);
            let click = 0;
            if (t < 0.005) click = (Math.random() * 2 - 1) * (1 - t / 0.005) * 0.35;
            sample = (Math.sin(TWO_PI * d.phase) + click) * env * 0.7;
            break;
          }

          case 'hihat': {
            // Metallic highpass noise
            const env = Math.exp(-t * (isAccent ? 35 : 55));
            const white = Math.random() * 2 - 1;
            const filtered = d.filter.process(white);
            sample = filtered * env * 0.45;
            break;
          }

          case 'snare': {
            // Tone body + noise snare rattle
            const snareFreq = 70 + (isAccent ? 150 : 100) * Math.exp(-t * 30);
            d.phase += snareFreq / sampleRate;
            const toneEnv = Math.exp(-t * 22);
            const noiseEnv = Math.exp(-t * 16);
            const tone = Math.sin(TWO_PI * d.phase) * toneEnv * 0.4;
            const noise = d.filter.process(Math.random() * 2 - 1) * noiseEnv * 0.55;
            sample = tone + noise;
            break;
          }

          case 'clap': {
            // Multi-burst filtered clap
            let burstEnv = 0;
            if (t < 0.012) burstEnv = Math.exp(-t * 120);
            else if (t < 0.024) burstEnv = Math.exp(-(t - 0.012) * 120);
            else burstEnv = Math.exp(-(t - 0.024) * 25);
            const noise = d.filter.process(Math.random() * 2 - 1);
            sample = noise * burstEnv * 0.65;
            break;
          }

          case 'woodblock': {
            // High-pitched wood pop
            const freq = (isAccent ? 1200 : 750) * Math.exp(-t * 40);
            d.phase += freq / sampleRate;
            const env = Math.exp(-t * 45) * Math.min(1.0, t * 900);
            let crack = 0;
            if (t < 0.006) crack = ((Math.random() > 0.5 ? 1 : -1)) * (1 - t / 0.006) * 0.25;
            sample = (Math.sin(TWO_PI * d.phase) + crack) * env * 0.6;
            break;
          }

          case 'cowbell': {
            // Dual square waves through bandpass
            const f1 = isAccent ? 880 : 580;
            const f2 = isAccent ? 580 : 380;
            d.phase += f1 / sampleRate;
            d.phase2 += f2 / sampleRate;
            const sq1 = Math.sin(TWO_PI * d.phase) >= 0 ? 1 : -1;
            const sq2 = Math.sin(TWO_PI * d.phase2) >= 0 ? 1 : -1;
            const env = Math.exp(-t * 22);
            const raw = (sq1 + sq2) * 0.5;
            sample = d.filter.process(raw) * env * 0.5;
            break;
          }

          case 'bodhran':
          case 'bass': {
            const freq = (isAccent ? 140 : 90) * Math.exp(-t * 15);
            d.phase += freq / sampleRate;
            const env = Math.exp(-t * 14);
            sample = Math.sin(TWO_PI * d.phase) * env * 0.65;
            break;
          }

          case 'clocktick': {
            const freq = (isAccent ? 1800 : 1100) * Math.exp(-t * 60);
            d.phase += freq / sampleRate;
            const env = Math.exp(-t * 90);
            sample = Math.sin(TWO_PI * d.phase) * env * 0.5;
            break;
          }

          default: {
            const freq = isAccent ? 1200 : 750;
            d.phase += freq / sampleRate;
            const env = Math.exp(-t * 40);
            sample = Math.sin(TWO_PI * d.phase) * env * 0.5;
            break;
          }
        }

        const out = sample * d.volume * accentMult * this.masterVolume;
        left[i] += out;
        right[i] += out;
      }
    }

    // Soft limiter to prevent digital clipping
    for (let i = 0; i < numSamples; i++) {
      left[i] = Math.tanh(left[i]);
      right[i] = Math.tanh(right[i]);
    }

    return true;
  }
}

registerProcessor('muso-synth-processor', MusoSynthProcessor);
