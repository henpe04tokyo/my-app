import React from 'react';
import { getRankPointsFromOption } from '../../utils/scoreCalculation';

const ChipSettings = ({ 
  chipDistribution, 
  setChipDistribution,
  rankPointOption,
  setRankPointOption,
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

  // 順位点の選択肢
  const rankPointOptions = [
    { value: "5-10", label: "5-10", points: [0, 5, -5, -10] },
    { value: "5-15", label: "5-15", points: [0, 5, -5, -15] },
    { value: "10-20", label: "10-20", points: [0, 10, -10, -20] },
    { value: "10-30", label: "10-30", points: [0, 10, -10, -30] },
    { value: "20-30", label: "20-30", points: [0, 20, -20, -30] }
  ];

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">半荘設定</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            順位点
            <select
              value={rankPointOption || '10-30'}
              onChange={(e) => {
                try {
                  const selectedOption = e.target.value;
                  
                  if (setRankPointOption) {
                    setRankPointOption(selectedOption);
                  }
                  
                  if (!currentGroup) return;
                  
                  // 選択された順位点オプションに対応するポイント配列を取得
                  const selectedPointsObj = rankPointOptions.find(opt => opt.value === selectedOption);
                  const rankPoints = selectedPointsObj ? selectedPointsObj.points : [0, 10, -10, -30];
                  
                  console.log(`順位点設定を変更: ${selectedOption}`, rankPoints);
                  
                  const updatedGroup = {
                    ...currentGroup,
                    settings: { 
                      ...(currentGroup.settings || {}), 
                      rankPointOption: selectedOption,
                      rankPoints: rankPoints
                    }
                  };
                  
                  safeUpdate(updatedGroup);
                } catch (error) {
                  console.error("Rank point update error:", error);
                }
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            >
              {rankPointOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
};

export default ChipSettings;