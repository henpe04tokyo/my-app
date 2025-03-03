// App.js
import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase'; // firebase.jsで初期化したFirestoreインスタンス

// 固定設定：各プレイヤーの初期持ち点は25,000点、返し点は30,000点
// 順位点は [30, 10, -10, -30]（1位は後で符号反転で求める）
const settings = {
  initialPoints: 25000,
  returnPoints: 30000,
  rankPoints: [30, 10, -10, -30]
};

// 「五捨六入」：入力された持ち点を、下3桁（百の位のみ判定）で丸め、千点単位の整数値として返す
function roundScore(score) {
  if (isNaN(score)) return 0;
  const remainder = score % 1000;
  if (remainder === 0) return score / 1000;
  const hundredDigit = Math.floor(remainder / 100);
  const base = Math.floor(score / 1000);
  return hundredDigit >= 6 ? base + 1 : base;
}

// 各順位（非1位）の最終スコア計算
// 計算式: 最終スコア = 順位点 - ((返し点 - (丸めた持ち点*1000)) / 1000)
function calculateFinalScore(inputScore, rankIndex) {
  if (inputScore === '' || isNaN(Number(inputScore))) return 0;
  const score = Number(inputScore);
  const rounded = roundScore(score); // 例: 29600 -> 30, 29500 -> 29, 58000 -> 58
  const diff = (settings.returnPoints - rounded * 1000) / 1000;
  return settings.rankPoints[rankIndex] - diff;
}

// 1位の最終スコアは、非1位（2位～4位）のスコア合計の符号反転で求める
function calculateFinalScores(scores) {
  const s2 = calculateFinalScore(scores.rank2, 1);
  const s3 = calculateFinalScore(scores.rank3, 2);
  const s4 = calculateFinalScore(scores.rank4, 3);
  const s1 = - (s2 + s3 + s4);
  return { rank1: s1, rank2: s2, rank3: s3, rank4: s4 };
}

function App() {
  // グループ管理用の状態
  const [groups, setGroups] = useState([]);
  // currentGroup が null ならトップページ（グループ作成＋一覧）、存在すればそのグループ詳細ページ
  const [currentGroup, setCurrentGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  
  // プレイヤー名および半荘結果入力用の状態
  const [players, setPlayers] = useState(['', '', '', '']);
  const [currentGameScore, setCurrentGameScore] = useState({
    rank1: '',
    rank2: '',
    rank3: '',
    rank4: ''
  });
  const [message, setMessage] = useState('');
  
  // 追加: 半荘設定用のチップ配点
  const [chipDistribution, setChipDistribution] = useState('');
  // 追加: ゲーム結果履歴テーブルの「チップ」行の値
  const [chipRow, setChipRow] = useState({ rank1: '', rank2: '', rank3: '', rank4: '' });
  
  // グループのゲーム結果履歴を管理（各グループの形式: { id, name, settings, players, games }）
  const [games, setGames] = useState([]);

  // Firebase連携：グループ作成時の書き込み
  const saveGroupToFirebase = async (groupData) => {
    try {
      await addDoc(collection(db, "groups"), groupData);
      console.log("グループがFirebaseに保存されました");
    } catch (error) {
      console.error("グループ保存エラー:", error);
    }
  };

  // Firebase連携：ゲーム結果保存
  const saveGameResultToFirebase = async (gameData) => {
    try {
      await addDoc(collection(db, "mahjongResults"), gameData);
      console.log("ゲーム結果がFirebaseに保存されました");
    } catch (error) {
      console.error("ゲーム結果保存エラー:", error);
    }
  };

  // 新しいグループ作成
  const createNewGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup = {
      id: Date.now(),
      name: newGroupName.trim(),
      settings: { ...settings, chipDistribution },
      players: [...players],
      games: []
    };
    setGroups(prev => [...prev, newGroup]);
    setCurrentGroup(newGroup);
    saveGroupToFirebase(newGroup);
    setNewGroupName('');
  };

  // 半荘結果追加
  const addGameScore = () => {
    if (!currentGroup) return;
    const { rank1, rank2, rank3, rank4 } = currentGameScore;
    if (rank1 === '' || rank2 === '' || rank3 === '' || rank4 === '') return;
    
    const finalScores = calculateFinalScores(currentGameScore);
    const newGame = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      inputScores: {
        rank1: Number(rank1),
        rank2: Number(rank2),
        rank3: Number(rank3),
        rank4: Number(rank4)
      },
      finalScores: {
        rank1: Number(finalScores.rank1.toFixed(1)),
        rank2: Number(finalScores.rank2.toFixed(1)),
        rank3: Number(finalScores.rank3.toFixed(1)),
        rank4: Number(finalScores.rank4.toFixed(1))
      }
    };
    
    // Firebaseへの保存
    const firebaseData = {
      groupName: currentGroup.name,
      createdAt: newGame.createdAt,
      inputScores: newGame.inputScores,
      finalScores: newGame.finalScores
    };
    saveGameResultToFirebase(firebaseData);
    
    const updatedGroup = { ...currentGroup, games: [...currentGroup.games, newGame] };
    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
    
    setCurrentGameScore({ rank1: '', rank2: '', rank3: '', rank4: '' });
  };

  // ゲーム結果履歴テーブルの各行を編集できるようにする関数
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
    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
  };

  // ゲーム結果の行を削除する関数
  const handleDeleteGame = (gameId) => {
    const updatedGames = currentGroup.games.filter(game => game.id !== gameId);
    const updatedGroup = { ...currentGroup, games: updatedGames };
    setCurrentGroup(updatedGroup);
    setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
  };

  // 総合結果の累計計算：各ゲームの最終スコア（×1000）の合計を、五捨六入で丸めた値で表示（千点単位）
  const calculateTotals = () => {
    if (!currentGroup || !currentGroup.games.length) return null;
    const totals = currentGroup.games.reduce((acc, game) => {
      game.finalScores && Object.keys(game.finalScores).forEach((key, idx) => {
        if (!acc[idx]) acc[idx] = 0;
        acc[idx] += game.finalScores[key] * 1000;
      });
      return acc;
    }, []);
    return totals.map(total => roundScore(total));
  };

  const totalsRounded = calculateTotals();

  // チップボーナスの自動計算：各プレイヤーごとに
  // bonus = - (chipDistribution * (20 - chipInput)) / 100
  const calculateChipBonus = (r) => {
    const chipInput = chipRow[r] !== '' ? Number(chipRow[r]) : 20;
    const distribution = chipDistribution !== '' ? Number(chipDistribution) : 0;
    return - (distribution * (20 - chipInput)) / 100;
  };

  // 最終結果（半荘結果累計＋チップボーナス）の計算（両方とも千点単位）
  const calculateFinalOverall = (idx) => {
    const halfTotal = totalsRounded ? totalsRounded[idx] : 0;
    const bonus = calculateChipBonus(["rank1", "rank2", "rank3", "rank4"][idx]);
    return halfTotal + bonus;
  };

  // トップページ（グループ作成＋既存グループ一覧）表示
  if (!currentGroup) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <h1 style={{ textAlign: 'center' }}>麻雀スコア計算アプリ - トップページ</h1>
        
        <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
          <h2>新しいグループを作成</h2>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="グループ名"
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          />
          <button
            onClick={createNewGroup}
            style={{ padding: '8px 16px', marginTop: '10px', fontSize: '16px' }}
          >
            作成
          </button>
        </div>

        {groups.length > 0 && (
          <div style={{ border: '1px solid #ccc', padding: '15px' }}>
            <h2>既存グループ一覧</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {groups.map(g => (
                <li key={g.id} style={{ marginBottom: '8px' }}>
                  <button
                    onClick={() => setCurrentGroup(g)}
                    style={{ padding: '6px 12px', fontSize: '16px' }}
                  >
                    {g.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {message && <p style={{ color: 'green' }}>{message}</p>}
      </div>
    );
  }

  // グループ詳細ページ表示
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* トップページに戻るボタン */}
      <button
        onClick={() => setCurrentGroup(null)}
        style={{ padding: '8px 16px', fontSize: '16px', marginBottom: '20px' }}
      >
        トップページに戻る
      </button>

      <h1 style={{ textAlign: 'center' }}>{currentGroup.name}</h1>

      {/* 半荘設定セクション */}
      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
        <h2>半荘設定</h2>
        <label>
          チップ配点:&nbsp;
          <input 
            type="number"
            value={chipDistribution}
            onChange={(e) => setChipDistribution(e.target.value)}
            placeholder="例: 300"
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          />
        </label>
      </div>

      {/* 半荘結果入力フォーム */}
      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
        <h2>半荘結果入力</h2>
        {["1位", "2位", "3位", "4位"].map((label, index) => (
          <div key={index} style={{ marginBottom: '8px' }}>
            <label>
              {label} の持ち点:&nbsp;
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
        <button
          onClick={addGameScore}
          style={{ padding: '8px 16px', fontSize: '16px', marginTop: '10px' }}
        >
          半荘結果を追加
        </button>
      </div>

      {/* ① 半荘スコアの表示（表組み：2列） */}
      <div style={{ marginBottom: '20px' }}>
        <h2>半荘スコア</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
          <thead>
            <tr style={{ backgroundColor: '#eee' }}>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>プレイヤー</th>
              <th style={{ border: '1px solid #ccc', padding: '8px' }}>総合点数</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{players[0] || 'プレイヤー1'}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                {(calculateFinalScore(currentGameScore.rank1, 0) * 1000).toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{players[1] || 'プレイヤー2'}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                {(calculateFinalScore(currentGameScore.rank2, 1) * 1000).toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{players[2] || 'プレイヤー3'}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                {(calculateFinalScore(currentGameScore.rank3, 2) * 1000).toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{players[3] || 'プレイヤー4'}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                {(calculateFinalScore(currentGameScore.rank4, 3) * 1000).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ② ゲーム結果履歴テーブル */}
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
              {/* 合計行（半荘結果累計） */}
              {totalsRounded && (
                <tr style={{ backgroundColor: '#ddd', fontWeight: 'bold' }}>
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>合計</td>
                  {totalsRounded.map((total, idx) => (
                    <td key={idx} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                      {total}
                    </td>
                  ))}
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}></td>
                </tr>
              )}
              {/* チップ行 */}
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
              {/* チップボーナス行（各列、÷100して表示） */}
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
              {/* 最終結果行（半荘結果累計＋チップボーナス累計、各列の値を合計して÷100で表示） */}
              {(() => {
                if (!totalsRounded) return null;
                const overallTotals = ["rank1", "rank2", "rank3", "rank4"].map((r, idx) => {
                  const bonus = calculateChipBonus(r);
                  return totalsRounded[idx] + bonus;
                });
                return (
                  <tr style={{ backgroundColor: '#ccc', fontWeight: 'bold' }}>
                    <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>最終結果</td>
                    {overallTotals.map((overall, idx) => (
                      <td key={idx} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                        {overall.toLocaleString()}
                      </td>
                    ))}
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}></td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        ) : (
          <p>まだ半荘結果がありません。</p>
        )}
      </div>

      {message && <p style={{ color: 'green' }}>{message}</p>}
    </div>
  );
}

export default App;
