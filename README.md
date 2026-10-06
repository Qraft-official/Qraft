This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Qraftコラム：新しい記事を追加する方法

`src/content/blog/<slug>.md` に1記事1ファイルで保存します。既存記事をコピーし、先頭のYAMLと本文を編集してください。ファイル追加だけで一覧・詳細・sitemapに反映されます（本番反映には通常のbuild/deployが必要）。DBや管理画面は使いません。

```yaml
---
title: "記事タイトル"
slug: "your-article-slug"
description: "内容が伝わる短い紹介文"
publishedAt: "2026-10-06"
category: "考え方"
---
```

- `title`、`slug`、`description`、`publishedAt`、空でない本文が必須。`category` と `updatedAt` は任意です。日付は実際の公開・更新日を引用符付きの `YYYY-MM-DD` で書きます。
- slugは半角英小文字・数字・区切りのハイフンを使用し、ファイル名と一致させます。URLは `/blog/<slug>`。公開後のslug変更は既存リンクに影響します。
- 本文は通常のMarkdown。見出しは `##` / `###` を使い、段落、箇条書き、番号付きリスト、引用、太字、インラインコード、コードブロック、リンクが使えます。数式は `$...$`、独立した数式は別行の `$$` で囲みます。
- HTML・JavaScript・MDXは実行しません。数式は既存のKaTeX/CSSを使用し、危険なリンク・数式コマンドを許可しません。
- このフォルダ内の全 `.md` が公開対象です。予約公開・下書き機能はありません。未公開原稿は置かず、公開する記事だけ追加してください。
- 複数記事をまとめた原稿は記事ごとに分割し、`ARTICLE_START` / `ARTICLE_END` 等の区切りを外して先頭を `---` にします。本文を確認せず一括投入しないでください。
- `npm run lint`、`npm run build` で検証し、`/blog`・記事URL・数式・スマホ表示を確認します。存在しないslugは404になります。commit/push/deployは明示的な依頼時のみ行います。
- Node.js 22.18以降では、build後に `npm run start -- --port 3100` を起動し、別ターミナルの `node scripts/verify-blog.mjs http://127.0.0.1:3100` で未ログインHTTP・404・metadata・sitemapを確認できます。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
