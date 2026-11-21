// src/hooks/useUserPreferences.js
// users/{uid}.preferences（入力のしかたなど、ユーザー単位の設定）を読み書きする
import { useState, useEffect, useContext, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../AuthContext';
import { CHIP_INPUT_MODES } from '../utils/scoreCalculation';

export const DEFAULT_PREFERENCES = { chipInputMode: CHIP_INPUT_MODES.COUNT };

// 無いとき・不明な値のときは既定に落とす
const normalize = (raw) => ({
  chipInputMode:
    raw?.chipInputMode === CHIP_INPUT_MODES.DIFF ? CHIP_INPUT_MODES.DIFF : CHIP_INPUT_MODES.COUNT,
});

const useUserPreferences = () => {
  const { user } = useContext(AuthContext) || {};
  const uid = user?.uid;
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(!!uid);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, 'users', uid))
      .then((snap) => {
        if (cancelled) return;
        setPreferences(normalize(snap.exists() ? snap.data().preferences : null));
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('設定の読み込みエラー:', e);
        setPreferences(DEFAULT_PREFERENCES);
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // 保存に成功したときだけ state を更新する。失敗時は例外を投げる（呼び出し側がエラー表示）
  const savePreferences = useCallback(
    async (changes) => {
      if (!uid) throw new Error('ログインしていません');
      const next = normalize({ ...preferences, ...changes });
      // setDoc は全体上書き。他のフィールドが増えたときは、読み込んだ全体に重ねて書くこと
      await setDoc(doc(db, 'users', uid), { preferences: next, updatedAt: serverTimestamp() });
      setPreferences(next);
      setError(null);
      return next;
    },
    [uid, preferences]
  );

  return { preferences, loading, error, savePreferences };
};

export default useUserPreferences;
