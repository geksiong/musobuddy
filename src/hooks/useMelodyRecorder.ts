/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { PitchDetector } from 'pitchy';
import { 
  RawNoteEvent, 
  TranscriptionResult, 
  TranscriptionConfig, 
  PitchTrackingStrategy,
  transcribeMelody, 
  midiToNoteDetails,
  cleanAndConsolidateNotes,
  compensateRelativePitchAndDrift
} from '../lib/melodyTranscription.ts';

export type InputMode = 'voice' | 'whistle' | 'instrument';
export type PitchSmoothingLevel = 'high' | 'medium' | 'responsive';

export interface UseMelodyRecorderOptions {
  bpm?: number;
  useMetronomeClick?: boolean;
  sensitivity?: number; // 0.4 to 2.0
  inputMode?: InputMode; // 'voice' (default, humming/singing), 'whistle', 'instrument'
  smoothing?: PitchSmoothingLevel; // 'high', 'medium', 'responsive'
  pitchStrategy?: PitchTrackingStrategy; // 'adaptive_drift', 'relative_intervals', 'scale_aware', 'absolute'
}

export interface LiveNoteState {
  note: string; // e.g. "G4"
  midi: number;
  freq: number;
  cents: number;
  clarity: number;
  octave: number;
}

export function useMelodyRecorder(options: UseMelodyRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isCountingIn, setIsCountingIn] = useState(false);
  const [countInBeat, setCountInBeat] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [liveNote, setLiveNote] = useState<LiveNoteState | null>(null);
  const [liveVolume, setLiveVolume] = useState(0);
  const [spectrumData, setSpectrumData] = useState<Uint8Array | null>(null);
  const [recordedNotes, setRecordedNotes] = useState<RawNoteEvent[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Audio nodes and tracking refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const filterHighpassRef = useRef<BiquadFilterNode | null>(null);
  const filterLowpassRef = useRef<BiquadFilterNode | null>(null);
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const recordingTimerRef = useRef<number | null>(null);

  // Note segmentation & stabilization refs
  const currentNoteRef = useRef<{
    midi: number;
    freq: number;
    noteName: string;
    octave: number;
    startTime: number;
    clarityAcc: number;
    frames: number;
    lastActiveTime: number;
  } | null>(null);

  // Pitch history queue for running median filtering
  const pitchHistoryRef = useRef<number[]>([]);
  // Candidate tracking for pitch transitions (hysteresis)
  const candidatePitchRef = useRef<{ midi: number; count: number } | null>(null);
  const silenceFramesCountRef = useRef(0);
  const notesBufferRef = useRef<RawNoteEvent[]>([]);

  // Metronome click while recording
  const metronomeIntervalRef = useRef<number | null>(null);

  const bpmRef = useRef(options.bpm || 120);
  bpmRef.current = options.bpm || 120;

  const inputModeRef = useRef<InputMode>(options.inputMode || 'voice');
  inputModeRef.current = options.inputMode || 'voice';

  const sensitivityRef = useRef(options.sensitivity || 1.0);
  sensitivityRef.current = options.sensitivity || 1.0;

  const smoothingRef = useRef<PitchSmoothingLevel>(options.smoothing || 'high');
  smoothingRef.current = options.smoothing || 'high';

  const playClickSound = useCallback((isAccent: boolean) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isAccent ? 1200 : 800, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }, []);

  const finalizeCurrentNote = useCallback((endTimeSec: number) => {
    if (!currentNoteRef.current) return;
    const cur = currentNoteRef.current;
    const effectiveEndTime = cur.lastActiveTime > 0 ? cur.lastActiveTime : endTimeSec;
    const duration = effectiveEndTime - cur.startTime;

    const minDur = inputModeRef.current === 'voice' ? 0.06 : 0.07;
    const minFrames = inputModeRef.current === 'voice' ? 2 : 3;

    if (duration >= minDur && cur.frames >= minFrames) {
      const contMidi = cur.freq > 0 ? (12 * Math.log2(cur.freq / 440) + 69) : cur.midi;
      const noteEvent: RawNoteEvent = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        midiNote: cur.midi,
        continuousMidi: Math.round(contMidi * 100) / 100,
        frequency: cur.freq,
        noteName: cur.noteName,
        octave: cur.octave,
        startTime: cur.startTime,
        duration: duration,
        clarity: cur.clarityAcc / cur.frames
      };
      notesBufferRef.current.push(noteEvent);
      // Run light consolidation and relative drift compensation for live note chips
      const consolidated = cleanAndConsolidateNotes(notesBufferRef.current, minDur, inputModeRef.current);
      const strategy = options.pitchStrategy || (inputModeRef.current === 'instrument' ? 'absolute' : 'adaptive_drift');
      const { notes: compensated } = compensateRelativePitchAndDrift(consolidated, strategy, inputModeRef.current);
      setRecordedNotes([...compensated]);
    }
    currentNoteRef.current = null;
    candidatePitchRef.current = null;
  }, []);

  const processAudioFrame = useCallback(() => {
    if (!analyserRef.current || !audioCtxRef.current || !detectorRef.current) return;

    const analyser = analyserRef.current;
    const ctx = audioCtxRef.current;
    const sampleRate = ctx.sampleRate;

    const timeData = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(timeData);

    // RMS Energy calculation
    let sumSquares = 0;
    for (let i = 0; i < timeData.length; i++) {
      sumSquares += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sumSquares / timeData.length);
    const volumeMeter = Math.min(100, Math.round(rms * 900));
    setLiveVolume(volumeMeter);

    const mode = inputModeRef.current;
    const sensitivity = sensitivityRef.current;
    const smoothing = smoothingRef.current;

    // Dynamic thresholds tailored for humming voice
    let rmsGate = 0.005 / (sensitivity + 0.2);
    let clarityThreshold = 0.52; // Default for voice & humming

    let minPitchHz = 65; // C2 (humming baseline)
    let maxPitchHz = 1100; // C6 (vocal top)

    if (mode === 'whistle') {
      rmsGate = 0.006 / (sensitivity + 0.2);
      clarityThreshold = 0.70;
      minPitchHz = 350;
      maxPitchHz = 2800;
    } else if (mode === 'instrument') {
      rmsGate = 0.008 / (sensitivity + 0.2);
      clarityThreshold = 0.72;
      minPitchHz = 55;
      maxPitchHz = 2400;
    }

    const currentTimeSec = (performance.now() - startTimeRef.current) / 1000;
    let detectedLiveState: LiveNoteState | null = null;

    if (rms >= rmsGate) {
      const [pitch, clarity] = detectorRef.current.findPitch(timeData, sampleRate);

      if (clarity >= clarityThreshold && pitch >= minPitchHz && pitch <= maxPitchHz) {
        silenceFramesCountRef.current = 0;

        // Exact continuous MIDI pitch
        const midiExact = 12 * Math.log2(pitch / 440) + 69;

        // Maintain median queue for robust vocal pitch smoothing
        const queueSize = smoothing === 'high' ? 7 : smoothing === 'medium' ? 5 : 3;
        pitchHistoryRef.current.push(midiExact);
        if (pitchHistoryRef.current.length > queueSize) {
          pitchHistoryRef.current.shift();
        }

        // Calculate running median MIDI pitch to eliminate vibrato spikes and octave glitches
        const sortedQueue = [...pitchHistoryRef.current].sort((a, b) => a - b);
        const medianMidi = sortedQueue[Math.floor(sortedQueue.length / 2)];
        const smoothedMidiRound = Math.round(medianMidi);
        const cents = Math.round((medianMidi - smoothedMidiRound) * 100);
        const { noteName, octave } = midiToNoteDetails(smoothedMidiRound);

        detectedLiveState = {
          note: noteName,
          midi: smoothedMidiRound,
          freq: pitch,
          cents,
          clarity,
          octave
        };

        // Note Segmentation State Machine with Vibrato Hysteresis
        if (!currentNoteRef.current) {
          // Start new note
          currentNoteRef.current = {
            midi: smoothedMidiRound,
            freq: pitch,
            noteName,
            octave,
            startTime: currentTimeSec,
            clarityAcc: clarity,
            frames: 1,
            lastActiveTime: currentTimeSec
          };
          candidatePitchRef.current = null;
        } else {
          const currentMidi = currentNoteRef.current.midi;
          // Pitch distance from current note
          const pitchDiff = Math.abs(medianMidi - currentMidi);

          // Vocal vibrato tolerance: if within 0.62 semitones, it's the SAME note with vibrato!
          if (pitchDiff < 0.62 || smoothedMidiRound === currentMidi) {
            currentNoteRef.current.frames++;
            currentNoteRef.current.clarityAcc += clarity;
            currentNoteRef.current.lastActiveTime = currentTimeSec;
            // Smooth frequency blend
            currentNoteRef.current.freq = currentNoteRef.current.freq * 0.85 + pitch * 0.15;
            candidatePitchRef.current = null;
          } else {
            // Pitch has drifted to a new note! Confirm with candidate hysteresis (2-3 frames)
            const requiredConfirmFrames = mode === 'voice' ? 3 : 2;

            if (!candidatePitchRef.current || candidatePitchRef.current.midi !== smoothedMidiRound) {
              candidatePitchRef.current = { midi: smoothedMidiRound, count: 1 };
            } else {
              candidatePitchRef.current.count++;
              if (candidatePitchRef.current.count >= requiredConfirmFrames) {
                // Pitch confirmed as a new intentional note! Finalize previous and start new
                finalizeCurrentNote(currentTimeSec);
                currentNoteRef.current = {
                  midi: smoothedMidiRound,
                  freq: pitch,
                  noteName,
                  octave,
                  startTime: currentTimeSec,
                  clarityAcc: clarity,
                  frames: 1,
                  lastActiveTime: currentTimeSec
                };
                candidatePitchRef.current = null;
              }
            }
          }
        }
      } else {
        // Below clarity threshold (breath or unvoiced sound)
        silenceFramesCountRef.current++;
        const silenceLimit = mode === 'voice' ? 7 : 5; // ~110ms grace period for humming micro-dips
        if (silenceFramesCountRef.current >= silenceLimit) {
          finalizeCurrentNote(currentTimeSec);
        }
      }
    } else {
      // Below RMS volume threshold
      silenceFramesCountRef.current++;
      const silenceLimit = mode === 'voice' ? 7 : 5;
      if (silenceFramesCountRef.current >= silenceLimit) {
        finalizeCurrentNote(currentTimeSec);
      }
    }

    setLiveNote(detectedLiveState);

    // Spectrum data
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    setSpectrumData(freqData);

    animationFrameRef.current = requestAnimationFrame(processAudioFrame);
  }, [finalizeCurrentNote]);

  const startRecordingImmediate = async () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass({ latencyHint: 'interactive' });
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
      setHasPermission(true);
      setPermissionError(null);

      const source = ctx.createMediaStreamSource(stream);

      // Acoustic filtering tailored for human voice / humming:
      // Highpass at 65Hz to remove rumble and breath wind
      const hpFilter = ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.value = 65;
      hpFilter.Q.value = 0.7;
      filterHighpassRef.current = hpFilter;

      // Lowpass at 1100Hz (or mode dependent) to isolate fundamentals for humming
      const lpFilter = ctx.createBiquadFilter();
      lpFilter.type = inputModeRef.current === 'whistle' ? 'bandpass' : 'lowpass';
      lpFilter.frequency.value = inputModeRef.current === 'whistle' ? 1200 : inputModeRef.current === 'instrument' ? 2600 : 1100;
      lpFilter.Q.value = inputModeRef.current === 'whistle' ? 1.5 : 0.7;
      filterLowpassRef.current = lpFilter;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.2;
      analyserRef.current = analyser;

      // Connect: source -> highpass -> lowpass -> analyser
      source.connect(hpFilter);
      hpFilter.connect(lpFilter);
      lpFilter.connect(analyser);

      detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize);

      // MediaRecorder for original audio capture
      audioChunksRef.current = [];
      try {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorder.start(100);
        mediaRecorderRef.current = mediaRecorder;
      } catch (err) {
        console.warn('MediaRecorder initialization warning:', err);
      }

      // Reset internal tracking
      notesBufferRef.current = [];
      currentNoteRef.current = null;
      pitchHistoryRef.current = [];
      candidatePitchRef.current = null;
      silenceFramesCountRef.current = 0;
      setRecordedNotes([]);
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);

      startTimeRef.current = performance.now();
      setIsRecording(true);
      setRecordedDuration(0);

      // Start duration ticker
      recordingTimerRef.current = window.setInterval(() => {
        setRecordedDuration((performance.now() - startTimeRef.current) / 1000);
      }, 100);

      // Optional Metronome click
      if (options.useMetronomeClick) {
        const beatInterval = (60 / bpmRef.current) * 1000;
        let beat = 0;
        playClickSound(true);
        metronomeIntervalRef.current = window.setInterval(() => {
          beat = (beat + 1) % 4;
          playClickSound(beat === 0);
        }, beatInterval);
      }

      // Start processing loop
      animationFrameRef.current = requestAnimationFrame(processAudioFrame);
    } catch (err: any) {
      console.error('Failed to start melody recorder:', err);
      setHasPermission(false);
      setPermissionError(err.message || 'Microphone access denied or unavailable.');
      setIsRecording(false);
      setIsCountingIn(false);
    }
  };

  const startRecording = async (countIn: boolean = false) => {
    if (countIn) {
      setIsCountingIn(true);
      setCountInBeat(1);
      const beatMs = (60 / bpmRef.current) * 1000;
      
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const tempCtx = new AudioCtxClass();
      
      const click = (high: boolean) => {
        try {
          const osc = tempCtx.createOscillator();
          const gain = tempCtx.createGain();
          osc.frequency.setValueAtTime(high ? 1500 : 900, tempCtx.currentTime);
          gain.gain.setValueAtTime(0.35, tempCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, tempCtx.currentTime + 0.05);
          osc.connect(gain);
          gain.connect(tempCtx.destination);
          osc.start();
          osc.stop(tempCtx.currentTime + 0.05);
        } catch (e) {}
      };

      click(true);
      let count = 1;
      const countInterval = setInterval(() => {
        count++;
        if (count <= 4) {
          setCountInBeat(count);
          click(count === 1);
        } else {
          clearInterval(countInterval);
          setIsCountingIn(false);
          startRecordingImmediate();
        }
      }, beatMs);
    } else {
      startRecordingImmediate();
    }
  };

  const stopRecording = useCallback((): Promise<TranscriptionResult> => {
    return new Promise((resolve) => {
      const finishTimeSec = (performance.now() - startTimeRef.current) / 1000;
      finalizeCurrentNote(finishTimeSec);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }

      setIsRecording(false);
      setIsCountingIn(false);
      setLiveNote(null);
      setLiveVolume(0);

      // Stop MediaRecorder and produce blob
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        };
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }

      // Stop stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      // Close AudioContext
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }

      const allNotes = [...notesBufferRef.current];
      const result = transcribeMelody(allNotes, {
        bpm: bpmRef.current,
        autoBpm: !options.useMetronomeClick,
        timeSignature: 'auto',
        keySignature: 'auto',
        quantizationGrid: 'auto',
        inputMode: inputModeRef.current,
        pitchStrategy: options.pitchStrategy || (inputModeRef.current === 'instrument' ? 'absolute' : 'adaptive_drift')
      });

      resolve(result);
    });
  }, [finalizeCurrentNote, options.useMetronomeClick]);

  const clearRecorded = useCallback(() => {
    notesBufferRef.current = [];
    currentNoteRef.current = null;
    pitchHistoryRef.current = [];
    candidatePitchRef.current = null;
    setRecordedNotes([]);
    setRecordedDuration(0);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (metronomeIntervalRef.current) clearInterval(metronomeIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return {
    isRecording,
    isCountingIn,
    countInBeat,
    recordedDuration,
    liveNote,
    liveVolume,
    spectrumData,
    recordedNotes,
    audioBlob,
    audioUrl,
    hasPermission,
    permissionError,
    startRecording,
    stopRecording,
    clearRecorded
  };
}
