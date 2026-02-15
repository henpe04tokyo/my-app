// src/components/Dashboard/GameInputForm.jsx (改良版)
import React, { useState, useEffect } from 'react';

const createEmptyTobiBonus = () => ({
  id: `${Date.now()}-${Math.random()}`,
  fromIndex: '',
  toIndex: '',
  amount: 10
});

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
  const [isTobiModalOpen, setIsTobiModalOpen] = useState(false);
  const [tobiBonuses, setTobiBonuses] = useState([]);

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
      const normalizedBonuses = tobiBonuses.map((bonus) => ({
        fromIndex: Number(bonus.fromIndex),
        toIndex: Number(bonus.toIndex),
        amount: Number(bonus.amount)
      }));

      const hasInvalidBonus = normalizedBonuses.some((bonus) =>
        Number.isNaN(bonus.fromIndex) ||
        Number.isNaN(bonus.toIndex) ||
        Number.isNaN(bonus.amount) ||
        bonus.fromIndex === bonus.toIndex ||
        bonus.amount < 10 ||
        bonus.amount % 10 !== 0
      );

      if (hasInvalidBonus) {
        window.alert('飛び賞の設定に不正な値があります。内容を確認してください。');
        return;
      }

      const success = await addGameScore(normalizedBonuses);
      
      if (success) {
        setSubmitSuccess(true);
        setTobiBonuses([]);
        
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

  const getPlayerLabel = (index) => {
    const playerName = players[index];
    return (playerName && playerName.trim()) ? playerName : `プレイヤー${index + 1}`;
  };

  const openTobiModal = () => {
    if (tobiBonuses.length === 0) {
      setTobiBonuses([createEmptyTobiBonus()]);
    }
    setIsTobiModalOpen(true);
  };

  const addTobiBonusRow = () => {
    setTobiBonuses(prev => [...prev, createEmptyTobiBonus()]);
  };

  const removeTobiBonusRow = (id) => {
    setTobiBonuses(prev => prev.filter((bonus) => bonus.id !== id));
  };

  const updateTobiBonusField = (id, field, value) => {
    setTobiBonuses(prev => prev.map((bonus) => {
      if (bonus.id !== id) return bonus;
      return { ...bonus, [field]: value };
    }));
  };

  const adjustTobiAmount = (id, diff) => {
    setTobiBonuses(prev => prev.map((bonus) => {
      if (bonus.id !== id) return bonus;
      const nextAmount = Math.min(90, Math.max(10, bonus.amount + diff));
      return { ...bonus, amount: nextAmount };
    }));
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
                <div className="flex mt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={currentGameScore ? currentGameScore[rankKey] || '' : ''}
                    onChange={(e) => safeUpdateScore(rankKey, e.target.value)}
                    placeholder="例: 30000 "
                    className={`block w-full rounded-l-md border ${
                      validationErrors[rankKey] ? 'border-red-300' : 'border-gray-300'
                    } px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => toggleMinus(rankKey)}
                    className="inline-flex items-center justify-center rounded-r-md border border-l-0 border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    ±
                  </button>
                </div>
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
          type="button"
          onClick={openTobiModal}
          className="mb-3 w-full rounded-md border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
        >
          飛び賞設定を開く
        </button>
        {tobiBonuses.length > 0 && (
          <div className="mb-3 rounded-md border border-indigo-100 bg-indigo-50 p-3">
            <p className="mb-2 text-xs font-semibold text-indigo-700">設定中の飛び賞</p>
            <ul className="space-y-1 text-xs text-indigo-900">
              {tobiBonuses.map((bonus) => {
                const fromLabel = bonus.fromIndex === '' ? '未選択' : getPlayerLabel(Number(bonus.fromIndex));
                const toLabel = bonus.toIndex === '' ? '未選択' : getPlayerLabel(Number(bonus.toIndex));
                return (
                  <li key={bonus.id}>
                    {fromLabel} → {toLabel} : {bonus.amount} ({(bonus.amount * 1000).toLocaleString()}点)
                  </li>
                );
              })}
            </ul>
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

      {isTobiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">飛び賞設定</h3>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {tobiBonuses.map((bonus, idx) => (
                <div key={bonus.id} className="rounded-md border border-gray-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">飛び賞 {idx + 1}</p>
                    {tobiBonuses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTobiBonusRow(bonus.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        削除
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="text-xs text-gray-600">
                      飛んだユーザー
                      <select
                        value={bonus.fromIndex}
                        onChange={(e) => updateTobiBonusField(bonus.id, 'fromIndex', e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">選択してください</option>
                        {players.map((_, index) => (
                          <option key={`from-${index}`} value={index}>
                            {getPlayerLabel(index)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-gray-600">
                      飛ばしたユーザー
                      <select
                        value={bonus.toIndex}
                        onChange={(e) => updateTobiBonusField(bonus.id, 'toIndex', e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">選択してください</option>
                        {players.map((_, index) => (
                          <option key={`to-${index}`} value={index}>
                            {getPlayerLabel(index)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="text-xs text-gray-600">
                      ボーナス（10〜90）
                      <div className="mt-1 flex items-center">
                        <button
                          type="button"
                          onClick={() => adjustTobiAmount(bonus.id, -10)}
                          className="rounded-l-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          -
                        </button>
                        <div className="border-y border-gray-300 px-3 py-1.5 text-sm text-gray-900">
                          {bonus.amount}
                        </div>
                        <button
                          type="button"
                          onClick={() => adjustTobiAmount(bonus.id, 10)}
                          className="rounded-r-md border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">{(bonus.amount * 1000).toLocaleString()}点</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={addTobiBonusRow}
                className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100"
              >
                + 飛び賞行を追加
              </button>
              <button
                type="button"
                onClick={() => setTobiBonuses([])}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                クリア
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsTobiModalOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() => setIsTobiModalOpen(false)}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              >
                反映
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameInputForm;