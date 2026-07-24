/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ScoreData, ScoreFormat } from '../components/Score/types.ts';

interface GlobalAudio {
  url: string;
  name: string;
}

interface ScoreContextType {
  scores: ScoreData[];
  setScores: React.Dispatch<React.SetStateAction<ScoreData[]>>;
  activeScoreId: string | null;
  setActiveScoreId: React.Dispatch<React.SetStateAction<string | null>>;
  globalAudio: GlobalAudio | null;
  setGlobalAudio: React.Dispatch<React.SetStateAction<GlobalAudio | null>>;
}

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

const DEFAULT_SCORES: ScoreData[] = [
  {
    id: 'cooleys-reel',
    title: "Cooley's Reel",
    format: ScoreFormat.ABC,
    content: `X: 1
T: Cooley's
R: reel
M: 4/4
L: 1/8
K: Edor
|:D2|EBBA B2EB|B2AB defg|AFDF A2FA|B2AF AFEF|
EBBA B2EB|B2AB defg|afec dBAF|DEFD E2:|
|:fa|eB B2 efge|eB B2 gedB|A2 FA DAFA|A2 FA defg|
eB B2 efge|eB B2 defg|afec dBAF|DEFD E2:|`,
    zoom: 1,
    pan: { x: 0, y: 0 },
    viewMode: 'scroll',
    selectedTuneIndex: 0,
    transpose: 0
  }
];

export function ScoreProvider({ children }: { children: React.ReactNode }) {
  const [scores, setScores] = useState<ScoreData[]>(() => {
    const saved = localStorage.getItem('studio_buddy_scores');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Failed to parse saved scores:', e);
      }
    }
    return DEFAULT_SCORES;
  });
  
  const [activeScoreId, setActiveScoreId] = useState<string | null>(() => {
    const savedId = localStorage.getItem('studio_buddy_active_score_id');
    if (savedId) return savedId;
    const savedScores = localStorage.getItem('studio_buddy_scores');
    if (savedScores) {
      try {
        const parsed = JSON.parse(savedScores);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      } catch (e) {}
    }
    return DEFAULT_SCORES[0]?.id || null;
  });

  const [globalAudio, setGlobalAudio] = useState<GlobalAudio | null>(null);

  useEffect(() => {
    // Persist scores and active ID to localStorage
    // Note: We avoid persisting blob URLs as they die on refresh, 
    // but we persist the score metadata and text content.
    const scoresToSave = scores.map(s => ({
      ...s,
      // Clear blob URLs on save to prevent attempting to load dead blobs
      content: (s.format === 'pdf' || s.format === 'image') ? '' : s.content,
      audioUrl: '' 
    }));
    localStorage.setItem('studio_buddy_scores', JSON.stringify(scoresToSave));
  }, [scores]);

  useEffect(() => {
    if (activeScoreId) {
      localStorage.setItem('studio_buddy_active_score_id', activeScoreId);
    } else {
      localStorage.removeItem('studio_buddy_active_score_id');
    }
  }, [activeScoreId]);

  return (
    <ScoreContext.Provider value={{
      scores,
      setScores,
      activeScoreId,
      setActiveScoreId,
      globalAudio,
      setGlobalAudio
    }}>
      {children}
    </ScoreContext.Provider>
  );
}

export function useScores() {
  const context = useContext(ScoreContext);
  if (context === undefined) {
    throw new Error('useScores must be used within a ScoreProvider');
  }
  return context;
}
