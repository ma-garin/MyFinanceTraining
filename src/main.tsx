import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { watchRegistration } from './infrastructure/swUpdate';
import './styles.css';
import './styles-extra.css';
import './styles/desktop.css';
import './styles/desktop/dashboard.css';
import './styles/desktop/event-input.css';
import './styles/desktop/association-tree.css';
import './styles/desktop/backtest.css';
import './styles/desktop/report.css';
import './styles/desktop/settings.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/MyFinanceTraining/sw.js').then(watchRegistration).catch(() => {
      // Service Worker registration is non-critical for local development.
    });
  });
}
