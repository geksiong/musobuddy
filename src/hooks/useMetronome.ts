/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAudio } from '../contexts/AudioContext.tsx';

export function useMetronome() {
  const { 
    isMetronomePlaying: isPlaying, 
    metronomeBpm: bpm, 
    setMetronomeBpm: setBpm, 
    startMetronome: start, 
    stopMetronome: stop, 
    metronomePattern: activePattern, 
    setMetronomePattern: setActivePattern, 
    currentBeat,
    metronomeVolume,
    setMetronomeVolume
  } = useAudio();

  return {
    isPlaying,
    bpm,
    setBpm,
    start,
    stop,
    setActivePattern,
    activePattern,
    currentBeat,
    metronomeVolume,
    setMetronomeVolume
  };
}
