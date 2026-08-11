/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import abc2svgScript from 'abc2svg/abc2svg-1.js?raw';
import page1Script from 'abc2svg/page-1.js?raw';
import jianpu1Script from 'abc2svg/jianpu-1.js?raw';
import strtab1Script from 'abc2svg/strtab-1.js?raw';
import grid1Script from 'abc2svg/grid-1.js?raw';
import chord1Script from 'abc2svg/chord-1.js?raw';
import ambitus1Script from 'abc2svg/ambitus-1.js?raw';
import capo1Script from 'abc2svg/capo-1.js?raw';
import perc1Script from 'abc2svg/perc-1.js?raw';
import pedline1Script from 'abc2svg/pedline-1.js?raw';
import psvg1Script from 'abc2svg/psvg-1.js?raw';
import roman1Script from 'abc2svg/roman-1.js?raw';
import nns1Script from 'abc2svg/nns-1.js?raw';
import { parseAbcItems } from '../../lib/abcUtils.ts';

interface Props {
  abc: string;
  responsive?: boolean;
  tuneIndex?: number;
  transpose?: number;
  tablature?: string;
  tuning?: string[];
  currentTime?: number;
  zoom?: number;
}

let isEngineInitialized = false;

function ensureAbc2svgEngine() {
  if (typeof window === 'undefined') return;
  if (isEngineInitialized && (window as any).abc2svg?.Abc) return;

  try {
    if (!(window as any).user) {
      (window as any).user = {
        img_out: () => {},
        errmsg: () => {},
        read_file: () => ''
      };
    }

    // Evaluate abc2svg core script and attach abc2svg to global scope
    const initFn = new Function('window', 'globalThis', `
      ${abc2svgScript};
      if (typeof abc2svg !== 'undefined') {
        window.abc2svg = abc2svg;
        globalThis.abc2svg = abc2svg;
      }
    `);
    initFn(window, window);

    // Evaluate extension modules for directives like %%page, %%jianpu, %%tab, %%grid, etc.
    const modules = [
      page1Script,
      jianpu1Script,
      strtab1Script,
      grid1Script,
      chord1Script,
      ambitus1Script,
      capo1Script,
      perc1Script,
      pedline1Script,
      psvg1Script,
      roman1Script,
      nns1Script
    ];

    for (const modScript of modules) {
      if (modScript) {
        try {
          const modFn = new Function('window', 'globalThis', `
            var user = window.user;
            ${modScript}
          `);
          modFn(window, window);
        } catch (modErr) {
          console.warn('Failed to load an abc2svg module:', modErr);
        }
      }
    }

    isEngineInitialized = true;
  } catch (err) {
    console.error('Failed to initialize abc2svg engine:', err);
  }
}

export const Abc2svgRenderer: React.FC<Props> = ({
  abc,
  responsive = true,
  tuneIndex = 0,
  transpose = 0,
  tablature = 'none',
  tuning = [],
  currentTime = 0,
  zoom = 1
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderErrors, setRenderErrors] = useState<string[]>([]);
  const [svgHtml, setSvgHtml] = useState<string>('');

  useEffect(() => {
    ensureAbc2svgEngine();

    if (!abc || typeof abc !== 'string') {
      setSvgHtml('');
      setRenderErrors([]);
      return;
    }

    try {
      if (!(window as any).abc2svg || !(window as any).abc2svg.Abc) {
        throw new Error('abc2svg engine is not available');
      }

      let targetAbc = abc;

      // Extract specific item (prepage or tune) based on tuneIndex
      const items = parseAbcItems(abc);
      if (items.length > 0) {
        const selectedItem = items[Math.min(tuneIndex, items.length - 1)] || items[0];
        targetAbc = selectedItem.abc;
      }

      // Add transpose directive if needed
      if (transpose !== 0) {
        if (targetAbc.match(/^K:[^\n]*/m)) {
          targetAbc = targetAbc.replace(/^(K:[^\n]*)/m, `$1\n%%transpose ${transpose}`);
        } else if (targetAbc.match(/^X:[^\n]*/m)) {
          targetAbc = targetAbc.replace(/^(X:[^\n]*)/m, `$1\n%%transpose ${transpose}`);
        } else {
          targetAbc = `%%transpose ${transpose}\n${targetAbc}`;
        }
      }

      // Apply zoom scale if zoom !== 1 or if scale is specified
      if (zoom !== 1) {
        if (/^\s*%%scale\b/m.test(targetAbc)) {
          targetAbc = targetAbc.replace(/^(\s*%%scale\s+)([\d.]+)/m, (_, prefix, val) => {
            const origScale = parseFloat(val) || 0.75;
            return `${prefix}${(origScale * zoom).toFixed(3)}`;
          });
        } else {
          targetAbc = `%%scale ${(0.75 * zoom).toFixed(3)}\n${targetAbc}`;
        }
      }

      // Inject tight top/bottom margin & spacing defaults for digital screen rendering unless explicitly defined
      let defaultDirectives = '';
      if (!/^\s*%%topmargin\b/m.test(targetAbc)) {
        defaultDirectives += '%%topmargin 0cm\n';
      }
      if (!/^\s*%%topspace\b/m.test(targetAbc)) {
        defaultDirectives += '%%topspace 0\n';
      }
      if (!/^\s*%%botmargin\b/m.test(targetAbc)) {
        defaultDirectives += '%%botmargin 0cm\n';
      }
      if (defaultDirectives) {
        targetAbc = `${defaultDirectives}${targetAbc}`;
      }

      let generatedSvg = '';
      const errors: string[] = [];

      const userCallbacks = {
        img_out: (str: string) => {
          generatedSvg += str;
        },
        errmsg: (msg: string, line: number, col: number) => {
          errors.push(`Line ${line}:${col} - ${msg}`);
        },
        read_file: () => ''
      };

      (window as any).user = userCallbacks;
      const abcEngine = new (window as any).abc2svg.Abc(userCallbacks);
      abcEngine.tosvg('score.abc', targetAbc);

      setSvgHtml(generatedSvg);
      setRenderErrors(errors);
    } catch (err: any) {
      console.error('Abc2svg rendering error:', err);
      setRenderErrors([err?.message || 'Unknown abc2svg rendering error']);
    }
  }, [abc, tuneIndex, transpose, responsive, zoom]);

  return (
    <div className="w-full relative flex flex-col items-center">
      <style>{`
        .abc2svg-container {
          width: 100%;
        }
        .abc2svg-container .nobrk {
          width: 100%;
        }
        .abc2svg-container svg {
          display: block;
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          margin: 0 auto;
        }
        /* Ensure dark mode contrast when embedded */
        .dark .abc2svg-container svg text {
          fill: currentColor;
        }
        .dark .abc2svg-container svg path,
        .dark .abc2svg-container svg rect {
          stroke: currentColor;
        }
      `}</style>

      {renderErrors.length > 0 && (
        <div className="w-full mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono">
          <div className="font-bold uppercase mb-1 text-[10px] tracking-wider">abc2svg Parser Diagnostics:</div>
          <ul className="list-disc list-inside space-y-0.5">
            {renderErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div 
        ref={containerRef}
        className="abc2svg-container w-full overflow-x-auto flex flex-col items-center"
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
    </div>
  );
};
