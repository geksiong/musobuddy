/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as abcjs from 'abcjs';
import { toAbcNoteName, getAbcjsTablatureInstrument, parseAbcItems } from '../../lib/abcUtils.ts';
import { Abc2svgRenderer } from './Abc2svgRenderer.tsx';
import { detectAbcRenderer } from '../../lib/abcDetector.ts';

interface Props {
  abc: string;
  responsive?: boolean;
  tuneIndex?: number;
  transpose?: number;
  tablature?: string;
  tuning?: string[];
  currentTime?: number;
  rendererPreference?: 'auto' | 'abcjs' | 'abc2svg';
  zoom?: number;
}

export const AbcRenderer: React.FC<Props> = ({ 
  abc, 
  responsive = true, 
  tuneIndex = 0,
  transpose = 0,
  tablature = 'none',
  tuning = [],
  currentTime = 0,
  rendererPreference = 'auto',
  zoom = 1
}) => {
  const detectionResult = detectAbcRenderer(abc);
  const activeRenderer = rendererPreference && rendererPreference !== 'auto'
    ? rendererPreference
    : detectionResult.renderer;

  const items = parseAbcItems(abc);
  const selectedItem = items[Math.min(tuneIndex, items.length - 1)];

  // Pre-tune text/metadata pages (0.1, 0.2) require abc2svg engine for layout and rendering
  if (selectedItem?.type === 'prepage' || activeRenderer === 'abc2svg') {
    return (
      <Abc2svgRenderer 
        abc={abc}
        responsive={responsive}
        tuneIndex={tuneIndex}
        transpose={transpose}
        tablature={tablature}
        tuning={tuning}
        currentTime={currentTime}
        zoom={zoom}
      />
    );
  }

  return (
    <AbcjsRenderer 
      abc={abc}
      responsive={responsive}
      tuneIndex={tuneIndex}
      transpose={transpose}
      tablature={tablature}
      tuning={tuning}
      currentTime={currentTime}
      zoom={zoom}
    />
  );
};

const AbcjsRenderer: React.FC<Props> = ({ 
  abc, 
  responsive = true, 
  tuneIndex = 0,
  transpose = 0,
  tablature = 'none',
  tuning = [],
  currentTime = 0,
  zoom = 1
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  const visualObjRef = useRef<any>(null);
  const timingCallbacksRef = useRef<any>(null);

  useEffect(() => {
    if (divRef.current && abc && typeof abc === 'string') {
      try {
        // Clear previous callbacks manually if we re-render
        if (timingCallbacksRef.current) {
          try {
            timingCallbacksRef.current.stop();
          } catch (e) {
            console.warn('Failed to stop timing callbacks:', e);
          }
          timingCallbacksRef.current = null;
        }

        const visualOptions: any = {
          responsive: responsive ? 'resize' : undefined,
          paddingtop: 0,
          paddingbottom: 0,
          paddingright: 0,
          paddingleft: 0,
          startingTune: 0, // Target ABC is sliced to single tune, so index is always 0
          visualTranspose: transpose,
          add_classes: true,
          staffwidth: 800 / zoom,
          scale: zoom,
        };

        // Prepare ABC
        let targetAbc = abc;
        const items = parseAbcItems(abc);
        if (items.length > 0) {
          const selectedItem = items[Math.min(tuneIndex, items.length - 1)] || items[0];
          targetAbc = selectedItem.abc;
        }

        // abcjs does not support PostScript or raw SVG blocks.
        // Strip them completely so abcjs does not try to parse Postscript code as music notation (which causes infinite loops)
        targetAbc = targetAbc
          .replace(/%%beginps[\s\S]*?%%endps/gi, '')
          .replace(/%%beginsvg[\s\S]*?%%endsvg/gi, '')
          .replace(/^%%ps\b.*$/gm, '')
          .replace(/^%%postscript\b.*$/gm, '')
          .replace(/^%%musicfont\b.*$/gm, '');

        // Clean up any existing %%tablature directives to prevent duplicate or invalid lines
        targetAbc = targetAbc.replace(/^%%tablature[^\n]*\n?/gm, '');

        const abcjsInstrument = getAbcjsTablatureInstrument(tablature);
        const abcTuning = (tuning || []).map(toAbcNoteName).filter(Boolean);

        if (abcjsInstrument) {
          const tuningStr = abcTuning.length > 0 ? ` tuning=${abcTuning.join(',')}` : '';
          const directive = `%%tablature ${abcjsInstrument}${tuningStr}`;
          
          // Inject directive after K: or X:
          if (targetAbc.match(/^K:[^\n]*/m)) {
            targetAbc = targetAbc.replace(/^(K:[^\n]*)/m, `$1\n${directive}`);
          } else if (targetAbc.match(/^X:[^\n]*/m)) {
            targetAbc = targetAbc.replace(/^(X:[^\n]*)/m, `$1\n${directive}`);
          } else {
            targetAbc = `${directive}\n${targetAbc}`;
          }

          visualOptions.tablature = [{ 
            instrument: abcjsInstrument,
            tuning: abcTuning.length > 0 ? abcTuning : undefined,
            label: tablature + " (%T)"
          }];

          visualOptions.format = {
            tablabelfont: "Helvetica 10",
            tabnumberfont: "Helvetica 12"
          }

          visualOptions.paddingbottom = 50;
        }

        const visualObjs = abcjs.renderAbc(divRef.current, targetAbc, visualOptions);
        
        if (visualObjs && visualObjs[0]) {
          visualObjRef.current = visualObjs[0];
          
          const TimingCallbacks = (abcjs as any).TimingCallbacks || (abcjs as any).synth?.TimingCallbacks;
          
          if (TimingCallbacks && typeof TimingCallbacks === 'function') {
            try {
              timingCallbacksRef.current = new TimingCallbacks(visualObjRef.current, {
                eventCallback: (event: any) => {
                  if (event && event.elements) {
                    const highlighted = divRef.current?.querySelectorAll('.abcjs-highlight');
                    highlighted?.forEach(el => el.classList.remove('abcjs-highlight'));

                    event.elements.forEach((groupOrEl: any) => {
                      if (Array.isArray(groupOrEl)) {
                        groupOrEl.forEach((el: any) => {
                          if (el && el.classList) {
                            el.classList.add('abcjs-highlight');
                          }
                        });
                      } else if (groupOrEl && groupOrEl.classList) {
                        groupOrEl.classList.add('abcjs-highlight');
                      }
                    });
                  }
                },
                qpm: visualObjRef.current.getBeatsPerMinute?.() || 120
              });

              // Show initial highlight
              if (currentTime === 0) {
                timingCallbacksRef.current.setProgress(0);
              }
            } catch (timingErr) {
              console.warn('Failed to initialize timing callbacks:', timingErr);
            }
          }
        }
      } catch (renderErr) {
        console.error('ABC Render error:', renderErr);
      }
    }

    return () => {
      if (timingCallbacksRef.current) {
        try {
          timingCallbacksRef.current.stop();
        } catch (e) {
          console.warn('Failed to stop timing callbacks on cleanup:', e);
        }
        timingCallbacksRef.current = null;
      }
    };
  }, [abc, responsive, tuneIndex, transpose, tablature, tuning, zoom]);

  // Sync highlighting with currentTime
  useEffect(() => {
    if (timingCallbacksRef.current && typeof timingCallbacksRef.current.setProgress === 'function') {
      try {
        // TimingCallbacks setProgress can take milliseconds if specified
        timingCallbacksRef.current.setProgress(currentTime * 1000, "milliseconds");
      } catch (e) {
        // Just ignore if it fails to avoid uncaught errors
        console.warn('Failed to set progress:', e);
      }
    }
  }, [currentTime]);

  return (
    <div className="w-full relative">
      <style>{`
        .abcjs-highlight {
          fill: #f97316 !important;
          stroke: #f97316 !important;
          opacity: 1 !important;
        }
        .abcjs-highlight path {
          fill: #f97316 !important;
          stroke: #f97316 !important;
        }
        .abcjs-highlight text {
          fill: #f97316 !important;
          stroke: none !important;
        }
        /* Target common abcjs element classes */
        svg .abcjs-note.abcjs-highlight path,
        svg .abcjs-beam.abcjs-highlight path,
        svg .abcjs-slur.abcjs-highlight path,
        svg .abcjs-tab-note.abcjs-highlight text,
        svg .abcjs-highlight path {
          fill: #f97316 !important;
          stroke: #f97316 !important;
        }
        /* Ensure everything in a highlight group is orange */
        .abcjs-highlight * {
          fill: #f97316 !important;
        }
      `}</style>
      <div ref={divRef} className="w-full" />
    </div>
  );
};
