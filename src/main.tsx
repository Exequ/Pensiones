import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/public-sans/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('No se encuentra el elemento #raiz');

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
