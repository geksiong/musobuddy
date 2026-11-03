/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cn } from '../../lib/utils.ts';
import { formatChordName } from './constants.ts';

export interface FormattedChordParts {
  isParenthesized: boolean;
  root: string;
  type: string;
  bass?: string;
  isSpecial: boolean;
}

/**
 * Parses a chord string into its root note, quality/color type, and optional bass note.
 * Examples:
 *   "Cmaj7" -> root: "C", type: "maj7"
 *   "F#m7b5" -> root: "F♯", type: "m7♭5"
 *   "Bb7/D" -> root: "B♭", type: "7", bass: "D"
 *   "C/E" -> root: "C", type: "", bass: "E"
 *   "(Am7)" -> isParenthesized: true, root: "A", type: "m7"
 */
export function splitChordParts(chordName: string): FormattedChordParts {
  if (!chordName || typeof chordName !== 'string') {
    return { isParenthesized: false, root: '', type: '', isSpecial: true };
  }

  let cleaned = chordName.trim();
  if (!cleaned) {
    return { isParenthesized: false, root: '', type: '', isSpecial: true };
  }

  // Check if surrounded by parentheses, e.g. "(Cmaj7)" or "(G)"
  let isParenthesized = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isParenthesized = true;
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Non-chord symbols / rhythm notation
  if (cleaned === '—' || cleaned === '–' || cleaned === '-' || cleaned === '/' || cleaned === '•' || cleaned === '...') {
    return { isParenthesized, root: cleaned, type: '', isSpecial: true };
  }

  // Match root note: note letter A-G followed by optional accidentals
  // Accidentals can be: #, ♯, b, ♭, ##, 𝄪, x, bb, 𝄫
  const rootMatch = cleaned.match(/^([A-G](?:##|𝄪|x|bb|𝄫|#|♯|b|♭)?)(.*)$/i);
  if (!rootMatch) {
    return { isParenthesized, root: formatChordName(cleaned), type: '', isSpecial: true };
  }

  const rawRoot = rootMatch[1];
  const rest = rootMatch[2] || '';

  // Check for slash bass at the end, e.g. "maj7/E" or "/G" or "m7b5/Db"
  let typePart = rest;
  let bassPart: string | undefined = undefined;

  const slashIdx = rest.lastIndexOf('/');
  if (slashIdx !== -1) {
    const potentialBass = rest.substring(slashIdx + 1);
    // Verify bass is a musical note A-G with optional accidental
    if (/^[A-G](?:##|𝄪|x|bb|𝄫|#|♯|b|♭)?$/i.test(potentialBass)) {
      typePart = rest.substring(0, slashIdx);
      bassPart = potentialBass;
    }
  }

  return {
    isParenthesized,
    root: formatChordName(rawRoot),
    type: formatChordName(typePart),
    bass: bassPart ? formatChordName(bassPart) : undefined,
    isSpecial: false,
  };
}

export interface FormattedChordProps {
  chord: string | null | undefined;
  className?: string;
  rootClassName?: string;
  typeClassName?: string;
  bassClassName?: string;
  fallback?: string;
}

/**
 * Standard Lead-Sheet / Real Book Chord Display Component.
 * Renders the chord root prominently while making the chord type/color part
 * slightly smaller (0.74em) for crystal-clear readability and scanability.
 */
export const FormattedChord: React.FC<FormattedChordProps> = ({
  chord,
  className,
  rootClassName,
  typeClassName,
  bassClassName,
  fallback = '—',
}) => {
  if (!chord) {
    return <span className={className}>{fallback}</span>;
  }

  const parts = splitChordParts(chord);

  if (parts.isSpecial) {
    return (
      <span className={className}>
        {parts.isParenthesized ? `(${parts.root})` : parts.root}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-baseline justify-center font-mono leading-none select-none", className)}>
      {parts.isParenthesized && <span className="opacity-60 text-[0.8em] mr-0.5">(</span>}
      <span className={cn("font-black tracking-tight", rootClassName)}>
        {parts.root}
      </span>
      {parts.type && (
        <span
          className={cn(
            "text-[0.74em] font-bold tracking-normal opacity-90 ml-0.5 transform-gpu",
            typeClassName
          )}
        >
          {parts.type}
        </span>
      )}
      {parts.bass && (
        <span
          className={cn(
            "text-[0.72em] font-semibold opacity-85 ml-0.5",
            bassClassName
          )}
        >
          /{parts.bass}
        </span>
      )}
      {parts.isParenthesized && <span className="opacity-60 text-[0.8em] ml-0.5">)</span>}
    </span>
  );
};

export default FormattedChord;
