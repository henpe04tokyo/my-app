import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import { AuthProvider } from "./AuthContext";
import Dashboard from "./Dashboard";
import Login from "./Login";
import Signup from "./Signup";

// Firebase の設定をインポート（これを追加）
import { app } from "./config/firebaseConfig"; // Firebase を初期化

function App() {
  console.log("Firebase initialized:", app); // Firebase が適用されているか確認

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {/* PrivateRoute で保護されたルート */}
          <Route element={<PrivateRoute />}>
            <Route path="/*" element={<Dashboard />} />
          </Route>
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
