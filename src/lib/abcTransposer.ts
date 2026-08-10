/**
 * A robust ABC transposition utility.
 * Shifts notes and chord symbols in an ABC string up or down by semitones,
 * while preserving directives, dynamic expressions, decorations, inline fields,
 * text annotations, and comments without token placeholder corruption.
 */

const noteToIndex: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'DB': 1,
  'D': 2,
  'D#': 3, 'EB': 3,
  'E': 4, 'FB': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'GB': 6,
  'G': 7,
  'G#': 8, 'AB': 8,
  'A': 9,
  'A#': 10, 'BB': 10,
  'B': 11, 'CB': 11
};

const SHARP_KEYS: Record<string, string[]> = {
  'G': ['F'],
  'D': ['F', 'C'],
  'A': ['F', 'C', 'G'],
  'E': ['F', 'C', 'G', 'D'],
  'B': ['F', 'C', 'G', 'D', 'A'],
  'F#': ['F', 'C', 'G', 'D', 'A', 'E'],
  'C#': ['F', 'C', 'G', 'D', 'A', 'E', 'B'],
};

const FLAT_KEYS: Record<string, string[]> = {
  'F': ['B'],
  'Bb': ['B', 'E'],
  'Eb': ['B', 'E', 'A'],
  'Ab': ['B', 'E', 'A', 'D'],
  'Db': ['B', 'E', 'A', 'D', 'G'],
  'Gb': ['B', 'E', 'A', 'D', 'G', 'C'],
  'Cb': ['B', 'E', 'A', 'D', 'G', 'C', 'F'],
};

const MINOR_TO_MAJOR: Record<string, string> = {
  'Am': 'C', 'Em': 'G', 'Bm': 'D', 'F#m': 'A', 'C#m': 'E', 'G#m': 'B', 'D#m': 'F#', 'A#m': 'C#',
  'Dm': 'F', 'Gm': 'Bb', 'Cm': 'Eb', 'Fm': 'Ab', 'Bbm': 'Db', 'Ebm': 'Gb', 'Abm': 'Cb'
};

const SHARP_MAP = ['C', '^C', 'D', '^D', 'E', 'F', '^F', 'G', '^G', 'A', '^A', 'B'];
const FLAT_MAP = ['C', '_D', 'D', '_E', 'E', 'F', '_G', 'G', '_A', 'A', '_B', 'B'];

const TOKEN_START = '\uE000';
const TOKEN_END = '\uE001';

function normalizeKey(key: string): string {
  if (!key) return 'C';
  let k = key.charAt(0).toUpperCase();
  if (key.length > 1) {
    const acc = key.charAt(1);
    if (acc === '#' || acc === 'b') k += acc;
    const rest = key.substring(k.length).toLowerCase();
    if (rest.includes('m') || rest.includes('min')) k += 'm';
  }
  return k;
}

function transposeChordRoot(rootStr: string, semitones: number, useFlats: boolean): string {
  const norm = rootStr.charAt(0).toUpperCase() + (rootStr.length > 1 ? (rootStr.charAt(1) === '#' ? '#' : 'B') : '');
  let idx = noteToIndex[norm];
  if (idx === undefined) return rootStr;
  let newIdx = (idx + semitones) % 12;
  if (newIdx < 0) newIdx += 12;
  const sharpChords = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const flatChords = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  return useFlats ? flatChords[newIdx] : sharpChords[newIdx];
}

function transposeChordSymbol(chordContent: string, semitones: number, useFlats: boolean): string | null {
  const prefixMatch = chordContent.match(/^([\^_<>@])?(.*)$/);
  const prefix = prefixMatch ? (prefixMatch[1] || '') : '';
  const body = prefixMatch ? prefixMatch[2] : chordContent;

  const chordRegex = /^([A-G][#b♭♯]?)(m|min|minor|maj|dim|aug|sus[24]?|add[0-9]*|M|[0-9]|-|\+|=|Δ|°|o|ø)*(?:\/([A-G][#b♭♯]?))?$/i;
  const match = body.trim().match(chordRegex);
  if (!match) return null; // Not a chord symbol

  const root = match[1];
  const type = match[2] || '';
  const bass = match[3];

  const newRoot = transposeChordRoot(root, semitones, useFlats);
  const newBass = bass ? '/' + transposeChordRoot(bass, semitones, useFlats) : '';
  return `"${prefix}${newRoot}${type}${newBass}"`;
}

function transposeKey(kLine: string, semitones: number): string {
  return kLine.replace(/K:\s*([A-G][#b]?)(.*)/i, (match, key, rest) => {
    const tonic = key.charAt(0).toUpperCase();
    const accidental = key.length > 1 ? key.charAt(1).toUpperCase() : '';
    const finalLookup = tonic + accidental;

    let index = noteToIndex[finalLookup];
    if (index === undefined) return match;

    let newIndex = (index + semitones) % 12;
    if (newIndex < 0) newIndex += 12;
    
    const majorKeys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const newKey = majorKeys[newIndex];
    
    if (!newKey) return match;
    
    return `K:${newKey}${rest}`;
  });
}

export function transposeAbc(abc: string, semitones: number): string {
  if (semitones === 0) return abc;

  let currentSourceKey = 'C';
  const initialKeyMatch = abc.match(/^K:\s*([A-G][#b]?m?)/m);
  if (initialKeyMatch) currentSourceKey = normalizeKey(initialKeyMatch[1]);

  return abc.split('\n').map(line => {
    const trimmed = line.trim();
    // Ignore pure comment lines or directive lines starting with % (e.g. %%jianpu 1, %%scale)
    if (trimmed.startsWith('%')) return line;
    // Ignore header field lines like T:, M:, L:, V:, Q:, P:, I:, etc. (except K:)
    if (trimmed.match(/^[A-JL-Za-z]:/) && !trimmed.match(/^K:/i)) return line;

    // Handle K: header lines
    if (trimmed.match(/^K:/i)) {
      const oldKeyLine = line;
      const newKeyLine = transposeKey(line, semitones);
      const keyMatch = oldKeyLine.match(/K:\s*([A-G][#b]?m?)/i);
      if (keyMatch) currentSourceKey = normalizeKey(keyMatch[1]);
      return newKeyLine;
    }

    // Separate inline comment starting with % from music content
    let commentPart = '';
    let musicPart = line;
    const percentIdx = line.indexOf('%');
    if (percentIdx !== -1) {
      musicPart = line.substring(0, percentIdx);
      commentPart = line.substring(percentIdx);
    }

    const tokens: string[] = [];
    const addToken = (str: string) => {
      const placeholder = `${TOKEN_START}${tokens.length}${TOKEN_END}`;
      tokens.push(str);
      return placeholder;
    };

    // 1. Protect inline fields [X: ...] except [K: ...]
    musicPart = musicPart.replace(/\[([A-Za-z]):([^\]]*)\]/g, (match, fieldLetter, fieldBody) => {
      if (fieldLetter.toUpperCase() === 'K') {
        const transposedK = transposeKey(`K:${fieldBody}`, semitones).replace(/^K:/i, '');
        const keyMatch = fieldBody.match(/([A-G][#b]?m?)/i);
        if (keyMatch) currentSourceKey = normalizeKey(keyMatch[1]);
        return `[K:${transposedK}]`;
      }
      return addToken(match);
    });

    // 2. Protect exclamation / plus decorations & dynamics !...! and +...+
    musicPart = musicPart.replace(/![^!\n]*!|\+[^\+\n]*\+/g, (match) => {
      return addToken(match);
    });

    // Determine target key naming preference (sharps vs flats)
    const targetKey = normalizeKey(transposeKey(`K:${currentSourceKey}`, semitones).replace('K:', ''));
    const lookupKey = targetKey.endsWith('m') ? (MINOR_TO_MAJOR[targetKey] || 'C') : targetKey;
    const useFlats = FLAT_KEYS[lookupKey] !== undefined || lookupKey === 'F';

    // 3. Handle double quotes "..." (transpose chord symbols AND protect them, protect text annotations)
    musicPart = musicPart.replace(/"([^"\n]*)"/g, (match, content) => {
      const transposedChord = transposeChordSymbol(content, semitones, useFlats);
      if (transposedChord) {
        return addToken(transposedChord);
      }
      return addToken(match);
    });

    // 4. Transpose remaining musical notes
    const namingMap = useFlats ? FLAT_MAP : SHARP_MAP;
    const lookupSourceKey = currentSourceKey.endsWith('m') ? (MINOR_TO_MAJOR[currentSourceKey] || 'C') : currentSourceKey;

    musicPart = musicPart.replace(/([=^_]*)([a-gA-G])([',]*)/g, (fullMatch, accidental, note, octaves) => {
      if (!note) return fullMatch;

      const isUpper = note === note.toUpperCase();
      const baseNote = note.toUpperCase();
      
      let pitchIndex = noteToIndex[baseNote];
      if (pitchIndex === undefined) return fullMatch;

      if (!accidental) {
        if (SHARP_KEYS[lookupSourceKey]?.includes(baseNote)) pitchIndex += 1;
        else if (FLAT_KEYS[lookupSourceKey]?.includes(baseNote)) pitchIndex -= 1;
      } else if (accidental !== '=') {
        if (accidental.includes('^')) pitchIndex += accidental.split('^').length - 1;
        if (accidental.includes('_')) pitchIndex -= accidental.split('_').length - 1;
      }

      let octaveShift = isUpper ? 1 : 2;
      if (octaves) {
        if (octaves.includes(',')) octaveShift -= octaves.length;
        if (octaves.includes("'")) octaveShift += octaves.length;
      }

      const absolutePitch = pitchIndex + (octaveShift * 12) + semitones;
      let newPitchIndex = absolutePitch % 12;
      let newOctaveIndex = Math.floor(absolutePitch / 12);
      if (newPitchIndex < 0) {
        newPitchIndex += 12;
        newOctaveIndex -= 1;
      }

      const namedNote = namingMap[newPitchIndex];
      let newAccidental = '';
      let newBaseNote = namedNote;
      if (namedNote.startsWith('^') || namedNote.startsWith('_') || namedNote.startsWith('=')) {
        newAccidental = namedNote.charAt(0);
        newBaseNote = namedNote.substring(1);
      }

      const targetFlats = FLAT_KEYS[lookupKey] || [];
      const targetSharps = SHARP_KEYS[lookupKey] || [];
      if (newAccidental === '^' && targetSharps.includes(newBaseNote.toUpperCase())) newAccidental = '';
      else if (newAccidental === '_' && targetFlats.includes(newBaseNote.toUpperCase())) newAccidental = '';
      else if (newAccidental === '' && (targetSharps.includes(newBaseNote.toUpperCase()) || targetFlats.includes(newBaseNote.toUpperCase()))) newAccidental = '=';

      let resultNote = '';
      let resultOctaves = '';
      if (newOctaveIndex <= 1) {
        resultNote = newBaseNote.toUpperCase();
        const commaCount = 1 - newOctaveIndex;
        if (commaCount > 0) resultOctaves = ','.repeat(commaCount);
      } else {
        resultNote = newBaseNote.toLowerCase();
        const primeCount = newOctaveIndex - 2;
        if (primeCount > 0) resultOctaves = "'".repeat(primeCount);
      }

      return `${newAccidental}${resultNote}${resultOctaves}`;
    });

    // 5. Restore protected tokens
    musicPart = musicPart.replace(/\uE000(\d+)\uE001/g, (_, id) => tokens[Number(id)]);

    return musicPart + commentPart;
  }).join('\n');
}
