// src/utils/scoreCalculation.js

// 固定設定
export const settings = {
  initialPoints: 25000,
  returnPoints: 30000,
  rankPoints: [0, 10, -10, -30], // デフォルトは10-30
  rankPointOption: '10-30' // デフォルトの順位点オプション
};

/**
 * 順位点オプションから対応する順位点配列を取得
 * @param {string} option - 順位点オプション (例: '10-30')
 * @returns {Array} - 順位点配列
 */
export function getRankPointsFromOption(option) {
  switch (option) {
    case '5-10': return [0, 5, -5, -10];
    case '5-15': return [0, 5, -5, -15];
    case '10-20': return [0, 10, -10, -20];
    case '20-30': return [0, 20, -20, -30];
    case '10-30':
    default: return [0, 10, -10, -30];
  }
}

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
  // データの存在確認 - 問題があればログを出力して空のオブジェクトを返す
  if (!group) {
    console.error("recalcFinalStats: グループデータがnullまたはundefinedです");
    return {};
  }

  if (!Array.isArray(group.players)) {
    console.error("recalcFinalStats: group.playersが配列ではありません", group.players);
    return {};
  }

  if (!Array.isArray(group.games)) {
    console.warn("recalcFinalStats: group.gamesが配列ではありません", group.games);
    // gamesを空配列としてレスキュー
    group.games = [];
  }

  console.log("recalcFinalStats: 計算開始", {
    groupId: group.id || group.docId,
    playerCount: group.players.length,
    gameCount: group.games.length
  });

  // 各プレイヤーの統計を初期化
  const stats = {};
  
  group.players.forEach((player, index) => {
    // プレイヤー名が存在し、空でなければ初期化
    if (player && player.trim()) {
      stats[player.trim()] = {
        finalResult: 0,  // 半荘結果合計
        chipBonus: 0,    // チップボーナス
        halfResult: 0    // 最終結果 (finalResult + chipBonus)
      };
    }
  });

  // ゲームごとの最終スコアを集計
  group.games.forEach((game, gameIndex) => {
    // ゲームデータの検証
    if (!game || !game.finalScores) {
      console.warn(`recalcFinalStats: ゲーム #${gameIndex} にfinalScoresがありません`);
      return; // このゲームはスキップ
    }

    // 各プレイヤーのスコアを加算
    for (let i = 0; i < 4; i++) {
      const rankKey = `rank${i + 1}`;
      const playerName = group.players[i]?.trim();
      
      // プレイヤー名が有効で、そのプレイヤーの統計が初期化されていて、スコアが数値である場合のみ加算
      if (playerName && stats[playerName] && typeof game.finalScores[rankKey] === 'number') {
        stats[playerName].finalResult += game.finalScores[rankKey];
      }
    }
  });

  // デバッグ用に半荘結果合計をログ出力
  for (const [playerName, data] of Object.entries(stats)) {
    console.log(`recalcFinalStats: ${playerName}の半荘結果合計 = ${data.finalResult}`);
  }

  // チップボーナスを計算
  // チップ配点設定を取得 (デフォルト: 300)
  const distribution = Number(group.settings?.chipDistribution) || 300;
  console.log(`recalcFinalStats: チップ配点設定 = ${distribution}`);

  // チップ入力が存在するか確認
  const chipRow = group.chipRow || {};
  console.log("recalcFinalStats: チップ入力", chipRow);

  // 各プレイヤーのチップボーナスを計算
  group.players.forEach((player, index) => {
    if (!player || !player.trim()) return; // 空のプレイヤー名はスキップ
    
    const playerName = player.trim();
    if (!stats[playerName]) return; // 統計が初期化されていない場合はスキップ
    
    const rankKey = `rank${index + 1}`;
    
    // チップ入力値を取得 (デフォルト: 20)
    const chipInput = chipRow[rankKey] !== undefined && chipRow[rankKey] !== '' 
      ? Number(chipRow[rankKey]) 
      : 20;
    
    // ボーナス計算: (チップ - 20) * 配点 / 100
    const bonus = ((chipInput - 20) * distribution) / 100;
    stats[playerName].chipBonus = bonus;
    
    // 最終結果 = 半荘結果合計 + チップボーナス
    stats[playerName].halfResult = stats[playerName].finalResult + bonus;
    
    console.log(`recalcFinalStats: ${playerName} チップボーナス = ${bonus}, 最終結果 = ${stats[playerName].halfResult}`);
  });

  // 計算結果を返す
  return stats;
}