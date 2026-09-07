/**
 * Development sample map posts.
 *
 * All coordinates are public landmarks, never a real person's location, and
 * every row is inserted with `is_sample = true` so the UI can label it as
 * development data. `persona` is matched against a sample profile username.
 */

export const SAMPLE_PERSONAS = [
  "りん",
  "カイ",
  "みお",
  "そら",
  "ゆう",
  "ひな",
  "れん",
  "あおい",
  "たく",
  "なお",
  "みく",
];

export const SAMPLE_MAP_POSTS = [
  // --- 渋谷: a cluster of rain reports, the "N人が報告" showcase ---
  { persona: "りん", type: "weather", category: "downpour", lat: 35.6595, lng: 139.7005, area: "東京都渋谷区", comment: "駅前で急に土砂降りです。傘ないと無理", minutesAgo: 4, urgency: false },
  { persona: "カイ", type: "weather", category: "downpour", lat: 35.6581, lng: 139.7021, area: "東京都渋谷区", comment: "スクランブル交差点、雨強い", minutesAgo: 9, urgency: false },
  { persona: "みお", type: "weather", category: "downpour", lat: 35.6612, lng: 139.6989, area: "東京都渋谷区", comment: "道玄坂も降ってきた", minutesAgo: 13, urgency: false },
  { persona: "そら", type: "weather", category: "downpour", lat: 35.6566, lng: 139.7042, area: "東京都渋谷区", comment: "宮益坂、川みたいになってる", minutesAgo: 18, urgency: true },
  { persona: "ゆう", type: "weather", category: "thunder", lat: 35.6603, lng: 139.7034, area: "東京都渋谷区", comment: "雷の音めっちゃ近い", minutesAgo: 21, urgency: false },
  { persona: "ひな", type: "weather", category: "downpour", lat: 35.6574, lng: 139.6996, area: "東京都渋谷区", comment: "地下街に避難した人多い", minutesAgo: 26, urgency: false },
  { persona: "れん", type: "weather", category: "downpour", lat: 35.6588, lng: 139.7048, area: "東京都渋谷区", comment: "傘さしてても意味ないレベル", minutesAgo: 33, urgency: false },

  // --- 新宿: train trouble cluster ---
  { persona: "あおい", type: "live", category: "train", lat: 35.6896, lng: 139.7006, area: "東京都新宿区", comment: "改札前まで人が並んでます", minutesAgo: 6, urgency: false },
  { persona: "たく", type: "live", category: "train", lat: 35.6908, lng: 139.6994, area: "東京都新宿区", comment: "振替の案内が出てる。south exit混雑", minutesAgo: 11, urgency: false },
  { persona: "なお", type: "live", category: "train", lat: 35.6884, lng: 139.7021, area: "東京都新宿区", comment: "ホーム入場規制中", minutesAgo: 16, urgency: true },
  { persona: "みく", type: "live", category: "crowd", lat: 35.6879, lng: 139.7038, area: "東京都新宿区", comment: "バスターミナルも並んでます", minutesAgo: 24, urgency: false },
  { persona: "りん", type: "live", category: "train", lat: 35.6921, lng: 139.7015, area: "東京都新宿区", comment: "西口、いったん落ち着いた", minutesAgo: 41, urgency: false },

  // --- 東京ドーム: event buzz ---
  { persona: "カイ", type: "live", category: "event", lat: 35.7056, lng: 139.7519, area: "東京都文京区", comment: "物販の列、外周半分くらい", minutesAgo: 12, urgency: false },
  { persona: "みお", type: "live", category: "event", lat: 35.7062, lng: 139.7531, area: "東京都文京区", comment: "開場待ちの人多いけど雰囲気いい", minutesAgo: 19, urgency: false },
  { persona: "そら", type: "live", category: "crowd", lat: 35.7048, lng: 139.7508, area: "東京都文京区", comment: "水道橋駅から徒歩でも進みづらい", minutesAgo: 28, urgency: false },
  { persona: "ゆう", type: "live", category: "event", lat: 35.7071, lng: 139.7526, area: "東京都文京区", comment: "グッズ完売の情報が回ってます（未確認）", minutesAgo: 35, urgency: false },

  // --- 池袋 ---
  { persona: "ひな", type: "live", category: "event", lat: 35.7295, lng: 139.7109, area: "東京都豊島区", comment: "東口でストリートライブやってる", minutesAgo: 22, urgency: false },
  { persona: "れん", type: "weather", category: "cloudy", lat: 35.7311, lng: 139.7123, area: "東京都豊島区", comment: "曇ってきたけどまだ降ってない", minutesAgo: 38, urgency: false },
  { persona: "あおい", type: "live", category: "crowd", lat: 35.728, lng: 139.7096, area: "東京都豊島区", comment: "サンシャイン方面の歩道が混雑", minutesAgo: 47, urgency: false },

  // --- 東京 / 丸の内 ---
  { persona: "たく", type: "weather", category: "rain", lat: 35.6812, lng: 139.7671, area: "東京都千代田区", comment: "小雨。折りたたみで足りる程度", minutesAgo: 15, urgency: false },
  { persona: "なお", type: "live", category: "traffic", lat: 35.6795, lng: 139.7644, area: "東京都千代田区", comment: "日比谷通り、事故処理で1車線規制", minutesAgo: 31, urgency: false },
  { persona: "みく", type: "weather", category: "rain", lat: 35.6829, lng: 139.769, area: "東京都千代田区", comment: "駅前は傘率半分くらい", minutesAgo: 52, urgency: false },

  // --- 品川 / 港区 ---
  { persona: "りん", type: "weather", category: "cloudy", lat: 35.6285, lng: 139.7387, area: "東京都港区", comment: "風が少し出てきた", minutesAgo: 25, urgency: false },
  { persona: "カイ", type: "live", category: "crowd", lat: 35.6298, lng: 139.7402, area: "東京都港区", comment: "港南口の通路がかなり混んでます", minutesAgo: 44, urgency: false },

  // --- 上野 / 浅草 ---
  { persona: "みお", type: "weather", category: "sunny", lat: 35.7138, lng: 139.7772, area: "東京都台東区", comment: "こっちは晴れてる。傘いらない", minutesAgo: 17, urgency: false },
  { persona: "そら", type: "live", category: "event", lat: 35.7118, lng: 139.7966, area: "東京都台東区", comment: "仲見世、観光客で歩きづらい", minutesAgo: 36, urgency: false },
  { persona: "ゆう", type: "weather", category: "rainbow", lat: 35.7152, lng: 139.7801, area: "東京都台東区", comment: "上野公園の上に虹！", minutesAgo: 55, urgency: false },

  // --- 秋葉原 / 神田 ---
  { persona: "ひな", type: "live", category: "shop", lat: 35.6984, lng: 139.7731, area: "東京都千代田区", comment: "整理券配布始まりました", minutesAgo: 29, urgency: false },
  { persona: "れん", type: "weather", category: "cloudy", lat: 35.6996, lng: 139.7712, area: "東京都千代田区", comment: "薄暗い。降りそうな空", minutesAgo: 49, urgency: false },

  // --- 中野 / 吉祥寺 ---
  { persona: "あおい", type: "weather", category: "wind", lat: 35.7056, lng: 139.6659, area: "東京都中野区", comment: "自転車がふらつくくらいの風", minutesAgo: 33, urgency: false },
  { persona: "たく", type: "weather", category: "sunny", lat: 35.7031, lng: 139.5797, area: "東京都武蔵野市", comment: "吉祥寺は快晴です", minutesAgo: 40, urgency: false },
  { persona: "なお", type: "live", category: "blackout", lat: 35.7043, lng: 139.5812, area: "東京都武蔵野市", comment: "一部の店舗が停電しているみたい", minutesAgo: 58, urgency: true },

  // --- 横浜 / 川崎 ---
  { persona: "みく", type: "weather", category: "rain", lat: 35.4657, lng: 139.6222, area: "神奈川県横浜市", comment: "横浜も降り出しました", minutesAgo: 20, urgency: false },
  { persona: "りん", type: "live", category: "traffic", lat: 35.5308, lng: 139.6972, area: "神奈川県川崎市", comment: "国道が渋滞。抜けるのに20分", minutesAgo: 46, urgency: false },

  // --- 大宮 / 千葉 ---
  { persona: "カイ", type: "weather", category: "thunder", lat: 35.9061, lng: 139.6238, area: "埼玉県さいたま市", comment: "北の空が光ってる", minutesAgo: 27, urgency: false },
  { persona: "みお", type: "weather", category: "cloudy", lat: 35.6132, lng: 140.1131, area: "千葉県千葉市", comment: "曇り。風は穏やか", minutesAgo: 51, urgency: false },

  // --- 六本木 / 恵比寿 ---
  { persona: "そら", type: "live", category: "emergency", lat: 35.6641, lng: 139.7314, area: "東京都港区", comment: "消防車が数台。近づかないほうがよさそう", minutesAgo: 8, urgency: true },
  { persona: "ゆう", type: "weather", category: "rain", lat: 35.6467, lng: 139.71, area: "東京都渋谷区", comment: "恵比寿も降ってきた", minutesAgo: 23, urgency: false },
];

/** Official notices are visually separated from user reports in the UI. */
export const SAMPLE_OFFICIAL_POSTS = [
  {
    persona: "ドパ運営",
    type: "live",
    category: "train",
    lat: 35.6896,
    lng: 139.7006,
    area: "東京都新宿区",
    comment: "【公式】信号設備の点検のため一部区間で運転を見合わせています（開発用サンプル）",
    minutesAgo: 14,
    urgency: false,
    official: true,
  },
  {
    persona: "ドパ運営",
    type: "weather",
    category: "downpour",
    lat: 35.6595,
    lng: 139.7005,
    area: "東京都渋谷区",
    comment: "【公式】大雨注意報が発表されています（開発用サンプル）",
    minutesAgo: 30,
    urgency: true,
    official: true,
  },
];
