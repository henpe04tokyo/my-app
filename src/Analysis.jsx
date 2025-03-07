// src/Analysis.jsx
import React, { useState, useMemo } from 'react';

// "YYYY-MM-DD" 形式の文字列から年を抜き出す
function extractYear(dateStr) {
  if (!dateStr || dateStr.length < 4) return "";
  return dateStr.slice(0, 4);
}

function Analysis({ groups, onClose }) {
  // 1) すべての年を抽出
  const allYears = useMemo(() => {
    const years = new Set();
    groups.forEach(g => {
      const y = extractYear(g.date || g.name);
      if (y) years.add(y);
    });
    return Array.from(years).sort();
  }, [groups]);

  // 2) すべてのプレイヤーを抽出
  const allPlayers = useMemo(() => {
    const playersSet = new Set();
    groups.forEach(g => {
      if (g.finalStats) {
        Object.keys(g.finalStats).forEach(p => playersSet.add(p));
      }
    });
    return Array.from(playersSet);
  }, [groups]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState("");

  // 3) フィルタリング
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const groupYear = extractYear(g.date || g.name);
      const yearMatch = !selectedYear || groupYear === selectedYear;
      const playerMatch = !selectedPlayer || (g.finalStats && g.finalStats[selectedPlayer]);
      return yearMatch && playerMatch;
    });
  }, [groups, selectedYear, selectedPlayer]);

  // 4) テーブル表示用データ
  const tableData = useMemo(() => {
    let rows = [];
    let totalFinal = 0;
    let totalChip = 0;
    let totalHalf = 0;

    filteredGroups.forEach(g => {
      // 該当プレイヤーの finalStats
      const stats = g.finalStats && selectedPlayer
        ? g.finalStats[selectedPlayer]
        : { finalResult: 0, chipBonus: 0, halfResult: 0 };

      const finalResult = stats.finalResult || 0;
      const chipBonus = stats.chipBonus || 0;
      const halfResult = stats.halfResult || 0;

      rows.push({
        groupLabel: g.date || g.name,
        finalResult,
        chipBonus,
        halfResult
      });

      totalFinal += finalResult;
      totalChip += chipBonus;
      totalHalf += halfResult;
    });

    return { rows, totalFinal, totalChip, totalHalf };
  }, [filteredGroups, selectedPlayer]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <button
        onClick={onClose}
        className="mb-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-150 ease-in-out flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
        トップページに戻る
      </button>
      
      <h1 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">データ分析</h1>
      
      <div className="mb-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">フィルタ</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              年別
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">すべて</option>
              {allYears.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              プレイヤー
            </label>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">すべて</option>
              {allPlayers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {tableData.rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  グループ
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  最終結果
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  チップボーナス
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  半荘結果
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableData.rows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                    {row.groupLabel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border-r border-gray-100">
                    {row.finalResult.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border-r border-gray-100">
                    {row.chipBonus.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {row.halfResult.toLocaleString()}
                  </td>
                </tr>
              ))}
              
              <tr className="bg-indigo-50 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100 text-center">
                  合計
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border-r border-gray-100">
                  {tableData.totalFinal.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right border-r border-gray-100">
                  {tableData.totalChip.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {tableData.totalHalf.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-gray-700">該当データがありません。</p>
        </div>
      )}
    </div>
  );
}

export default Analysis;
