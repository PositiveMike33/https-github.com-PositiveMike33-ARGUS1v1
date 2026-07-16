import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent benign development environment WebSocket / HMR errors from breaking the preview or triggering overlays
if (typeof window !== 'undefined') {
  const ignorePatterns = ['websocket', 'WebSocket', 'failed to connect to websocket', 'HMR'];
  
  window.addEventListener('unhandledrejection', (event) => {
    const errorMsg = event.reason?.message || String(event.reason);
    if (ignorePatterns.some(pattern => errorMsg.toLowerCase().includes(pattern.toLowerCase()))) {
      event.preventDefault();
      console.warn('[ARGUS Core] Ignored benign development environment WebSocket rejection:', errorMsg);
    }
  });

  window.addEventListener('error', (event) => {
    const errorMsg = event.message || '';
    if (ignorePatterns.some(pattern => errorMsg.toLowerCase().includes(pattern.toLowerCase()))) {
      event.preventDefault();
      console.warn('[ARGUS Core] Ignored benign development environment WebSocket error:', errorMsg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for resilient offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[ARGUS SW] Registration successful with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[ARGUS SW] Registration failed:', err);
      });
  });
}

