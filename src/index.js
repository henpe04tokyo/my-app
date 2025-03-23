// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './AuthContext';

// Service Worker Registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/serviceWorker.js')
        .then(registration => {
          console.log('ServiceWorker 登録成功: ', registration.scope);
          
          // バックグラウンド同期をサポートしているか確認
          if ('sync' in registration) {
            console.log('バックグラウンド同期がサポートされています');
            
            // 定期的なデータ同期をトリガー
            setInterval(() => {
              registration.sync.register('sync-game-data')
                .then(() => console.log('バックグラウンド同期をリクエスト'))
                .catch(err => console.error('同期リクエストエラー:', err));
            }, 300000); // 5分ごとに同期
          }
        })
        .catch(error => {
          console.error('ServiceWorker 登録失敗:', error);
        });
    });
  }
}

// アプリのロード処理
try {
  // Service Workerを登録
  registerServiceWorker();
  
  // アプリをレンダリング
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
  
  // オフライン検出機能
  window.addEventListener('online', () => {
    console.log('オンラインに戻りました。データを同期中...');
    document.body.classList.remove('offline-mode');
    
    // オンラインに戻ったらサービスワーカーに同期リクエスト
    if ('serviceWorker' in navigator && 'sync' in window.registration) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('sync-game-data')
          .then(() => console.log('バックグラウンド同期をリクエスト'))
          .catch(err => console.error('同期リクエストエラー:', err));
      });
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('オフラインになりました。ローカルキャッシュで動作します...');
    document.body.classList.add('offline-mode');
  });
  
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

// パフォーマンス計測
reportWebVitals();