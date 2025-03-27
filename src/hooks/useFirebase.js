// src/hooks/useFirebase.js
// データ保存の核となる部分を改善

import { useState, useEffect } from 'react';
import { collection, addDoc, doc, setDoc, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { recalcFinalStats } from '../utils/scoreCalculation';

/**
 * Firebase操作のためのカスタムフック - 改善版
 * @param {Object} user - Firebase Authentication ユーザーオブジェクト
 * @returns {Object} グループデータと操作関数
 */
export function useFirebase(user) {
  const [groups, setGroups] = useState([]);
  const [pastPlayerNames, setPastPlayerNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Firestore からユーザーのグループデータを取得する useEffect
  useEffect(() => {
    if (!user) return;
  
    const fetchGroups = async () => {
      setLoading(true);
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
        setLastSyncTime(new Date().toISOString());
      } catch (error) {
        console.error("グループデータ取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchGroups();
    
    // 定期的なデータ同期 (5分ごと)
    const syncInterval = setInterval(fetchGroups, 300000);
    
    return () => clearInterval(syncInterval);
  }, [user]);

  /**
   * 新しいグループをFirebaseに保存 - 改善版
   * @param {Object} groupData - 保存するグループデータ
   * @returns {Promise<string>} 保存されたドキュメントID
   */
  const saveGroupToFirebase = async (groupData) => {
    if (!user) throw new Error("ユーザーがログインしていません");
    
    try {
      // 日時フィールドを追加
      const timestamp = new Date().toISOString();
      const dataToSave = {
        ...groupData,
        userId: user.uid,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      // Firestore に保存
      const docRef = await addDoc(collection(db, "groups"), dataToSave);
      const newDocId = docRef.id;
      
      // docIdを保持するために、作成したグループに追加
      const updatedGroupData = { ...dataToSave, docId: newDocId };
      
      // ステートを更新
      setGroups(prev => [...prev, updatedGroupData]);
      
      console.log("グループ保存成功, id=", newDocId);
      setLastSyncTime(timestamp);
      
      // ローカルストレージにもバックアップ
      try {
        const backupKey = `group_backup_${newDocId}`;
        localStorage.setItem(backupKey, JSON.stringify(updatedGroupData));
      } catch (storageErr) {
        console.warn("ローカルストレージへのバックアップに失敗:", storageErr);
      }
      
      return newDocId;
    } catch (error) {
      console.error("グループ保存エラー:", error);
      throw error;
    }
  };

  /**
   * 既存のグループをFirebaseで更新 - トランザクション使用の改善版
   * @param {Object} groupData - 更新するグループデータ
   * @returns {Promise<void>}
   */
  const updateGroupInFirebase = async (groupData) => {
    if (!user) throw new Error("ユーザーがログインしていません");
    
    try {
      // docIdが存在する場合はそれを使用、それ以外はidをstring化して使用
      const docId = groupData.docId || String(groupData.id);
      const docRef = doc(db, "groups", docId);
      
      // docIdはFirestoreのフィールドとしては保存しない
      const { docId: _, ...dataToUpdate } = groupData;
      
      // 更新タイムスタンプを追加
      const timestamp = new Date().toISOString();
      dataToUpdate.updatedAt = timestamp;
      dataToUpdate.userId = user.uid; // ユーザーIDを確実に保持
      
      // 再計算を実行して、最新の統計を保持する
      dataToUpdate.finalStats = recalcFinalStats(dataToUpdate);
      
      // トランザクションを使って安全に更新
      await runTransaction(db, async (transaction) => {
        // 現在のドキュメントを取得
        const currentDoc = await transaction.get(docRef);
        
        if (!currentDoc.exists()) {
          // ドキュメントが存在しない場合は新規作成
          transaction.set(docRef, dataToUpdate);
        } else {
          // 既存ドキュメントを更新
          transaction.update(docRef, dataToUpdate);
        }
      });
      
      // ステートを更新
      setGroups(prev => prev.map(g => g.id === groupData.id ? { ...dataToUpdate, docId } : g));
      setLastSyncTime(timestamp);
      
      console.log("グループ更新成功:", groupData.id);
      
      // ローカルストレージにもバックアップ
      try {
        const backupKey = `group_backup_${docId}`;
        localStorage.setItem(backupKey, JSON.stringify({ ...dataToUpdate, docId }));
      } catch (storageErr) {
        console.warn("ローカルストレージへのバックアップに失敗:", storageErr);
      }
    } catch (error) {
      console.error("グループ更新エラー:", error);
      
      // エラー発生時にローカルストレージからリカバリを試みる
      try {
        const backupKey = `group_backup_${groupData.docId || String(groupData.id)}`;
        const backupData = localStorage.getItem(backupKey);
        
        if (backupData) {
          console.log("ローカルバックアップからリカバリを試みます");
          const parsedBackup = JSON.parse(backupData);
          
          // 再度保存を試みる (非同期で行い、この関数のエラーには影響しない)
          setTimeout(() => {
            const docRef = doc(db, "groups", parsedBackup.docId);
            setDoc(docRef, parsedBackup)
              .then(() => console.log("バックアップからリカバリ成功"))
              .catch(err => console.error("リカバリ再試行エラー:", err));
          }, 5000);
        }
      } catch (recoveryErr) {
        console.error("リカバリ試行エラー:", recoveryErr);
      }
      
      throw error;
    }
  };

  /**
   * ローカルストレージからデータをリカバリする
   * リロード後にデータが消えた場合に使用
   */
  const recoverFromLocalStorage = () => {
    try {
      const recoveredGroups = [];
      
      // ローカルストレージをスキャンしてグループデータを検索
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('group_backup_')) {
          try {
            const data = localStorage.getItem(key);
            const groupData = JSON.parse(data);
            
            // ユーザーIDが一致するデータのみリカバリ
            if (groupData && groupData.userId === user.uid) {
              recoveredGroups.push(groupData);
              
              // Firestoreにも再保存
              const docRef = doc(db, "groups", groupData.docId);
              setDoc(docRef, groupData)
                .then(() => console.log("リカバリ保存成功:", groupData.id))
                .catch(err => console.error("リカバリ保存エラー:", err));
            }
          } catch (parseErr) {
            console.warn("バックアップデータの解析エラー:", key, parseErr);
          }
        }
      }
      
      if (recoveredGroups.length > 0) {
        console.log(`${recoveredGroups.length}個のグループをリカバリしました`);
        setGroups(prev => {
          // 既存データとリカバリデータをマージ (重複を除去)
          const allGroups = [...prev];
          recoveredGroups.forEach(recoveredGroup => {
            const exists = allGroups.some(g => g.docId === recoveredGroup.docId);
            if (!exists) {
              allGroups.push(recoveredGroup);
            }
          });
          return allGroups;
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("リカバリエラー:", error);
      return false;
    }
  };

  return {
    groups,
    setGroups,
    pastPlayerNames,
    setPastPlayerNames,
    saveGroupToFirebase,
    updateGroupInFirebase,
    recoverFromLocalStorage,
    loading,
    lastSyncTime
  };
}

export default useFirebase;