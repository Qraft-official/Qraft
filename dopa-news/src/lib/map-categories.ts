import type { MapPostType } from "@/types/database";

export interface MapCategory {
  id: string;
  label: string;
  emoji: string;
  /** Ring / heat colour for the marker. */
  color: string;
  type: MapPostType;
  /** How long the report stays useful, in hours. */
  ttlHours: number;
}

export const WEATHER_CATEGORIES: MapCategory[] = [
  { id: "sunny", label: "晴れ", emoji: "☀️", color: "#ffc44d", type: "weather", ttlHours: 3 },
  { id: "cloudy", label: "くもり", emoji: "🌤", color: "#9aa7bd", type: "weather", ttlHours: 3 },
  { id: "rain", label: "雨", emoji: "🌧", color: "#35dcff", type: "weather", ttlHours: 3 },
  { id: "downpour", label: "ゲリラ豪雨", emoji: "⛈", color: "#5b8cff", type: "weather", ttlHours: 2 },
  { id: "thunder", label: "雷", emoji: "⚡", color: "#ffe14d", type: "weather", ttlHours: 2 },
  { id: "snow", label: "雪", emoji: "❄️", color: "#c9e9ff", type: "weather", ttlHours: 4 },
  { id: "fog", label: "霧", emoji: "🌫", color: "#8b94a7", type: "weather", ttlHours: 3 },
  { id: "rainbow", label: "虹", emoji: "🌈", color: "#a98bff", type: "weather", ttlHours: 1 },
  { id: "wind", label: "強風", emoji: "🌪", color: "#4ef5a3", type: "weather", ttlHours: 3 },
  { id: "hail", label: "雹", emoji: "🧊", color: "#7fd8ff", type: "weather", ttlHours: 2 },
];

export const LIVE_CATEGORIES: MapCategory[] = [
  { id: "emergency", label: "緊急", emoji: "🚨", color: "#ff5c7a", type: "live", ttlHours: 4 },
  { id: "fire", label: "火災・煙", emoji: "🔥", color: "#ff8a3d", type: "live", ttlHours: 4 },
  { id: "traffic", label: "道路・交通", emoji: "🚗", color: "#ffc44d", type: "live", ttlHours: 4 },
  { id: "train", label: "電車", emoji: "🚃", color: "#35dcff", type: "live", ttlHours: 4 },
  { id: "event", label: "イベント", emoji: "🎤", color: "#a98bff", type: "live", ttlHours: 8 },
  { id: "crowd", label: "混雑・行列", emoji: "👥", color: "#4ef5a3", type: "live", ttlHours: 4 },
  { id: "blackout", label: "停電", emoji: "💡", color: "#ffe14d", type: "live", ttlHours: 6 },
  { id: "shop", label: "店舗", emoji: "🏪", color: "#7fd8ff", type: "live", ttlHours: 6 },
  { id: "other", label: "その他", emoji: "📢", color: "#8b94a7", type: "live", ttlHours: 4 },
];

export const ALL_MAP_CATEGORIES: MapCategory[] = [...WEATHER_CATEGORIES, ...LIVE_CATEGORIES];

const CATEGORY_BY_ID = new Map(ALL_MAP_CATEGORIES.map((c) => [c.id, c]));

const FALLBACK: MapCategory = {
  id: "other",
  label: "その他",
  emoji: "📢",
  color: "#8b94a7",
  type: "live",
  ttlHours: 4,
};

export function mapCategory(id: string): MapCategory {
  return CATEGORY_BY_ID.get(id) ?? FALLBACK;
}

export function categoriesFor(type: MapPostType): MapCategory[] {
  return type === "weather" ? WEATHER_CATEGORIES : LIVE_CATEGORIES;
}

export const MAP_SEGMENTS: { type: MapPostType; label: string; emoji: string }[] = [
  { type: "weather", label: "ウェザー", emoji: "🌞" },
  { type: "live", label: "ライブトピックス", emoji: "🛰" },
];

export const REPORT_REASONS = [
  "誤情報・デマ",
  "位置が明らかに違う",
  "スパム・宣伝",
  "不適切な表現",
  "その他",
] as const;
