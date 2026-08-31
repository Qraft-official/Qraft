/** Wrap MathLive LaTeX so the existing KaTeX feed renderer can display it. */
export function wrapMathliveLatex(latex: string) {
  const t = latex.trim();
  if (!t) return "";
  if (t.includes("$$")) return t;
  if (t.includes("$") && !t.trimStart().startsWith("\\")) return t;
  return `$$${t}$$`;
}

/** Strip markdown/$ wrappers so MathLive can ingest AI-generated problems. */
export function toMathliveLatex(src: string) {
  return src.replace(/\*\*/g, "").replace(/\$\$/g, "").replace(/\$/g, "").trim();
}
