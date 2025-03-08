// src/components/Dashboard/GameInputForm.jsx
import React from 'react';

/**
 * 半荘結果入力フォームコンポーネント
 * @param {Object} props - コンポーネントのプロパティ
 * @param {Array} props.players - プレイヤー名の配列
 * @param {Object} props.currentGameScore - 現在の入力スコア
 * @param {Function} props.setCurrentGameScore - 入力スコア更新関数
 * @param {Function} props.addGameScore - 半荘結果追加関数
 * @returns {JSX.Element} 半荘結果入力フォーム
 */
const GameInputForm = ({ players, currentGameScore, setCurrentGameScore, addGameScore }) => {
  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">半荘結果入力</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {players.map((p, index) => (
          <div key={index}>
            <label className="block text-sm font-medium text-gray-700">
              {p.trim() ? `${p}の持ち点` : `プレイヤー${index + 1}の持ち点`}
              <input
                type="number"
                value={currentGameScore[`rank${index + 1}`]}
                onChange={(e) =>
                  setCurrentGameScore({
                    ...currentGameScore,
                    [`rank${index + 1}`]: e.target.value
                  })
                }
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
          onClick={addGameScore}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-base font-medium text-white transition duration-150 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          半荘結果を追加
        </button>
      </div>
    </div>
  );
};

export default GameInputForm;