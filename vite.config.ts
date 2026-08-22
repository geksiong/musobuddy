import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv, Plugin} from 'vite';

function staticAssetsPlugin(): Plugin {
  const pdfjsDir = path.resolve(__dirname, 'node_modules/pdfjs-dist');
  const publicPdfjsDir = path.resolve(__dirname, 'public/pdfjs');
  const alphatabDir = path.resolve(__dirname, 'node_modules/@coderline/alphatab/dist');
  const publicAlphatabDir = path.resolve(__dirname, 'public/alphatab');

  function copyAssets() {
    // Copy PDF.js assets
    if (fs.existsSync(pdfjsDir)) {
      const targets = [
        { src: 'build/pdf.worker.min.mjs', dest: 'build/pdf.worker.min.mjs' },
        { src: 'wasm', dest: 'wasm' },
        { src: 'cmaps', dest: 'cmaps' },
        { src: 'standard_fonts', dest: 'standard_fonts' },
        { src: 'iccs', dest: 'iccs' },
      ];

      for (const target of targets) {
        const srcPath = path.join(pdfjsDir, target.src);
        const destPath = path.join(publicPdfjsDir, target.dest);
        if (fs.existsSync(srcPath)) {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          if (fs.statSync(srcPath).isDirectory()) {
            fs.cpSync(srcPath, destPath, { recursive: true });
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }
    }

    // Copy AlphaTab font and soundfont assets
    if (fs.existsSync(alphatabDir)) {
      const alphatabTargets = [
        { src: 'font', dest: 'font' },
        { src: 'soundfont', dest: 'soundfont' },
      ];

      for (const target of alphatabTargets) {
        const srcPath = path.join(alphatabDir, target.src);
        const destPath = path.join(publicAlphatabDir, target.dest);
        if (fs.existsSync(srcPath)) {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          if (fs.statSync(srcPath).isDirectory()) {
            fs.cpSync(srcPath, destPath, { recursive: true });
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }
    }
  }

  return {
    name: 'static-assets-plugin',
    buildStart() {
      copyAssets();
    },
    configureServer() {
      copyAssets();
    }
  };
}

function scoreProxyPlugin(): Plugin {
  return {
    name: 'score-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/proxy-score', async (req, res) => {
        try {
          const reqUrl = req.url || '';
          const urlParam = new URL(reqUrl, 'http://localhost').searchParams.get('url');
          if (!urlParam) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing "url" query parameter.' }));
            return;
          }

          const targetUrl = decodeURIComponent(urlParam);
          const upstreamRes = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MusoBuddy/1.0',
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });

          if (!upstreamRes.ok) {
            res.statusCode = upstreamRes.status;
            res.setHeader('Content-Type', 'text/plain');
            res.end(`Upstream server responded with HTTP ${upstreamRes.status}: ${upstreamRes.statusText}`);
            return;
          }

          const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Access-Control-Allow-Origin', '*');

          const arrayBuffer = await upstreamRes.arrayBuffer();
          res.statusCode = 200;
          res.end(Buffer.from(arrayBuffer));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || String(err) }));
        }
      });
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react(), tailwindcss(), staticAssetsPlugin(), scoreProxyPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
