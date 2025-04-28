// src/components/Dashboard/GameInputForm.jsx (改良版)
import React, { useState, useEffect } from 'react';

const GameInputForm = ({ 
  players, 
  currentGameScore, 
  setCurrentGameScore, 
  addGameScore,
  isSaving
}) => {
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [totalScore, setTotalScore] = useState(0);

  // スコアが変更されたら合計点を計算
  useEffect(() => {
    try {
      const scores = ['rank1', 'rank2', 'rank3', 'rank4'].map(rank => {
        const value = currentGameScore[rank];
        return value === '' ? 0 : Number(value);
      });
      
      const total = scores.reduce((sum, score) => sum + score, 0);
      setTotalScore(total);
      
      // 100,000点との差が大きすぎる場合は警告
      if (Math.abs(total - 100000) > 1000 && scores.every(s => s !== 0)) {
        setValidationErrors(prev => ({
          ...prev,
          total: `合計: ${total.toLocaleString()} 点 (100,000点との差: ${(total - 100000).toLocaleString()} 点)`
        }));
      } else {
        setValidationErrors(prev => {
          const { total, ...rest } = prev;
          return rest;
        });
      }
    } catch (error) {
      console.error("スコア合計計算エラー:", error);
    }
  }, [currentGameScore]);

  // 安全にスコアを更新するヘルパー関数
  const safeUpdateScore = (rankKey, value) => {
    try {
      if (setCurrentGameScore && currentGameScore) {
        // マイナス記号と数字のみ許可
        const numericValue = value.replace(/[^0-9-]/g, '');
        
        setCurrentGameScore({
          ...currentGameScore,
          [rankKey]: numericValue
        });
        
        // 入力値のバリデーション
        validateInput(rankKey, numericValue);
      }
    } catch (error) {
      console.error("Score update error:", error);
    }
  };

  // 入力値のバリデーション
  const validateInput = (rankKey, value) => {
    const errors = { ...validationErrors };
    
    if (value === '') {
      errors[rankKey] = '入力必須';
    } else if (isNaN(Number(value))) {
      errors[rankKey] = '数値のみ';
    } else {
      delete errors[rankKey];
    }
    
    setValidationErrors(errors);
  };

  // ゲームスコア追加処理
  const handleAddGameScore = async () => {
    // 全フィールドのバリデーション
    const requiredFields = ['rank1', 'rank2', 'rank3', 'rank4'];
    const newErrors = {};
    
    requiredFields.forEach(field => {
      if (!currentGameScore[field]) {
        newErrors[field] = '入力必須';
      }
    });
    
    if (Math.abs(totalScore - 100000) > 10000) {
      newErrors.total = '合計点が100,000点から大きく離れています';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      return;
    }
    
    try {
      const success = await addGameScore();
      
      if (success) {
        setSubmitSuccess(true);
        
        // 3秒後に成功メッセージを非表示にする
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Add game score error:", error);
    }
  };
  
  // マイナス記号をトグルするヘルパー関数
  const toggleMinus = (rankKey) => {
    try {
      if (setCurrentGameScore && currentGameScore) {
        const currentValue = currentGameScore[rankKey] || '';
        const isNegative = currentValue.startsWith('-');
        
        // マイナス記号の切り替え
        const newValue = isNegative 
          ? currentValue.substring(1) // マイナス記号を削除
          : `-${currentValue}`; // マイナス記号を追加
        
        setCurrentGameScore({
          ...currentGameScore,
          [rankKey]: newValue
        });
      }
    } catch (error) {
      console.error("Toggle minus error:", error);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 border-b pb-2">半荘結果入力</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.isArray(players) && players.map((p, index) => {
          const rankKey = `rank${index + 1}`;
          return (
            <div key={index}>
              <label className="block text-sm font-medium text-gray-700">
                {(p && p.trim()) ? `${p}の持ち点` : `プレイヤー${index + 1}の持ち点`}
                <input
                  type="text"
                  inputMode="numeric"
                  value={currentGameScore ? currentGameScore[rankKey] || '' : ''}
                  onChange={(e) => safeUpdateScore(rankKey, e.target.value)}
                  placeholder="例: 30000 "
                  className={`mt-1 block w-full rounded-md border ${
                    validationErrors[rankKey] ? 'border-red-300' : 'border-gray-300'
                  } px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm`}
                  required
                />
                {validationErrors[rankKey] && (
                  <p className="mt-1 text-xs text-red-600">
                    {validationErrors[rankKey]}
                  </p>
                )}
              </label>
            </div>
          );
        })}
      </div>
      
      {/* 合計点表示 */}
      <div className="mt-4 rounded-md bg-gray-50 p-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">合計点:</span>
          <span className={`text-sm font-medium ${
            Math.abs(totalScore - 100000) > 1000 ? 'text-red-600' : 'text-green-600'
          }`}>
            {totalScore.toLocaleString()} 点
            {Math.abs(totalScore - 100000) > 0 && ` (差: ${(totalScore - 100000).toLocaleString()} 点)`}
          </span>
        </div>
        {validationErrors.total && (
          <p className="mt-1 text-xs text-red-600">{validationErrors.total}</p>
        )}
      </div>
      
      <div className="mt-6">
        {submitSuccess && (
          <div className="mb-4 rounded-md bg-green-100 p-2 text-center text-sm text-green-700">
            半荘結果を保存しました
          </div>
        )}
        <button 
          onClick={handleAddGameScore}
          disabled={isSaving || Object.keys(validationErrors).length > 0}
          className={`w-full rounded-md ${
            isSaving ? 
              'bg-gray-400 cursor-not-allowed' : 
              Object.keys(validationErrors).length > 0 ?
                'bg-indigo-300 cursor-not-allowed' :
                'bg-indigo-600 hover:bg-indigo-700'
          } px-4 py-2 text-base font-medium text-white transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
        >
          {isSaving ? '保存中...' : '半荘結果を追加'}
        </button>
      </div>
    </div>
  );
};

export default GameInputForm;