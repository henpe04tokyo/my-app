// src/Home.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import SEO from './components/Dashboard/SEO/SEO';

// 今日の日付を "YYYY-MM-DD" 形式で取得する関数
function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function Home() {
  const navigate = useNavigate();
  // デフォルトで今日の日付を設定
  const [groupName, setGroupName] = useState(getTodayDate());
  const [groups, setGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // 削除確認用のステート
  const [openMonths, setOpenMonths] = useState(new Set()); // アコーディオンで開いている月 (YYYY-MM)

  // グループを月 (YYYY-MM) ごとにまとめる。月は新しい順。
  const groupsByMonth = useMemo(() => {
    const byMonth = {};
    for (const g of groups) {
      const dateStr = g.date || (g.createdAt || '').slice(0, 10);
      const monthKey = dateStr.slice(0, 7); // YYYY-MM
      if (!byMonth[monthKey]) byMonth[monthKey] = [];
      byMonth[monthKey].push(g);
    }
    // 各月内は日付の新しい順（fetchGroups で既にソート済みだが、月で分けたので再ソート）
    Object.keys(byMonth).forEach(key => {
      byMonth[key].sort((a, b) => {
        const dateA = a.date || a.createdAt || '';
        const dateB = b.date || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
    });
    const sortedMonths = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
    return { byMonth, sortedMonths };
  }, [groups]);

  const toggleMonth = (monthKey) => {
    setOpenMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  };

  // ユーザー認証を監視
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchGroups(user.uid); // ログインユーザーのグループのみ取得
      } else {
        setCurrentUser(null);
        setGroups([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firestore から「自分が作成したグループのみ」取得
  const fetchGroups = async (userId) => {
    if (!userId) return;

    try {
      const q = query(collection(db, 'groups'), where("userId", "==", userId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // 日付の新しい順（上から新しい順）でソート。date がなければ createdAt を使用
      data.sort((a, b) => {
        const dateA = a.date || a.createdAt || '';
        const dateB = b.date || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
      setGroups(data);
    } catch (error) {
      console.error("グループ取得エラー:", error);
    }
  };

  // 新しいグループを作成して Firestore に保存
  const handleCreateGroup = async () => {
    if (!currentUser) {
      console.error("ユーザーが未ログイン");
      return;
    }

    // グループ名が空の場合は、現在の日付をデフォルト名として設定
    let name = groupName.trim();
    if (!name) {
      name = getTodayDate();
    }

    const today = getTodayDate();
    
    const newGroup = {
      name: name,
      date: today, // 日付フィールドも追加
      createdAt: new Date().toISOString(),
      userId: currentUser.uid,
      // 基本的なデータ構造を初期化
      players: ['', '', '', ''],
      games: [],
      settings: {
        chipDistribution: 300,
        rankPointOption: '10-30',
        rankPoints: [0, 10, -10, -30] 
      },
      chipRow: {},
      rankingCounts: {}
    };

    try {
      const docRef = await addDoc(collection(db, 'groups'), newGroup);
      console.log('Created group with ID:', docRef.id);
      
      // グループ作成後にリスト更新
      fetchGroups(currentUser.uid);
      
      // Reactルーターのナビゲーションを使用して遷移
      navigate(`/dashboard/group/${docRef.id}`);
    } catch (error) {
      console.error('グループ作成エラー:', error);
    }
  };

  // 削除確認ダイアログを表示
  const showDeleteConfirm = (groupId) => {
    setDeleteConfirmId(groupId);
  };

  // 削除キャンセル
  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  // グループ削除処理
  const confirmDeleteGroup = async (groupId) => {
    try {
      await deleteDoc(doc(db, "groups", groupId));
      setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId)); // ローカル state を更新
      console.log(`グループ削除: ${groupId}`);
      setDeleteConfirmId(null); // 確認ダイアログを閉じる
    } catch (error) {
      console.error("グループ削除エラー:", error);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  return (
    <>
      {/* SEOコンポーネントを追加 */}
      <SEO 
        title="麻雀スコア計算 | ホーム" 
        description="麻雀のスコアを簡単に計算・管理できるオンラインアプリ。グループを作成して半荘結果を記録しましょう。"
        canonical="/"
      />
      
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* ヘッダー部分にログアウトボタンを追加 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            麻雀スコア計算
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            ログアウト
          </button>
        </div>

        {/* 新しいグループ作成 */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">新しいグループ作成</h2>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="グループ名（空欄の場合は日付が設定されます）"
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <button
            onClick={handleCreateGroup}
            className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700"
          >
            グループ作成
          </button>
        </div>

        {/* 既存グループ一覧 - 月ごとアコーディオン */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">既存グループ一覧</h2>
          {groups.length === 0 ? (
            <p className="text-gray-500">グループがありません。</p>
          ) : (
            <div className="space-y-1">
              {groupsByMonth.sortedMonths.map((monthKey) => {
                const isOpen = openMonths.has(monthKey);
                const monthGroups = groupsByMonth.byMonth[monthKey] || [];
                const [y, m] = monthKey.split('-');
                const monthLabel = `${y}年${parseInt(m, 10)}月`;
                return (
                  <div key={monthKey} className="rounded-md border border-gray-200 overflow-hidden">
                    {/* 月ヘッダー: タップで開閉 */}
                    <button
                      type="button"
                      onClick={() => toggleMonth(monthKey)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 text-left font-medium text-gray-800 transition-colors"
                    >
                      <span>{monthLabel}</span>
                      <span className="text-gray-500 text-sm">{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {/* 開いたときに日付ごとのグループを表示 */}
                    {isOpen && (
                      <ul className="border-t border-gray-200 bg-white">
                        {monthGroups.map((g) => (
                          <li
                            key={g.id}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={(e) => {
                              if (e.target.closest('.delete-controls')) return;
                              navigate(`/dashboard/group/${g.id}`);
                            }}
                          >
                            <span className="text-gray-700 hover:text-indigo-600">
                              {g.date || (g.createdAt || '').slice(0, 10) || g.name}
                            </span>
                            <div className="delete-controls" onClick={(e) => e.stopPropagation()}>
                              {deleteConfirmId === g.id ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">削除しますか？</span>
                                  <button
                                    type="button"
                                    onClick={() => confirmDeleteGroup(g.id)}
                                    className="bg-red-600 text-white text-xs px-2 py-1 rounded"
                                  >
                                    はい
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelDelete}
                                    className="bg-gray-300 text-gray-700 text-xs px-2 py-1 rounded"
                                  >
                                    いいえ
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => showDeleteConfirm(g.id)}
                                  className="text-red-600 hover:text-red-800"
                                  aria-label="削除"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* データ分析 */}
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">集計・分析</h2>
          <button 
            onClick={() => navigate('/dashboard/analysis')}
            className="rounded-md bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700"
          >
            集計
          </button>
        </div>
      </div>
    </>
  );
}

export default Home;