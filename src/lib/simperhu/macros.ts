/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getErhuKeyInfo, transposeKeyName } from './erhuKeys.ts';

export interface TextEditResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

const NOTE_REGEX = /([#b=]?)([0-7])([',]*)(_*)(\.*)(~?)((?:\{[^}]*\})*)/g;

/**
 * Locates the note token covering the cursor position (or just before the cursor).
 */
function findNoteAtCursor(text: string, pos: number): { start: number; end: number; match: RegExpExecArray } | null {
  // Search within the current line to keep it fast and safe
  const lineStart = text.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  const rawLineEnd = text.indexOf('\n', pos);
  const lineEnd = rawLineEnd === -1 ? text.length : rawLineEnd;
  const line = text.slice(lineStart, lineEnd);

  // Skip header / lyrics / section lines
  if (/^\s*(@|S:|L:|T:|#|\/\/)/i.test(line)) return null;

  const relPos = pos - lineStart;
  NOTE_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  let candidate: { start: number; end: number; match: RegExpExecArray } | null = null;

  while ((m = NOTE_REGEX.exec(line)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (relPos >= start && relPos <= end) {
      return { start: lineStart + start, end: lineStart + end, match: m };
    }
    if (end <= relPos) {
      candidate = { start: lineStart + start, end: lineStart + end, match: m };
    }
  }
  // If cursor is immediately after a note (within 1 space), use previous note on same line
  if (candidate && pos - candidate.end <= 1) {
    return candidate;
  }
  return null;
}

function transformNoteOctave(noteStr: string, delta: 1 | -1): string {
  const m = noteStr.match(/^([#b=]?)([0-7])([',]*)(_*)(\.*)(~?)((?:\{[^}]*\})*)$/);
  if (!m) return noteStr;
  const [, acc, digit, octStr, underlines, dots, tie, markings] = m;
  if (digit === '0') return noteStr; // Rest has no octave

  let oct = 0;
  for (const ch of octStr) {
    if (ch === "'") oct++;
    else if (ch === ',') oct--;
  }
  oct = Math.max(-2, Math.min(2, oct + delta));
  const newOctStr = oct > 0 ? "'".repeat(oct) : oct < 0 ? ','.repeat(-oct) : '';
  return `${acc}${digit}${newOctStr}${underlines}${dots}${tie}${markings}`;
}

function transformNoteUnderlines(noteStr: string, delta: 1 | -1): string {
  const m = noteStr.match(/^([#b=]?)([0-7])([',]*)(_*)(\.*)(~?)((?:\{[^}]*\})*)$/);
  if (!m) return noteStr;
  const [, acc, digit, octStr, underlines, dots, tie, markings] = m;
  const nextCount = Math.max(0, Math.min(3, underlines.length + delta));
  return `${acc}${digit}${octStr}${'_'.repeat(nextCount)}${dots}${tie}${markings}`;
}

function transformNoteDot(noteStr: string): string {
  const m = noteStr.match(/^([#b=]?)([0-7])([',]*)(_*)(\.*)(~?)((?:\{[^}]*\})*)$/);
  if (!m) return noteStr;
  const [, acc, digit, octStr, underlines, dots, tie, markings] = m;
  const nextDots = dots.length === 0 ? '.' : dots.length === 1 ? '' : '.';
  return `${acc}${digit}${octStr}${underlines}${nextDots}${tie}${markings}`;
}

function transformNoteAccidental(noteStr: string, accTarget: '#' | 'b' | '='): string {
  const m = noteStr.match(/^([#b=]?)([0-7])([',]*)(_*)(\.*)(~?)((?:\{[^}]*\})*)$/);
  if (!m) return noteStr;
  const [, acc, digit, octStr, underlines, dots, tie, markings] = m;
  if (digit === '0') return noteStr;
  const nextAcc = acc === accTarget ? '' : accTarget;
  return `${nextAcc}${digit}${octStr}${underlines}${dots}${tie}${markings}`;
}

const EXCLUSIVE_GROUPS: string[][] = [
  ['pull', 'push', '拉', '推', 'pizz', '拨'],
  ['in', 'out', '内', '外'],
  ['0', '1', '2', '3', '4', '一', '二', '三', '四'],
  ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz']
];

function transformNoteMarking(noteStr: string, tag: string): string {
  const m = noteStr.match(/^([#b=]?)([0-7])([',]*)(_*)(\.*)(~?)((?:\{[^}]*\})*)$/);
  if (!m) return noteStr;
  const [, acc, digit, octStr, underlines, dots, tie, markingsStr] = m;

  const existingTags: string[] = [];
  const blockRegex = /\{([^}]*)\}/g;
  let bm: RegExpExecArray | null;
  while ((bm = blockRegex.exec(markingsStr)) !== null) {
    const parts = bm[1].split(/[,，;\s]+/).map(s => s.trim()).filter(Boolean);
    existingTags.push(...parts);
  }

  const idx = existingTags.findIndex(t => t.toLowerCase() === tag.toLowerCase());
  let nextTags: string[];
  if (idx >= 0) {
    // Toggle off
    nextTags = existingTags.filter((_, i) => i !== idx);
  } else {
    // Replace any mutually-exclusive tag in the same group (e.g. switching pull -> push or in -> out)
    const group = EXCLUSIVE_GROUPS.find(g => g.includes(tag) || g.includes(tag.toLowerCase()));
    const filtered = group
      ? existingTags.filter(t => !group.includes(t) && !group.includes(t.toLowerCase()))
      : existingTags;
    nextTags = [...filtered, tag];
  }

  const newMarkings = nextTags.length > 0 ? `{${nextTags.join(',')}}` : '';
  return `${acc}${digit}${octStr}${underlines}${dots}${tie}${newMarkings}`;
}

function applyNoteTransform(
  text: string,
  selStart: number,
  selEnd: number,
  transformer: (noteStr: string) => string
): TextEditResult | null {
  if (selStart !== selEnd) {
    const selected = text.slice(selStart, selEnd);
    const replaced = selected.replace(NOTE_REGEX, match => transformer(match));
    if (replaced === selected) return null;
    const nextText = text.slice(0, selStart) + replaced + text.slice(selEnd);
    return {
      text: nextText,
      selectionStart: selStart,
      selectionEnd: selStart + replaced.length
    };
  }

  const target = findNoteAtCursor(text, selStart);
  if (!target) return null;
  const original = text.slice(target.start, target.end);
  const replaced = transformer(original);
  if (replaced === original) return null;
  const nextText = text.slice(0, target.start) + replaced + text.slice(target.end);
  return {
    text: nextText,
    selectionStart: target.start + replaced.length,
    selectionEnd: target.start + replaced.length
  };
}

/**
 * Port of SimpErhu VBA Macro: Raise / Lower Octave Dots on cursor note or selection
 */
export function macroShiftOctave(text: string, selStart: number, selEnd: number, delta: 1 | -1): TextEditResult | null {
  return applyNoteTransform(text, selStart, selEnd, n => transformNoteOctave(n, delta));
}

/**
 * Port of SimpErhu VBA Macro: Add / Remove Duration Underline (Beam)
 */
export function macroAdjustUnderlines(text: string, selStart: number, selEnd: number, delta: 1 | -1): TextEditResult | null {
  return applyNoteTransform(text, selStart, selEnd, n => transformNoteUnderlines(n, delta));
}

/**
 * Port of SimpErhu VBA Macro: Toggle Augmentation Dot
 */
export function macroToggleDot(text: string, selStart: number, selEnd: number): TextEditResult | null {
  return applyNoteTransform(text, selStart, selEnd, transformNoteDot);
}

/**
 * Port of SimpErhu VBA Macro: Toggle Sharp / Flat / Natural
 */
export function macroToggleAccidental(text: string, selStart: number, selEnd: number, acc: '#' | 'b' | '='): TextEditResult | null {
  return applyNoteTransform(text, selStart, selEnd, n => transformNoteAccidental(n, acc));
}

/**
 * Port of SimpErhu VBA Macro: Attach / Toggle Erhu Marking (Bowing, Finger, String, Slide, Vibrato, Dynamic)
 */
export function macroToggleMarking(text: string, selStart: number, selEnd: number, tag: string): TextEditResult {
  const res = applyNoteTransform(text, selStart, selEnd, n => transformNoteMarking(n, tag));
  if (res) return res;
  // Fallback: insert marking at cursor
  const snippet = `{${tag}}`;
  return {
    text: text.slice(0, selStart) + snippet + text.slice(selEnd),
    selectionStart: selStart + snippet.length,
    selectionEnd: selStart + snippet.length
  };
}

/**
 * Port of SimpErhu VBA Macro: Wrap / Unwrap Slur (连弓线)
 */
export function macroToggleSlur(text: string, selStart: number, selEnd: number): TextEditResult {
  if (selStart !== selEnd) {
    const selected = text.slice(selStart, selEnd);
    const trimmed = selected.trim();
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      const unwrapped = trimmed.slice(1, -1);
      const next = text.slice(0, selStart) + unwrapped + text.slice(selEnd);
      return { text: next, selectionStart: selStart, selectionEnd: selStart + unwrapped.length };
    }
    const wrapped = `(${selected})`;
    const next = text.slice(0, selStart) + wrapped + text.slice(selEnd);
    return { text: next, selectionStart: selStart, selectionEnd: selStart + wrapped.length };
  }
  const snippet = '( )';
  const next = text.slice(0, selStart) + snippet + text.slice(selEnd);
  return { text: next, selectionStart: selStart + 1, selectionEnd: selStart + 2 };
}

/**
 * Port of SimpErhu VBA Macro: Wrap Triplet 3(...)
 */
export function macroWrapTriplet(text: string, selStart: number, selEnd: number): TextEditResult {
  if (selStart !== selEnd) {
    const selected = text.slice(selStart, selEnd);
    const wrapped = `3(${selected})`;
    return {
      text: text.slice(0, selStart) + wrapped + text.slice(selEnd),
      selectionStart: selStart,
      selectionEnd: selStart + wrapped.length
    };
  }
  const snippet = '3(5_ 6_ 5_)';
  return {
    text: text.slice(0, selStart) + snippet + text.slice(selEnd),
    selectionStart: selStart + 2,
    selectionEnd: selStart + snippet.length - 1
  };
}

/**
 * Insert raw snippet at cursor (barlines, grace notes, sections, lyrics templates)
 */
export function macroInsertSnippet(text: string, selStart: number, selEnd: number, snippet: string): TextEditResult {
  const next = text.slice(0, selStart) + snippet + text.slice(selEnd);
  return {
    text: next,
    selectionStart: selStart + snippet.length,
    selectionEnd: selStart + snippet.length
  };
}

/**
 * Port of SimpErhu VBA Macro (Ctrl+J): Update or insert @tempo and @expression directives
 */
export function macroSetTempo(text: string, bpm: number, expression?: string): string {
  let result = text;
  if (/^@tempo\s*[:：].*$/im.test(result)) {
    result = result.replace(/^@tempo\s*[:：].*$/im, `@tempo: ${bpm}`);
  } else if (/^@time\s*[:：].*$/im.test(result)) {
    result = result.replace(/^(@time\s*[:：].*)$/im, `$1\n@tempo: ${bpm}`);
  } else {
    result = `@tempo: ${bpm}\n${result}`;
  }

  if (expression !== undefined) {
    const trimmedExp = expression.trim();
    if (trimmedExp) {
      if (/^@expression\s*[:：].*$/im.test(result)) {
        result = result.replace(/^@expression\s*[:：].*$/im, `@expression: ${trimmedExp}`);
      } else {
        result = result.replace(/^(@tempo\s*[:：].*)$/im, `$1\n@expression: ${trimmedExp}`);
      }
    }
  }
  return result;
}

/**
 * Port of SimpErhu VBA Macro: Set or transpose score Key (@key and auto-update Erhu @strings)
 */
export function macroSetKey(text: string, targetKey: string): string {
  const keyInfo = getErhuKeyInfo(targetKey);
  let result = text;

  if (/^@key\s*[:：].*$/im.test(result)) {
    result = result.replace(/^@key\s*[:：].*$/im, `@key: ${keyInfo.label}`);
  } else {
    result = `@key: ${keyInfo.label}\n${result}`;
  }

  if (/^@strings\s*[:：].*$/im.test(result)) {
    result = result.replace(/^@strings\s*[:：].*$/im, `@strings: ${keyInfo.strings}`);
  } else {
    result = result.replace(/^(@key\s*[:：].*)$/im, `$1\n@strings: ${keyInfo.strings}`);
  }

  return result;
}

export function macroTransposeKey(text: string, semitones: number): string {
  const match = text.match(/^@key\s*[:：]\s*(.+)$/im);
  const currentKey = match ? match[1].trim() : 'D';
  const nextKey = transposeKeyName(currentKey, semitones);
  return macroSetKey(text, nextKey);
}

/**
 * Port of SimpErhu VBA Macro: Diatonic Scale-Degree Shift (shifts all 1-7 notes + octave dots!)
 */
export function macroShiftScaleDegrees(text: string, steps: number): string {
  if (steps === 0) return text;
  const lines = text.split('\n');
  const transformed = lines.map(line => {
    const t = line.trim();
    if (!t || /^(@|S:|L:|T:|#|\/\/)/i.test(t)) return line;

    return line.replace(NOTE_REGEX, (full, acc, digit, octStr, underlines, dots, tie, markings) => {
      const deg = parseInt(digit, 10);
      if (deg === 0) return full;
      let oct = 0;
      for (const ch of octStr) {
        if (ch === "'") oct++;
        else if (ch === ',') oct--;
      }
      const totalStep = oct * 7 + (deg - 1) + steps;
      const newOct = Math.max(-2, Math.min(2, Math.floor(totalStep / 7)));
      const newDeg = ((totalStep % 7) + 7) % 7 + 1;
      const newOctStr = newOct > 0 ? "'".repeat(newOct) : newOct < 0 ? ','.repeat(-newOct) : '';
      return `${acc}${newDeg}${newOctStr}${underlines}${dots}${tie}${markings}`;
    });
  });
  return transformed.join('\n');
}

/**
 * Port of SimpErhu VBA Macro: Auto-format & tidy barline spacing across all music lines
 */
export function macroTidyFormatting(text: string): string {
  const lines = text.split('\n');
  return lines.map(line => {
    const t = line.trim();
    if (!t || /^(@|S:|L:|T:|#|\/\/)/i.test(t)) return line;

    // Normalize spaces around barlines without touching double/repeat barlines
    let cleaned = t.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\s*(:?\|\|:?|\|\]|\|:|:\||\|)\s*/g, ' $1 ');
    cleaned = cleaned.trim();
    // Clean trailing/leading spaces inside parentheses
    cleaned = cleaned.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
    return cleaned;
  }).join('\n');
}
