// src/utils/shareResult.js
// 結果の共有画像に載せる数字を、保存済みの半荘（games[].finalScores）とチップから組み立てる。
// 表示と同じ式（chipBonus = (枚数 − 20) × 配点 / 100、空欄は20枚）。rank1〜rank4 は1〜4人目の列。
const RANK_KEYS = ['rank1', 'rank2', 'rank3', 'rank4'];
const DEFAULT_CHIP_COUNT = 20;
const DEFAULT_CHIP_DISTRIBUTION = 300;

// 小数の誤差で同点が崩れないよう、小数1桁に丸める
const round1 = (value) => Math.round(value * 10) / 10;

/**
 * 点数を符号つきの文字列にする（+12 / -3 / 0）。数値でなければ '-'。
 * @param {number|null|undefined} value
 * @returns {string}
 */
export function formatPoint(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  const rounded = round1(value);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

/**
 * @param {Object} params
 * @param {Object} params.group - グループ（name, date, games, settings）
 * @param {string[]} params.players - 1〜4人目の名前
 * @param {Object} params.chipRow - { rank1..rank4 } チップ枚数（空欄は20枚）
 * @returns {{
 *   label: string,
 *   gameCount: number,
 *   names: string[],
 *   games: Array<{ no: number, scores: Array<number|null> }>,
 *   rows: Array<{ index: number, name: string, halfPoints: number, chipBonus: number, total: number, rank: number }>,
 *   ranked: Array<{ index: number, name: string, halfPoints: number, chipBonus: number, total: number, rank: number }>
 * }}
 */
export function buildShareSummary({ group, players, chipRow }) {
  const games = Array.isArray(group?.games) ? group.games : [];
  const distribution = Number(group?.settings?.chipDistribution) || DEFAULT_CHIP_DISTRIBUTION;
  const names = RANK_KEYS.map((_, index) => String(players?.[index] ?? '').trim() || `プレイヤー${index + 1}`);

  const gameRows = games.map((game, idx) => ({
    no: idx + 1,
    scores: RANK_KEYS.map((key) =>
      typeof game?.finalScores?.[key] === 'number' ? game.finalScores[key] : null
    )
  }));

  const rows = RANK_KEYS.map((key, index) => {
    const halfPoints = gameRows.reduce((sum, game) => sum + (game.scores[index] ?? 0), 0);
    const chipValue = chipRow?.[key];
    const chipCount =
      chipValue === undefined || chipValue === '' || Number.isNaN(Number(chipValue))
        ? DEFAULT_CHIP_COUNT
        : Number(chipValue);
    const chipBonus = ((chipCount - DEFAULT_CHIP_COUNT) * distribution) / 100;
    return {
      index,
      name: names[index],
      halfPoints: round1(halfPoints),
      chipBonus: round1(chipBonus),
      total: round1(halfPoints + chipBonus),
      rank: 0
    };
  });

  // 合計の大きい順。同点は同じ順位（次の順位は飛ばす）で、並びは席順
  const ranked = [...rows].sort((a, b) => b.total - a.total || a.index - b.index);
  ranked.forEach((row, pos) => {
    row.rank = pos > 0 && row.total === ranked[pos - 1].total ? ranked[pos - 1].rank : pos + 1;
  });

  const date = String(group?.date ?? '').replace(/-/g, '/');
  const name = String(group?.name ?? '').trim();
  const label = [date, name && name !== group?.date ? name : ''].filter(Boolean).join('　');

  return { label, gameCount: gameRows.length, names, games: gameRows, rows, ranked };
}
