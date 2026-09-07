import { NEWS_CATEGORIES } from "@/lib/categories";

export interface NewsDraft {
  title: string;
  category: string;
  what_happened: string;
  why_trending: string;
  three_second_summary: string;
  quiz: { question: string; options: [string, string, string] };
  social_reaction_summary: string;
  source_name: string;
  source_url: string;
}

export interface DraftInput {
  text: string;
  sourceName?: string;
  sourceUrl?: string;
  title?: string;
}

export const UNKNOWN = "現時点では不明";

export const MAX_SOURCE_LENGTH = 12_000;

/**
 * The rules the model must follow. Kept beside the fallback so both paths make
 * the same promise: nothing that is not in the source text may be asserted.
 */
export const SYSTEM_PROMPT = `あなたは日本語のニュース編集者です。与えられた元記事のテキストだけを根拠に、若者向けニュースアプリ「ドパニュース」用の解説JSONを作成します。

厳守事項:
- 元記事に書かれていない事実を絶対に追加しない。推測を事実として断定しない。
- 元記事から判断できない項目は「${UNKNOWN}」と書く。
- 要約と意見を混同しない。編集者個人の主張を書かない。
- 元記事の本文をそのまま長く引き写さない。自分の言葉で短くまとめる。
- 断定できない将来の見通しは「〜の可能性がある」と書く。
- 出力は日本語。文体は「です・ます」ではなく簡潔な常体でもよいが、読みやすさを最優先する。

各項目の指示:
- title: 40文字以内。釣りタイトルにしない。誇張しない。
- category: 次のいずれか1つだけ: ${NEWS_CATEGORIES.map((c) => c.id).join(" / ")}
- what_happened: 3〜6行。1行ずつ改行で区切る。専門用語には短い補足を付ける。
- why_trending: 2〜4行。なぜ注目されているかを背景から説明する。「SNSで話題」だけで終わらせない。
- three_second_summary: 「つまり、〜」で始まる1文。60文字以内。
- quiz: このニュースのあとに起きそうなことを問う3択。question は1文。options は3件、それぞれ30文字以内で、互いに重複しない現実的な選択肢。正解を断定できる問題にしない。
- social_reaction_summary: 元記事から読み取れる範囲で、肯定・否定・驚き・疑問などの反応の傾向を2〜3行で。特定個人の投稿を引用・転載しない。読み取れない場合は「${UNKNOWN}」。

出力は次のキーだけを持つJSONオブジェクト:
title, category, what_happened, why_trending, three_second_summary, quiz{question, options[3]}, social_reaction_summary`;

const CATEGORY_HINTS: Record<string, string[]> = {
  国内: ["日本", "国内", "都道府県", "自治体", "県", "市", "東京都", "警察", "地方"],
  海外: ["米国", "アメリカ", "中国", "欧州", "EU", "韓国", "ロシア", "国連", "海外", "現地"],
  政治: ["政府", "首相", "国会", "法案", "選挙", "大臣", "与党", "野党", "政策", "省庁"],
  経済: ["株価", "円安", "円高", "景気", "物価", "決算", "企業", "市場", "GDP", "金利"],
  テクノロジー: ["AI", "スマホ", "アプリ", "半導体", "IT", "ソフトウェア", "ロボット", "通信", "端末"],
  エンタメ: ["映画", "ドラマ", "アイドル", "アニメ", "音楽", "俳優", "ライブ", "配信者", "芸能"],
  スポーツ: ["試合", "選手", "リーグ", "大会", "優勝", "監督", "五輪", "W杯", "野球", "サッカー"],
  SNS: ["SNS", "X（旧Twitter）", "TikTok", "Instagram", "拡散", "バズ", "投稿", "トレンド入り"],
  科学: ["研究", "実験", "論文", "宇宙", "気象", "観測", "大学", "発見", "医療", "ワクチン"],
  生活: ["値上げ", "料金", "生活", "食品", "住宅", "教育", "交通", "健康", "家計", "制度"],
};

const TRENDING_HINTS = [
  "初めて",
  "異例",
  "過去最大",
  "過去最高",
  "急増",
  "急落",
  "変更",
  "改正",
  "値上げ",
  "値下げ",
  "影響",
  "波紋",
  "批判",
  "賛否",
  "話題",
  "注目",
  "拡散",
  "反発",
];

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/[ \t\u3000]+/g, " ").trim();
}

/** Split Japanese prose into sentences, keeping the terminating punctuation. */
export function splitSentences(text: string): string[] {
  return normalizeWhitespace(text)
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[。！？!?])/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function pickCategory(text: string): string {
  let best = "国内";
  let bestScore = 0;
  for (const [category, hints] of Object.entries(CATEGORY_HINTS)) {
    const score = hints.reduce((sum, hint) => sum + (text.includes(hint) ? 1 : 0), 0);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }
  return best;
}

function trimTo(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

/**
 * Deterministic fallback used when no LLM key is configured. It is strictly
 * extractive: every sentence it emits comes from the source text, so it cannot
 * invent facts. Anything it cannot derive is reported as unknown.
 */
export function draftFromText(input: DraftInput): NewsDraft {
  const text = normalizeWhitespace(input.text);
  const sentences = splitSentences(text);
  const lead = sentences.slice(0, 4);
  const rest = sentences.slice(4);

  const trendingSentences = sentences.filter((s) =>
    TRENDING_HINTS.some((hint) => s.includes(hint)),
  );
  const why = (trendingSentences.length > 0 ? trendingSentences : rest).slice(0, 3);

  const title = trimTo(input.title?.trim() || sentences[0] || "無題のニュース", 40);
  const first = sentences[0] ?? "";

  return {
    title,
    category: pickCategory(text),
    what_happened: lead.length > 0 ? lead.join("\n") : UNKNOWN,
    why_trending:
      why.length > 0
        ? why.join("\n")
        : `元記事からは、注目されている理由を読み取れませんでした（${UNKNOWN}）。`,
    three_second_summary: first ? trimTo(`つまり、${first.replace(/[。]$/, "")}。`, 60) : UNKNOWN,
    quiz: {
      question: "このニュースのあと、最も起きそうなのは？",
      options: [
        "同じ動きが他でも広がる",
        "反対の声が出て見直しになる",
        "大きな動きはなく現状のまま",
      ],
    },
    social_reaction_summary: UNKNOWN,
    source_name: input.sourceName?.trim() || UNKNOWN,
    source_url: input.sourceUrl?.trim() || "",
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Accept only well-shaped model output; fall back per-field when it is not. */
export function coerceDraft(value: unknown, fallback: NewsDraft): NewsDraft {
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  const rawQuiz = (raw.quiz ?? {}) as Record<string, unknown>;
  const options = Array.isArray(rawQuiz.options)
    ? rawQuiz.options.map(asString).filter((o) => o.length > 0)
    : [];
  const category = asString(raw.category);

  return {
    title: trimTo(asString(raw.title) || fallback.title, 80),
    category: NEWS_CATEGORIES.some((c) => c.id === category) ? category : fallback.category,
    what_happened: asString(raw.what_happened) || fallback.what_happened,
    why_trending: asString(raw.why_trending) || fallback.why_trending,
    three_second_summary: asString(raw.three_second_summary) || fallback.three_second_summary,
    quiz: {
      question: asString(rawQuiz.question) || fallback.quiz.question,
      options:
        options.length === 3
          ? [options[0], options[1], options[2]]
          : fallback.quiz.options,
    },
    social_reaction_summary:
      asString(raw.social_reaction_summary) || fallback.social_reaction_summary,
    source_name: fallback.source_name,
    source_url: fallback.source_url,
  };
}

export function buildUserPrompt(input: DraftInput): string {
  const lines = [
    input.sourceName ? `情報源: ${input.sourceName}` : null,
    input.sourceUrl ? `元記事URL: ${input.sourceUrl}` : null,
    input.title ? `編集者が付けた仮タイトル: ${input.title}` : null,
    "",
    "--- 元記事テキストここから ---",
    input.text.slice(0, MAX_SOURCE_LENGTH),
    "--- 元記事テキストここまで ---",
  ].filter((line): line is string => line !== null);
  return lines.join("\n");
}
