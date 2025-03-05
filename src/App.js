// src/App.js
import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
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
 * 1位は他の合計の符号反転、非1位は順位点 - 差分。
 * 結果はオブジェクト { [playerIndex]: score, ... } を返す。
 */
function calculateFinalScoresFromInputs(inputs) {
  const arr = Object.keys(inputs).map(key => {
    const index = Number(key.replace('rank', '')) - 1;
    return { index, score: Number(inputs[key]) };
  });
  // 持ち点が高い順にソート
  arr.sort((a, b) => b.score - a.score);
  const result = {};
  // 非1位は順位点を適用
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

function App() {
  // グループ管理
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [analysisMode, setAnalysisMode] = useState(false);

  // プレイヤー名（編集可能）
  const [players, setPlayers] = useState(['', '', '', '']);
  // 半荘結果入力：各プレイヤーの持ち点入力
  const [currentGameScore, setCurrentGameScore] = useState({
    rank1: '',
    rank2: '',
    rank3: '',
    rank4: ''
  });
  
  // 基本情報：日付入力でグループ名更新
  const [basicDate, setBasicDate] = useState('');
  
  // 半荘設定用：チップ配点
  const [chipDistribution, setChipDistribution] = useState('');
  // チップ入力用：各プレイヤーのチップ枚数を入力する行
  const [chipRow, setChipRow] = useState({ rank1: '', rank2: '', rank3: '', rank4: '' });

  // Firebase: グループ作成・更新
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

  // 新しいグループ作成（名前入力不要、初期値 "グループ名未設定"）
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

  // 半荘結果追加：全員の持ち点入力完了後、calculateFinalScoresFromInputs により順位を決定して最終スコア算出
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

  // ゲーム結果編集
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

  // ゲーム結果削除
  const handleDeleteGame = (gameId) => {
    const updatedGames = currentGroup.games.filter(game => game.id !== gameId);
    const updatedGroup = { ...currentGroup, games: updatedGames };
    updatedGroup.finalStats = recalcFinalStats(updatedGroup);
    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
    updateGroupInFirebase(updatedGroup);
  };

  // 集計用：各ゲームの最終スコアの累計（千点単位で丸め）
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
    return (
      <Analysis groups={groups} onClose={() => setAnalysisMode(false)} />
    );
  }

  if (!currentGroup) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <h1 style={{ textAlign: 'center' }}>麻雀スコア計算アプリ - トップページ</h1>
        <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
          <h2>新しいグループ作成</h2>
          <button onClick={createNewGroup} style={{ padding: '8px 16px', fontSize: '16px' }}>
            グループ作成
          </button>
        </div>
        {groups.length > 0 && (
          <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
            <h2>既存グループ一覧</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {groups.map(g => (
                <li key={g.id} style={{ marginBottom: '8px' }}>
                  <button onClick={() => setCurrentGroup(g)} style={{ padding: '6px 12px', fontSize: '16px' }}>
                    {g.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ border: '1px solid #ccc', padding: '15px' }}>
          <h2>データ分析</h2>
          <button onClick={() => setAnalysisMode(true)} style={{ padding: '8px 16px', fontSize: '16px' }}>
            集計
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <button onClick={() => setCurrentGroup(null)} style={{ padding: '8px 16px', fontSize: '16px', marginBottom: '20px' }}>
        トップページに戻る
      </button>
      <h1 style={{ textAlign: 'center' }}>{currentGroup.name}</h1>

      {/* 基本情報セクション（ラベルは固定 "プレイヤーX:"） */}
      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
        <h2>基本情報</h2>
        <label>
          日付:&nbsp;
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
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          />
        </label>
        <br /><br />
        {players.map((p, index) => (
          <div key={index} style={{ marginBottom: '8px' }}>
            <label>
              プレイヤー{index + 1}:&nbsp;
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
                style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              />
            </label>
          </div>
        ))}
      </div>

      {/* 半荘設定セクション */}
      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
        <h2>半荘設定</h2>
        <label>
          チップ配点:&nbsp;
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
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          />
        </label>
      </div>

      {/* 半荘結果入力フォーム（ラベルは、入力されたプレイヤー名があればその名前、未入力なら「プレイヤーXの持ち点」） */}
      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
        <h2>半荘結果入力</h2>
        {players.map((p, index) => (
          <div key={index} style={{ marginBottom: '8px' }}>
            <label>
              {p.trim() ? `${p}の持ち点` : `プレイヤー${index + 1}の持ち点`}:&nbsp;
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
                style={{ width: '100%', padding: '8px', fontSize: '16px' }}
                required
              />
            </label>
          </div>
        ))}
        <button onClick={addGameScore} style={{ padding: '8px 16px', fontSize: '16px', marginTop: '10px' }}>
          半荘結果を追加
        </button>
      </div>

      {/* ゲーム結果履歴テーブル */}
      <div style={{ marginBottom: '20px' }}>
        <h2>ゲーム結果履歴</h2>
        {currentGroup.games && currentGroup.games.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr style={{ backgroundColor: '#eee' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>半荘</th>
                {players.map((p, idx) => (
                  <th key={idx} style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {p || `プレイヤー${idx + 1}`}
                  </th>
                ))}
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {currentGroup.games.map((game, idx) => (
                <tr key={game.id}>
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                    {idx + 1}
                  </td>
                  {["rank1", "rank2", "rank3", "rank4"].map((r) => (
                    <td key={r} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                      <input
                        type="number"
                        value={game.finalScores[r]}
                        onChange={(e) => handleEditGameScore(game.id, r, e.target.value)}
                        style={{ width: '80px', textAlign: 'right' }}
                      />
                    </td>
                  ))}
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                    <button onClick={() => handleDeleteGame(game.id)}>削除</button>
                  </td>
                </tr>
              ))}
              {/* チップ入力行 */}
              <tr style={{ backgroundColor: '#eee' }}>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>チップ</td>
                {["rank1", "rank2", "rank3", "rank4"].map((r) => (
                  <td key={r} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                    <input
                      type="number"
                      value={chipRow[r]}
                      onChange={(e) =>
                        setChipRow({ ...chipRow, [r]: e.target.value })
                      }
                      style={{ width: '80px', textAlign: 'right' }}
                    />
                  </td>
                ))}
                <td style={{ border: '1px solid #ccc', padding: '8px' }}></td>
              </tr>
              {/* チップボーナス行 */}
              <tr style={{ backgroundColor: '#ddd', fontWeight: 'bold' }}>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>チップボーナス</td>
                {["rank1", "rank2", "rank3", "rank4"].map((r) => {
                  const chipInput = chipRow[r] !== '' ? Number(chipRow[r]) : 20;
                  const distribution = chipDistribution !== '' ? Number(chipDistribution) : 0;
                  const bonus = - (distribution * (20 - chipInput)) / 100;
                  return (
                    <td key={r} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                      {bonus.toLocaleString()}
                    </td>
                  );
                })}
                <td style={{ border: '1px solid #ccc', padding: '8px' }}></td>
              </tr>
              {/* 最終結果行 */}
              <tr style={{ backgroundColor: '#ccc', fontWeight: 'bold' }}>
                <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>最終結果</td>
                {calculateTotals() && calculateTotals().map((total, idx) => (
                  <td key={idx} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                    {total.toLocaleString()}
                  </td>
                ))}
                <td style={{ border: '1px solid #ccc', padding: '8px' }}></td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p>まだ半荘結果がありません。</p>
        )}
      </div>
    </div>
  );
}

export default App;
