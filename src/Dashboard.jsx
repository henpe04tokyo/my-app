// src/Dashboard.jsx

import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import Analysis from './Analysis';

// --- 固定設定 ---
const settings = {
  initialPoints: 25000,  // 初期持ち点
  returnPoints: 30000,   // 返し点
  rankPoints: [30, 10, -10, -30] // 順位点
};

// --- 「五捨六入」：下3桁で丸め、千点単位で返す関数（必要に応じて利用） ---
function roundScore(score) {
  if (isNaN(score)) return 0;
  const remainder = score % 1000;
  if (remainder === 0) return score / 1000;
  const hundredDigit = Math.floor(remainder / 100);
  const base = Math.floor(score / 1000);
  return hundredDigit >= 6 ? base + 1 : base;
}

/**
 * 入力された各プレイヤーの持ち点 (inputs) から順位を決定し、
 * 最終スコアを算出して返す。
 *  - 1位：他プレイヤーの合計を符号反転した値
 *  - 2~4位：順位点 - (返し点 - 持ち点の千点単位) の差分
 */
function calculateFinalScoresFromInputs(inputs) {
  // inputs例: { rank1: 51000, rank2: 8000, rank3: -15000, rank4: -44000 }
  // ※ マイナスは実際は無いかもしれませんが、ここでは例として。
  
  // オブジェクトを配列に変換し、score の高い順にソート
  const arr = Object.keys(inputs).map(key => {
    const index = Number(key.replace('rank', '')) - 1;
    return { index, score: Number(inputs[key]) };
  });
  arr.sort((a, b) => b.score - a.score);

  // 計算結果を格納するオブジェクト
  const result = {};

  // 1位以外を先に計算
  for (let pos = 1; pos < arr.length; pos++) {
    // 千点単位の差分を計算（例：30000 - 21000 = 9000 → 9.0）
    const diff = (settings.returnPoints - roundScore(arr[pos].score) * 1000) / 1000;
    // 順位点 - diff
    result[arr[pos].index] = settings.rankPoints[pos] - diff;
  }

  // 1位のスコアは「他のプレイヤーの合計を符号反転」
  const sumOthers = arr.slice(1).reduce((sum, item, pos) => {
    const diff = (settings.returnPoints - roundScore(item.score) * 1000) / 1000;
    return sum + (settings.rankPoints[pos + 1] - diff);
  }, 0);
  result[arr[0].index] = -sumOthers;

  // 小数点が出る可能性を排除したい場合、Math.round などで整数化する
  // 今回は整数にしたいので、Number(...) で変換し Math.round を使っておく
  Object.keys(result).forEach((k) => {
    result[k] = Math.round(result[k]);
  });

  return result;
}

/**
 * グループ内の各ゲームの finalScores を合計して、finalStats を作成する関数。
 *  - finalResult: 各プレイヤーの累計最終スコア
 *  - chipBonus, halfResult: 必要に応じて使う
 */
function recalcFinalStats(group) {
  const stats = {};
  // プレイヤー名をキーに初期値をセット
  group.players.forEach((p) => {
    const name = p.trim();
    if (name) {
      stats[name] = { finalResult: 0, chipBonus: 0, halfResult: 0 };
    }
  });

  // 各ゲームの finalScores を合計
  group.games.forEach((game) => {
    if (game.finalScores) {
      for (let i = 1; i <= 4; i++) {
        const rankKey = `rank${i}`;
        const playerName = group.players[i - 1]?.trim();
        if (playerName && typeof game.finalScores[rankKey] === 'number') {
          stats[playerName].finalResult += game.finalScores[rankKey];
        }
      }
    }
  });

  // halfResult = finalResult - chipBonus（現状 chipBonus は未使用）
  Object.keys(stats).forEach((name) => {
    stats[name].halfResult = stats[name].finalResult - stats[name].chipBonus;
  });

  return stats;
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

  // -------------------------
  // ステート管理
  // -------------------------
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [analysisMode, setAnalysisMode] = useState(false);

  // プレイヤー名
  const [players, setPlayers] = useState(['', '', '', '']);

  // 今回入力中のゲームの持ち点
  const [currentGameScore, setCurrentGameScore] = useState({
    rank1: '',
    rank2: '',
    rank3: '',
    rank4: ''
  });

  // 日付・チップ関連
  const [basicDate, setBasicDate] = useState('');
  const [chipDistribution, setChipDistribution] = useState('');
  const [chipRow, setChipRow] = useState({ rank1: '', rank2: '', rank3: '', rank4: '' });

  // -------------------------
  // Firestore 関連
  // -------------------------
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

  // -------------------------
  // グループ関連操作
  // -------------------------
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

  // 半荘結果を追加
  const addGameScore = () => {
    const { rank1, rank2, rank3, rank4 } = currentGameScore;
    if (!currentGroup || [rank1, rank2, rank3, rank4].some(v => v === '')) return;

    // 入力された持ち点をもとに最終スコアを計算
    const finalScoresObj = calculateFinalScoresFromInputs(currentGameScore);
    // 小数点不要なら Number(...) で変換し Math.round しているのでOK
    // finalScoresObj は { 0: 50, 1: 10, 2: -15, 3: -45 } のような形
    // rank1 ~ rank4 の形に再マッピング
    const finalScores = {
      rank1: finalScoresObj[0],
      rank2: finalScoresObj[1],
      rank3: finalScoresObj[2],
      rank4: finalScoresObj[3]
    };

    const newGame = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      // 参考までに「持ち点」も保存
      inputScores: {
        rank1: Number(rank1),
        rank2: Number(rank2),
        rank3: Number(rank3),
        rank4: Number(rank4)
      },
      finalScores
    };

    // グループ更新
    const updatedGroup = {
      ...currentGroup,
      games: [...currentGroup.games, newGame]
    };
    updatedGroup.finalStats = recalcFinalStats(updatedGroup);

    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
    saveGameResultToFirebase(updatedGroup);

    // 入力欄クリア
    setCurrentGameScore({ rank1: '', rank2: '', rank3: '', rank4: '' });
  };

  // ゲーム結果を編集（ユーザーがテーブル上で最終スコアを編集したとき）
  const handleEditGameScore = (gameId, rankKey, newValue) => {
    const updatedGames = currentGroup.games.map(game => {
      if (game.id === gameId) {
        return {
          ...game,
          finalScores: {
            ...game.finalScores,
            [rankKey]: Number(newValue) // 入力を数値化
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

  // ゲーム結果を削除
  const handleDeleteGame = (gameId) => {
    const updatedGames = currentGroup.games.filter(game => game.id !== gameId);
    const updatedGroup = { ...currentGroup, games: updatedGames };
    updatedGroup.finalStats = recalcFinalStats(updatedGroup);

    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
    updateGroupInFirebase(updatedGroup);
  };

  // -------------------------
  // 画面切り替え
  // -------------------------
  if (analysisMode) {
    return <Analysis groups={groups} onClose={() => setAnalysisMode(false)} />;
  }

  if (!currentGroup) {
    // トップページ
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

  // -------------------------
  // ダッシュボード画面
  // -------------------------
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
                  {/* 各ゲーム行 */}
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
                          onChange={(e) => setChipRow({ ...chipRow, [r]: e.target.value })}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-6 py-4"></td>
                  </tr>
                  
                  {/* 半荘結果合計行 */}
                  <tr className="bg-gray-100">
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">半荘結果合計</td>
                    {players.map((p, idx) => {
                      const name = p.trim();
                      const totalScore = name && currentGroup.finalStats[name]
                        ? currentGroup.finalStats[name].finalResult
                        : 0;
                      return (
                        <td key={idx} className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-700">
                          {totalScore.toLocaleString()}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-6 py-4"></td>
                  </tr>
                  
                  {/* チップボーナス行 */}
                  <tr className="bg-indigo-50">
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">チップボーナス</td>
                    {players.map((p, idx) => {
                      const rankKey = `rank${idx + 1}`;
                      const chipInput = chipRow[rankKey] !== '' ? Number(chipRow[rankKey]) : 20;
                      const distribution = chipDistribution !== '' ? Number(chipDistribution) : 0;
                      // ボーナス計算（正負は運用次第）
                      const bonus = - (distribution * (20 - chipInput)) / 100;
                      return (
                        <td key={idx} className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-indigo-600">
                          {bonus.toLocaleString()}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-6 py-4"></td>
                  </tr>
                  
                  {/* 最終結果行：半荘結果合計 + チップボーナス */}
                  <tr className="bg-indigo-100">
                    <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-bold text-gray-900">最終結果</td>
                    {players.map((p, idx) => {
                      const name = p.trim();
                      const finalScore = name && currentGroup.finalStats[name]
                        ? currentGroup.finalStats[name].finalResult
                        : 0;
                      const rankKey = `rank${idx + 1}`;
                      const chipInput = chipRow[rankKey] !== '' ? Number(chipRow[rankKey]) : 20;
                      const distribution = chipDistribution !== '' ? Number(chipDistribution) : 0;
                      const bonus = - (distribution * (20 - chipInput)) / 100;
                      const total = finalScore + bonus;
                      return (
                        <td key={idx} className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">
                          {total.toLocaleString()}
                        </td>
                      );
                    })}
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
