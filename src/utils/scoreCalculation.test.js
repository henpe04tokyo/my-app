import {
  toRawScore,
  sanitizeScoreInput,
  applyTobiPayments,
  calculateFinalScoresFromInputs
} from './scoreCalculation';

describe('toRawScore / sanitizeScoreInput', () => {
  test('下2桁を省略した入力を生の点数に変換する', () => {
    expect(toRawScore('292')).toBe(29200);
    expect(toRawScore('-3')).toBe(-300);
    expect(toRawScore('0')).toBe(0);
  });

  test('数値として解釈できない入力は NaN', () => {
    ['', '-', 'abc', '1.5'].forEach((v) => expect(toRawScore(v)).toBeNaN());
  });

  test('先頭の - と数字だけを残し、4桁までに制限する', () => {
    expect(sanitizeScoreInput('2a9-2')).toBe('292');
    expect(sanitizeScoreInput('-3-0')).toBe('-30');
    expect(sanitizeScoreInput('123456')).toBe('1234');
    expect(sanitizeScoreInput('-80', false)).toBe('80');
  });
});

describe('applyTobiPayments', () => {
  const entered = { rank1: 36000, rank2: 41000, rank3: 20000, rank4: 3000 };

  test('飛んだ人から引いて、飛ばした人に足す（入力は変更しない）', () => {
    const adjusted = applyTobiPayments(entered, [{ fromIndex: 3, toIndex: 1, paymentPoints: 8000 }]);
    expect(adjusted).toEqual({ rank1: 36000, rank2: 49000, rank3: 20000, rank4: -5000 });
    expect(entered.rank4).toBe(3000);
  });

  test('合計は変わらない', () => {
    const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    const adjusted = applyTobiPayments(entered, [{ fromIndex: 3, toIndex: 0, paymentPoints: 8000 }]);
    expect(sum(adjusted)).toBe(sum(entered));
  });

  test('払った点数が 0・不正、同一プレイヤー、範囲外の行は無視する', () => {
    const rows = [
      { fromIndex: 3, toIndex: 1, paymentPoints: 0 },
      { fromIndex: 3, toIndex: 1, paymentPoints: NaN },
      { fromIndex: 2, toIndex: 2, paymentPoints: 5000 },
      { fromIndex: NaN, toIndex: 1, paymentPoints: 5000 },
      { fromIndex: 4, toIndex: 1, paymentPoints: 5000 }
    ];
    expect(applyTobiPayments(entered, rows)).toEqual(entered);
  });

  test('複数の行（ダブロンなど）を順に反映する', () => {
    const adjusted = applyTobiPayments(entered, [
      { fromIndex: 3, toIndex: 0, paymentPoints: 2000 },
      { fromIndex: 3, toIndex: 1, paymentPoints: 3000 }
    ]);
    expect(adjusted).toEqual({ rank1: 38000, rank2: 44000, rank3: 20000, rank4: -2000 });
  });

  test('支払いを反映すると順位が入れ替わることがある', () => {
    const before = { rank1: 45000, rank2: 40000, rank3: 12000, rank4: 3000 };
    const topIndex = (scores) => {
      const result = calculateFinalScoresFromInputs(scores);
      return Number(Object.keys(result).find((k) => result[k] === Math.max(...Object.values(result))));
    };
    expect(topIndex(before)).toBe(0);
    const after = applyTobiPayments(before, [{ fromIndex: 3, toIndex: 1, paymentPoints: 8000 }]);
    expect(topIndex(after)).toBe(1);
  });

  test('省略入力の 80 を払った点数として使うと、手計算した結果と一致する', () => {
    const adjusted = applyTobiPayments(
      { rank1: toRawScore('360'), rank2: toRawScore('410'), rank3: toRawScore('200'), rank4: toRawScore('30') },
      [{ fromIndex: 3, toIndex: 1, paymentPoints: toRawScore('80') }]
    );
    // 南49,000 / 東36,000 / 西20,000 / 北-5,000 → 南 +69, 東 +16, 西 -20, 北 -65
    expect(calculateFinalScoresFromInputs(adjusted)).toEqual({ 0: 16, 1: 69, 2: -20, 3: -65 });
  });
});
