// src/Settings.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from './components/Dashboard/SEO/SEO';
import useUserPreferences from './hooks/useUserPreferences';
import { CHIP_INPUT_MODES } from './utils/scoreCalculation';

const OPTIONS = [
  { value: CHIP_INPUT_MODES.COUNT, label: '持ち枚数で入力', example: '例: 18枚 → 18' },
  { value: CHIP_INPUT_MODES.DIFF, label: '20枚との差で入力', example: '例: 18枚 → -2、20枚 → 0' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { preferences, loading, error, savePreferences } = useUserPreferences();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'error', text }

  const handleChange = async (value) => {
    if (value === preferences.chipInputMode) return;
    setSaving(true);
    setMessage(null);
    try {
      // 成功したときだけ選択が切り替わる（失敗時は元のまま）
      await savePreferences({ chipInputMode: value });
      setMessage({ type: 'ok', text: '保存しました' });
    } catch (e) {
      console.error('設定の保存エラー:', e);
      setMessage({ type: 'error', text: '保存できませんでした。選択は元のままです。' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <SEO title="設定 | 麻雀スコア計算アプリ" robots="noindex, follow" />
      <header className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <button
          onClick={() => navigate('/')}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          ホームに戻る
        </button>
      </header>

      <div className="rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">入力のしかた</h2>
        <fieldset disabled={loading || saving}>
          <legend className="mb-2 text-sm font-medium text-gray-700">チップ</legend>
          <div className="space-y-2">
            {OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="chipInputMode"
                  value={o.value}
                  checked={preferences.chipInputMode === o.value}
                  onChange={() => handleChange(o.value)}
                />
                <span>{o.label}</span>
                <span className="text-gray-500">{o.example}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {loading && <p className="mt-3 text-sm text-gray-500">読み込み中...</p>}
        {error && !loading && (
          <p className="mt-3 text-sm text-red-600">設定を読み込めなかったため、初期値（持ち枚数）を表示しています。</p>
        )}
        {message && (
          <p className={`mt-3 text-sm ${message.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
        )}
      </div>
    </div>
  );
};

export default Settings;
