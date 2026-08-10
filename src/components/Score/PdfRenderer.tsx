/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, Bookmark as BookmarkIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';
import { usePdfAnnotations } from './usePdfAnnotations';
import { AnnotationToolbar } from './AnnotationToolbar';
import { PdfAnnotationLayer } from './PdfAnnotationLayer';
import { AnnotationSidebar } from './AnnotationSidebar';
import { Annotation, AnnotationState } from './annotationTypes';

// Set worker source using unpkg which is more reliable for specific versions
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfRendererProps {
  url: string;
  viewMode: 'scroll' | 'single' | 'double';
  scoreTitle?: string;
  scoreId?: string;
  zoom?: number;
  headerHeight?: number;
  scoreViewHeight?: number;
  onHeaderContentChange?: (content: React.ReactNode | null) => void;
  onSidebarStateChange?: (state: { isOpen: boolean; toggle: () => void } | null) => void;
}

export default function PdfRenderer({ 
  url, 
  viewMode, 
  scoreTitle = 'PDF Score', 
  scoreId = 'pdf-score',
  zoom = 1,
  headerHeight = 112,
  scoreViewHeight = 0,
  onHeaderContentChange,
  onSidebarStateChange
}: PdfRendererProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfProxy, setPdfProxy] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(open => !open);
  }, []);

  useEffect(() => {
    if (onSidebarStateChange) {
      onSidebarStateChange({
        isOpen: isSidebarOpen,
        toggle: toggleSidebar
      });
    }
    return () => {
      if (onSidebarStateChange) {
        onSidebarStateChange(null);
      }
    };
  }, [onSidebarStateChange, isSidebarOpen, toggleSidebar]);

  const {
    annotations,
    bookmarks,
    toolState,
    setToolState,
    addAnnotation,
    updateAnnotation,
    updateSelectedAnnotation,
    removeAnnotation,
    clearAllAnnotations,
    toggleBookmark,
    removeBookmark,
    updateBookmarkTitle,
    isPageBookmarked,
    undo,
    redo,
    canUndo,
    canRedo,
    saveToFile,
    loadFromFile,
  } = usePdfAnnotations(scoreTitle, scoreId);

  // Mount AnnotationToolbar into sticky score header panel
  useEffect(() => {
    if (onHeaderContentChange) {
      onHeaderContentChange(
        <AnnotationToolbar
          toolState={toolState}
          setToolState={setToolState}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onSaveToFile={saveToFile}
          onLoadFromFile={loadFromFile}
          onClearAll={clearAllAnnotations}
          onUpdateSelectedAnnotation={updateSelectedAnnotation}
          scoreTitle={scoreTitle}
          onToggleSidebar={() => setIsSidebarOpen(open => !open)}
          isSidebarOpen={isSidebarOpen}
        />
      );
    }
    return () => {
      if (onHeaderContentChange) {
        onHeaderContentChange(null);
      }
    };
  }, [
    onHeaderContentChange,
    toolState,
    setToolState,
    canUndo,
    canRedo,
    undo,
    redo,
    saveToFile,
    loadFromFile,
    clearAllAnnotations,
    updateSelectedAnnotation,
    scoreTitle,
    isSidebarOpen,
  ]);

  useEffect(() => {
    let loadingTask: any = null;
    let isMounted = true;

    const loadPdf = async () => {
      if (!url) return;
      try {
        loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        if (isMounted) {
          setPdfProxy(pdf);
          setNumPages(pdf.numPages);
        }
      } catch (error: any) {
        if (isMounted && error?.name !== 'WorkerDestroyedException' && !error?.message?.includes('Worker was destroyed')) {
          console.error('Error loading PDF:', error);
        }
      }
    };
    loadPdf();
    return () => {
      isMounted = false;
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [url]);

  const handleNavigateToPage = (page: number) => {
    if (viewMode === 'scroll') {
      const pageEl = document.getElementById(`pdf-page-${page}`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (viewMode === 'single') {
      setCurrentPage(Math.max(1, Math.min(numPages, page)));
    } else if (viewMode === 'double') {
      const spread = Math.ceil(page / 2);
      setCurrentPage(Math.max(1, Math.ceil(numPages / 2), spread));
    }
  };

  if (!pdfProxy) {
    return (
      <div className="flex items-center justify-center p-20 animate-pulse text-[10px] uppercase font-black tracking-widest">
        Loading Document...
      </div>
    );
  }

  return (
    <div className={cn("flex w-full min-h-full relative transition-colors", resolvedTheme === 'dark' ? "bg-[#0c0c0e] text-white" : "bg-slate-100/80 text-slate-900")}>
      {/* Main Content Area: Sticky Sidebar + PDF Pages */}
      <div className="flex-1 flex w-full relative min-h-0">
        {/* Sticky Collapsible Index & Annotations Sidebar */}
        {isSidebarOpen && (
          <div 
            className="sticky z-20 self-start shrink-0 transition-all overflow-hidden"
            style={{
              top: `${headerHeight}px`,
              height: scoreViewHeight > 0 
                ? `${Math.max(200, scoreViewHeight - headerHeight)}px` 
                : `calc(100vh - ${headerHeight}px - 110px)`
            }}
          >
            <AnnotationSidebar
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              bookmarks={bookmarks}
              annotations={annotations}
              selectedAnnotationId={toolState.selectedAnnotationId}
              onNavigateToPage={handleNavigateToPage}
              onSelectAnnotation={(page, id) => {
                setToolState(s => ({ ...s, selectedAnnotationId: id }));
              }}
              onUpdateAnnotationLabel={(page, id, label) => {
                updateAnnotation(page, id, { label });
              }}
              onRemoveAnnotation={removeAnnotation}
              onToggleBookmark={toggleBookmark}
              onRemoveBookmark={removeBookmark}
              onUpdateBookmarkTitle={updateBookmarkTitle}
              numPages={numPages}
            />
          </div>
        )}

        {/* Pages Container */}
        <div 
          style={{ 
            transform: zoom !== 1 ? `scale(${zoom})` : undefined, 
            transformOrigin: 'top center' 
          }} 
          className="flex-1 flex flex-col items-center py-6 px-2 sm:px-6 min-w-0 pb-16"
        >
          {viewMode === 'scroll' && (
            <div className="flex flex-col items-center gap-8 py-4" ref={containerRef}>
              {Array.from({ length: numPages }, (_, i) => (
                <PdfPage
                  key={`${url}-${i + 1}`}
                  pdf={pdfProxy}
                  pageNum={i + 1}
                  annotations={annotations[i + 1] || []}
                  toolState={toolState}
                  isBookmarked={isPageBookmarked(i + 1)}
                  onToggleBookmark={toggleBookmark}
                  onAddAnnotation={addAnnotation}
                  onUpdateAnnotation={updateAnnotation}
                  onRemoveAnnotation={removeAnnotation}
                  onSelectAnnotation={(id) => setToolState(s => ({ ...s, selectedAnnotationId: id }))}
                />
              ))}
            </div>
          )}

          {viewMode === 'single' && (
            <div className="h-full flex flex-col items-center justify-center relative p-4">
              <PdfPage
                pdf={pdfProxy}
                pageNum={currentPage}
                annotations={annotations[currentPage] || []}
                toolState={toolState}
                isBookmarked={isPageBookmarked(currentPage)}
                onToggleBookmark={toggleBookmark}
                onAddAnnotation={addAnnotation}
                onUpdateAnnotation={updateAnnotation}
                onRemoveAnnotation={removeAnnotation}
                onSelectAnnotation={(id) => setToolState(s => ({ ...s, selectedAnnotationId: id }))}
              />
              <div className="absolute bottom-4 flex items-center gap-6 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-white z-20 shadow-2xl">
                <button 
                  disabled={currentPage <= 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="disabled:opacity-20 hover:scale-110 active:scale-95 transition-transform"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-[10px] font-black uppercase tracking-widest">{currentPage} / {numPages}</span>
                <button 
                  disabled={currentPage >= numPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="disabled:opacity-20 hover:scale-110 active:scale-95 transition-transform"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {viewMode === 'double' && (
            (() => {
              const p1 = (currentPage - 1) * 2 + 1;
              const p2 = (currentPage - 1) * 2 + 2;
              return (
                <div className="h-full flex flex-col items-center justify-center relative p-4">
                  <div className="flex gap-4 items-start justify-center max-w-full">
                    {p1 <= numPages && (
                      <div className="w-1/2 flex justify-end">
                        <PdfPage
                          pdf={pdfProxy}
                          pageNum={p1}
                          annotations={annotations[p1] || []}
                          toolState={toolState}
                          isBookmarked={isPageBookmarked(p1)}
                          onToggleBookmark={toggleBookmark}
                          onAddAnnotation={addAnnotation}
                          onUpdateAnnotation={updateAnnotation}
                          onRemoveAnnotation={removeAnnotation}
                          onSelectAnnotation={(id) => setToolState(s => ({ ...s, selectedAnnotationId: id }))}
                        />
                      </div>
                    )}
                    {p2 <= numPages && (
                      <div className="w-1/2 flex justify-start">
                        <PdfPage
                          pdf={pdfProxy}
                          pageNum={p2}
                          annotations={annotations[p2] || []}
                          toolState={toolState}
                          isBookmarked={isPageBookmarked(p2)}
                          onToggleBookmark={toggleBookmark}
                          onAddAnnotation={addAnnotation}
                          onUpdateAnnotation={updateAnnotation}
                          onRemoveAnnotation={removeAnnotation}
                          onSelectAnnotation={(id) => setToolState(s => ({ ...s, selectedAnnotationId: id }))}
                        />
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-4 flex items-center gap-6 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-white z-20 shadow-2xl">
                    <button 
                      disabled={currentPage <= 1} 
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="disabled:opacity-20 hover:scale-110 active:scale-95 transition-transform"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-widest">Pages {p1}-{Math.min(p2, numPages)} / {numPages}</span>
                    <button 
                      disabled={p2 >= numPages} 
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="disabled:opacity-20 hover:scale-110 active:scale-95 transition-transform"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}

interface PdfPageProps {
  key?: string;
  pdf: pdfjs.PDFDocumentProxy;
  pageNum: number;
  annotations: Annotation[];
  toolState: AnnotationState;
  isBookmarked?: boolean;
  onToggleBookmark?: (page: number) => void;
  onAddAnnotation: (page: number, annotation: Annotation) => void;
  onUpdateAnnotation: (page: number, id: string, updates: Partial<Annotation>) => void;
  onRemoveAnnotation: (page: number, id: string) => void;
  onSelectAnnotation: (id: string | null) => void;
}

function PdfPage({
  pdf,
  pageNum,
  annotations,
  toolState,
  isBookmarked = false,
  onToggleBookmark,
  onAddAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  onSelectAnnotation,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 1000, height: 1400 });

  useEffect(() => {
    let active = true;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(pageNum);
        if (!active) return;
        
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas || !active) return;

        const context = canvas.getContext('2d');
        if (!context || !active) return;

        // Ensure any previous task on this canvas is cancelled
        if (renderTaskRef.current) {
          try {
            await renderTaskRef.current.cancel();
          } catch (e) {
            // Error is expected if already cancelled
          }
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        setDims({ width: viewport.width, height: viewport.height });

        const renderContext: any = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTaskRef.current = page.render(renderContext);
        
        try {
          await renderTaskRef.current.promise;
          if (active) setLoading(false);
        } catch (error: any) {
          if (error?.name !== 'RenderingCancelledException' && !error?.message?.includes('Worker was destroyed')) {
            console.error('Error rendering page:', error);
          }
        }
      } catch (error: any) {
        if (active && !error?.message?.includes('Worker was destroyed')) {
          console.error('Error fetching page:', error);
        }
      }
    };

    renderPage();
    
    return () => {
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdf, pageNum]);

  return (
    <div 
      id={`pdf-page-${pageNum}`}
      className="relative rounded-2xl shadow-2xl overflow-hidden bg-white border border-white/10 group transition-all duration-300"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-sm animate-pulse z-10">
           <div className="w-8 h-8 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
        </div>
      )}
      <canvas ref={canvasRef} className="max-w-full h-auto block" />
      <PdfAnnotationLayer
        pageNum={pageNum}
        pageWidth={dims.width}
        pageHeight={dims.height}
        annotations={annotations}
        toolState={toolState}
        onAddAnnotation={onAddAnnotation}
        onUpdateAnnotation={onUpdateAnnotation}
        onRemoveAnnotation={onRemoveAnnotation}
        onSelectAnnotation={onSelectAnnotation}
      />

      {/* Page Bookmark Toggle Icon - Rendered after annotation layer with z-30 to ensure clickability */}
      {onToggleBookmark && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(pageNum);
          }}
          className={cn(
            "absolute top-3 right-3 z-30 pointer-events-auto p-2 sm:p-2.5 rounded-xl transition-all shadow-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold border cursor-pointer select-none",
            isBookmarked
              ? "bg-amber-500 text-white border-amber-400/50 shadow-amber-500/30 scale-105 opacity-100"
              : "bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border-white/20 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
          )}
          title={isBookmarked ? "Remove Page Bookmark" : "Bookmark this Page"}
        >
          <BookmarkIcon className={cn("w-4 h-4", isBookmarked && "fill-white text-white")} />
          <span className="text-[10px] uppercase font-black tracking-wider hidden sm:inline">
            {isBookmarked ? "Bookmarked" : "Bookmark"}
          </span>
        </button>
      )}
    </div>
  );
}

