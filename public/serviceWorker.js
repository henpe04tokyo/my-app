// public/serviceWorker.js を修正

const CACHE_NAME = "mahjong-score-cache-v1";
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

// フェッチ時のキャッシュ戦略 - chrome-extension スキームを除外
self.addEventListener("fetch", (event) => {
  // chrome-extension スキームのリクエストは処理しない
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // Firebase関連のリクエストは処理しない (リアルタイム性を確保)
  if (event.request.url.includes('firestore') || 
      event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis.com')) {
    return;
  }
  
  // HTMLやJSなどの静的アセットのみキャッシュ
  if (event.request.method === 'GET' && 
     (event.request.url.endsWith('.js') || 
      event.request.url.endsWith('.css') ||
      event.request.url.endsWith('.html') ||
      event.request.url === self.location.origin + '/' ||
      STATIC_ASSETS.includes(new URL(event.request.url).pathname))) {
      
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // キャッシュがあればそれを返す
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // なければネットワークから取得
          return fetch(event.request)
            .then((response) => {
              // 正常なレスポンスのみキャッシュ
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // レスポンスをクローン (ストリームは一度しか読めないため)
              const responseToCache = response.clone();
              
              // キャッシュに追加
              caches.open(CACHE_NAME)
                .then((cache) => {
                  try {
                    cache.put(event.request, responseToCache);
                  } catch (error) {
                    console.error('キャッシュ保存エラー:', error);
                  }
                });
              
              return response;
            });
        })
    );
  }
});