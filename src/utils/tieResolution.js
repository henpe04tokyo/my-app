// src/utils/tieResolution.js
// 持ち点が完全に同じプレイヤーを検出し、同点時の順位指定に必要な情報を返す。

/**
 * 入力された持ち点から同点グループを検出する。
 * 同点は「数値が完全に同じ」場合のみ（案A）。
 *
 * @param {Object} rawInputScores - { rank1, rank2, rank3, rank4 } 数値
 * @returns {{ hasTies: boolean, tiedGroups: Array<{ playerIndices: number[], availableRanks: number[] }>, nonTiedRanks: Object<number, number> }}
 */
export function getTieInfo(rawInputScores) {
  const scores = [1, 2, 3, 4].map((r) => Number(rawInputScores[`rank${r}`]) ?? 0);
  const arr = scores.map((score, index) => ({ index, score }));
  arr.sort((a, b) => b.score - a.score);

  const tiedGroups = [];
  const nonTiedRanks = {};
  let rankStart = 1;
  let i = 0;

  while (i < arr.length) {
    const score = arr[i].score;
    const group = [arr[i].index];
    while (i + 1 < arr.length && arr[i + 1].score === score) {
      i += 1;
      group.push(arr[i].index);
    }
    const rankEnd = rankStart + group.length - 1;
    if (group.length === 1) {
      nonTiedRanks[group[0]] = rankStart;
    } else {
      const availableRanks = [];
      for (let r = rankStart; r <= rankEnd; r++) availableRanks.push(r);
      tiedGroups.push({ playerIndices: group, availableRanks });
    }
    rankStart = rankEnd + 1;
    i += 1;
  }

  return {
    hasTies: tiedGroups.length > 0,
    tiedGroups,
    nonTiedRanks
  };
}

/**
 * 同点者の順位指定（assignments）と非同点者の順位（nonTiedRanks）から、
 * 「1位の持ち点, 2位の持ち点, ...」の順に並べた入力オブジェクトを組み立てる。
 * この結果を calculateFinalScoresFromInputs に渡すと、指定どおりの順位で計算される。
 *
 * @param {Object} rawInputScores - { rank1, rank2, rank3, rank4 }
 * @param {Object} nonTiedRanks - { [playerIndex]: rank }
 * @param {Object} assignments - 同点者用 { [playerIndex]: rank }
 * @returns {{ reorderedInputs: Object, order: number[] }} reorderedInputs は rank1..rank4 に「1位の人の持ち点, 2位の人の持ち点, ...」を入れたもの。order は order[rank-1] === playerIndex。
 */
export function buildReorderedInputsFromAssignments(rawInputScores, nonTiedRanks, assignments) {
  const scores = [1, 2, 3, 4].map((r) => Number(rawInputScores[`rank${r}`]) ?? 0);
  const rankToPlayerIndex = {};
  Object.entries(nonTiedRanks).forEach(([playerIndex, rank]) => {
    rankToPlayerIndex[rank] = Number(playerIndex);
  });
  Object.entries(assignments).forEach(([playerIndex, rank]) => {
    rankToPlayerIndex[rank] = Number(playerIndex);
  });

  const order = [1, 2, 3, 4].map((r) => rankToPlayerIndex[r]);
  const reorderedInputs = {
    rank1: scores[order[0]],
    rank2: scores[order[1]],
    rank3: scores[order[2]],
    rank4: scores[order[3]]
  };
  return { reorderedInputs, order };
}
