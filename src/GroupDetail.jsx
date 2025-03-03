// GroupDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from './firebase';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  roundScore,
  calculateFinalScore,
  calculateFinalScores
} from './scoreLogic'; // ←計算ロジックを別ファイルに分けるか、ここに直書きでもOK

function GroupDetail() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  // 半荘入力用
  const [players, setPlayers] = useState(['', '', '', '']);
  const [scores, setScores] = useState({
    rank1: '',
    rank2: '',
    rank3: '',
    rank4: ''
  });

  // 取得したゲーム履歴
  const [games, setGames] = useState([]);

  useEffect(() => {
    // グループ情報を取得
    const fetchGroup = async () => {
      const groupRef = doc(db, 'groups', groupId);
      const snapshot = await getDoc(groupRef);
      if (snapshot.exists()) {
        setGroup({ id: snapshot.id, ...snapshot.data() });
      }
      setLoading(false);
    };
    fetchGroup();

    // ゲーム履歴をリアルタイムで取得 (onSnapshot)
    const gamesCol = collection(db, 'groups', groupId, 'games');
    const unsubscribe = onSnapshot(gamesCol, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // createdAt でソートしたい場合はここで sort
      data.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
      setGames(data);
    });

    return () => unsubscribe();
  }, [groupId]);

  if (loading) {
    return <div>Loading...</div>;
  }
  if (!group) {
    return <div>グループが見つかりません。</div>;
  }

  // 半荘結果をFirebaseに追加
  const handleAddGame = async () => {
    const finalScores = calculateFinalScores(scores);
    const newGame = {
      createdAt: new Date().toISOString(),
      players: [...players],
      inputScores: {
        rank1: Number(scores.rank1),
        rank2: Number(scores.rank2),
        rank3: Number(scores.rank3),
        rank4: Number(scores.rank4)
      },
      finalScores
    };
    try {
      await addDoc(collection(db, 'groups', groupId, 'games'), newGame);
      // リセット
      setPlayers(['', '', '', '']);
      setScores({ rank1: '', rank2: '', rank3: '', rank4: '' });
    } catch (error) {
      console.error('Error adding game:', error);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>グループ: {group.name}</h1>

      <div style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px' }}>
        <h2>プレイヤー名</h2>
        {players.map((p, idx) => (
          <div key={idx} style={{ marginBottom: '8px' }}>
            <input
              type="text"
              value={p}
              onChange={(e) => {
                const copy = [...players];
                copy[idx] = e.target.value.trim().toLowerCase();
                setPlayers(copy);
              }}
              placeholder={`プレイヤー ${idx + 1}`}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            />
          </div>
        ))}

        <h2>持ち点入力</h2>
        {["1位", "2位", "3位", "4位"].map((label, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <label>
              {label} の持ち点:&nbsp;
              <input
                type="number"
                value={scores[`rank${i + 1}`]}
                onChange={(e) =>
                  setScores({ ...scores, [`rank${i + 1}`]: e.target.value })
                }
                style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              />
            </label>
          </div>
        ))}

        <button
          onClick={handleAddGame}
          style={{ padding: '8px 16px', marginTop: '10px', fontSize: '16px' }}
        >
          半荘結果を追加
        </button>
      </div>

      {/* 履歴テーブル */}
      <div style={{ border: '1px solid #ccc', padding: '15px' }}>
        <h2>ゲーム履歴</h2>
        {games.length === 0 && <p>まだ半荘結果がありません。</p>}
        {games.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr style={{ backgroundColor: '#eee' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>#</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>1位</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>2位</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>3位</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>4位</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g, idx) => (
                <tr key={g.id}>
                  <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>
                    {idx + 1}
                  </td>
                  {["rank1", "rank2", "rank3", "rank4"].map((r, i2) => (
                    <td key={r} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                      {g.finalScores[r].toLocaleString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default GroupDetail;
