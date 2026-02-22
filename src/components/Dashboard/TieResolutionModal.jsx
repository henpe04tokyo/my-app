// src/components/Dashboard/TieResolutionModal.jsx
// 同点者がいるときだけ表示し、同点者に順位（1〜4）を個別に割り当てるモーダル。

import React, { useState, useEffect } from 'react';

const RANK_LABELS = ['1位', '2位', '3位', '4位'];

/**
 * @param {boolean} isOpen
 * @param {() => void} onClose - キャンセル時（ポップアップを開く前の状態に戻る）
 * @param {{ playerIndices: number[], availableRanks: number[] }[]} tiedGroups
 * @param {string[]} players
 * @param {(assignments: Object<number, number>) => void} onConfirm - assignments: { [playerIndex]: rank (1-4) }
 */
export default function TieResolutionModal({
  isOpen,
  onClose,
  tiedGroups,
  players,
  onConfirm
}) {
  // assignments[playerIndex] = rank (1-4). 同点者分だけ保持。
  const [assignments, setAssignments] = useState({});
  const [error, setError] = useState('');

  // モーダルが開いたときに、同点者ごとに availableRanks の先頭から順に仮割り当て（重複しないように）
  useEffect(() => {
    if (!isOpen || !tiedGroups) return;
    const next = {};
    const usedRanks = new Set();
    tiedGroups.forEach((group) => {
      const available = [...group.availableRanks];
      group.playerIndices.forEach((idx, i) => {
        next[idx] = available[i];
        usedRanks.add(available[i]);
      });
    });
    setAssignments(next);
    setError('');
  }, [isOpen, tiedGroups]);

  const getPlayerName = (index) => {
    const name = players[index];
    return (name && name.trim()) ? name : `プレイヤー${index + 1}`;
  };

  const handleChange = (playerIndex, rank) => {
    setAssignments((prev) => ({ ...prev, [playerIndex]: Number(rank) }));
    setError('');
  };

  const handleConfirm = () => {
    if (!tiedGroups) return;
    const used = new Set();
    let duplicate = false;
    tiedGroups.forEach((group) => {
      group.playerIndices.forEach((idx) => {
        const r = assignments[idx];
        if (r === undefined || r < 1 || r > 4) {
          setError('すべての同点者に順位を指定してください。');
          duplicate = true;
        } else if (used.has(r)) {
          setError('同じ順位を複数人に指定できません。');
          duplicate = true;
        } else {
          used.add(r);
        }
      });
    });
    if (duplicate) return;
    // 各グループで availableRanks に含まれるかチェック
    for (const group of tiedGroups) {
      for (const idx of group.playerIndices) {
        if (!group.availableRanks.includes(assignments[idx])) {
          setError(`この同点グループで指定できる順位は ${group.availableRanks.join('・')} 位のみです。`);
          return;
        }
      }
    }
    onConfirm(assignments);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">同点の順位を指定</h3>
        <p className="mb-4 text-sm text-gray-600">
          以下の同点者に、表示されている順位のいずれかを1人ずつ割り当ててください。
        </p>

        <div className="space-y-4">
          {tiedGroups && tiedGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
              <p className="mb-2 text-xs font-medium text-amber-800">
                同点（{group.availableRanks.map((r) => RANK_LABELS[r - 1]).join('・')} のいずれか）
              </p>
              <ul className="space-y-2">
                {group.playerIndices.map((playerIndex) => (
                  <li key={playerIndex} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      {getPlayerName(playerIndex)}
                    </span>
                    <select
                      value={assignments[playerIndex] ?? ''}
                      onChange={(e) => handleChange(playerIndex, e.target.value)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900"
                    >
                      <option value="">選択</option>
                      {group.availableRanks.map((r) => (
                        <option key={r} value={r}>
                          {RANK_LABELS[r - 1]}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            この順位で確定
          </button>
        </div>
      </div>
    </div>
  );
}
