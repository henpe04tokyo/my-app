import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareResultModal from './ShareResultModal';
import GameResultsTable from './GameResultsTable';
import { buildShareSummary } from '../../utils/shareResult';

// Canvas は jsdom にないため、描画は差し替える（見た目は shareImage.js を別途ブラウザで確認）
// （CRA の Jest は jest.fn の実装をテストごとにリセットするため、通常の関数で差し替える）
jest.mock('../../utils/shareImage', () => ({
  renderTotalImage: () => ({ kind: 'total' }),
  renderGamesImage: () => ({ kind: 'games' }),
  canvasToBlob: () => Promise.resolve(new Blob(['png'], { type: 'image/png' }))
}));
jest.mock('../../analytics', () => ({ trackEvent: () => {}, initAnalytics: () => {} }));

const game = (a, b, c, d) => ({ id: Math.random(), finalScores: { rank1: a, rank2: b, rank3: c, rank4: d } });
const players = ['田中', '佐藤', '鈴木', '高橋'];
const group = {
  id: 'g1',
  name: '2026-10-06',
  date: '2026-10-06',
  settings: { chipDistribution: 300 },
  games: [game(69, 16, -20, -65)],
  rankingCounts: {}
};
const summary = buildShareSummary({ group, players, chipRow: {} });

beforeEach(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock');
  global.URL.revokeObjectURL = jest.fn();
  delete navigator.canShare;
  delete navigator.share;
});

describe('ShareResultModal', () => {
  test('画像を作ってプレビューを出し、保存できる', async () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ShareResultModal kind="total" summary={summary} onClose={() => {}} />);
    const img = await screen.findByAltText('共有用の結果画像');
    expect(img).toHaveAttribute('src', 'blob:mock');
    userEvent.click(screen.getByRole('button', { name: '画像を保存' }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(screen.getByText('画像を保存しました。')).toBeInTheDocument();
    click.mockRestore();
  });

  test('ファイル共有に対応していない環境では「共有」を出さない', async () => {
    render(<ShareResultModal kind="games" summary={summary} onClose={() => {}} />);
    await screen.findByAltText('共有用の結果画像');
    expect(screen.queryByRole('button', { name: '共有' })).not.toBeInTheDocument();
  });

  test('ファイル共有に対応していれば「共有」で画像ファイルを渡す', async () => {
    navigator.canShare = jest.fn(() => true);
    navigator.share = jest.fn(() => Promise.resolve());
    render(<ShareResultModal kind="total" summary={summary} onClose={() => {}} />);
    await screen.findByAltText('共有用の結果画像');
    userEvent.click(screen.getByRole('button', { name: '共有' }));
    await waitFor(() => expect(navigator.share).toHaveBeenCalledTimes(1));
    const arg = navigator.share.mock.calls[0][0];
    expect(arg.files).toHaveLength(1);
    expect(arg.files[0].type).toBe('image/png');
    expect(arg.files[0].name).toBe('mahjong-result-2026-10-06.png');
  });

  test('「閉じる」で onClose が呼ばれ、閉じたときに画像のURLを解放する', async () => {
    const onClose = jest.fn();
    const { unmount } = render(<ShareResultModal kind="total" summary={summary} onClose={onClose} />);
    await screen.findByAltText('共有用の結果画像');
    userEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalled();
    unmount();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});

describe('GameResultsTable の共有ボタン', () => {
  const renderTable = (g) =>
    render(
      <GameResultsTable
        currentGroup={g}
        players={players}
        chipRow={{ rank1: '', rank2: '', rank3: '', rank4: '' }}
        handleEditGameScore={() => {}}
        handleDeleteGame={() => {}}
        handleChipChange={() => {}}
      />
    );

  test('半荘があれば2つのボタンが出て、押すとモーダルが開く', async () => {
    renderTable(group);
    userEvent.click(screen.getByRole('button', { name: '半荘ごとの結果を画像で共有' }));
    expect(await screen.findByRole('dialog', { name: '半荘ごとの結果を画像で共有' })).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '結果を画像で共有' })).toBeInTheDocument();
  });

  test('半荘がまだ無いときはボタンを出さない', () => {
    renderTable({ ...group, games: [] });
    expect(screen.queryByRole('button', { name: '結果を画像で共有' })).not.toBeInTheDocument();
  });
});
