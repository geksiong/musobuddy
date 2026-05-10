/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAudio } from '../contexts/AudioContext.tsx';

export function useDrone() {
  const { 
    activeDrones, 
    isDronePlaying, 
    setIsDronePlaying,
    userDroneNotes,
    toggleDroneNote,
    stopAllDrones,
    selectedDroneNote,
    setSelectedDroneNote,
    droneTone,
    setDroneTone,
    droneVolume,
    setDroneVolume,
    dronePulseBpm,
    setDronePulseBpm
  } = useAudio();
  
  return { 
    activeDrones, 
    isDronePlaying,
    setIsDronePlaying,
    userDroneNotes,
    toggleDroneNote,
    stopAllDrones,
    selectedDroneNote,
    setSelectedDroneNote,
    droneTone,
    setDroneTone,
    droneVolume,
    setDroneVolume,
    dronePulseBpm,
    setDronePulseBpm
  };
}
