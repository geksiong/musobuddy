/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getErhuKeyInfo, transposeKeyName } from './erhuKeys.ts';
import { InstrumentType, ShakuhachiSchool } from './types.ts';

export interface TextEditResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

const GRACE_PREFIX_REGEX = /\^\/?(?:\{[^}]*\}|[#b=]?[1-7][',]*[_/]*)/;
const NOTE_OR_CHORD_CORE = '(?:<[^<>()]+>|[#b=]?[1-7][\',]*(?:\\+[#b=]?[1-7][\',]*)+|[#b=]?[0-7][\',]*)';
const NOTE_OR_CHORD_FULL_REGEX = new RegExp(`^(${NOTE_OR_CHORD_CORE})([_/]*)(\\.*)(~?)((?:\\{[^}]*\\})*)$`);
const LINE_TOKEN_REGEX = new RegExp(
  `(${GRACE_PREFIX_REGEX.source})|(\\{[^}]*\\})|(\\[(?:\\d+(?:[,\\-]\\d+)*\\.]?|[^\\[\\]]+\\]))|(${NOTE_OR_CHORD_CORE}[_/]*\\.*~?(?:\\{[^}]*\\})*)`,
  'g'
);

interface NoteSpan {
  start: number;
  end: number;
  text: string;
}

/**
 * Finds all main note & chord spans in a single music line, ignoring grace-note prefixes (^5/, ^{5/6/}),
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
 * Locates the main note or chord token covering the cursor position (or immediately before/after it),
 * skipping grace note prefixes (^5/, ^{5/6/}) so markings & rhythm edits never corrupt them.
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

function splitNoteOrChord(noteStr: string) {
  const m = noteStr.match(NOTE_OR_CHORD_FULL_REGEX);
  if (!m) return null;
  return {
    head: m[1],
    underlines: m[2],
    dots: m[3],
    tie: m[4],
    markings: m[5]
  };
}

function transformNoteOctave(noteStr: string, delta: 1 | -1): string {
  const parts = splitNoteOrChord(noteStr);
  if (!parts) return noteStr;
  const nextHead = parts.head.replace(/([#b=]?)([0-7])([',]*)/g, (full, acc, digit, octStr) => {
    if (digit === '0') return full;
    let oct = 0;
    for (const ch of octStr) {
      if (ch === "'") oct++;
      else if (ch === ',') oct--;
    }
    oct = Math.max(-2, Math.min(2, oct + delta));
    const newOctStr = oct > 0 ? "'".repeat(oct) : oct < 0 ? ','.repeat(-oct) : '';
    return `${acc}${digit}${newOctStr}`;
  });
  return `${nextHead}${parts.underlines}${parts.dots}${parts.tie}${parts.markings}`;
}

function transformNoteUnderlines(noteStr: string, delta: 1 | -1, defaultBeamChar: '/' | '_' = '/'): string {
  const parts = splitNoteOrChord(noteStr);
  if (!parts) return noteStr;
  const nextCount = Math.max(0, Math.min(3, parts.underlines.length + delta));
  const beamChar = parts.underlines.includes('/') ? '/' : parts.underlines.includes('_') ? '_' : defaultBeamChar;
  return `${parts.head}${beamChar.repeat(nextCount)}${parts.dots}${parts.tie}${parts.markings}`;
}

function transformNoteDot(noteStr: string): string {
  const parts = splitNoteOrChord(noteStr);
  if (!parts) return noteStr;
  const nextDots = parts.dots.length === 0 ? '.' : parts.dots.length === 1 ? '' : '.';
  return `${parts.head}${parts.underlines}${nextDots}${parts.tie}${parts.markings}`;
}

function transformNoteAccidental(noteStr: string, accTarget: '#' | 'b' | '='): string {
  const parts = splitNoteOrChord(noteStr);
  if (!parts) return noteStr;
  // For single notes, toggle accidental directly; for chords, toggle on first pitch
  let done = false;
  const nextHead = parts.head.replace(/([#b=]?)([0-7])([',]*)/g, (full, acc, digit, octStr) => {
    if (done || digit === '0') return full;
    done = true;
    const nextAcc = acc === accTarget ? '' : accTarget;
    return `${nextAcc}${digit}${octStr}`;
  });
  return `${nextHead}${parts.underlines}${parts.dots}${parts.tie}${parts.markings}`;
}

const EXCLUSIVE_GROUPS: string[][] = [
  ['pull', 'push', '拉', '推', 'pizz', '拨'],
  ['in', 'out', '内', '外', 's1', 's2', 's3', 's4', '一弦', '二弦', '三弦', '四弦', '子弦', '中弦', '老弦', '缠弦'],
  ['0', '1', '2', '3', '4', '一', '二', '三', '四'],
  ['pos1', 'pos2', 'pos3', 'pos4', 'pos5', 'p1', 'p2', 'p3', 'p4', 'p5', '一把', '二把', '三把', '四把', '五把', '上把', '中把', '下把', '次下把'],
  ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sfz'],
  ['tu', 'ktu', 'dtu', 'ttu', 't', 'k', 'tk', 'ttk', '单吐', '双吐', '三吐'],
  ['li', 'lidown', '历音', '上历音', '下历音'],
  ['乙', '甲', '大甲', 'otsu', 'kan', 'daikan'],
  ['メ', 'メリ', '中メ', '中メリ', '大メ', '大メリ', 'カ', 'カリ', 'meri', 'chumeri', 'daimeri', 'kari'],
  ['短', '長', '長長', '極長', 'short', 'long', 'xlong']
];

/**
 * Splits the inside of a `{...}` markings block while preserving quoted annotations
 * (`"..."`, `'...'`, `「...」`, `『...』`, `“...”`) and `jin:...` / `注:...` commentary.
 * Mid-word apostrophes (e.g. `don't`) or unclosed quotes never swallow following tags.
 */
function splitBraceTags(inner: string, splitOnSpace: boolean = false): string[] {
  const tags: string[] = [];
  let cur = '';
  let closeQuote: string | null = null;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (closeQuote) {
      cur += ch;
      if (ch === closeQuote) closeQuote = null;
      continue;
    }

    const atTokenStart = cur.trim().length === 0 || /[:：]\s*$/.test(cur);
    if ((ch === '"' || ch === "'") && atTokenStart && inner.indexOf(ch, i + 1) !== -1) {
      closeQuote = ch;
      cur += ch;
      continue;
    }
    if (ch === '「' && inner.indexOf('」', i + 1) !== -1) {
      closeQuote = '」';
      cur += ch;
      continue;
    }
    if (ch === '『' && inner.indexOf('』', i + 1) !== -1) {
      closeQuote = '』';
      cur += ch;
      continue;
    }
    if (ch === '“' && inner.indexOf('”', i + 1) !== -1) {
      closeQuote = '”';
      cur += ch;
      continue;
    }

    const isJinPrefix = /^(?:jin|nyodo|inst|note|注|傍注|指示)[:：]/i.test(cur.trim());
    if (ch === ',' || ch === '，' || ch === ';' || ch === '；' || (splitOnSpace && !isJinPrefix && /\s/.test(ch))) {
      const tr = cur.trim();
      if (tr) tags.push(tr);
      cur = '';
      continue;
    }
    cur += ch;
  }
  const trailing = cur.trim();
  if (trailing) tags.push(trailing);
  return tags;
}

function transformNoteMarking(noteStr: string, tag: string): string {
  const parts = splitNoteOrChord(noteStr);
  if (!parts) return noteStr;

  const existingTags: string[] = [];
  const blockRegex = /\{([^}]*)\}/g;
  let bm: RegExpExecArray | null;
  while ((bm = blockRegex.exec(parts.markings)) !== null) {
    existingTags.push(...splitBraceTags(bm[1], true));
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
  return `${parts.head}${parts.underlines}${parts.dots}${parts.tie}${newMarkings}`;
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
 * Raise / Lower Octave Dots on cursor note/chord or selection
 */
export function macroShiftOctave(text: string, selStart: number, selEnd: number, delta: 1 | -1): TextEditResult | null {
  return applyNoteTransform(text, selStart, selEnd, n => transformNoteOctave(n, delta));
}

/**
 * Add / Remove Duration Underline (Beam)
 */
export function macroAdjustUnderlines(text: string, selStart: number, selEnd: number, delta: 1 | -1): TextEditResult | null {
  const hasSlashBeams = /[0-7>][',]*\//.test(text);
  const hasUnderscoreBeams = /[0-7>][',]*_/.test(text);
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
 * Finds a standalone `{...}` block (Pure Guqin or Pure Shakuhachi note) covering or immediately before cursor.
 */
function findStandaloneBraceAtCursor(text: string, pos: number): NoteSpan | null {
  const lineStart = text.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  const rawLineEnd = text.indexOf('\n', pos);
  const lineEnd = rawLineEnd === -1 ? text.length : rawLineEnd;
  const line = text.slice(lineStart, lineEnd);
  if (/^\s*(@|S:|L:|T:|#|\/\/)/i.test(line)) return null;

  const regex = /\{[^}]*\}[_/]*\.*~?/g;
  let m: RegExpExecArray | null;
  let prev: NoteSpan | null = null;
  while ((m = regex.exec(line)) !== null) {
    const start = lineStart + m.index;
    const end = start + m[0].length;
    if (pos >= start && pos <= end) return { start, end, text: m[0] };
    if (end <= pos) prev = { start, end, text: m[0] };
  }
  if (prev && pos - prev.end <= 1) return prev;
  return null;
}

function toggleTagInsideBraceBlock(blockStr: string, tag: string): string {
  const m = blockStr.match(/^\{([^}]*)\}([_/]*\.*~?)$/);
  if (!m) return blockStr;
  const existingTags = splitBraceTags(m[1], false);

  const idx = existingTags.findIndex(t => t.toLowerCase() === tag.toLowerCase());
  let nextTags: string[];
  if (idx >= 0) {
    // Guard: never empty out a standalone `{...}` note block (e.g. toggling `ロ` on `{ロ}`)
    if (existingTags.length <= 1) return blockStr;
    nextTags = existingTags.filter((_, i) => i !== idx);
  } else {
    const group = EXCLUSIVE_GROUPS.find(g => g.includes(tag) || g.includes(tag.toLowerCase()));
    const filtered = group
      ? existingTags.filter((t, i) => i === 0 || (!group.includes(t) && !group.includes(t.toLowerCase())))
      : existingTags;
    nextTags = [...filtered, tag];
  }
  return nextTags.length > 0 ? `{${nextTags.join(',')}}${m[2]}` : blockStr;
}

const SELECTION_MARKING_REGEX = new RegExp(
  `(${GRACE_PREFIX_REGEX.source})|(\\{[^}]*\\}[_/]*\\.*~?)|(\\[(?:\\d+(?:[,\\-]\\d+)*\\.]?|[^\\[\\]]+\\]))|(${NOTE_OR_CHORD_CORE}[_/]*\\.*~?(?:\\{[^}]*\\})*)`,
  'g'
);

/**
 * Attach / Toggle Marking (Bowing, Pipa/Guzheng/Shakuhachi Technique, Finger, String, Slide, Vibrato, Dynamic)
 */
export function macroToggleMarking(text: string, selStart: number, selEnd: number, tag: string): TextEditResult {
  // Handle non-empty selections covering Jianpu notes AND/OR standalone `{...}` Guqin/Shakuhachi notes
  if (selStart !== selEnd) {
    const selected = text.slice(selStart, selEnd);
    let foundAnyTarget = false;
    const replaced = selected.replace(
      SELECTION_MARKING_REGEX,
      (full, graceTok, braceTok, bracketTok, noteTok, offset: number) => {
        if (graceTok || bracketTok) return full;
        if (noteTok) {
          foundAnyTarget = true;
          return transformNoteMarking(noteTok, tag);
        }
        if (braceTok) {
          // If this `{...}` block immediately precedes a Jianpu note digit (e.g. `{pull}5`), leave it attached
          const afterChar = selected[offset + full.length] || text[selStart + offset + full.length] || '';
          if (/^[#b=0-7<]/.test(afterChar)) return full;
          foundAnyTarget = true;
          return toggleTagInsideBraceBlock(braceTok, tag);
        }
        return full;
      }
    );

    if (foundAnyTarget) {
      const nextText = text.slice(0, selStart) + replaced + text.slice(selEnd);
      return {
        text: nextText,
        selectionStart: selStart,
        selectionEnd: selStart + replaced.length
      };
    }

    // Also check if the user selected a sub-range INSIDE a standalone `{...}` note block (e.g. selecting `ロ` inside `{ロ}`)
    const enclosingBrace = findStandaloneBraceAtCursor(text, selStart);
    if (enclosingBrace && selStart >= enclosingBrace.start && selEnd <= enclosingBrace.end) {
      const nextBlock = toggleTagInsideBraceBlock(enclosingBrace.text, tag);
      const nextText = text.slice(0, enclosingBrace.start) + nextBlock + text.slice(enclosingBrace.end);
      return {
        text: nextText,
        selectionStart: enclosingBrace.start,
        selectionEnd: enclosingBrace.start + nextBlock.length
      };
    }
  }

  // Collapsed cursor: check standard Jianpu note first, then standalone `{...}` note
  const res = applyNoteTransform(text, selStart, selEnd, n => transformNoteMarking(n, tag));
  if (res) return res;

  if (selStart === selEnd) {
    const braceTarget = findStandaloneBraceAtCursor(text, selStart);
    if (braceTarget) {
      const replaced = toggleTagInsideBraceBlock(braceTarget.text, tag);
      const nextText = text.slice(0, braceTarget.start) + replaced + text.slice(braceTarget.end);
      return {
        text: nextText,
        selectionStart: braceTarget.start + replaced.length,
        selectionEnd: braceTarget.start + replaced.length
      };
    }
  }

  // Fallback: insert marking at cursor (preserving selected text if it's not meant to be deleted)
  const snippet = `{${tag}}`;
  const insertPos = selEnd;
  return {
    text: text.slice(0, insertPos) + snippet + text.slice(insertPos),
    selectionStart: insertPos + snippet.length,
    selectionEnd: insertPos + snippet.length
  };
}

/**
 * Checks whether `str` is wrapped by a single matching pair of outer parentheses `( ... )`
 * so selecting `(1/ 2/) (3/ 5/)` wraps into a nested phrasing slur `((1/ 2/) (3/ 5/))`
 * rather than erroneously stripping the first `(` and last `)`.
 */
function isWrappedBySingleOuterParen(str: string): boolean {
  if (!str.startsWith('(') || !str.endsWith(')')) return false;
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') {
      depth--;
      if (depth === 0 && i < str.length - 1) return false;
    }
  }
  return depth === 0;
}

/**
 * Wrap / Unwrap Slur (连音线 / 连弓线) — supports nested phrasing slurs!
 */
export function macroToggleSlur(text: string, selStart: number, selEnd: number): TextEditResult {
  if (selStart !== selEnd) {
    const selected = text.slice(selStart, selEnd);
    const trimmed = selected.trim();
    if (isWrappedBySingleOuterParen(trimmed)) {
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
 * Wrap selected notes into a Chord (<1 3 5>) or insert a sample chord at cursor
 */
export function macroWrapChord(text: string, selStart: number, selEnd: number): TextEditResult {
  if (selStart !== selEnd) {
    const selected = text.slice(selStart, selEnd);
    const trimmed = selected.trim();
    if (trimmed.startsWith('<') && trimmed.endsWith('>') && !trimmed.slice(1, -1).includes('>')) {
      const unwrapped = trimmed.slice(1, -1).trim();
      const next = text.slice(0, selStart) + unwrapped + text.slice(selEnd);
      return { text: next, selectionStart: selStart, selectionEnd: selStart + unwrapped.length };
    }
    const wrapped = `<${trimmed}>`;
    const next = text.slice(0, selStart) + wrapped + text.slice(selEnd);
    return { text: next, selectionStart: selStart, selectionEnd: selStart + wrapped.length };
  }
  const snippet = '<1 3 5>';
  const next = text.slice(0, selStart) + snippet + text.slice(selEnd);
  return { text: next, selectionStart: selStart + 1, selectionEnd: selStart + snippet.length - 1 };
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

const SINGLE_STANDALONE_BRACE_REGEX = /^\{[^}]*\}[_/]*\.*~?$/;

/**
 * Insert raw snippet at cursor (barlines, sections, lyrics templates, standalone notes).
 * When a single note token is selected (e.g. after clicking a note on the score preview),
 * inserts cleanly before prefix markers (`[1. `, `[segno] `) or right after the selected note
 * instead of overwriting and deleting the note.
 */
export function macroInsertSnippet(text: string, selStart: number, selEnd: number, snippet: string): TextEditResult {
  if (selStart !== selEnd) {
    const selected = text.slice(selStart, selEnd);
    const trimmed = selected.trim();
    const isSingleSelectedNote =
      SINGLE_STANDALONE_BRACE_REGEX.test(trimmed) || NOTE_OR_CHORD_FULL_REGEX.test(trimmed);

    if (isSingleSelectedNote) {
      const isPrefixMarker = /^\[(?:1\.|2\.|segno|coda)/i.test(snippet.trim());
      if (isPrefixMarker) {
        const next = text.slice(0, selStart) + snippet + text.slice(selStart);
        return {
          text: next,
          selectionStart: selStart + snippet.length,
          selectionEnd: selStart + snippet.length
        };
      }
      const needsLeadingSpace =
        snippet.length > 0 &&
        !/^[\s\n]/.test(snippet) &&
        !/[\s\n]$/.test(text.slice(0, selEnd));
      const insertText = needsLeadingSpace ? ` ${snippet}` : snippet;
      const next = text.slice(0, selEnd) + insertText + text.slice(selEnd);
      return {
        text: next,
        selectionStart: selEnd + insertText.length,
        selectionEnd: selEnd + insertText.length
      };
    }
  }

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
  const hasSlashBeams = /[0-7>][',]*\//.test(text);
  const hasUnderscoreBeams = /[0-7>][',]*_/.test(text);
  const beamChar = hasUnderscoreBeams && !hasSlashBeams ? '_' : '/';
  const snippet = `^${defaultPitch}${beamChar}`;

  let insertAt: number | null = null;
  const lineStart = text.lastIndexOf('\n', Math.max(0, selStart - 1)) + 1;
  const rawLineEnd = text.indexOf('\n', selStart);
  const lineEnd = rawLineEnd === -1 ? text.length : rawLineEnd;
  const line = text.slice(lineStart, lineEnd);

  if (!/^\s*(@|S:|L:|T:|#|\/\/)/i.test(line)) {
    const lineSpans = findMainNotesInLine(line, lineStart);
    if (selStart !== selEnd) {
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
    const beforeTarget = text.slice(lineStart, insertAt);
    const existingGraceMatch = beforeTarget.match(new RegExp(`(${GRACE_PREFIX_REGEX.source})$`));
    if (existingGraceMatch) {
      const graceStart = insertAt - existingGraceMatch[0].length;
      const graceBody = existingGraceMatch[0];
      if (graceBody.startsWith('^{') || graceBody.startsWith('^/{')) {
        const closeBrace = insertAt - 1;
        const innerAdd = ` ${defaultPitch}${beamChar}`;
        const next = text.slice(0, closeBrace) + innerAdd + text.slice(closeBrace);
        return {
          text: next,
          selectionStart: closeBrace + 1,
          selectionEnd: closeBrace + 1 + defaultPitch.length
        };
      }
      const slashed = graceBody.startsWith('^/');
      const existingSingle = graceBody.slice(slashed ? 2 : 1);
      const multi = `${slashed ? '^/' : '^'}{${existingSingle} ${defaultPitch}${beamChar}}`;
      const next = text.slice(0, graceStart) + multi + text.slice(insertAt);
      const pitchStart = graceStart + (slashed ? 3 : 2) + existingSingle.length + 1;
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
 * Set score @instrument directive (erhu | pipa | guzheng | dizi | xiao | guqin | shakuhachi)
 */
export function macroSetInstrument(text: string, instrument: InstrumentType): string {
  let result = text;
  if (/^@instrument\s*[:：].*$/im.test(result)) {
    result = result.replace(/^@instrument\s*[:：].*$/im, `@instrument: ${instrument}`);
  } else if (/^@title\s*[:：].*$/im.test(result)) {
    result = result.replace(/^(@title\s*[:：].*)$/im, `$1\n@instrument: ${instrument}`);
  } else {
    result = `@instrument: ${instrument}\n${result}`;
  }

  // Update @strings / @fingering / @flute / @school to match the selected instrument's conventions
  if (instrument === 'shakuhachi') {
    result = result.replace(/^@(?:strings|fingering|tongyin)\s*[:：].*\r?\n?/gim, '');
    if (!/^@(?:flute|tube|length|shaku)\s*[:：]/im.test(result)) {
      if (/^@instrument\s*[:：].*$/im.test(result)) {
        result = result.replace(/^(@instrument\s*[:：].*)$/im, '$1\n@flute: 1.8尺 (D)');
      }
    }
    if (!/^@(?:school|notation|ryu)\s*[:：]/im.test(result)) {
      if (/^@(?:flute|tube|length|shaku)\s*[:：].*$/im.test(result)) {
        result = result.replace(/^(@(?:flute|tube|length|shaku)\s*[:：].*)$/im, '$1\n@school: kinko');
      }
    }
  } else if (instrument === 'guqin') {
    result = result.replace(/^@(?:fingering|tongyin|flute|tube|school|notation|ryu)\s*[:：].*\r?\n?/gim, '');
    if (/^@strings\s*[:：].*$/im.test(result)) {
      result = result.replace(/^@strings\s*[:：].*$/im, '@strings: 正调 5-6-1-2-3-5-6');
    } else if (/^@key\s*[:：].*$/im.test(result)) {
      result = result.replace(/^(@key\s*[:：].*)$/im, '$1\n@strings: 正调 5-6-1-2-3-5-6');
    }
  } else if (instrument === 'pipa') {
    result = result.replace(/^@(?:fingering|tongyin|flute|tube|school|notation|ryu)\s*[:：].*\r?\n?/gim, '');
    if (/^@strings\s*[:：].*$/im.test(result)) {
      result = result.replace(/^@strings\s*[:：].*$/im, '@strings: A-d-e-a');
    }
  } else if (instrument === 'guzheng') {
    result = result.replace(/^@(?:strings|fingering|tongyin|flute|tube|school|notation|ryu)\s*[:：].*\r?\n?/gim, '');
  } else if (instrument === 'dizi' || instrument === 'xiao') {
    result = result.replace(/^@(?:strings|school|notation|ryu)\s*[:：].*\r?\n?/gim, '');
    if (!/^@(?:fingering|tongyin)\s*[:：]/im.test(result)) {
      if (/^@key\s*[:：].*$/im.test(result)) {
        result = result.replace(/^(@key\s*[:：].*)$/im, '$1\n@fingering: 筒音作5');
      } else {
        result = result.replace(/^(@instrument\s*[:：].*)$/im, '$1\n@fingering: 筒音作5');
      }
    }
  } else {
    result = result.replace(/^@(?:fingering|tongyin|flute|tube|school|notation|ryu)\s*[:：].*\r?\n?/gim, '');
    const keyMatch = result.match(/^@key\s*[:：]\s*(.+)$/im);
    const keyInfo = getErhuKeyInfo(keyMatch ? keyMatch[1].trim() : 'D');
    if (/^@strings\s*[:：].*$/im.test(result)) {
      result = result.replace(/^@strings\s*[:：].*$/im, `@strings: ${keyInfo.strings}`);
    } else if (/^@key\s*[:：].*$/im.test(result)) {
      result = result.replace(/^(@key\s*[:：].*)$/im, `$1\n@strings: ${keyInfo.strings}`);
    }
  }

  return result;
}

/**
 * Set Shakuhachi tube length (@flute: 1.8尺 (D), 2.0尺 (C), etc.)
 */
export function macroSetShakuhachiLength(text: string, fluteLabel: string): string {
  const clean = fluteLabel.trim();
  if (!clean) return text;
  if (/^@(?:flute|tube|length|shaku)\s*[:：].*$/im.test(text)) {
    return text.replace(/^@(?:flute|tube|length|shaku)\s*[:：].*$/im, `@flute: ${clean}`);
  }
  if (/^@instrument\s*[:：].*$/im.test(text)) {
    return text.replace(/^(@instrument\s*[:：].*)$/im, `$1\n@flute: ${clean}`);
  }
  return `@flute: ${clean}\n${text}`;
}

/**
 * Set Shakuhachi notation school (@school: kinko | tozan)
 */
export function macroSetShakuhachiSchool(text: string, school: ShakuhachiSchool): string {
  if (/^@(?:school|notation|ryu)\s*[:：].*$/im.test(text)) {
    return text.replace(/^@(?:school|notation|ryu)\s*[:：].*$/im, `@school: ${school}`);
  }
  if (/^@(?:flute|tube|length|shaku)\s*[:：].*$/im.test(text)) {
    return text.replace(/^(@(?:flute|tube|length|shaku)\s*[:：].*)$/im, `$1\n@school: ${school}`);
  }
  if (/^@instrument\s*[:：].*$/im.test(text)) {
    return text.replace(/^(@instrument\s*[:：].*)$/im, `$1\n@school: ${school}`);
  }
  return `@school: ${school}\n${text}`;
}

/**
 * Toggle between Free Rhythm (散拍 / Honkyoku) and Metrical Rhythm (e.g. 4/4)
 */
export function macroSetRhythmMode(text: string, mode: 'free' | 'metrical'): string {
  const nextTime = mode === 'free' ? 'free' : '4/4';
  let result = text.replace(/^@rhythm\s*[:：].*\r?\n?/gim, '');
  if (/^@(?:time|meter)\s*[:：].*$/im.test(result)) {
    result = result.replace(/^@(?:time|meter)\s*[:：].*$/im, `@time: ${nextTime}`);
  } else if (/^@key\s*[:：].*$/im.test(result)) {
    result = result.replace(/^(@key\s*[:：].*)$/im, `$1\n@time: ${nextTime}`);
  } else {
    result = `@time: ${nextTime}\n${result}`;
  }
  return result;
}

/**
 * Set Dizi / Xiao fingering system (@fingering: 筒音作5, 筒音作2, 筒音作1, 筒音作6, 筒音作3)
 */
export function macroSetFingering(text: string, fingering: string): string {
  const clean = fingering.trim();
  if (!clean) return text;
  if (/^@(?:fingering|tongyin)\s*[:：].*$/im.test(text)) {
    return text.replace(/^@(?:fingering|tongyin)\s*[:：].*$/im, `@fingering: ${clean}`);
  }
  if (/^@key\s*[:：].*$/im.test(text)) {
    return text.replace(/^(@key\s*[:：].*)$/im, `$1\n@fingering: ${clean}`);
  }
  if (/^@instrument\s*[:：].*$/im.test(text)) {
    return text.replace(/^(@instrument\s*[:：].*)$/im, `$1\n@fingering: ${clean}`);
  }
  return `@fingering: ${clean}\n${text}`;
}

/**
 * Set or transpose score Key (@key and auto-update Erhu @strings when Erhu is active)
 */
export function macroSetKey(text: string, targetKey: string): string {
  const keyInfo = getErhuKeyInfo(targetKey);
  let result = text;

  if (/^@key\s*[:：].*$/im.test(result)) {
    result = result.replace(/^@key\s*[:：].*$/im, `@key: ${keyInfo.label}`);
  } else {
    result = `@key: ${keyInfo.label}\n${result}`;
  }

  const instMatch = result.match(/^@instrument\s*[:：]\s*(.+)$/im);
  const inst = instMatch ? instMatch[1].trim().toLowerCase() : 'erhu';
  if (!inst || inst.includes('erhu') || inst.includes('二胡')) {
    if (/^@strings\s*[:：].*$/im.test(result)) {
      result = result.replace(/^@strings\s*[:：].*$/im, `@strings: ${keyInfo.strings}`);
    } else {
      result = result.replace(/^(@key\s*[:：].*)$/im, `$1\n@strings: ${keyInfo.strings}`);
    }
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
 * Diatonic Scale-Degree Shift (shifts all 1-7 notes + chord pitches + octave dots)
 */
export function macroShiftScaleDegrees(text: string, steps: number): string {
  if (steps === 0) return text;
  const lines = text.split('\n');
  const shiftPitchHead = (head: string) =>
    head.replace(/([#b=]?)([0-7])([',]*)/g, (full, acc, digit, octStr) => {
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
      return `${acc}${newDeg}${newOctStr}`;
    });

  const transformed = lines.map(line => {
    const t = line.trim();
    if (!t || /^(@|S:|L:|T:|#|\/\/)/i.test(t)) return line;

    return line.replace(LINE_TOKEN_REGEX, (full, graceTok, braceTok, bracketTok, noteTok) => {
      if (bracketTok || braceTok) return full;
      if (graceTok) {
        // Shift pitches inside grace notes too
        return shiftPitchHead(graceTok);
      }
      if (!noteTok) return full;
      const parts = splitNoteOrChord(noteTok);
      if (!parts) return full;
      return `${shiftPitchHead(parts.head)}${parts.underlines}${parts.dots}${parts.tie}${parts.markings}`;
    });
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

    let cleaned = t.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\s*(:?\|\|:?|\|\]|\|:|:\||\|)\s*/g, ' $1 ');
    cleaned = cleaned.trim();
    cleaned = cleaned.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
    return cleaned;
  }).join('\n');
}
