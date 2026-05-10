import { LRLanguage, LanguageSupport, indentNodeProp, foldNodeProp, foldInside, continuedIndent } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { parseMixed } from "@lezer/common";

// A very simplified ABC notation highlighter logic using CodeMirror's StreamLanguage
// or simple regex-based highlighting if we want to avoid complex Lezer grammars.
// Since we want something quick and functional, we'll use StreamLanguage from @codemirror/language.

import { StreamLanguage, StreamParser } from "@codemirror/language";

const abcParser: StreamParser<any> = {
  token(stream) {
    if (stream.sol()) {
      // Header lines: X:, T:, M:, K:, L:, Q:, V:, etc.
      if (stream.match(/^[A-Z]:/)) {
        stream.eatWhile(/[^]/);
        return "keyword";
      }
      // Comments
      if (stream.match(/^%.*/)) {
        stream.eatWhile(/[^]/);
        return "comment";
      }
    }

    // Measure bars
    if (stream.match(/^[|:\]]+/)) {
      return "punctuation";
    }

    // Chords [C E G] or "C"
    if (stream.match(/^"[^"]*"/)) {
      return "string";
    }
    if (stream.match(/^\[[^\]]*\]/)) {
      return "atom";
    }

    // Notes and accidentals
    if (stream.match(/^[=^_]*[a-gA-G][',1-9]*/)) {
      return "variableName";
    }

    // Rests
    if (stream.match(/^[xzXZ][0-9]*/)) {
      return "number";
    }

    // Grace notes
    if (stream.match(/^{[^}]*}/)) {
      return "meta";
    }

    stream.next();
    return null;
  }
};

export const abcLanguage = StreamLanguage.define(abcParser);

export function abc() {
  return new LanguageSupport(abcLanguage);
}
