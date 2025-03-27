// src/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { collection, doc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
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
  navigate
}) => {
  const [isSaving, setIsSaving] = useState(false);
  
  // ログ出力機能
  const logStatus = (message, data = null) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
    if (data) {
      console.log(data);
    }
  };
  
  // データをFirestoreに保存
  const saveToFirestore = async (dataToSave, message = null) => {
    if (!dataToSave || !dataToSave.docId) {
      logStatus("保存対象のデータが無効です");
      return false;
    }
    
    try {
      const docId = dataToSave.docId;
      const docRef = doc(db, "groups", docId);
      
      // docIdはFirestoreのフィールドとしては保存しない
      const { docId: _, ...cleanData } = dataToSave;
      
      // 整合性チェックと統計再計算
      if (!Array.isArray(cleanData.games)) {
        cleanData.games = [];
      }
      
      cleanData.finalStats = recalcFinalStats(cleanData);
      cleanData.lastUpdated = new Date().toISOString();
      
      logStatus("Firestoreに保存:", {
        docId,
        gamesLength: cleanData.games.length,
        finalStats: cleanData.finalStats
      });
      
      // setDocを使用して全データを上書き保存、mergeなし
      await setDoc(docRef, cleanData);
      
      if (message) {
        window.alert(message);
      }
      
      return true;
    } catch (error) {
      console.error("Firestore保存エラー:", error);
      window.alert("データの保存中にエラーが発生しました: " + error.message);
      return false;
    }
  };
  
 // 半荘結果追加時に自動的に保存
 const addGameScore = async () => {
  // 1. 入力バリデーション
  const { rank1, rank2, rank3, rank4 } = currentGameScore;
  if (!currentGroup || [rank1, rank2, rank3, rank4].some(v => v === '')) {
    window.alert('すべてのプレイヤーのスコアを入力してください');
    return;
  }

  setIsSaving(true);
  
  try {
    console.log("半荘結果追加開始...");
    console.log("現在のゲーム数:", currentGroup.games?.length || 0);
    console.log("入力値:", currentGameScore);
    
    // 2. 順位点設定を取得
    const rankPoints = currentGroup.settings?.rankPoints || [0, 10, -10, -30];
    
    // 3. 最終スコア計算
    const finalScoresObj = calculateFinalScoresFromInputs(currentGameScore, rankPoints);
    const finalScores = {
      rank1: finalScoresObj[0],
      rank2: finalScoresObj[1],
      rank3: finalScoresObj[2],
      rank4: finalScoresObj[3]
    };
    console.log("計算した最終スコア:", finalScores);
    
    // 4. 新しいゲームを作成
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
    
    // 5. グループデータの完全なディープコピーを作成
    const updatedGroup = JSON.parse(JSON.stringify(currentGroup));
    
    // 6. games配列が存在することを確認
    if (!Array.isArray(updatedGroup.games)) {
      updatedGroup.games = [];
    }
    
    // 7. 新しいゲームを追加
    updatedGroup.games.push(newGame);
    console.log("更新後のゲーム数:", updatedGroup.games.length);

    // 8. 順位回数を更新
    updatedGroup.rankingCounts = updatedGroup.rankingCounts || {};

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
      
      if (!updatedGroup.rankingCounts[player.player]) {
        updatedGroup.rankingCounts[player.player] = { "1位": 0, "2位": 0, "3位": 0, "4位": 0 };
      }
      updatedGroup.rankingCounts[player.player][`${index + 1}位`] += 1;
    });
    
    // 9. 最終統計を再計算
    updatedGroup.finalStats = recalcFinalStats(updatedGroup);
    console.log("再計算された統計:", updatedGroup.finalStats);
    
    // 10. ドキュメントの保存準備
    const docId = updatedGroup.docId;
    const docRef = doc(db, "groups", docId);
    
    // 11. docId を除外したデータを保存用に準備
    const { docId: _, ...dataToSave } = updatedGroup;
    
    // 12. 保存を実行
    console.log("Firestoreに保存開始:", docId);
    await setDoc(docRef, dataToSave);
    console.log("Firestoreへの保存完了");
    
    // 13. クライアント側の状態を更新
    setCurrentGroup(updatedGroup);
    setGroups(prev => prev.map(g => g.docId === docId ? updatedGroup : g));
    
    // 14. 入力欄をクリア
    setCurrentGameScore({ rank1: '', rank2: '', rank3: '', rank4: '' });
    
    window.alert("半荘結果を保存しました！");
  } catch (error) {
    console.error("半荘結果保存エラー:", error);
    window.alert("保存中にエラーが発生しました: " + error.message);
  } finally {
    setIsSaving(false);
  }
};

  // ゲーム結果を編集 - 自動保存機能を追加
  const handleEditGameScore = async (gameId, rankKey, newValue) => {
    if (!currentGroup) return;
    
    setIsSaving(true);
    
    try {
      // グループデータのディープコピーを作成
      const updatedGroup = JSON.parse(JSON.stringify(currentGroup));
      
      // games配列が存在することを確認
      if (!Array.isArray(updatedGroup.games)) {
        updatedGroup.games = [];
        logStatus("games配列が存在しないため初期化しました");
        return;
      }
      
      // 該当するゲームを更新
      const updatedGames = updatedGroup.games.map(game => {
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
      
      updatedGroup.games = updatedGames;
      
      // 最終統計を再計算
      updatedGroup.finalStats = recalcFinalStats(updatedGroup);
      
      // Firestoreに保存
      const { docId: _, ...dataToSave } = updatedGroup;
      const docRef = doc(db, "groups", updatedGroup.docId);
      
      await setDoc(docRef, dataToSave);
      
      // 状態を最新データで更新
      setCurrentGroup(updatedGroup);
      setGroups(prev => prev.map(g => g.docId === updatedGroup.docId ? updatedGroup : g));
    } catch (error) {
      console.error("ゲーム編集エラー:", error);
      window.alert("編集中にエラーが発生しました: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ゲーム削除 - 自動保存機能を追加
  const handleDeleteGame = async (gameId) => {
    if (!window.confirm("このゲームを削除してもよろしいですか？")) return;
    
    setIsSaving(true);
    
    try {
      // グループデータのディープコピーを作成
      const updatedGroup = JSON.parse(JSON.stringify(currentGroup));
      
      // games配列が存在することを確認
      if (!Array.isArray(updatedGroup.games)) {
        updatedGroup.games = [];
        logStatus("games配列が存在しないため初期化しました");
        return;
      }
      
      // 該当するゲームを削除
      updatedGroup.games = updatedGroup.games.filter(game => game.id !== gameId);
      
      // 順位カウントを再計算
      updatedGroup.rankingCounts = {};
      
      // 全プレイヤーの順位を初期化
      players.forEach(player => {
        if (player && player.trim()) {
          updatedGroup.rankingCounts[player] = { "1位": 0, "2位": 0, "3位": 0, "4位": 0 };
        }
      });
      
      // 残りのゲームから順位を再集計
      updatedGroup.games.forEach(game => {
        const sortedPlayers = Object.keys(game.finalScores)
          .map((key, index) => ({
            player: players[index],
            score: game.finalScores[key]
          }))
          .sort((a, b) => b.score - a.score);
          
        sortedPlayers.forEach((player, index) => {
          if (!player.player || !player.player.trim()) return;
          if (!updatedGroup.rankingCounts[player.player]) {
            updatedGroup.rankingCounts[player.player] = { "1位": 0, "2位": 0, "3位": 0, "4位": 0 };
          }
          updatedGroup.rankingCounts[player.player][`${index + 1}位`] += 1;
        });
      });
      
      // 最終統計を再計算
      updatedGroup.finalStats = recalcFinalStats(updatedGroup);
      
      // Firestoreに保存
      const { docId: _, ...dataToSave } = updatedGroup;
      const docRef = doc(db, "groups", updatedGroup.docId);
      
      await setDoc(docRef, dataToSave);
      
      // 状態を最新データで更新
      setCurrentGroup(updatedGroup);
      setGroups(prev => prev.map(g => g.docId === updatedGroup.docId ? updatedGroup : g));
      
      window.alert("ゲームを削除しました");
    } catch (error) {
      console.error("ゲーム削除エラー:", error);
      window.alert("削除中にエラーが発生しました: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // チップ入力変更 - 自動保存機能を追加
  const handleChipChange = async (rankKey, newValue) => {
    try {
      // ローカルの状態を更新
      const updatedChipRow = { ...chipRow, [rankKey]: newValue };
      setChipRow(updatedChipRow);
      
      // グループデータのディープコピーを作成
      const updatedGroup = JSON.parse(JSON.stringify(currentGroup));
      updatedGroup.chipRow = updatedChipRow;
      
      // 統計を更新
      updatedGroup.finalStats = recalcFinalStats(updatedGroup);
      
      // 状態を更新
      setCurrentGroup(updatedGroup);
      setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
      
      // チップが変更された場合にもFirestoreに自動保存
      const { docId: _, ...dataToSave } = updatedGroup;
      const docRef = doc(db, "groups", updatedGroup.docId);
      
      await setDoc(docRef, dataToSave);
    } catch (error) {
      console.error("チップ更新エラー:", error);
    }
  };

  // コンポーネントがマウントされたときにデータを読み込み
  useEffect(() => {
    if (currentGroup && currentGroup.docId) {
      try {
        const docRef = doc(db, "groups", currentGroup.docId);
        getDoc(docRef).then(docSnap => {
          if (docSnap.exists()) {
            const freshData = { ...docSnap.data(), docId: currentGroup.docId };
            
            // 整合性チェック
            if (!Array.isArray(freshData.games)) {
              freshData.games = [];
            }
            
            if (!freshData.players) {
              freshData.players = currentGroup.players || ['', '', '', ''];
            }
            
            // 統計を再計算して常に最新の計算結果を使用
            freshData.finalStats = recalcFinalStats(freshData);
            
            // 状態を更新
            setCurrentGroup(freshData);
            setGroups(prev => prev.map(g => g.docId === freshData.docId ? freshData : g));
            setPlayers(freshData.players || ['', '', '', '']);
            setChipRow(freshData.chipRow || {});
          }
        });
      } catch (error) {
        console.error("初期データ読み込みエラー:", error);
      }
    }
  }, []);

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
          updateGroupInFirebase={saveToFirestore}
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
          updateGroupInFirebase={saveToFirestore}
        />
        
        <GameInputForm 
          players={players}
          currentGameScore={currentGameScore}
          setCurrentGameScore={setCurrentGameScore}
          addGameScore={addGameScore}
          isSaving={isSaving}
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

// Dashboardコンポーネントのメインエントリーポイント
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
          console.log("グループID検索開始:", groupId);
          
          const foundGroup = groupsData.find(g => {
            return String(g.id) === String(groupId) || g.docId === groupId;
          });
          
          if (foundGroup) {
            console.log("グループを発見:", foundGroup);
            
            // 最新データをFirestoreから直接取得
            try {
              const docRef = doc(db, "groups", foundGroup.docId);
              const docSnap = await getDoc(docRef);
              
              if (docSnap.exists()) {
                const latestData = { ...docSnap.data(), docId: foundGroup.docId };
                console.log("Firestoreから最新データを取得:", latestData);
                
                // games配列の整合性確認
                if (!Array.isArray(latestData.games)) {
                  latestData.games = [];
                  console.log("games配列が存在しないため初期化");
                }
                
                // 統計を再計算して常に最新の計算結果を使用
                latestData.finalStats = recalcFinalStats(latestData);
                
                // データを設定
                setCurrentGroup(latestData);
                setPlayers(latestData.players || ['', '', '', '']);
                setChipRow(latestData.chipRow || {});
                setBasicDate(latestData.date || '');
                setChipDistribution(latestData.settings?.chipDistribution || '');
                setRankPointOption(latestData.settings?.rankPointOption || '10-30');
              } else {
                console.log("Firestoreにドキュメントがありません。検索結果を使用します");
                
                // Firestoreにデータがない場合は検索結果を使用
                setCurrentGroup(foundGroup);
                setPlayers(foundGroup.players || ['', '', '', '']);
                setChipRow(foundGroup.chipRow || {});
                setBasicDate(foundGroup.date || '');
                setChipDistribution(foundGroup.settings?.chipDistribution || '');
                setRankPointOption(foundGroup.settings?.rankPointOption || '10-30');
              }
            } catch (error) {
              console.error("Firestoreからのデータ取得エラー:", error);
              
              // エラー時は検索結果を使用
              setCurrentGroup(foundGroup);
              setPlayers(foundGroup.players || ['', '', '', '']);
              setChipRow(foundGroup.chipRow || {});
              setBasicDate(foundGroup.date || '');
              setChipDistribution(foundGroup.settings?.chipDistribution || '');
              setRankPointOption(foundGroup.settings?.rankPointOption || '10-30');
            }
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