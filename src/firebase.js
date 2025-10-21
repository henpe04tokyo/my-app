// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDdULG2JiqKTIkF1AvcZeJse8vQHVzijnA",
  authDomain: "mahjong-dev-a4d01.firebaseapp.com",
  projectId: "mahjong-dev-a4d01",
  storageBucket: "mahjong-dev-a4d01.firebasestorage.app",
  messagingSenderId: "296803295236",
  appId: "1:296803295236:web:4f7090147a36bdbccb9551",
  measurementId: "G-HJ3H6Z35DZ"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };