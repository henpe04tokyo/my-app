import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './AuthContext';

// Service Worker登録を無効化（問題解決後に再度有効化できます）
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/serviceWorker.js')
//       .then((registration) => {
//         console.log('Service Worker registered with scope:', registration.scope);
//       })
//       .catch((error) => {
//         console.error('Service Worker registration failed:', error);
//       });
//   });
// }

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
  
  // サービスワーカーの登録を相対パスに変更して再有効化
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./serviceWorker.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
} catch (error) {
  console.error("アプリケーション起動エラー:", error);
  // エラーメッセージを表示
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = 
      '<div style="padding: 20px; color: red; text-align: center;">' +
      '<h2>アプリケーションの読み込み中にエラーが発生しました</h2>' +
      '<p>ページを再読み込みしてください。問題が解決しない場合は、キャッシュをクリアしてみてください。</p>' +
      '<button onclick="window.location.reload(true)" style="padding: 8px 16px; background-color: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">再読み込み</button>' +
      '</div>';
  }
}

reportWebVitals();