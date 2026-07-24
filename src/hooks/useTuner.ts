/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { PitchDetector } from 'pitchy';
import { TunerResult } from '../components/Tuner/types.ts';
import { useAudio } from '../contexts/AudioContext.tsx';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export enum Temperament {
  Equal = 'equal',
  Just = 'just',
  Pythagorean = 'pythagorean',
}

const TEMPERAMENT_RATIOS: Record<Temperament, number[]> = {
  [Temperament.Equal]: [1, 1.059463, 1.122462, 1.189207, 1.259921, 1.33484, 1.414214, 1.498307, 1.587401, 1.681793, 1.781797, 1.887749],
  [Temperament.Just]: [1, 1.0417, 1.125, 1.2, 1.25, 1.3333, 1.4063, 1.5, 1.5625, 1.6667, 1.8, 1.875],
  [Temperament.Pythagorean]: [1, 1.0535, 1.125, 1.1852, 1.2656, 1.3333, 1.4047, 1.5, 1.5802, 1.6875, 1.7778, 1.8984]
};

export function useTuner() {
  const { playingRefNote: playingNote, playRefNote: playNote, stopRefNote: stopDrone } = useAudio();
  const [isActive, setIsActive] = useState(false);
  const [result, setResult] = useState<TunerResult | null>(null);
  const [spectrumData, setSpectrumData] = useState<Uint8Array | null>(null);
  const [volume, setVolume] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [temperament, setTemperament] = useState<Temperament>(Temperament.Equal);
  const [sensitivity, setSensitivity] = useState(0.5); // 0.0 to 1.0
  const sensitivityRef = useRef(0.5);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastResultRef = useRef<{ result: TunerResult; timestamp: number } | null>(null);
  const HOLD_DURATION = 1500; // Hold note for 1.5 seconds if signal lost

  useEffect(() => {
    const checkDevices = async () => {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const audioDevs = devs.filter(d => d.kind === 'audioinput');
        setDevices(audioDevs);
        if (audioDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioDevs[0].deviceId);
        }
      } catch (err) {
        console.error('Error enumerating devices:', err);
      }
    };

    checkDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', checkDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', checkDevices);
    };
  }, [selectedDeviceId]);

  const isActiveRef = useRef(false);
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);

  const startTuner = async (deviceId?: string) => {
    if (isActiveRef.current) return;
    try {
      // Create constraints based on whether we have a valid deviceId
      const constraints: MediaStreamConstraints = {
        audio: (deviceId && deviceId !== '') ? { deviceId: { ideal: deviceId } } : true
      };
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (innerErr) {
        // If ideal device fails, try falling back to any available audio device
        console.warn('Failed to access specific microphone, trying fallback...', innerErr);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      const devs = await navigator.mediaDevices.enumerateDevices();
      const audioDevs = devs.filter(d => d.kind === 'audioinput');
      setDevices(audioDevs);
      
      // Update selected device ID to whatever we actually got if possible
      const currentTrack = stream.getAudioTracks()[0];
      if (currentTrack) {
        const settings = currentTrack.getSettings();
        if (settings.deviceId) {
          setSelectedDeviceId(settings.deviceId);
        }
      }

      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      audioContextRef.current = new Ctx();
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      
      detectorRef.current = PitchDetector.forFloat32Array(analyserRef.current.fftSize);
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      
      isActiveRef.current = true;
      setIsActive(true);
      update();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopTuner = () => {
    isActiveRef.current = false;
    setIsActive(false);
    setVolume(0);
    setResult(null);
    lastResultRef.current = null;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
      sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    detectorRef.current = null;
  };

  const update = () => {
    if (!analyserRef.current || !audioContextRef.current || !detectorRef.current || !isActiveRef.current) return;
    
    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    // Apply sensitivity curve: lower sensitivity makes it harder to trigger
    const boostedRms = rms * (sensitivityRef.current * 2);
    const vol = Math.min(100, Math.round(boostedRms * 1000));
    setVolume(vol);
    
    const gateThreshold = 0.005 / (sensitivityRef.current + 0.1); // Dynamic threshold based on sensitivity
    let currentResult: TunerResult | null = null;

    if (rms >= gateThreshold) {
      const [pitch, clarity] = detectorRef.current.findPitch(buffer, audioContextRef.current.sampleRate);
      
      if (clarity > 0.8 && pitch > 20 && pitch < 4000) {
        const { note, cents, octave } = getNote(pitch);
        currentResult = { note, frequency: pitch, cents: parseFloat(cents.toFixed(3)), octave };
        lastResultRef.current = { result: currentResult, timestamp: Date.now() };
      }
    }

    // Hold logic: Use last valid result if within duration
    if (!currentResult && lastResultRef.current) {
      if (Date.now() - lastResultRef.current.timestamp < HOLD_DURATION) {
        currentResult = { ...lastResultRef.current.result, isHolding: true } as any;
      } else {
        lastResultRef.current = null;
      }
    }

    setResult(currentResult);
    
    const freqBuffer = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(freqBuffer);
    setSpectrumData(new Uint8Array(freqBuffer));
    
    requestRef.current = requestAnimationFrame(update);
  };

  const getNote = (frequency: number) => {
    // Equal Temperament baseline
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    const normalizedNote = Math.round(noteNum) + 69;
    
    let cents = (noteNum - Math.round(noteNum)) * 100;

    // Apply scale adjustments if not Equal Temperament
    if (temperament !== Temperament.Equal) {
      const noteIdx = normalizedNote % 12;
      const rootFreq = 440 * Math.pow(2, (Math.floor(noteNum) - noteNum) / 12); // Approximate root
      // In a real scenario, we'd need a fixed root for Just/Pythagorean, but we'll offset relative to ET closest
      // For this implementation, we simulate by showing the offset from ET for simplicity
    }

    const note = NOTES[normalizedNote % 12];
    const octave = Math.floor(normalizedNote / 12) - 1;
    return { note, cents, octave };
  };

  useEffect(() => {
    return () => {
      if (isActive) stopTuner();
    };
  }, [isActive]);

  return { 
    isActive, startTuner, stopTuner, playNote, playingNote, 
    result, spectrumData, volume, devices, selectedDeviceId, 
    setSelectedDeviceId, temperament, setTemperament,
    sensitivity, setSensitivity
  };
}
