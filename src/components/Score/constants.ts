/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const TUNINGS: Record<string, { label: string; value: string[] }[]> = {
  guitar: [
    { label: 'Standard (EADGBE)', value: ['E,', 'A,', 'D', 'G', 'B', 'e'] },
    { label: 'Drop-D (DADGBE)', value: ['D,', 'A,', 'D', 'G', 'B', 'e'] },
    { label: 'Open-D (DADF#AD)', value: ['D,', 'A,', 'D', '^F', 'A', 'd'] },
    { label: 'Open-G (DGDGBD)', value: ['D,', 'G,', 'D', 'G', 'B', 'd'] },
    { label: 'DADGAD', value: ['D,', 'A,', 'D', 'G', 'A', 'd'] },
  ],
  ukulele: [
    { label: 'Standard (GCEA)', value: ['G,', 'C', 'E', 'A'] },
    { label: 'Standard (Low-G)', value: ['G,', 'C', 'E', 'A'] },
    { label: 'Slack-Key (GCEG)', value: ['G,', 'C', 'E', 'G'] },
    { label: 'D-Tuning (ADF#B)', value: ['A,', 'D', '^F', 'B'] },
    { label: 'Baritone (DGBE)', value: ['D', 'G', 'B', 'e'] },
    { label: 'Baritone Open G (DGBD)', value: ['D', 'G', 'B', 'd'] },
  ],
  mandolin: [
    { label: 'Standard (GDAE)', value: ['G,', 'D', 'A', 'e'] },
    { label: 'GDAD', value: ['G,', 'D', 'A', 'd'] },
  ],
  banjo: [
    { label: 'Standard (gDGBD)', value: ['G,', 'D', 'G', 'B', 'd'] },
    { label: 'Old-Time G (gDGCD)', value: ['G,', 'D', 'G', 'c', 'd'] },
    { label: 'Drop C (gCGCD)', value: ['G,', 'C', 'G', 'c', 'd'] },
    { label: 'Double C (gCGCD)', value: ['C,', 'G,', 'C', 'G', 'c'] },
    { label: 'Open D (gCGCD)', value: ['^F,', 'D', '^F', 'A', 'd'] },
  ],
  violin: [
    { label: 'Standard (GDAE)', value: ['G,', 'D', 'A', 'e'] },
  ]
};
