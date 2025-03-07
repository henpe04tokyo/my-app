import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Firebase の環境変数を取得
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Firebase アプリがすでに存在するか確認してから初期化
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firebase Analytics の初期化（Next.jsの場合は `typeof window !== "undefined"` をつける）
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export { app, analytics };
