import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [groups, setGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // 🔹 ユーザー認証を監視
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchGroups(user.uid); // 🔹 ログインユーザーのグループのみ取得
      } else {
        setCurrentUser(null);
        setGroups([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔹 Firestore から「自分が作成したグループのみ」取得
  const fetchGroups = async (userId) => {
    if (!userId) return;

    try {
      const q = query(collection(db, 'groups'), where("userId", "==", userId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(data);
    } catch (error) {
      console.error("グループ取得エラー:", error);
    }
  };

  // 🔹 新しいグループを作成して Firestore に保存
  const handleCreateGroup = async () => {
    if (!groupName.trim() || !currentUser) {
      console.error("グループ名が空、またはユーザーが未ログイン");
      return;
    }

    const newGroup = {
      name: groupName.trim(),
      createdAt: new Date().toISOString(),
      userId: currentUser.uid
    };

    try {
      const docRef = await addDoc(collection(db, 'groups'), newGroup);
      console.log('Created group with ID:', docRef.id);
      fetchGroups(currentUser.uid); // 🔹 グループ作成後にリスト更新
      navigate(`/group/${docRef.id}`);
    } catch (error) {
      console.error('グループ作成エラー:', error);
    }
  };

  // 🔹 グループ削除処理
  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("このグループを削除してもよろしいですか？")) return;

    try {
      await deleteDoc(doc(db, "groups", groupId));
      setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId)); // 🔹 ローカル state を更新
      console.log(`グループ削除: ${groupId}`);
    } catch (error) {
      console.error("グループ削除エラー:", error);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">
        麻雀スコア計算アプリ - トップページ
      </h1>

      {/* 新しいグループ作成 */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">新しいグループ作成</h2>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="グループ名"
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <button
          onClick={handleCreateGroup}
          className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700"
        >
          グループ作成
        </button>
      </div>

      {/* 既存グループ一覧 */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">既存グループ一覧</h2>
        {groups.length === 0 ? (
          <p className="text-gray-500">グループがありません。</p>
        ) : (
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-md">
                <button
                  onClick={() => navigate(`/group/${g.id}`)}
                  className="text-lg font-medium text-gray-700 hover:text-indigo-600"
                >
                  {g.name}
                </button>
                {/* 🔹 削除ボタン */}
                <button
                  onClick={() => handleDeleteGroup(g.id)}
                  className="ml-4 px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* データ分析 */}
      <div className="rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">データ分析</h2>
        <button className="rounded-md bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700">
          集計
        </button>
      </div>
    </div>
  );
}

export default Home;
