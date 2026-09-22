import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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
