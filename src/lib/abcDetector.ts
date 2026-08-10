/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AbcDetectionResult {
  renderer: 'abc2svg' | 'abcjs';
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Directives and patterns specific to abcm2ps / abc2svg
 */
const ABCM2PS_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  // SVG / Postscript blocks
  { pattern: /^%%beginsvg\b/m, description: '%%beginsvg block' },
  { pattern: /^%%endsvg\b/m, description: '%%endsvg block' },
  { pattern: /^%%ps\b/m, description: '%%ps Postscript directive' },
  { pattern: /^%%endps\b/m, description: '%%endps directive' },
  { pattern: /^%%postscript\b/m, description: '%%postscript block' },

  // Text formatting blocks
  { pattern: /^%%begintext\b/m, description: '%%begintext block' },
  { pattern: /^%%endtext\b/m, description: '%%endtext block' },

  // Page layout & dimensions
  { pattern: /^%%pageheight\b/m, description: '%%pageheight layout directive' },
  { pattern: /^%%pagewidth\b/m, description: '%%pagewidth layout directive' },
  { pattern: /^%%landscape\b/m, description: '%%landscape orientation directive' },
  { pattern: /^%%topmargin\b/m, description: '%%topmargin directive' },
  { pattern: /^%%bottommargin\b/m, description: '%%bottommargin directive' },
  { pattern: /^%%leftmargin\b/m, description: '%%leftmargin directive' },
  { pattern: /^%%rightmargin\b/m, description: '%%rightmargin directive' },
  { pattern: /^%%margin\b/m, description: '%%margin directive' },

  // Staff spacing & sizing
  { pattern: /^%%staffwidth\b/m, description: '%%staffwidth layout directive' },
  { pattern: /^%%staffscale\b/m, description: '%%staffscale directive' },
  { pattern: /^%%maxstaffsep\b/m, description: '%%maxstaffsep spacing directive' },
  { pattern: /^%%sysstaffsep\b/m, description: '%%sysstaffsep spacing directive' },
  { pattern: /^%%systemstaffsep\b/m, description: '%%systemstaffsep directive' },
  { pattern: /^%%staffsep\b/m, description: '%%staffsep directive' },
  { pattern: /^%%maxsysstaffsep\b/m, description: '%%maxsysstaffsep spacing directive' },
  { pattern: /^%%indent\b/m, description: '%%indent layout directive' },
  { pattern: /^%%gutter\b/m, description: '%%gutter layout directive' },
  { pattern: /^%%scale\b/m, description: '%%scale sizing directive' },

  // Fonts & Typography
  { pattern: /^%%titleformat\b/m, description: '%%titleformat typography directive' },
  { pattern: /^%%titleleft\b/m, description: '%%titleleft alignment directive' },
  { pattern: /^%%titlename\b/m, description: '%%titlename directive' },
  { pattern: /^%%subtitlefont\b/m, description: '%%subtitlefont typography directive' },
  { pattern: /^%%composerfont\b/m, description: '%%composerfont typography directive' },
  { pattern: /^%%textfont\b/m, description: '%%textfont typography directive' },
  { pattern: /^%%partsfont\b/m, description: '%%partsfont typography directive' },
  { pattern: /^%%gchordfont\b/m, description: '%%gchordfont typography directive' },
  { pattern: /^%%vocalfont\b/m, description: '%%vocalfont typography directive' },
  { pattern: /^%%wordsfont\b/m, description: '%%wordsfont typography directive' },
  { pattern: /^%%setfont\b/m, description: '%%setfont typography directive' },

  // Staves / Score structure
  { pattern: /^%%staves\b/m, description: '%%staves multi-voice structure' },
  { pattern: /^%%score\b/m, description: '%%score multi-staff directive' },
  { pattern: /^%%map\b/m, description: '%%map percussion/voice mapping' },
  { pattern: /^%%voicescale\b/m, description: '%%voicescale directive' },
  { pattern: /^%%continueall\b/m, description: '%%continueall line wrapping directive' },
  { pattern: /^%%combinevoices\b/m, description: '%%combinevoices directive' },

  // Drawing & Vector extensions
  { pattern: /^%%drawline\b/m, description: '%%drawline vector command' },
  { pattern: /^%%drawbox\b/m, description: '%%drawbox vector command' },
  { pattern: /^%%drawellipse\b/m, description: '%%drawellipse vector command' },
  { pattern: /^%%drawcurve\b/m, description: '%%drawcurve vector command' },
  { pattern: /^%%epsf\b/m, description: '%%epsf graphics directive' },

  // Other abcm2ps directives
  { pattern: /^%%abc-version\b/m, description: '%%abc-version standard header' },
  { pattern: /^%%abc-creator\b/m, description: '%%abc-creator directive' },
  { pattern: /^%%abc-copyright\b/m, description: '%%abc-copyright directive' },
  { pattern: /^%%writefields\b/m, description: '%%writefields directive' },
  { pattern: /^%%format\b/m, description: '%%format directive' },
  { pattern: /^%%jianpu\b/m, description: '%%jianpu notation directive' },
  { pattern: /^%%multicol\b/m, description: '%%multicol layout directive' },
  { pattern: /^%%splittune\b/m, description: '%%splittune directive' },
  { pattern: /^%%repbra\b/m, description: '%%repbra repeat bracket directive' },
  { pattern: /^%%measurenum\b/m, description: '%%measurenum measure numbering directive' },
  { pattern: /^%%barbox\b/m, description: '%%barbox directive' },
  { pattern: /^%%bgcolor\b/m, description: '%%bgcolor directive' },
  { pattern: /^%%pdfmark\b/m, description: '%%pdfmark directive' },
  { pattern: /^%%capo\b/m, description: '%%capo directive' }
];

/**
 * Detects whether an ABC score uses abcm2ps directives and should be rendered
 * with `abc2svg`, or if it is standard ABC suited for `abcjs`.
 */
export function detectAbcRenderer(abcText: string): AbcDetectionResult {
  if (!abcText || typeof abcText !== 'string') {
    return {
      renderer: 'abcjs',
      reasons: ['Empty or non-string ABC content'],
      confidence: 'high'
    };
  }

  const reasons: string[] = [];

  for (const item of ABCM2PS_PATTERNS) {
    if (item.pattern.test(abcText)) {
      reasons.push(item.description);
    }
  }

  // Also check if there are multiple lines starting with %% before X: header
  const firstXMatch = abcText.match(/^X:/m);
  if (firstXMatch && firstXMatch.index !== undefined && firstXMatch.index > 0) {
    const preXHeader = abcText.substring(0, firstXMatch.index);
    const preXDirectives = preXHeader.match(/^%%[^\n]+/gm);
    if (preXDirectives && preXDirectives.length >= 2 && reasons.length === 0) {
      reasons.push(`Multiple global file directives before X: header (${preXDirectives.length} directives)`);
    }
  }

  if (reasons.length > 0) {
    return {
      renderer: 'abc2svg',
      reasons,
      confidence: reasons.length >= 2 ? 'high' : 'medium'
    };
  }

  return {
    renderer: 'abcjs',
    reasons: ['No abcm2ps directives found'],
    confidence: 'high'
  };
}
