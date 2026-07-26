/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ScoreData, ScoreFormat } from '../components/Score/types.ts';
import { generateMidiForAbc, exportScore } from '../lib/abcUtils.ts';

interface GlobalAudio {
  url: string;
  name: string;
}

interface ScoreContextType {
  scores: ScoreData[];
  setScores: React.Dispatch<React.SetStateAction<ScoreData[]>>;
  activeScoreId: string | null;
  setActiveScoreId: React.Dispatch<React.SetStateAction<string | null>>;
  activeScore: ScoreData | undefined;
  globalAudio: GlobalAudio | null;
  setGlobalAudio: React.Dispatch<React.SetStateAction<GlobalAudio | null>>;
  loadFiles: (files: FileList | File[]) => Promise<string | null>;
  createScore: (format: ScoreFormat) => string;
  exportActiveScore: () => void;
  playbackTime: number;
  setPlaybackTime: React.Dispatch<React.SetStateAction<number>>;
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
  
  const [activeScoreIdState, setActiveScoreIdState] = useState<string | null>(() => {
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
  const [playbackTime, setPlaybackTime] = useState<number>(0);

  const setActiveScoreId = useCallback((id: string | null) => {
    setActiveScoreIdState(id);
    setGlobalAudio(null);
  }, []);

  const activeScoreId = activeScoreIdState;

  const activeScore = scores.find(s => s.id === activeScoreId) || scores[0];

  // Auto-generate MIDI audioUrl for active score if missing or empty
  useEffect(() => {
    if (!activeScore) return;

    const isAbc = activeScore.format === ScoreFormat.ABC || 
      (typeof activeScore.content === 'string' && activeScore.content.includes('X:'));

    if (isAbc && (!activeScore.audioUrl || activeScore.audioUrl === '')) {
      const midiUrl = generateMidiForAbc(
        activeScore.content as string,
        activeScore.selectedTuneIndex || 0,
        activeScore.transpose || 0
      );
      if (midiUrl) {
        setScores(prev => prev.map(s => s.id === activeScore.id ? {
          ...s,
          audioUrl: midiUrl,
          audioName: `${s.title || 'score'}.mid`
        } : s));
      }
    }
  }, [activeScore?.id, activeScore?.content, activeScore?.selectedTuneIndex, activeScore?.transpose, activeScore?.audioUrl]);

  const exportActiveScore = useCallback(() => {
    exportScore(activeScore);
  }, [activeScore]);

  const createScore = useCallback((format: ScoreFormat): string => {
    const id = Math.random().toString(36).substr(2, 9);
    let title = 'Untitled Score';
    let initialContent = '';

    if (format === ScoreFormat.ABC) {
      title = 'New ABC Score';
      initialContent = 'X:1\nT:New ABC Score\nM:4/4\nK:C\nC D E F | G A B c |';
    } else if (format === ScoreFormat.Text) {
      title = 'New Text Sheet';
      initialContent = '';
    }

    const midiUrl = format === ScoreFormat.ABC ? generateMidiForAbc(initialContent, 0) : null;
    const newScore: ScoreData = {
      id,
      title,
      format,
      content: initialContent,
      zoom: 1,
      pan: { x: 0, y: 0 },
      viewMode: 'scroll',
      showEditor: format === ScoreFormat.ABC,
      selectedTuneIndex: 0,
      audioUrl: midiUrl || undefined,
      audioName: midiUrl ? 'rendering.mid' : undefined
    };

    setScores(prev => [...prev, newScore]);
    setActiveScoreId(id);
    return id;
  }, [setActiveScoreId]);

  const loadFiles = useCallback(async (files: FileList | File[]): Promise<string | null> => {
    const audioFiles: File[] = [];
    const imageFiles: File[] = [];
    const filesToProcess: File[] = [];
    
    let targetScoreId: string | null = null;

    for (const file of Array.from(files)) {
      const name = file.name.split('.')[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
        imageFiles.push(file);
        continue;
      }
      if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'mid', 'midi'].includes(ext || '')) {
        audioFiles.push(file);
        continue;
      }

      const existingScore = scores.find(s => s.title === name);
      if (existingScore) {
        targetScoreId = existingScore.id;
        setActiveScoreId(existingScore.id);
        continue;
      }
      
      filesToProcess.push(file);
    }

    const newScores: ScoreData[] = [];
    
    for (const file of filesToProcess) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const id = Math.random().toString(36).substr(2, 9);
      const name = file.name.split('.')[0];
      
      let format: ScoreFormat = ScoreFormat.Text;
      let content: string | string[] = '';
      let audioUrl: string | undefined = undefined;
      let audioName: string | undefined = undefined;

      if (ext === 'pdf') {
        format = ScoreFormat.PDF;
        content = URL.createObjectURL(file);
      } else if (ext === 'abc') {
        format = ScoreFormat.ABC;
        content = await file.text();
        const midiUrl = generateMidiForAbc(content, 0);
        if (midiUrl) {
          audioUrl = midiUrl;
          audioName = `${name}.mid`;
        }
      } else if (ext === 'xml' || ext === 'musicxml') {
        format = ScoreFormat.MusicXML;
        content = await file.text();
      } else if (ext === 'txt') {
        format = ScoreFormat.Text;
        content = await file.text();
      } else {
        continue;
      }

      newScores.push({
        id,
        title: name,
        format,
        content,
        zoom: 1,
        pan: { x: 0, y: 0 },
        viewMode: 'scroll',
        audioUrl,
        audioName,
        showEditor: false,
        selectedTuneIndex: 0
      });
    }

    if (imageFiles.length > 0) {
      const id = Math.random().toString(36).substr(2, 9);
      const content = imageFiles.map(f => URL.createObjectURL(f));
      newScores.push({
        id,
        title: imageFiles.length === 1 ? imageFiles[0].name.split('.')[0] : `Image Collection (${imageFiles.length})`,
        format: ScoreFormat.Image,
        content,
        zoom: 1,
        pan: { x: 0, y: 0 },
        viewMode: 'scroll'
      });
    }

    if (newScores.length > 0) {
      targetScoreId = newScores[0].id;
    }

    setScores(prev => {
      let updatedScores = [...prev, ...newScores];
      
      if (audioFiles.length > 0) {
        const audioUrl = URL.createObjectURL(audioFiles[0]);
        const audioName = audioFiles[0].name;
        
        setGlobalAudio({ url: audioUrl, name: audioName });

        if (newScores.length > 0) {
          newScores[0].audioUrl = audioUrl;
          newScores[0].audioName = audioName;
        } else if (activeScoreId) {
          updatedScores = updatedScores.map(s => 
            s.id === activeScoreId ? { ...s, audioUrl, audioName } : s
          );
        }
      }
      
      return updatedScores;
    });

    if (targetScoreId) {
      setActiveScoreId(targetScoreId);
    }
    return targetScoreId;
  }, [scores, activeScoreId, setActiveScoreId, setScores, setGlobalAudio]);

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
      activeScore,
      globalAudio,
      setGlobalAudio,
      loadFiles,
      createScore,
      exportActiveScore,
      playbackTime,
      setPlaybackTime
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

