import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AudioProvider } from './contexts/AudioContext.tsx';
import { AccompanimentProvider } from './contexts/AccompanimentContext.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { ScoreProvider } from './contexts/ScoreContext.tsx';
import './index.css';

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
