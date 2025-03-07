// src/Dashboard.jsx
import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import Analysis from './Analysis';

// 固定設定：初期持ち点25,000点、返し点30,000点、順位点 [30, 10, -10, -30]
const settings = {
  initialPoints: 25000,
  returnPoints: 30000,
  rankPoints: [30, 10, -10, -30]
};

// 「五捨六入」：入力された持ち点を下3桁で丸め、千点単位の整数値として返す
function roundScore(score) {
  if (isNaN(score)) return 0;
  const remainder = score % 1000;
  if (remainder === 0) return score / 1000;
  const hundredDigit = Math.floor(remainder / 100);
  const base = Math.floor(score / 1000);
  return hundredDigit >= 6 ? base + 1 : base;
}

/**
 * calculateFinalScoresFromInputs:
 * 入力された各プレイヤーの持ち点から、持ち点の高低順に順位を決定し、
 * 各順位に応じた最終スコアを算出する関数。
 * 1位は他の合計の符号反転、非1位は順位点 - 差分を計算する。
 * 結果はオブジェクト { [playerIndex]: score, ... } を返す。
 */
function calculateFinalScoresFromInputs(inputs) {
  const arr = Object.keys(inputs).map(key => {
    const index = Number(key.replace('rank', '')) - 1;
    return { index, score: Number(inputs[key]) };
  });
  arr.sort((a, b) => b.score - a.score);
  const result = {};
  for (let pos = 1; pos < arr.length; pos++) {
    const diff = (settings.returnPoints - roundScore(arr[pos].score) * 1000) / 1000;
    result[arr[pos].index] = settings.rankPoints[pos] - diff;
  }
  const sumOthers = arr.slice(1).reduce((sum, item, pos) => {
    const diff = (settings.returnPoints - roundScore(item.score) * 1000) / 1000;
    return sum + (settings.rankPoints[pos + 1] - diff);
  }, 0);
  result[arr[0].index] = -sumOthers;
  return result;
}

/**
 * recalcFinalStats:
 * グループの games 配列から各プレイヤーごとの集計を再計算し、
 * finalStats を返す。finalStats の形は
 * { [playerName]: { finalResult, chipBonus, halfResult } } 。
 * ここでは、各ゲームの finalScores を単純合算する。
 */
function recalcFinalStats(group) {
  const stats = {};
  group.players.forEach((p) => {
    if (p.trim()) {
      stats[p.trim()] = { finalResult: 0, chipBonus: 0, halfResult: 0 };
    }
  });
  group.games.forEach((game) => {
    group.players.forEach((p, index) => {
      const key = p.trim();
      if (key && game.finalScores) {
        const rankKey = `rank${index + 1}`;
        const score = game.finalScores[rankKey] || 0;
        stats[key].finalResult += score;
      }
    });
  });
  Object.keys(stats).forEach((p) => {
    stats[p].halfResult = stats[p].finalResult - stats[p].chipBonus;
  });
  return stats;
}

/**
 * calculateFinalOverallTotals:
 * 現在のグループの finalStats から、各プレイヤーの最終結果（半荘結果合計 + チップボーナス）を
 * 配列で返す。chipRow, chipDistribution から各列のチップボーナスを算出して加算します。
 */
function calculateFinalOverallTotals(currentGroup, players, chipRow, chipDistribution) {
  if (!currentGroup || !currentGroup.finalStats) return players.map(() => 0);
  return players.map((p, i) => {
    const key = p.trim();
    const base = key && currentGroup.finalStats[key] ? currentGroup.finalStats[key].finalResult : 0;
    const rankKey = `rank${i + 1}`;
    const chipInput = chipRow[rankKey] !== '' ? Number(chipRow[rankKey]) : 20;
    const distribution = chipDistribution !== '' ? Number(chipDistribution) : 0;
    const bonus = - (distribution * (20 - chipInput)) / 100;
    return base + bonus;
  });
}

const Dashboard = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error("ログアウトエラー:", err);
    }
  };

  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [players, setPlayers] = useState(['', '', '', '']);
  const [currentGameScore, setCurrentGameScore] = useState({
    rank1: '',
    rank2: '',
    rank3: '',
    rank4: ''
  });
  const [basicDate, setBasicDate] = useState('');
  const [chipDistribution, setChipDistribution] = useState('');
  const [chipRow, setChipRow] = useState({ rank1: '', rank2: '', rank3: '', rank4: '' });

  // Firestore へのデータ保存関連
  const saveGroupToFirebase = async (groupData) => {
    try {
      const docRef = await addDoc(collection(db, "groups"), groupData);
      console.log("グループ保存, id=", docRef.id);
    } catch (error) {
      console.error("グループ保存エラー:", error);
    }
  };

  async function updateGroupInFirebase(groupData) {
    try {
      const docRef = doc(collection(db, "groups"), String(groupData.id));
      await updateDoc(docRef, groupData);
      console.log("グループ更新:", groupData.id);
    } catch (error) {
      console.error("グループ更新エラー:", error);
    }
  }

  const saveGameResultToFirebase = async (updatedGroup) => {
    await updateGroupInFirebase(updatedGroup);
  };

  const createNewGroup = () => {
    const newGroup = {
      id: Date.now(),
      name: "グループ名未設定",
      date: "",
      settings: { ...settings, chipDistribution },
      players: [...players],
      games: [],
      finalStats: {}
    };
    setGroups(prev => [...prev, newGroup]);
    setCurrentGroup(newGroup);
    saveGroupToFirebase(newGroup);
  };

  const addGameScore = () => {
    const { rank1, rank2, rank3, rank4 } = currentGameScore;
    if (!currentGroup || [rank1, rank2, rank3, rank4].some(v => v === '')) return;
    
    const finalScoresObj = calculateFinalScoresFromInputs(currentGameScore);
    const finalScores = {
      rank1: Number(finalScoresObj[0].toFixed(1)),
      rank2: Number(finalScoresObj[1].toFixed(1)),
      rank3: Number(finalScoresObj[2].toFixed(1)),
      rank4: Number(finalScoresObj[3].toFixed(1))
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

    const updatedGroup = {
      ...currentGroup,
      games: [...currentGroup.games, newGame]
    };
    updatedGroup.finalStats = recalcFinalStats(updatedGroup);

    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
    saveGameResultToFirebase(updatedGroup);

    setCurrentGameScore({ rank1: '', rank2: '', rank3: '', rank4: '' });
  };

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
    const updatedGroup = { ...currentGroup, games: updatedGames };
    updatedGroup.finalStats = recalcFinalStats(updatedGroup);
    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
    updateGroupInFirebase(updatedGroup);
  };

  const handleDeleteGame = (gameId) => {
    const updatedGames = currentGroup.games.filter(game => game.id !== gameId);
    const updatedGroup = { ...currentGroup, games: updatedGames };
    updatedGroup.finalStats = recalcFinalStats(updatedGroup);
    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
    updateGroupInFirebase(updatedGroup);
  };

  const calculateTotals = () => {
    if (!currentGroup || !currentGroup.games.length) return null;
    const totals = currentGroup.games.reduce((acc, game) => {
      game.finalScores &&
        Object.keys(game.finalScores).forEach((key, idx) => {
          if (!acc[idx]) acc[idx] = 0;
          acc[idx] += game.finalScores[key] * 1000;
        });
      return acc;
    }, []);
    return totals.map(total => roundScore(total));
  };

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
                    onClick={() => setCurrentGroup(g)}
                    className="w-full rounded-md bg-gray-100 px-4 py-2 text-left text-base font-medium text-gray-700 transition duration-150 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    {g.name}
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
      {/* ヘッダー部分 */}
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
        <h2 className="text-xl font-bold text-indigo-600">{currentGroup.name}</h2>
      </div>
      
      <div className="space-y-6">
        {/* 基本情報セクション */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">基本情報</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              日付
              <input
                type="date"
                value={basicDate}
                onChange={(e) => {
                  setBasicDate(e.target.value);
                  const updatedGroup = { ...currentGroup, date: e.target.value, name: e.target.value };
                  setCurrentGroup(updatedGroup);
                  setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
                  updateGroupInFirebase(updatedGroup);
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </label>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {players.map((p, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700">
                  プレイヤー{index + 1}
                  <input
                    type="text"
                    value={players[index]}
                    onChange={(e) => {
                      const newPlayers = [...players];
                      newPlayers[index] = e.target.value;
                      setPlayers(newPlayers);
                      const updatedGroup = { ...currentGroup, players: newPlayers };
                      setCurrentGroup(updatedGroup);
                      setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
                      updateGroupInFirebase(updatedGroup);
                    }}
                    placeholder="名前を入力"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* 半荘設定セクション */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">半荘設定</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              チップ配点
              <input
                type="number"
                value={chipDistribution}
                onChange={(e) => {
                  setChipDistribution(e.target.value);
                  const updatedGroup = { ...currentGroup, settings: { ...currentGroup.settings, chipDistribution: e.target.value } };
                  setCurrentGroup(updatedGroup);
                  setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
                  updateGroupInFirebase(updatedGroup);
                }}
                placeholder="例: 300"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </label>
          </div>
        </div>
        
        {/* 半荘結果入力フォーム */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">半荘結果入力</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {players.map((p, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700">
                  {p.trim() ? `${p}の持ち点` : `プレイヤー${index + 1}の持ち点`}
                  <input
                    type="number"
                    value={currentGameScore[`rank${index + 1}`]}
                    onChange={(e) =>
                      setCurrentGameScore({
                        ...currentGameScore,
                        [`rank${index + 1}`]: e.target.value
                      })
                    }
                    placeholder="例: 60000"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </label>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <button 
              onClick={addGameScore}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-base font-medium text-white transition duration-150 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              半荘結果を追加
            </button>
          </div>
        </div>
        
        {/* ゲーム結果履歴テーブル */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">ゲーム結果履歴</h2>
          {currentGroup.games && currentGroup.games.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">半荘</th>
                    {players.map((p, idx) => (
                      <th key={idx} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {p || `プレイヤー${idx + 1}`}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {currentGroup.games.map((game, idx) => (
                    <tr key={game.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">
                        {idx + 1}
                      </td>
                      {["rank1", "rank2", "rank3", "rank4"].map((r) => (
                        <td key={r} className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                          <input
                            type="number"
                            value={game.finalScores[r]}
                            onChange={(e) => handleEditGameScore(game.id, r, e.target.value)}
                            className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                          />
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
                        <button 
                          onClick={() => handleDeleteGame(game.id)}
                          className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* チップ入力行 */}
                  <tr className="bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">チップ</td>
                    {["rank1", "rank2", "rank3", "rank4"].map((r) => (
                      <td key={r} className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                        <input
                          type="number"
                          value={chipRow[r]}
                          onChange={(e) =>
                            setChipRow({ ...chipRow, [r]: e.target.value })
                          }
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-6 py-4"></td>
                  </tr>
                  {/* チップボーナス行 */}
                  <tr className="bg-indigo-50">
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">チップボーナス</td>
                    {["rank1", "rank2", "rank3", "rank4"].map((r) => {
                      const chipInput = chipRow[r] !== '' ? Number(chipRow[r]) : 20;
                      const distribution = chipDistribution !== '' ? Number(chipDistribution) : 0;
                      const bonus = - (distribution * (20 - chipInput)) / 100;
                      return (
                        <td key={r} className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-indigo-600">
                          {bonus.toLocaleString()}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-6 py-4"></td>
                  </tr>
                  {/* 最終結果行：半荘結果合計とチップボーナス合計の合算 */}
                  <tr className="bg-indigo-100">
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-bold text-gray-900">最終結果</td>
                    {calculateTotals() &&
                      calculateFinalOverallTotals(currentGroup, players, chipRow, chipDistribution).map((total, idx) => (
                        <td key={idx} className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">
                          {total.toLocaleString()}
                        </td>
                      ))}
                    <td className="whitespace-nowrap px-6 py-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-gray-500">
              まだ半荘結果がありません。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
