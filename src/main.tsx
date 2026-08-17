import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AudioProvider } from './contexts/AudioContext.tsx';
import { AccompanimentProvider } from './contexts/AccompanimentContext.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { ScoreProvider } from './contexts/ScoreContext.tsx';
import './index.css';

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
            <App />
          </ScoreProvider>
        </ThemeProvider>
      </AccompanimentProvider>
    </AudioProvider>
  </StrictMode>,
);
