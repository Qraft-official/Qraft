export interface NewsCategory {
  /** Stored value in `news_articles.category`. */
  id: string;
  label: string;
  accent: string;
}

/** `おすすめ` is a view, not a stored category, so it lives outside the list. */
export const RECOMMENDED_FEED = "おすすめ";
export const BREAKING_FEED = "速報";

export const NEWS_CATEGORIES: NewsCategory[] = [
  { id: "国内", label: "国内", accent: "#4ef5a3" },
  { id: "海外", label: "海外", accent: "#35dcff" },
  { id: "政治", label: "政治", accent: "#a98bff" },
  { id: "経済", label: "経済", accent: "#ffc44d" },
  { id: "テクノロジー", label: "テクノロジー", accent: "#35dcff" },
  { id: "エンタメ", label: "エンタメ", accent: "#ff5c7a" },
  { id: "スポーツ", label: "スポーツ", accent: "#4ef5a3" },
  { id: "SNS", label: "SNS", accent: "#a98bff" },
  { id: "科学", label: "科学", accent: "#35dcff" },
  { id: "生活", label: "生活", accent: "#ffc44d" },
];

export const FEED_TABS: string[] = [
  RECOMMENDED_FEED,
  BREAKING_FEED,
  ...NEWS_CATEGORIES.map((c) => c.id),
];

export function categoryAccent(category: string): string {
  return NEWS_CATEGORIES.find((c) => c.id === category)?.accent ?? "#8b94a7";
}

export interface SourceTrust {
  label: string;
  mark: string;
  tone: "good" | "ok" | "warn";
  help: string;
}

export const SOURCE_TRUST: Record<string, SourceTrust> = {
  official: {
    label: "公式発表",
    mark: "✓",
    tone: "good",
    help: "官公庁・企業などの一次発表にもとづく情報です。",
  },
  major_media: {
    label: "大手報道",
    mark: "✓",
    tone: "good",
    help: "大手報道機関が報じた情報です。",
  },
  multi_report: {
    label: "複数報道",
    mark: "○",
    tone: "ok",
    help: "複数のメディアが報じていますが、一次発表は確認されていません。",
  },
  unconfirmed: {
    label: "未確認情報",
    mark: "△",
    tone: "warn",
    help: "裏付けが取れていない情報です。取り扱いに注意してください。",
  },
};
