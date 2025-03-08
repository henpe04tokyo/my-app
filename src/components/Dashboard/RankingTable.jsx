// src/components/Dashboard/RankingTable.jsx
import React from 'react';

/**
 * 順位集計表コンポーネント
 * @param {Object} props - コンポーネントのプロパティ
 * @param {Object} props.currentGroup - 現在選択されているグループデータ
 * @returns {JSX.Element} 順位集計表
 */
const RankingTable = ({ currentGroup }) => {
  if (!currentGroup || !currentGroup.players) {
    return null;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h3 className="mt-8 text-lg font-semibold text-gray-800 border-b pb-2">順位</h3>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              順位
            </th>
            {currentGroup.players.map((player, idx) => (
              <th key={idx} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {player || `プレイヤー${idx + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {["1位", "2位", "3位", "4位"].map(rank => (
            <tr key={rank} className="even:bg-gray-50 hover:bg-gray-100">
              <td className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">
                {rank}
              </td>
              {currentGroup.players.map((player, idx) => (
                <td key={idx} className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">
                  {currentGroup?.rankingCounts?.[player]?.[rank] || 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RankingTable;