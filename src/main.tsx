import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress preview environment WebSocket HMR connection warnings/rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (
      reason &&
      ((typeof reason === 'string' && reason.includes('WebSocket')) ||
        (reason.message && typeof reason.message === 'string' && reason.message.includes('WebSocket')))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
