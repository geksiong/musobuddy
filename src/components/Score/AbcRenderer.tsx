/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as abcjs from 'abcjs';

interface Props {
  abc: string;
  responsive?: boolean;
  tuneIndex?: number;
  transpose?: number;
  tablature?: 'guitar' | 'ukulele' | 'mandolin' | 'banjo' | 'dadgad' | 'none';
  tuning?: string[];
  currentTime?: number;
}

export const AbcRenderer: React.FC<Props> = ({ 
  abc, 
  responsive = true, 
  tuneIndex = 0,
  transpose = 0,
  tablature = 'none',
  tuning = [],
  currentTime = 0
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
          startingTune: tuneIndex,
          visualTranspose: transpose,
          add_classes: true,
          staffwidth: 800,
        };

        // Prepare ABC
        let targetAbc = abc;
        
        // Filter out any lines starting with %% (directives/comments) ONLY before the first tune
        const firstXMatch = targetAbc.match(/^X:/m);
        if (firstXMatch && firstXMatch.index !== undefined) {
          const header = targetAbc.substring(0, firstXMatch.index);
          const rest = targetAbc.substring(firstXMatch.index);
          targetAbc = header.replace(/^%%[^\n]*\n?/gm, '') + rest;
        } else {
          targetAbc = targetAbc.replace(/^%%[^\n]*\n?/gm, '');
        }

        if (tablature && tablature !== 'none') {
          const instrumentName = tablature === 'dadgad' ? 'guitar' : tablature;
          const tuningStr = (tuning && tuning.length > 0) ? ` tuning=${tuning.join(',')}` : '';
          const directive = `%%tablature ${instrumentName}${tuningStr}`;
          
          // Inject directive after headers
          if (targetAbc.match(/^K:/m)) {
            targetAbc = targetAbc.replace(/^(K:[^\n]*)/m, `$1\n${directive}`);
          } else if (targetAbc.match(/^X:/m)) {
            targetAbc = targetAbc.replace(/^(X:[^\n]*)/m, `$1\n${directive}`);
          } else {
            targetAbc = `${directive}\n${targetAbc}`;
          }

          visualOptions.tablature = [{ 
            instrument: instrumentName,
            tuning: tuning && tuning.length > 0 ? tuning : undefined,
            label: 'Tab'
          }];
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

                    event.elements.forEach((group: any) => {
                      group.forEach((el: any) => {
                        el.classList.add('abcjs-highlight');
                      });
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
  }, [abc, responsive, tuneIndex, transpose, tablature, tuning]);

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
