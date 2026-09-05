/** Client-visible label for Qraft-managed fictional accounts. */
export const SAMPLE_ACCOUNT_LABEL = "Qraft公式サンプル";

const SAMPLE_AVATARS = ["📐", "∫", "△", "⬡", "◆", "π", "√", "∞", "◈", "◉", "✦", "∇"];
const SAMPLE_ACCENTS = [
  "#A855F7",
  "#22D3EE",
  "#84CC16",
  "#F59E0B",
  "#818CF8",
  "#F472B6",
  "#2DD4BF",
  "#FB7185",
];
const SAMPLE_BANNERS = [
  "from-[#1e1b4b] via-[#000] to-[#365314]",
  "from-[#164e63] via-[#000] to-[#1e3a8a]",
  "from-[#14532d] via-[#000] to-[#1e1b4b]",
  "from-[#4c1d95] via-[#000] to-[#0f172a]",
  "from-[#7c2d12] via-[#000] to-[#1e1b4b]",
];

function hashString(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function sampleAvatar(id: string) {
  return SAMPLE_AVATARS[hashString(id) % SAMPLE_AVATARS.length];
}

export function sampleAccent(id: string) {
  return SAMPLE_ACCENTS[hashString(`${id}:a`) % SAMPLE_ACCENTS.length];
}

export function sampleBanner(id: string) {
  return SAMPLE_BANNERS[hashString(`${id}:b`) % SAMPLE_BANNERS.length];
}
