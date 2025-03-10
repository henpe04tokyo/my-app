// src/utils/scoreCalculation.js

// 固定設定
export const settings = {
  initialPoints: 25000,
  returnPoints: 30000,
  rankPoints: [0, 10, -10, -30], // デフォルトは10-30
  rankPointOption: '10-30' // デフォルトの順位点オプション
};

/**
 * 「五捨六入」：入力された持ち点を下3桁で丸め、千点単位の整数値として返す
 * @param {number} score - 丸める点数
 * @returns {number} - 丸められた千点単位の整数値
 */
export function roundScore(score) {
  if (isNaN(score)) return 0;
  const remainder = score % 1000;
  if (remainder === 0) return score / 1000;
  const hundredDigit = Math.floor(remainder / 100);
  const base = Math.floor(score / 1000);
  return hundredDigit >= 6 ? base + 1 : base;
}

/**
 * 入力された各プレイヤーの持ち点から順位を決定し、
 * 各順位に応じた最終スコアを算出して返す。
 * 1位: 他の合計を符号反転
 * 2~4位: 順位点 - (返し点 - 持ち点の千点単位)
 * 
 * @param {Object} inputs - 各プレイヤーの持ち点 { rank1: 51000, rank2: 8000, ... }
 * @param {Array} rankPoints - 使用する順位点配列 [0, 10, -10, -30] など
 * @returns {Object} - 各プレイヤーの計算済みスコア
 */
export function calculateFinalScoresFromInputs(inputs, rankPoints = settings.rankPoints) {
  // { rank1: 51000, rank2: 8000, ... } のような形を想定
  const arr = Object.keys(inputs).map(key => {
    const index = Number(key.replace('rank', '')) - 1;
    return { index, score: Number(inputs[key]) };
  });
  arr.sort((a, b) => b.score - a.score);

  const result = {};
  // 1位以外の計算
  for (let pos = 1; pos < arr.length; pos++) {
    const diff = (settings.returnPoints - roundScore(arr[pos].score) * 1000) / 1000;
    result[arr[pos].index] = rankPoints[pos] - diff;
  }
  // 1位の計算：他プレイヤーの合計を符号反転
  const sumOthers = arr.slice(1).reduce((sum, item, pos) => {
    const diff = (settings.returnPoints - roundScore(item.score) * 1000) / 1000;
    return sum + (rankPoints[pos + 1] - diff);
  }, 0);
  result[arr[0].index] = -sumOthers;

  // 小数を排除したいなら Math.round などで整数化
  Object.keys(result).forEach(k => {
    result[k] = Math.round(result[k]);
  });

  return result;
}

/**
 * recalcFinalStats:
 * - group.games[].finalScores の合計を各プレイヤーに加算 (finalResult)
 * - group.chipRow をもとにチップボーナス (chipBonus) を計算
 * - halfResult = finalResult + chipBonus
 * 
 * @param {Object} group - グループデータ
 * @returns {Object} - 計算されたプレイヤー統計情報
 */
export function recalcFinalStats(group) {
  const stats = {};
  // プレイヤー名をキーに初期値
  group.players.forEach((p) => {
    const name = p.trim();
    if (name) {
      stats[name] = { finalResult: 0, chipBonus: 0, halfResult: 0 };
    }
  });

  // ゲームごとの finalScores を合算
  group.games.forEach((game) => {
    if (game.finalScores) {
      for (let i = 1; i <= 4; i++) {
        const rankKey = `rank${i}`;
        const playerName = group.players[i - 1]?.trim();
        if (playerName && typeof game.finalScores[rankKey] === 'number') {
          stats[playerName].finalResult += game.finalScores[rankKey];
        }
      }
    }
  });

  // チップボーナスを計算する前にデバッグログを追加
  console.log("recalcFinalStats: group.chipRow =", group.chipRow);
  console.log("recalcFinalStats: group.settings =", group.settings);

  // チップボーナスを計算して加算
  const distribution = Number(group.settings?.chipDistribution ?? 0);
  group.players.forEach((p, index) => {
    const name = p.trim();
    if (!name) return;

    const rankKey = `rank${index + 1}`;
    // group.chipRow にチップ入力があれば利用、なければ 20
    const chipInput = group.chipRow && group.chipRow[rankKey] !== undefined
      ? Number(group.chipRow[rankKey])
      : 20;

    // ボーナス計算: (chipInput - 20) * distribution / 100
    const bonus = ((chipInput - 20) * distribution) / 100;

    stats[name].chipBonus = bonus;
    stats[name].halfResult = stats[name].finalResult + bonus;
  });

  return stats;
}