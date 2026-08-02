/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';

/**
 * Parses a compressed MusicXML (.mxl) file or buffer and extracts the uncompressed MusicXML text content.
 */
export async function parseMxlFile(fileOrBuffer: File | Blob | ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(fileOrBuffer);

  // 1. Locate META-INF/container.xml
  let containerEntry = zip.file('META-INF/container.xml');
  if (!containerEntry) {
    const matchKey = Object.keys(zip.files).find(
      key => key.toLowerCase() === 'meta-inf/container.xml'
    );
    if (matchKey) {
      containerEntry = zip.file(matchKey);
    }
  }

  if (containerEntry) {
    const containerXml = await containerEntry.async('string');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(containerXml, 'application/xml');
    const rootfile = xmlDoc.querySelector('rootfile');
    const fullPath = rootfile?.getAttribute('full-path');

    if (fullPath) {
      let scoreEntry = zip.file(fullPath) || zip.file(fullPath.replace(/^\//, ''));
      if (!scoreEntry) {
        const matchKey = Object.keys(zip.files).find(
          key => key.toLowerCase() === fullPath.toLowerCase().replace(/^\//, '')
        );
        if (matchKey) {
          scoreEntry = zip.file(matchKey);
        }
      }

      if (scoreEntry) {
        return await scoreEntry.async('string');
      }
    }
  }

  // 2. Fallback: Search for any .xml or .musicxml file in zip
  for (const filename of Object.keys(zip.files)) {
    const lower = filename.toLowerCase();
    if (
      (lower.endsWith('.xml') || lower.endsWith('.musicxml')) &&
      !lower.startsWith('meta-inf/') &&
      !lower.startsWith('__macosx/') &&
      !zip.files[filename].dir
    ) {
      return await zip.files[filename].async('string');
    }
  }

  throw new Error('No valid MusicXML content found in the .mxl archive.');
}

/**
 * Packs a MusicXML string into a compressed MusicXML (.mxl) Blob.
 */
export async function createMxlBlob(xmlContent: string): Promise<Blob> {
  const zip = new JSZip();

  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="score.xml" media-type="application/vnd.recordare.musicxml+xml"/>
  </rootfiles>
</container>`;

  zip.folder('META-INF')?.file('container.xml', containerXml);
  zip.file('score.xml', xmlContent);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.recordare.musicxml',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9
    }
  });
}
