/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ScoreData } from '../types.ts';

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

export function ScoreProvider({ children }: { children: React.ReactNode }) {
  const [scores, setScores] = useState<ScoreData[]>(() => {
    const saved = localStorage.getItem('studio_buddy_scores');
    // Note: blob URLs inside ScoreData will be invalid on refresh, 
    // but the library structure (titles, formats, ABC/Text content) will persist.
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeScoreId, setActiveScoreId] = useState<string | null>(() => {
    return localStorage.getItem('studio_buddy_active_score_id');
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
