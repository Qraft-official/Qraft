import type { Subject, Tier } from "./types";

export const ME_ID = "u-me";
export const DEV_USER_IDS = ["u-me"] as const;
export const DEV_HANDLES = ["aha_taro"] as const;
/** Stripe 契約なしで常時 Premium にする識別子（id / handle / 表示名 / メール） */
export const COMPLIMENTARY_PREMIUM_IDENTIFIERS = ["qrafter"] as const;
export const GUARDIAN_CONSENT_AGE = 15;
export const VERIFIED_CREATOR_IDS = ["u-official", "u-mirai"] as const;
export const PREMIUM_PRICE_JPY = 400;

export const PULSE_NAME = "PULSE（パルス）";
export const PULSE_BLURB =
  "PULSE（パルス）：毎日21時に一斉配信される限定デイリー問題。全員で同時に挑戦しよう！";

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
  hiddenAds: "aha.hiddenAds",
} as const;

export const TITLE_CATALOG = [
  "PULSEの求道者",
  "初回Qraft達成",
  "論理マスター",
  "計算力ゴリラ",
  "エレガント職人",
  "殿堂ハンター",
  "ドパミンの神",
  "方程式ストライカー+",
];

export const PREMIUM_TITLES = [
  "👑 ゴールド求解者",
  "💎 プレミアムQraft",
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
  { icon: "👑", title: "公式認定プレミアムバッジ（認証マーク）", desc: "プロフィールに認証マークが付き、信頼される求解者として表示されます" },
  { icon: "🖼️", title: "解法・問題への画像添付投稿", desc: "写真や解説画像を添付して、より分かりやすく共有できます" },
  { icon: "🎨", title: "アイコン＆ヘッダー画像のカスタマイズ", desc: "自分だけのプロフィールに仕上げられます" },
  { icon: "🚫", title: "完全広告非表示", desc: "ストレスフリーな学習環境で集中できます" },
  { icon: "🚀", title: "新機能・ベータ機能への先行アクセス", desc: "実験中の機能をいち早く体験できます" },
  { icon: "🔒", title: "プレミアム限定コミュニティ・チャットへの参加権", desc: "求解者だけのフィードと交流スペースに入れます" },
  { icon: "📊", title: "年間学習アナリティクス・詳細グラフの解放", desc: "習熟度の深掘り統計で伸びを可視化します" },
  { icon: "🔥", title: "限定リアクション＆エフェクトの使用", desc: "特別な絵文字リアクションと演出が使えます" },
  { icon: "📝", title: "ノートの無限保存＆大容量バックアップ", desc: "手書き・打ち込みノートをたっぷり保存できます" },
  { icon: "💬", title: "開発者へのダイレクトフィードバック・機能リクエスト権", desc: "欲しい機能を開発者に直接届けられます" },
] as const;

export const PREMIUM_DEV_MESSAGE = [
  "Qraft（クラフト）をインストールしていただきありがとうございます！",
  "実は開発者は個人で運営している貧乏学生です。このSNSはたくさんの学習者が集まることで本当のおもしろさを発揮します！サーバー代や開発を継続し、サービス閉鎖を避けるためにも、ぜひジュース2本分（月額400円）のご支援・応援をよろしくお願いします！",
] as const;

export const GUARDIAN_CONSENT_LABEL =
  "15歳未満の方は、保護者の同意を得て利用してください（同意を得ています）";

export const FEEDBACK_THANKS_TITLE = "💌 フィードバックありがとうございます！";
export const FEEDBACK_THANKS_MESSAGE =
  "貴重なご意見・リクエストをお送りいただきありがとうございます！開発の参考にさせていただき、より良いサービスを目指して改善してまいります。";

export const PREMIUM_THANKS_TITLE = "👑 プレミアムプランへようこそ！ご支援ありがとうございます！";
export const PREMIUM_THANKS_MESSAGE =
  "プレミアムプランへのご加入、本当にありがとうございます！皆様からの暖かいご支援のおかげでQraftの運営・開発を続けることができます。限定機能や特別バッジをお楽しみください！";

export const WELCOME_NOTIFICATION_TITLE = "🎉 Qraftへようこそ！";

export const WELCOME_NOTIFICATION_MESSAGE = `Qraft（クラフト）をご利用いただきありがとうございます！
みんなで問題を出し合ったり、手書きや数式エディタで解法をシェアして楽しんでくださいね。

【iPhone / iPad（iOS）をご利用の方へ】
現在、開発者の環境都合によりネイティブアプリ版はAndroid限定公開となっています。
Apple端末（iOS）をご利用の方は、Webブラウザ（SafariやChromeなど）から快適にご利用いただけます！`;

export const IOS_NOTICE =
  "【iPhone/iPad（iOS）をご利用の方へ】開発環境の都合上（Macを所持していないため）、現在ネイティブアプリ版はAndroid限定公開となっています。Apple端末をご利用の方は、Webブラウザ（SafariやChromeなど）からアクセスしてご活用ください！";

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
