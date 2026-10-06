# 構成・データ構造

## 全体像
- フロント: React 19 / react-router-dom 7（**HashRouter**）/ Tailwind / create-react-app（react-scripts 5）
- バックエンド: Firebase Auth（メール+パスワード、Googleポップアップ）と Firestore。プロジェクトIDは `mahjong-first`
- Firebaseの設定は `src/firebase.js` に直書き。`src/config/firebaseConfig.js` は環境変数を読む別実装だが、どこからもimportされていない
- ホスティング: Netlify。`netlify.toml` で全パスを `index.html` にリライトし、JS/CSS/全体に no-cache ヘッダを付けている。`firebase.json` の hosting 設定は使っていない
- Service Worker（`public/serviceWorker.js`、`src/index.js` で登録）がある。デプロイ後に古い画面が残るときは、ハードリロードか、DevTools の Application → Service Workers で Unregister（未検証）

## 画面とルーティング（`src/App.js`）

| パス | ファイル | 内容 |
|---|---|---|
| `/` | `App.js` の `HomeOrLanding` | **未ログイン → `Landing.jsx`**（ログイン不要の精算計算ツール＋FAQ。検索の入口）／ログイン済み → `Home.jsx` |
| `/login` `/signup` | `Login.jsx` / `Signup.jsx` | メール+パスワード、またはGoogleでログイン・登録（`noindex`） |
| `/home` | `Home.jsx` | グループ（= 1回の集まり）の一覧・作成・削除、ログアウト。作成時の名前の既定は今日の日付 |
| `/dashboard/group/:groupId` | `Dashboard.jsx` 内の `GroupDetail` | プレイヤー設定 → チップ・順位点設定 → 半荘結果入力 → 結果表・順位回数表 |
| `/dashboard/analysis` | `Analysis.jsx` | 年・プレイヤーで絞り込み、グループ横断の合計（半荘結果・チップ・最終結果） |
| `*` | `NotFound.jsx` | |

`PrivateRoute` がログイン済みかを見て、未ログインならログイン画面へ送る。

## ソースの地図（`src/`）

| ファイル | 役割 |
|---|---|
| `Dashboard.jsx` | **メイン画面。** グループの取得・保存（`saveToFirestore`）、`GroupDetail`、半荘追加 `addGameScore`（持ち点→支払い反映→順位点→飛び賞→保存）、結果の編集・削除 |
| `components/Dashboard/PlayerSettings.jsx` | 日付・プレイヤー名（過去の名前を候補表示） |
| `components/Dashboard/ChipSettings.jsx` | チップ配点、順位点の選択（5-10 / 5-15 / 10-20 / 10-30 / 20-30） |
| `components/Dashboard/GameInputForm.jsx` | 半荘結果の入力フォーム（持ち点、プレビュー、合計、飛び賞モーダル、同点モーダル） |
| `components/Dashboard/GameResultsTable.jsx` | 半荘ごとの結果表・チップ行・合計。末尾に `RankingTable`（順位回数表） |
| `components/Dashboard/TieResolutionModal.jsx` | 同点時の順位指定 |
| `Landing.jsx` / `components/Landing/ScoreCalculator.jsx` | 未ログイン向けトップ。ログイン不要の精算計算ツール（保存しない）と FAQ（FAQPage の JSON-LD つき） |
| `components/Dashboard/SEO/` | SEO・構造化データ（`react-helmet`）。サイトURLは `https://h4k-mj.xyz` |
| `analytics.js` | GA4（Firebase Analytics）。`initAnalytics()` を `index.js` で呼び、`trackEvent(name, params)` で計測 |
| `utils/quickCalc.js` | 精算計算ツール用の純関数 `calculateQuickResult`。`scoreCalculation.js` を再利用 |
| `utils/scoreCalculation.js` | **点数ロジックの中心。** 入力変換、五捨六入、順位点、飛んだ人の支払い反映、集計 |
| `utils/tieResolution.js` | 同点判定・順位の組み立て |
| `Home.jsx` / `Analysis.jsx` / `Login.jsx` / `Signup.jsx` / `AuthContext.js` / `PrivateRoute.jsx` | 上の画面表のとおり |

### 使われていないファイル（触る前に確認）
- `GroupDetail.jsx`（`Dashboard.jsx` 内の同名コンポーネントが実際に使われている）
- `hooks/useGameManager.js`、`hooks/useFirebase.js`
- `config/firebaseConfig.js`
- `App.test.js`（CRA初期のまま。実態に合っていない）

## 検索エンジン向けの設定（SEO）
- 実質の公開URLは `https://h4k-mj.xyz/` の1つ（HashRouter なので `#/…` は別ページとして扱われない）。入口は `Landing.jsx`
- OGP・description・canonical・JSON-LD（WebApplication）は **`public/index.html` に静的に書く**。LINE・X などの共有プレビューは JS を実行しないため。`react-helmet`（`SEO.js`）で後から差し込むタグは、検索エンジン（JSを実行する）向け
- `public/robots.txt` / `sitemap.xml` は本番ドメイン。ページを増やしたら sitemap に追記する
- `AuthProvider` は認証の確定まで「Loading...」だけを表示する。クローラーが Firebase Auth の初期化を待てない場合は、トップが「Loading...」に見える恐れがある（backlog 参照。デプロイ後に Search Console の URL 検査で確認する）

## 命名の注意
- `rank1`〜`rank4`（持ち点・`finalScores`・チップ行のキー）は **「1〜4人目のプレイヤー列」**。`players[0]` が `rank1`。順位ではない。
- 順位は点数の大小から求める。順位回数は `rankingCounts[プレイヤー名]["1位"]` のように持つ。
- プレイヤーは**名前の文字列だけ**で識別される。表記ゆれがあると別人として集計される（`Analysis.jsx` は名前の一致で集計）。

## データモデル（Firestore）

### `groups/{docId}`（docId は Firestore の自動ID。画面URLの `groupId` もこれ）

| フィールド | 型 | 内容 |
|---|---|---|
| `name` | string | グループ名 |
| `date` | string | 日付（`Analysis` が先頭4桁から年を取る。無ければ `name` から） |
| `createdAt` | ISO文字列 | |
| `userId` | string | 作成者のuid。**ルールの権限判定に使う** |
| `players` | string[4] | プレイヤー名。添字が列（`rank1`〜`rank4`）に対応 |
| `games` | object[] | 半荘の配列（下記） |
| `settings` | object | `chipDistribution`（配点、既定300）、`rankPointOption`（例 `"10-30"`）、`rankPoints`（[1位,2位,3位,4位]、例 `[0,10,-10,-30]`） |
| `chipRow` | object | `{rank1..rank4}` チップ枚数（空は20として扱う） |
| `rankingCounts` | object | `{ [プレイヤー名]: {"1位":n,"2位":n,"3位":n,"4位":n} }` |
| `finalStats` | object | `{ [プレイヤー名]: {finalResult, chipBonus, halfResult} }`。**派生値**で、読み込み時と保存時に `recalcFinalStats` で再計算される |
| `lastUpdated` | ISO文字列 | `saveToFirestore` 経由の保存時に更新 |

メモリ上では `docId`（FirestoreのID）と `id` を併用しているが、保存するときは `docId` を除く。

### `games[]` の1要素（半荘）

| フィールド | 内容 |
|---|---|
| `id` | `Date.now()` |
| `createdAt` | ISO文字列 |
| `rawInputScores` / `inputScores` | 入力どおりの持ち点（生の点数）。同じ値 |
| `adjustedInputScores` | 飛んだ人の支払いを反映した持ち点（2026-10-04 以降の半荘のみ） |
| `tobiBonus[]` | `{fromIndex, toIndex, fromPlayer, toPlayer, amount, points, paymentPoints}`。`fromIndex`＝飛んだ人、`toIndex`＝飛ばした人（0〜3） |
| `baseFinalScores` | 飛び賞を加減算する前の順位点 |
| `finalScores` | **最終スコア**（順位点＋飛び賞、pt）。集計・表示はこれだけを使う |

古い半荘には `tobiBonus` などが無いことがある。読むときは未定義を許すこと。

### `rankingCounts` の更新規則（不一致に注意）
- 半荘の追加時: `baseFinalScores`（飛び賞の加減算前）の大小で順位を決めて加算
- 半荘の削除時: 残りの全半荘を `finalScores`（飛び賞の加減算後）で再集計
- 結果表のセルを手で編集したとき: 更新しない
→ 追加時と削除時で順位の決め方が違うため、飛び賞のある半荘では食い違う可能性がある（backlog 参照）。

### Firestoreのルール（`firestore.rules`）
- `groups`: **作成**はログイン済みなら誰でも（`userId` の検証なし）／**読み・更新・削除**は `userId` が自分のuidのときだけ
- `users/{uid}`: 自分のみ（コードからは使っていない）／ `admin/*`: カスタムクレーム `admin` のみ
- 他人が読む機能（共有URLなど）を作るときは、ルールの変更が必要

### 読み書きの流れ
- ログイン後、`Dashboard` が自分の全グループを一括取得（`where userId == uid`）し、各グループの `finalStats` をクライアントで再計算
- グループ画面を開くと、対象ドキュメントを `getDoc` で取り直す
- 変更のたびにドキュメント全体を `setDoc`（merge なし）で上書きする。**2台で同時に編集すると後勝ち**
