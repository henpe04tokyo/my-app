// src/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import SEO from './components/Dashboard/SEO/SEO';

/**
 * SEO最適化された404エラーページ
 */
const NotFound = () => {
  return (
    <>
      <SEO
        title="ページが見つかりません | 麻雀スコア計算アプリ"
        description="お探しのページは見つかりませんでした。麻雀スコア計算アプリのホームページに戻ってください。"
        // noindex指定でエラーページがインデックスされないようにする
        robots="noindex, follow"
      />
      
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <h1 className="mb-2 text-6xl font-bold text-indigo-600">404</h1>
        <h2 className="mb-6 text-2xl font-semibold text-gray-800">ページが見つかりません</h2>
        <p className="mb-8 max-w-md text-gray-600">
          お探しのページは存在しないか、移動した可能性があります。
          URLを確認するか、以下のリンクからホームページにお戻りください。
        </p>
        <Link
          to="/"
          className="rounded-md bg-indigo-600 px-6 py-3 text-white shadow-md transition-colors hover:bg-indigo-700"
        >
          ホームに戻る
        </Link>
        
        {/* 関連ページへのリンク（SEO向けの内部リンク） */}
        <div className="mt-12 text-sm text-gray-500">
          <p className="mb-2">他のページをお探しですか？</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/" className="text-indigo-500 hover:underline">ホーム</Link>
            <Link to="/dashboard/analysis" className="text-indigo-500 hover:underline">集計・分析</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;