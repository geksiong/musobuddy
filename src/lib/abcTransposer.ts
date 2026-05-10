/**
 * A basic ABC transposition utility.
 * Shifts notes in an ABC string up or down by semitones.
 */

// Map note name to index (0-11)
// Note name to index (0-11)
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

// Key signature accidental maps
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

// Map minor keys to their relative major for pitch lookup
const MINOR_TO_MAJOR: Record<string, string> = {
  'Am': 'C', 'Em': 'G', 'Bm': 'D', 'F#m': 'A', 'C#m': 'E', 'G#m': 'B', 'D#m': 'F#', 'A#m': 'C#',
  'Dm': 'F', 'Gm': 'Bb', 'Cm': 'Eb', 'Fm': 'Ab', 'Bbm': 'Db', 'Ebm': 'Gb', 'Abm': 'Cb'
};

// Note maps for preferred naming conventions
const SHARP_MAP = ['C', '^C', 'D', '^D', 'E', 'F', '^F', 'G', '^G', 'A', '^A', 'B'];
const FLAT_MAP = ['C', '_D', 'D', '_E', 'E', 'F', '_G', 'G', '_A', 'A', '_B', 'B'];

function normalizeKey(key: string): string {
  if (!key) return 'C';
  let k = key.charAt(0).toUpperCase();
  if (key.length > 1) {
    const acc = key.charAt(1);
    // Handle sharps and flats
    if (acc === '#' || acc === 'b') {
      k += acc;
    }
    // Detect minor keys
    const rest = key.substring(k.length).toLowerCase();
    if (rest.includes('m') || rest.includes('min')) {
      k += 'm';
    }
  }
  return k;
}

export function transposeAbc(abc: string, semitones: number): string {
  if (semitones === 0) return abc;

  let currentSourceKey = 'C';
  const initialKeyMatch = abc.match(/^K:\s*([A-G][#b]?m?)/m);
  if (initialKeyMatch) currentSourceKey = normalizeKey(initialKeyMatch[1]);

  return abc.split('\n').map(line => {
    if (line.trim().startsWith('%')) return line;
    if (line.match(/^[A-JL-Za-z]:/) && !line.startsWith('K:')) return line;

    if (line.startsWith('K:')) {
      const oldKeyLine = line;
      const newKeyLine = transposeKey(line, semitones);
      const keyMatch = oldKeyLine.match(/K:\s*([A-G][#b]?m?)/i);
      if (keyMatch) currentSourceKey = normalizeKey(keyMatch[1]);
      return newKeyLine;
    }

    const targetKey = normalizeKey(transposeKey(`K:${currentSourceKey}`, semitones).replace('K:', ''));
    const lookupKey = targetKey.endsWith('m') ? (MINOR_TO_MAJOR[targetKey] || 'C') : targetKey;
    
    // Choose naming map based on target key
    const useFlats = FLAT_KEYS[lookupKey] !== undefined || lookupKey === 'F';
    const namingMap = useFlats ? FLAT_MAP : SHARP_MAP;

    return line.replace(/([=^_]*)([a-gA-G])([',]*)/g, (fullMatch, accidental, note, octaves) => {
      if (!note) return fullMatch;

      const isUpper = note === note.toUpperCase();
      const baseNote = note.toUpperCase();
      const lookupSourceKey = currentSourceKey.endsWith('m') ? (MINOR_TO_MAJOR[currentSourceKey] || 'C') : currentSourceKey;
      
      let pitchIndex = noteToIndex[baseNote];
      if (pitchIndex === undefined) return fullMatch;

      // Apply source key signature
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
      
      if (newAccidental === '^' && targetSharps.includes(newBaseNote.toUpperCase())) {
        newAccidental = '';
      } else if (newAccidental === '_' && targetFlats.includes(newBaseNote.toUpperCase())) {
        newAccidental = '';
      } else if (newAccidental === '' && (targetSharps.includes(newBaseNote.toUpperCase()) || targetFlats.includes(newBaseNote.toUpperCase()))) {
        newAccidental = '=';
      }

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
  }).join('\n');
}

function transposeKey(kLine: string, semitones: number): string {
  // Regex captures the tonic and everything else (mode, etc.)
  return kLine.replace(/K:\s*([A-G][#b]?)(.*)/i, (match, key, rest) => {
    // Normalize key string for lookup in noteToIndex
    const tonic = key.charAt(0).toUpperCase();
    const accidental = key.length > 1 ? key.charAt(1).toUpperCase() : '';
    const finalLookup = tonic + accidental;

    let index = noteToIndex[finalLookup];
    if (index === undefined) return match;

    let newIndex = (index + semitones) % 12;
    if (newIndex < 0) newIndex += 12;
    
    // Standard major keys choice (common circle of fifths preference)
    const majorKeys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const newKey = majorKeys[newIndex];
    
    if (!newKey) return match; // Safety
    
    return `K:${newKey}${rest}`;
  });
}
