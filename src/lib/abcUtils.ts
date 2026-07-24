/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts scientific pitch notation (e.g. E2, A2, D3, G3, B3, E4, Gb3, F#4, C4, E5)
 * into standard ABC note names (e.g. E,, A,, D, G, B, e, _G, ^f, c, e').
 * If the string is already an ABC note name or invalid format, returns trimmed string.
 */
export function toAbcNoteName(note: string): string {
  if (!note) return '';
  const trimmed = note.trim();
  const match = trimmed.match(/^([A-Ga-g])([#b]?)([1-8])$/);
  if (!match) {
    return trimmed;
  }
  const [, letter, accidental, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);

  let accPrefix = '';
  if (accidental === '#') accPrefix = '^';
  else if (accidental === 'b') accPrefix = '_';

  const uppercaseLetter = letter.toUpperCase();

  if (octave <= 1) {
    const commas = ','.repeat(2 - octave);
    return `${accPrefix}${uppercaseLetter}${commas}`;
  } else if (octave === 2) {
    return `${accPrefix}${uppercaseLetter},`;
  } else if (octave === 3) {
    return `${accPrefix}${uppercaseLetter}`;
  } else if (octave === 4) {
    return `${accPrefix}${uppercaseLetter.toLowerCase()}`;
  } else {
    const apostrophes = "'".repeat(octave - 4);
    return `${accPrefix}${uppercaseLetter.toLowerCase()}${apostrophes}`;
  }
}

/**
 * Maps input instrument name to valid abcjs tablature instrument:
 * "violin" | "mandolin" | "fiddle" | "guitar" | "fiveString" | ""
 */
export function getAbcjsTablatureInstrument(
  tab?: string
): 'violin' | 'mandolin' | 'fiddle' | 'guitar' | 'fiveString' | '' {
  if (!tab || tab === 'none') return '';
  const lower = tab.toLowerCase().trim();
  if (lower === 'guitar') return 'guitar';
  if (lower === 'ukulele' || lower === 'mandolin') return 'mandolin';
  if (lower === 'banjo' || lower === 'fivestring') return 'fiveString';
  if (lower === 'violin') return 'violin';
  if (lower === 'fiddle') return 'fiddle';
  return '';
}
