import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import { AuthProvider } from "./AuthContext";
import Dashboard from "./Dashboard";
import Home from "./Home";
import Login from "./Login";
import Signup from "./Signup";
import NotFound from "./NotFound";

// Firebase の設定をインポート
import { app } from "./firebase"; // Firebase を初期化

function App() {
  console.log("Firebase initialized:", app);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 公開ページ */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* 認証が必要なページ */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/group/:groupId" element={<Dashboard />} />
            <Route path="/dashboard/analysis" element={<Dashboard />} />
          </Route>
          
          {/* SEO対応の404ページ */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;