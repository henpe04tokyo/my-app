import React, { useEffect } from 'react';

// 今日の日付を "YYYY-MM-DD" 形式で取得する関数
function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const PlayerSettings = ({ 
  basicDate, 
  setBasicDate,
  players, 
  setPlayers,
  pastPlayerNames,
  currentGroup,
  setCurrentGroup,
  groups,
  setGroups,
  updateGroupInFirebase
}) => {
  // コンポーネントがマウントされたときに、もし日付が未設定なら今日の日付をセット
  useEffect(() => {
    if (!basicDate) {
      const today = getTodayDate();
      setBasicDate(today);
      
      // 現在のグループが存在し、かつ日付が未設定の場合は更新
      if (currentGroup) {
        const updatedGroup = { 
          ...currentGroup, 
          date: today, 
          // グループ名も日付にする（もし名前がない場合）
          name: currentGroup.name || today
        };
        
        if (setCurrentGroup) {
          setCurrentGroup(updatedGroup);
        }
        
        if (groups && setGroups) {
          setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
        }
        
        if (updateGroupInFirebase) {
          updateGroupInFirebase(updatedGroup);
        }
      }
    }
  }, [basicDate, setBasicDate, currentGroup, setCurrentGroup, groups, setGroups, updateGroupInFirebase]);

  // 安全にアクセスするためのヘルパー関数
  const safeUpdate = (updatedData) => {
    try {
      if (currentGroup && setCurrentGroup) {
        setCurrentGroup(updatedData);
      }
      if (groups && setGroups) {
        setGroups(groups.map(g => (g.id === currentGroup?.id ? updatedData : g)));
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
      <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">基本情報</h2>
      
      {/* 日付入力 - エラーハンドリング追加 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          日付
          <input
            type="date"
            value={basicDate || ''}
            onChange={(e) => {
              if (setBasicDate) setBasicDate(e.target.value);
              if (!currentGroup) return;
              
              try {
                const updatedGroup = { 
                  ...currentGroup, 
                  date: e.target.value, 
                  name: e.target.value 
                };
                safeUpdate(updatedGroup);
              } catch (error) {
                console.error("Date update error:", error);
              }
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          />
        </label>
      </div>
      
      {/* プレイヤー入力セクション - ここが追加部分 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.isArray(players) && players.map((p, index) => (
          <div key={index}>
            <label className="block text-sm font-medium text-gray-700">
              プレイヤー{index + 1}
              <input
                type="text"
                value={players[index] || ''}
                onChange={(e) => {
                  try {
                    if (setPlayers && Array.isArray(players)) {
                      const newPlayers = [...players];
                      newPlayers[index] = e.target.value;
                      setPlayers(newPlayers);
                      
                      if (currentGroup) {
                        const updatedGroup = { ...currentGroup, players: newPlayers };
                        if (setCurrentGroup) setCurrentGroup(updatedGroup);
                        if (groups && setGroups) {
                          setGroups(groups.map(g => (g.id === currentGroup.id ? updatedGroup : g)));
                        }
                        if (updateGroupInFirebase) updateGroupInFirebase(updatedGroup);
                      }
                    }
                  } catch (error) {
                    console.error("Player update error:", error);
                  }
                }}
                list={`pastPlayerNames-${index}`}
                placeholder="名前を入力"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {Array.isArray(pastPlayerNames) && (
                <datalist id={`pastPlayerNames-${index}`}>
                  {pastPlayerNames.map((name, i) => (
                    <option key={i} value={name} />
                  ))}
                </datalist>
              )}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerSettings;