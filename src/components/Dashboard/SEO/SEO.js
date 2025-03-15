// src/components/SEO/SEO.js
import React from 'react';
import { Helmet } from 'react-helmet';

/**
 * SEOコンポーネント - ページごとのメタタグを管理
 * 
 * @param {Object} props
 * @param {string} props.title - ページタイトル
 * @param {string} props.description - メタディスクリプション
 * @param {string} props.keywords - メタキーワード（カンマ区切り）
 * @param {string} props.canonical - 正規URL
 * @param {string} props.ogImage - OGP画像URL
 * @param {string} props.ogType - OGPタイプ (website, article等)
 * @param {string} props.robots - ロボット指示 (index,follow等)
 */
const SEO = ({ 
  title = '麻雀スコア計算アプリ', 
  description = '麻雀のスコアを簡単に計算・管理できるオンラインアプリ。半荘ごとのスコアを記録し、成績を分析できます。',
  keywords = '麻雀,スコア計算,点数計算,成績管理,オンラインツール',
  canonical,
  ogImage = '/images/ogp.png',
  ogType = 'website',
  robots = 'index, follow'
}) => {
  // サイトのベースURL（本番環境に合わせて変更）
  const siteUrl = 'https://mahjong-score.example.com';
  
  // 正規URLの生成
  const canonicalUrl = canonical 
    ? `${siteUrl}${canonical}` 
    : typeof window !== 'undefined' ? window.location.href : '';

  return (
    <Helmet>
      {/* 基本的なメタタグ */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {canonical && <link rel="canonical" href={canonicalUrl} />}
      <meta name="robots" content={robots} />
      
      {/* OGP（Open Graph Protocol）タグ - SNSシェア用 */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {canonical && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />
      <meta property="og:site_name" content="麻雀スコア計算アプリ" />
      
      {/* Twitter Card タグ */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}${ogImage}`} />
      
      {/* モバイル最適化 */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </Helmet>
  );
};

export default SEO;