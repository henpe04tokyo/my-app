// src/firebase.js を修正
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

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
const db = getFirestore(app);
const auth = getAuth(app);

// 認証状態の永続化を設定
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("認証永続化の設定に失敗しました:", error);
  });

// オフライン永続化を有効化
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // 複数タブが開いている場合など
      console.warn('Firestoreの永続化は複数タブが開いている場合に有効化できません。');
    } else if (err.code === 'unimplemented') {
      // ブラウザがサポートしていない場合
      console.warn('このブラウザはFirestoreのオフライン永続化をサポートしていません。');
    }
  });

export { app, db, auth };