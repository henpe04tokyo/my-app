// src/Analysis.jsx
import React, { useState, useMemo } from 'react';

// "YYYY-MM-DD" 形式の文字列から年を抜き出す
function extractYear(dateStr) {
  if (!dateStr || dateStr.length < 4) return "";
  return dateStr.slice(0, 4);
}

function Analysis({ groups, onClose }) {
  const allYears = useMemo(() => {
    const years = new Set();
    groups.forEach(g => {
      const y = extractYear(g.date || g.name);
      if (y) years.add(y);
    });
    return Array.from(years).sort();
  }, [groups]);

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

  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      const groupYear = extractYear(g.date || g.name);
      const yearMatch = !selectedYear || groupYear === selectedYear;
      const playerMatch = !selectedPlayer || (g.finalStats && g.finalStats[selectedPlayer]);
      return yearMatch && playerMatch;
    });
  }, [groups, selectedYear, selectedPlayer]);

  const tableData = useMemo(() => {
    let rows = [];
    let totalFinal = 0;
    let totalChip = 0;
    let totalHalf = 0;
    filteredGroups.forEach(g => {
      const stats = g.finalStats && selectedPlayer ? g.finalStats[selectedPlayer] : { finalResult: 0, chipBonus: 0, halfResult: 0 };
      const finalResult = stats.finalResult; // 既に千点単位の値
      const chipBonus = stats.chipBonus;
      const halfResult = stats.halfResult;
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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <button
        onClick={onClose}
        style={{ padding: '8px 16px', fontSize: '16px', marginBottom: '20px' }}
      >
        トップページに戻る
      </button>
      <h1>データ分析</h1>
      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '15px' }}>
        <h2>フィルタ</h2>
        <div style={{ marginBottom: '10px' }}>
          <label>
            年別:&nbsp;
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ padding: '5px' }}
            >
              <option value="">すべて</option>
              {allYears.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            プレイヤー:&nbsp;
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              style={{ padding: '5px' }}
            >
              <option value="">すべて</option>
              {allPlayers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
        <thead>
          <tr style={{ backgroundColor: '#eee' }}>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>グループ</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>最終結果</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>チップボーナス</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>半荘結果</th>
          </tr>
        </thead>
        <tbody>
          {tableData.rows.map((row, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{row.groupLabel}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                {row.finalResult.toLocaleString()}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                {row.chipBonus.toLocaleString()}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                {row.halfResult.toLocaleString()}
              </td>
            </tr>
          ))}
          {tableData.rows.length > 0 && (
            <tr style={{ backgroundColor: '#ddd', fontWeight: 'bold' }}>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center' }}>合計</td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                {tableData.totalFinal.toLocaleString()}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                {tableData.totalChip.toLocaleString()}
              </td>
              <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>
                {tableData.totalHalf.toLocaleString()}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {tableData.rows.length === 0 && <p>該当データがありません。</p>}
    </div>
  );
}

export default Analysis;
