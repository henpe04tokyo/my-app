import { buildShareSummary, formatPoint } from './shareResult';

const game = (a, b, c, d) => ({ finalScores: { rank1: a, rank2: b, rank3: c, rank4: d } });

describe('formatPoint', () => {
  test('符号つきで表示し、0 と未定義を区別する', () => {
    expect(formatPoint(12)).toBe('+12');
    expect(formatPoint(-3)).toBe('-3');
    expect(formatPoint(0)).toBe('0');
    expect(formatPoint(null)).toBe('-');
    expect(formatPoint(undefined)).toBe('-');
  });
});

describe('buildShareSummary', () => {
  const group = {
    name: '2026-10-06',
    date: '2026-10-06',
    settings: { chipDistribution: 300 },
    games: [game(69, 16, -20, -65), game(-10, 30, 5, -25)]
  };
  const players = ['田中', '佐藤', '鈴木', '高橋'];

  test('半荘の合計・チップ・最終結果を、列（1〜4人目）ごとに出す', () => {
    const chipRow = { rank1: '25', rank2: '', rank3: '18', rank4: '' };
    const s = buildShareSummary({ group, players, chipRow });
    expect(s.gameCount).toBe(2);
    const byName = Object.fromEntries(s.rows.map((r) => [r.name, r]));
    expect(byName['田中']).toMatchObject({ halfPoints: 59, chipBonus: 15, total: 74 });
    expect(byName['佐藤']).toMatchObject({ halfPoints: 46, chipBonus: 0, total: 46 });
    expect(byName['鈴木']).toMatchObject({ halfPoints: -15, chipBonus: -6, total: -21 });
    expect(byName['高橋']).toMatchObject({ halfPoints: -90, chipBonus: 0, total: -90 });
  });

  test('最終結果の大きい順に順位をつける', () => {
    const s = buildShareSummary({ group, players, chipRow: { rank1: '25', rank3: '18' } });
    expect(s.ranked.map((r) => [r.rank, r.name])).toEqual([
      [1, '田中'],
      [2, '佐藤'],
      [3, '鈴木'],
      [4, '高橋']
    ]);
  });

  test('同点は同じ順位にして、次の順位を飛ばす', () => {
    const tied = { ...group, games: [game(10, 10, -10, -10)] };
    const s = buildShareSummary({ group: tied, players, chipRow: {} });
    expect(s.ranked.map((r) => r.rank)).toEqual([1, 1, 3, 3]);
  });

  test('名前が空欄なら「プレイヤーN」。日付とグループ名をラベルにする', () => {
    const s = buildShareSummary({ group: { ...group, name: '秋の例会' }, players: ['', ' ', '鈴木'], chipRow: {} });
    expect(s.names).toEqual(['プレイヤー1', 'プレイヤー2', '鈴木', 'プレイヤー4']);
    expect(s.label).toBe('2026/10/06　秋の例会');
  });

  test('グループ名が日付と同じなら、ラベルは日付だけ', () => {
    const s = buildShareSummary({ group, players, chipRow: {} });
    expect(s.label).toBe('2026/10/06');
  });

  test('finalScores の無い古い半荘は、その半荘を数えない（半荘数には入る）', () => {
    const old = { ...group, games: [{ id: 1 }, game(10, 0, 0, -10)] };
    const s = buildShareSummary({ group: old, players, chipRow: {} });
    expect(s.gameCount).toBe(2);
    expect(s.games[0].scores).toEqual([null, null, null, null]);
    expect(s.rows[0].halfPoints).toBe(10);
  });

  test('半荘が無くても落ちない', () => {
    const s = buildShareSummary({ group: { name: 'x' }, players, chipRow: undefined });
    expect(s.gameCount).toBe(0);
    expect(s.rows.every((r) => r.total === 0)).toBe(true);
  });
});
