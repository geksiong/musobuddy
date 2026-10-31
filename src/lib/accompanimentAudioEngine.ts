/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MusoBuddy Accompaniment Audio Engine
 * Dedicated multi-track physical & subtractive / FM synthesis engine powering
 * Percussion, Bass, Rhythm/Chords, and Synth/Lead accompaniment tracks.
 */

const cachedNoiseBuffers = new Map<string, AudioBuffer>();

function getNoiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'metallic', durationSec: number = 0.5): AudioBuffer {
  const key = `${type}_${ctx.sampleRate}_${durationSec}`;
  const existing = cachedNoiseBuffers.get(key);
  if (existing) return existing;

  const length = Math.max(128, Math.floor(ctx.sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else if (type === 'metallic') {
    // Semi-correlated metallic cluster
    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      const s1 = Math.sin(2 * Math.PI * 3450 * t);
      const s2 = Math.sin(2 * Math.PI * 4820 * t);
      const s3 = Math.sin(2 * Math.PI * 6100 * t);
      const s4 = Math.sin(2 * Math.PI * 7900 * t);
      const white = (Math.random() * 2 - 1) * 0.4;
      data[i] = (s1 + s2 + s3 + s4) * 0.15 + white;
    }
  } else {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  cachedNoiseBuffers.set(key, buffer);
  return buffer;
}

function safeCleanup(nodes: { disconnect: () => void }[], delayMs: number) {
  setTimeout(() => {
    nodes.forEach(n => {
      try { n.disconnect(); } catch (e) {}
    });
  }, delayMs);
}

// Convert MIDI note number to frequency in Hz
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ============================================================================
// 1. PERCUSSION TRACK ENGINE
// ============================================================================
export function playPercussionSound(
  ctx: AudioContext,
  soundId: string,
  isAccent: boolean,
  volume: number,
  time: number,
  outputTarget: AudioNode
) {
  if (!ctx || volume <= 0.001) return;

  const now = Math.max(ctx.currentTime, time);
  const accentGain = isAccent ? 1.3 : 0.85;
  const masterVol = Math.max(0.0001, volume * accentGain * 0.85);

  const gain = ctx.createGain();
  gain.connect(outputTarget);

  const cleanNodes: { disconnect: () => void }[] = [gain];
  let dur = 0.25;

  const s = soundId.toLowerCase().replace(/[\s_-]/g, '');

  // --- KICK FAMILY ---
  if (s.includes('kick808') || s === '808kick') {
    dur = 0.55;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const startFreq = isAccent ? 130 : 100;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(36, now + dur);

    gain.gain.setValueAtTime(masterVol * 1.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + dur);
    cleanNodes.push(osc);
  } else if (s.includes('cajonbass') || s.includes('cajongrave')) {
    dur = 0.35;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 115 : 95, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.09);

    // Box cavity wood filter
    const woodFilter = ctx.createBiquadFilter();
    woodFilter.type = 'bandpass';
    woodFilter.frequency.setValueAtTime(140, now);
    woodFilter.Q.setValueAtTime(2.2, now);

    gain.gain.setValueAtTime(masterVol * 1.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(woodFilter);
    woodFilter.connect(gain);
    osc.start(now);
    osc.stop(now + dur);
    cleanNodes.push(osc, woodFilter);
  } else if (s.includes('kick')) {
    // Acoustic Punch Kick
    dur = 0.22;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 175 : 135, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.065);

    // Beater click transient
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(1200, now);
    clickGain.gain.setValueAtTime(masterVol * 0.35, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

    gain.gain.setValueAtTime(masterVol * 1.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    click.connect(clickGain);
    clickGain.connect(gain);

    osc.start(now);
    osc.stop(now + dur);
    click.start(now);
    click.stop(now + 0.02);
    cleanNodes.push(osc, click, clickGain);
  }

  // --- SNARE FAMILY ---
  else if (s.includes('snare808')) {
    dur = 0.24;
    const tone = ctx.createOscillator();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(isAccent ? 230 : 180, now);
    tone.frequency.exponentialRampToValueAtTime(110, now + 0.05);

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 'pink', dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1600, now);

    gain.gain.setValueAtTime(masterVol * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    tone.connect(gain);
    noise.connect(filter);
    filter.connect(gain);

    tone.start(now);
    tone.stop(now + 0.09);
    noise.start(now);
    noise.stop(now + dur);
    cleanNodes.push(tone, noise, filter);
  } else if (s.includes('rimshot') || s.includes('stick')) {
    dur = 0.08;
    const tone1 = ctx.createOscillator();
    tone1.type = 'triangle';
    tone1.frequency.setValueAtTime(isAccent ? 850 : 680, now);

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 'white', dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(masterVol * 1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    tone1.connect(gain);
    noise.connect(filter);
    filter.connect(gain);

    tone1.start(now);
    tone1.stop(now + dur);
    noise.start(now);
    noise.stop(now + dur);
    cleanNodes.push(tone1, noise, filter);
  } else if (s.includes('brush')) {
    dur = 0.22;
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 'pink', dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.setValueAtTime(1.2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(masterVol * 0.6, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    noise.start(now);
    noise.stop(now + dur);
    cleanNodes.push(noise, filter);
  } else if (s.includes('cajonslap') || s.includes('cajonagudo')) {
    dur = 0.14;
    const wood = ctx.createOscillator();
    wood.type = 'triangle';
    wood.frequency.setValueAtTime(isAccent ? 540 : 420, now);

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 'white', dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2200, now);

    gain.gain.setValueAtTime(masterVol * 0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    wood.connect(gain);
    noise.connect(filter);
    filter.connect(gain);
    wood.start(now);
    wood.stop(now + 0.04);
    noise.start(now);
    noise.stop(now + dur);
    cleanNodes.push(wood, noise, filter);
  } else if (s.includes('snare')) {
    // Crisp Studio Snare
    dur = 0.18;
    const tone = ctx.createOscillator();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(isAccent ? 220 : 175, now);
    tone.frequency.exponentialRampToValueAtTime(80, now + 0.05);

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 'white', dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1900, now);

    gain.gain.setValueAtTime(masterVol * 1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    tone.connect(gain);
    noise.connect(filter);
    filter.connect(gain);

    tone.start(now);
    tone.stop(now + dur);
    noise.start(now);
    noise.stop(now + dur);
    cleanNodes.push(tone, noise, filter);
  }

  // --- HI-HAT & CYMBALS ---
  else if (s.includes('hihatopen') || s === 'openhat') {
    dur = 0.42;
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 'metallic', dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, now);

    gain.gain.setValueAtTime(masterVol * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    noise.start(now);
    noise.stop(now + dur);
    cleanNodes.push(noise, filter);
  } else if (s.includes('hihat') || s.includes('hat')) {
    // Closed / Pedal / 808 Hat
    dur = 0.065;
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 'metallic', dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(isAccent ? 8500 : 7000, now);

    gain.gain.setValueAtTime(masterVol * 0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    noise.start(now);
    noise.stop(now + dur);
    cleanNodes.push(noise, filter);
  } else if (s.includes('ride')) {
    // Warm Acoustic Ride Cymbal (Silky shimmer wash + subtle wooden stick ping - NO piercing bell)
    dur = 0.55;
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 'metallic', dur);

    // Silvery high shimmer filter
    const shimmerFilter = ctx.createBiquadFilter();
    shimmerFilter.type = 'highpass';
    shimmerFilter.frequency.setValueAtTime(6800, now);

    // Warm cymbal body wash filter
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(isAccent ? 8500 : 7600, now);
    bodyFilter.Q.setValueAtTime(2.2, now);

    // Subtle wooden stick tip attack transient (very soft acoustic stick tap)
    const stickNoise = ctx.createBufferSource();
    stickNoise.buffer = getNoiseBuffer(ctx, 'white', 0.025);
    const stickFilter = ctx.createBiquadFilter();
    stickFilter.type = 'bandpass';
    stickFilter.frequency.setValueAtTime(3600, now);
    stickFilter.Q.setValueAtTime(2.5, now);
    const stickGain = ctx.createGain();
    stickGain.gain.setValueAtTime(masterVol * 0.22, now);
    stickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    stickNoise.connect(stickFilter);
    stickFilter.connect(stickGain);
    stickGain.connect(gain);

    gain.gain.setValueAtTime(masterVol * 0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(shimmerFilter);
    shimmerFilter.connect(bodyFilter);
    bodyFilter.connect(gain);

    noise.start(now);
    noise.stop(now + dur);
    stickNoise.start(now);
    stickNoise.stop(now + 0.025);
    cleanNodes.push(noise, shimmerFilter, bodyFilter, stickNoise, stickFilter, stickGain);
  } else if (s.includes('crash')) {
    dur = 1.1;
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 'metallic', dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4200, now);

    gain.gain.setValueAtTime(masterVol * 0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    noise.start(now);
    noise.stop(now + dur);
    cleanNodes.push(noise, filter);
  }

  // --- CLAPS & HANDS ---
  else if (s.includes('clap')) {
    dur = 0.18;
    // Multi-burst handclap
    [0, 0.012, 0.024].forEach((burstTime, idx) => {
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx, 'pink', 0.1);
      const bFilter = ctx.createBiquadFilter();
      bFilter.type = 'bandpass';
      bFilter.frequency.setValueAtTime(1200, now);
      bFilter.Q.setValueAtTime(1.4, now);

      const bGain = ctx.createGain();
      bGain.gain.setValueAtTime(masterVol * (idx === 2 ? 0.95 : 0.6), now + burstTime);
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + burstTime + 0.06);

      src.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(gain);
      src.start(now + burstTime);
      src.stop(now + burstTime + 0.06);
      cleanNodes.push(src, bFilter, bGain);
    });
    gain.gain.setValueAtTime(1.0, now);
  } else if (s.includes('palmasclaras')) {
    dur = 0.09;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 1350 : 1050, now);

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 'white', dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, now);
    filter.Q.setValueAtTime(2.5, now);

    gain.gain.setValueAtTime(masterVol * 0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(gain);
    osc.start(now);
    osc.stop(now + dur);
    noise.start(now);
    noise.stop(now + dur);
    cleanNodes.push(osc, noise, filter);
  } else if (s.includes('palmas') || s.includes('palmassordas')) {
    dur = 0.14;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 360 : 280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 'pink', dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, now);

    gain.gain.setValueAtTime(masterVol * 1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(gain);
    osc.start(now);
    osc.stop(now + dur);
    noise.start(now);
    noise.stop(now + dur);
    cleanNodes.push(osc, noise, filter);
  }

  // --- LATIN & PERCUSSION ---
  else if (s.includes('cowbell')) {
    dur = 0.18;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'square';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(isAccent ? 880 : 580, now);
    osc2.frequency.setValueAtTime(isAccent ? 580 : 380, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isAccent ? 880 : 580, now);
    filter.Q.setValueAtTime(2.2, now);

    gain.gain.setValueAtTime(masterVol * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    osc1.start(now);
    osc1.stop(now + dur);
    osc2.start(now);
    osc2.stop(now + dur);
    cleanNodes.push(osc1, osc2, filter);
  } else if (s.includes('agogo')) {
    dur = 0.22;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(isAccent ? 1480 : 980, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isAccent ? 1480 : 980, now);
    filter.Q.setValueAtTime(5.5, now);

    gain.gain.setValueAtTime(masterVol * 0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    osc.start(now);
    osc.stop(now + dur);
    cleanNodes.push(osc, filter);
  } else if (s.includes('woodblock') || s.includes('clave')) {
    dur = 0.08;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const f = s.includes('clave') ? (isAccent ? 2600 : 2400) : (isAccent ? 1300 : 850);
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 0.75, now + 0.02);

    gain.gain.setValueAtTime(masterVol * 0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + dur);
    cleanNodes.push(osc);
  } else if (s.includes('shaker') || s.includes('tambourine')) {
    dur = 0.12;
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx, 'white', dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(masterVol * 0.8, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    noise.start(now);
    noise.stop(now + dur);
    cleanNodes.push(noise, filter);
  } else if (s.includes('conga') || s.includes('bongo')) {
    dur = 0.22;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const isHigh = s.includes('high') || s.includes('quinto') || s.includes('macho');
    const startFreq = isHigh ? (isAccent ? 560 : 440) : (isAccent ? 280 : 210);
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.65, now + 0.06);

    gain.gain.setValueAtTime(masterVol * 0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + dur);
    cleanNodes.push(osc);
  } else if (s.includes('bodhran')) {
    dur = 0.35;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 145 : 95, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);

    gain.gain.setValueAtTime(masterVol * 1.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + dur);
    cleanNodes.push(osc);
  } else {
    // Default Woodblock / Clocktick
    dur = 0.05;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isAccent ? 1400 : 900, now);
    gain.gain.setValueAtTime(masterVol * 0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + dur);
    cleanNodes.push(osc);
  }

  safeCleanup(cleanNodes, Math.ceil((now - ctx.currentTime + dur + 0.1) * 1000));
}

// ============================================================================
// 2. BASS TRACK ENGINE
// ============================================================================
export function playBassSound(
  ctx: AudioContext,
  bassId: string,
  midiNote: number,
  duration: number,
  volume: number,
  isAccent: boolean,
  time: number,
  outputTarget: AudioNode
) {
  if (!ctx || volume <= 0.001) return;

  const now = Math.max(ctx.currentTime, time);
  const freq = midiToFreq(midiNote);
  const accentMul = isAccent ? 1.2 : 0.95;
  const masterVol = Math.max(0.0001, volume * accentMul * 0.9);

  const gain = ctx.createGain();
  gain.connect(outputTarget);

  const cleanNodes: { disconnect: () => void }[] = [gain];
  const b = (bassId || '').toLowerCase().replace(/[\s_-]/g, '');

  // 1. Acoustic Upright Bass
  if (b.includes('upright')) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    // Warm wooden soundbox body filter
    const woodFilter = ctx.createBiquadFilter();
    woodFilter.type = 'peaking';
    woodFilter.frequency.setValueAtTime(140, now);
    woodFilter.Q.setValueAtTime(2.2, now);
    woodFilter.gain.setValueAtTime(4.0, now);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1200, now);
    lowpass.frequency.exponentialRampToValueAtTime(350, now + 0.15);

    // Thump fundamental
    const fund = ctx.createOscillator();
    fund.type = 'sine';
    fund.frequency.setValueAtTime(freq, now);

    const fundGain = ctx.createGain();
    fundGain.gain.setValueAtTime(0.0001, now);
    fundGain.gain.linearRampToValueAtTime(masterVol * 0.9, now + 0.008);
    fundGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.85);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(masterVol * 0.8, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.9);

    osc.connect(woodFilter);
    woodFilter.connect(lowpass);
    lowpass.connect(gain);
    fund.connect(fundGain);
    fundGain.connect(gain);

    osc.start(now);
    osc.stop(now + duration);
    fund.start(now);
    fund.stop(now + duration);
    cleanNodes.push(osc, woodFilter, lowpass, fund, fundGain);
  }

  // 2. Slap & Pop Funk Bass
  else if (b.includes('slap')) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(3.2, now);
    filter.frequency.setValueAtTime(3400, now);
    filter.frequency.exponentialRampToValueAtTime(450, now + 0.07);

    // Thumb slap crack transient
    const slapOsc = ctx.createOscillator();
    const slapGain = ctx.createGain();
    slapOsc.type = 'triangle';
    slapOsc.frequency.setValueAtTime(2800, now);
    slapGain.gain.setValueAtTime(masterVol * 0.5, now);
    slapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(masterVol * 1.1, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(duration * 0.7, 0.5));

    osc.connect(filter);
    filter.connect(gain);
    slapOsc.connect(slapGain);
    slapGain.connect(gain);
    sub.connect(gain);

    osc.start(now);
    osc.stop(now + duration);
    slapOsc.start(now);
    slapOsc.stop(now + 0.03);
    sub.start(now);
    sub.stop(now + duration);
    cleanNodes.push(osc, filter, slapOsc, slapGain, sub);
  }

  // 3. Picked Rock Bass
  else if (b.includes('picked') || b.includes('rock')) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq, now);
    osc1.detune.setValueAtTime(3, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(480, now + 0.09);

    // Pick attack scrape
    const pickNoise = ctx.createBufferSource();
    pickNoise.buffer = getNoiseBuffer(ctx, 'white', 0.03);
    const pickFilter = ctx.createBiquadFilter();
    pickFilter.type = 'bandpass';
    pickFilter.frequency.setValueAtTime(3200, now);
    const pickGain = ctx.createGain();
    pickGain.gain.setValueAtTime(masterVol * 0.35, now);
    pickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    pickNoise.connect(pickFilter);
    pickFilter.connect(pickGain);
    pickGain.connect(gain);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(masterVol * 0.95, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.85);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);

    osc1.start(now);
    osc1.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration);
    pickNoise.start(now);
    pickNoise.stop(now + 0.03);
    cleanNodes.push(osc1, osc2, filter, pickNoise, pickFilter, pickGain);
  }

  // 4. Moog 24dB Ladder Sub Bass
  else if (b.includes('moog') || b.includes('analog')) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq, now);
    osc1.detune.setValueAtTime(-8, now);
    osc2.detune.setValueAtTime(8, now);

    // Cascaded 24dB filter
    const f1 = ctx.createBiquadFilter();
    const f2 = ctx.createBiquadFilter();
    f1.type = 'lowpass'; f2.type = 'lowpass';
    f1.Q.setValueAtTime(4.0, now); f2.Q.setValueAtTime(2.0, now);
    f1.frequency.setValueAtTime(2600, now);
    f1.frequency.exponentialRampToValueAtTime(220, now + 0.12);
    f2.frequency.setValueAtTime(2200, now);
    f2.frequency.exponentialRampToValueAtTime(220, now + 0.12);

    // Sub sine anchor
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(masterVol * 1.05, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.95);

    osc1.connect(f1);
    osc2.connect(f1);
    f1.connect(f2);
    f2.connect(gain);
    sub.connect(gain);

    osc1.start(now); osc1.stop(now + duration);
    osc2.start(now); osc2.stop(now + duration);
    sub.start(now); sub.stop(now + duration);
    cleanNodes.push(osc1, osc2, f1, f2, sub);
  }

  // 5. TB-303 Acid Resonant Bass
  else if (b.includes('303') || b.includes('acid')) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(8.5, now); // Squelchy resonance
    filter.frequency.setValueAtTime(3600, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(masterVol * 1.0, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(duration * 0.8, 0.6));

    osc.connect(filter);
    filter.connect(gain);
    osc.start(now);
    osc.stop(now + duration);
    cleanNodes.push(osc, filter);
  }

  // 6. 808 Sub Sine Bass
  else if (b.includes('808') || b.includes('sub')) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.08, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.035);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(masterVol * 1.15, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.05);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + duration);
    cleanNodes.push(osc);
  }

  // 7. Fretless Singing Bass
  else if (b.includes('fretless')) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    // Mwah filter swell
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, now);
    filter.Q.setValueAtTime(1.5, now);
    filter.frequency.linearRampToValueAtTime(750, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(320, now + duration * 0.7);

    // Singing vibrato
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vib.type = 'sine';
    vib.frequency.setValueAtTime(4.6, now);
    vibGain.gain.setValueAtTime(0, now);
    vibGain.gain.linearRampToValueAtTime(3.5, now + 0.15);
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(masterVol * 0.9, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.95);

    osc.connect(filter);
    filter.connect(gain);
    osc.start(now);
    osc.stop(now + duration);
    vib.start(now);
    vib.stop(now + duration);
    cleanNodes.push(osc, filter, vib, vibGain);
  }

  // 8. Default: Electric Precision Bass
  else {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.08);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(masterVol * 0.95, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.85);

    osc.connect(filter);
    filter.connect(gain);
    sub.connect(gain);

    osc.start(now);
    osc.stop(now + duration);
    sub.start(now);
    sub.stop(now + duration);
    cleanNodes.push(osc, filter, sub);
  }

  safeCleanup(cleanNodes, Math.ceil((now - ctx.currentTime + duration + 0.1) * 1000));
}

// ============================================================================
// 3. RHYTHM / CHORD TRACK ENGINE
// ============================================================================
export function playRhythmChordSound(
  ctx: AudioContext,
  rhythmId: string,
  midiNotes: number[],
  duration: number,
  volume: number,
  isAccent: boolean,
  time: number,
  outputTarget: AudioNode,
  options?: { isStrummed?: boolean }
) {
  if (!ctx || volume <= 0.001 || !midiNotes || midiNotes.length === 0) return;

  const now = Math.max(ctx.currentTime, time);
  const accentMul = isAccent ? 1.15 : 0.95;
  const masterVol = Math.max(0.0001, volume * accentMul * 0.75);

  const r = (rhythmId || '').toLowerCase().replace(/[\s_-]/g, '');

  let staggerMs = 0;
  // User explicitly instructed: "don't strum the guitars - they sound odd."
  // Guitars strike all chord notes synchronously (staggerMs = 0) for tight, clean rhythm comping.
  if (options?.isStrummed === true) {
    if (r.includes('marimba')) staggerMs = 8;
  }

  const cleanNodes: { disconnect: () => void }[] = [];

  midiNotes.forEach((midi, idx) => {
    const noteTime = now + (idx * staggerMs) / 1000;
    const freq = midiToFreq(midi);

    const noteGain = ctx.createGain();
    noteGain.connect(outputTarget);
    cleanNodes.push(noteGain);

    // Individual instrument synthesis per voice
    if (r.includes('rhodes')) {
      // Vintage Rhodes: Sine Carrier + FM Tine Ping
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      const tine = ctx.createOscillator();
      const tineGain = ctx.createGain();
      tine.type = 'sine';
      tine.frequency.setValueAtTime(freq * 14.0, noteTime);
      tineGain.gain.setValueAtTime(freq * 1.5, noteTime);
      tineGain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.045);
      tine.connect(tineGain);
      tineGain.connect(osc.frequency);

      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.linearRampToValueAtTime(masterVol * 0.35, noteTime + 0.005);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + duration * 1.1);

      osc.connect(noteGain);
      osc.start(noteTime); osc.stop(noteTime + duration);
      tine.start(noteTime); tine.stop(noteTime + 0.06);
      cleanNodes.push(osc, tine, tineGain);
    } else if (r.includes('wurlitzer')) {
      // Wurlitzer: Reed Saw/Tri with Tremolo
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, noteTime);

      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.linearRampToValueAtTime(masterVol * 0.38, noteTime + 0.005);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + duration * 0.95);

      osc.connect(filter);
      filter.connect(noteGain);
      osc.start(noteTime); osc.stop(noteTime + duration);
      cleanNodes.push(osc, filter);
    } else if (r.includes('guitar')) {
      // Acoustic & Nylon Guitar: Plucked string
      const osc = ctx.createOscillator();
      osc.type = r.includes('nylon') ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(r.includes('nylon') ? 2200 : 3600, noteTime);
      filter.frequency.exponentialRampToValueAtTime(800, noteTime + 0.15);

      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.linearRampToValueAtTime(masterVol * 0.4, noteTime + 0.004);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + duration * 0.85);

      osc.connect(filter);
      filter.connect(noteGain);
      osc.start(noteTime); osc.stop(noteTime + duration);
      cleanNodes.push(osc, filter);
    } else if (r.includes('organ')) {
      // Hammond B3 Drawbars
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(freq * 2.0, noteTime);

      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.linearRampToValueAtTime(masterVol * 0.28, noteTime + 0.008);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + duration * 0.95);

      osc.connect(noteGain);
      o2.connect(noteGain);
      osc.start(noteTime); osc.stop(noteTime + duration);
      o2.start(noteTime); o2.stop(noteTime + duration);
      cleanNodes.push(osc, o2);
    } else if (r.includes('clavinet')) {
      // Clavinet D6 Snappy Pluck
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, noteTime);
      filter.Q.setValueAtTime(3.0, noteTime);

      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.linearRampToValueAtTime(masterVol * 0.42, noteTime + 0.002);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + Math.min(duration * 0.5, 0.4));

      osc.connect(filter);
      filter.connect(noteGain);
      osc.start(noteTime); osc.stop(noteTime + duration);
      cleanNodes.push(osc, filter);
    } else if (r.includes('strings')) {
      // Symphonic Strings
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, noteTime);
      osc2.frequency.setValueAtTime(freq, noteTime);
      osc1.detune.setValueAtTime(-7, noteTime);
      osc2.detune.setValueAtTime(7, noteTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, noteTime);

      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.linearRampToValueAtTime(masterVol * 0.25, noteTime + 0.06);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + duration * 1.15);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);
      osc1.start(noteTime); osc1.stop(noteTime + duration);
      osc2.start(noteTime); osc2.stop(noteTime + duration);
      cleanNodes.push(osc1, osc2, filter);
    } else if (r.includes('marimba')) {
      // Rosewood Marimba
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      const o4 = ctx.createOscillator();
      o4.type = 'sine';
      o4.frequency.setValueAtTime(freq * 4.0, noteTime);
      const o4Gain = ctx.createGain();
      o4Gain.gain.setValueAtTime(masterVol * 0.2, noteTime);
      o4Gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.045);

      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.linearRampToValueAtTime(masterVol * 0.45, noteTime + 0.002);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + Math.min(duration * 0.6, 0.45));

      osc.connect(noteGain);
      o4.connect(o4Gain);
      o4Gain.connect(noteGain);
      osc.start(noteTime); osc.stop(noteTime + duration);
      o4.start(noteTime); o4.stop(noteTime + 0.05);
      cleanNodes.push(osc, o4, o4Gain);
    } else {
      // Default: Concert Grand Piano
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'triangle'; osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, noteTime);
      osc2.frequency.setValueAtTime(freq, noteTime);
      osc1.detune.setValueAtTime(-2, noteTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(6500, freq * 4), noteTime);
      filter.frequency.exponentialRampToValueAtTime(1400, noteTime + 0.15);

      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.linearRampToValueAtTime(masterVol * 0.38, noteTime + 0.004);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + duration * 1.05);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);
      osc1.start(noteTime); osc1.stop(noteTime + duration);
      osc2.start(noteTime); osc2.stop(noteTime + duration);
      cleanNodes.push(osc1, osc2, filter);
    }
  });

  safeCleanup(cleanNodes, Math.ceil((now - ctx.currentTime + duration + 0.2) * 1000));
}

// ============================================================================
// 4. SYNTH TRACK ENGINE (Lead, Silk Pad, PolyBrass, Bell, Chiptune, Acid, Supersaw)
// ============================================================================
export function playSynthSound(
  ctx: AudioContext,
  synthId: string,
  midiNotes: number[],
  duration: number,
  volume: number,
  isAccent: boolean,
  time: number,
  outputTarget: AudioNode
) {
  if (!ctx || volume <= 0.001 || !midiNotes || midiNotes.length === 0) return;

  const now = Math.max(ctx.currentTime, time);
  const accentMul = isAccent ? 1.25 : 0.95;
  const masterVol = Math.max(0.0001, volume * accentMul * 0.7);

  const s = (synthId || '').toLowerCase().replace(/[\s_-]/g, '');
  const cleanNodes: { disconnect: () => void }[] = [];

  midiNotes.forEach(midi => {
    const freq = midiToFreq(midi);
    const voiceGain = ctx.createGain();
    voiceGain.connect(outputTarget);
    cleanNodes.push(voiceGain);

    // 1. Lush Silk Ambient Pad
    if (s.includes('pad') || s.includes('silk')) {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth'; osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 0.5, now);
      osc1.detune.setValueAtTime(6, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.linearRampToValueAtTime(1800, now + 0.28);
      filter.frequency.exponentialRampToValueAtTime(750, now + duration * 0.9);

      // Lush slow bloom attack (220ms)
      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(masterVol * 0.35, now + 0.22);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.2);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(voiceGain);
      osc1.start(now); osc1.stop(now + duration * 1.2);
      osc2.start(now); osc2.stop(now + duration * 1.2);
      cleanNodes.push(osc1, osc2, filter);
    }

    // 2. 80s Analog Saw Lead
    else if (s.includes('saw') || s.includes('analog')) {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq, now);
      osc1.detune.setValueAtTime(-9, now);
      osc2.detune.setValueAtTime(9, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(3.5, now);
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(950, now + 0.18);

      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(masterVol * 0.38, now + 0.008);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(voiceGain);
      osc1.start(now); osc1.stop(now + duration);
      osc2.start(now); osc2.stop(now + duration);
      cleanNodes.push(osc1, osc2, filter);
    }

    // 3. 1984 PolySynth Brass
    else if (s.includes('poly') || s.includes('brass')) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(2.8, now);
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.linearRampToValueAtTime(2800, now + 0.045);
      filter.frequency.exponentialRampToValueAtTime(800, now + duration * 0.7);

      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(masterVol * 0.36, now + 0.015);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.05);

      osc.connect(filter);
      filter.connect(voiceGain);
      osc.start(now); osc.stop(now + duration);
      cleanNodes.push(osc, filter);
    }

    // 4. Crystal FM Glass Bell
    else if (s.includes('bell') || s.includes('glass')) {
      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(freq, now);

      // Bell overtone ratio 3.5x
      mod.type = 'sine';
      mod.frequency.setValueAtTime(freq * 3.5, now);
      modGain.gain.setValueAtTime(freq * 3.0, now);
      modGain.gain.exponentialRampToValueAtTime(0.1, now + 0.15);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);

      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(masterVol * 0.4, now + 0.003);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.25);

      carrier.connect(voiceGain);
      carrier.start(now); carrier.stop(now + duration * 1.3);
      mod.start(now); mod.stop(now + 0.25);
      cleanNodes.push(carrier, mod, modGain);
    }

    // 5. 8-Bit Chiptune Square Lead
    else if (s.includes('chip') || s.includes('8bit') || s.includes('square')) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      const vib = ctx.createOscillator();
      const vibGain = ctx.createGain();
      vib.type = 'sine';
      vib.frequency.setValueAtTime(6.0, now);
      vibGain.gain.setValueAtTime(0, now);
      vibGain.gain.linearRampToValueAtTime(4.0, now + 0.1);
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);

      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(masterVol * 0.3, now + 0.002);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.85);

      osc.connect(voiceGain);
      osc.start(now); osc.stop(now + duration);
      vib.start(now); vib.stop(now + duration);
      cleanNodes.push(osc, vib, vibGain);
    }

    // 6. Acid Resonant Arp Lead
    else if (s.includes('acid')) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(7.5, now);
      filter.frequency.setValueAtTime(4200, now);
      filter.frequency.exponentialRampToValueAtTime(450, now + 0.09);

      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(masterVol * 0.38, now + 0.002);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(duration * 0.6, 0.4));

      osc.connect(filter);
      filter.connect(voiceGain);
      osc.start(now); osc.stop(now + duration);
      cleanNodes.push(osc, filter);
    }

    // 7. Modern EDM Supersaw
    else if (s.includes('super') || s.includes('edm')) {
      const detunes = [-14, -7, 0, 7, 14];
      const subNodes: OscillatorNode[] = [];

      detunes.forEach(c => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(c, now);
        osc.connect(voiceGain);
        osc.start(now);
        osc.stop(now + duration);
        subNodes.push(osc);
      });

      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(masterVol * 0.22, now + 0.006);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.95);

      cleanNodes.push(...subNodes);
    }

    // 8. Default: Lo-Fi Vintage Tape Synth
    else {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      // Tape wow & flutter
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.9, now);
      lfoGain.gain.setValueAtTime(2.5, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      voiceGain.gain.setValueAtTime(0.0001, now);
      voiceGain.gain.linearRampToValueAtTime(masterVol * 0.35, now + 0.015);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.05);

      osc.connect(filter);
      filter.connect(voiceGain);
      osc.start(now); osc.stop(now + duration);
      lfo.start(now); lfo.stop(now + duration);
      cleanNodes.push(osc, filter, lfo, lfoGain);
    }
  });

  safeCleanup(cleanNodes, Math.ceil((now - ctx.currentTime + duration + 0.2) * 1000));
}
