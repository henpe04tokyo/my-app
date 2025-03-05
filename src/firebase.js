// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase コンソールから取得した設定情報（変更なし）
const firebaseConfig = {
  apiKey: "AIzaSyDdULG2JiqKTIkF1AvcZeJse8vQHVzijnA",
  authDomain: "mahjong-first.firebaseapp.com",
  projectId: "mahjong-first",
  storageBucket: "mahjong-first.firebasestorage.app",
  messagingSenderId: "296803295236",
  appId: "1:296803295236:web:4f7090147a36bdbccb9551",
  measurementId: "G-HJ3H6Z35DZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
