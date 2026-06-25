import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Auto-register service worker with automatic update checks
registerSW({
  immediate: true,
  onNeedRefresh() {
    if (confirm('New version of KissanShakthi is available! Reload to update?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('KissanShakthi PWA is ready for offline use.');
  }
})

import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

