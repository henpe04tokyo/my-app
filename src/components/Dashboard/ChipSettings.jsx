// src/components/Dashboard/ChipSettings.jsx
import React from 'react';

/**
 * チップ設定コンポーネント
 * @param {Object} props - コンポーネントのプロパティ
 * @param {String} props.chipDistribution - チップ配点
 * @param {Function} props.setChipDistribution - チップ配点設定関数
 * @param {Object} props.currentGroup - 現在のグループ
 * @param {Function} props.setCurrentGroup - グループ設定関数
 * @param {Array} props.groups - 全グループ
 * @param {Function} props.setGroups - グループ一覧設定関数
 * @param {Function} props.updateGroupInFirebase - Firebaseグループ更新関数
 * @returns {JSX.Element} チップ設定フォーム
 */
const ChipSettings = ({ 
  chipDistribution, 
  setChipDistribution,
  currentGroup,
  setCurrentGroup,
  groups,
  setGroups,
  updateGroupInFirebase
}) => {
  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">半荘設定</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          チップ配点
          <input
            type="number"
            value={chipDistribution}
            onChange={(e) => {
              setChipDistribution(e.target.value);
              const updatedGroup = {
                ...currentGroup,
                settings: { ...currentGroup.settings, chipDistribution: e.target.value }
              };
              setCurrentGroup(updatedGroup);
              setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
              updateGroupInFirebase(updatedGroup);
            }}
            placeholder="例: 300"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          />
        </label>
      </div>
    </div>
  );
};

export default ChipSettings;