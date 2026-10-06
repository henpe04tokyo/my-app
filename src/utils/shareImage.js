// src/utils/shareImage.js
// 結果の共有画像（PNG）を Canvas で描く。外部ライブラリは使わない。
// 数字は shareResult.js の buildShareSummary の戻り値をそのまま受け取る。
import { formatPoint } from './shareResult';

const WIDTH = 720;
const SCALE = 2; // 高解像度で描く（LINEなどで拡大されても崩れにくい）
const FONT =
  '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif';

const COLOR = {
  header: '#123c8f',
  headerSub: '#cfe0ff',
  text: '#111827',
  muted: '#6b7280',
  faint: '#9ca3af',
  line: '#e5e7eb',
  rowAlt: '#f8fafc',
  plus: '#2563eb',
  minus: '#dc2626',
  zero: '#374151',
  highlight: '#fff7e0',
  tableHead: '#eef2f7'
};
const RANK_COLOR = ['#f5b301', '#9aa5b1', '#c98b5a'];

const HEADER_HEIGHT = 120;
const FOOTER_HEIGHT = 56;

const pointColor = (value) => {
  if (typeof value !== 'number' || value === 0) return COLOR.zero;
  return value > 0 ? COLOR.plus : COLOR.minus;
};

const createCanvas = (height) => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = 'alphabetic';
  return { canvas, ctx };
};

// 幅に収まらない文字列は、末尾を「…」にする
const fitText = (ctx, text, maxWidth) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
};

const drawHeader = (ctx, title, subtitle) => {
  ctx.fillStyle = COLOR.header;
  ctx.fillRect(0, 0, WIDTH, HEADER_HEIGHT);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = `bold 38px ${FONT}`;
  ctx.fillText(title, 32, 58);
  ctx.fillStyle = COLOR.headerSub;
  ctx.font = `22px ${FONT}`;
  ctx.fillText(fitText(ctx, subtitle, WIDTH - 64), 32, 96);
};

const drawFooter = (ctx, y) => {
  ctx.fillStyle = COLOR.faint;
  ctx.font = `20px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('h4k-mj.xyz', WIDTH / 2, y + 34);
};

const subtitleOf = (summary, suffix) =>
  [summary.label, suffix].filter(Boolean).join('　');

/**
 * 合計の結果（順位・最終結果・半荘計とチップの内訳）
 * @param {ReturnType<import('./shareResult').buildShareSummary>} summary
 * @returns {HTMLCanvasElement}
 */
export function renderTotalImage(summary) {
  const rowHeight = 104;
  const height = HEADER_HEIGHT + summary.ranked.length * rowHeight + FOOTER_HEIGHT;
  const { canvas, ctx } = createCanvas(height);

  drawHeader(ctx, '麻雀 結果', subtitleOf(summary, `${summary.gameCount}半荘`));

  summary.ranked.forEach((row, pos) => {
    const y = HEADER_HEIGHT + pos * rowHeight;
    if (pos % 2 === 1) {
      ctx.fillStyle = COLOR.rowAlt;
      ctx.fillRect(0, y, WIDTH, rowHeight);
    }

    // 順位バッジ
    ctx.beginPath();
    ctx.arc(60, y + rowHeight / 2, 24, 0, Math.PI * 2);
    ctx.fillStyle = RANK_COLOR[row.rank - 1] || '#cbd5e1';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(row.rank), 60, y + rowHeight / 2 + 9);

    // 名前と内訳
    ctx.textAlign = 'left';
    ctx.fillStyle = COLOR.text;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(fitText(ctx, row.name, 330), 108, y + 46);
    ctx.fillStyle = COLOR.muted;
    ctx.font = `20px ${FONT}`;
    ctx.fillText(
      `半荘 ${formatPoint(row.halfPoints)}　チップ ${formatPoint(row.chipBonus)}`,
      108,
      y + 80
    );

    // 最終結果
    ctx.textAlign = 'right';
    ctx.fillStyle = COLOR.faint;
    ctx.font = `22px ${FONT}`;
    ctx.fillText('pt', WIDTH - 32, y + 64);
    ctx.fillStyle = pointColor(row.total);
    ctx.font = `bold 44px ${FONT}`;
    ctx.fillText(formatPoint(row.total), WIDTH - 72, y + 64);

    ctx.fillStyle = COLOR.line;
    ctx.fillRect(0, y + rowHeight - 1, WIDTH, 1);
  });

  drawFooter(ctx, HEADER_HEIGHT + summary.ranked.length * rowHeight);
  return canvas;
}

/**
 * 半荘ごとの結果（半荘×4人の表。下に半荘計・チップ・最終）
 * @param {ReturnType<import('./shareResult').buildShareSummary>} summary
 * @returns {HTMLCanvasElement}
 */
export function renderGamesImage(summary) {
  const rowHeight = 56;
  const tableX = 24;
  const tableWidth = WIDTH - tableX * 2;
  const firstCol = 96;
  const col = (tableWidth - firstCol) / 4;

  // 見出し行 + 半荘 + 半荘計 + チップ + 最終
  const rowCount = 1 + summary.games.length + 3;
  const height = HEADER_HEIGHT + 16 + rowCount * rowHeight + 16 + FOOTER_HEIGHT;
  const { canvas, ctx } = createCanvas(height);

  drawHeader(ctx, '麻雀 半荘ごとの結果', subtitleOf(summary, `${summary.gameCount}半荘`));

  let y = HEADER_HEIGHT + 16;
  const centerX = (index) => tableX + firstCol + col * index + col / 2;

  const drawRowBackground = (color) => {
    ctx.fillStyle = color;
    ctx.fillRect(tableX, y, tableWidth, rowHeight);
  };
  const drawRowLine = () => {
    ctx.fillStyle = COLOR.line;
    ctx.fillRect(tableX, y + rowHeight - 1, tableWidth, 1);
  };
  const drawLabel = (text, bold = false) => {
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOR.muted;
    ctx.font = `${bold ? 'bold ' : ''}20px ${FONT}`;
    ctx.fillText(text, tableX + firstCol / 2, y + 36);
  };
  const drawValues = (values, size, bold) => {
    ctx.textAlign = 'center';
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
    values.forEach((value, index) => {
      ctx.fillStyle = pointColor(value);
      ctx.fillText(formatPoint(value), centerX(index), y + 37);
    });
  };

  // 見出し（名前）
  drawRowBackground(COLOR.tableHead);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLOR.text;
  ctx.font = `bold 22px ${FONT}`;
  summary.names.forEach((name, index) => {
    ctx.fillText(fitText(ctx, name, col - 12), centerX(index), y + 36);
  });
  drawLabel('半荘', true);
  y += rowHeight;

  // 半荘ごと
  summary.games.forEach((game) => {
    drawLabel(String(game.no));
    drawValues(game.scores, 28, true);
    drawRowLine();
    y += rowHeight;
  });

  const totals = (key) => summary.rows.map((row) => row[key]);

  drawLabel('半荘計');
  drawValues(totals('halfPoints'), 26, false);
  drawRowLine();
  y += rowHeight;

  drawLabel('チップ');
  drawValues(totals('chipBonus'), 26, false);
  drawRowLine();
  y += rowHeight;

  drawRowBackground(COLOR.highlight);
  drawLabel('最終', true);
  drawValues(totals('total'), 30, true);
  drawRowLine();
  y += rowHeight;

  drawFooter(ctx, y + 16);
  return canvas;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
export const canvasToBlob = (canvas) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('画像を作れませんでした'))), 'image/png');
  });
