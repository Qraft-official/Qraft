export const TEXT_SIZES = [
  { id: "sm", label: "小", editorClass: "text-[12px] leading-snug", feedClass: "text-[12px] leading-snug" },
  { id: "md", label: "標準", editorClass: "", feedClass: "" },
  { id: "lg", label: "大", editorClass: "text-[18px] leading-snug", feedClass: "text-[16px] leading-snug" },
  { id: "xl", label: "特大", editorClass: "text-[22px] leading-tight", feedClass: "text-[18px] leading-snug" },
] as const;

export type TextSizeId = (typeof TEXT_SIZES)[number]["id"];

const SIZE_RE = /\[\[(sm|lg|xl)\]\]([\s\S]*?)\[\[\/\1\]\]/g;

export function unwrapTextSize(src: string) {
  return src.replace(SIZE_RE, "$2");
}

export function wrapWithTextSize(src: string, size: TextSizeId) {
  const inner = unwrapTextSize(src);
  if (size === "md") return inner;
  return `[[${size}]]${inner}[[/${size}]]`;
}

export function textSizeClass(id: string, surface: "editor" | "feed" = "feed") {
  if (id !== "sm" && id !== "lg" && id !== "xl") return "";
  const row = TEXT_SIZES.find((s) => s.id === id);
  if (!row) return "";
  return surface === "editor" ? row.editorClass : row.feedClass;
}

export function splitTextSizeParts(value: string): { size: "sm" | "lg" | "xl" | null; value: string }[] {
  const out: { size: "sm" | "lg" | "xl" | null; value: string }[] = [];
  const re = /\[\[(sm|lg|xl)\]\]([\s\S]*?)\[\[\/\1\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) {
    if (m.index > last) out.push({ size: null, value: value.slice(last, m.index) });
    out.push({ size: m[1] as "sm" | "lg" | "xl", value: m[2] });
    last = m.index + m[0].length;
  }
  if (last < value.length) out.push({ size: null, value: value.slice(last) });
  return out.length ? out : [{ size: null, value }];
}
