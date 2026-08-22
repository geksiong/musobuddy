/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScoreData, ScoreFormat } from '../components/Score/types.ts';
import { generateMidiForAbc } from './abcUtils.ts';
import { parseMxlFile } from './mxlUtils.ts';
import { detectChordEngine } from './chordSheetUtils.ts';

export interface LoadScoreUrlResult {
  success: boolean;
  score?: ScoreData;
  audioOnly?: { url: string; name: string };
  error?: string;
}

/**
 * Normalizes user-entered URLs (e.g. converting GitHub blob links to raw links,
 * Dropbox preview links to direct downloads, Gists to raw, etc.)
 */
export function normalizeScoreUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return '';

  // Ensure protocol
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  try {
    const parsed = new URL(url);

    // GitHub blob URL -> raw.githubusercontent.com
    // e.g. https://github.com/user/repo/blob/main/tune.abc -> https://raw.githubusercontent.com/user/repo/main/tune.abc
    if (parsed.hostname === 'github.com' && parsed.pathname.includes('/blob/')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      // parts = [owner, repo, 'blob', branch, ...rest]
      if (parts.length >= 4 && parts[2] === 'blob') {
        const owner = parts[0];
        const repo = parts[1];
        const branch = parts[3];
        const filePath = parts.slice(4).join('/');
        return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      }
    }

    // GitHub Gist -> raw link
    if (parsed.hostname === 'gist.github.com' && !parsed.pathname.endsWith('/raw')) {
      return `${url.replace(/\/$/, '')}/raw`;
    }

    // Dropbox dl=0 -> dl=1 / raw
    if (parsed.hostname.includes('dropbox.com')) {
      parsed.searchParams.set('dl', '1');
      return parsed.toString();
    }

    // Google Drive share link -> direct download export
    if (parsed.hostname === 'drive.google.com' && parsed.pathname.includes('/file/d/')) {
      const match = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }

    // TheSession.org tune page -> API json format for best reliability
    if (parsed.hostname === 'thesession.org' && /^\/tunes\/\d+(\.abc)?$/i.test(parsed.pathname)) {
      const match = parsed.pathname.match(/\/tunes\/(\d+)/i);
      if (match && match[1]) {
        return `https://thesession.org/tunes/${match[1]}?format=json`;
      }
    }

    // Pastebin -> raw
    if (parsed.hostname === 'pastebin.com' && !parsed.pathname.startsWith('/raw/')) {
      const pasteId = parsed.pathname.replace(/^\//, '');
      if (pasteId && !pasteId.includes('/')) {
        return `https://pastebin.com/raw/${pasteId}`;
      }
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Extracts a human-friendly score title and inferred file extension from a URL.
 */
export function extractUrlMetadata(url: string, customTitle?: string): { title: string; ext: string } {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'score';
    const decodedSegment = decodeURIComponent(lastSegment);

    let ext = '';
    let name = decodedSegment;

    if (decodedSegment.includes('.')) {
      const parts = decodedSegment.split('.');
      ext = parts.pop()?.toLowerCase() || '';
      name = parts.join('.');
    }

    // If name is too short or numeric or generic (e.g. "raw", "download"), fallback to segment or customTitle
    if (name.toLowerCase() === 'raw' || name.toLowerCase() === 'download' || /^\d+$/.test(name)) {
      if (segments.length > 1) {
        const prev = decodeURIComponent(segments[segments.length - 2]);
        name = `${prev} - ${name}`;
      }
    }

    const title = customTitle?.trim() || name.replace(/[-_]+/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Imported Score';
    return { title, ext };
  } catch {
    return { title: customTitle?.trim() || 'Imported Score', ext: '' };
  }
}

/**
 * Fetches a resource from a URL, automatically trying backend proxy and multiple CORS proxy fallbacks.
 */
export async function fetchWithCorsFallback(url: string): Promise<Response> {
  const errors: string[] = [];

  // 1. Try local/backend proxy endpoint first (handles user-agent and bypasses CORS seamlessly)
  try {
    const localProxyUrl = `/api/proxy-score?url=${encodeURIComponent(url)}`;
    const localRes = await fetch(localProxyUrl);
    if (localRes.ok) {
      return localRes;
    } else {
      errors.push(`Local proxy returned HTTP ${localRes.status}`);
    }
  } catch (err) {
    errors.push(`Local proxy fetch error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Try direct fetch (works if resource has open Access-Control-Allow-Origin headers or is a data URI)
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      return res;
    } else {
      errors.push(`Direct fetch returned HTTP ${res.status}`);
    }
  } catch (err) {
    errors.push(`Direct fetch error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Try proxy 1: allorigins.win
  try {
    const proxyUrl1 = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res1 = await fetch(proxyUrl1);
    if (res1.ok) {
      return res1;
    }
    errors.push(`AllOrigins proxy returned HTTP ${res1.status}`);
  } catch (err) {
    errors.push(`AllOrigins proxy error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 4. Try proxy 2: corsproxy.io
  try {
    const proxyUrl2 = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    const res2 = await fetch(proxyUrl2);
    if (res2.ok) {
      return res2;
    }
    errors.push(`CorsProxy.io returned HTTP ${res2.status}`);
  } catch (err) {
    errors.push(`CorsProxy.io error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 5. Try proxy 3: codetabs.com
  try {
    const proxyUrl3 = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
    const res3 = await fetch(proxyUrl3);
    if (res3.ok) {
      return res3;
    }
    errors.push(`CodeTabs proxy returned HTTP ${res3.status}`);
  } catch (err) {
    errors.push(`CodeTabs proxy error: ${err instanceof Error ? err.message : String(err)}`);
  }

  throw new Error(`Unable to fetch score from "${url}". ${errors.slice(0, 2).join('. ')}`);
}

/**
 * Loads and parses a score from any given URL.
 */
export async function loadScoreFromUrl(rawUrl: string, customTitle?: string): Promise<LoadScoreUrlResult> {
  const normalizedUrl = normalizeScoreUrl(rawUrl);
  if (!normalizedUrl) {
    return { success: false, error: 'Please enter a valid URL.' };
  }

  const { title: inferredTitle, ext: inferredExt } = extractUrlMetadata(normalizedUrl, customTitle);
  const id = Math.random().toString(36).substr(2, 9);

  try {
    const response = await fetchWithCorsFallback(normalizedUrl);
    const contentType = response.headers.get('content-type')?.toLowerCase() || '';

    // Check for Audio formats first
    const isAudioExt = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'mid', 'midi'].includes(inferredExt);
    const isAudioContentType = contentType.startsWith('audio/') || contentType.includes('midi');

    if (isAudioExt || isAudioContentType) {
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      return {
        success: true,
        audioOnly: {
          url: audioUrl,
          name: `${inferredTitle}.${inferredExt || 'mp3'}`
        }
      };
    }

    // Check for PDF
    if (inferredExt === 'pdf' || contentType.includes('application/pdf')) {
      const blob = await response.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(pdfBlob);

      const score: ScoreData = {
        id,
        title: inferredTitle,
        format: ScoreFormat.PDF,
        content: objectUrl,
        zoom: 1,
        pan: { x: 0, y: 0 },
        viewMode: 'scroll',
        sourceUrl: normalizedUrl
      };
      return { success: true, score };
    }

    // Check for Guitar Pro formats (.gp, .gp3, .gp4, .gp5, .gpx, .ptb)
    const isGuitarProExt = ['gp', 'gp3', 'gp4', 'gp5', 'gpx', 'ptb'].includes(inferredExt);
    if (isGuitarProExt) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const score: ScoreData = {
        id,
        title: inferredTitle,
        format: ScoreFormat.GuitarPro,
        content: objectUrl,
        zoom: 1,
        pan: { x: 0, y: 0 },
        viewMode: 'scroll',
        sourceUrl: normalizedUrl
      };
      return { success: true, score };
    }

    // Check for Compressed MusicXML (.mxl)
    if (inferredExt === 'mxl' || contentType.includes('application/vnd.recordare.musicxml')) {
      const arrayBuffer = await response.arrayBuffer();
      try {
        const xmlContent = await parseMxlFile(arrayBuffer);
        const score: ScoreData = {
          id,
          title: inferredTitle,
          format: ScoreFormat.MusicXML,
          content: xmlContent,
          isMxl: true,
          zoom: 1,
          pan: { x: 0, y: 0 },
          viewMode: 'scroll',
          sourceUrl: normalizedUrl
        };
        return { success: true, score };
      } catch (err) {
        return {
          success: false,
          error: `Failed to unpack compressed MusicXML (.mxl): ${err instanceof Error ? err.message : String(err)}`
        };
      }
    }

    // Check for Images
    const isImageExt = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(inferredExt);
    if (isImageExt || contentType.startsWith('image/')) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const score: ScoreData = {
        id,
        title: inferredTitle,
        format: ScoreFormat.Image,
        content: [objectUrl],
        zoom: 1,
        pan: { x: 0, y: 0 },
        viewMode: 'scroll',
        sourceUrl: normalizedUrl
      };
      return { success: true, score };
    }

    // Check for Text-based Scores: ABC, MusicXML, ChordSheet, Plain Text
    // Read text content
    const text = await response.text();

    // Check if response is JSON (e.g. from TheSession.org API or open tune APIs)
    if (text.trim().startsWith('{') && (text.includes('"settings"') || text.includes('"abc"') || text.includes('"name"'))) {
      try {
        const json = JSON.parse(text);
        if (json && json.name && Array.isArray(json.settings) && json.settings.length > 0) {
          const setting = json.settings[0];
          const meter = json.type === 'slip jig' ? '9/8' : json.type === 'jig' ? '6/8' : json.type === 'waltz' ? '3/4' : json.type === 'polka' ? '2/4' : '4/4';
          const finalTitle = customTitle?.trim() || json.name || inferredTitle;
          const abcText = `X:1\nT:${json.name}\nR:${json.type || ''}\nM:${meter}\nL:1/8\nK:${setting.key || 'D'}\n${setting.abc}`;
          const midiUrl = generateMidiForAbc(abcText, 0);
          return {
            success: true,
            score: {
              id,
              title: finalTitle,
              format: ScoreFormat.ABC,
              content: abcText,
              zoom: 1,
              pan: { x: 0, y: 0 },
              viewMode: 'scroll',
              showEditor: false,
              selectedTuneIndex: 0,
              audioUrl: midiUrl || undefined,
              audioName: midiUrl ? `${finalTitle}.mid` : undefined,
              sourceUrl: normalizedUrl
            }
          };
        } else if (json && json.abc) {
          const finalTitle = customTitle?.trim() || json.title || json.name || inferredTitle;
          const abcText = json.abc;
          const midiUrl = generateMidiForAbc(abcText, 0);
          return {
            success: true,
            score: {
              id,
              title: finalTitle,
              format: ScoreFormat.ABC,
              content: abcText,
              zoom: 1,
              pan: { x: 0, y: 0 },
              viewMode: 'scroll',
              showEditor: false,
              selectedTuneIndex: 0,
              audioUrl: midiUrl || undefined,
              audioName: midiUrl ? `${finalTitle}.mid` : undefined,
              sourceUrl: normalizedUrl
            }
          };
        }
      } catch (jsonErr) {
        console.warn('Attempted to parse JSON score body but failed:', jsonErr);
      }
    }

    // 1. Is it ABC notation?
    const isAbc = inferredExt === 'abc' || 
                  (/^X:\s*\d+/m.test(text) && /^[KM]:/m.test(text)) ||
                  (text.includes('X:') && text.includes('K:')) ||
                  text.includes('%%abc-version') ||
                  text.includes('%%pageheight');

    if (isAbc) {
      // Extract tune title from ABC header if available and not customTitle
      let finalTitle = inferredTitle;
      if (!customTitle) {
        const titleMatch = text.match(/^T:\s*([^\r\n]+)/m);
        if (titleMatch && titleMatch[1]) {
          finalTitle = titleMatch[1].trim();
        }
      }

      const midiUrl = generateMidiForAbc(text, 0);
      const score: ScoreData = {
        id,
        title: finalTitle,
        format: ScoreFormat.ABC,
        content: text,
        zoom: 1,
        pan: { x: 0, y: 0 },
        viewMode: 'scroll',
        showEditor: false,
        selectedTuneIndex: 0,
        audioUrl: midiUrl || undefined,
        audioName: midiUrl ? `${finalTitle}.mid` : undefined,
        sourceUrl: normalizedUrl
      };
      return { success: true, score };
    }

    // 2. Is it uncompressed MusicXML?
    const isMusicXml = inferredExt === 'xml' || 
                       inferredExt === 'musicxml' || 
                       text.includes('<score-partwise') || 
                       text.includes('<score-timewise') || 
                       text.includes('<!DOCTYPE score-partwise');

    if (isMusicXml) {
      let finalTitle = inferredTitle;
      if (!customTitle) {
        const movementMatch = text.match(/<movement-title>([^<]+)<\/movement-title>/i) || 
                              text.match(/<work-title>([^<]+)<\/work-title>/i);
        if (movementMatch && movementMatch[1]) {
          finalTitle = movementMatch[1].trim();
        }
      }

      const score: ScoreData = {
        id,
        title: finalTitle,
        format: ScoreFormat.MusicXML,
        content: text,
        isMxl: false,
        zoom: 1,
        pan: { x: 0, y: 0 },
        viewMode: 'scroll',
        sourceUrl: normalizedUrl
      };
      return { success: true, score };
    }

    // 3. Is it ChordPro / Chord Sheet?
    const isChordExt = ['pro', 'chordpro', 'chopro', 'crd', 'cho'].includes(inferredExt);
    const chordDetection = detectChordEngine(text);
    const hasChords = isChordExt || 
                      chordDetection.engine === 'chordpro' || 
                      chordDetection.engine === 'ultimateGuitar' || 
                      text.includes('{title:') || 
                      text.includes('{artist:') ||
                      /\[[A-G][b#]?(?:m|maj|min|dim|aug|sus)?[0-9]?(?:\/[A-G][b#]?)?\]/.test(text);

    if (hasChords) {
      let finalTitle = inferredTitle;
      if (!customTitle) {
        const chordTitleMatch = text.match(/\{title:\s*([^}]+)\}/i) || text.match(/\{t:\s*([^}]+)\}/i);
        if (chordTitleMatch && chordTitleMatch[1]) {
          finalTitle = chordTitleMatch[1].trim();
        }
      }

      const score: ScoreData = {
        id,
        title: finalTitle,
        format: ScoreFormat.ChordSheet,
        content: text,
        zoom: 1,
        pan: { x: 0, y: 0 },
        viewMode: 'scroll',
        chordEngine: 'auto',
        chordFormat: 'html',
        transpose: 0,
        showEditor: false,
        sourceUrl: normalizedUrl
      };
      return { success: true, score };
    }

    // 4. Fallback: Plain Text Sheet
    const score: ScoreData = {
      id,
      title: inferredTitle,
      format: ScoreFormat.Text,
      content: text,
      zoom: 1,
      pan: { x: 0, y: 0 },
      viewMode: 'scroll',
      sourceUrl: normalizedUrl
    };
    return { success: true, score };
  } catch (err) {
    console.error('Error loading score from URL:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
