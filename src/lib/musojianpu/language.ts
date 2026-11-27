/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StreamLanguage, StreamParser, LanguageSupport } from '@codemirror/language';

const musoJianpuParser: StreamParser<unknown> = {
  token(stream) {
    if (stream.sol()) {
      // Header directives: @title:, @key:, @time:, @tempo:, etc.
      if (stream.match(/^@[a-zA-Z_]+\s*:/)) {
        return 'keyword';
      }
      // Section header line
      if (stream.match(/^S:/i)) {
        stream.eatWhile(/[^]/);
        return 'heading';
      }
      // Lyrics line
      if (stream.match(/^L:/i)) {
        stream.eatWhile(/[^]/);
        return 'string';
      }
      // Text / footnote line
      if (stream.match(/^T:/i)) {
        stream.eatWhile(/[^]/);
        return 'meta';
      }
      // Comments
      if (stream.match(/^(#|\/\/).*/)) {
        return 'comment';
      }
    }

    // Erhu markings in braces {pull,二,vib}
    if (stream.match(/^\{[^}]*\}/)) {
      return 'attributeName';
    }

    // Grace notes ^5_, ^5/, ^5//, ^/5, ^{5/6/}, or ^/{5/6/}
    if (stream.match(/^\^\/?(\{[^}]*\}|[#b=]?[1-7][',]*[_/]*)/)) {
      return 'meta';
    }

    // Volta brackets [1. [2.
    if (stream.match(/^\[\d+\./)) {
      return 'tagName';
    }

    // Barlines |, ||, |], |:, :|, :||:
    if (stream.match(/^(:?\|\|:?|\|\]|\|:|:\||\|)/)) {
      return 'punctuation';
    }

    // Slur & tuplet parentheses
    if (stream.match(/^(\d+\(|\(|\))/)) {
      return 'bracket';
    }

    // Jianpu notes with accidentals, octaves, underlines (_ or /), dots
    if (stream.match(/^[#b=]?[0-7][',]*[_/]*\.*~?/)) {
      return 'number';
    }

    // Prolongation dash
    if (stream.match(/^-/)) {
      return 'operator';
    }

    stream.next();
    return null;
  }
};

export const musoJianpuLanguage = StreamLanguage.define(musoJianpuParser);

export function musoJianpu() {
  return new LanguageSupport(musoJianpuLanguage);
}
