import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import Analysis from './Analysis';
import { settings, calculateFinalScoresFromInputs, recalcFinalStats } from './utils/scoreCalculation';
import GameInputForm from './components/Dashboard/GameInputForm';
import GameResultsTable from './components/Dashboard/GameResultsTable';
import PlayerSettings from './components/Dashboard/PlayerSettings';
import ChipSettings from './components/Dashboard/ChipSettings';

const Dashboard = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ========== すべての State 宣言 ==========
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [players, setPlayers] = useState(['', '', '', '']);
  const [pastPlayerNames, setPastPlayerNames] = useState([]);
  const [currentGameScore, setCurrentGameScore] = useState({
    rank1: '',
    rank2: '',
    rank3: '',
    rank4: ''
  });
  const [basicDate, setBasicDate] = useState('');
  const [chipDistribution, setChipDistribution] = useState('');
  const [chipRow, setChipRow] = useState({
    rank1: '',
    rank2: '',
    rank3: '',
    rank4: ''
  });

 // ========== useEffect ==========
  
  // 認証状態監視の useEffect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // ユーザーがログインしていない場合はログインページにリダイレクト
        navigate('/login');
      }
      setLoading(false);
    });
    
    // クリーンアップ関数
    return () => unsubscribe();
  }, [auth, navigate]);
  
  // Firestore からユーザーのグループデータを取得する useEffect
  useEffect(() => {
    if (!user) return;
  
    const fetchGroups = async () => {
      try {
        // ユーザーIDに基づいてグループを取得
        const q = query(collection(db, "groups"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log("グループデータが見つかりません");
          setGroups([]);
          setLoading(false);
          return;
        }
        
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
          data.settings = data.settings || { ...settings };
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
      } finally {
        setLoading(false);
      }
    };
  
    fetchGroups();
  }, [user]);
  
  // currentGroupが変更された時に関連ステートを同期するuseEffect
  useEffect(() => {
    if (currentGroup) {
      // players ステートを同期
      setPlayers(currentGroup.players || ['', '', '', '']);
      
      // chipRow ステートを同期
      setChipRow(currentGroup.chipRow || {
        rank1: '',
        rank2: '',
        rank3: '',
        rank4: ''
      });
      
      // 基本情報を同期
      setBasicDate(currentGroup.date || '');
      setChipDistribution(currentGroup.settings?.chipDistribution || '');
    }
  }, [currentGroup]);

  // ========== Functions ==========

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error("ログアウトエラー:", err);
    }
  };

  // Firestore へのデータ保存関連
  const saveGroupToFirebase = async (groupData) => {
    if (!user) return;
    
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
      if (currentGroup && currentGroup.id === groupData.id) {
        setCurrentGroup(updatedGroupData);
      }
      
      console.log("グループ保存, id=", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("グループ保存エラー:", error);
      return null;
    }
  };

  async function updateGroupInFirebase(groupData) {
    if (!user) return;
    
    try {
      // docIdが存在する場合はそれを使用、それ以外はidをstring化して使用
      const docId = groupData.docId || String(groupData.id);
      const docRef = doc(db, "groups", docId);
      
      // docIdはFirestoreのフィールドとしては保存しない
      const { docId: _, ...dataToSave } = groupData;
      
      await updateDoc(docRef, dataToSave);
      console.log("グループ更新:", groupData.id);
      return true;
    } catch (error) {
      console.error("グループ更新エラー:", error);
      return false;
    }
  }
  
  const saveGameResultToFirebase = async (updatedGroup) => {
    return await updateGroupInFirebase(updatedGroup);
  };

  // 新規グループ作成
  const createNewGroup = () => {
    if (!user) return; // ユーザーがログインしていない場合は処理を行わない
    
    const newGroup = {
      id: Date.now(),
      userId: user.uid, // ユーザーIDを保存
      name: "グループ名未設定",
      date: "",
      settings: { ...settings, chipDistribution },
      players: ['', '', '', ''],
      games: [],
      finalStats: {},
      chipRow: {},
      rankingCounts: {} // 順位集計も初期化
    };
    setGroups(prev => [...prev, newGroup]);
    setCurrentGroup(newGroup);
    saveGroupToFirebase(newGroup);
  };

  // 半荘結果を追加
  const addGameScore = () => {
    const { rank1, rank2, rank3, rank4 } = currentGameScore;
    if (!currentGroup || [rank1, rank2, rank3, rank4].some(v => v === '')) return;
  
    // 持ち点から最終スコアを計算
    const finalScoresObj = calculateFinalScoresFromInputs(currentGameScore);
    const finalScores = {
      rank1: finalScoresObj[0],
      rank2: finalScoresObj[1],
      rank3: finalScoresObj[2],
      rank4: finalScoresObj[3]
    };
  
    const newGame = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      inputScores: {
        rank1: Number(rank1),
        rank2: Number(rank2),
        rank3: Number(rank3),
        rank4: Number(rank4)
      },
      finalScores
    };
  
    // 🔹 順位回数を更新する処理をここで追加
    const updatedRankingCounts = { ...currentGroup.rankingCounts } || {};
  
    const sortedPlayers = Object.keys(finalScores)
      .map((key, index) => ({
        player: players[index],
        score: finalScores[key]
      }))
      .sort((a, b) => b.score - a.score);
  
    sortedPlayers.forEach((player, index) => {
      if (!updatedRankingCounts[player.player]) {
        updatedRankingCounts[player.player] = { "1位": 0, "2位": 0, "3位": 0, "4位": 0 };
      }
      updatedRankingCounts[player.player][`${index + 1}位`] += 1;
    });
  
    // グループ更新
    const updatedGroup = {
      ...currentGroup,
      games: [...currentGroup.games, newGame],
      rankingCounts: updatedRankingCounts
    };
  
    // 再集計
    updatedGroup.finalStats = recalcFinalStats(updatedGroup);
  
    // state & Firestore に反映
    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
    saveGameResultToFirebase(updatedGroup);
  
    // 入力欄クリア
    setCurrentGameScore({ rank1: '', rank2: '', rank3: '', rank4: '' });
  };

  // ゲーム結果をテーブル上で編集（最終スコアを変更）
  const handleEditGameScore = (gameId, rankKey, newValue) => {
    const updatedGames = currentGroup.games.map(game => {
      if (game.id === gameId) {
        return {
          ...game,
          finalScores: {
            ...game.finalScores,
            [rankKey]: Number(newValue)
          }
        };
      }
      return game;
    });

    const updatedGroup = {
      ...currentGroup,
      games: updatedGames
    };
    updatedGroup.finalStats = recalcFinalStats(updatedGroup);

    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
    updateGroupInFirebase(updatedGroup);
  };

  // ゲーム削除
  const handleDeleteGame = (gameId) => {
    const updatedGames = currentGroup.games.filter(game => game.id !== gameId);
    const updatedGroup = { ...currentGroup, games: updatedGames };
    updatedGroup.finalStats = recalcFinalStats(updatedGroup);

    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
    updateGroupInFirebase(updatedGroup);
  };

  // チップ入力変更 → グループにも保存して再集計
  const handleChipChange = (rankKey, newValue) => {
    // 1) ローカル state を更新
    setChipRow({ ...chipRow, [rankKey]: newValue });

    // 2) グループにも反映
    const updatedGroup = { ...currentGroup };
    if (!updatedGroup.chipRow) {
      updatedGroup.chipRow = {};
    }
    updatedGroup.chipRow[rankKey] = newValue;

    // 3) 再集計
    updatedGroup.finalStats = recalcFinalStats(updatedGroup);

    // 4) state & DB を更新
    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
    updateGroupInFirebase(updatedGroup);
  };

  // ローディング中の表示
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl font-semibold text-gray-700">読み込み中...</div>
      </div>
    );
  }

  // ユーザーが認証されていない場合
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-xl font-semibold text-gray-700">ログインが必要です</div>
          <button 
            onClick={() => navigate('/login')}
            className="rounded-md bg-indigo-600 px-4 py-2 text-base font-medium text-white transition duration-150 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            ログインページへ
          </button>
        </div>
      </div>
    );
  }

  if (analysisMode) {
    return <Analysis groups={groups} onClose={() => setAnalysisMode(false)} />;
  }

  if (!currentGroup) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">麻雀スコア計算アプリ - トップページ</h1>
        
        <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">新しいグループ作成</h2>
          <button 
            onClick={createNewGroup}
            className="rounded-md bg-indigo-600 px-4 py-2 text-base font-medium text-white transition duration-150 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            グループ作成
          </button>
        </div>
        
        {groups.length > 0 && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">既存グループ一覧</h2>
            <ul className="space-y-2">
              {groups.map(g => (
                <li key={g.id}>
                  <button 
                    onClick={() => {
                      const updatedGroup = { ...g };
                      updatedGroup.finalStats = recalcFinalStats(updatedGroup);
                      setCurrentGroup(updatedGroup);
                      setPlayers(updatedGroup.players || ['', '', '', '']);
                      setChipRow(updatedGroup.chipRow || {
                        rank1: '',
                        rank2: '',
                        rank3: '',
                        rank4: ''
                      });
                      setBasicDate(updatedGroup.date || '');
                      setChipDistribution(updatedGroup.settings?.chipDistribution || '');
                    }}
                    className="w-full rounded-md bg-gray-100 px-4 py-2 text-left text-base font-medium text-gray-700 transition duration-150 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    {g.name || "名称未設定グループ"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">データ分析</h2>
          <button 
            onClick={() => setAnalysisMode(true)}
            className="rounded-md bg-green-600 px-4 py-2 text-base font-medium text-white transition duration-150 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            集計
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      {/* ヘッダー */}
      <header className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <button 
          onClick={handleLogout}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition duration-150 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          ログアウト
        </button>
      </header>
      
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => setCurrentGroup(null)}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          トップページに戻る
        </button>
        <h2 className="text-xl font-bold text-indigo-600">{currentGroup.name || "名称未設定グループ"}</h2>
      </div>
      
      <div className="space-y-6">
        {/* 基本情報セクション */}
        <PlayerSettings 
          basicDate={basicDate}
          setBasicDate={setBasicDate}
          players={players}
          setPlayers={setPlayers}
          pastPlayerNames={pastPlayerNames}
          currentGroup={currentGroup}
          setCurrentGroup={setCurrentGroup}
          groups={groups}
          setGroups={setGroups}
          updateGroupInFirebase={updateGroupInFirebase}
        />
        
        {/* 半荘設定セクション */}
        <ChipSettings 
          chipDistribution={chipDistribution}
          setChipDistribution={setChipDistribution}
          currentGroup={currentGroup}
          setCurrentGroup={setCurrentGroup}
          groups={groups}
          setGroups={setGroups}
          updateGroupInFirebase={updateGroupInFirebase}
        />
        
        {/* 半荘結果入力フォーム */}
        <GameInputForm 
          players={players}
          currentGameScore={currentGameScore}
          setCurrentGameScore={setCurrentGameScore}
          addGameScore={addGameScore}
        />
        
        {/* ゲーム結果履歴テーブル */}
        <GameResultsTable 
          currentGroup={currentGroup}
          players={players}
          chipRow={chipRow}
          handleEditGameScore={handleEditGameScore}
          handleDeleteGame={handleDeleteGame}
          handleChipChange={handleChipChange}
        />
      </div>
    </div>
  );
};

export default Dashboard;