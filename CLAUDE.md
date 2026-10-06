# CLAUDE.md — 麻雀スコア（h4k-mj.xyz）

麻雀の点数記録・集計Webアプリ。React + Firebase（Auth / Firestore）、Netlifyでホスティング。利用者は今のところオーナー1人。
応答は日本語で行う。詳細は `docs/context/` にあるので、必要になったときに該当ファイルを読むこと。

| 読むタイミング | ファイル |
|---|---|
| 画面・ソース・Firestoreのデータ構造を知りたい | [architecture.md](docs/context/architecture.md) |
| **点数まわり（入力・計算・保存形式）を触る前** | [scoring-spec.md](docs/context/scoring-spec.md) |
| **本番に出す前**／ビルド・テスト／セッションの始め方 | [runbook.md](docs/context/runbook.md) |
| 次に何をやるか、既知の問題 | [backlog.md](docs/context/backlog.md) |
| 過去の改修の経緯と理由 | [changelog.md](docs/context/changelog.md) |

## リポジトリとデプロイ

| 項目 | 内容 |
|---|---|
| 本番URL | https://h4k-mj.xyz/#/ （HashRouter） |
| 本番のソース | `henpe04tokyo/my-app`（public）の `main`。Netlify（team `henpe04tokyo`）が自動ビルド・デプロイ（約20秒） |
| 作業用 | `katahira0420/my-app`（上記のfork、public）。**Claudeのセッションから書き込めるのはこちらだけ** |
| 本番への反映 | forkから本家へPR → 本家側でマージ。**Claudeからは出せない**ので、作成用URLを案内する（手順は runbook.md） |

## 絶対に守ること
1. 持ち点の入力欄は **下2桁省略（100点単位）**。入力文字列は必ず `toRawScore()` を通してから計算に渡す。集計側は生の点数（25000など）が前提。
2. `rank1`〜`rank4` は「順位」ではなく **1〜4人目のプレイヤー列**を表すキー。順位は点数から別に求める。
3. 同点判定・順位・順位点は、**飛んだ人の支払いを反映した後の点数**（`applyTobiPayments` の結果）で行う。
4. 保存済みの `finalScores` は再計算されない。計算ロジックを変えても、過去の半荘は変わらない。
5. Firestoreへの保存は `setDoc` による全体上書き（merge なし）。保存する形を変えるときは、既存データとの互換を確認する。
6. 本家は公開リポジトリ。認証情報・事業戦略・個人情報をコミットしない。
7. PRの作成・マージは、依頼されたときだけ行う。

## 作業の基本
- ビルド確認: `CI=false npx react-scripts build`（`npm ci` は失敗するので `npm install`。`package-lock.json` はコミットしない）
- 単体テスト: `CI=true npx react-scripts test --watchAll=false src/utils/scoreCalculation.test.js`
- Firebaseの設定値は `src/firebase.js` に直書きされている（公開されてよい識別子。守っているのは Firestore のルール）。`.env.*` は不要。
  ただし画面操作にはログインが必要で、クラウドのセッションでは実画面を操作できない。実画面の確認はデプロイ後にオーナーが行う。
- 作業の最後に、仕様が変わったなら `docs/context/` を更新する（changelog は毎回）。
