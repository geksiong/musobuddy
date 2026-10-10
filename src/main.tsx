import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AudioProvider } from './contexts/AudioContext.tsx';
import { AccompanimentProvider } from './contexts/AccompanimentContext.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { ScoreProvider } from './contexts/ScoreContext.tsx';
import { ControllerProvider } from './contexts/ControllerContext.tsx';
import './index.css';

// Polyfill Promise.withResolvers for browsers/WebViews lacking native support (required by pdfjs-dist)
if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Silence benign ResizeObserver loop limit errors that occur during fast UI reflows
if (typeof window !== 'undefined') {
  const resizeObserverErrRegex = /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i;
  
  window.addEventListener('error', (event) => {
    if (event?.message && resizeObserverErrRegex.test(event.message)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event?.reason?.message && resizeObserverErrRegex.test(event.reason.message)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AudioProvider>
      <AccompanimentProvider>
        <ThemeProvider>
          <ScoreProvider>
            <ControllerProvider>
              <App />
            </ControllerProvider>
          </ScoreProvider>
        </ThemeProvider>
      </AccompanimentProvider>
    </AudioProvider>
  </StrictMode>,
);
