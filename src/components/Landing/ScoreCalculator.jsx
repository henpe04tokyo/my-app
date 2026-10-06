// src/components/Landing/ScoreCalculator.jsx
// ログイン不要の精算計算ツール。入力は保存・送信しない（計測するのは「使われたこと」だけ）。
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sanitizeScoreInput, toRawScore } from '../../utils/scoreCalculation';
import {
  calculateQuickResult,
  QUICK_RANK_POINT_OPTIONS,
  QUICK_RATE_OPTIONS
} from '../../utils/quickCalc';
import { trackEvent } from '../../analytics';

const formatSigned = (value) => (value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString());
const signClass = (value) => (value > 0 ? 'text-blue-600' : value < 0 ? 'text-red-600' : 'text-gray-700');

const ScoreCalculator = () => {
  const [names, setNames] = useState(['', '', '', '']);
  const [scores, setScores] = useState(['', '', '', '']);
  const [rule, setRule] = useState('10-30');
  const [yenPerPoint, setYenPerPoint] = useState(0);
  const [copied, setCopied] = useState(false);
  const trackedRef = useRef(false);

  const result = useMemo(
    () => calculateQuickResult(scores, rule, yenPerPoint),
    [scores, rule, yenPerPoint]
  );

  // 入力内容は送らず、「使われたこと」だけを1回計測する
  useEffect(() => {
    if (result.ok && !trackedRef.current) {
      trackedRef.current = true;
      trackEvent('calculator_used', { rule });
    }
  }, [result.ok, rule]);

  const nameOf = (index) => names[index].trim() || `プレイヤー${index + 1}`;

  const updateScore = (index, value) => {
    setScores((prev) => prev.map((v, i) => (i === index ? sanitizeScoreInput(value) : v)));
  };

  const toggleMinus = (index) => {
    setScores((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v;
        return v.startsWith('-') ? v.slice(1) : `-${v}`;
      })
    );
  };

  const reset = () => {
    setScores(['', '', '', '']);
    setCopied(false);
  };

  const copyResult = async () => {
    if (!result.ok) return;
    const lines = [...result.players]
      .sort((a, b) => a.rank - b.rank)
      .map((p) => {
        const yen = p.yen === null ? '' : ` / ${formatSigned(p.yen)}円`;
        return `${p.rank}位 ${nameOf(p.index)}  ${formatSigned(p.finalPoint)}pt（${p.rawScore.toLocaleString()}点）${yen}`;
      });
    const text = `麻雀の精算（ウマ ${rule}）\n${lines.join('\n')}\nhttps://h4k-mj.xyz/`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      trackEvent('calculator_copy');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow-lg sm:p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((index) => {
          const raw = scores[index] === '' ? NaN : toRawScore(scores[index]);
          return (
            <div key={index} className="rounded-lg border border-gray-200 p-3">
              <label className="block text-xs font-medium text-gray-600" htmlFor={`calc-name-${index}`}>
                {index + 1}人目の名前（任意）
              </label>
              <input
                id={`calc-name-${index}`}
                type="text"
                value={names[index]}
                maxLength={12}
                onChange={(e) => setNames((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))}
                placeholder={`プレイヤー${index + 1}`}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <label className="mt-2 block text-xs font-medium text-gray-600" htmlFor={`calc-score-${index}`}>
                持ち点（下2桁は省略）
              </label>
              <div className="mt-1 flex">
                <input
                  id={`calc-score-${index}`}
                  type="text"
                  inputMode="numeric"
                  value={scores[index]}
                  onChange={(e) => updateScore(index, e.target.value)}
                  placeholder="例: 292（= 29,200点）"
                  className="block w-full rounded-l-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => toggleMinus(index)}
                  aria-label={`${index + 1}人目の持ち点のプラスマイナスを切り替える`}
                  className="rounded-r-md border border-l-0 border-gray-300 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  ±
                </button>
              </div>
              <p className="mt-1 h-4 text-xs text-gray-500">
                {Number.isNaN(raw) ? '' : `= ${raw.toLocaleString()} 点`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-gray-600">
          順位点（ウマ）
          <select
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {QUICK_RANK_POINT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-gray-600">
          レート
          <select
            value={yenPerPoint}
            onChange={(e) => setYenPerPoint(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {QUICK_RATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5" aria-live="polite">
        {!result.ok ? (
          <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            4人分の持ち点を入れると、ここに結果が出ます。原点25,000点・返し30,000点で計算します。
          </p>
        ) : (
          <>
            {result.totalDiff !== 0 && (
              <p className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                4人の合計が {result.total.toLocaleString()} 点で、100,000点と {formatSigned(result.totalDiff)} 点ずれています。
                入力を確認してください（リーチ棒が場に残った場合などは、このずれが出ます）。
              </p>
            )}
            {result.hasTie && (
              <p className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                同点があります。上に入力した人を上位として計算しています。
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="py-2 pr-3 font-medium">順位</th>
                    <th className="py-2 pr-3 font-medium">名前</th>
                    <th className="py-2 pr-3 text-right font-medium">持ち点</th>
                    <th className="py-2 pr-3 text-right font-medium">五捨六入</th>
                    <th className="py-2 pr-3 text-right font-medium">順位点</th>
                    <th className="py-2 pr-3 text-right font-medium">スコア(pt)</th>
                    {yenPerPoint > 0 && <th className="py-2 text-right font-medium">収支(円)</th>}
                  </tr>
                </thead>
                <tbody>
                  {[...result.players]
                    .sort((a, b) => a.rank - b.rank)
                    .map((p) => (
                      <tr key={p.index} className="border-b border-gray-100">
                        <td className="py-2 pr-3 font-medium">{p.rank}位</td>
                        <td className="py-2 pr-3">{nameOf(p.index)}</td>
                        <td className="py-2 pr-3 text-right">{p.rawScore.toLocaleString()}</td>
                        <td className="py-2 pr-3 text-right">{p.roundedThousand}</td>
                        <td className="py-2 pr-3 text-right">{formatSigned(p.rankPoint)}</td>
                        <td className={`py-2 pr-3 text-right font-bold ${signClass(p.finalPoint)}`}>
                          {formatSigned(p.finalPoint)}
                        </td>
                        {yenPerPoint > 0 && (
                          <td className={`py-2 text-right font-bold ${signClass(p.yen)}`}>{formatSigned(p.yen)}</td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              2〜4位は「順位点 −（30 − 五捨六入後の持ち点）」、1位は他の3人の合計の符号を反転（オカ込み）で計算しています。
            </p>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyResult}
          disabled={!result.ok}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {copied ? 'コピーしました' : '結果をテキストでコピー'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          持ち点をクリア
        </button>
      </div>
    </div>
  );
};

export default ScoreCalculator;
