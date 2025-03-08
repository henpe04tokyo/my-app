import React from 'react';

const GameInputForm = ({ 
  players, 
  currentGameScore, 
  setCurrentGameScore, 
  addGameScore 
}) => {
  // 安全にスコアを更新するヘルパー関数
  const safeUpdateScore = (rankKey, value) => {
    try {
      if (setCurrentGameScore && currentGameScore) {
        setCurrentGameScore({
          ...currentGameScore,
          [rankKey]: value
        });
      }
    } catch (error) {
      console.error("Score update error:", error);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">半荘結果入力</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.isArray(players) && players.map((p, index) => (
          <div key={index}>
            <label className="block text-sm font-medium text-gray-700">
              {(p && p.trim()) ? `${p}の持ち点` : `プレイヤー${index + 1}の持ち点`}
              <input
                type="number"
                value={currentGameScore ? currentGameScore[`rank${index + 1}`] || '' : ''}
                onChange={(e) => safeUpdateScore(`rank${index + 1}`, e.target.value)}
                placeholder="例: 60000"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </label>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <button 
          onClick={() => {
            try {
              if (addGameScore) {
                addGameScore();
              }
            } catch (error) {
              console.error("Add game score error:", error);
            }
          }}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-base font-medium text-white transition duration-150 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          半荘結果を追加
        </button>
      </div>
    </div>
  );
};

export default GameInputForm;