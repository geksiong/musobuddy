/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { 
  Annotation, 
  AnnotationState, 
  PenAnnotation, 
  HighlightAnnotation, 
  TextAnnotation,
  Point
} from './annotationTypes.ts';
import { Trash2, Edit3 } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

interface PdfAnnotationLayerProps {
  pageNum: number;
  pageWidth: number;
  pageHeight: number;
  annotations: Annotation[];
  toolState: AnnotationState;
  onAddAnnotation: (page: number, annotation: Annotation) => void;
  onUpdateAnnotation: (page: number, id: string, updates: Partial<Annotation>) => void;
  onRemoveAnnotation: (page: number, id: string) => void;
  onSelectAnnotation: (id: string | null) => void;
}

const EDIT_COLORS = [
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

export function PdfAnnotationLayer({
  pageNum,
  pageWidth,
  pageHeight,
  annotations,
  toolState,
  onAddAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  onSelectAnnotation,
}: PdfAnnotationLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Aspect ratio scaling
  const viewBoxWidth = 1000;
  const viewBoxHeight = pageHeight && pageWidth ? (pageHeight / pageWidth) * 1000 : 1400;

  // Drawing / Dragging state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPenPoints, setCurrentPenPoints] = useState<Point[]>([]);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Moving existing annotation
  const [movingAnnotationId, setMovingAnnotationId] = useState<string | null>(null);
  const [moveOffset, setMoveOffset] = useState<Point | null>(null);

  // Text Input State
  const [textInputPos, setTextInputPos] = useState<Point | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const textCreatedTimeRef = useRef<number>(0);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Auto focus inline text input reliably
  React.useEffect(() => {
    if (textInputPos || editingTextId) {
      const focusInput = () => {
        if (textInputRef.current) {
          textInputRef.current.focus();
          if (textInputRef.current.value) {
            textInputRef.current.select();
          }
        }
      };
      focusInput();
      const timer = setTimeout(focusInput, 30);
      return () => clearTimeout(timer);
    }
  }, [textInputPos, editingTextId]);

  // Convert client pixel coordinates to SVG normalized coordinates
  const getSvgPoint = useCallback((e: React.PointerEvent | React.MouseEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(viewBoxWidth, ((e.clientX - rect.left) / rect.width) * viewBoxWidth));
    const y = Math.max(0, Math.min(viewBoxHeight, ((e.clientY - rect.top) / rect.height) * viewBoxHeight));
    return { x, y };
  }, [viewBoxWidth, viewBoxHeight]);

  // Pointer Handlers for Canvas Drawing
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!toolState.isVisible) return;

    if (editingTextId || textInputPos) {
      if (textInputValue.trim()) {
        handleSaveText();
      } else {
        setTextInputPos(null);
        setEditingTextId(null);
      }
    }

    const pt = getSvgPoint(e);
    const tool = toolState.activeTool;

    if (tool === 'pen') {
      setIsDrawing(true);
      setCurrentPenPoints([pt]);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (tool === 'highlight' || tool === 'rectangle') {
      setIsDrawing(true);
      setDragStartPoint(pt);
      setCurrentRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (tool === 'text') {
      textCreatedTimeRef.current = Date.now();
      setTextInputPos(pt);
      setTextInputValue('');
      setEditingTextId(null);
    } else if (tool === 'select') {
      // Unselect if background is clicked
      onSelectAnnotation(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing && !movingAnnotationId) return;

    const pt = getSvgPoint(e);
    const tool = toolState.activeTool;

    if (isDrawing && tool === 'pen') {
      setCurrentPenPoints(prev => [...prev, pt]);
    } else if (isDrawing && (tool === 'highlight' || tool === 'rectangle') && dragStartPoint) {
      const x = Math.min(dragStartPoint.x, pt.x);
      const y = Math.min(dragStartPoint.y, pt.y);
      const w = Math.abs(pt.x - dragStartPoint.x);
      const h = Math.abs(pt.y - dragStartPoint.y);
      setCurrentRect({ x, y, w, h });
    } else if (movingAnnotationId && moveOffset) {
      // Move annotation item
      const item = annotations.find(a => a.id === movingAnnotationId);
      if (!item) return;

      if (item.type === 'text' || item.type === 'highlight') {
        const newX = Math.max(0, pt.x - moveOffset.x);
        const newY = Math.max(0, pt.y - moveOffset.y);
        onUpdateAnnotation(pageNum, item.id, { x: newX, y: newY });
      } else if (item.type === 'pen') {
        const dx = pt.x - moveOffset.x;
        const dy = pt.y - moveOffset.y;
        const newPoints = item.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        onUpdateAnnotation(pageNum, item.id, { points: newPoints });
        setMoveOffset(pt);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (movingAnnotationId) {
      setMovingAnnotationId(null);
      setMoveOffset(null);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    const tool = toolState.activeTool;

    if (tool === 'pen' && currentPenPoints.length > 0) {
      const newPen: PenAnnotation = {
        id: Math.random().toString(36).substring(2, 11),
        page: pageNum,
        type: 'pen',
        points: currentPenPoints,
        color: toolState.color,
        strokeWidth: toolState.strokeWidth,
        createdAt: Date.now()
      };
      onAddAnnotation(pageNum, newPen);
      setCurrentPenPoints([]);
    } else if ((tool === 'highlight' || tool === 'rectangle') && currentRect && currentRect.w > 5 && currentRect.h > 5) {
      const isBox = tool === 'rectangle';
      const newHighlight: HighlightAnnotation = {
        id: Math.random().toString(36).substring(2, 11),
        page: pageNum,
        type: 'highlight',
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.w,
        height: currentRect.h,
        color: isBox ? 'transparent' : toolState.highlightColor,
        borderOnly: isBox,
        borderColor: isBox ? toolState.rectBorderColor : undefined,
        borderWidth: isBox ? toolState.rectBorderWidth : undefined,
        createdAt: Date.now()
      };
      onAddAnnotation(pageNum, newHighlight);
      setCurrentRect(null);
      setDragStartPoint(null);
    } else {
      setCurrentRect(null);
      setDragStartPoint(null);
      setCurrentPenPoints([]);
    }
  };

  // Submit Inline Text Annotation
  const handleSaveText = () => {
    if (!textInputValue.trim()) {
      setTextInputPos(null);
      setEditingTextId(null);
      return;
    }

    if (editingTextId) {
      onUpdateAnnotation(pageNum, editingTextId, { text: textInputValue });
      setEditingTextId(null);
    } else if (textInputPos) {
      const newText: TextAnnotation = {
        id: Math.random().toString(36).substring(2, 11),
        page: pageNum,
        type: 'text',
        x: textInputPos.x,
        y: textInputPos.y,
        text: textInputValue,
        color: toolState.textColor,
        fontSize: toolState.fontSize,
        backgroundColor: toolState.textHasBorder ? toolState.textBgColor : undefined,
        hasBorder: toolState.textHasBorder,
        createdAt: Date.now()
      };
      onAddAnnotation(pageNum, newText);
      setTextInputPos(null);
    }
    setTextInputValue('');
  };

  // Change color of selected annotation
  const handleItemColorChange = (item: Annotation, newColor: string) => {
    if (item.type === 'pen') {
      onUpdateAnnotation(pageNum, item.id, { color: newColor });
    } else if (item.type === 'text') {
      onUpdateAnnotation(pageNum, item.id, { color: newColor });
    } else if (item.type === 'highlight') {
      if (item.borderOnly) {
        onUpdateAnnotation(pageNum, item.id, { borderColor: newColor });
      } else {
        onUpdateAnnotation(pageNum, item.id, { color: newColor });
      }
    }
  };

  // Annotation Click Handlers
  const handleItemClick = (e: React.MouseEvent, item: Annotation) => {
    e.stopPropagation();

    if (toolState.activeTool === 'eraser') {
      onRemoveAnnotation(pageNum, item.id);
      return;
    }

    if (toolState.activeTool === 'select') {
      onSelectAnnotation(item.id);
    }
  };

  const handleItemPointerDown = (e: React.PointerEvent, item: Annotation) => {
    if (toolState.activeTool === 'eraser') {
      onRemoveAnnotation(pageNum, item.id);
      return;
    }

    if (toolState.activeTool === 'select') {
      e.stopPropagation();
      onSelectAnnotation(item.id);
      const pt = getSvgPoint(e);
      setMovingAnnotationId(item.id);

      if (item.type === 'text' || item.type === 'highlight') {
        setMoveOffset({ x: pt.x - item.x, y: pt.y - item.y });
      } else if (item.type === 'pen') {
        setMoveOffset(pt);
      }
    }
  };

  // Build SVG path from pen points
  const getPenPath = (points: Point[]) => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  if (!toolState.isVisible) return null;

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-10">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={cn(
          "w-full h-full block touch-none",
          toolState.activeTool !== 'select' && "pointer-events-auto",
          toolState.activeTool === 'pen' && "cursor-crosshair",
          toolState.activeTool === 'highlight' && "cursor-crosshair",
          toolState.activeTool === 'rectangle' && "cursor-crosshair",
          toolState.activeTool === 'text' && "cursor-text",
          toolState.activeTool === 'eraser' && "cursor-alias",
          toolState.activeTool === 'select' && "pointer-events-auto cursor-default"
        )}
      >
        {/* Render Existing Page Annotations */}
        {annotations.map((item) => {
          const isSelected = toolState.selectedAnnotationId === item.id;

          if (item.type === 'pen') {
            return (
              <g key={item.id} className="group">
                <path
                  d={getPenPath(item.points)}
                  stroke={item.color}
                  strokeWidth={item.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    "transition-opacity pointer-events-auto",
                    toolState.activeTool === 'eraser' && "hover:opacity-30 cursor-pointer"
                  )}
                  onPointerDown={(e) => handleItemPointerDown(e, item)}
                  onClick={(e) => handleItemClick(e, item)}
                />
                {/* Selection indicator for pen */}
                {isSelected && (
                  <path
                    d={getPenPath(item.points)}
                    stroke="#f97316"
                    strokeWidth={item.strokeWidth + 4}
                    strokeDasharray="4 4"
                    fill="none"
                    opacity={0.6}
                  />
                )}
              </g>
            );
          }

          if (item.type === 'highlight') {
            return (
              <g key={item.id} className="group pointer-events-auto">
                <rect
                  x={item.x}
                  y={item.y}
                  width={item.width}
                  height={item.height}
                  fill={item.color || 'transparent'}
                  fillOpacity={item.borderOnly ? 0 : 0.45}
                  stroke={item.borderOnly ? item.borderColor : (isSelected ? '#f97316' : 'none')}
                  strokeWidth={item.borderOnly ? (item.borderWidth || 3) : (isSelected ? 2 : 0)}
                  strokeDasharray={isSelected && !item.borderOnly ? '4 4' : 'none'}
                  rx={6}
                  className={cn(
                    "transition-all",
                    toolState.activeTool === 'eraser' && "hover:opacity-30 cursor-pointer",
                    toolState.activeTool === 'select' && "cursor-move"
                  )}
                  onPointerDown={(e) => handleItemPointerDown(e, item)}
                  onClick={(e) => handleItemClick(e, item)}
                />
              </g>
            );
          }

          if (item.type === 'text') {
            return (
              <g 
                key={item.id} 
                className="group pointer-events-auto cursor-pointer"
                onPointerDown={(e) => handleItemPointerDown(e, item)}
                onClick={(e) => handleItemClick(e, item)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  textCreatedTimeRef.current = Date.now();
                  setEditingTextId(item.id);
                  setTextInputValue(item.text);
                  setTextInputPos({ x: item.x, y: item.y });
                }}
              >
                {/* Text Background Box if enabled */}
                {item.hasBorder && (
                  <rect
                    x={item.x - 6}
                    y={item.y - 4}
                    width={Math.max(40, item.text.length * (item.fontSize * 0.6) + 12)}
                    height={item.fontSize * 1.3}
                    fill={item.backgroundColor || 'rgba(255,255,255,0.95)'}
                    stroke={isSelected ? '#f97316' : '#cbd5e1'}
                    strokeWidth={isSelected ? 2 : 1}
                    rx={6}
                  />
                )}
                <text
                  x={item.x}
                  y={item.y}
                  fill={item.color || '#000000'}
                  fontSize={item.fontSize || 22}
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  dominantBaseline="hanging"
                  className={cn(
                    "select-none transition-all drop-shadow-sm",
                    toolState.activeTool === 'eraser' && "hover:opacity-30"
                  )}
                >
                  {item.text}
                </text>
              </g>
            );
          }

          return null;
        })}

        {/* Live Drawing Previews */}
        {isDrawing && toolState.activeTool === 'pen' && (
          <path
            d={getPenPath(currentPenPoints)}
            stroke={toolState.color}
            strokeWidth={toolState.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {isDrawing && (toolState.activeTool === 'highlight' || toolState.activeTool === 'rectangle') && currentRect && (
          <rect
            x={currentRect.x}
            y={currentRect.y}
            width={currentRect.w}
            height={currentRect.h}
            fill={toolState.activeTool === 'highlight' ? toolState.highlightColor : 'transparent'}
            fillOpacity={toolState.activeTool === 'highlight' ? 0.45 : 0}
            stroke={toolState.activeTool === 'rectangle' ? toolState.rectBorderColor : '#f97316'}
            strokeWidth={toolState.activeTool === 'rectangle' ? toolState.rectBorderWidth : 2}
            strokeDasharray={toolState.activeTool === 'highlight' ? '4 4' : 'none'}
            rx={6}
          />
        )}
      </svg>

      {/* Selected Item Floating Toolbar with Color Picker & Delete */}
      {toolState.selectedAnnotationId && (
        (() => {
          const item = annotations.find(a => a.id === toolState.selectedAnnotationId);
          if (!item) return null;
          const leftPercent = (item.type === 'pen' ? item.points[0]?.x : item.x) / viewBoxWidth * 100;
          const topPercent = (item.type === 'pen' ? item.points[0]?.y : item.y) / viewBoxHeight * 100;

          return (
            <div
              style={{ left: `${Math.min(85, Math.max(10, leftPercent))}%`, top: `${Math.max(2, topPercent - 5)}%` }}
              className="absolute pointer-events-auto transform -translate-y-full flex items-center gap-2 bg-[#18181b]/95 text-white border border-white/20 p-2 rounded-2xl shadow-2xl backdrop-blur-xl z-30 animate-in fade-in zoom-in duration-150"
            >
              <span className="text-[9px] font-black uppercase text-orange-400 tracking-wider px-1">
                {item.type}
              </span>

              {/* Color Swatch Options for Editing Selected Annotation */}
              <div className="flex items-center gap-1 border-x border-white/10 px-2">
                {EDIT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => handleItemColorChange(item, c)}
                    style={{ backgroundColor: c }}
                    className="w-4 h-4 rounded-full border border-white/30 transition-transform hover:scale-125 active:scale-90"
                    title="Change Color"
                  />
                ))}
              </div>

              {item.type === 'text' && (
                <button
                  onClick={() => {
                    textCreatedTimeRef.current = Date.now();
                    setEditingTextId(item.id);
                    setTextInputValue(item.text);
                    setTextInputPos({ x: item.x, y: item.y });
                  }}
                  className="p-1 rounded hover:bg-white/20 text-white transition-colors"
                  title="Edit Text"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => onRemoveAnnotation(pageNum, item.id)}
                className="p-1.5 rounded-lg hover:bg-red-500/30 text-red-400 transition-colors"
                title="Delete Annotation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })()
      )}

      {/* Inline Text Input overlay directly at clicked location */}
      {(textInputPos || editingTextId) && (
        <div
          style={{
            left: `${((textInputPos?.x || 0) / viewBoxWidth) * 100}%`,
            top: `${((textInputPos?.y || 0) / viewBoxHeight) * 100}%`,
          }}
          className="absolute pointer-events-auto z-40 transform -translate-y-1"
        >
          <input
            ref={textInputRef}
            autoFocus
            type="text"
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveText();
              } else if (e.key === 'Escape') {
                setTextInputPos(null);
                setEditingTextId(null);
              }
            }}
            onBlur={() => {
              if (Date.now() - textCreatedTimeRef.current < 350) return;
              if (textInputValue.trim()) {
                handleSaveText();
              } else {
                setTextInputPos(null);
                setEditingTextId(null);
              }
            }}
            placeholder="Type text here..."
            style={{
              color: editingTextId 
                ? (annotations.find(a => a.id === editingTextId)?.color || toolState.textColor) 
                : toolState.textColor,
              fontSize: `clamp(14px, ${(toolState.fontSize / 10) * 0.9}px, 40px)`,
              backgroundColor: toolState.textHasBorder ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
            }}
            className={cn(
              "font-bold font-sans outline-none transition-all px-1.5 py-0.5 rounded border-2 border-dashed border-orange-500 min-w-[120px]",
              toolState.textHasBorder ? "shadow-md border-solid border-slate-300" : "bg-transparent placeholder:text-slate-400 dark:placeholder:text-white/40"
            )}
          />
        </div>
      )}
    </div>
  );
}
