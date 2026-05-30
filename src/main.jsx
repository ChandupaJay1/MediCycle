import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Service Worker Registration for PWA / Offline Capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Note the path to sw.js is relative to the root in production builds
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('MediCycle Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('MediCycle Service Worker registration failed:', error);
      });
  });
}
