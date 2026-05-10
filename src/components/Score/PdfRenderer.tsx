/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

// Set worker source using unpkg which is more reliable for specific versions
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfRendererProps {
  url: string;
  viewMode: 'scroll' | 'single' | 'double';
}

export default function PdfRenderer({ url, viewMode }: PdfRendererProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfProxy, setPdfProxy] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

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

  if (!pdfProxy) {
    return (
      <div className="flex items-center justify-center p-20 animate-pulse text-[10px] uppercase font-black tracking-widest">
        Loading Document...
      </div>
    );
  }

  if (viewMode === 'scroll') {
    return (
      <div className="flex flex-col items-center gap-8 py-8" ref={containerRef}>
        {Array.from({ length: numPages }, (_, i) => (
          <PdfPage key={`${url}-${i + 1}`} pdf={pdfProxy} pageNum={i + 1} />
        ))}
      </div>
    );
  }

  if (viewMode === 'single') {
    return (
      <div className="h-full flex flex-col items-center justify-center relative p-8">
        <PdfPage pdf={pdfProxy} pageNum={currentPage} />
        <div className="absolute bottom-8 flex items-center gap-6 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-white z-10">
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
    );
  }

  if (viewMode === 'double') {
    const p1 = (currentPage - 1) * 2 + 1;
    const p2 = (currentPage - 1) * 2 + 2;
    return (
      <div className="h-full flex flex-col items-center justify-center relative p-8">
        <div className="flex gap-4 items-start justify-center max-w-full">
           {p1 <= numPages && <div className="w-1/2 flex justify-end"><PdfPage pdf={pdfProxy} pageNum={p1} /></div>}
           {p2 <= numPages && <div className="w-1/2 flex justify-start"><PdfPage pdf={pdfProxy} pageNum={p2} /></div>}
        </div>
        <div className="absolute bottom-8 flex items-center gap-6 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-white z-10">
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
  }

  return null;
}

function PdfPage({ pdf, pageNum }: { pdf: pdfjs.PDFDocumentProxy, pageNum: number, [key: string]: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="relative rounded-2xl shadow-2xl overflow-hidden bg-white border border-white/10 group transition-all duration-300">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-sm animate-pulse z-10">
           <div className="w-8 h-8 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
        </div>
      )}
      <canvas ref={canvasRef} className="max-w-full h-auto block" />
    </div>
  );
}
