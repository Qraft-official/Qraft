import type { Subject, Tier } from "./types";

export const ME_ID = "u-me";
export const DEV_USER_IDS = ["u-me"] as const;
export const DEV_HANDLES = ["aha_taro"] as const;
export const VERIFIED_CREATOR_IDS = ["u-official", "u-mirai"] as const;
export const PREMIUM_PRICE_JPY = 300;

export const SUBJECTS: { id: Subject; emoji: string; label: string }[] = [
  { id: "math", emoji: "📐", label: "数学" },
  { id: "physics", emoji: "⚡", label: "物理" },
  { id: "chemistry", emoji: "🧪", label: "化学" },
];

export const TIER_NAMES: Record<Subject, Record<Tier, string>> = {
  math: {
    1: "算数ウォリアー",
    2: "方程式ストライカー",
    3: "論理マスター",
    4: "数式マエストロ",
    5: "ドパミンの神",
  },
  physics: {
    1: "物理ビギナー",
    2: "力学ストライカー",
    3: "波動マスター",
    4: "電磁気マエストロ",
    5: "アインシュタインの再来",
  },
  chemistry: {
    1: "物質ウォリアー",
    2: "元素ストライカー",
    3: "反応マスター",
    4: "有機マエストロ",
    5: "錬金術の神",
  },
};

export const SUBJECT_LABEL: Record<Subject, string> = {
  math: "数学",
  physics: "物理",
  chemistry: "化学",
};

export const PEN_COLORS = [
  { id: "lime", value: "#CCFF00", label: "ライム" },
  { id: "purple", value: "#A855F7", label: "パープル" },
  { id: "cyan", value: "#22D3EE", label: "シアン" },
  { id: "white", value: "#F8FAFC", label: "ホワイト" },
];

export const SPRINT_MS = 10 * 60 * 1000;
export const SPRINT_HOUR = 21;

export const STORAGE_KEYS = {
  onboarded: "aha.onboarded",
  tiers: "aha.tiers",
  follows: "aha.follows",
  likes: "aha.likes",
  reposts: "aha.reposts",
  ratings: "aha.ratings",
  sprint: "aha.sprint",
  extraPosts: "aha.extraPosts",
  profile: "aha.profile",
  activities: "aha.activities",
  premium: "aha.premium",
  bgm: "aha.bgm",
  accent: "aha.accent",
  reactions: "aha.reactions",
  auth: "aha.auth",
} as const;

export const TITLE_CATALOG = [
  "夜21時の求道者",
  "初回アハ達成",
  "論理マスター",
  "計算力ゴリラ",
  "エレガント職人",
  "殿堂ハンター",
  "ドパミンの神",
  "方程式ストライカー+",
];

export const PREMIUM_TITLES = [
  "👑 ゴールド求解者",
  "💎 プレミアムアハ",
  "🎪 限定イベント覇者",
  "🤖 AI共創者",
];

export const PREMIUM_PENS = [
  { id: "gold", value: "#FBBF24", label: "ゴールド" },
  { id: "pink", value: "#FB7185", label: "ネオンピンク" },
];

export const PREMIUM_REACTIONS = ["🔥", "🤯", "💫", "🧪", "⚡", "🎯"];

export const PREMIUM_ACCENTS = [
  "#A855F7",
  "#CCFF00",
  "#FBBF24",
  "#22D3EE",
  "#FB7185",
  "#818CF8",
];

export const PREMIUM_PERKS = [
  { icon: "🚫", title: "広告OFF", desc: "タイムラインの広告をすべて非表示" },
  { icon: "🎨", title: "プロフィールカスタマイズ", desc: "アクセントカラーと上級バナー" },
  { icon: "✨", title: "答案デコレーション", desc: "ネオンペンとゴールド枠の解法カード" },
  { icon: "😂", title: "特別リアクション", desc: "限定の高ドパミン絵文字リアクション" },
  { icon: "🏠", title: "プライベートコミュニティ", desc: "Premium求解者だけのフィード" },
  { icon: "🤖", title: "AI問題メーカー", desc: "プロンプトから問題を自動生成" },
  { icon: "🎵", title: "BGM", desc: "解答中のアンビエントフォーカス音" },
  { icon: "👑", title: "限定称号・バッジ", desc: "ゴールド称号と認証チェック" },
  { icon: "📊", title: "年鑑アナリティクス", desc: "習熟度の深掘り統計" },
  { icon: "🎪", title: "限定イベント", desc: "特別デイリーチャレンジ先行参加" },
] as const;

export const AVATAR_EMOJIS = ["🧠", "✨", "📐", "⚡", "🧪", "🌊", "🔥", "😎", "🧬", "🚀"];

export const BANNER_PRESETS = [
  "from-[#2e1065] via-[#000] to-[#365314]",
  "from-[#365314] via-[#000] to-[#6b21a8]",
  "from-[#4c1d95] via-[#0f172a] to-[#1e1b4b]",
  "from-[#164e63] via-[#000] to-[#1e3a8a]",
  "from-[#14532d] via-[#000] to-[#713f12]",
  "from-[#0e7490] via-[#000] to-[#1e1b4b]",
];

export const PREMIUM_BANNER_PRESETS = [
  "from-[#78350f] via-[#000] to-[#fbbf24]",
  "from-[#701a75] via-[#000] to-[#fb7185]",
  "from-[#0c4a6e] via-[#000] to-[#ccff00]",
];

export const LATEX_SNIPPETS = [
  { id: "frac", label: "a/b", insert: "$\\frac{}{}$", cursor: 8 },
  { id: "sqrt", label: "√", insert: "$\\sqrt{}$", cursor: 8 },
  { id: "int", label: "∫", insert: "$\\int_{}^{} $", cursor: 8 },
  { id: "sum", label: "Σ", insert: "$\\sum_{}^{}$", cursor: 8 },
  { id: "prod", label: "Π", insert: "$\\prod_{}^{}$", cursor: 9 },
  { id: "lim", label: "lim", insert: "$\\lim_{}$", cursor: 8 },
  { id: "partial", label: "∂", insert: "$\\partial $", cursor: 10 },
  { id: "vec", label: "vec", insert: "$\\vec{}$", cursor: 7 },
  { id: "hat", label: "hat", insert: "$\\hat{}$", cursor: 7 },
  { id: "sup", label: "xⁿ", insert: "$^{}$", cursor: 3 },
  { id: "sub", label: "xₙ", insert: "$_{}$", cursor: 3 },
  { id: "inf", label: "∞", insert: "$\\infty$", cursor: 8 },
  { id: "to", label: "→", insert: "$\\rightarrow$", cursor: 14 },
  { id: "eq", label: "⇌", insert: "$\\rightleftharpoons$", cursor: 20 },
  { id: "cdot", label: "·", insert: "$\\cdot$", cursor: 8 },
  { id: "times", label: "×", insert: "$\\times$", cursor: 8 },
  { id: "pm", label: "±", insert: "$\\pm$", cursor: 6 },
  { id: "neq", label: "≠", insert: "$\\neq$", cursor: 7 },
  { id: "leq", label: "≤", insert: "$\\leq$", cursor: 7 },
  { id: "hbar", label: "ℏ", insert: "$\\hbar$", cursor: 8 },
  { id: "theta", label: "θ", insert: "$\\theta$", cursor: 9 },
  { id: "omega", label: "ω", insert: "$\\omega$", cursor: 9 },
  { id: "chem", label: "chem", insert: "$\\mathrm{}$", cursor: 10 },
  { id: "block", label: "$$", insert: "$$$$", cursor: 2 },
  {
    id: "matrix",
    label: "行列",
    insert: "$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$",
    cursor: 20,
  },
];
