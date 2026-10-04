# CLAUDE.md — 麻雀スコア（h4k-mj.xyz）

麻雀の点数記録・集計Webアプリ。ユーザーは現状オーナー1人。ここは新しいセッションで最初に読むための地図。

## リポジトリとデプロイ

| 項目 | 内容 |
|---|---|
| 本番URL | https://h4k-mj.xyz/#/ （HashRouter） |
| 本番のソース | `henpe04tokyo/my-app`（public）の `main` |
| 作業用 | `katahira0420/my-app`（上記のfork）。Claudeのセッションからpushできるのはこちらだけ |
| ホスティング | Netlify（teamは `henpe04tokyo`、サイト名 `henpetokyo-mahjong-score`）。`main` へのpushで自動ビルド（約20秒） |
| ビルド | `CI=false npm run build` → `build/`（`netlify.toml`） |

### 変更を本番に出す流れ
1. Claudeが `katahira0420/my-app` にブランチをpush → PR → `main` にマージ
2. ブラウザで `https://github.com/henpe04tokyo/my-app/compare/main...katahira0420:my-app:main` を開いてPRを作り、`henpe04tokyo` 側でマージ（同じブラウザで操作できた実績あり）
3. Netlify の Builds 画面で `Completed` を確認し、`https://h4k-mj.xyz/#/` をハードリロードして動作確認

- fork側はsquashマージ、本家側は通常マージのため、両方の `main` のコミットIDは一致しない。次の作業前に fork の **Sync fork** を押して本家に合わせること。
- Claudeのセッションは `henpe04tokyo` への書き込み権限がなく、本家へのPR作成・マージはできない（読み取りcloneのみ）。
- `firebase.json` と `deploy:*` スクリプトも残っているが、本番はNetlifyデプロイ。`firebase deploy` は使っていない。

## 技術構成
React 19 / react-router-dom 7（HashRouter）/ Tailwind / Firebase（Auth + Firestore）/ create-react-app（react-scripts 5）。

- Firebaseの設定値は `.env.development` / `.env.production`（gitignore済み）と、Netlifyの環境変数にある。リポジトリには入っていない。
- そのため、クラウド環境のClaudeセッションではログインして画面操作できない。確認できるのはビルドと純粋なロジックのみ。
- `npm ci` は `package-lock.json` が `env-cmd` と不整合で失敗する。`npm install` を使う（lockファイルはコミットしない）。Netlifyのビルドは通っている。

## ソースの地図（`src/`）

| ファイル | 役割 |
|---|---|
| `App.js` | ルーティング。`/home`、`/dashboard`、`/dashboard/group/:groupId`、`/dashboard/analysis`、`/login`、`/signup` |
| `Dashboard.jsx` | **メイン画面。** 内部の `GroupDetail` コンポーネントと、半荘追加処理 `addGameScore`（持ち点→順位点→飛び賞反映→Firestore保存）を持つ |
| `components/Dashboard/GameInputForm.jsx` | 半荘結果の入力フォーム（持ち点、合計表示、飛び賞モーダル、同点モーダル） |
| `components/Dashboard/GameResultsTable.jsx` | 半荘ごとの結果表・チップ・合計 |
| `components/Dashboard/TieResolutionModal.jsx` | 同点時の順位指定 |
| `utils/scoreCalculation.js` | **点数ロジックの中心。** 順位点、五捨六入（`roundScore`）、集計（`recalcFinalStats`）、入力変換（`toRawScore` / `sanitizeScoreInput`）、飛んだ人の支払い反映（`applyTobiPayments`） |
| `utils/tieResolution.js` | 同点判定・順位の組み立て |
| `Analysis.jsx` / `Home.jsx` | 分析画面 / グループ一覧 |
| `components/Dashboard/SEO/` | SEO・構造化データ |

### 使われていないファイル（触る前に確認）
- `src/GroupDetail.jsx`：どこからもimportされていない。`Dashboard.jsx` 内の同名コンポーネントが実際に使われている。
- `src/hooks/useGameManager.js`：どこからもimportされていない。

## 点数まわりの仕様（重要）

- **入力は下2桁を省略する（100点単位）。** `292` → 29,200点、`-3` → -300点。符号を除き最大4桁。
- 変換は `toRawScore()`（`utils/scoreCalculation.js`）の1か所に集約している。入力欄の文字列は必ずこれを通してから、合計・同点判定・順位点計算に渡す。**集計側は生の点数（25000など）を前提にしているので、新しい入力経路を作るときも `toRawScore` を通すこと。**
- 保存データ（Firestore）の `game.inputScores` / `rawInputScores` は生の点数、`game.finalScores` は順位点換算後の値（千点単位）。集計・分析は `finalScores` だけを使う。
- 順位点は `roundScore`（五捨六入）で千点単位にしてから、返し点30000との差で計算する。1位は他3人の合計の符号反転。
- 飛び賞は10〜90（千点単位）で、順位点の計算後に加減算する。ボーナス額は入力の省略表記の対象外。
- **飛んだ人が最後に払った点数**（飛び賞の各行の任意項目 `payment`。下2桁省略、例: `80` → 8,000点）：
  持ち点は画面に出ている払う前の点数のまま入力し、ここに払った点数を入れると、`applyTobiPayments` が飛んだ人から引いて飛ばした人に足す。
  ロンなら放銃点、ツモなら飛んだ人の支払い分を入れる（ほかの人の支払いは表示点に反映済みの前提）。空欄なら何もしない。
  **同点判定・順位・順位点は、この反映後の点数で行う**（`GameInputForm` と `Dashboard.addGameScore` の両方で同じ関数を通す）。
- 保存する `game` のフィールド：`rawInputScores` / `inputScores` = 入力どおり、`adjustedInputScores` = 支払い反映後（確定した持ち点）、
  `tobiBonus[].paymentPoints` = 払った点数（生の点数）。
- 同点（持ち点が完全一致）のときは、ユーザーが順位を指定する。

## 既知の問題（未修正）
- `roundScore`（五捨六入）は負の点数で、0から離れる向きに丸めてしまう。例: -1,300 → -2（正しくは -1）、-1,500 → -2（-1）、-5,300 → -6（-5）。
  飛んだ人（マイナス点）の順位点が1点ずれ、その分が1位に乗る。正の点数と1,000点ちょうどの負の点数は正しい。

## 作業メモ
- 変更のたびに `npx react-scripts build`（`CI=false`）が通ることを確認する。
- 画面での動作確認は、デプロイ後にオーナーが `h4k-mj.xyz` で行う。
