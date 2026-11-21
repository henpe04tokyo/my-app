// 対戦相性：メインプレイヤーと相手ごとの成績を、0を中心とした横棒（半荘pt＋チップの積み上げ）で表示
import React, { useEffect, useMemo, useState } from 'react';
import { computeHeadToHead } from '../../utils/headToHead';

const DEFAULT_SELECTED = 5;

const fmt = (v) => `${v > 0 ? '+' : ''}${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;

const MODES = [
  { key: 'self', label: '同卓時の自分の成績', note: 'その相手がいた半荘での、メインプレイヤーの合計' },
  { key: 'diff', label: '直接対決の差', note: '同じ半荘での（メイン − 相手）の合計' },
];

// 正の値は0から右へ、負の値は0から左へ。半荘ptを0側、チップを外側に積む
function Bar({ pt, chip, scale }) {
  const pct = (v) => `${(Math.abs(v) / scale) * 50}%`;
  const seg = (v, side, cls, key) =>
    v !== 0 && (side === 'pos' ? v > 0 : v < 0) ? (
      <div key={key} className={`h-full ${cls}`} style={{ width: pct(v) }} />
    ) : null;
  const ptCls = pt >= 0 ? 'bg-emerald-500' : 'bg-rose-500';
  return (
    <div className="relative flex h-5 w-full rounded bg-gray-50">
      <div className="flex w-1/2 justify-end">
        {seg(chip, 'neg', 'bg-amber-400', 'cn')}
        {seg(pt, 'neg', ptCls, 'pn')}
      </div>
      <div className="flex w-1/2">
        {seg(pt, 'pos', ptCls, 'pp')}
        {seg(chip, 'pos', 'bg-amber-400', 'cp')}
      </div>
      <div className="absolute inset-y-0 left-1/2 w-px bg-gray-400" />
    </div>
  );
}

const HeadToHeadChart = ({ groups, players }) => {
  const [mainPlayer, setMainPlayer] = useState('');
  const [mode, setMode] = useState('self');
  const [selected, setSelected] = useState([]);

  const rows = useMemo(() => computeHeadToHead(groups, mainPlayer), [groups, mainPlayer]);

  // メインを変えたら、同卓の多い上位を初期選択にする
  useEffect(() => {
    setSelected(rows.slice(0, DEFAULT_SELECTED).map((r) => r.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainPlayer]);

  const toggle = (name) =>
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const shown = rows.filter((r) => selected.includes(r.name));
  const scale = Math.max(
    1,
    ...shown.map((r) => {
      const { pt, chip } = r[mode];
      return Math.max(Math.max(pt, 0) + Math.max(chip, 0), -Math.min(pt, 0) - Math.min(chip, 0));
    })
  );
  const modeInfo = MODES.find((m) => m.key === mode);

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">対戦相性</h2>
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メインプレイヤー</label>
          <select
            value={mainPlayer}
            onChange={(e) => setMainPlayer(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">選択してください</option>
            {players.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {mainPlayer && (
          <>
            <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={`flex-1 px-3 py-2 ${mode === m.key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-gray-500">同卓した相手がいません。</p>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">対戦相手（同卓数の多い順）</span>
                  <span className="space-x-3 text-xs">
                    <button type="button" className="text-indigo-600" onClick={() => setSelected(rows.map((r) => r.name))}>全選択</button>
                    <button type="button" className="text-indigo-600" onClick={() => setSelected([])}>全解除</button>
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md divide-y divide-gray-100">
                  {rows.map((r) => (
                    <label key={r.name} className="flex items-center px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selected.includes(r.name)}
                        onChange={() => toggle(r.name)}
                        className="mr-2 h-4 w-4 accent-indigo-600"
                      />
                      <span className="flex-1 text-gray-900">{r.name}</span>
                      <span className="text-gray-500">{r.games}半荘</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {mainPlayer && shown.length > 0 && (
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-2">{modeInfo.note}</p>
          <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
            <span className="flex items-center"><span className="inline-block w-3 h-3 mr-1 rounded-sm bg-emerald-500" />半荘pt（プラス）</span>
            <span className="flex items-center"><span className="inline-block w-3 h-3 mr-1 rounded-sm bg-rose-500" />半荘pt（マイナス）</span>
            <span className="flex items-center"><span className="inline-block w-3 h-3 mr-1 rounded-sm bg-amber-400" />チップ</span>
          </div>
          <div className="space-y-3">
            {shown.map((r) => {
              const { pt, chip } = r[mode];
              const total = Math.round((pt + chip) * 10) / 10;
              return (
                <div key={r.name}>
                  <div className="flex items-baseline justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">
                      {r.name}
                      <span className="ml-2 text-xs font-normal text-gray-500">{r.games}半荘</span>
                    </span>
                    <span className="text-right">
                      <span className={`font-semibold ${total > 0 ? 'text-emerald-600' : total < 0 ? 'text-rose-600' : 'text-gray-700'}`}>
                        {fmt(total)}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">（半荘 {fmt(pt)} / チップ {fmt(chip)}）</span>
                    </span>
                  </div>
                  <Bar pt={pt} chip={chip} scale={scale} />
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gray-400">チップはグループ単位のため、相手と同じグループにいた回のチップを計上しています。</p>
        </div>
      )}
    </div>
  );
};

export default HeadToHeadChart;
