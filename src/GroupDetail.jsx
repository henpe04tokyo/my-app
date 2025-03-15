// GroupDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from './firebase';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  addDoc
} from 'firebase/firestore';

// スコア計算関連の関数をインポート
import {
  calculateFinalScoresFromInputs,
  recalcFinalStats,
  settings
} from './utils/scoreCalculation';

// サブコンポーネントをインポート
import PlayerSettings from './components/Dashboard/PlayerSettings';
import ChipSettings from './components/Dashboard/ChipSettings';
import GameInputForm from './components/Dashboard/GameInputForm';
import GameResultsTable from './components/Dashboard/GameResultsTable';

function GroupDetail() {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // グループデータと関連するステート
  const [group, setGroup] = useState(null);
  const [players, setPlayers] = useState(['', '', '', '']);
  const [games, setGames] = useState([]);
  
  // プレイヤー設定関連
  const [basicDate, setBasicDate] = useState('');
  const [pastPlayerNames, setPastPlayerNames] = useState([]);
  
  // チップ設定関連
  const [chipDistribution, setChipDistribution] = useState('');
  const [rankPointOption, setRankPointOption] = useState('10-30');
  const [chipRow, setChipRow] = useState({
    rank1: '',
    rank2: '',
    rank3: '',
    rank4: ''
  });
  
  // ゲーム入力関連
  const [currentGameScore, setCurrentGameScore] = useState({
    rank1: '',
    rank2: '',
    rank3: '',
    rank4: ''
  });

  function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
 // useEffect内の日付設定部分を修正
useEffect(() => {
  const fetchGroupData = async () => {
    try {
      setLoading(true);
      
      // Firestore からグループデータを取得
      const groupRef = doc(db, "groups", groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) {
        setError("グループが見つかりません");
        setLoading(false);
        return;
      }
      
      // グループデータを取得して状態を更新
      const groupData = { ...groupSnap.data(), id: groupId, docId: groupId };
      
      console.log("取得したグループデータ:", groupData);
      
      // グループデータを設定
      setGroup(groupData);
      
      // 関連する状態を更新
      if (groupData.players) {
        setPlayers(groupData.players);
      }
      
      // 日付の設定 - もし日付がなければ今日の日付をセット
      if (groupData.date) {
        setBasicDate(groupData.date);
      } else {
        const today = getTodayDate();
        setBasicDate(today);
        
        // グループデータにも日付を追加して更新
        groupData.date = today;
        groupData.name = groupData.name || today;
        
        // Firestoreを更新
        const docRef = doc(db, "groups", groupId);
        await updateDoc(docRef, {
          date: today,
          name: groupData.name
        });
      }
      
      if (groupData.settings) {
        if (groupData.settings.chipDistribution) {
          setChipDistribution(groupData.settings.chipDistribution);
        }
        if (groupData.settings.rankPointOption) {
          setRankPointOption(groupData.settings.rankPointOption);
        }
      }
      
      if (groupData.chipRow) {
        setChipRow(groupData.chipRow || {
          rank1: '',
          rank2: '',
          rank3: '',
          rank4: ''
        });
      }
      
      // ゲームデータを設定
      if (Array.isArray(groupData.games)) {
        setGames(groupData.games);
      }
      
      // 読み込み完了
      setLoading(false);
    } catch (err) {
      console.error("グループデータ取得エラー:", err);
      setError("データの読み込み中にエラーが発生しました");
      setLoading(false);
    }
  };
  
  fetchGroupData();
}, [groupId]);

 // GroupDetail.jsx - ハンドルAddGame関数の実装部分

// 半荘結果をFirebaseに追加
const handleAddGame = () => {
  // 入力値の検証
  if (!currentGameScore || [currentGameScore.rank1, currentGameScore.rank2, currentGameScore.rank3, currentGameScore.rank4].some(v => v === '')) {
    console.error("スコアが入力されていません");
    return;
  }

  // 現在のグループの設定から順位点を取得
  const rankPoints = group.settings?.rankPoints || [0, 10, -10, -30];
  console.log("使用する順位点:", rankPoints); // デバッグ用

  // 持ち点から最終スコアを計算 - 正しい rankPoints を渡す
  const finalScoresObj = calculateFinalScoresFromInputs(currentGameScore, rankPoints);
  const finalScores = {
    rank1: finalScoresObj[0],
    rank2: finalScoresObj[1],
    rank3: finalScoresObj[2],
    rank4: finalScoresObj[3]
  };

  // 新しいゲームオブジェクトを作成
  const newGame = {
    id: Date.now(), // 一意のID
    createdAt: new Date().toISOString(),
    inputScores: {
      rank1: Number(currentGameScore.rank1),
      rank2: Number(currentGameScore.rank2),
      rank3: Number(currentGameScore.rank3),
      rank4: Number(currentGameScore.rank4)
    },
    finalScores
  };

  // 順位回数を更新
  const updatedRankingCounts = { ...group.rankingCounts } || {};

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

  // ローカルステートでグループを更新
  const updatedGames = [...(group.games || []), newGame];
  const updatedGroup = {
    ...group,
    games: updatedGames,
    rankingCounts: updatedRankingCounts
  };

  // 再集計
  updatedGroup.finalStats = recalcFinalStats(updatedGroup);

  // ステートと Firebase を更新
  setGroup(updatedGroup);
  setGames(updatedGames);
  updateGroupInFirebase(updatedGroup);

  // 入力欄クリア
  setCurrentGameScore({ rank1: '', rank2: '', rank3: '', rank4: '' });
  
  console.log("ゲームを追加しました:", newGame);
};

// Firestore でグループを更新
const updateGroupInFirebase = async (groupData) => {
  try {
    const docId = groupData.docId || String(groupData.id);
    const docRef = doc(db, "groups", docId);
    
    // docIdはFirestoreのフィールドとしては保存しない
    const { docId: _, ...dataToSave } = groupData;
    
    await updateDoc(docRef, dataToSave);
    console.log("グループ更新:", groupData.id);
  } catch (error) {
    console.error("グループ更新エラー:", error);
  }
};

// GroupDetail.jsx - ゲーム結果の編集・削除機能

// ゲーム結果を編集
const handleEditGameScore = (gameId, rankKey, newValue) => {
  const updatedGames = group.games.map(game => {
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
    ...group,
    games: updatedGames
  };
  updatedGroup.finalStats = recalcFinalStats(updatedGroup);

  setGroup(updatedGroup);
  setGames(updatedGames);
  updateGroupInFirebase(updatedGroup);
  
  console.log("ゲームスコアを編集しました:", gameId, rankKey, newValue);
};

// ゲーム削除
const handleDeleteGame = (gameId) => {
  // 削除確認（オプション）
  if (!window.confirm('このゲーム結果を削除してもよろしいですか？')) {
    return;
  }

  const updatedGames = group.games.filter(game => game.id !== gameId);
  const updatedGroup = { ...group, games: updatedGames };
  
  // ランキングカウントの再計算
  const updatedRankingCounts = {};
  
  // 各プレイヤーの初期化
  players.forEach(player => {
    if (player && player.trim()) {
      updatedRankingCounts[player] = { "1位": 0, "2位": 0, "3位": 0, "4位": 0 };
    }
  });
  
  // 残りのゲームから順位カウントを再集計
  updatedGames.forEach(game => {
    const sortedPlayers = Object.keys(game.finalScores)
      .map((key, index) => ({
        player: players[index],
        score: game.finalScores[key]
      }))
      .sort((a, b) => b.score - a.score);
      
    sortedPlayers.forEach((player, index) => {
      if (!player.player || !player.player.trim()) return;
      if (!updatedRankingCounts[player.player]) {
        updatedRankingCounts[player.player] = { "1位": 0, "2位": 0, "3位": 0, "4位": 0 };
      }
      updatedRankingCounts[player.player][`${index + 1}位`] += 1;
    });
  });
  
  updatedGroup.rankingCounts = updatedRankingCounts;
  updatedGroup.finalStats = recalcFinalStats(updatedGroup);

  setGroup(updatedGroup);
  setGames(updatedGames);
  updateGroupInFirebase(updatedGroup);
  
  console.log("ゲームを削除しました:", gameId);
};

  const handleChipChange = (rankKey, newValue) => {
    console.log("チップを変更します:", rankKey, newValue);
    // ここに実装を追加
  };

  // 暫定的なレンダリング
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl font-semibold text-gray-700">読み込み中...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="text-xl font-semibold text-red-600">{error}</div>
        <button
          onClick={() => navigate('/')}
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          ホームに戻る
        </button>
      </div>
    );
  }
  
  if (!group) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="text-xl font-semibold text-gray-700">グループが見つかりません</div>
        <button
          onClick={() => navigate('/')}
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      {/* ヘッダー */}
      <header className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">グループ詳細</h1>
        <button
          onClick={() => navigate('/')}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition duration-150 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          ホームに戻る
        </button>
      </header>
      
      <h2 className="mb-4 text-xl font-bold text-indigo-600">{group.name || "名称未設定グループ"}</h2>
      
      <div className="space-y-6">
        {/* PlayerSettings コンポーネント */}
        <PlayerSettings 
          basicDate={basicDate}
          setBasicDate={setBasicDate}
          players={players}
          setPlayers={setPlayers}
          pastPlayerNames={pastPlayerNames}
          currentGroup={group}
          setCurrentGroup={setGroup}
          groups={[group]}
          setGroups={() => {}} // 単一グループなのでダミー関数
          updateGroupInFirebase={updateGroupInFirebase}
        />
        
        {/* ChipSettings コンポーネント */}
        <ChipSettings 
          chipDistribution={chipDistribution}
          setChipDistribution={setChipDistribution}
          rankPointOption={rankPointOption}
          setRankPointOption={setRankPointOption}
          currentGroup={group}
          setCurrentGroup={setGroup}
          groups={[group]}
          setGroups={() => {}} // 単一グループなのでダミー関数
          updateGroupInFirebase={updateGroupInFirebase}
        />
        
        {/* GameInputForm コンポーネント */}
        <GameInputForm 
          players={players}
          currentGameScore={currentGameScore}
          setCurrentGameScore={setCurrentGameScore}
          addGameScore={handleAddGame}
        />
        
        {/* GameResultsTable コンポーネント */}
        <GameResultsTable 
          currentGroup={group}
          players={players}
          chipRow={chipRow}
          handleEditGameScore={handleEditGameScore}
          handleDeleteGame={handleDeleteGame}
          handleChipChange={handleChipChange}
        />
      </div>
    </div>
  );
}

export default GroupDetail;