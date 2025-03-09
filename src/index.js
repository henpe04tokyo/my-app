import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './AuthContext';

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
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