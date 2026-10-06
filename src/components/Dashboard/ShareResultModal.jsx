// src/components/Dashboard/ShareResultModal.jsx
// 結果の共有画像をプレビューし、共有（スマホ）・保存・コピーする。
import React, { useEffect, useMemo, useState } from 'react';
import { renderTotalImage, renderGamesImage, canvasToBlob } from '../../utils/shareImage';

const TITLES = {
  total: '結果を画像で共有',
  games: '半荘ごとの結果を画像で共有'
};

const fileNameOf = (kind, summary) => {
  const date = (summary.label.split('　')[0] || 'result').replace(/\//g, '-');
  return `mahjong-${kind === 'games' ? 'games' : 'result'}-${date}.png`;
};

const ShareResultModal = ({ kind, summary, onClose }) => {
  const [image, setImage] = useState(null); // { blob, url }
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fileName = useMemo(() => fileNameOf(kind, summary), [kind, summary]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    const canvas = kind === 'games' ? renderGamesImage(summary) : renderTotalImage(summary);
    canvasToBlob(canvas)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImage({ blob, url: objectUrl });
      })
      .catch(() => {
        if (!cancelled) setError('画像を作れませんでした。もう一度お試しください。');
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [kind, summary]);

  const file = image ? new File([image.blob], fileName, { type: 'image/png' }) : null;
  const canShare = Boolean(file && navigator.canShare && navigator.canShare({ files: [file] }));
  const canCopy = Boolean(image && navigator.clipboard && navigator.clipboard.write && window.ClipboardItem);

  const handleShare = async () => {
    try {
      await navigator.share({ files: [file], title: '麻雀の結果' });
    } catch (e) {
      // 共有シートを閉じただけのときは何も出さない
      if (e && e.name !== 'AbortError') setMessage('共有できませんでした。「画像を保存」を使ってください。');
    }
  };

  const handleSave = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage('画像を保存しました。');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': image.blob })]);
      setMessage('画像をコピーしました。LINEなどに貼り付けられます。');
    } catch (e) {
      setMessage('コピーできませんでした。「画像を保存」を使ってください。');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={TITLES[kind]}
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-md flex-col rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-base font-semibold text-gray-800">{TITLES[kind]}</h3>

        <div className="min-h-0 flex-1 overflow-y-auto rounded border border-gray-200 bg-gray-50">
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {!error && !image && <p className="p-4 text-sm text-gray-500">画像を作っています…</p>}
          {image && <img src={image.url} alt="共有用の結果画像" className="mx-auto block w-full" />}
        </div>

        <p className="mt-2 min-h-[1.25rem] text-xs text-gray-600" aria-live="polite">
          {message}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {canShare && (
            <button
              type="button"
              onClick={handleShare}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              共有
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!image}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            画像を保存
          </button>
          {canCopy && (
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              コピー
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareResultModal;
