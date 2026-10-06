import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Landing from './Landing';

// react-router-dom v7 は CRA5 の Jest が解決できないため、Link だけ差し替える
jest.mock(
  'react-router-dom',
  () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }),
  { virtual: true }
);

// GA4 は読み込まない（計測は「使われたこと」だけで、入力値は渡さない）
jest.mock('./analytics', () => ({ trackEvent: jest.fn(), initAnalytics: jest.fn() }));

const renderLanding = () =>
  render(<Landing />);

const typeScores = (scores) => {
  scores.forEach((value, index) => {
    userEvent.type(screen.getByLabelText('持ち点（下2桁は省略）', { selector: `#calc-score-${index}` }), value);
  });
};

describe('Landing（ログイン不要の精算計算ツール）', () => {
  test('入力前は結果表を出さず、ログイン・新規登録への導線がある', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('麻雀の精算計算ツール');
    expect(screen.getByText(/4人分の持ち点を入れると/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'ログイン' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /新規登録/ }).length).toBeGreaterThan(0);
  });

  test('4人分を入れると、順位点とスコアが手計算と一致する', () => {
    renderLanding();
    typeScores(['360', '490', '200', '-50']);
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    const cells = rows.map((row) => within(row).getAllByRole('cell').map((c) => c.textContent));
    // [順位, 名前, 持ち点, 五捨六入, 順位点, スコア]
    expect(cells[0]).toEqual(['1位', 'プレイヤー2', '49,000', '49', '0', '+69']);
    expect(cells[1]).toEqual(['2位', 'プレイヤー1', '36,000', '36', '+10', '+16']);
    expect(cells[2]).toEqual(['3位', 'プレイヤー3', '20,000', '20', '-10', '-20']);
    expect(cells[3]).toEqual(['4位', 'プレイヤー4', '-5,000', '-5', '-30', '-65']);
  });

  test('下2桁省略の入力を、変換後の点数で表示する', () => {
    renderLanding();
    userEvent.type(screen.getByLabelText('持ち点（下2桁は省略）', { selector: '#calc-score-0' }), '292');
    expect(screen.getByText('= 29,200 点')).toBeInTheDocument();
  });

  test('合計が10万点とずれると注意を出す', () => {
    renderLanding();
    typeScores(['360', '490', '200', '-40']);
    expect(screen.getByText(/100,000点と \+1,000 点ずれています/)).toBeInTheDocument();
  });

  test('「持ち点をクリア」で結果が消える', () => {
    renderLanding();
    typeScores(['360', '490', '200', '-50']);
    expect(screen.getByRole('table')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: '持ち点をクリア' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
