/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { 
  MousePointer, 
  Pencil, 
  Highlighter, 
  Square, 
  Type, 
  Eraser, 
  RotateCcw, 
  RotateCw, 
  Download, 
  Upload, 
  Eye, 
  EyeOff, 
  Trash2,
  ChevronDown,
  ChevronUp,
  Palette,
  Compass
} from 'lucide-react';
import { AnnotationTool, AnnotationState, Annotation } from './annotationTypes.ts';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

interface AnnotationToolbarProps {
  toolState: AnnotationState;
  setToolState: React.Dispatch<React.SetStateAction<AnnotationState>>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSaveToFile: () => void;
  onLoadFromFile: (file: File) => Promise<boolean>;
  onClearAll: () => void;
  onUpdateSelectedAnnotation?: (updates: Partial<Annotation>) => void;
  scoreTitle: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const PEN_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#000000', // Black
  '#ffffff', // White
];

const HIGHLIGHT_COLORS = [
  'rgba(250, 204, 21, 0.45)', // Yellow
  'rgba(34, 197, 94, 0.45)',  // Green
  'rgba(6, 182, 212, 0.45)',  // Cyan
  'rgba(236, 72, 153, 0.45)', // Pink
  'rgba(249, 115, 22, 0.45)', // Orange
  'rgba(168, 85, 247, 0.45)', // Purple
];

const BORDER_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#000000', // Black
  '#ffffff', // White
];

const TEXT_FONT_SIZES = [16, 22, 28, 36, 48];

export function AnnotationToolbar({
  toolState,
  setToolState,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveToFile,
  onLoadFromFile,
  onClearAll,
  onUpdateSelectedAnnotation,
  scoreTitle,
  onToggleSidebar,
  isSidebarOpen,
}: AnnotationToolbarProps) {
  const { resolvedTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsCollapsed(e.matches);
    };
    
    // Set initial state
    handleMediaChange(mediaQuery);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  const handleToolSelect = (tool: AnnotationTool) => {
    setToolState(prev => ({
      ...prev,
      activeTool: tool,
      selectedAnnotationId: null
    }));
  };

  const handleColorChange = (newColor: string) => {
    setToolState(s => {
      const tool = s.activeTool;
      if (tool === 'pen') return { ...s, color: newColor };
      if (tool === 'highlight') return { ...s, highlightColor: newColor };
      if (tool === 'rectangle') return { ...s, rectBorderColor: newColor };
      if (tool === 'text') return { ...s, textColor: newColor };
      return { ...s, color: newColor };
    });

    if (toolState.selectedAnnotationId && onUpdateSelectedAnnotation) {
      onUpdateSelectedAnnotation({
        color: newColor,
        borderColor: newColor,
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const success = await onLoadFromFile(file);
      if (success) {
        alert('Annotations loaded successfully!');
      } else {
        alert('Failed to load annotation file. Make sure it is a valid annotation JSON file.');
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeToolLabel = 
    toolState.activeTool === 'select' ? 'Select' :
    toolState.activeTool === 'pen' ? 'Pen' :
    toolState.activeTool === 'highlight' ? 'Highlight' :
    toolState.activeTool === 'rectangle' ? 'Box' :
    toolState.activeTool === 'text' ? 'Text' : 'Eraser';

  const activeColor = 
    toolState.activeTool === 'pen' ? toolState.color :
    toolState.activeTool === 'highlight' ? toolState.highlightColor :
    toolState.activeTool === 'rectangle' ? toolState.rectBorderColor :
    toolState.activeTool === 'text' ? toolState.textColor : toolState.color;

  return (
    <div className="w-full z-30">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />

      {/* COMPACT COLLAPSED VIEW */}
      {isCollapsed ? (
        <div className={cn(
          "px-3 py-1.5 rounded-full border backdrop-blur-xl flex items-center gap-2 shadow-xl transition-all w-max",
          resolvedTheme === 'dark' 
            ? "bg-[#18181b]/95 border-white/15 text-white" 
            : "bg-white/95 border-black/10 text-slate-900"
        )}>
          {/* Active Tool Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-xs font-black uppercase tracking-wider">
            {toolState.activeTool === 'pen' && <Pencil className="w-3.5 h-3.5" />}
            {toolState.activeTool === 'highlight' && <Highlighter className="w-3.5 h-3.5" />}
            {toolState.activeTool === 'rectangle' && <Square className="w-3.5 h-3.5" />}
            {toolState.activeTool === 'text' && <Type className="w-3.5 h-3.5" />}
            {toolState.activeTool === 'eraser' && <Eraser className="w-3.5 h-3.5" />}
            {toolState.activeTool === 'select' && <MousePointer className="w-3.5 h-3.5" />}
            <span>{activeToolLabel}</span>
            <span 
              className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/20 ml-0.5" 
              style={{ backgroundColor: activeColor }}
            />
          </div>

          {/* Quick Tool Switches */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => handleToolSelect('select')}
              className={cn("p-1.5 rounded-lg transition-colors", toolState.activeTool === 'select' ? "bg-orange-500 text-white" : "hover:bg-black/5 dark:hover:bg-white/10")}
              title="Select Tool"
            >
              <MousePointer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleToolSelect('pen')}
              className={cn("p-1.5 rounded-lg transition-colors", toolState.activeTool === 'pen' ? "bg-orange-500 text-white" : "hover:bg-black/5 dark:hover:bg-white/10")}
              title="Pen Tool"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleToolSelect('highlight')}
              className={cn("p-1.5 rounded-lg transition-colors", toolState.activeTool === 'highlight' ? "bg-orange-500 text-white" : "hover:bg-black/5 dark:hover:bg-white/10")}
              title="Highlight Tool"
            >
              <Highlighter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleToolSelect('text')}
              className={cn("p-1.5 rounded-lg transition-colors", toolState.activeTool === 'text' ? "bg-orange-500 text-white" : "hover:bg-black/5 dark:hover:bg-white/10")}
              title="Text Note Tool"
            >
              <Type className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-[1px] h-3.5 bg-black/10 dark:bg-white/10 mx-0.5" />

          {/* Undo / Redo */}
          <button disabled={!canUndo} onClick={onUndo} className="p-1 text-slate-500 dark:text-white/60 disabled:opacity-20 hover:text-orange-500">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button disabled={!canRedo} onClick={onRedo} className="p-1 text-slate-500 dark:text-white/60 disabled:opacity-20 hover:text-orange-500">
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Expand Button */}
          <button
            onClick={() => setIsCollapsed(false)}
            className="ml-1 pl-2 border-l border-black/10 dark:border-white/10 flex items-center gap-1 text-[10px] font-black uppercase text-orange-500 hover:text-orange-400"
          >
            <span>Tools</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* EXPANDED TOOLBAR VIEW - INTEGRATED SINGLE ROW */
        <div className="w-full py-0.5 flex flex-nowrap items-center justify-between gap-3 overflow-x-auto custom-scrollbar transition-all text-xs border-0 bg-transparent shadow-none">
          {/* Primary Tools */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 mr-1 hidden sm:inline">
              Tools:
            </span>

            {/* Select Tool */}
            <button
              onClick={() => handleToolSelect('select')}
              className={cn(
                "px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer",
                toolState.activeTool === 'select'
                  ? "bg-orange-500 text-white shadow-sm"
                  : (resolvedTheme === 'dark' ? "hover:bg-white/10 text-white/70" : "hover:bg-black/5 text-slate-600")
              )}
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider">Select</span>
            </button>

            {/* Pen Tool */}
            <button
              onClick={() => handleToolSelect('pen')}
              className={cn(
                "px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer",
                toolState.activeTool === 'pen'
                  ? "bg-orange-500 text-white shadow-sm"
                  : (resolvedTheme === 'dark' ? "hover:bg-white/10 text-white/70" : "hover:bg-black/5 text-slate-600")
              )}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider">Pen</span>
            </button>

            {/* Highlight Tool */}
            <button
              onClick={() => handleToolSelect('highlight')}
              className={cn(
                "px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer",
                toolState.activeTool === 'highlight'
                  ? "bg-orange-500 text-white shadow-sm"
                  : (resolvedTheme === 'dark' ? "hover:bg-white/10 text-white/70" : "hover:bg-black/5 text-slate-600")
              )}
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider">Highlight</span>
            </button>

            {/* Box Tool */}
            <button
              onClick={() => handleToolSelect('rectangle')}
              className={cn(
                "px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer",
                toolState.activeTool === 'rectangle'
                  ? "bg-orange-500 text-white shadow-sm"
                  : (resolvedTheme === 'dark' ? "hover:bg-white/10 text-white/70" : "hover:bg-black/5 text-slate-600")
              )}
            >
              <Square className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider">Box</span>
            </button>

            {/* Text Tool */}
            <button
              onClick={() => handleToolSelect('text')}
              className={cn(
                "px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer",
                toolState.activeTool === 'text'
                  ? "bg-orange-500 text-white shadow-sm"
                  : (resolvedTheme === 'dark' ? "hover:bg-white/10 text-white/70" : "hover:bg-black/5 text-slate-600")
              )}
            >
              <Type className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider">Text</span>
            </button>

            {/* Eraser Tool */}
            <button
              onClick={() => handleToolSelect('eraser')}
              className={cn(
                "px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer",
                toolState.activeTool === 'eraser'
                  ? "bg-red-500 text-white shadow-sm"
                  : (resolvedTheme === 'dark' ? "hover:bg-white/10 text-white/70" : "hover:bg-black/5 text-slate-600")
              )}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider">Eraser</span>
            </button>
          </div>

          {/* Tool Options (Colors & Stroke) */}
          <div className="flex items-center gap-2 border-x border-black/10 dark:border-white/10 px-3 py-0.5 shrink-0">
            <span className="text-[9px] uppercase font-bold opacity-50">Color:</span>
            <div className="flex items-center gap-1">
              {(toolState.activeTool === 'highlight' ? HIGHLIGHT_COLORS : PEN_COLORS).map((c) => (
                <button
                  key={c}
                  onClick={() => handleColorChange(c)}
                  style={{ backgroundColor: c }}
                  className={cn(
                    "w-4 h-4 rounded-full border border-black/20 dark:border-white/20 transition-transform active:scale-90 flex items-center justify-center cursor-pointer",
                    activeColor === c && "ring-2 ring-orange-500 scale-110"
                  )}
                />
              ))}
            </div>

            {toolState.activeTool === 'pen' && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-[9px] uppercase font-bold opacity-50">Width:</span>
                {[2, 4, 8].map((w) => (
                  <button
                    key={w}
                    onClick={() => {
                      setToolState(s => ({ ...s, strokeWidth: w }));
                      if (toolState.selectedAnnotationId && onUpdateSelectedAnnotation) {
                        onUpdateSelectedAnnotation({ strokeWidth: w });
                      }
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-black cursor-pointer",
                      toolState.strokeWidth === w ? "bg-orange-500 text-white" : "bg-black/5 dark:bg-white/10"
                    )}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            )}

            {toolState.activeTool === 'text' && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-[9px] uppercase font-bold opacity-50">Size:</span>
                {TEXT_FONT_SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      setToolState(s => ({ ...s, fontSize: sz }));
                      if (toolState.selectedAnnotationId && onUpdateSelectedAnnotation) {
                        onUpdateSelectedAnnotation({ fontSize: sz });
                      }
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-black cursor-pointer",
                      toolState.fontSize === sz ? "bg-orange-500 text-white" : "bg-black/5 dark:bg-white/10"
                    )}
                  >
                    {sz === 16 ? 'S' : sz === 22 ? 'M' : sz === 28 ? 'L' : 'XL'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Undo, Redo, Save/Load, Collapse */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button disabled={!canUndo} onClick={onUndo} className="p-1 rounded-lg disabled:opacity-20 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button disabled={!canRedo} onClick={onRedo} className="p-1 rounded-lg disabled:opacity-20 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setToolState(s => ({ ...s, isVisible: !s.isVisible }))}
              className={cn("p-1 rounded-lg cursor-pointer", !toolState.isVisible && "bg-red-500/20 text-red-500")}
              title="Toggle Overlay Visibility"
            >
              {toolState.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onSaveToFile}
              className="px-2 py-0.5 rounded-lg bg-orange-500 text-white text-[10px] font-black uppercase flex items-center gap-1 hover:bg-orange-400 cursor-pointer"
              title="Save Annotations File"
            >
              <Download className="w-3 h-3" />
              <span className="hidden lg:inline">Save</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[10px] font-black uppercase flex items-center gap-1 hover:bg-black/10 dark:hover:bg-white/20 cursor-pointer"
              title="Load Annotations File"
            >
              <Upload className="w-3 h-3" />
              <span className="hidden lg:inline">Load</span>
            </button>

            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Collapse Toolbar"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
