// src/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { collection, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from './firebase';
import Analysis from './Analysis';
import { settings, calculateFinalScoresFromInputs, recalcFinalStats } from './utils/scoreCalculation';
import GameInputForm from './components/Dashboard/GameInputForm';
import GameResultsTable from './components/Dashboard/GameResultsTable';
import PlayerSettings from './components/Dashboard/PlayerSettings';
import ChipSettings from './components/Dashboard/ChipSettings';

// グループ詳細コンポーネント
const GroupDetail = ({ 
  groups, setGroups, currentGroup, setCurrentGroup, 
  players, setPlayers, pastPlayerNames,
  basicDate, setBasicDate,
  chipDistribution, setChipDistribution,
  rankPointOption, setRankPointOption,
  currentGameScore, setCurrentGameScore,
  chipRow, setChipRow,
  updateGroupInFirebase, navigate
}) => {
  
// addGameScore 関数の修正部分
const addGameScore = () => {
  const { rank1, rank2, rank3, rank4 } = currentGameScore;
  if (!currentGroup || [rank1, rank2, rank3, rank4].some(v => v === '')) return;

  // 現在のグループの順位点設定を取得
  const rankPoints = currentGroup.settings?.rankPoints || [0, 10, -10, -30];

  // 持ち点から最終スコアを計算 - ここで正しい rankPoints を渡す
  const finalScoresObj = calculateFinalScoresFromInputs(currentGameScore, rankPoints);
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

  // 順位回数を更新
  const updatedRankingCounts = { ...currentGroup.rankingCounts } || {};

  // プレイヤーと最終スコアをマッピングした配列を作成
  const sortedPlayers = Object.keys(finalScores)
    .map((key, index) => ({
      player: players[index],
      score: finalScores[key]
    }))
    .sort((a, b) => b.score - a.score);

  // 得点に基づいて順位を決定し、rankingCounts を更新
  sortedPlayers.forEach((player, index) => {
    if (!player.player || !player.player.trim()) return; // 空のプレイヤー名はスキップ
    
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
  updateGroupInFirebase(updatedGroup);

  // 入力欄クリア
  setCurrentGameScore({ rank1: '', rank2: '', rank3: '', rank4: '' });
};

  // ゲーム結果を編集
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

  // チップ入力変更
  const handleChipChange = (rankKey, newValue) => {
    // ローカル state を更新
    setChipRow({ ...chipRow, [rankKey]: newValue });

    // グループにも反映
    const updatedGroup = { ...currentGroup };
    if (!updatedGroup.chipRow) {
      updatedGroup.chipRow = {};
    }
    updatedGroup.chipRow[rankKey] = newValue;

    // 再集計
    updatedGroup.finalStats = recalcFinalStats(updatedGroup);

    // state & DB を更新
    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
    updateGroupInFirebase(updatedGroup);
  };

  if (!currentGroup) return <div>Loading...</div>;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      {/* ヘッダー */}
      <header className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <button 
          onClick={() => navigate('/')}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition duration-150 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          ホームに戻る
        </button>
      </header>
      
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          グループ一覧に戻る
        </button>
        <h2 className="text-xl font-bold text-indigo-600">{currentGroup.name || "名称未設定グループ"}</h2>
      </div>
      
      <div className="space-y-6">
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
        
        <ChipSettings 
          chipDistribution={chipDistribution}
          setChipDistribution={setChipDistribution}
          rankPointOption={rankPointOption}
          setRankPointOption={setRankPointOption}
          currentGroup={currentGroup}
          setCurrentGroup={setCurrentGroup}
          groups={groups}
          setGroups={setGroups}
          updateGroupInFirebase={updateGroupInFirebase}
        />
        
        <GameInputForm 
          players={players}
          currentGameScore={currentGameScore}
          setCurrentGameScore={setCurrentGameScore}
          addGameScore={addGameScore}
        />
        
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

// メインのDashboardコンポーネント
const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { groupId } = useParams();
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ========== すべての State 宣言 ==========
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
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
  const [rankPointOption, setRankPointOption] = useState('10-30');
  const [chipRow, setChipRow] = useState({
    rank1: '',
    rank2: '',
    rank3: '',
    rank4: ''
  });

  // ========== useEffect ==========
  
  // 認証状態監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // ユーザーがログインしていない場合はログインページにリダイレクト
        navigate('/login');
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [auth, navigate]);
  
  // Firestore からデータ取得
  useEffect(() => {
    if (!user) return;
  
    const fetchGroups = async () => {
      try {
        // 最初にロード状態を設定
        setLoading(true);
        
        const q = query(collection(db, "groups"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        const groupsData = [];
        const allNames = new Set();
  
        querySnapshot.forEach((doc) => {
          const data = { ...doc.data(), docId: doc.id };
          const id = isNaN(data.id) ? data.id : Number(data.id);
          
          if (!Array.isArray(data.games)) {
            data.games = data.games || [];
          }
          
          data.players = data.players || ['', '', '', ''];
          data.settings = data.settings || { ...settings };
          data.chipRow = data.chipRow || {};
          
          const groupData = { ...data, id };
          groupData.finalStats = recalcFinalStats(groupData);
          
          groupsData.push(groupData);
          
          const players = data.players || [];
          players.forEach(name => {
            if (name && name.trim()) {
              allNames.add(name.trim());
            }
          });
        });
        
        console.log("取得したグループデータ:", groupsData);
        
        setGroups(groupsData);
        setPastPlayerNames(Array.from(allNames));
        
        // 現在のパスが分析画面の場合は、グループID不要でそのまま処理を続ける
        const path = location.pathname;
        const isAnalysisPath = path === '/dashboard/analysis';
        
        // URLのグループIDがある場合、該当グループをセット
        if (groupId) {
          const foundGroup = groupsData.find(g => 
            String(g.id) === String(groupId) || 
            g.docId === groupId
          );
          
          if (foundGroup) {
            setCurrentGroup(foundGroup);
            setPlayers(foundGroup.players || ['', '', '', '']);
            setChipRow(foundGroup.chipRow || {
              rank1: '',
              rank2: '',
              rank3: '',
              rank4: ''
            });
            setBasicDate(foundGroup.date || '');
            setChipDistribution(foundGroup.settings?.chipDistribution || '');
            setRankPointOption(foundGroup.settings?.rankPointOption || '10-30');
          } else {
            console.log(`グループID: ${groupId} が見つかりません。`);
            // グループが見つからない場合は、トップページにリダイレクト
            if (!isAnalysisPath) {
              navigate('/');
            }
          }
        } else if (!isAnalysisPath) {
          // 分析画面でなく、かつグループIDが指定されていない場合はホームページにリダイレクト
          navigate('/');
        }
      } catch (error) {
        console.error("グループデータ取得エラー:", error);
      } finally {
        // 処理完了後にローディング状態を解除
        setLoading(false);
      }
    };
  
    fetchGroups();
  }, [user, groupId, navigate, location.pathname]);

  // ========== Functions ==========

// src/Dashboard.jsx の updateGroupInFirebase 関数を修正

const updateGroupInFirebase = async (groupData) => {
  if (!user) return;
  
  try {
    const docId = groupData.docId || String(groupData.id);
    const docRef = doc(db, "groups", docId);
    
    // docIdはFirestoreのフィールドとしては保存しない
    const { docId: _, ...dataToSave } = groupData;
    
    // 現在のUnixタイムスタンプを追加して、更新日時を記録
    const updatedData = {
      ...dataToSave,
      updatedAt: new Date().toISOString(),
    };
    
    console.log("Firestoreに保存中:", docId, updatedData);
    
    // 更新前に再計算を実行して確実に最新データを保存
    if (updatedData.games && Array.isArray(updatedData.games)) {
      updatedData.finalStats = recalcFinalStats(updatedData);
    }
    
    // Firestoreに保存
    await updateDoc(docRef, updatedData);
    console.log("グループ更新完了:", groupData.id);
    
    // ローカルステートも更新
    const updatedGroups = groups.map(g => 
      (g.id === groupData.id) ? { ...updatedData, docId } : g
    );
    setGroups(updatedGroups);
    
    return true;
  } catch (error) {
    console.error("グループ更新エラー:", error);
    return false;
  }
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

  // 現在のURLに基づいて表示内容を決定
  const renderContent = () => {
    const path = location.pathname;
    
    if (path.startsWith('/dashboard/group/')) {
      return (
        <GroupDetail 
          groups={groups}
          setGroups={setGroups}
          currentGroup={currentGroup}
          setCurrentGroup={setCurrentGroup}
          players={players}
          setPlayers={setPlayers}
          pastPlayerNames={pastPlayerNames}
          basicDate={basicDate}
          setBasicDate={setBasicDate}
          chipDistribution={chipDistribution}
          setChipDistribution={setChipDistribution}
          rankPointOption={rankPointOption}      
          setRankPointOption={setRankPointOption}
          currentGameScore={currentGameScore}
          setCurrentGameScore={setCurrentGameScore}
          chipRow={chipRow}
          setChipRow={setChipRow}
          updateGroupInFirebase={updateGroupInFirebase}
          navigate={navigate}
        />
      );
    }
    
    if (path === '/dashboard/analysis') {
      return <Analysis groups={groups} onClose={() => navigate('/')} />;
    }
    
    // その他のURLはホームにリダイレクト
    navigate('/');
    return null;
  };

  return renderContent();
};

export default Dashboard;