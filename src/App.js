// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';  // 作成済みの認証ガードコンポーネント
import { AuthProvider } from './AuthContext';  // 作成済みの認証状態管理コンテキスト
import Dashboard from './Dashboard';         // 既存のアプリ機能（スコア計算・グループ管理等）を移行したコンポーネント
import Login from './Login';                 // ログイン画面のコンポーネント

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ログインページ */}
          <Route path="/login" element={<Login />} />
          {/* PrivateRoute で保護されたルート：ログインしているユーザーのみ Dashboard にアクセス可能 */}
          <Route element={<PrivateRoute />}>
            <Route path="/*" element={<Dashboard />} />
          </Route>
          {/* その他のルート */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
