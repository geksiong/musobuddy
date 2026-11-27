/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Low-latency polyphonic Web Audio synthesizer for instant Note Entry auditioning
 * (virtual on-screen keyboard, QWERTY shortcuts, and MIDI keyboard).
 */
interface ActiveVoice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  gain: GainNode;
  stopTimer?: number;
}

class NoteEntrySynth {
  private ctx: AudioContext | null = null;
  private voices = new Map<number, ActiveVoice>();
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  public noteOn(midi: number, velocity: number = 0.78, maxAutoReleaseSec?: number) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Retrigger cleanly if already sounding
    this.noteOff(midi);

    const now = ctx.currentTime;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const vel = Math.max(0.15, Math.min(1, velocity));

    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(6000, freq * 6.5), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 2.4), now + 0.45);
    filter.Q.value = 0.8;

    // Warm electric-piano / acoustic hybrid tone
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.18, now);
    harmonicGain.gain.exponentialRampToValueAtTime(0.03, now + 0.35);

    const peak = 0.22 * vel;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(peak * 0.45, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.4);

    osc1.connect(filter);
    osc2.connect(harmonicGain);
    harmonicGain.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    const voice: ActiveVoice = { osc1, osc2, gain };
    if (maxAutoReleaseSec && maxAutoReleaseSec > 0) {
      voice.stopTimer = window.setTimeout(() => {
        this.noteOff(midi);
      }, maxAutoReleaseSec * 1000);
    }

    this.voices.set(midi, voice);
  }

  public noteOff(midi: number) {
    const voice = this.voices.get(midi);
    if (!voice || !this.ctx) return;

    if (voice.stopTimer) {
      window.clearTimeout(voice.stopTimer);
    }
    this.voices.delete(midi);

    const now = this.ctx.currentTime;
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      voice.osc1.stop(now + 0.11);
      voice.osc2.stop(now + 0.11);
    } catch {
      // Ignore already stopped oscillators
    }
  }

  public triggerNote(midi: number, durationSec: number = 0.32, velocity: number = 0.78) {
    this.noteOn(midi, velocity, durationSec);
  }

  public stopAll() {
    for (const midi of Array.from(this.voices.keys())) {
      this.noteOff(midi);
    }
  }
}

export const noteEntrySynth = new NoteEntrySynth();
