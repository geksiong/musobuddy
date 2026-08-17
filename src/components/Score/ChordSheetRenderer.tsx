/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  parseChordSheet, 
  formatChordSheet, 
  extractUniqueChordsFromSong,
  normalizeEnharmonics,
  ChordEngine, 
  ActiveEngine 
} from '../../lib/chordSheetUtils.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { cn } from '../../lib/utils.ts';
import { Sparkles, Music, Info, FileText } from 'lucide-react';

interface ChordSheetRendererProps {
  content: string;
  enginePreference?: ChordEngine;
  formatType?: 'html' | 'text' | 'chordpro';
  transpose?: number;
  accidentalPreference?: '#' | 'b';
  zoom?: number;
  onEngineChange?: (engine: ChordEngine) => void;
  onFormatChange?: (format: 'html' | 'text' | 'chordpro') => void;
  onAccidentalChange?: (accidental: '#' | 'b') => void;
}

export function ChordSheetRenderer({
  content,
  enginePreference = 'auto',
  formatType = 'html',
  transpose = 0,
  accidentalPreference,
  zoom = 1,
  onEngineChange,
  onFormatChange,
  onAccidentalChange
}: ChordSheetRendererProps) {
  const { resolvedTheme } = useTheme();

  // Parse chord sheet using ChordSheetJS
  const parseResult = useMemo(() => {
    return parseChordSheet(content, enginePreference);
  }, [content, enginePreference]);

  const { song, detectedEngine, activeEngine, reason } = parseResult;

  // Transpose song, normalize chords, and apply accidental modifier preference (# or b)
  const transposedSong = useMemo(() => {
    if (!song) return song;
    let result = song;

    // Normalize chords using chord.normalize()
    try {
      result = result.changeChords(chord => {
        if (!chord) return chord;
        if (typeof chord.normalize === 'function') {
          return chord.normalize();
        }
        return chord;
      });
    } catch (err) {
      console.warn('Chord normalization failed:', err);
    }

    if (transpose !== 0) {
      try {
        result = result.transpose(transpose);
      } catch (err) {
        console.warn('Transposition failed on song:', err);
      }
    }

    if (accidentalPreference) {
      try {
        // ChordSheetJS provides useModifier / useAccidental on Song which delegates to chord.useModifier()
        if (typeof (result as any).useModifier === 'function') {
          result = (result as any).useModifier(accidentalPreference);
        } else if (typeof (result as any).useAccidental === 'function') {
          result = (result as any).useAccidental(accidentalPreference);
        } else {
          result = result.changeChords(chord => {
            if (typeof (chord as any).useModifier === 'function') {
              return (chord as any).useModifier(accidentalPreference);
            }
            return chord.useAccidental(accidentalPreference);
          });
        }
      } catch (err) {
        console.warn('Accidental/modifier switch failed:', err);
      }
    }
    return result;
  }, [song, transpose, accidentalPreference]);

  // Extract unique chords from transposed song
  const uniqueChords = useMemo(() => {
    return extractUniqueChordsFromSong(transposedSong);
  }, [transposedSong]);

  // Format the parsed song
  const formattedOutput = useMemo(() => {
    return formatChordSheet(transposedSong, formatType, 0);
  }, [transposedSong, formatType]);

  // Extract song metadata
  const metadataTitle = transposedSong ? transposedSong.getSingleMetadataValue('title') : null;
  const metadataArtist = transposedSong ? (transposedSong.getSingleMetadataValue('artist') || transposedSong.getSingleMetadataValue('subtitle')) : null;
  const rawKey = transposedSong ? transposedSong.getSingleMetadataValue('key') : null;
  const metadataKey = rawKey ? normalizeEnharmonics(rawKey) : null;
  const metadataCapo = transposedSong ? transposedSong.getSingleMetadataValue('capo') : null;
  const metadataTempo = transposedSong ? transposedSong.getSingleMetadataValue('tempo') : null;

  return (
    <div className="w-full flex flex-col gap-6" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
      {/* Unique Chords Banner */}
      {uniqueChords.length > 0 && (
        <div className={cn(
          "px-4 py-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 backdrop-blur-md transition-colors",
          resolvedTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
        )}>
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-[#FF4E00] shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Chords in this Song:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {uniqueChords.map((chord, idx) => (
              <span
                key={idx}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-mono font-black border tracking-wide transition-all shadow-sm",
                  resolvedTheme === 'dark'
                    ? "bg-[#FF4E00]/20 border-[#FF4E00]/40 text-orange-400"
                    : "bg-orange-50 border-orange-200 text-orange-700"
                )}
              >
                {chord}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Song Metadata Card (if present) */}
      {(metadataTitle || metadataArtist || metadataKey || metadataCapo || metadataTempo) && (
        <div className={cn(
          "p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 transition-colors",
          resolvedTheme === 'dark' ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
        )}>
          <div>
            {metadataTitle && <h3 className="text-lg font-black tracking-tight">{metadataTitle}</h3>}
            {metadataArtist && <p className="text-xs font-bold opacity-60 uppercase tracking-wider">{metadataArtist}</p>}
          </div>

          <div className="flex flex-wrap gap-3 text-xs font-mono">
            {metadataKey && (
              <div className="px-3 py-1 rounded-xl bg-black/10 dark:bg-white/10 border border-black/5 dark:border-white/10">
                <span className="opacity-50 text-[9px] uppercase tracking-wider block">Key</span>
                <span className="font-bold text-[#FF4E00]">{metadataKey}</span>
              </div>
            )}
            {metadataCapo && (
              <div className="px-3 py-1 rounded-xl bg-black/10 dark:bg-white/10 border border-black/5 dark:border-white/10">
                <span className="opacity-50 text-[9px] uppercase tracking-wider block">Capo</span>
                <span className="font-bold">{metadataCapo}</span>
              </div>
            )}
            {metadataTempo && (
              <div className="px-3 py-1 rounded-xl bg-black/10 dark:bg-white/10 border border-black/5 dark:border-white/10">
                <span className="opacity-50 text-[9px] uppercase tracking-wider block">Tempo</span>
                <span className="font-bold">{metadataTempo} BPM</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Formatted Sheet Content */}
      <div className={cn(
        "rounded-2xl p-6 sm:p-10 shadow-2xl overflow-x-auto min-h-[400px] transition-colors w-full font-sans leading-relaxed",
        resolvedTheme === 'dark' 
          ? "bg-[#141418] text-slate-100 border border-white/10" 
          : "bg-white text-slate-900 border border-slate-200 shadow-xl"
      )}>
        {formatType === 'html' ? (
          <div>
            {/* Custom CSS overrides for ChordSheetJS HtmlDivFormatter */}
            <style>{`
              .chordsheet-container {
                font-family: inherit;
                line-height: 1.8;
              }
              .chordsheet-container .paragraph {
                margin-bottom: 1.75rem;
                padding-left: 0.5rem;
                border-left: 3px solid transparent;
              }
              .chordsheet-container .paragraph.chorus {
                border-left-color: #FF4E00;
                padding-left: 1rem;
                background-color: rgba(255, 78, 0, 0.04);
                border-radius: 0 0.75rem 0.75rem 0;
                padding-top: 0.5rem;
                padding-bottom: 0.5rem;
              }
              .chordsheet-container .row {
                display: flex;
                flex-wrap: wrap;
                margin-bottom: 0.5rem;
              }
              .chordsheet-container .column {
                display: flex;
                flex-direction: column;
                margin-right: 0.25rem;
                min-width: 0.75rem;
                justify-content: flex-end;
              }
              .chordsheet-container .chord {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-weight: 900;
                color: #FF4E00;
                font-size: 0.95rem;
                line-height: 1.2;
                margin-bottom: 0.15rem;
                white-space: nowrap;
              }
              .chordsheet-container .lyrics {
                font-size: 1.05rem;
                line-height: 1.4;
                white-space: pre;
              }
              .chordsheet-container .comment,
              .chordsheet-container .section-label {
                font-size: 0.8rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                opacity: 0.7;
                margin-top: 0.75rem;
                margin-bottom: 0.35rem;
                color: #FF4E00;
              }
            `}</style>

            <div 
              className="chordsheet-container select-text"
              dangerouslySetInnerHTML={{ __html: formattedOutput.content }} 
            />
          </div>
        ) : (
          <pre className="font-mono text-sm sm:text-base leading-relaxed whitespace-pre-wrap select-text opacity-90">
            {formattedOutput.content}
          </pre>
        )}
      </div>
    </div>
  );
}
