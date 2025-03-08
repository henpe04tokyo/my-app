// src/hooks/useFirebase.js
import { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { recalcFinalStats } from '../utils/scoreCalculation';

/**
 * Firebase操作のためのカスタムフック
 * @param {Object} user - Firebase Authentication ユーザーオブジェクト
 * @returns {Object} グループデータと操作関数
 */
export function useFirebase(user) {
  const [groups, setGroups] = useState([]);
  const [pastPlayerNames, setPastPlayerNames] = useState([]);

  // Firestore からユーザーのグループデータを取得する useEffect
  useEffect(() => {
    if (!user) return;
  
    const fetchGroups = async () => {
      try {
        // ユーザーIDに基づいてグループを取得
        const q = query(collection(db, "groups"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        const groupsData = [];
        const allNames = new Set(); // プレイヤー名収集用
  
        querySnapshot.forEach((doc) => {
          // ドキュメントIDを保持
          const data = { ...doc.data(), docId: doc.id };
          
          // id が数値の場合は数値型に変換（Date.now() で作成された ID などの場合）
          const id = isNaN(data.id) ? data.id : Number(data.id);
          
          // ゲームデータが配列であることを確認
          if (!Array.isArray(data.games)) {
            data.games = data.games || [];
          }
          
          // 必須フィールドの初期化
          data.players = data.players || ['', '', '', ''];
          data.settings = data.settings || {};
          data.chipRow = data.chipRow || {};
          
          // データを準備
          const groupData = { ...data, id };
          
          // 最終状態を再計算
          groupData.finalStats = recalcFinalStats(groupData);
          
          groupsData.push(groupData);
          
          // プレイヤー名も収集
          const players = data.players || [];
          players.forEach(name => {
            if (name && name.trim()) {
              allNames.add(name.trim());
            }
          });
        });
        
        // コンソールに取得したデータを表示（デバッグ用）
        console.log("取得したグループデータ:", groupsData);
        
        setGroups(groupsData);
        setPastPlayerNames(Array.from(allNames)); // プレイヤー名をセット
      } catch (error) {
        console.error("グループデータ取得エラー:", error);
      }
    };
  
    fetchGroups();
  }, [user]);

  /**
   * 新しいグループをFirebaseに保存
   * @param {Object} groupData - 保存するグループデータ
   * @returns {Promise<string>} 保存されたドキュメントID
   */
  const saveGroupToFirebase = async (groupData) => {
    try {
      const docRef = await addDoc(collection(db, "groups"), {
        ...groupData,
        userId: user.uid, // ユーザーIDを確実に保存
        createdAt: new Date().toISOString() // 作成日時も記録
      });
      
      // docIdを保持するために、作成したグループに追加
      const updatedGroupData = { ...groupData, docId: docRef.id };
      
      // ステートを更新
      setGroups(prev => prev.map(g => g.id === groupData.id ? updatedGroupData : g));
      
      console.log("グループ保存, id=", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("グループ保存エラー:", error);
      throw error;
    }
  };

  /**
   * 既存のグループをFirebaseで更新
   * @param {Object} groupData - 更新するグループデータ
   * @returns {Promise<void>}
   */
  const updateGroupInFirebase = async (groupData) => {
    try {
      // docIdが存在する場合はそれを使用、それ以外はidをstring化して使用
      const docId = groupData.docId || String(groupData.id);
      const docRef = doc(db, "groups", docId);
      
      // docIdはFirestoreのフィールドとしては保存しない
      const { docId: _, ...dataToSave } = groupData;
      
      await updateDoc(docRef, dataToSave);
      console.log("グループ更新:", groupData.id);
    } catch (error) {
      console.error("グループ更新エラー:", error);
      throw error;
    }
  };

  return {
    groups,
    setGroups,
    pastPlayerNames,
    setPastPlayerNames,
    saveGroupToFirebase,
    updateGroupInFirebase
  };
}

export default useFirebase;