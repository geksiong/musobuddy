/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authentic Calligraphic Guqin Jianzipu (古琴减字谱) Renderer.
 * Powered by the open-source JianZiPu OpenType font (JianZiPu.ttf, SIL Open Font
 * License 1.1, by Nancy Yi Liang / Nellodee LLC, derived from TW-Kai calligraphy).
 *
 * Every component radical—including the true abbreviated 泛音 harmonic canopy,
 * 散, 绰/注 approach marks, 撮/反撮 chords, hui numerals, and left/right fingerings—
 * is shaped natively via OpenType GSUB/GPOS tables in one unified brush typeface
 * and one unified ink color.
 */

import React, { useMemo } from 'react';
import { GuqinJianzi } from '../../lib/musojianpu/types.ts';
import {
  describeGuqinJianzi,
  encodeGuqinJianziToJzpFont
} from '../../lib/musojianpu/guqin.ts';
import { cn } from '../../lib/utils.ts';

export interface GuqinJianziGlyphProps {
  jianzi: GuqinJianzi;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  accentClass?: string;
  inkClass?: string;
  className?: string;
}

export function GuqinJianziGlyph({
  jianzi,
  size = 'md',
  orientation = 'horizontal',
  inkClass,
  className
}: GuqinJianziGlyphProps) {
  const encoded = useMemo(() => encodeGuqinJianziToJzpFont(jianzi), [jianzi]);
  const tooltip = useMemo(() => describeGuqinJianzi(jianzi), [jianzi]);

  const isHarmonic = jianzi.soundType === 'fan';
  const isVertical = orientation === 'vertical';

  // Calibrated typographic scales for JianZiPu.ttf (never bold — weight 400 strictly)
  const coreSizeClass =
    size === 'sm'
      ? 'text-[31px]'
      : size === 'lg'
        ? 'text-[48px]'
        : 'text-[39px]';

  const modifierSizeClass =
    size === 'sm'
      ? 'text-[21px]'
      : size === 'lg'
        ? 'text-[32px]'
        : 'text-[26px]';

  // Pure standalone action/boundary glyph (e.g. {泛起}, {泛止}, {上七六})
  if (!encoded.coreWord && (encoded.preWords.length > 0 || encoded.postWords.length > 0)) {
    const words = [...encoded.preWords, ...encoded.postWords];
    return (
      <span
        title={tooltip}
        aria-label={tooltip}
        className={cn(
          'inline-flex items-center justify-center select-none',
          isVertical ? 'flex-col gap-[2px]' : 'flex-row gap-[1px]',
          inkClass,
          className
        )}
      >
        {words.map((word, idx) => (
          <span
            key={`solo-${idx}`}
            className={cn('jzp-glyph', modifierSizeClass)}
          >
            {word}
          </span>
        ))}
      </span>
    );
  }

  // Traditional Vertical Scroll Layout (乌丝栏直排): preWords -> core -> postWords stacked top-to-bottom
  if (isVertical) {
    return (
      <span
        title={tooltip}
        aria-label={tooltip}
        className={cn(
          'inline-flex flex-col items-center justify-center select-none',
          inkClass,
          className
        )}
      >
        {encoded.preWords.map((word, idx) => (
          <span
            key={`pre-${idx}`}
            className={cn('jzp-glyph opacity-85 mb-[1px]', modifierSizeClass)}
          >
            {word}
          </span>
        ))}
        {encoded.coreWord && (
          <span
            className={cn(
              'jzp-glyph',
              coreSizeClass,
              isHarmonic && 'pt-[0.22em]'
            )}
          >
            {encoded.coreWord}
          </span>
        )}
        {encoded.postWords.map((word, idx) => (
          <span
            key={`post-${idx}`}
            className={cn('jzp-glyph opacity-90 mt-[1px]', modifierSizeClass)}
          >
            {word}
          </span>
        ))}
      </span>
    );
  }

  // Horizontal Layout (Dual-line Jianpu+Jianzipu & Pure Horizontal):
  // Conservatory standard: 泛起 precedes on the left, core Jianzi centered at full size,
  // and post-attack actions (吟, 猱, 上七六, 下九, 泛止) sit slightly smaller to the lower-right.
  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        'inline-flex items-end justify-center select-none',
        inkClass,
        className
      )}
    >
      {encoded.preWords.map((word, idx) => (
        <span
          key={`pre-${idx}`}
          className={cn('jzp-glyph opacity-85 pb-[2px] -mr-[2px]', modifierSizeClass)}
        >
          {word}
        </span>
      ))}
      {encoded.coreWord && (
        <span
          className={cn(
            'jzp-glyph',
            coreSizeClass,
            isHarmonic && 'pt-[0.22em]'
          )}
        >
          {encoded.coreWord}
        </span>
      )}
      {encoded.postWords.map((word, idx) => (
        <span
          key={`post-${idx}`}
          className={cn('jzp-glyph opacity-90 pb-[1px] -ml-[2px]', modifierSizeClass)}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
