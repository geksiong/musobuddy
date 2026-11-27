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

const NOTE_REGEX = /([#b=]?)([0-7])([',]*)([_/]*)(\.*)(~?)((?:\{[^}]*\})*)/g;
const GRACE_PREFIX_REGEX = /\^\/?(?:\{[^}]*\}|[#b=]?[1-7][',]*[_/]*)/;
const LINE_TOKEN_REGEX = /(\^\/?(?:\{[^}]*\}|[#b=]?[1-7][',]*[_/]*))|(\{[^}]*\})|(\[(?:\d+(?:[,\-]\d+)*\.\]?|[^\[\]]+\]))|(([#b=]?)([0-7])([',]*)([_/]*)(\.*)(~?)((?:\{[^}]*\})*))/g;

interface NoteSpan {
  start: number;
  end: number;
  text: string;
}

/**
 * Finds all main note spans in a single music line, ignoring grace-note prefixes (^5/, ^{5/6/}),
 * bracket navigation/volta tags ([1., [segno], [coda]), and standalone marking blocks ({...}).
 */
function findMainNotesInLine(line: string, lineStart: number): NoteSpan[] {
  const spans: NoteSpan[] = [];
  LINE_TOKEN_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINE_TOKEN_REGEX.exec(line)) !== null) {
    if (m[4]) {
      spans.push({
        start: lineStart + m.index,
        end: lineStart + m.index + m[4].length,
        text: m[4]
      });
    }
  }
  return spans;
}

/**
 * Locates the main note token covering the cursor position (or immediately before/after it),
 * skipping grace note prefixes (^5/, ^{5/6/}) so Erhu markings & rhythm edits never corrupt them.
 */
function findNoteAtCursor(text: string, pos: number): NoteSpan | null {
  const lineStart = text.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  const rawLineEnd = text.indexOf('\n', pos);
  const lineEnd = rawLineEnd === -1 ? text.length : rawLineEnd;
  const line = text.slice(lineStart, lineEnd);

  // Skip header / lyrics / section lines
  if (/^\s*(@|S:|L:|T:|#|\/\/)/i.test(line)) return null;

  const spans = findMainNotesInLine(line, lineStart);
  let prevCandidate: NoteSpan | null = null;

  for (const span of spans) {
    if (pos >= span.start && pos <= span.end) {
      return span;
    }
    if (span.end <= pos) {
      prevCandidate = span;
    }
  }

  // If cursor sits right after a grace note (e.g. ^5/|6), target the main note immediately following it
  const nextAfterCursor = spans.find(s => s.start >= pos && s.start - pos <= 2);
  if (nextAfterCursor) {
    const beforeRel = line.slice(0, pos - lineStart);
    if (new RegExp(`${GRACE_PREFIX_REGEX.source}\\s*$`).test(beforeRel)) {
      return nextAfterCursor;
    }
  }

  // If cursor is immediately after a note (within 1 space), use previous note on same line
  if (prevCandidate && pos - prevCandidate.end <= 1) {
    return prevCandidate;
  }
  return null;
}

function transformNoteOctave(noteStr: string, delta: 1 | -1): string {
  const m = noteStr.match(/^([#b=]?)([0-7])([',]*)([_/]*)(\.*)(~?)((?:\{[^}]*\})*)$/);
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

function transformNoteUnderlines(noteStr: string, delta: 1 | -1, defaultBeamChar: '/' | '_' = '/'): string {
  const m = noteStr.match(/^([#b=]?)([0-7])([',]*)([_/]*)(\.*)(~?)((?:\{[^}]*\})*)$/);
  if (!m) return noteStr;
  const [, acc, digit, octStr, underlines, dots, tie, markings] = m;
  const nextCount = Math.max(0, Math.min(3, underlines.length + delta));
  const beamChar = underlines.includes('/') ? '/' : underlines.includes('_') ? '_' : defaultBeamChar;
  return `${acc}${digit}${octStr}${beamChar.repeat(nextCount)}${dots}${tie}${markings}`;
}

function transformNoteDot(noteStr: string): string {
  const m = noteStr.match(/^([#b=]?)([0-7])([',]*)([_/]*)(\.*)(~?)((?:\{[^}]*\})*)$/);
  if (!m) return noteStr;
  const [, acc, digit, octStr, underlines, dots, tie, markings] = m;
  const nextDots = dots.length === 0 ? '.' : dots.length === 1 ? '' : '.';
  return `${acc}${digit}${octStr}${underlines}${nextDots}${tie}${markings}`;
}

function transformNoteAccidental(noteStr: string, accTarget: '#' | 'b' | '='): string {
  const m = noteStr.match(/^([#b=]?)([0-7])([',]*)([_/]*)(\.*)(~?)((?:\{[^}]*\})*)$/);
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
  ['pos1', 'pos2', 'pos3', 'pos4', 'pos5', 'p1', 'p2', 'p3', 'p4', 'p5', '一把', '二把', '三把', '四把', '五把', '上把', '中把', '下把', '次下把'],
  ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz']
];

function transformNoteMarking(noteStr: string, tag: string): string {
  const m = noteStr.match(/^([#b=]?)([0-7])([',]*)([_/]*)(\.*)(~?)((?:\{[^}]*\})*)$/);
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
    const replaced = selected.replace(LINE_TOKEN_REGEX, (full, graceTok, braceTok, bracketTok, noteTok) => {
      if (graceTok || braceTok || bracketTok) return full;
      return noteTok ? transformer(noteTok) : full;
    });
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
 * Raise / Lower Octave Dots on cursor note or selection
 */
export function macroShiftOctave(text: string, selStart: number, selEnd: number, delta: 1 | -1): TextEditResult | null {
  return applyNoteTransform(text, selStart, selEnd, n => transformNoteOctave(n, delta));
}

/**
 * Add / Remove Duration Underline (Beam)
 */
export function macroAdjustUnderlines(text: string, selStart: number, selEnd: number, delta: 1 | -1): TextEditResult | null {
  const hasSlashBeams = /[0-7][',]*\//.test(text);
  const hasUnderscoreBeams = /[0-7][',]*_/.test(text);
  const defaultBeamChar: '/' | '_' = hasUnderscoreBeams && !hasSlashBeams ? '_' : '/';
  return applyNoteTransform(text, selStart, selEnd, n => transformNoteUnderlines(n, delta, defaultBeamChar));
}

/**
 * Toggle Augmentation Dot
 */
export function macroToggleDot(text: string, selStart: number, selEnd: number): TextEditResult | null {
  return applyNoteTransform(text, selStart, selEnd, transformNoteDot);
}

/**
 * Toggle Sharp / Flat / Natural
 */
export function macroToggleAccidental(text: string, selStart: number, selEnd: number, acc: '#' | 'b' | '='): TextEditResult | null {
  return applyNoteTransform(text, selStart, selEnd, n => transformNoteAccidental(n, acc));
}

/**
 * Attach / Toggle Erhu Marking (Bowing, Finger, String, Slide, Vibrato, Dynamic)
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
 * Wrap / Unwrap Slur (连弓线)
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
 * Wrap Triplet 3(...)
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
  const snippet = '3(5/ 6/ 5/)';
  return {
    text: text.slice(0, selStart) + snippet + text.slice(selEnd),
    selectionStart: selStart + 2,
    selectionEnd: selStart + snippet.length - 1
  };
}

/**
 * Wrap / Unwrap Crescendo (<(...)) or Diminuendo (>(...)) Hairpin Passage
 */
export function macroWrapHairpin(
  text: string,
  selStart: number,
  selEnd: number,
  type: 'cresc' | 'dim'
): TextEditResult {
  const prefix = type === 'cresc' ? '<(' : '>(';
  if (selStart !== selEnd) {
    const selected = text.slice(selStart, selEnd);
    const trimmed = selected.trim();
    if (trimmed.startsWith(prefix) && trimmed.endsWith(')')) {
      const unwrapped = trimmed.slice(prefix.length, -1).trim();
      const next = text.slice(0, selStart) + unwrapped + text.slice(selEnd);
      return {
        text: next,
        selectionStart: selStart,
        selectionEnd: selStart + unwrapped.length
      };
    }
    const wrapped = `${prefix}${selected})`;
    const next = text.slice(0, selStart) + wrapped + text.slice(selEnd);
    return {
      text: next,
      selectionStart: selStart,
      selectionEnd: selStart + wrapped.length
    };
  }

  const sampleBody = type === 'cresc' ? '1 2 3 5' : '5 3 2 1';
  const snippet = `${prefix}${sampleBody})`;
  return {
    text: text.slice(0, selStart) + snippet + text.slice(selEnd),
    selectionStart: selStart + prefix.length,
    selectionEnd: selStart + prefix.length + sampleBody.length
  };
}

/**
 * Insert raw snippet at cursor (barlines, sections, lyrics templates)
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
 * Prepend a grace note (^5/) before the selected or cursor note without deleting the note.
 * Selects the grace pitch digit so the user can immediately type any scale degree 1-7.
 */
export function macroInsertGraceNote(
  text: string,
  selStart: number,
  selEnd: number,
  defaultPitch: string = '5'
): TextEditResult {
  const hasSlashBeams = /[0-7][',]*\//.test(text);
  const hasUnderscoreBeams = /[0-7][',]*_/.test(text);
  const beamChar = hasUnderscoreBeams && !hasSlashBeams ? '_' : '/';
  const snippet = `^${defaultPitch}${beamChar}`;

  // Determine the target main note using the full line so selecting the pitch inside ^5/ never nests ^
  let insertAt: number | null = null;
  const lineStart = text.lastIndexOf('\n', Math.max(0, selStart - 1)) + 1;
  const rawLineEnd = text.indexOf('\n', selStart);
  const lineEnd = rawLineEnd === -1 ? text.length : rawLineEnd;
  const line = text.slice(lineStart, lineEnd);

  if (!/^\s*(@|S:|L:|T:|#|\/\/)/i.test(line)) {
    const lineSpans = findMainNotesInLine(line, lineStart);
    if (selStart !== selEnd) {
      // Find first main note overlapping the selection, or immediately following a selected grace pitch
      const overlapping = lineSpans.find(s => s.end > selStart && s.start < selEnd);
      if (overlapping) {
        insertAt = overlapping.start;
      } else {
        const following = lineSpans.find(s => s.start >= selEnd);
        if (following) {
          const between = text.slice(lineStart, following.start);
          if (new RegExp(`${GRACE_PREFIX_REGEX.source}\\s*$`).test(between)) {
            insertAt = following.start;
          }
        }
      }
    } else {
      const target = findNoteAtCursor(text, selStart);
      if (target) {
        insertAt = target.start;
      }
    }
  }

  if (insertAt !== null) {
    // Check if there is already an existing single grace note right before insertAt (e.g. ^5/6 -> ^{5/5/}6)
    const before = text.slice(0, insertAt);
    const existingSingle = before.match(/(\^\/?)([#b=]?[1-7][',]*[_/]*)(\s*)$/);
    if (existingSingle) {
      const prefix = existingSingle[1];
      const existingGrace = existingSingle[2];
      const trailingSpace = existingSingle[3];
      const replaceStart = insertAt - existingSingle[0].length;
      const newGrace = `${defaultPitch}${beamChar}`;
      const combined = `${prefix}{${existingGrace}${newGrace}}${trailingSpace}`;
      const next = text.slice(0, replaceStart) + combined + text.slice(insertAt);
      const pitchStart = replaceStart + prefix.length + 1 + existingGrace.length;
      return {
        text: next,
        selectionStart: pitchStart,
        selectionEnd: pitchStart + defaultPitch.length
      };
    }

    const existingMulti = before.match(/(\^\/?\{)([^}]*)(\})(\s*)$/);
    if (existingMulti) {
      const open = existingMulti[1];
      const inner = existingMulti[2];
      const close = existingMulti[3];
      const trailingSpace = existingMulti[4];
      const replaceStart = insertAt - existingMulti[0].length;
      const newGrace = `${defaultPitch}${beamChar}`;
      const combined = `${open}${inner}${newGrace}${close}${trailingSpace}`;
      const next = text.slice(0, replaceStart) + combined + text.slice(insertAt);
      const pitchStart = replaceStart + open.length + inner.length;
      return {
        text: next,
        selectionStart: pitchStart,
        selectionEnd: pitchStart + defaultPitch.length
      };
    }

    const next = text.slice(0, insertAt) + snippet + text.slice(insertAt);
    return {
      text: next,
      selectionStart: insertAt + 1,
      selectionEnd: insertAt + 1 + defaultPitch.length
    };
  }

  // Fallback when cursor is not near any note: insert at cursor and highlight pitch digit
  const next = text.slice(0, selStart) + snippet + text.slice(selEnd);
  return {
    text: next,
    selectionStart: selStart + 1,
    selectionEnd: selStart + 1 + defaultPitch.length
  };
}

/**
 * Tempo Macro (Ctrl+J): Update or insert @tempo and @expression directives
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
 * Set or transpose score Key (@key and auto-update Erhu @strings)
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
 * Diatonic Scale-Degree Shift (shifts all 1-7 notes + octave dots)
 */
export function macroShiftScaleDegrees(text: string, steps: number): string {
  if (steps === 0) return text;
  const lines = text.split('\n');
  const transformed = lines.map(line => {
    const t = line.trim();
    if (!t || /^(@|S:|L:|T:|#|\/\/)/i.test(t)) return line;

    return line.replace(
      /(\[(?:\d+(?:[,\-]\d+)*\.\]?|[^\[\]]+\]))|(\{[^}]*\})|(([#b=]?)([0-7])([',]*)([_/]*)(\.*)(~?)((?:\{[^}]*\})*))/g,
      (full, bracketTok, braceTok, noteTok, acc, digit, octStr, underlines, dots, tie, markings) => {
        if (bracketTok || braceTok || !noteTok) return full;
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
      }
    );
  });
  return transformed.join('\n');
}

/**
 * Auto-format & tidy barline spacing across all music lines
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
