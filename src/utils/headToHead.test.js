import { computeHeadToHead, listOpponents } from './headToHead';

const g1 = {
  players: ['A', 'B', 'C', 'D'],
  settings: { chipDistribution: 300 },
  chipRow: { rank1: 25, rank2: 15, rank3: '', rank4: 20 },
  games: [
    { finalScores: { rank1: 50, rank2: -10, rank3: -15, rank4: -25 } },
    { finalScores: { rank1: -30, rank2: 40, rank3: 0, rank4: -10 } },
  ],
};
const g2 = {
  players: ['B', 'A', 'E', 'C'],
  games: [{ finalScores: { rank1: 20, rank2: 10, rank3: -5, rank4: -25 } }],
};

test('同卓半荘数の多い順に並ぶ', () => {
  expect(listOpponents([g1, g2], 'A')).toEqual([
    { name: 'B', games: 3 }, { name: 'C', games: 3 },
    { name: 'D', games: 2 }, { name: 'E', games: 1 },
  ]);
});

test('自分の合計と直接対決の差（チップ込み）', () => {
  const b = computeHeadToHead([g1, g2], 'A').find((r) => r.name === 'B');
  // self: 50 - 30 + 10 = 30, chip: A は g1 で +15, g2 で 0
  expect(b.self).toEqual({ pt: 30, chip: 15 });
  // diff: (50+10) + (-30-40) + (10-20) = -20, chip: (15 - -15) + 0 = 30
  expect(b.diff).toEqual({ pt: -20, chip: 30 });
  expect(b.groups).toBe(2);
});

test('メイン未選択・不在なら空', () => {
  expect(computeHeadToHead([g1], '')).toEqual([]);
  expect(computeHeadToHead([g1], 'Z')).toEqual([]);
});
