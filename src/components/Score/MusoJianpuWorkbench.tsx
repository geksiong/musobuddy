/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror, { ReactCodeMirrorRef, keymap } from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import {
  Play,
  Square,
  Printer,
  BookOpen,
  Columns2,
  Rows2,
  Eye,
  Wand2,
  SlidersHorizontal,
  ChevronDown,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Gauge,
  Music,
  Sun,
  Moon
} from 'lucide-react';
import { parseMusoJianpuScore } from '../../lib/musojianpu/parser.ts';
import { musoJianpu } from '../../lib/musojianpu/language.ts';
import {
  macroAdjustUnderlines,
  macroInsertGraceNote,
  macroInsertSnippet,
  macroSetKey,
  macroSetTempo,
  macroShiftOctave,
  macroShiftScaleDegrees,
  macroTidyFormatting,
  macroToggleAccidental,
  macroToggleDot,
  macroToggleMarking,
  macroToggleSlur,
  macroWrapTriplet,
  TextEditResult
} from '../../lib/musojianpu/macros.ts';
import { ERHU_KEYS, getErhuKeyInfo } from '../../lib/musojianpu/erhuKeys.ts';
import { MUSOJIANPU_TEMPLATES } from '../../lib/musojianpu/samples.ts';
import { MusoJianpuPlayer } from '../../lib/musojianpu/audioEngine.ts';
import { MusoJianpuNote } from '../../lib/musojianpu/types.ts';
import { MusoJianpuRenderer } from './MusoJianpuRenderer.tsx';
import { cn } from '../../lib/utils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';

type MacroTab = 'rhythm' | 'bowing' | 'fingering' | 'ornaments' | 'structure';

export interface MusoJianpuWorkbenchProps {
  content: string;
  zoom: number;
  showEditor: boolean;
  layout: 'split' | 'stacked' | 'sheet';
  fingeringStyle: 'chinese' | 'arabic';
  paperTheme: 'paper' | 'adaptive';
  onChangeContent: (nextContent: string) => void;
  onChangeTitle?: (nextTitle: string) => void;
  onLoadTemplate?: (nextContent: string, nextTitle: string) => void;
  onLayoutChange: (layout: 'split' | 'stacked' | 'sheet') => void;
  onFingeringStyleChange: (style: 'chinese' | 'arabic') => void;
  onPaperThemeChange: (theme: 'paper' | 'adaptive') => void;
}

export function MusoJianpuWorkbench({
  content,
  zoom,
  showEditor,
  layout,
  fingeringStyle,
  paperTheme,
  onChangeContent,
  onChangeTitle,
  onLoadTemplate,
  onLayoutChange,
  onFingeringStyleChange,
  onPaperThemeChange
}: MusoJianpuWorkbenchProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const playerRef = useRef<MusoJianpuPlayer | null>(null);
  const sheetPaneRef = useRef<HTMLDivElement>(null);

  const [activeMacroTab, setActiveMacroTab] = useState<MacroTab>('bowing');
  const [showMarkings, setShowMarkings] = useState(true);
  const [showLyrics, setShowLyrics] = useState(true);
  const [highlightMarkings, setHighlightMarkings] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [playbackTempoScale, setPlaybackTempoScale] = useState(1.0);

  // Cursor / selection sync state
  const [cursorOffset, setCursorOffset] = useState<number | null>(null);

  // Ctrl+J Tempo Macro Dialog state
  const [isTempoModalOpen, setIsTempoModalOpen] = useState(false);
  const [tempoInputBpm, setTempoInputBpm] = useState('80');
  const [tempoInputExpr, setTempoInputExpr] = useState('');

  // Status notice toast (e.g. print fallback notice)
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Template selector menu
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [templateMenuAlign, setTemplateMenuAlign] = useState<'left' | 'right'>('left');
  const templateMenuRef = useRef<HTMLDivElement>(null);

  // Parse the MusoJianpu text score into AST
  const parsedDoc = useMemo(() => parseMusoJianpuScore(content), [content]);
  const keyInfo = useMemo(() => getErhuKeyInfo(parsedDoc.header.key), [parsedDoc.header.key]);

  // Cleanup player on unmount
  useEffect(() => {
    playerRef.current = new MusoJianpuPlayer();
    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, []);

  // Stop playback when score content changes dramatically or unmounts
  useEffect(() => {
    if (isPlaying) {
      playerRef.current?.stop();
      setIsPlaying(false);
      setActiveNoteId(null);
    }
  }, [content]);

  // Close template popover on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setIsTemplateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Apply a CodeMirror text edit macro cleanly while preserving focus & selection
  const runEditorMacro = useCallback(
    (executor: (text: string, from: number, to: number) => TextEditResult | null) => {
      const view = editorRef.current?.view;
      if (!view) {
        // Fallback when editor is hidden: apply at end of content
        const res = executor(content, content.length, content.length);
        if (res) onChangeContent(res.text);
        return;
      }

      const state = view.state;
      const docText = state.doc.toString();
      const { from, to } = state.selection.main;
      const res = executor(docText, from, to);
      if (!res) return;

      view.dispatch({
        changes: { from: 0, to: docText.length, insert: res.text },
        selection: { anchor: res.selectionStart, head: res.selectionEnd },
        scrollIntoView: true
      });
      view.focus();
      onChangeContent(res.text);
      setCursorOffset(res.selectionStart);
    },
    [content, onChangeContent]
  );

  // Open Ctrl+J Tempo Macro Dialog
  const openTempoMacroDialog = useCallback(() => {
    setTempoInputBpm(String(parsedDoc.header.tempo || 80));
    setTempoInputExpr(parsedDoc.header.expression || '');
    setIsTempoModalOpen(true);
  }, [parsedDoc.header.tempo, parsedDoc.header.expression]);

  const applyTempoMacro = (e: React.FormEvent) => {
    e.preventDefault();
    const bpm = Math.max(24, Math.min(300, parseInt(tempoInputBpm, 10) || 80));
    const next = macroSetTempo(content, bpm, tempoInputExpr);
    onChangeContent(next);
    setIsTempoModalOpen(false);
  };

  // CodeMirror Keymap for MusoJianpu shortcuts
  const musoJianpuKeymap = useMemo(() => {
    const wrapMacro = (fn: (text: string, from: number, to: number) => TextEditResult | null) => {
      return (view: any) => {
        const docText = view.state.doc.toString();
        const { from, to } = view.state.selection.main;
        const res = fn(docText, from, to);
        if (!res) return false;
        view.dispatch({
          changes: { from: 0, to: docText.length, insert: res.text },
          selection: { anchor: res.selectionStart, head: res.selectionEnd },
          scrollIntoView: true
        });
        onChangeContent(res.text);
        return true;
      };
    };

    return keymap.of([
      { key: 'Alt-ArrowUp', run: wrapMacro((t, f, e) => macroShiftOctave(t, f, e, 1)) },
      { key: 'Alt-ArrowDown', run: wrapMacro((t, f, e) => macroShiftOctave(t, f, e, -1)) },
      { key: 'Alt--', run: wrapMacro((t, f, e) => macroAdjustUnderlines(t, f, e, 1)) },
      { key: 'Alt-=', run: wrapMacro((t, f, e) => macroAdjustUnderlines(t, f, e, -1)) },
      { key: 'Alt-.', run: wrapMacro((t, f, e) => macroToggleDot(t, f, e)) },
      { key: 'Alt-s', run: wrapMacro((t, f, e) => macroToggleSlur(t, f, e)) },
      { key: 'Alt-l', run: wrapMacro((t, f, e) => macroToggleMarking(t, f, e, 'pull')) },
      { key: 'Alt-t', run: wrapMacro((t, f, e) => macroToggleMarking(t, f, e, 'push')) },
      { key: 'Alt-i', run: wrapMacro((t, f, e) => macroToggleMarking(t, f, e, 'in')) },
      { key: 'Alt-o', run: wrapMacro((t, f, e) => macroToggleMarking(t, f, e, 'out')) },
      { key: 'Alt-v', run: wrapMacro((t, f, e) => macroToggleMarking(t, f, e, 'vib')) },
      { key: 'Alt-u', run: wrapMacro((t, f, e) => macroToggleMarking(t, f, e, 'su')) },
      { key: 'Alt-d', run: wrapMacro((t, f, e) => macroToggleMarking(t, f, e, 'sd')) },
      { key: 'Alt-0', run: wrapMacro((t, f, e) => macroToggleMarking(t, f, e, '0')) },
      { key: 'Alt-1', run: wrapMacro((t, f, e) => macroToggleMarking(t, f, e, '一')) },
      { key: 'Alt-2', run: wrapMacro((t, f, e) => macroToggleMarking(t, f, e, '二')) },
      { key: 'Alt-3', run: wrapMacro((t, f, e) => macroToggleMarking(t, f, e, '三')) },
      { key: 'Alt-4', run: wrapMacro((t, f, e) => macroToggleMarking(t, f, e, '四')) },
      {
        key: 'Mod-j',
        run: () => {
          openTempoMacroDialog();
          return true;
        }
      }
    ]);
  }, [onChangeContent, openTempoMacroDialog]);

  // Handle clicking a note on the engraved sheet -> select & focus in CodeMirror!
  const handleNoteClick = useCallback(
    (note: MusoJianpuNote) => {
      setCursorOffset(note.startOffset);
      if (layout === 'sheet') {
        onLayoutChange('split');
      }
      setTimeout(() => {
        const view = editorRef.current?.view;
        if (!view) return;
        const maxLen = view.state.doc.length;
        const start = Math.max(0, Math.min(note.startOffset, maxLen));
        const end = Math.max(start, Math.min(note.endOffset, maxLen));
        view.dispatch({
          selection: { anchor: start, head: end },
          scrollIntoView: true
        });
        view.focus();
      }, 30);
    },
    [layout, onLayoutChange]
  );

  // Expressive Erhu Synth Play / Stop
  const handleTogglePlay = async () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
      setActiveNoteId(null);
      return;
    }

    setIsPlaying(true);
    const effectiveTempo = Math.round((parsedDoc.header.tempo || 80) * playbackTempoScale);
    await playerRef.current.play(parsedDoc, {
      tempoOverride: effectiveTempo,
      onNoteActive: noteId => setActiveNoteId(noteId),
      onComplete: () => {
        setIsPlaying(false);
        setActiveNoteId(null);
      }
    });
  };

  // Export a self-contained print-ready HTML sheet (used as fallback when sandboxed iframe blocks window.print())
  const downloadPrintableHtml = useCallback(() => {
    const sheetEl = sheetPaneRef.current?.querySelector('.musojianpu-print-sheet');
    if (!sheetEl) return;

    const clone = sheetEl.cloneNode(true) as HTMLElement;
    clone.style.transform = '';
    clone.style.width = '100%';

    // Collect all same-origin CSS rules so the downloaded sheet renders identically offline
    let collectedCss = '';
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (sheet.cssRules) {
          for (const rule of Array.from(sheet.cssRules)) {
            collectedCss += rule.cssText + '\n';
          }
        }
      } catch {
        // Ignore cross-origin stylesheets
      }
    }

    const safeTitle = (parsedDoc.header.title || 'erhu-jianpu-score')
      .replace(/[<>:"/\\|?*]+/g, '')
      .trim() || 'erhu-jianpu-score';
    const escapedTitle = safeTitle
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle} - MusoJianpu Sheet Music</title>
  <style>
${collectedCss}
    body {
      background: #f5f5f4 !important;
      color: #161616 !important;
      margin: 0;
      padding: 24px 16px 48px;
      height: auto !important;
      overflow: visible !important;
    }
    .standalone-print-bar {
      max-width: 920px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      color: #444;
    }
    .standalone-print-btn {
      background: #161616;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-weight: 600;
      cursor: pointer;
    }
    .standalone-print-btn:hover {
      background: #E05A2B;
    }
    .musojianpu-print-sheet > div {
      background: #FFFEFA !important;
      color: #161616 !important;
      border-color: #e5e5e5 !important;
    }
    .musojianpu-print-sheet [class*="text-neutral-100"],
    .musojianpu-print-sheet [class*="text-white"] {
      color: #161616 !important;
    }
    .musojianpu-print-sheet [class*="text-neutral-200"],
    .musojianpu-print-sheet [class*="text-neutral-300"] {
      color: #262626 !important;
    }
    .musojianpu-print-sheet svg path[stroke="#E5E7EB"] {
      stroke: #1A1A1A !important;
    }
    @media print {
      .standalone-print-bar { display: none !important; }
      body { background: #ffffff !important; padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="standalone-print-bar">
    <span><strong>${escapedTitle}</strong> — Print-ready MusoJianpu Sheet</span>
    <button class="standalone-print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  ${clone.outerHTML}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}-print.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [parsedDoc.header.title]);

  // Print sheet music with automatic fallback when running inside a sandboxed preview iframe
  const handlePrintSheet = useCallback(() => {
    let beforePrintFired = false;
    const onBeforePrint = () => {
      beforePrintFired = true;
    };
    window.addEventListener('beforeprint', onBeforePrint, { once: true });

    try {
      window.print();
    } catch {
      // Blocked by sandbox
    }

    setTimeout(() => {
      window.removeEventListener('beforeprint', onBeforePrint);
      if (!beforePrintFired) {
        downloadPrintableHtml();
        setStatusMsg('Preview iframe blocks the browser print dialog — downloaded a print-ready HTML sheet you can open & print directly.');
        setTimeout(() => setStatusMsg(null), 7000);
      }
    }, 250);
  }, [downloadPrintableHtml]);

  const effectiveLayout = showEditor ? (layout === 'sheet' ? 'split' : layout) : 'sheet';
  const showEditorPane = effectiveLayout !== 'sheet';

  const macroBtnClass = cn(
    'h-7 px-2 rounded-md border text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0',
    isDark
      ? 'bg-white/[0.04] border-white/[0.08] text-neutral-200 hover:bg-white/[0.1] hover:border-white/[0.16]'
      : 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300'
  );

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1440px] mx-auto">
      {/* Primary MusoJianpu Studio Control Strip (Non-printing) */}
      <div className={cn(
        'no-print rounded-xl border px-3 py-2 flex flex-wrap items-center justify-between gap-3 transition-colors',
        isDark
          ? 'bg-[#17191E] border-white/[0.08] text-neutral-200'
          : 'bg-white border-neutral-200 text-neutral-800'
      )}>
        {/* Left: Erhu Playback + Key / String Position + Degree Shift */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Expressive Erhu Synth Play / Stop */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0',
              isPlaying
                ? 'bg-[#E05A2B] text-white'
                : isDark
                  ? 'bg-white/[0.08] hover:bg-white/[0.14] text-white'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
            )}
            title="Play score with synthesized Erhu bowed sound"
          >
            {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Stop Erhu' : 'Play Erhu'}</span>
          </button>

          {/* Tempo Multiplier */}
          <div className="flex items-center gap-1.5 text-xs">
            <Gauge className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <select
              value={playbackTempoScale}
              onChange={e => setPlaybackTempoScale(parseFloat(e.target.value))}
              className={cn(
                'h-7 px-1.5 rounded-md border text-xs font-mono tabular-nums outline-none cursor-pointer',
                isDark ? 'bg-white/[0.04] border-white/[0.08] text-neutral-200' : 'bg-neutral-50 border-neutral-200 text-neutral-800'
              )}
              title="Playback speed multiplier"
            >
              <option value={0.5} className={isDark ? 'bg-neutral-900' : 'bg-white'}>50%</option>
              <option value={0.75} className={isDark ? 'bg-neutral-900' : 'bg-white'}>75%</option>
              <option value={1} className={isDark ? 'bg-neutral-900' : 'bg-white'}>100% ({parsedDoc.header.tempo} BPM)</option>
              <option value={1.15} className={isDark ? 'bg-neutral-900' : 'bg-white'}>115%</option>
              <option value={1.3} className={isDark ? 'bg-neutral-900' : 'bg-white'}>130%</option>
            </select>
          </div>

          <div className={cn('h-4 w-[1px]', isDark ? 'bg-white/10' : 'bg-neutral-200')} />

          {/* Erhu Key & String Tuning Macro Picker */}
          <div className="flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-[#E05A2B] shrink-0" />
            <select
              value={keyInfo.key}
              onChange={e => onChangeContent(macroSetKey(content, e.target.value))}
              className={cn(
                'h-7 px-2 rounded-md border text-xs font-semibold outline-none cursor-pointer',
                isDark ? 'bg-white/[0.04] border-white/[0.08] text-neutral-200' : 'bg-neutral-50 border-neutral-200 text-neutral-800'
              )}
              title="Change Erhu key signature and string tuning (e.g. 1=G 5-2弦)"
            >
              {ERHU_KEYS.map(k => (
                <option key={k.key} value={k.key} className={isDark ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}>
                  {k.label} · {k.strings}弦
                </option>
              ))}
            </select>

            {/* Diatonic Scale Degree Shift Macros */}
            <div className="flex items-center gap-0.5" title="Shift all Jianpu notes by scale degree">
              <button
                type="button"
                onClick={() => onChangeContent(macroShiftScaleDegrees(content, -1))}
                className={cn(
                  'h-7 px-1.5 rounded-md border text-xs font-mono transition-colors cursor-pointer',
                  isDark ? 'border-white/[0.08] hover:bg-white/[0.08] text-neutral-300' : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                )}
                title="Shift all notes down 1 scale degree"
              >
                -1°
              </button>
              <button
                type="button"
                onClick={() => onChangeContent(macroShiftScaleDegrees(content, 1))}
                className={cn(
                  'h-7 px-1.5 rounded-md border text-xs font-mono transition-colors cursor-pointer',
                  isDark ? 'border-white/[0.08] hover:bg-white/[0.08] text-neutral-300' : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                )}
                title="Shift all notes up 1 scale degree"
              >
                +1°
              </button>
            </div>
          </div>

          {/* Unboxed Score Stats Metadata */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-neutral-500 tabular-nums">
            <span aria-hidden="true">·</span>
            <span>{parsedDoc.totalMeasures} bars</span>
            <span aria-hidden="true">·</span>
            <span>{parsedDoc.totalNotes} notes</span>
          </div>
        </div>

        {/* Right: Templates, Display Options, Layout Switcher, Print */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Repertoire Template Picker */}
          <div className="relative" ref={templateMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsTemplateMenuOpen(prev => {
                  const next = !prev;
                  if (next && templateMenuRef.current) {
                    const rect = templateMenuRef.current.getBoundingClientRect();
                    const menuWidth = 264;
                    const wouldOverflowRight = rect.left + menuWidth > window.innerWidth - 16;
                    const fitsOnLeft = rect.right - menuWidth >= 16;
                    setTemplateMenuAlign(wouldOverflowRight && fitsOnLeft ? 'right' : 'left');
                  }
                  return next;
                });
              }}
              className={macroBtnClass}
              title="Load a MusoJianpu template"
            >
              <span>Templates</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isTemplateMenuOpen && (
              <div className={cn(
                'absolute top-full mt-1.5 w-64 max-w-[calc(100vw-2rem)] rounded-xl border p-1.5 shadow-xl z-40',
                templateMenuAlign === 'right' ? 'right-0' : 'left-0',
                isDark ? 'bg-[#181A1F] border-white/[0.12] text-neutral-200' : 'bg-white border-neutral-200 text-neutral-800'
              )}>
                <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400">
                  MusoJianpu Repertoire & Templates
                </div>
                {MUSOJIANPU_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      if (onLoadTemplate) {
                        onLoadTemplate(tpl.content, tpl.title);
                      } else {
                        onChangeContent(tpl.content);
                        onChangeTitle?.(tpl.title);
                      }
                      setCursorOffset(null);
                      setIsTemplateMenuOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-2.5 py-2 rounded-lg transition-colors cursor-pointer',
                      isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-neutral-100'
                    )}
                  >
                    <div className="text-xs font-semibold">{tpl.title}</div>
                    <div className="text-[11px] text-neutral-500">{tpl.subtitle}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fingering Numerals Toggle (Chinese 一二三四 vs Arabic 1234) */}
          <button
            type="button"
            onClick={() => onFingeringStyleChange(fingeringStyle === 'chinese' ? 'arabic' : 'chinese')}
            className={macroBtnClass}
            title="Switch Erhu fingering numerals between Chinese (一二三四) and Arabic (1234)"
          >
            <span>{fingeringStyle === 'chinese' ? '指法: 一二三' : 'Finger: 123'}</span>
          </button>

          {/* Sheet Surface Mode Toggle (Warm Paper vs Dark Stage) */}
          <button
            type="button"
            onClick={() => onPaperThemeChange(paperTheme === 'paper' ? 'adaptive' : 'paper')}
            className={cn(
              macroBtnClass,
              paperTheme === 'adaptive' && 'border-[#E05A2B]/50 text-[#E05A2B] bg-[#E05A2B]/10'
            )}
            title={
              paperTheme === 'paper'
                ? 'Sheet surface: Warm Paper (click to switch to low-glare Dark Stage mode)'
                : 'Sheet surface: Dark Stage mode (click to switch to Warm Paper)'
            }
          >
            {paperTheme === 'paper' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{paperTheme === 'paper' ? 'Paper' : 'Stage'}</span>
          </button>

          {/* Layout Segmented Control */}
          <div className={cn(
            'flex items-center p-0.5 rounded-lg border',
            isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-neutral-100 border-neutral-200'
          )}>
            <button
              type="button"
              onClick={() => onLayoutChange('split')}
              className={cn(
                'p-1 rounded-md transition-colors cursor-pointer',
                effectiveLayout === 'split'
                  ? (isDark ? 'bg-white/15 text-white' : 'bg-white text-neutral-900 shadow-sm')
                  : 'text-neutral-400 hover:text-neutral-200'
              )}
              title="Side-by-side Split Workbench"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange('stacked')}
              className={cn(
                'p-1 rounded-md transition-colors cursor-pointer',
                effectiveLayout === 'stacked'
                  ? (isDark ? 'bg-white/15 text-white' : 'bg-white text-neutral-900 shadow-sm')
                  : 'text-neutral-400 hover:text-neutral-200'
              )}
              title="Stacked Editor & Sheet"
            >
              <Rows2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange('sheet')}
              className={cn(
                'p-1 rounded-md transition-colors cursor-pointer',
                effectiveLayout === 'sheet'
                  ? (isDark ? 'bg-white/15 text-white' : 'bg-white text-neutral-900 shadow-sm')
                  : 'text-neutral-400 hover:text-neutral-200'
              )}
              title="Reader / Music Stand View"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Syntax & Macro Guide Toggle */}
          <button
            type="button"
            onClick={() => setShowGuide(prev => !prev)}
            className={cn(macroBtnClass, showGuide && 'border-[#E05A2B]/50 text-[#E05A2B] bg-[#E05A2B]/10')}
            title="Show MusoJianpu syntax & keyboard shortcut reference"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* Print Sheet */}
          <button
            type="button"
            onClick={handlePrintSheet}
            className={macroBtnClass}
            title="Print clean MusoJianpu sheet music (downloads print-ready HTML if blocked in embedded preview)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Subtle Toast for Status Messages */}
      {statusMsg && (
        <div className={cn(
          'no-print px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between',
          isDark ? 'bg-white/[0.06] border-white/10 text-neutral-200' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
        )}>
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span>{statusMsg}</span>
          </div>
          <button type="button" onClick={() => setStatusMsg(null)} className="cursor-pointer opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Collapsible Syntax & Shortcut Quick Guide */}
      {showGuide && (
        <div className={cn(
          'no-print rounded-xl border p-4 text-xs transition-colors',
          isDark ? 'bg-[#17191E] border-white/[0.08] text-neutral-300' : 'bg-neutral-50 border-neutral-200 text-neutral-700'
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-sm text-neutral-900 dark:text-white">
              MusoJianpu Text Notation & Macro Shortcuts
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 leading-relaxed">
            <div className="space-y-1">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">Notes, Octaves & Beams</div>
              <div><code className="font-mono text-[#E05A2B]">1–7</code> scale degrees · <code className="font-mono text-[#E05A2B]">0</code> rest · <code className="font-mono text-[#E05A2B]">-</code> prolong</div>
              <div><code className="font-mono text-[#E05A2B]">' / ''</code> high octave · <code className="font-mono text-[#E05A2B]">, / ,,</code> low octave (<kbd className="font-mono">Alt+↑/↓</kbd>)</div>
              <div><code className="font-mono text-[#E05A2B]">5/6/</code> or <code className="font-mono text-[#E05A2B]">5_6_</code> 8ths · <code className="font-mono text-[#E05A2B]">//</code> 16ths · <code className="font-mono text-[#E05A2B]">///</code> 32nds (<kbd className="font-mono">Alt+-/=</kbd>)</div>
              <div><code className="font-mono text-[#E05A2B]">(3/5/ 6/1'/)</code> slur/legato bow (<kbd className="font-mono">Alt+S</kbd>) · <code className="font-mono text-[#E05A2B]">^5/</code> or <code className="font-mono text-[#E05A2B]">{'^{5/6/}'}</code> grace note</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">Erhu Bowing, Fingers & Strings</div>
              <div><code className="font-mono text-[#E05A2B]">{'{pull}'}</code> / <code className="font-mono text-[#E05A2B]">{'{拉}'}</code> Pull bow Π (<kbd className="font-mono">Alt+L</kbd>)</div>
              <div><code className="font-mono text-[#E05A2B]">{'{push}'}</code> / <code className="font-mono text-[#E05A2B]">{'{推}'}</code> Push bow V (<kbd className="font-mono">Alt+T</kbd>)</div>
              <div><code className="font-mono text-[#E05A2B]">{'{0..4}'}</code> or <code className="font-mono text-[#E05A2B]">{'{一..四}'}</code> Fingering (<kbd className="font-mono">Alt+0..4</kbd>)</div>
              <div><code className="font-mono text-[#E05A2B]">{'{in}'}</code> / <code className="font-mono text-[#E05A2B]">{'{out}'}</code> Inner/Outer string (<kbd className="font-mono">Alt+I / O</kbd>)</div>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">Ornaments, Lyrics & Shortcuts</div>
              <div><code className="font-mono text-[#E05A2B]">{'{su}'}</code> / <code className="font-mono text-[#E05A2B]">{'{sd}'}</code> Slides (<kbd className="font-mono">Alt+U/D</kbd>) · <code className="font-mono text-[#E05A2B]">{'{vib}'}</code> Vibrato (<kbd className="font-mono">Alt+V</kbd>)</div>
              <div><code className="font-mono text-[#E05A2B]">S:</code> section · <code className="font-mono text-[#E05A2B]">L:</code> aligned lyrics · <code className="font-mono text-[#E05A2B]">T:</code> note</div>
              <div>Press <kbd className="font-mono">Ctrl/Cmd+J</kbd> to set BPM & expression markings.</div>
              <div>Click any note on the rendered sheet to jump straight to it in the editor.</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Split / Stacked / Sheet Workspace */}
      <div
        className={cn(
          'grid gap-5 items-start w-full',
          effectiveLayout === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
        )}
      >
        {/* Editor + MusoJianpu Macro Ribbon Pane */}
        {showEditorPane && (
          <div
            className={cn(
              'no-print flex flex-col rounded-xl border overflow-hidden transition-colors',
              effectiveLayout === 'split' ? 'lg:col-span-5 lg:sticky lg:top-2' : 'w-full',
              isDark ? 'bg-[#17191E] border-white/[0.08]' : 'bg-white border-neutral-200'
            )}
          >
            {/* MusoJianpu Macro Ribbon Header Tabs */}
            <div className={cn(
              'flex items-center justify-between gap-2 px-3 py-2 border-b overflow-x-auto no-scrollbar',
              isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-neutral-200 bg-neutral-50/80'
            )}>
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'bowing', label: 'Bowing 弓法' },
                    { id: 'fingering', label: 'Fingers 指法' },
                    { id: 'ornaments', label: 'Ornaments 技巧' },
                    { id: 'rhythm', label: 'Pitch & Rhythm' },
                    { id: 'structure', label: 'Bars & Dynamics' }
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveMacroTab(tab.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0',
                      activeMacroTab === tab.id
                        ? (isDark ? 'bg-white/15 text-white' : 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80')
                        : (isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-900')
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Macro Ribbon Action Bar */}
            <div className={cn(
              'px-3 py-2 border-b flex flex-wrap items-center gap-1.5',
              isDark ? 'border-white/[0.06] bg-white/[0.01]' : 'border-neutral-100 bg-white'
            )}>
              {activeMacroTab === 'bowing' && (
                <>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'pull'))} className={macroBtnClass} title="Pull Bow / Down-bow (Alt+L)">
                    <span className="font-bold text-[#E05A2B]">Π</span> 拉弓
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'push'))} className={macroBtnClass} title="Push Bow / Up-bow (Alt+T)">
                    <span className="font-bold text-[#E05A2B]">V</span> 推弓
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleSlur(t, f, e))} className={macroBtnClass} title="Wrap / Unwrap Slur Bow 连弓线 (Alt+S)">
                    <span>⌒</span> 连弓 ( )
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'trem'))} className={macroBtnClass} title="Tremolo Bow 颤弓">
                    <span className="font-mono">///</span> 颤弓
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'stacc'))} className={macroBtnClass} title="Staccato / Martelé 顿弓">
                    <span>▼</span> 顿弓
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'spicc'))} className={macroBtnClass} title="Spiccato 跳弓">
                    <span>·</span> 跳弓
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'pizz'))} className={macroBtnClass} title="Pizzicato 拨弦">
                    <span className="font-bold">+</span> 拨弦
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'retake'))} className={macroBtnClass} title="Bow Retake / Breath 换弓">
                    <span>’</span> 换弓
                  </button>
                </>
              )}

              {activeMacroTab === 'fingering' && (
                <>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, '0'))} className={macroBtnClass} title="Open String 空弦 (Alt+0)">0 空弦</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, '一'))} className={macroBtnClass} title="1st Finger 一指 (Alt+1)">一 (1)</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, '二'))} className={macroBtnClass} title="2nd Finger 二指 (Alt+2)">二 (2)</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, '三'))} className={macroBtnClass} title="3rd Finger 三指 (Alt+3)">三 (3)</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, '四'))} className={macroBtnClass} title="4th Finger 四指 (Alt+4)">四 (4)</button>
                  <div className={cn('h-4 w-[1px] mx-0.5', isDark ? 'bg-white/10' : 'bg-neutral-200')} />
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'in'))} className={macroBtnClass} title="Inner String 内弦 (Alt+I)">
                    <span className="text-[#E05A2B] font-bold">内</span> Inner
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'out'))} className={macroBtnClass} title="Outer String 外弦 (Alt+O)">
                    <span className="text-[#E05A2B] font-bold">外</span> Outer
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'shift+'))} className={macroBtnClass} title="Shift Position Up 上换把">↑ 上换把</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'shift-'))} className={macroBtnClass} title="Shift Position Down 下换把">↓ 下换把</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, '一把'))} className={macroBtnClass} title="1st Position 一把">一把</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, '二把'))} className={macroBtnClass} title="2nd Position 二把">二把</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, '三把'))} className={macroBtnClass} title="3rd Position 三把">三把</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'harm'))} className={macroBtnClass} title="Natural Harmonic 自然泛音">○ 泛音</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'aharm'))} className={macroBtnClass} title="Artificial Harmonic 人工泛音">◇ 人工泛</button>
                </>
              )}

              {activeMacroTab === 'ornaments' && (
                <>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'su'))} className={macroBtnClass} title="Upward Slide 上滑音 (Alt+U)">↗ 上滑</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'sd'))} className={macroBtnClass} title="Downward Slide 下滑音 (Alt+D)">↘ 下滑</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'sr'))} className={macroBtnClass} title="Return Slide 回滑音">⌒ 回滑</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'vib'))} className={macroBtnClass} title="Vibrato 揉弦 (Alt+V)">〰 揉弦</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'pvib'))} className={macroBtnClass} title="Press Vibrato 压揉">压 压揉</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'tr'))} className={macroBtnClass} title="Trill 颤音">tr 颤音</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'da'))} className={macroBtnClass} title="Mordent 打音">打 打音</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'accent'))} className={macroBtnClass} title="Accent 重音">&gt; 重音</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, 'fermata'))} className={macroBtnClass} title="Fermata 延长">𝄐 延长</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroInsertGraceNote(t, f, e, '5'))} className={macroBtnClass} title="Add Grace Note 倚音 before selected note (^5/ or ^{5/6/})">^5/ 倚音</button>
                </>
              )}

              {activeMacroTab === 'rhythm' && (
                <>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroShiftOctave(t, f, e, 1))} className={macroBtnClass} title="Raise Octave Dot (Alt+↑)">
                    <ArrowUp className="w-3 h-3" /> Octave +
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroShiftOctave(t, f, e, -1))} className={macroBtnClass} title="Lower Octave Dot (Alt+↓)">
                    <ArrowDown className="w-3 h-3" /> Octave -
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroAdjustUnderlines(t, f, e, 1))} className={macroBtnClass} title="Add Duration Beam Underline (/ or _, Alt+-)">
                    + Beam (/)
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroAdjustUnderlines(t, f, e, -1))} className={macroBtnClass} title="Remove Duration Beam Underline (Alt+=)">
                    - Beam
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleDot(t, f, e))} className={macroBtnClass} title="Toggle Augmentation Dot (Alt+.)">
                    Dot (.)
                  </button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleAccidental(t, f, e, '#'))} className={macroBtnClass} title="Toggle Sharp ♯">♯</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleAccidental(t, f, e, 'b'))} className={macroBtnClass} title="Toggle Flat ♭">♭</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroToggleAccidental(t, f, e, '='))} className={macroBtnClass} title="Toggle Natural ♮">♮</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroInsertSnippet(t, f, e, ' -'))} className={macroBtnClass} title="Insert Prolongation Dash">– Dash</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroWrapTriplet(t, f, e))} className={macroBtnClass} title="Wrap Triplet 3(...)">3( ) Triplet</button>
                  <button type="button" onClick={() => onChangeContent(macroTidyFormatting(content))} className={macroBtnClass} title="Auto-tidy barline spacing across score">
                    <Wand2 className="w-3 h-3 text-[#E05A2B]" /> Tidy
                  </button>
                </>
              )}

              {activeMacroTab === 'structure' && (
                <>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroInsertSnippet(t, f, e, ' | '))} className={macroBtnClass}>| Bar</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroInsertSnippet(t, f, e, ' || '))} className={macroBtnClass}>|| Double</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroInsertSnippet(t, f, e, ' |]'))} className={macroBtnClass}>|] End</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroInsertSnippet(t, f, e, ' |: '))} className={macroBtnClass}>|: Repeat</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroInsertSnippet(t, f, e, ' :| '))} className={macroBtnClass}>:| End Rep</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroInsertSnippet(t, f, e, '[1. '))} className={macroBtnClass}>[1.</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroInsertSnippet(t, f, e, '[2. '))} className={macroBtnClass}>[2.</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroInsertSnippet(t, f, e, '\nS: 新段落\n| '))} className={macroBtnClass}>S: Section</button>
                  <button type="button" onClick={() => runEditorMacro((t, f, e) => macroInsertSnippet(t, f, e, '\nL: '))} className={macroBtnClass}>L: Lyrics</button>
                  <button type="button" onClick={openTempoMacroDialog} className={macroBtnClass} title="Set BPM & Expression (Ctrl/Cmd+J)">
                    <SlidersHorizontal className="w-3 h-3 text-[#E05A2B]" /> BPM (Ctrl+J)
                  </button>
                  <div className={cn('h-4 w-[1px] mx-0.5', isDark ? 'bg-white/10' : 'bg-neutral-200')} />
                  {(['p', 'mp', 'mf', 'f', 'ff', 'cresc', 'dim', 'rit'] as const).map(dyn => (
                    <button
                      key={dyn}
                      type="button"
                      onClick={() => runEditorMacro((t, f, e) => macroToggleMarking(t, f, e, dyn))}
                      className={cn(macroBtnClass, 'font-serif italic')}
                    >
                      {dyn}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* CodeMirror 6 Source Editor */}
            <div className="relative w-full">
              <CodeMirror
                ref={editorRef}
                value={content}
                height={effectiveLayout === 'split' ? '560px' : '260px'}
                theme={isDark ? vscodeDark : 'light'}
                extensions={[musoJianpu(), musoJianpuKeymap]}
                onChange={val => onChangeContent(val)}
                onUpdate={update => {
                  if (update.selectionSet) {
                    setCursorOffset(update.state.selection.main.head);
                  }
                }}
                className="text-xs sm:text-sm font-mono"
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  highlightActiveLine: true,
                  autocompletion: false
                }}
              />
            </div>

            {/* Compact Editor Footer Hints & Engraving Visibility Switches */}
            <div className={cn(
              'px-3 py-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px]',
              isDark ? 'border-white/[0.06] text-neutral-400 bg-white/[0.02]' : 'border-neutral-100 text-neutral-500 bg-neutral-50/70'
            )}>
              <span>Click any note on the sheet to jump cursor · Ctrl+J for BPM</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showMarkings}
                    onChange={e => setShowMarkings(e.target.checked)}
                    className="accent-[#E05A2B] cursor-pointer"
                  />
                  <span>Erhu Marks</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showLyrics}
                    onChange={e => setShowLyrics(e.target.checked)}
                    className="accent-[#E05A2B] cursor-pointer"
                  />
                  <span>Lyrics</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={highlightMarkings}
                    onChange={e => setHighlightMarkings(e.target.checked)}
                    className="accent-[#E05A2B] cursor-pointer"
                  />
                  <span>Vermilion Ink</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Live Engraved MusoJianpu Sheet Pane */}
        <div ref={sheetPaneRef} className={cn(effectiveLayout === 'split' ? 'lg:col-span-7 min-w-0' : 'w-full min-w-0')}>
          <MusoJianpuRenderer
            document={parsedDoc}
            zoom={zoom}
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
            fingeringStyle={fingeringStyle}
            showMarkings={showMarkings}
            showLyrics={showLyrics}
            highlightMarkings={highlightMarkings}
            activeNoteId={activeNoteId}
            selectedOffset={cursorOffset}
            onNoteClick={handleNoteClick}
          />
        </div>
      </div>

      {/* Ctrl+J Tempo & Expression Macro Modal */}
      {isTempoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setIsTempoModalOpen(false)}
        >
          <form
            onSubmit={applyTempoMacro}
            onClick={e => e.stopPropagation()}
            className={cn(
              'w-full max-w-sm rounded-2xl border p-5 shadow-2xl',
              isDark ? 'bg-[#181A1F] border-white/[0.12] text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold">Tempo & Expression Macro</h3>
                <p className="text-xs text-neutral-500">Shortcut: Ctrl+J · Updates @tempo and @expression</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTempoModalOpen(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Tempo (BPM)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={24}
                    max={300}
                    value={tempoInputBpm}
                    onChange={e => setTempoInputBpm(e.target.value)}
                    autoFocus
                    className={cn(
                      'w-24 px-3 py-1.5 rounded-lg border text-sm font-mono tabular-nums outline-none focus:border-[#E05A2B]',
                      isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                    )}
                  />
                  <div className="flex flex-wrap gap-1">
                    {[54, 72, 96, 120, 144].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTempoInputBpm(String(preset))}
                        className={cn(
                          'px-2 py-1 rounded-md text-xs font-mono border cursor-pointer',
                          isDark ? 'border-white/10 hover:bg-white/10' : 'border-neutral-200 hover:bg-neutral-100'
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Expression Marking</label>
                <input
                  type="text"
                  value={tempoInputExpr}
                  onChange={e => setTempoInputExpr(e.target.value)}
                  placeholder="e.g. 如歌地 Andante / 热烈奔放地 Allegro"
                  className={cn(
                    'w-full px-3 py-1.5 rounded-lg border text-xs outline-none focus:border-[#E05A2B]',
                    isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  )}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setIsTempoModalOpen(false)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer',
                  isDark ? 'hover:bg-white/10 text-neutral-300' : 'hover:bg-neutral-100 text-neutral-600'
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#E05A2B] hover:bg-[#c8491c] text-white text-xs font-semibold cursor-pointer"
              >
                Apply Tempo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
