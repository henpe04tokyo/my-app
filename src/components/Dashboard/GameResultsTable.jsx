import React, { useState, useEffect, useRef } from 'react';
import RankingTable from './RankingTable.jsx';

const calculateChipBonus = (chipValue, distribution) => {
  const chipInput = chipValue !== undefined && chipValue !== '' 
    ? Number(chipValue) 
    : 20;
  
  return ((chipInput - 20) * distribution) / 100;
};

const GameResultsTable = ({ 
  currentGroup, 
  players, 
  chipRow, 
  handleEditGameScore, 
  handleDeleteGame, 
  handleChipChange 
}) => {
  // モバイルビューで表示しているプレイヤーのインデックス
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [calculatedStats, setCalculatedStats] = useState({});
  
  // デバウンス用のタイマー
  const debounceTimers = useRef({});
  
  // デバッグログとインラインでの緊急計算
  useEffect(() => {
    console.log("GameResultsTable マウント/更新時:", {
      currentGroup: currentGroup?.id || currentGroup?.docId,
      finalStats: currentGroup?.finalStats,
      gamesLength: currentGroup?.games?.length || 0,
    });
    
    // 強制的なインライン計算（最後の手段）
    if (currentGroup && Array.isArray(currentGroup.games)) {
      const stats = {};
      
      console.log("インライン計算開始、対象ゲーム数:", currentGroup.games.length);
      console.log("プレイヤー:", players);
      
      players.forEach((player, idx) => {
        if (player && player.trim()) {
          const name = player.trim();
          
          // 半荘結果合計を計算
          let finalResult = 0;
          const rankKey = `rank${idx + 1}`;
          
          currentGroup.games.forEach((game, gameIdx) => {
            if (game?.finalScores && typeof game.finalScores[rankKey] === 'number') {
              finalResult += game.finalScores[rankKey];
              console.log(`プレイヤー ${name} のゲーム ${gameIdx+1} スコア: ${game.finalScores[rankKey]}`);
            } else {
              console.log(`プレイヤー ${name} のゲーム ${gameIdx+1} にスコアなし`);
            }
          });
          
          // チップボーナスを計算
          const distribution = Number(currentGroup.settings?.chipDistribution) || 300;
          const chipValue = chipRow[rankKey];
          const chipInput = chipValue !== undefined && chipValue !== '' 
            ? Number(chipValue) 
            : 20;
          const chipBonus = ((chipInput - 20) * distribution) / 100;
          
          // 最終結果を計算
          const halfResult = finalResult + chipBonus;
          
          stats[name] = { finalResult, chipBonus, halfResult };
          console.log(`${name} の計算結果:`, stats[name]);
        }
      });
      
      setCalculatedStats(stats);
    }
  }, [currentGroup, players, chipRow]);
  
  // シンプルな編集処理（デバウンスなし）
  const safelyHandleEditGameScore = (gameId, rankKey, newValue) => {
    try {
      if (handleEditGameScore) {
        handleEditGameScore(gameId, rankKey, newValue);
      }
    } catch (error) {
      console.error("Edit game score error:", error);
    }
  };

  const safelyHandleDeleteGame = (gameId) => {
    try {
      if (handleDeleteGame) {
        handleDeleteGame(gameId);
      }
    } catch (error) {
      console.error("Delete game error:", error);
    }
  };

  const safelyHandleChipChange = (rankKey, newValue) => {
    try {
      if (handleChipChange) {
        handleChipChange(rankKey, newValue);
      }
    } catch (error) {
      console.error("Chip change error:", error);
    }
  };

  // プレイヤー切り替えナビゲーション（モバイル用）
  const renderPlayerNav = () => {
    return (
      <div className="flex justify-center space-x-2 mb-4 md:hidden">
        {Array.isArray(players) && players.map((p, idx) => (
          <button
            key={idx}
            onClick={() => setActivePlayerIndex(idx)}
            className={`px-3 py-1 text-sm rounded-full ${
              activePlayerIndex === idx
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {p || `P${idx + 1}`}
          </button>
        ))}
      </div>
    );
  };

  if (!currentGroup) return <div className="rounded-lg bg-white p-6 shadow-md">グループが選択されていません</div>;

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">ゲーム結果履歴</h2>
      
      {renderPlayerNav()}
      
      {currentGroup.games && Array.isArray(currentGroup.games) && currentGroup.games.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 hidden md:table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">半荘</th>
                {Array.isArray(players) && players.map((p, idx) => (
                  <th key={idx} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {p || `プレイヤー${idx + 1}`}
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {currentGroup.games.map((game, idx) => (
                <tr key={game?.id || idx} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">
                    {idx + 1}
                  </td>
                  {["rank1", "rank2", "rank3", "rank4"].map((r) => (
                    <td key={r} className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                      <input
                        type="number"
                        value={game?.finalScores?.[r] !== undefined ? game.finalScores[r] : ''}
                        onChange={(e) => safelyHandleEditGameScore(game?.id, r, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                      />
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium">
                    <button 
                      onClick={() => safelyHandleDeleteGame(game?.id)}
                      className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}

              <tr className="bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">チップ</td>
                {["rank1", "rank2", "rank3", "rank4"].map((r) => (
                  <td key={r} className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                    <input
                      type="number"
                      value={chipRow?.[r] !== undefined ? chipRow[r] : ''}
                      onChange={(e) => safelyHandleChipChange(r, e.target.value)}
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </td>
                ))}
                <td className="whitespace-nowrap px-6 py-4"></td>
              </tr>

              <tr className="bg-gray-100">
                <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">半荘結果合計</td>
                {Array.isArray(players) && players.map((p, idx) => {
                  const name = p?.trim();
                  
                  // ここが重要: インラインでの再計算を優先
                  let totalScore = 0;
                  
                  if (name && calculatedStats[name]) {
                    totalScore = calculatedStats[name].finalResult;
                    console.log(`表示: ${name} のインライン計算結果:`, totalScore);
                  } else if (name && currentGroup?.finalStats?.[name]) {
                    totalScore = currentGroup.finalStats[name].finalResult || 0;
                    console.log(`表示: ${name} の Firestore 結果:`, totalScore);
                  } else {
                    // 最終手段: 直接ゲームから計算（表示時）
                    const rankKey = `rank${idx + 1}`;
                    if (Array.isArray(currentGroup.games)) {
                      currentGroup.games.forEach(game => {
                        if (game?.finalScores && typeof game.finalScores[rankKey] === 'number') {
                          totalScore += game.finalScores[rankKey];
                        }
                      });
                    }
                    console.log(`表示: ${name} の直接計算結果:`, totalScore);
                  }
                  
                  return (
                    <td key={idx} className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-700">
                      {totalScore.toLocaleString()}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-6 py-4"></td>
              </tr>

              <tr className="bg-indigo-50">
                <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">チップボーナス</td>
                {Array.isArray(players) && players.map((p, idx) => {
                  const name = p?.trim();
                  
                  // インラインでの再計算を優先
                  let bonus = 0;
                  
                  if (name && calculatedStats[name]) {
                    bonus = calculatedStats[name].chipBonus;
                  } else if (name && currentGroup?.finalStats?.[name]) {
                    bonus = currentGroup.finalStats[name].chipBonus || 0;
                  } else {
                    // 最終手段: 直接計算
                    const rankKey = `rank${idx + 1}`;
                    const distribution = Number(currentGroup.settings?.chipDistribution) || 300;
                    const chipValue = chipRow[rankKey];
                    bonus = calculateChipBonus(chipValue, distribution);
                  }
                  
                  return (
                    <td key={idx} className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-indigo-600">
                      {bonus.toLocaleString()}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-6 py-4"></td>
              </tr>

              <tr className="bg-indigo-100">
                <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-bold text-gray-900">最終結果</td>
                {Array.isArray(players) && players.map((p, idx) => {
                  const name = p?.trim();
                  
                  // インラインでの再計算を優先
                  let finalResult = 0;
                  
                  if (name && calculatedStats[name]) {
                    finalResult = calculatedStats[name].halfResult;
                  } else if (name && currentGroup?.finalStats?.[name]) {
                    finalResult = currentGroup.finalStats[name].halfResult || 0;
                  } else {
                    // 最終手段: 直接計算
                    const rankKey = `rank${idx + 1}`;
                    let totalScore = 0;
                    
                    if (Array.isArray(currentGroup.games)) {
                      currentGroup.games.forEach(game => {
                        if (game?.finalScores && typeof game.finalScores[rankKey] === 'number') {
                          totalScore += game.finalScores[rankKey];
                        }
                      });
                    }
                    
                    const distribution = Number(currentGroup.settings?.chipDistribution) || 300;
                    const chipValue = chipRow[rankKey];
                    const bonus = calculateChipBonus(chipValue, distribution);
                    
                    finalResult = totalScore + bonus;
                  }
                  
                  return (
                    <td key={idx} className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">
                      {finalResult.toLocaleString()}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-6 py-4"></td>
              </tr>
            </tbody>
          </table>

          {/* モバイル表示用テーブル */}
          <div className="md:hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 w-10">半荘</th>
                  {Array.isArray(players) && players.map((p, idx) => (
                    <th key={idx} className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      <div className="text-xs break-words max-w-12">
                        {p || `P${idx + 1}`}
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {/* 各ゲームの行 */}
                {currentGroup.games.map((game, idx) => (
                  <tr key={game?.id || idx} className="hover:bg-gray-50">
                    <td className="px-2 py-2 text-center text-sm font-medium text-gray-900">
                      {idx + 1}
                    </td>
                    {["rank1", "rank2", "rank3", "rank4"].map((r) => (
                      <td key={r} className="px-1 py-2 text-right text-sm text-gray-500">
                        <input
                          type="number"
                          value={game?.finalScores?.[r] !== undefined ? game.finalScores[r] : ''}
                          onChange={(e) => safelyHandleEditGameScore(game?.id, r, e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-16 rounded border border-gray-300 px-2 py-2 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-2 text-center text-sm font-medium">
                      <button 
                        onClick={() => safelyHandleDeleteGame(game?.id)}
                        className="rounded-full h-6 w-6 flex items-center justify-center bg-red-100 text-xs font-medium text-red-600 hover:bg-red-200 focus:outline-none"
                        aria-label="削除"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}

                {/* チップ入力行 */}
                <tr className="bg-gray-50">
                  <td className="px-2 py-2 text-center text-sm font-medium text-gray-900">チップ</td>
                  {["rank1", "rank2", "rank3", "rank4"].map((r) => (
                    <td key={r} className="px-1 py-2 text-right text-sm text-gray-500">
                      <input
                        type="number"
                        value={chipRow?.[r] !== undefined ? chipRow[r] : ''}
                        onChange={(e) => safelyHandleChipChange(r, e.target.value)}
                        className="w-12 rounded border border-gray-300 px-1 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                      />
                    </td>
                  ))}
                  <td className="px-1 py-2"></td>
                </tr>

                {/* 半荘結果合計行 */}
                <tr className="bg-gray-100">
                  <td className="px-2 py-2 text-center text-xs font-medium text-gray-900">半荘結果</td>
                  {Array.isArray(players) && players.map((p, idx) => {
                    const name = p?.trim();
                    let totalScore = 0;
                    
                    if (name && calculatedStats[name]) {
                      totalScore = calculatedStats[name].finalResult;
                    } else if (name && currentGroup?.finalStats?.[name]) {
                      totalScore = currentGroup.finalStats[name].finalResult || 0;
                    } else {
                      // 直接計算
                      const rankKey = `rank${idx + 1}`;
                      if (Array.isArray(currentGroup.games)) {
                        currentGroup.games.forEach(game => {
                          if (game?.finalScores && typeof game.finalScores[rankKey] === 'number') {
                            totalScore += game.finalScores[rankKey];
                          }
                        });
                      }
                    }
                    
                    return (
                      <td key={idx} className="px-1 py-2 text-right text-xs text-gray-700">
                        {totalScore.toLocaleString()}
                      </td>
                    );
                  })}
                  <td className="px-1 py-2"></td>
                </tr>

                {/* チップボーナス行 */}
                <tr className="bg-indigo-50">
                  <td className="px-2 py-2 text-center text-xs font-medium text-gray-900">ボーナス</td>
                  {Array.isArray(players) && players.map((p, idx) => {
                    const name = p?.trim();
                    let bonus = 0;
                    
                    if (name && calculatedStats[name]) {
                      bonus = calculatedStats[name].chipBonus;
                    } else if (name && currentGroup?.finalStats?.[name]) {
                      bonus = currentGroup.finalStats[name].chipBonus || 0;
                    } else {
                      // 直接計算
                      const rankKey = `rank${idx + 1}`;
                      const distribution = Number(currentGroup.settings?.chipDistribution) || 300;
                      const chipValue = chipRow[rankKey];
                      bonus = calculateChipBonus(chipValue, distribution);
                    }
                    
                    return (
                      <td key={idx} className="px-1 py-2 text-right text-xs font-medium text-indigo-600">
                        {bonus.toLocaleString()}
                      </td>
                    );
                  })}
                  <td className="px-1 py-2"></td>
                </tr>

                {/* 最終結果行 */}
                <tr className="bg-indigo-100">
                  <td className="px-2 py-2 text-center text-xs font-bold text-gray-900">最終結果</td>
                  {Array.isArray(players) && players.map((p, idx) => {
                    const name = p?.trim();
                    let finalResult = 0;
                    
                    if (name && calculatedStats[name]) {
                      finalResult = calculatedStats[name].halfResult;
                    } else if (name && currentGroup?.finalStats?.[name]) {
                      finalResult = currentGroup.finalStats[name].halfResult || 0;
                    } else {
                      // 直接計算
                      const rankKey = `rank${idx + 1}`;
                      let totalScore = 0;
                      
                      if (Array.isArray(currentGroup.games)) {
                        currentGroup.games.forEach(game => {
                          if (game?.finalScores && typeof game.finalScores[rankKey] === 'number') {
                            totalScore += game.finalScores[rankKey];
                          }
                        });
                      }
                      
                      const distribution = Number(currentGroup.settings?.chipDistribution) || 300;
                      const chipValue = chipRow[rankKey];
                      const bonus = calculateChipBonus(chipValue, distribution);
                      
                      finalResult = totalScore + bonus;
                    }
                    
                    return (
                      <td key={idx} className="px-1 py-2 text-right text-xs font-bold text-gray-900">
                        {finalResult.toLocaleString()}
                      </td>
                    );
                  })}
                  <td className="px-1 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-4 text-center text-sm text-gray-500">
          まだ半荘結果がありません。
        </div>
      )}
      
      {/* 順位集計表 */}
      <h3 className="mt-8 text-lg font-semibold text-gray-800 border-b pb-2">順位</h3>
      {currentGroup && <RankingTable currentGroup={currentGroup} />}
    </div>
  );
};

export default GameResultsTable;