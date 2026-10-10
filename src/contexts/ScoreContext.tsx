/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ScoreData, ScoreFormat } from '../components/Score/types.ts';
import { generateMidiForAbc, exportScore } from '../lib/abcUtils.ts';
import { parseMxlFile } from '../lib/mxlUtils.ts';
import { detectChordEngine } from '../lib/chordSheetUtils.ts';
import { loadScoreFromUrl, LoadScoreUrlResult } from '../lib/urlScoreLoader.ts';

import { Waypoint } from '../components/Score/annotationTypes.ts';

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
  loadFromUrl: (url: string, customTitle?: string) => Promise<LoadScoreUrlResult>;
  createScore: (format: ScoreFormat) => string;
  exportActiveScore: (asMxl?: boolean) => void;
  playbackTime: number;
  setPlaybackTime: React.Dispatch<React.SetStateAction<number>>;
  isDistractionFree: boolean;
  setIsDistractionFree: React.Dispatch<React.SetStateAction<boolean>>;
  toggleDistractionFree: () => void;

  // Waypoints & Page Navigation
  waypoints: Waypoint[];
  setWaypoints: React.Dispatch<React.SetStateAction<Waypoint[]>>;
  addWaypoint: (page: number, title?: string) => Waypoint;
  removeWaypoint: (id: string) => void;
  updateWaypoint: (id: string, updates: Partial<Waypoint>) => void;
  nextWaypoint: () => Waypoint | null;
  prevWaypoint: () => Waypoint | null;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  setTotalPages: React.Dispatch<React.SetStateAction<number>>;
  jumpToPage: (page: number) => void;
  registerPageJumper: (fn: ((page: number) => void) | null) => void;
  scrollScore: (direction: 'up' | 'down' | 'home' | 'end') => void;
  registerScrollHandler: (fn: ((direction: 'up' | 'down' | 'home' | 'end') => void) | null) => void;

  // Audio Playback Controller Bridge
  audioControlsRef: React.MutableRefObject<any>;
  registerAudioControls: (controls: any) => void;
  toggleAudioPlayback: () => void;
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
  },
  {
    id: 'petzold-minuet',
    title: "Minuet in G (abcm2ps Score)",
    format: ScoreFormat.ABC,
    content: `%%pageheight 29.7cm
%%pagewidth 21cm
%%scale 0.75
%%titleformat T-1 S-1
%%begintext
Minuet in G major - Christian Petzold / J.S. Bach
Demonstrating abcm2ps page directives, custom text blocks, and multi-staves.
%%endtext
X: 1
T: Minuet in G
C: Christian Petzold (1677-1733)
M: 3/4
L: 1/8
K: G
V: 1 clef=treble
|: d2 GABc | d2 G2 G2 | e2 CDEF | g2 G2 G2 |
c2 dcBA | B2 cBAG | A2 B2 C2 | A6 :|
V: 2 clef=bass
|: [G,3D3] B, A, G, | [G,3B,3] A, G, F, | C,2 E,2 D,2 | [B,,3G,,3] A,, G,, F,, |
A,,2 B,,2 C,2 | G,,2 A,,2 B,,2 | C,2 G,,2 A,,2 | D,2 C,2 B,,2 :|`,
    zoom: 1,
    pan: { x: 0, y: 0 },
    viewMode: 'scroll',
    selectedTuneIndex: 0,
    transpose: 0,
    abcRenderer: 'auto'
  },
  {
    id: 'jianpu-sample',
    title: "Jasmine Flower / 茉莉花 (Jianpu Score)",
    format: ScoreFormat.ABC,
    content: `%%jianpu 1
%%pageheight 29.7cm
%%pagewidth 21cm
%%scale 0.8
%%titleformat T-1 S-1
X: 1
T: Jasmine Flower (茉莉花)
C: Traditional Chinese Folk Song
M: 4/4
L: 1/8
K: D
| E E F A | B B A F | A A F E | F A E2 |
| E E F A | B B A F | A A F E | F E D2 |
| F F E D | E F A2 | B B A F | E E D2 |`,
    zoom: 1,
    pan: { x: 0, y: 0 },
    viewMode: 'scroll',
    selectedTuneIndex: 0,
    transpose: 0,
    abcRenderer: 'auto'
  },
  {
    id: 'canon-in-d-tab',
    title: "Canon in D (Fingerstyle Guitar Tab)",
    format: ScoreFormat.GuitarPro,
    content: `\\title "Canon in D"
\\artist "Johann Pachelbel"
\\tempo 80
.
\\track "Acoustic Guitar" "acoustic_guitar_steel"
\\tuning e4 b3 g3 d3 a2 e2
:4. 2.1 0.1 3.2 2.2 | 0.2 3.3 2.3 0.3 | 2.4 0.4 3.5 2.5 | 0.5 3.6 2.6 0.6 |
:8 2.1 3.1 5.1 3.1 2.1 0.1 3.2 2.2 | 0.2 2.2 3.2 0.2 3.3 2.3 0.3 2.3 | 2.4 3.4 5.4 3.4 2.4 0.4 3.5 2.5 | 0.5 2.5 3.5 0.5 3.6 2.6 0.6 2.6`,
    zoom: 1,
    pan: { x: 0, y: 0 },
    viewMode: 'scroll',
    selectedTuneIndex: 0
  },
  {
    id: 'hotel-california-chords',
    title: "Hotel California (Chord Sheet)",
    format: ScoreFormat.ChordSheet,
    content: `{title: Hotel California}
{artist: Eagles}
{key: Bm}

{comment: Intro}
[Bm]  [F#7]  [A]  [E]  [G]  [D]  [Em]  [F#7]

{verse: Verse 1}
On a [Bm]dark desert highway, [F#7]cool wind in my hair
[A]Warm smell of colitas, [E]rising up through the air
[G]Up ahead in the distance, I [D]saw a shimmering light
[Em]My head grew heavy and my sight grew dim, [F#7]I had to stop for the night

{chorus}
[G]Welcome to the Hotel Cali[D]fornia
Such a [F#7]lovely place (Such a lovely place), Such a [Bm]lovely face
[G]Plenty of room at the Hotel Cali[D]fornia
Any [Em]time of year (Any time of year), You can [F#7]find it here
`,
    zoom: 1,
    pan: { x: 0, y: 0 },
    viewMode: 'scroll',
    chordEngine: 'auto',
    chordFormat: 'html',
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
  const [isDistractionFree, setIsDistractionFree] = useState<boolean>(false);

  // Waypoints and Page Navigation State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const pageJumperRef = useRef<((page: number) => void) | null>(null);
  const scrollHandlerRef = useRef<((direction: 'up' | 'down' | 'home' | 'end') => void) | null>(null);
  const audioControlsRef = useRef<any>(null);

  const toggleDistractionFree = useCallback(() => {
    setIsDistractionFree(prev => !prev);
  }, []);

  const setActiveScoreId = useCallback((id: string | null) => {
    setActiveScoreIdState(id);
    setGlobalAudio(null);
    setCurrentPage(1);
  }, []);

  const activeScoreId = activeScoreIdState;
  const activeScore = scores.find(s => s.id === activeScoreId) || scores[0];

  // Helper to load waypoints from localStorage for a score
  const loadScoreWaypoints = useCallback((id: string, format?: ScoreFormat): Waypoint[] => {
    if (!id) return [];
    try {
      // 1. Check dedicated waypoints storage
      const wpKey = `studio_buddy_score_waypoints_v1_${id}`;
      const savedWps = localStorage.getItem(wpKey);
      if (savedWps) {
        const parsed = JSON.parse(savedWps);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }

      // 2. Check PDF annotations storage
      const pdfKey = `studio_buddy_pdf_annotations_v1_${id}`;
      const savedPdf = localStorage.getItem(pdfKey);
      if (savedPdf) {
        const parsed = JSON.parse(savedPdf);
        if (parsed) {
          if (Array.isArray(parsed.waypoints) && parsed.waypoints.length > 0) {
            return parsed.waypoints;
          }
          if (Array.isArray(parsed.bookmarks) && parsed.bookmarks.length > 0) {
            return parsed.bookmarks.map((b: any) => ({
              id: b.id,
              page: b.page,
              title: b.title,
              createdAt: b.createdAt,
              scoreId: id
            }));
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load waypoints for score:', id, e);
    }
    return [];
  }, []);

  // Sync waypoints when active score changes
  useEffect(() => {
    if (!activeScoreId) {
      setWaypoints([]);
      return;
    }

    const loaded = loadScoreWaypoints(activeScoreId, activeScore?.format);
    setWaypoints(loaded);
  }, [activeScoreId, activeScore?.format, loadScoreWaypoints]);

  // Persist waypoints helper
  const persistScoreWaypoints = useCallback((id: string, updatedWps: Waypoint[]) => {
    if (!id) return;
    try {
      // 1. Save to dedicated waypoints store
      localStorage.setItem(`studio_buddy_score_waypoints_v1_${id}`, JSON.stringify(updatedWps));

      // 2. Also keep PDF annotations storage in sync if it exists or if it's a PDF score
      const pdfKey = `studio_buddy_pdf_annotations_v1_${id}`;
      const savedPdf = localStorage.getItem(pdfKey);
      let docData: any = {};
      if (savedPdf) {
        try { docData = JSON.parse(savedPdf); } catch {}
      }
      docData.scoreTitle = activeScore?.title || 'Score';
      docData.version = 1;
      docData.updatedAt = Date.now();
      docData.waypoints = updatedWps;
      docData.bookmarks = updatedWps.map(w => ({
        id: w.id,
        page: w.page,
        title: w.title,
        createdAt: w.createdAt
      }));
      localStorage.setItem(pdfKey, JSON.stringify(docData));

      // 3. Update in score model in memory
      setScores(prev => prev.map(s => s.id === id ? { ...s, waypoints: updatedWps } : s));
    } catch (e) {
      console.error('Failed to save score waypoints:', e);
    }
  }, [activeScore?.title]);

  const addWaypoint = useCallback((page: number, title?: string): Waypoint => {
    const id = Math.random().toString(36).substring(2, 11);
    const safeTitle = (title && title.trim()) ? title.trim() : `Page ${page}`;
    const newWp: Waypoint = {
      id,
      page,
      title: safeTitle,
      createdAt: Date.now(),
      scoreId: activeScoreId || undefined
    };

    setWaypoints(prev => {
      const filtered = prev.filter(w => w.page !== page);
      const updated = [...filtered, newWp].sort((a, b) => a.page - b.page);
      if (activeScoreId) {
        persistScoreWaypoints(activeScoreId, updated);
      }
      return updated;
    });

    return newWp;
  }, [activeScoreId, persistScoreWaypoints]);

  const removeWaypoint = useCallback((id: string) => {
    setWaypoints(prev => {
      const updated = prev.filter(w => w.id !== id);
      if (activeScoreId) {
        persistScoreWaypoints(activeScoreId, updated);
      }
      return updated;
    });
  }, [activeScoreId, persistScoreWaypoints]);

  const updateWaypoint = useCallback((id: string, updates: Partial<Waypoint>) => {
    setWaypoints(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, ...updates } : w).sort((a, b) => a.page - b.page);
      if (activeScoreId) {
        persistScoreWaypoints(activeScoreId, updated);
      }
      return updated;
    });
  }, [activeScoreId, persistScoreWaypoints]);

  const jumpToPage = useCallback((page: number) => {
    const safePage = Math.max(1, page);
    setCurrentPage(safePage);
    if (pageJumperRef.current) {
      pageJumperRef.current(safePage);
    }
    // Also dispatch custom event so any renderer or component can listen
    window.dispatchEvent(new CustomEvent('score:jump-page', { detail: { page: safePage } }));
  }, []);

  const nextWaypoint = useCallback((): Waypoint | null => {
    if (waypoints.length === 0) return null;
    const sorted = [...waypoints].sort((a, b) => a.page - b.page);
    
    // Find next waypoint after current page
    const next = sorted.find(w => w.page > currentPage);
    const target = next || sorted[0]; // Wrap around to first waypoint
    
    jumpToPage(target.page);
    // Dispatch notification event for HUD
    window.dispatchEvent(new CustomEvent('score:waypoint-jump', { detail: { waypoint: target, direction: 'next' } }));
    return target;
  }, [waypoints, currentPage, jumpToPage]);

  const prevWaypoint = useCallback((): Waypoint | null => {
    if (waypoints.length === 0) return null;
    const sorted = [...waypoints].sort((a, b) => a.page - b.page);
    
    // Find previous waypoint before current page
    const reversed = [...sorted].reverse();
    const prev = reversed.find(w => w.page < currentPage);
    const target = prev || sorted[sorted.length - 1]; // Wrap around to last waypoint
    
    jumpToPage(target.page);
    // Dispatch notification event for HUD
    window.dispatchEvent(new CustomEvent('score:waypoint-jump', { detail: { waypoint: target, direction: 'prev' } }));
    return target;
  }, [waypoints, currentPage, jumpToPage]);

  const registerPageJumper = useCallback((fn: ((page: number) => void) | null) => {
    pageJumperRef.current = fn;
  }, []);

  const registerScrollHandler = useCallback((fn: ((direction: 'up' | 'down' | 'home' | 'end') => void) | null) => {
    scrollHandlerRef.current = fn;
  }, []);

  const scrollScore = useCallback((direction: 'up' | 'down' | 'home' | 'end') => {
    if (scrollHandlerRef.current) {
      scrollHandlerRef.current(direction);
    }
    window.dispatchEvent(new CustomEvent('score:scroll', { detail: { direction } }));
  }, []);

  const registerAudioControls = useCallback((controls: any) => {
    audioControlsRef.current = controls;
  }, []);

  const toggleAudioPlayback = useCallback(() => {
    if (audioControlsRef.current && typeof audioControlsRef.current.togglePlay === 'function') {
      audioControlsRef.current.togglePlay();
    }
  }, []);

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

  const exportActiveScore = useCallback((asMxl?: boolean) => {
    exportScore(activeScore, asMxl);
  }, [activeScore]);

  const createScore = useCallback((format: ScoreFormat): string => {
    const id = Math.random().toString(36).substr(2, 9);
    let title = 'Untitled Score';
    let initialContent = '';

    if (format === ScoreFormat.ABC) {
      title = 'New ABC Score';
      initialContent = 'X:1\nT:New ABC Score\nM:4/4\nK:C\nC D E F | G A B c |';
    } else if (format === ScoreFormat.GuitarPro) {
      title = 'New Guitar Tab';
      initialContent = `\\title "New Guitar Tab"
\\tempo 120
.
\\track "Acoustic Guitar" "acoustic_guitar_steel"
\\tuning e4 b3 g3 d3 a2 e2
:4. 0.3 2.3 0.2 1.2 | 0.3 2.3 0.2 1.2 | 3.2 1.2 0.2 2.3 | 0.3 2.3 0.2 1.2`;
    } else if (format === ScoreFormat.ChordSheet) {
      title = 'New Chord Sheet';
      initialContent = `{title: New Song}
{artist: Artist Name}
{key: C}

{verse: Verse 1}
[C]Welcome to your [G]new chord sheet!
[Am]Start typing chords in [F]brackets.

{chorus}
[C]Singing chords over [G]lyrics
[Am]Or use chords over [F]words format!`;
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
      showEditor: format === ScoreFormat.ABC || format === ScoreFormat.ChordSheet,
      selectedTuneIndex: 0,
      audioUrl: midiUrl || undefined,
      audioName: midiUrl ? 'rendering.mid' : undefined,
      chordEngine: format === ScoreFormat.ChordSheet ? 'auto' : undefined,
      chordFormat: format === ScoreFormat.ChordSheet ? 'html' : undefined,
      transpose: 0
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
      let isMxl = false;

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
      } else if (ext === 'mxl') {
        format = ScoreFormat.MusicXML;
        try {
          content = await parseMxlFile(file);
          isMxl = true;
        } catch (err) {
          console.error('Failed to parse .mxl file:', err);
          alert(`Error reading compressed MusicXML file (${file.name}): ${err instanceof Error ? err.message : String(err)}`);
          continue;
        }
      } else if (['gp', 'gp3', 'gp4', 'gp5', 'gpx', 'ptb'].includes(ext || '')) {
        format = ScoreFormat.GuitarPro;
        content = URL.createObjectURL(file);
      } else if (['pro', 'chordpro', 'chopro', 'crd', 'cho'].includes(ext || '')) {
        format = ScoreFormat.ChordSheet;
        content = await file.text();
      } else if (ext === 'txt') {
        const text = await file.text();
        const detected = detectChordEngine(text);
        if (detected.engine === 'chordpro' || detected.engine === 'ultimateGuitar' || text.includes('[ch]')) {
          format = ScoreFormat.ChordSheet;
        } else {
          format = ScoreFormat.Text;
        }
        content = text;
      } else {
        continue;
      }

      newScores.push({
        id,
        title: name,
        format,
        content,
        isMxl,
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

  const loadFromUrl = useCallback(async (url: string, customTitle?: string): Promise<LoadScoreUrlResult> => {
    const result = await loadScoreFromUrl(url, customTitle);
    if (!result.success) {
      return result;
    }

    if (result.audioOnly) {
      setGlobalAudio(result.audioOnly);
      if (activeScoreId) {
        setScores(prev => prev.map(s => s.id === activeScoreId ? {
          ...s,
          audioUrl: result.audioOnly!.url,
          audioName: result.audioOnly!.name
        } : s));
      }
      return result;
    }

    if (result.score) {
      const newScore = result.score;
      setScores(prev => {
        const existingIdx = prev.findIndex(s => (newScore.sourceUrl && s.sourceUrl === newScore.sourceUrl) || s.title === newScore.title);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], ...newScore, id: updated[existingIdx].id };
          return updated;
        }
        return [...prev, newScore];
      });
      setActiveScoreId(newScore.id);
    }

    return result;
  }, [activeScoreId, setActiveScoreId, setScores, setGlobalAudio]);

  useEffect(() => {
    // Persist scores and active ID to localStorage
    // Note: We avoid persisting blob URLs as they die on refresh, 
    // but we persist the score metadata and text content.
    const scoresToSave = scores.map(s => ({
      ...s,
      // Clear blob URLs on save to prevent attempting to load dead blobs
      content: (s.format === 'pdf' || s.format === 'image' || (s.format === 'guitarpro' && typeof s.content === 'string' && s.content.startsWith('blob:'))) ? '' : s.content,
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
      loadFromUrl,
      createScore,
      exportActiveScore,
      playbackTime,
      setPlaybackTime,
      isDistractionFree,
      setIsDistractionFree,
      toggleDistractionFree,

      // Waypoints & Navigation
      waypoints,
      setWaypoints,
      addWaypoint,
      removeWaypoint,
      updateWaypoint,
      nextWaypoint,
      prevWaypoint,
      currentPage,
      setCurrentPage,
      totalPages,
      setTotalPages,
      jumpToPage,
      registerPageJumper,
      scrollScore,
      registerScrollHandler,

      // Audio Playback
      audioControlsRef,
      registerAudioControls,
      toggleAudioPlayback
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

