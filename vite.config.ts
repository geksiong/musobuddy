import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv, Plugin} from 'vite';

function pdfjsAssetsPlugin(): Plugin {
  const pdfjsDir = path.resolve(__dirname, 'node_modules/pdfjs-dist');
  const publicPdfjsDir = path.resolve(__dirname, 'public/pdfjs');

  function copyPdfjsFiles() {
    if (!fs.existsSync(pdfjsDir)) return;
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

  return {
    name: 'pdfjs-assets-plugin',
    buildStart() {
      copyPdfjsFiles();
    },
    configureServer() {
      copyPdfjsFiles();
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), pdfjsAssetsPlugin()],
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
