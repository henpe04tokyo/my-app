// キャッシュのバージョンを更新する
const CACHE_NAME = "mahjong-score-cache-v2"; // バージョン番号を上げる
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/static/css/main.chunk.css",
  "/static/js/main.chunk.js",
  "/static/js/bundle.js"
];

// インストール時にキャッシュを作成
self.addEventListener("install", (event) => {
  console.log("Service Worker: インストール中");
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: キャッシュをプリロード中");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("Service Worker: プリロード完了");
        return self.skipWaiting();
      })
      .catch(error => {
        console.error("Service Worker: キャッシュ作成エラー", error);
      })
  );
});

// アクティベート時に古いキャッシュを削除
self.addEventListener("activate", (event) => {
  console.log("Service Worker: アクティベート");
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Service Worker: 古いキャッシュを削除", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log("Service Worker: 現在のキャッシュを使用");
      return self.clients.claim();
    })
  );
});

// fetch イベントハンドラでネットワーク優先戦略を使用
self.addEventListener("fetch", (event) => {
  // API リクエストや Firebase 関連はキャッシュしない
  if (event.request.url.includes('firestore') || 
      event.request.url.includes('firebase')) {
    return;
  }
  
  // chrome-extension スキームのリクエストは処理しない
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    // ネットワークファーストの戦略
    fetch(event.request)
      .then(response => {
        // 有効なレスポンスをキャッシュに保存
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() => {
        // ネットワークエラー時のみキャッシュを使用
        return caches.match(event.request);
      })
  );
});