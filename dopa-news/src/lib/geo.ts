export interface Landmark {
  name: string;
  area: string;
  lat: number;
  lng: number;
}

/** Fallback camera position when location permission is denied. */
export const DEFAULT_CENTER = { lat: 35.6812, lng: 139.7671 };

/**
 * A small offline gazetteer. Reverse geocoding a user's exact coordinates
 * through a third-party service would leak their position, so nearby-area
 * naming is done locally against well-known points.
 */
export const LANDMARKS: Landmark[] = [
  { name: "東京駅", area: "東京都千代田区", lat: 35.6812, lng: 139.7671 },
  { name: "渋谷駅", area: "東京都渋谷区", lat: 35.658, lng: 139.7016 },
  { name: "新宿駅", area: "東京都新宿区", lat: 35.6896, lng: 139.7006 },
  { name: "池袋駅", area: "東京都豊島区", lat: 35.7295, lng: 139.7109 },
  { name: "品川駅", area: "東京都港区", lat: 35.6285, lng: 139.7387 },
  { name: "上野駅", area: "東京都台東区", lat: 35.7138, lng: 139.7772 },
  { name: "秋葉原駅", area: "東京都千代田区", lat: 35.6984, lng: 139.7731 },
  { name: "東京ドーム", area: "東京都文京区", lat: 35.7056, lng: 139.7519 },
  { name: "浅草", area: "東京都台東区", lat: 35.7118, lng: 139.7966 },
  { name: "お台場", area: "東京都江東区", lat: 35.6297, lng: 139.7767 },
  { name: "中野駅", area: "東京都中野区", lat: 35.7056, lng: 139.6659 },
  { name: "吉祥寺駅", area: "東京都武蔵野市", lat: 35.7031, lng: 139.5797 },
  { name: "六本木", area: "東京都港区", lat: 35.6641, lng: 139.7314 },
  { name: "銀座", area: "東京都中央区", lat: 35.6717, lng: 139.765 },
  { name: "恵比寿駅", area: "東京都渋谷区", lat: 35.6467, lng: 139.71 },
  { name: "北千住駅", area: "東京都足立区", lat: 35.7497, lng: 139.8047 },
  { name: "横浜駅", area: "神奈川県横浜市", lat: 35.4657, lng: 139.6222 },
  { name: "川崎駅", area: "神奈川県川崎市", lat: 35.5308, lng: 139.6972 },
  { name: "大宮駅", area: "埼玉県さいたま市", lat: 35.9061, lng: 139.6238 },
  { name: "千葉駅", area: "千葉県千葉市", lat: 35.6132, lng: 140.1131 },
  { name: "大阪駅", area: "大阪府大阪市", lat: 34.7025, lng: 135.4959 },
  { name: "名古屋駅", area: "愛知県名古屋市", lat: 35.1709, lng: 136.8815 },
  { name: "札幌駅", area: "北海道札幌市", lat: 43.0687, lng: 141.3508 },
  { name: "福岡・博多駅", area: "福岡県福岡市", lat: 33.5898, lng: 130.4207 },
  { name: "仙台駅", area: "宮城県仙台市", lat: 38.2601, lng: 140.8825 },
];

/** Great-circle distance in metres. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters: number): string {
  if (meters < 100) return "すぐ近く";
  if (meters < 1000) return `${Math.round(meters / 10) * 10}m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters / 1000)}km`;
}

export function nearestLandmark(point: { lat: number; lng: number }): {
  landmark: Landmark;
  meters: number;
} {
  let best = LANDMARKS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of LANDMARKS) {
    const d = distanceMeters(point, candidate);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return { landmark: best, meters: bestDistance };
}

/** Human-readable area label used on posts, e.g. `東京都渋谷区`. */
export function areaLabel(point: { lat: number; lng: number }): string {
  const { landmark, meters } = nearestLandmark(point);
  return meters <= 25000 ? landmark.area : "日本国内";
}

/**
 * Coordinates are rounded before they leave the device (the database rounds
 * again as a backstop) so a post cannot pinpoint someone's home.
 */
export const COORD_PRECISION = 3;

export function roundCoord(value: number): number {
  const factor = 10 ** COORD_PRECISION;
  return Math.round(value * factor) / factor;
}
