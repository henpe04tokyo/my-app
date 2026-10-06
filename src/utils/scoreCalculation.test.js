import {
  roundScore,
  toRawScore,
  sanitizeScoreInput,
  applyTobiPayments,
  calculateFinalScoresFromInputs,
  chipInputToCount,
  chipCountToInput,
  chipDiffTotal,
  recalcFinalStats
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

describe('roundScore（五捨六入）', () => {
  test('プラスの点数: 5以下は切り捨て、6以上は切り上げ', () => {
    expect([29200, 29500, 29600, 30000, 0, 300, 600].map(roundScore)).toEqual([29, 29, 30, 30, 0, 0, 1]);
  });

  test('マイナスの点数も絶対値で丸める（プラスと左右対称）', () => {
    expect([-1300, -1500, -1600, -5000, -5300, -5600].map(roundScore)).toEqual([-1, -1, -2, -5, -5, -6]);
  });

  test('0に丸まるマイナスの点数は -0 にならない', () => {
    expect(Object.is(roundScore(-300), 0)).toBe(true);
    expect(roundScore(-600)).toBe(-1);
  });

  test('飛んだ人の順位点（マイナスの持ち点が端数のとき）', () => {
    // 南49,300 / 東36,000 / 西20,000 / 北-5,300 → 北は -5 として -30-(30+5) = -65
    const result = calculateFinalScoresFromInputs({ rank1: 36000, rank2: 49300, rank3: 20000, rank4: -5300 });
    expect(result).toEqual({ 0: 16, 1: 69, 2: -20, 3: -65 });
  });
});

describe('チップの入力変換', () => {
  test.each([
    ['count', '18', '18'],
    ['diff', '-2', '18'],
    ['diff', '0', '20'],
    ['diff', '3', '23'],
    ['diff', '-22', '-2'],
    ['count', '', ''],
    ['diff', '', ''],
    ['count', '-', null],
    ['diff', '-', null],
    ['count', '1.5', null],
    ['diff', '1.5', null],
    ['diff', 'abc', null],
    ['diff', '05', '25'],
  ])('chipInputToCount(%s, %j) = %j', (mode, input, expected) => {
    expect(chipInputToCount(input, mode)).toBe(expected);
  });

  test('保存値 → 表示', () => {
    expect(chipCountToInput('18', 'diff')).toBe('-2');
    expect(chipCountToInput('18', 'count')).toBe('18');
    expect(chipCountToInput('20', 'diff')).toBe('0');
    expect(chipCountToInput('', 'diff')).toBe('');
    expect(chipCountToInput('', 'count')).toBe('');
    expect(chipCountToInput(undefined, 'diff')).toBe('');
    expect(chipCountToInput('abc', 'diff')).toBe('abc');
  });

  test('保存→表示→保存で値が変わらない', () => {
    ['diff', 'count'].forEach((mode) => {
      ['18', '20', '23', '-2', ''].forEach((stored) => {
        expect(chipInputToCount(chipCountToInput(stored, mode), mode)).toBe(stored);
      });
    });
  });

  test('差分モードで入力した値は、持ち枚数と同じチップ点になる', () => {
    const base = {
      players: ['A', 'B', 'C', 'D'],
      games: [],
      settings: { chipDistribution: 300 },
    };
    const viaDiff = recalcFinalStats({ ...base, chipRow: { rank1: chipInputToCount('-2', 'diff') } });
    const viaCount = recalcFinalStats({ ...base, chipRow: { rank1: chipInputToCount('18', 'count') } });
    expect(viaDiff.A.chipBonus).toBe(viaCount.A.chipBonus);
    expect(viaDiff.A.chipBonus).toBe(-6);
  });
});

describe('chipDiffTotal', () => {
  test('差の合計。空欄は0、全員空欄は null', () => {
    expect(chipDiffTotal({ rank1: '18', rank2: '20', rank3: '', rank4: '20' })).toBe(-2);
    expect(chipDiffTotal({ rank1: '22', rank2: '18', rank3: '20', rank4: '20' })).toBe(0);
    expect(chipDiffTotal({ rank1: '', rank2: '' })).toBeNull();
    expect(chipDiffTotal({})).toBeNull();
    expect(chipDiffTotal(undefined)).toBeNull();
  });
});
