// src/components/SEO/StructuredData.js
import React from 'react';

/**
 * 構造化データ（Schema.org）をJSON-LD形式で提供するコンポーネント
 * 
 * @param {Object} props
 * @param {Object} props.data - JSON-LDデータオブジェクト
 */
const StructuredData = ({ data }) => {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
};

/**
 * ウェブアプリケーションのスキーマを生成
 */
export const generateAppSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "麻雀スコア計算アプリ",
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "JPY"
    },
    "description": "麻雀のスコアを簡単に計算・管理できるオンラインアプリ。半荘ごとのスコアを記録し、成績を分析できます。",
    "screenshot": "https://mahjong-score.example.com/images/screenshot.png",
    "featureList": "スコア計算、成績管理、統計分析",
    "softwareVersion": "1.0.0"
  };
};

/**
 * よくある質問（FAQ）のスキーマを生成
 */
export const generateFAQSchema = (faqs) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
};

export default StructuredData;