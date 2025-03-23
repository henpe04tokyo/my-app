// public/serviceWorker.js
const CACHE_NAME = "mahjong-score-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/static/css/main.chunk.css",
  "/static/js/main.chunk.js",
  "/static/js/bundle.js",
  "/manifest.json",
  "/favicon.ico",
  "/logo192.png",
  "/logo512.png"
];

// インストール時にキャッシュを事前に作成
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

// ネットワークファースト戦略 + オフラインサポート
self.addEventListener("fetch", (event) => {
  // Firebase関連リクエストはネットワーク優先、それ以外はキャッシュ優先
  const requestUrl = new URL(event.request.url);
  
  // Firebase関連のリクエストかどうかを判定
  const isFirebaseRequest = 
    requestUrl.hostname.includes('firebaseio.com') || 
    requestUrl.hostname.includes('googleapis.com') ||
    requestUrl.pathname.includes('firestore') ||
    requestUrl.pathname.includes('auth');
  
  // API以外のGETリクエストのみ処理 (POSTリクエストは処理しない)
  if (!isFirebaseRequest && event.request.method === 'GET') {
    event.respondWith(
      // キャッシュファースト戦略
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // キャッシュがあれば即座に返す
            return cachedResponse;
          }
          
          // キャッシュがなければネットワークから取得
          return fetch(event.request)
            .then((response) => {
              // ネットワークからのレスポンスをクローン
              const responseToCache = response.clone();
              
              // キャッシュに保存
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch(err => console.error("キャッシュ保存エラー", err));
              
              return response;
            })
            .catch(() => {
              // オフライン時のフォールバックを提供
              if (event.request.headers.get('accept').includes('text/html')) {
                return caches.match('/index.html');
              }
              
              // デフォルトのエラーページ (画像などのリソースが見つからない場合)
              return new Response(
                "このコンテンツは現在オフラインで利用できません。", 
                { status: 503, headers: { 'Content-Type': 'text/plain' } }
              );
            });
        })
    );
  } else {
    // Firebase関連リクエストや POST リクエストはそのまま処理
    event.respondWith(fetch(event.request));
  }
});

// バックグラウンド同期 (BackgroundSync APIを使った実装)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-game-data') {
    console.log('Service Worker: バックグラウンド同期を実行中');
    event.waitUntil(syncGameData());
  }
});

// 未送信データを同期する処理
async function syncGameData() {
  try {
    // IndexedDBから未送信のデータを取得して送信する処理
    // 実際の実装はアプリケーションの仕様に合わせる
    console.log('Service Worker: データ同期処理が必要になった場合はここに実装');
    return;
  } catch (error) {
    console.error('Service Worker: バックグラウンド同期エラー', error);
    throw error;
  }
}