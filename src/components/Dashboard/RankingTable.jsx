import React from 'react';

const RankingTable = ({ currentGroup }) => {
  // 安全にデータにアクセスするためのチェック
  if (!currentGroup || !currentGroup.players) {
    return <div className="py-4 text-center text-sm text-gray-500">グループデータがありません。</div>;
  }

  return (
    <div className="mt-4">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              順位
            </th>
            {Array.isArray(currentGroup.players) && currentGroup.players.map((player, idx) => (
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
              {Array.isArray(currentGroup.players) && currentGroup.players.map((player, idx) => {
                // 安全にデータアクセス
                const count = player && 
                              currentGroup.rankingCounts && 
                              currentGroup.rankingCounts[player] && 
                              currentGroup.rankingCounts[player][rank]
                            ? currentGroup.rankingCounts[player][rank]
                            : 0;
                
                return (
                  <td key={idx} className="whitespace-nowrap px-6 py-4 text-center text-sm font-medium text-gray-900">
                    {count}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RankingTable;