import React, { useState } from 'react';

const RankingTable = ({ currentGroup }) => {
  // モバイル表示用：選択中のプレイヤーインデックス
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);
  
  // 安全にデータにアクセスするためのチェック
  if (!currentGroup || !currentGroup.players) {
    return <div className="py-4 text-center text-sm text-gray-500">グループデータがありません。</div>;
  }

  // 単一プレイヤーの順位回数を取得するヘルパー関数
  const getPlayerRankCount = (player, rank) => {
    return player && 
           currentGroup.rankingCounts && 
           currentGroup.rankingCounts[player] && 
           currentGroup.rankingCounts[player][rank]
          ? currentGroup.rankingCounts[player][rank]
          : 0;
  };

  // プレイヤー切り替えナビゲーション（モバイル用）
  const renderMobilePlayerNav = () => {
    return (
      <div className="flex justify-center space-x-2 mb-4 md:hidden">
        {Array.isArray(currentGroup.players) && currentGroup.players.map((player, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedPlayerIndex(idx)}
            className={`px-3 py-1 text-sm rounded-full ${
              selectedPlayerIndex === idx
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {player || `P${idx + 1}`}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="mt-4">
      {/* モバイル用のプレイヤー選択UI */}
      {renderMobilePlayerNav()}
      
      {/* デスクトップ表示用テーブル */}
      <table className="min-w-full divide-y divide-gray-200 hidden md:table">
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
                const count = getPlayerRankCount(player, rank);
                
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
      
      {/* モバイル表示用テーブル */}
      <div className="md:hidden">
        <h4 className="text-center font-medium mb-2">
          {currentGroup.players[selectedPlayerIndex] || `プレイヤー${selectedPlayerIndex + 1}`}の成績
        </h4>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 w-1/2">
                順位
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 w-1/2">
                回数
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {["1位", "2位", "3位", "4位"].map(rank => {
              const player = currentGroup.players[selectedPlayerIndex];
              const count = getPlayerRankCount(player, rank);
              
              return (
                <tr key={rank} className="even:bg-gray-50">
                  <td className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                    {rank}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                    {count}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* すべてのプレイヤーの1位回数表示（概要） */}
        <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
          <h5 className="text-sm font-medium text-center mb-2">全員の1位回数</h5>
          <div className="grid grid-cols-2 gap-2">
            {Array.isArray(currentGroup.players) && currentGroup.players.map((player, idx) => {
              const count = getPlayerRankCount(player, "1位");
              return (
                <div key={idx} className="flex justify-between items-center px-2 py-1 bg-white rounded">
                  <span className="text-xs truncate">{player || `P${idx + 1}`}</span>
                  <span className="text-xs font-bold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankingTable;