import React from 'react';

const ChipSettings = ({ 
  chipDistribution, 
  setChipDistribution,
  currentGroup,
  setCurrentGroup,
  groups,
  setGroups,
  updateGroupInFirebase
}) => {
  // 安全にアクセスするためのヘルパー関数
  const safeUpdate = (updatedData) => {
    try {
      if (currentGroup && setCurrentGroup) {
        setCurrentGroup(updatedData);
      }
      if (groups && setGroups && Array.isArray(groups)) {
        setGroups(groups.map(g => (g?.id === currentGroup?.id ? updatedData : g)));
      }
      if (updateGroupInFirebase) {
        updateGroupInFirebase(updatedData);
      }
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">半荘設定</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          チップ配点
          <input
            type="number"
            value={chipDistribution || ''}
            onChange={(e) => {
              try {
                if (setChipDistribution) {
                  setChipDistribution(e.target.value);
                }
                
                if (!currentGroup) return;
                
                const updatedGroup = {
                  ...currentGroup,
                  settings: { 
                    ...(currentGroup.settings || {}), 
                    chipDistribution: e.target.value 
                  }
                };
                
                safeUpdate(updatedGroup);
              } catch (error) {
                console.error("Chip distribution update error:", error);
              }
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