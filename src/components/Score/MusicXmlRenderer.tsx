/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

interface MusicXmlRendererProps {
  xml: string;
  zoom?: number;
}

export default function MusicXmlRenderer({ xml, zoom = 1 }: MusicXmlRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!osmdRef.current) {
      osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        drawTitle: true,
        drawSubtitle: true,
        drawComposer: true,
        drawLyricist: true,
        // Responsive options
        drawingParameters: 'compacttight', // Use compact parameters
        drawPartNames: true,
        backend: 'svg',
      });
    }

    const renderXml = async () => {
      try {
        if (osmdRef.current) {
          osmdRef.current.Zoom = zoom;
        }
        await osmdRef.current?.load(xml);
        osmdRef.current?.render();
        setError(null);
      } catch (err) {
        console.error('OSMD Error:', err);
        setError('Failed to render MusicXML. Please ensure the file is valid.');
      }
    };

    renderXml();

    return () => {
      // osmd clean up if necessary (OSMD doesn't have an explicit destroy, but we can clear the container)
      if (containerRef.current) containerRef.current.innerHTML = '';
      osmdRef.current = null;
    };
  }, [xml]);

  useEffect(() => {
    if (osmdRef.current && osmdRef.current.IsReadyToRender) {
      try {
        osmdRef.current.Zoom = zoom;
        osmdRef.current.render();
      } catch (err) {
        console.warn('Failed to update OSMD zoom:', err);
      }
    }
  }, [zoom]);

  return (
    <div className="w-full flex flex-col items-center gap-4 bg-white rounded-2xl p-8 shadow-2xl min-h-[400px] overflow-x-auto">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold uppercase tracking-widest">
          {error}
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
