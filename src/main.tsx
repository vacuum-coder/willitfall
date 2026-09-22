import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are served with the site (no requests to third parties, works offline): only the weights the tokens use.
import '@fontsource/literata/500.css';
import '@fontsource/literata/600.css';
import '@fontsource/literata/500-italic.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import './styles/theme.css';
import { App } from './ui/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Installable and offline after the first visit (production build only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
      const reg = await navigator.serviceWorker.ready;
      const own = performance.getEntriesByType('resource').map((r) => r.name).filter((u) => new URL(u).origin === location.origin);
      reg.active?.postMessage({ cache: [location.pathname, ...own] });
    } catch {
      // Without a service worker the site simply stays online-only.
    }
  });
}
