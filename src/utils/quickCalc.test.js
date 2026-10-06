import { calculateQuickResult } from './quickCalc';

describe('calculateQuickResult', () => {
  // scoring-spec.md の手計算例（飛び賞を除く）: 南 49,000 / 東 36,000 / 西 20,000 / 北 -5,000（10-30）
  test('順位点・五捨六入・ゼロサムが手計算と一致する', () => {
    const result = calculateQuickResult(['360', '490', '200', '-50'], '10-30');
    expect(result.ok).toBe(true);
    const points = result.players.map((p) => p.finalPoint);
    expect(points).toEqual([16, 69, -20, -65]);
    expect(result.players.map((p) => p.rank)).toEqual([2, 1, 3, 4]);
    expect(points.reduce((a, b) => a + b, 0)).toBe(0);
  });

  test('五捨六入: 百の位が6以上で切り上げ、マイナスも絶対値で丸める', () => {
    const result = calculateQuickResult(['400', '316', '200', '-16'], '10-30');
    const rounded = result.players.map((p) => p.roundedThousand);
    expect(rounded).toEqual([40, 32, 20, -2]);
  });

  test('順位点オプションを切り替えられる', () => {
    const result = calculateQuickResult(['360', '490', '200', '-50'], '10-20');
    // 2位 36,000: +10 - (30-36) = 16 / 3位 20,000: -10 - 10 = -20 / 4位 -5,000: -20 - 35 = -55 / 1位 = 59
    expect(result.players.map((p) => p.finalPoint)).toEqual([16, 59, -20, -55]);
  });

  test('レートを指定すると収支（円）が出る。未指定なら null', () => {
    const withRate = calculateQuickResult(['360', '490', '200', '-50'], '10-30', 50);
    expect(withRate.players.map((p) => p.yen)).toEqual([800, 3450, -1000, -3250]);
    const noRate = calculateQuickResult(['360', '490', '200', '-50'], '10-30', 0);
    expect(noRate.players[0].yen).toBeNull();
  });

  test('同点は席順（先に入力した人）を上位にする', () => {
    const result = calculateQuickResult(['250', '250', '250', '250'], '10-30');
    expect(result.hasTie).toBe(true);
    expect(result.players.map((p) => p.rank)).toEqual([1, 2, 3, 4]);
  });

  test('合計が10万点とずれたら totalDiff に出る（計算は続ける）', () => {
    const result = calculateQuickResult(['360', '490', '200', '-40'], '10-30');
    expect(result.ok).toBe(true);
    expect(result.total).toBe(100000 + 1000);
    expect(result.totalDiff).toBe(1000);
  });

  test('未入力・不正な入力は ok: false', () => {
    expect(calculateQuickResult(['360', '', '200', '-50']).ok).toBe(false);
    expect(calculateQuickResult(['360', 'abc', '200', '-50']).ok).toBe(false);
    expect(calculateQuickResult(['360']).ok).toBe(false);
  });
});
