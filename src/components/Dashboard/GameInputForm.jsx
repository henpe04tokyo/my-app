import React, { useState } from 'react';

const GameInputForm = ({ 
  players, 
  currentGameScore, 
  setCurrentGameScore, 
  addGameScore 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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

  // ゲームスコア追加の処理
  const handleAddGameScore = async () => {
    if ([currentGameScore.rank1, currentGameScore.rank2, currentGameScore.rank3, currentGameScore.rank4].some(v => v === '')) {
      alert('すべてのプレイヤーのスコアを入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      await addGameScore();
      setSubmitSuccess(true);
      
      // 3秒後に成功メッセージを非表示にする
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      console.error("Add game score error:", error);
      alert('スコア追加中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
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
        {submitSuccess && (
          <div className="mb-4 rounded-md bg-green-100 p-2 text-center text-sm text-green-700">
            半荘結果を保存しました
          </div>
        )}
        <button 
          onClick={handleAddGameScore}
          disabled={isSubmitting}
          className={`w-full rounded-md ${isSubmitting ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} px-4 py-2 text-base font-medium text-white transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
        >
          {isSubmitting ? '保存中...' : '半荘結果を追加'}
        </button>
      </div>
    </div>
  );
};

export default GameInputForm;