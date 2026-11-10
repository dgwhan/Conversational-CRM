import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './index.css'
import App from './App.tsx'

// Tự động tải lại trang khi hệ thống deploy bản mới và hash module động thay đổi (Vite Chunk Preload Error)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const storageKey = 'crm_vite_preload_reload';
  const lastReload = sessionStorage.getItem(storageKey);
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem(storageKey, String(now));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
