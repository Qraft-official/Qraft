<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Qraft 開発ルール

このファイルはリポジトリ全体でのCodex作業に適用する。以下の仕様は守るべき開発方針であり、すべてが現在の実装で保証されているという意味ではない。変更前に該当実装と権限境界を確認する。

## サービスと本番環境

- Qraftは「ひらめきを競う問題SNS」。SNS性、競争性、ゲーム性、自分で考える楽しさを重視する。
- 本番: https://qrafters.jp / GitHub: `Qraft-official/Qraft`。
- 正式公開済み。「30人限定」「先行公開」などの旧制限を復活させない。未ログインでも公開コンテンツを閲覧できることを維持する。
- `main` はProduction。Vercel Productionへmainからdeployされるため、直接扱う際は特に慎重にする。
- 技術スタック: Next.js、React、TypeScript、Tailwind CSS、Supabase、Vercel、Stripe。

## リポジトリの案内

整備時の `package.json` はNext.js 16.3.3、React 19.2.8、Tailwind CSS 4。作業時には必ず現在の依存関係と設定を確認する。npmの `package-lock.json` がある。

- `src/app/`: App Routerの画面と `api/**/route.ts`。問題詳細は `p/[id]/`、Discoverは `discover/`、PULSEは `sprint/`、問題集は `problem-sets/`。
- `src/components/`: 共通UI・機能画面。`ProblemAnswerBox.tsx`、`WrittenAnswerBox.tsx`、`ProblemThread.tsx`、`PostCard.tsx`、`DiscoverFeed.tsx`、`PulseHome.tsx`、`PulseArchive.tsx`、`PulseRecord.tsx` など。
- `src/lib/`: データアクセス、共通処理、状態管理、hooks。`store.tsx`、`types.ts`、`problems.ts`、`supabase.ts`、`user-supabase.ts`、`admin-supabase.ts` など。import aliasは `@/*` → `src/*`。
- `src/middleware.ts`、`src/lib/public-routes.ts`、`src/lib/public-catalog.ts`、`Public*` コンポーネント: 公開閲覧・認証導線を変更する際の確認先。
- `supabase/schema.sql` と `supabase/migrations/`: DB構造、RPC、RLS。schemaだけで判断せず、後続migrationと呼び出し元も読む。ローカルSQLの存在を本番適用済みの証拠としない。
- `scripts/`: 検証、seed、PULSE素材生成。seedはDB更新を伴うため、検証コマンドと混同しない。
- `public/`: 公開アセット・`ads.txt`。`src/content/`: 利用規約・プライバシーポリシー。
- `data/sprint/`: PULSEデータ関連。秘密JSONを読み出してドキュメントやログに転載しない。
- `README.md` はNext.jsの初期案内、`CLAUDE.md` は本ファイルへの参照。実際のアプリ配置は `src/app/`。
- `next.config.ts`、`tsconfig.json`、`eslint.config.mjs`、`postcss.config.mjs` が設定の確認先。

## 変更の進め方

- 推測で実装を始めず、関連components、hooks、utilities、API、server actions、Supabase RPC、DB schema、migration、RLS、notifications、共通UIを調査して再利用する。
- 同じ機能の別実装を増やさない。根本原因を調査し、特定データ・特定問題のハードコードでバグを隠さない。
- 既存機能を壊さないことを最優先し、変更は必要最小限にする。依頼外のリファクタリングやコンテンツ変更を混ぜない。
- Next.js関連コードを書く前に `node_modules/next/dist/docs/` の該当ガイドと非推奨事項を読む。構造の案内は `01-app/01-getting-started/02-project-structure.md`。冒頭のNext.js管理ブロックを削除・改変しない。
- UIでの表示制御だけを権限チェックにしない。server/API/RPC/DB/RLSまで追跡する。

## 問題を解く体験

基本UXは「問題を見る → 自分で考える → 回答する → 正解/不正解 → 答え・解説 → みんなの解法 → 関連問題」。

- 最初から答えを全面表示して自力で考える体験を壊さない。
- 問題詳細を問題文だけの薄いページにしない。問題・ヒント・回答・答え・解説/考え方・みんなの解法・関連問題を自然につなげる。
- `ProblemStudyBlocks.tsx`、`SpoilerReveal.tsx`、`RelatedProblemCards.tsx`、既存の詳細表示・回答コンポーネントを確認する。

## 回答・採点・フィードバック

- 通常問題の正解は投稿者が設定する。`answer = 30`、`answer_unit = cm²` なら「30」だけで正解にできる設計を維持し、「30cm²」の入力を必須にしない。
- 正規化では必要に応じて半角/全角数字、前後空白、カンマ、安全な漢数字、英字の大小、数学表現を扱う。意味の異なる回答を曖昧一致で正解にしない。
- 可能な限り「client → answer submit → server-side gradingをSSOT（唯一の正）とする判定 → attempt保存 → feedback」を維持する。
- 確認先: `src/lib/answer-normalize.ts`、`problem-answer.ts`、`problem-grading.ts`、`sprint-grade.ts`、`challenge.ts`、`src/app/api/challenge/grade/route.ts`、`src/app/api/sprint/grade/route.ts`。
- Aha・通常問題・Challenger・PULSEの採点に重複がある場合、安全性と各モードの仕様を確認して共通化を検討する。特定問題だけの例外修正は禁止。
- 選択問題は投稿者が選択肢と正解を設定し、回答者がタップして回答する。server側の判定を優先し、表示文字列だけに依存せず既存の選択肢IDと検証を利用する。
- 記述問題は自由記述で自動採点しない。「回答 → 採点待ち → 問題投稿者が確認・正解/不正解を採点 → 回答者へ通知」を守る。
- 記述問題は投稿者以外が採点できないことをserver/DB/RLSでも確認する。`WrittenAnswerBox.tsx`、RPC `submit_written_response` / `grade_written_response`、`20260927120000_problem_types_written_answers_sets.sql` が確認先。
- 通知は既存の `src/lib/notifications.ts`、notificationsテーブル・RPC・UIを再利用する。
- 既存の正解UI・SE・対応端末での振動・attempt記録を維持する。`src/lib/correct-feedback.ts` を確認し、`navigator.vibrate` 等の非対応端末でエラーにしない。再レンダーでSEや振動を重複発火させない。

## 解法・リポスト・問題集

- 解法投稿は問題回答ともリポストとも別機能。既存の本文・数式・画像の仕組みを使い、問題詳細では「みんなの解法」として表示する。
- 解法カードの三点メニューは、自分なら「解法を編集」「解法を削除」、他人なら「報告」を基本とする。既存のreport機能を再利用する。
- 削除時は確認を入れる。本人以外の削除は禁止し、server/RLSでも所有者を確認する。他人のsolution IDを直接指定しても削除できないことを確認する。
- `PostCard.tsx`、`ProblemThread.tsx`、`src/lib/store.tsx` と関連DB処理を調べる。解法とリポストを混同せず既存DB・処理を維持する。
- 問題集は公開問題を選び、「問題カード/問題詳細 → 問題集に追加 → 既存問題集または新規作成」のUXを基本とする。
- 同じ問題の重複追加は禁止。並び替え・削除を考慮し、公開/非公開を設定する場合は非公開をデフォルトにする。
- 問題集の確認先: `ProblemSetAddButton.tsx`、`src/lib/problem-sets.ts`、`src/app/problem-sets/`、関連migrationの `problem_sets` / `problem_set_items` とRLS。

## Discoverと日本語IME

- Discoverの投稿・ユーザー・新着順など既存の表示を尊重する。
- 空検索で投稿author等から取得した全ユーザー一覧を表示しない。WeeklyQrafter・WeeklyQuestion・おすすめユーザーなど既存Discoveryコンテンツを表示する。
- ユーザー検索は検索文字が1文字以上のときのみ実行する。おすすめでは自分とsampleを除外し、既存データから推薦する。AI推薦と偽装しない。
- 確認先: `DiscoverFeed.tsx`、`WeeklyBoards.tsx`、`src/lib/discover-feed.ts`、`recommend-users.ts`、`weekly.ts`。
- 過去に入力ごとの `router.replace` と `useSearchParams` の再同期/remountで日本語変換が壊れた。親側で検索文字列を保持し、composition中はURL更新・検索RPCを実行しない。
- 確定後にURLを更新し、必要ならblur/Enterで確定する。input focusを維持し、日本語IMEの変換中・確定時の挙動を確認する。

## PULSE（21時問題）

- 毎日1問、21:00 JST（12:00 UTC）公開の特別コンテンツ。通常投稿とは区別する。
- 作者表示は必ず `Qraft` / `@qraft`。profile未hydrate時にもUUID先頭を作者名にしない。
- 事前登録されたDBの `publish_at` を公開判定のSSOTとし、未来PULSEを表示しない。
- メインPULSEタブには現在時刻以前に公開された最新1件を表示する。当日分が未公開でも空表示にせず、過去分を大量に縦表示しない。
- 例（JST）: 9/21 20:59は9/20分、9/21 21:00は9/21分、9/22 20:59は9/21分。
- `/sprint/archive` は公開済みのみ、基本は新しい順。未来PULSEは禁止。
- `/sprint/stats` は `sprint_attempts` をSSOTとして、挑戦数・正解数・正答率・現在/最長の連続正解・履歴・7列カレンダーを扱う。
- カレンダー表記は `○` 正解、`×` 不正解、`△` その他/attempted、`–` 未挑戦。
- PULSEのない日、開始前、未来の日、当日21時前を理由にstreakを不必要に切らない。9/13〜9/15の欠番は勝手に問題を作って穴埋めしない。
- 確認先: `PulseHome.tsx`、`PulseArchive.tsx`、`PulseRecord.tsx`、`src/lib/pulse.ts`、`pulse-stats.ts`、`publish-at.ts`、`jst.ts`、`sprint.ts`、関連migration。

### PULSEのセキュリティ（最重要）

- 未来PULSEや `sprint_secrets` 等の `correct_answer`、`solution`、secret JSON、正解を推測できる秘密情報をclient bundle/client responseへ漏らさない。
- URL直打ちでも未来PULSEを取得できないようにする。RLS、server API、server component、server action、返却カラムの境界を確認する。
- 公開済みPULSEのみ、適切な導線・権限で答え・解説を取得できる設計を維持する。UIで隠すだけでは不十分。
- PULSE関連修正に便乗してタイトル・本文・答え・解説・SVG等を勝手に変更しない。
- 秘密JSONをGitへcommitしない。`.gitignore` の `.local/`、`data/sprint/*.json`、`data/sprint/private/`、`**/qraft_21_questions*.json` の保護を維持する。

## AdSense・sample・コンテンツの信頼性

- ユーザー申告ではAdSense審査中で、過去に「有用性の低いコンテンツ」で不承認。審査状況は作業時に必要に応じて確認する。
- publisherは `ca-pub-3606701928621609`。`public/ads.txt` は `google.com, pub-3606701928621609, DIRECT, f08c47fec0942fa0`。関連処理は `src/lib/adsense.ts` と広告コンポーネントを確認する。
- 審査対策として薄いAI解説の大量投入、偽ユーザー・偽解法・偽コメント・偽いいね・偽閲覧数、SEO目的の無意味な長文やキーワード水増しは禁止。学習価値とSNS価値を高める。
- 公開用sample問題・sampleユーザーの `is_sample` 等の識別を維持し、本物のユーザーに見せかけない。偽エンゲージメントは禁止。`src/lib/sample-account.ts`、`SampleAccountMark.tsx` を確認する。

## Git・秘密情報・実環境の保護

- 最初に `git status` と既存差分を確認し、ユーザーの作業・未追跡ファイルを上書き・削除しない。
- commit / push / deployは、その作業でユーザーから明示的に依頼された場合のみ実行する。勝手にProductionへdeployしない。
- force push、無断の `reset --hard`、大量ファイル削除、既存履歴を壊す操作は禁止。
- `.env`、`.env.local`、secret JSON、API key、Supabase service role key、Stripe secret等をcommitしない。AGENTS.md・他の文書・ログにも秘密の値をコピーしない。
- 調査やローカル検証のために本番DBへmigration/seedを適用しない。DB更新・外部サービス操作はその依頼の範囲を確認する。

## 検証と作業終了時の報告

通常のコード変更では、既存実装の調査 → 必要最小限の変更 → 関連テスト → 設定済みのlint/typecheck等 → production build → `git diff` / `git status` 確認を可能な範囲で行う。

- 実行前に現在の `package.json` と設定・スクリプト内容を確認し、存在しないコマンドを推測で実行しない。
- 整備時に存在する検証コマンド:
  - `npm run test:answers`: 回答正規化・採点。
  - `npm run test:stats`: 問題統計・Discover関連。
  - `npm run test:profile-rls`: プロフィール登録payload・SQL/RLSの静的検証。本番RLSの実動作保証とは区別する。
  - `npm run lint`: ESLint。
  - `npm run build`: Next.js production build。
- 整備時には `typecheck`、汎用 `test`、`test:pulse` のnpm scriptはない。`scripts/verify-pulse-stats.ts` 等の単独スクリプトは存在するが、実行方法・依存関係を確認して扱う。
- `npm run dev` / `npm run start` はサーバー起動用。`seed:launch` / `seed:sprint-sep-2026` はデータ投入用で検証ではない。
- 文書だけの変更では差分・内容・変更範囲を検証し、lint/build等を省略した場合は理由を報告する。
- テスト・buildの失敗を隠さない。無関係なコードを大量修正せず、原因、実行できなかった検証、残る制約を報告する。
- 最後に変更ファイル、主要な変更、実行した検証と結果、未実行の検証と理由、`git status` を日本語で簡潔に報告する。
