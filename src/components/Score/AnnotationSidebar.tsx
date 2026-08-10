/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bookmark, Annotation } from './annotationTypes.ts';
import { 
  Bookmark as BookmarkIcon, 
  MessageSquare, 
  PenTool, 
  Highlighter, 
  Square, 
  Type, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Compass
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

interface AnnotationSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  bookmarks: Bookmark[];
  annotations: Record<number, Annotation[]>;
  selectedAnnotationId: string | null;
  onNavigateToPage: (page: number) => void;
  onSelectAnnotation: (page: number, id: string) => void;
  onUpdateAnnotationLabel: (page: number, id: string, label: string) => void;
  onRemoveAnnotation: (page: number, id: string) => void;
  onToggleBookmark: (page: number) => void;
  onRemoveBookmark: (id: string) => void;
  onUpdateBookmarkTitle: (id: string, title: string) => void;
  numPages: number;
}

export function AnnotationSidebar({
  isOpen,
  onToggle,
  bookmarks,
  annotations,
  selectedAnnotationId,
  onNavigateToPage,
  onSelectAnnotation,
  onUpdateAnnotationLabel,
  onRemoveAnnotation,
  onToggleBookmark,
  onRemoveBookmark,
  onUpdateBookmarkTitle,
  numPages,
}: AnnotationSidebarProps) {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'annotations'>('bookmarks');
  
  // Inline editing state for bookmark
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editingBookmarkTitle, setEditingBookmarkTitle] = useState('');

  // Inline editing state for annotation label
  const [editingAnnotationKey, setEditingAnnotationKey] = useState<string | null>(null); // "page-id"
  const [editingAnnotationLabel, setEditingAnnotationLabel] = useState('');

  // Add bookmark input
  const [newBkPage, setNewBkPage] = useState<number>(1);
  const [showAddBk, setShowAddBk] = useState(false);

  // Flatten and sort annotations by page
  const sortedAnnotationsList = React.useMemo(() => {
    const list: { page: number; item: Annotation }[] = [];
    Object.entries(annotations).forEach(([pgStr, pageItems]) => {
      const pageNum = Number(pgStr);
      if (Array.isArray(pageItems)) {
        pageItems.forEach(item => {
          list.push({ page: pageNum, item });
        });
      }
    });
    return list.sort((a, b) => a.page !== b.page ? a.page - b.page : a.item.createdAt - b.item.createdAt);
  }, [annotations]);

  const handleSaveBookmarkTitle = (id: string) => {
    if (editingBookmarkTitle.trim()) {
      onUpdateBookmarkTitle(id, editingBookmarkTitle.trim());
    }
    setEditingBookmarkId(null);
  };

  const handleSaveAnnotationLabel = (page: number, id: string) => {
    onUpdateAnnotationLabel(page, id, editingAnnotationLabel.trim());
    setEditingAnnotationKey(null);
  };

  const getAnnotationIcon = (type: string) => {
    switch (type) {
      case 'pen':
        return <PenTool className="w-4 h-4 text-rose-400" />;
      case 'highlight':
        return <Highlighter className="w-4 h-4 text-amber-400" />;
      case 'rectangle':
        return <Square className="w-4 h-4 text-blue-400" />;
      case 'text':
        return <Type className="w-4 h-4 text-emerald-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
    }
  };

  const getDefaultAnnotationName = (item: Annotation) => {
    if (item.label) return item.label;
    if (item.type === 'text') return item.text || 'Text note';
    if (item.type === 'pen') return 'Freehand drawing';
    if (item.type === 'highlight') return item.borderOnly ? 'Rectangle outline' : 'Highlighted region';
    return 'Annotation';
  };

  const { resolvedTheme } = useTheme();

  if (!isOpen) {
    return null;
  }

  return (
    <aside className={cn(
      "w-80 shrink-0 h-full max-h-full border-r flex flex-col shadow-2xl backdrop-blur-2xl z-30 animate-in slide-in-from-left duration-200 transition-colors overflow-hidden",
      resolvedTheme === 'dark' 
        ? "bg-[#121215]/95 text-slate-200 border-white/10" 
        : "bg-white/95 text-slate-800 border-slate-200"
    )}>
      {/* Sidebar Header */}
      <div className={cn("p-4 border-b flex items-center justify-between", resolvedTheme === 'dark' ? "border-white/10" : "border-slate-200")}>
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-orange-500" />
          <h2 className={cn("text-sm font-black uppercase tracking-wider", resolvedTheme === 'dark' ? "text-white" : "text-slate-900")}>Score Index</h2>
        </div>
        <button
          onClick={onToggle}
          className={cn("p-1.5 rounded-xl transition-colors", resolvedTheme === 'dark' ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-black/5 text-slate-400 hover:text-slate-900")}
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className={cn("flex border-b p-1", resolvedTheme === 'dark' ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-100")}>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2",
            activeTab === 'bookmarks'
              ? "bg-orange-500 text-white shadow-lg"
              : (resolvedTheme === 'dark' ? "text-slate-400 hover:text-slate-200 hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-black/5")
          )}
        >
          <BookmarkIcon className="w-3.5 h-3.5" />
          <span>Bookmarks</span>
          <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] font-black">
            {bookmarks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('annotations')}
          className={cn(
            "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2",
            activeTab === 'annotations'
              ? "bg-orange-500 text-white shadow-lg"
              : (resolvedTheme === 'dark' ? "text-slate-400 hover:text-slate-200 hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-black/5")
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Notes</span>
          <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] font-black">
            {sortedAnnotationsList.length}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {/* BOOKMARKS TAB */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Saved Pages
              </span>
              <button
                onClick={() => setShowAddBk(!showAddBk)}
                className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 px-2 py-1 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Bookmark
              </button>
            </div>

            {/* Quick Add Bookmark Input */}
            {showAddBk && (
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-2 animate-in fade-in">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">
                  Bookmark Page (1 to {numPages}):
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={newBkPage}
                    onChange={(e) => setNewBkPage(Math.max(1, Math.min(numPages, Number(e.target.value))))}
                    className="w-20 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={() => {
                      onToggleBookmark(newBkPage);
                      setShowAddBk(false);
                    }}
                    className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs py-1 px-3 rounded-lg transition-colors"
                  >
                    Save Page
                  </button>
                </div>
              </div>
            )}

            {bookmarks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs italic">
                No bookmarks added yet. Click the bookmark icon on any page or add one above!
              </div>
            ) : (
              bookmarks.map((bk) => {
                const isEditing = editingBookmarkId === bk.id;

                return (
                  <div
                    key={bk.id}
                    className="group flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 hover:border-orange-500/30 p-2.5 rounded-xl transition-all cursor-pointer"
                    onClick={() => onNavigateToPage(bk.page)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <BookmarkIcon className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400/20" />
                      
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-black">
                        Pg {bk.page}
                      </span>

                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            autoFocus
                            type="text"
                            value={editingBookmarkTitle}
                            onChange={(e) => setEditingBookmarkTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveBookmarkTitle(bk.id);
                              if (e.key === 'Escape') setEditingBookmarkId(null);
                            }}
                            className="w-full bg-black/60 border border-orange-500 rounded px-2 py-0.5 text-xs text-white outline-none"
                          />
                          <button
                            onClick={() => handleSaveBookmarkTitle(bk.id)}
                            className="p-1 text-emerald-400 hover:bg-white/10 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingBookmarkId(null)}
                            className="p-1 text-slate-400 hover:bg-white/10 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-200 truncate flex-1">
                          {bk.title}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingBookmarkId(bk.id);
                            setEditingBookmarkTitle(bk.title);
                          }}
                          className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                          title="Rename Bookmark"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRemoveBookmark(bk.id)}
                          className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded transition-colors"
                          title="Delete Bookmark"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ANNOTATIONS TAB */}
        {activeTab === 'annotations' && (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-1 block">
              Page Annotations ({sortedAnnotationsList.length})
            </span>

            {sortedAnnotationsList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs italic">
                No annotations found. Use pen, text, or highlight tools to add notes on the score!
              </div>
            ) : (
              sortedAnnotationsList.map(({ page, item }) => {
                const isSelected = selectedAnnotationId === item.id;
                const editKey = `${page}-${item.id}`;
                const isEditing = editingAnnotationKey === editKey;
                const name = getDefaultAnnotationName(item);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group flex flex-col gap-1.5 bg-white/5 hover:bg-white/10 border p-2.5 rounded-xl transition-all cursor-pointer",
                      isSelected ? "border-orange-500 bg-orange-500/10" : "border-white/5 hover:border-white/20"
                    )}
                    onClick={() => {
                      onSelectAnnotation(page, item.id);
                      onNavigateToPage(page);
                    }}
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getAnnotationIcon(item.type)}
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/10 text-slate-300 text-[10px] font-black">
                          Pg {page}
                        </span>

                        {isEditing ? (
                          <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              type="text"
                              value={editingAnnotationLabel}
                              onChange={(e) => setEditingAnnotationLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveAnnotationLabel(page, item.id);
                                if (e.key === 'Escape') setEditingAnnotationKey(null);
                              }}
                              className="w-full bg-black/60 border border-orange-500 rounded px-2 py-0.5 text-xs text-white outline-none"
                            />
                            <button
                              onClick={() => handleSaveAnnotationLabel(page, item.id)}
                              className="p-1 text-emerald-400 hover:bg-white/10 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingAnnotationKey(null)}
                              className="p-1 text-slate-400 hover:bg-white/10 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-200 truncate flex-1">
                            {name}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setEditingAnnotationKey(editKey);
                              setEditingAnnotationLabel(item.label || (item.type === 'text' ? item.text : ''));
                            }}
                            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="Label or Rename Note"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onRemoveAnnotation(page, item.id)}
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded transition-colors"
                            title="Delete Note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
