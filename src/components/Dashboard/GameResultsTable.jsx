import React, { useState } from 'react';
import RankingTable from './RankingTable.jsx';

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
  
  // 安全な操作のためのヘルパー関数
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

  if (!currentGroup) return <div className="rounded-lg bg-white p-6 shadow-md">グループが選択されていません</div>;

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

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">ゲーム結果履歴</h2>
      
      {/* モバイル用プレイヤー切り替えナビゲーション */}
      {renderPlayerNav()}
      
      {currentGroup.games && Array.isArray(currentGroup.games) && currentGroup.games.length > 0 ? (
        <div className="overflow-x-auto">
          {/* デスクトップ表示用テーブル */}
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
              {/* 各ゲームの行 */}
              {currentGroup.games.map((game, idx) => (
                <tr key={game?.id || idx} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">
                    {idx + 1}
                  </td>
                  {["rank1", "rank2", "rank3", "rank4"].map((r) => (
                    <td key={r} className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                      <input
                        type="number"
                        value={game?.finalScores?.[r] || ''}
                        onChange={(e) => safelyHandleEditGameScore(game?.id, r, e.target.value)}
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

              {/* チップ入力行 */}
              <tr className="bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">チップ</td>
                {["rank1", "rank2", "rank3", "rank4"].map((r) => (
                  <td key={r} className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                    <input
                      type="number"
                      value={chipRow?.[r] || ''}
                      onChange={(e) => safelyHandleChipChange(r, e.target.value)}
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </td>
                ))}
                <td className="whitespace-nowrap px-6 py-4"></td>
              </tr>

              {/* 半荘結果合計行 */}
              <tr className="bg-gray-100">
                <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">半荘結果合計</td>
                {Array.isArray(players) && players.map((p, idx) => {
                  const name = p?.trim();
                  const totalScore = name && currentGroup?.finalStats?.[name]
                    ? currentGroup.finalStats[name].finalResult || 0
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
                {Array.isArray(players) && players.map((p, idx) => {
                  const name = p?.trim();
                  const bonus = name && currentGroup?.finalStats?.[name]
                    ? currentGroup.finalStats[name].chipBonus || 0
                    : 0;
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
                {Array.isArray(players) && players.map((p, idx) => {
                  const name = p?.trim();
                  const finalStats = name && currentGroup?.finalStats?.[name]
                    ? currentGroup.finalStats[name]
                    : { finalResult: 0, chipBonus: 0, halfResult: 0 };
                  return (
                    <td key={idx} className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">
                      {(finalStats.halfResult || 0).toLocaleString()}
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
                          value={game?.finalScores?.[r] || ''}
                          onChange={(e) => safelyHandleEditGameScore(game?.id, r, e.target.value)}
                          className="w-12 rounded border border-gray-300 px-1 py-1 text-right text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
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
                        value={chipRow?.[r] || ''}
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
                    const totalScore = name && currentGroup?.finalStats?.[name]
                      ? currentGroup.finalStats[name].finalResult || 0
                      : 0;
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
                    const bonus = name && currentGroup?.finalStats?.[name]
                      ? currentGroup.finalStats[name].chipBonus || 0
                      : 0;
                    return (
                      <td key={idx} className="px-1 py-2 text-right text-xs font-medium text-indigo-600">
                        {bonus.toLocaleString()}
                      </td>
                    );
                  })}
                  <td className="px-1 py-2"></td>
                </tr>

                {/* 最終結果行：半荘結果合計 + チップボーナス */}
                <tr className="bg-indigo-100">
                  <td className="px-2 py-2 text-center text-xs font-bold text-gray-900">最終結果</td>
                  {Array.isArray(players) && players.map((p, idx) => {
                    const name = p?.trim();
                    const finalStats = name && currentGroup?.finalStats?.[name]
                      ? currentGroup.finalStats[name]
                      : { finalResult: 0, chipBonus: 0, halfResult: 0 };
                    return (
                      <td key={idx} className="px-1 py-2 text-right text-xs font-bold text-gray-900">
                        {(finalStats.halfResult || 0).toLocaleString()}
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