// src/firebase.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Firestoreを使う場合

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDdULG2JiqKTIkF1AvcZeJse8vQHVzijnA",
  authDomain: "mahjong-first.firebaseapp.com",
  projectId: "mahjong-first",
  storageBucket: "mahjong-first.firebasestorage.app",
  messagingSenderId: "296803295236",
  appId: "1:296803295236:web:4f7090147a36bdbccb9551",
  measurementId: "G-HJ3H6Z35DZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Firestore のインスタンスを作成してエクスポート
export const db = getFirestore(app);
