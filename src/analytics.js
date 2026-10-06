// src/analytics.js
// GA4（Firebase Analytics）。非対応の環境や、広告ブロッカーなどで読み込めない場合は何もしない。
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';
import { app } from './firebase';

let analyticsPromise = null;

const getAnalyticsInstance = () => {
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(app) : null))
      .catch(() => null);
  }
  return analyticsPromise;
};

// アプリ起動時に1回呼ぶ（ページビューの自動計測を始める）
export const initAnalytics = () => {
  getAnalyticsInstance();
};

// 計測したい操作用。例: trackEvent('calculator_used', { rule: '10-30' })
export const trackEvent = (name, params = {}) => {
  getAnalyticsInstance().then((analytics) => {
    if (analytics) logEvent(analytics, name, params);
  });
};
