import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './styles-extra.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Android アプリでは Service Worker を登録しない。アプリ本体が端末内にあり
// オフライン化は不要な上、capacitor の https://localhost/ で古いシェルを
// 掴むと更新が反映されなくなる。
if (!__IS_CAPACITOR__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Service Worker registration is non-critical for local development.
    });
  });
}
