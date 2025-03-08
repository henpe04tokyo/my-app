// src/components/Dashboard/GameResultsTable.jsx
import React from 'react';
import RankingTable from './RankingTable.jsx';

/**
 * ゲーム結果履歴テーブルコンポーネント
 * @param {Object} props - コンポーネントのプロパティ
 * @param {Object} props.currentGroup - 現在選択されているグループデータ
 * @param {Array} props.players - プレイヤー名の配列
 * @param {Object} props.chipRow - チップ入力値
 * @param {Function} props.handleEditGameScore - ゲームスコア編集関数
 * @param {Function} props.handleDeleteGame - ゲーム削除関数
 * @param {Function} props.handleChipChange - チップ変更関数
 * @returns {JSX.Element} ゲーム結果履歴テーブル
 */
const GameResultsTable = ({ 
  currentGroup, 
  players, 
  chipRow, 
  handleEditGameScore, 
  handleDeleteGame, 
  handleChipChange 
}) => {
  if (!currentGroup) return null;

  return (
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
              {/* 各ゲームの行 */}
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
                      value={chipRow[r] ?? ''}
                      onChange={(e) => handleChipChange(r, e.target.value)}
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
                  const name = p.trim();
                  const bonus = name && currentGroup.finalStats[name]
                    ? currentGroup.finalStats[name].chipBonus
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
                {players.map((p, idx) => {
                  const name = p.trim();
                  const finalStats = name && currentGroup.finalStats[name]
                    ? currentGroup.finalStats[name]
                    : { finalResult: 0, chipBonus: 0, halfResult: 0 };
                  return (
                    <td key={idx} className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">
                      {finalStats.halfResult.toLocaleString()}
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
      
      {/* 順位集計表 */}
      <h3 className="mt-8 text-lg font-semibold text-gray-800 border-b pb-2">順位</h3>
      <RankingTable currentGroup={currentGroup} />
    </div>
  );
};

export default GameResultsTable;