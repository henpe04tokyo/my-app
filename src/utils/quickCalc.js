// src/utils/quickCalc.js
// ログイン不要の「精算計算ツール」用。保存せず、4人の持ち点から順位点と収支を出すだけ。
// 計算は scoreCalculation.js の関数をそのまま使う（アプリ本体と同じ結果になる）。
import {
  toRawScore,
  roundScore,
  getRankPointsFromOption,
  calculateFinalScoresFromInputs,
  settings
} from './scoreCalculation';

export const QUICK_RANK_POINT_OPTIONS = ['5-10', '5-15', '10-20', '10-30', '20-30'];

// 1ptあたりの金額（円）。点1=10円 のように、レート表記と対応させる
export const QUICK_RATE_OPTIONS = [
  { value: 0, label: '収支（円）は出さない' },
  { value: 10, label: '点1（1pt = 10円）' },
  { value: 30, label: '点3（1pt = 30円）' },
  { value: 50, label: '点5（1pt = 50円）' },
  { value: 100, label: '点ピン（1pt = 100円）' }
];

/**
 * 4人の持ち点（下2桁省略の入力文字列）から、順位・五捨六入後の点数・順位点・収支を求める。
 * 同点のときは、席の順（先に入力した人）を上位として計算する。
 *
 * @param {string[]} inputs - 4人分の入力文字列（例: ['490', '360', '200', '-50']）
 * @param {string} rankPointOption - 例: '10-30'
 * @param {number} yenPerPoint - 1ptあたりの円。0なら収支は null
 * @returns {{ ok: false, reason: string } | { ok: true, total: number, totalDiff: number, hasTie: boolean, players: Array }}
 */
export function calculateQuickResult(inputs, rankPointOption = '10-30', yenPerPoint = 0) {
  if (!Array.isArray(inputs) || inputs.length !== 4) {
    return { ok: false, reason: '持ち点は4人分が必要です' };
  }
  const raws = inputs.map((value) => toRawScore(value));
  if (raws.some((raw) => Number.isNaN(raw))) {
    return { ok: false, reason: '4人分の持ち点を入力してください' };
  }

  const rankPoints = getRankPointsFromOption(rankPointOption);
  const final = calculateFinalScoresFromInputs(
    { rank1: raws[0], rank2: raws[1], rank3: raws[2], rank4: raws[3] },
    rankPoints
  );

  // calculateFinalScoresFromInputs と同じく、点数の大きい順（同点は席順）で順位を決める
  const order = raws
    .map((raw, index) => ({ raw, index }))
    .sort((a, b) => b.raw - a.raw || a.index - b.index);
  const rankOf = {};
  order.forEach(({ index }, pos) => {
    rankOf[index] = pos + 1;
  });

  const total = raws.reduce((sum, raw) => sum + raw, 0);
  const hasTie = new Set(raws).size < raws.length;
  const rate = Number(yenPerPoint) || 0;

  const players = raws.map((raw, index) => ({
    index,
    rawScore: raw,
    rank: rankOf[index],
    roundedThousand: roundScore(raw),
    rankPoint: rankPoints[rankOf[index] - 1],
    finalPoint: final[index],
    yen: rate > 0 ? final[index] * rate : null
  }));

  return {
    ok: true,
    total,
    totalDiff: total - 4 * settings.initialPoints,
    hasTie,
    players
  };
}
