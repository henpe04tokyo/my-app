# 開発・リリース手順

## アカウントと権限

| もの | 内容 |
|---|---|
| 本家 | `github.com/henpe04tokyo/my-app`（public）。本番のソース。Netlify連携（team `henpe04tokyo`、サイト `henpetokyo-mahjong-score`、ドメイン `h4k-mj.xyz`） |
| fork | `github.com/katahira0420/my-app`（public）。Claudeのセッションが読み書きするのはここ |
| Claudeの権限 | fork: push・PR・マージができる。本家: 読み取りcloneのみ（書き込み・PR作成は不可） |
| Firebase | プロジェクト `mahjong-first`（Auth + Firestore）。Claudeからは操作できない |
| Netlify | `https://app.netlify.com/teams/henpe04tokyo/builds`。Claudeからは見られない（ログインが必要） |

## セッションの始め方（会話をまとめる）
1. Claude Code で新しいセッションを作るとき、リポジトリに **`katahira0420/my-app`** を選ぶ。`research-notes` など別のリポジトリのセッションに混ぜない。
   一覧ではリポジトリごとにまとまり、`CLAUDE.md` が自動で読み込まれる。
2. 最初のメッセージの例:
   「麻雀スコアの改修。<やりたいこと>。まず CLAUDE.md と関連する docs/context を読んで、影響範囲を確認してから進めて」
3. 既存の会話をあとから探す目印として、タグ `remote-agents-project:mahjong-score` を付けている。一覧のグルーピングに効くかは環境次第。
4. 作業の最後に、`docs/context/` を更新する（changelog は毎回、仕様が変わったら scoring-spec / architecture も）。

## 開発の手順
1. 作業前に fork の **Sync fork** を押す（本家のマージコミットぶん、fork が遅れているため）
2. `git clone https://github.com/katahira0420/my-app` → 作業ブランチ `claude/<内容>`
3. `npm install`（**`npm ci` は `package-lock.json` が `env-cmd` とずれていて失敗する**。lockファイルの変更はコミットしない）
4. ビルド確認: `CI=false npx react-scripts build`
5. 単体テスト: `CI=true npx react-scripts test --watchAll=false src/utils/scoreCalculation.test.js`
   - `App.test.js` はCRA初期のままで実態に合わない（未実行）。通すテストは `utils` 配下のもの
6. 画面の動作確認:
   - Firebaseのログインが必要で、クラウドのセッションでは実画面を操作できない
   - 代わりに、`GameInputForm` を単体で描画するコンポーネントテスト（`@testing-library/react`）で確認できる。
     props は `players`・`currentGameScore`・`setCurrentGameScore`・`addGameScore`（`jest.fn()`）・`isSaving`。
     `currentGameScore` はテスト側の state に持たせる。入力欄は placeholder `例: 292`、飛び賞は「飛び賞設定を開く」ボタンからモーダルを開く
   - 実画面の確認は、デプロイ後にオーナーが行う
7. fork にpush → PR → マージ（**依頼があったときだけ**）

## 本番に出す手順
1. 変更が fork の `main` に入っていることを確認
2. ブラウザで次のURLを開き、「Create pull request」を押す（**Claudeからは出せない**）
   `https://github.com/henpe04tokyo/my-app/compare/main...katahira0420:my-app:main`
3. 続けて、そのPRを「Merge pull request」でマージする（`henpe04tokyo` にログインしている必要がある。同じブラウザで続けて操作できた実績あり）
4. Netlify の Builds で、一番上のビルドが最新のコミットで `Completed` になるまで待つ（約20秒）
5. `https://h4k-mj.xyz/#/` をハードリロード（Cmd+Shift+R）。古い画面が残るときは、DevTools の Application → Service Workers で Unregister（未検証）
6. 動作確認チェックリスト
   - ログイン → グループを開く → 半荘を入力（`292` で「= 29,200 点」と出る）→ 保存 → 結果表と順位回数が合う
   - 飛びの半荘: 払った点数を入れて、反映後のプレビューと保存後の結果が手計算と合う
   - 過去のグループが開けて、合計が従来と変わらない

## 検索流入まわりの作業（デプロイ後）
- 計測: GA4 はプロジェクト `mahjong-first` の `measurementId`（`src/firebase.js`）で送る。GA4 のリアルタイムで `calculator_used` などが届くか確認
- Search Console: **登録済み（2026-10-06）**。「ドメイン」プロパティ `h4k-mj.xyz`（`sc-domain:h4k-mj.xyz`）
  - 所有権の確認は DNS の TXT レコード（`google-site-verification=…`）。DNS は Netlify DNS で、レコードは Netlify（team `henpe04tokyo` の DNS 設定）に追加した。**このレコードを消すと確認が外れる**
  - サイトマップ `https://h4k-mj.xyz/sitemap.xml` を送信済み。送信直後は「取得できませんでした」と出たが、配信側は 200・`application/xml`・XML も妥当（一時的な表示とみられる。数日たっても続くなら調べる）
  - 「URL検査」の「公開URLをテスト」で、Googlebot（スマートフォン）の描画が計算ツールのトップ（「Loading...」ではない）と確認済み。「インデックス登録をリクエスト」も実施。コンソールには Service Worker の登録失敗が出るが、Googlebot が非対応なだけで影響なし
  - 新しいページ（解説ページなど）を足したら、`sitemap.xml` に追記してから、URL検査でインデックス登録をリクエストする
  - 操作の注意: Claude in Chrome が使うブラウザは、Google にはログイン済みだったが **Netlify にはログインしていなかった**。Netlify の操作（DNS など）は、オーナーのウィンドウでやってもらう
- 共有プレビュー: 本番URLを LINE・X に貼り、OGP画像とタイトルが出るか確認（反映が遅いときは各サービスのキャッシュ）
- 数週間〜数か月は様子を見る。Search Console の「検索パフォーマンス」で、実際に出ているクエリを見て次に書くページを決める

## ロールバック
- 本家で該当のマージを GitHub の **Revert** で戻す → 自動デプロイ
- 急ぐときは、Netlify の Deploys で以前のデプロイを Publish する（Netlifyの標準機能。未実施）
- データ（Firestore）は計算ロジックの変更では書き換わらない。ただし**保存形式を変える改修**は、戻しても新しい形のデータが残る点に注意

## 落とし穴
- fork は squash / rebase、本家は通常のマージ（マージコミットあり）で取り込むため、両方の `main` のコミットIDは一致しない
- `build/` と `.env*` は gitignore 済み
- 本家は公開リポジトリ。認証情報・事業戦略・個人情報を書かない
- Netlify のビルドコマンドは `CI=false npm run build`。警告はエラー扱いにならない
