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

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react(), tailwindcss(), staticAssetsPlugin()],
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
