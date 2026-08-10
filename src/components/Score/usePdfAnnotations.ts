/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Annotation, 
  AnnotationTool, 
  AnnotationState, 
  DocumentAnnotations,
  PenAnnotation,
  HighlightAnnotation,
  TextAnnotation,
  Bookmark
} from './annotationTypes.ts';

const STORAGE_PREFIX = 'studio_buddy_pdf_annotations_v1_';

export function usePdfAnnotations(scoreTitle: string, scoreId: string) {
  const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [toolState, setToolState] = useState<AnnotationState>({
    activeTool: 'select',
    color: '#ef4444', // Red default for pen
    strokeWidth: 4,
    highlightColor: 'rgba(250, 204, 21, 0.4)', // Semi-transparent yellow
    rectBorderColor: '#3b82f6', // Blue border box
    rectBorderWidth: 3,
    fontSize: 22,
    textColor: '#1e293b',
    textBgColor: 'rgba(255, 255, 255, 0.95)',
    textHasBorder: true,
    isVisible: true,
    selectedAnnotationId: null,
  });

  // Undo / Redo history
  const [history, setHistory] = useState<Record<number, Annotation[]>[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const storageKey = `${STORAGE_PREFIX}${scoreId || scoreTitle || 'default'}`;

  // Load annotations and bookmarks from localStorage on mount or score change
  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: DocumentAnnotations = JSON.parse(saved);
        if (parsed) {
          if (parsed.annotations) {
            setAnnotations(parsed.annotations);
            setHistory([parsed.annotations]);
            setHistoryIndex(0);
          }
          if (parsed.bookmarks && Array.isArray(parsed.bookmarks)) {
            setBookmarks(parsed.bookmarks);
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to parse saved PDF annotations:', err);
    }
    setAnnotations({});
    setBookmarks([]);
    setHistory([{}]);
    setHistoryIndex(0);
  }, [storageKey]);

  // Save to localStorage when annotations or bookmarks change
  const saveToLocalStorage = useCallback((data: Record<number, Annotation[]>, bks: Bookmark[] = bookmarks) => {
    if (!storageKey) return;
    try {
      const docData: DocumentAnnotations = {
        scoreTitle: scoreTitle || 'PDF Score',
        version: 1,
        updatedAt: Date.now(),
        annotations: data,
        bookmarks: bks,
      };
      localStorage.setItem(storageKey, JSON.stringify(docData));
    } catch (err) {
      console.error('Failed to auto-save PDF annotations:', err);
    }
  }, [storageKey, scoreTitle, bookmarks]);

  // Commit changes to history and persistence
  const updateAnnotationsState = useCallback((newAnnotations: Record<number, Annotation[]>) => {
    setAnnotations(newAnnotations);
    saveToLocalStorage(newAnnotations);

    // Update history stack
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newAnnotations);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex, saveToLocalStorage]);

  // Add annotation to a specific page
  const addAnnotation = useCallback((page: number, annotation: Annotation) => {
    setAnnotations(prev => {
      const pageList = prev[page] || [];
      const updated = {
        ...prev,
        [page]: [...pageList, annotation]
      };
      saveToLocalStorage(updated);
      return updated;
    });

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      const updated = {
        ...annotations,
        [page]: [...(annotations[page] || []), annotation]
      };
      newHistory.push(updated);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [annotations, historyIndex, saveToLocalStorage]);

  // Update an existing annotation
  const updateAnnotation = useCallback((page: number, id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => {
      const pageList = prev[page] || [];
      const updatedPageList = pageList.map(item => item.id === id ? ({ ...item, ...updates } as Annotation) : item);
      const updated = {
        ...prev,
        [page]: updatedPageList
      };
      saveToLocalStorage(updated);
      return updated;
    });
  }, [saveToLocalStorage]);

  // Remove annotation by ID
  const removeAnnotation = useCallback((page: number, id: string) => {
    setAnnotations(prev => {
      const pageList = prev[page] || [];
      const updated = {
        ...prev,
        [page]: pageList.filter(item => item.id !== id)
      };
      saveToLocalStorage(updated);
      return updated;
    });

    if (toolState.selectedAnnotationId === id) {
      setToolState(s => ({ ...s, selectedAnnotationId: null }));
    }
  }, [saveToLocalStorage, toolState.selectedAnnotationId]);

  // Clear all annotations for a single page
  const clearPageAnnotations = useCallback((page: number) => {
    setAnnotations(prev => {
      const updated = { ...prev, [page]: [] };
      saveToLocalStorage(updated);
      return updated;
    });
  }, [saveToLocalStorage]);

  // Clear all annotations for the whole document
  const clearAllAnnotations = useCallback(() => {
    const empty: Record<number, Annotation[]> = {};
    updateAnnotationsState(empty);
    setToolState(s => ({ ...s, selectedAnnotationId: null }));
  }, [updateAnnotationsState]);

  // Undo / Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const stateAtStep = history[newIndex];
      setAnnotations(stateAtStep);
      setHistoryIndex(newIndex);
      saveToLocalStorage(stateAtStep);
    }
  }, [historyIndex, history, saveToLocalStorage]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const stateAtStep = history[newIndex];
      setAnnotations(stateAtStep);
      setHistoryIndex(newIndex);
      saveToLocalStorage(stateAtStep);
    }
  }, [historyIndex, history, saveToLocalStorage]);

  // Save to JSON File (separate download file)
  const saveToFile = useCallback(() => {
    const docData: DocumentAnnotations = {
      scoreTitle: scoreTitle || 'PDF Score',
      version: 1,
      updatedAt: Date.now(),
      annotations: annotations,
      bookmarks: bookmarks,
    };
    const jsonString = JSON.stringify(docData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeTitle = (scoreTitle || 'score').replace(/[^a-z0-9_-]/gi, '_');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.annotations.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [scoreTitle, annotations, bookmarks]);

  // Load from JSON File
  const loadFromFile = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed: DocumentAnnotations = JSON.parse(content);
          if (parsed && (parsed.annotations || parsed.bookmarks)) {
            if (parsed.annotations) {
              updateAnnotationsState(parsed.annotations);
            }
            if (parsed.bookmarks && Array.isArray(parsed.bookmarks)) {
              setBookmarks(parsed.bookmarks);
              saveToLocalStorage(parsed.annotations || annotations, parsed.bookmarks);
            }
            resolve(true);
            return;
          }
        } catch (err) {
          console.error('Failed to parse annotation file:', err);
        }
        resolve(false);
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
  }, [updateAnnotationsState, saveToLocalStorage, annotations]);

  // Bookmark functions
  const toggleBookmark = useCallback((page: number, customTitle?: string) => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.page === page);
      let updated: Bookmark[];
      if (exists) {
        updated = prev.filter(b => b.page !== page);
      } else {
        const newBk: Bookmark = {
          id: Math.random().toString(36).substring(2, 11),
          page,
          title: customTitle || `Page ${page}`,
          createdAt: Date.now(),
        };
        updated = [...prev, newBk].sort((a, b) => a.page - b.page);
      }
      saveToLocalStorage(annotations, updated);
      return updated;
    });
  }, [annotations, saveToLocalStorage]);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const updated = prev.filter(b => b.id !== id);
      saveToLocalStorage(annotations, updated);
      return updated;
    });
  }, [annotations, saveToLocalStorage]);

  const updateBookmarkTitle = useCallback((id: string, title: string) => {
    setBookmarks(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, title } : b);
      saveToLocalStorage(annotations, updated);
      return updated;
    });
  }, [annotations, saveToLocalStorage]);

  const isPageBookmarked = useCallback((page: number) => {
    return bookmarks.some(b => b.page === page);
  }, [bookmarks]);

  // Update selected annotation properties (e.g. color, width, size)
  const updateSelectedAnnotation = useCallback((updates: Partial<Annotation>) => {
    if (!toolState.selectedAnnotationId) return;
    const id = toolState.selectedAnnotationId;

    setAnnotations(prev => {
      let pageFound: number | null = null;
      for (const [pg, list] of Object.entries(prev)) {
        if (Array.isArray(list) && list.some((item: Annotation) => item.id === id)) {
          pageFound = Number(pg);
          break;
        }
      }
      if (pageFound === null) return prev;

      const pageList = prev[pageFound] || [];
      const updatedPageList = pageList.map(item => item.id === id ? ({ ...item, ...updates } as Annotation) : item);
      const updated = {
        ...prev,
        [pageFound]: updatedPageList
      };
      saveToLocalStorage(updated);
      return updated;
    });
  }, [toolState.selectedAnnotationId, saveToLocalStorage]);

  return {
    annotations,
    bookmarks,
    toolState,
    setToolState,
    addAnnotation,
    updateAnnotation,
    updateSelectedAnnotation,
    removeAnnotation,
    clearPageAnnotations,
    clearAllAnnotations,
    toggleBookmark,
    removeBookmark,
    updateBookmarkTitle,
    isPageBookmarked,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    saveToFile,
    loadFromFile,
  };
}
