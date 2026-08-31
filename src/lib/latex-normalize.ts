/** Normalize MathLive / TeX so KaTeX can render it, or fall back to plain text. */

function replaceNamedBrace(src: string, name: string, wrap: (inner: string) => string) {
  const token = `\\${name}`;
  let out = "";
  let i = 0;
  while (i < src.length) {
    const at = src.indexOf(token, i);
    if (at < 0) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, at);
    let j = at + token.length;
    while (src[j] === " " || src[j] === "\t") j++;
    if (src[j] !== "{") {
      out += src.slice(at, at + token.length);
      i = at + token.length;
      continue;
    }
    let depth = 0;
    let k = j;
    for (; k < src.length; k++) {
      if (src[k] === "{") depth++;
      else if (src[k] === "}") {
        depth--;
        if (depth === 0) {
          k++;
          break;
        }
      }
    }
    const inner = src.slice(j + 1, k - 1);
    out += wrap(inner);
    i = k;
  }
  return out;
}

function stripSimpleTextCommands(src: string) {
  return src
    .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\textrm\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\mathrm\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\\\(?:\s*\[[^\]]*\])?/g, "\n")
    .replace(/\\newline\b/g, "\n")
    .replace(/\\backslash\s?/g, "\\")
    .replace(/\\,/g, " ")
    .replace(/\\ /g, " ")
    .replace(/[{}]/g, "");
}

const MATH_HINT =
  /[\^_]|\\(frac|sum|int|sqrt|begin|alpha|beta|gamma|pi|cdot|times|leq|geq|neq|infty|partial|vec|hat|bar|left|right|dfrac|binom|over|to|in|cdot)/;

export function latexLooksLikePlainText(src: string) {
  const stripped = replaceNamedBrace(src, "displaylines", (inner) => inner);
  const withoutText = stripped.replace(/\\text(?:rm|sf|it|tt|bf)?\s*\{[^{}]*\}/g, "");
  if (MATH_HINT.test(withoutText)) return false;
  const readable = stripSimpleTextCommands(stripped).replace(/\s/g, "");
  if (!readable) return true;
  return !/\\[a-zA-Z@]/.test(readable);
}

export function latexToPlainText(src: string) {
  const unwrapped = replaceNamedBrace(src.trim(), "displaylines", (inner) => inner);
  return stripSimpleTextCommands(unwrapped)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Convert unsupported TeX (MathLive `\displaylines`) into KaTeX-friendly macros. */
export function normalizeLatexForKatex(src: string) {
  let s = src.trim();
  s = replaceNamedBrace(s, "displaylines", (inner) => `\\begin{gathered}${inner}\\end{gathered}`);
  s = s.replace(/\\begin\{displaylines\}/g, "\\begin{gathered}").replace(/\\end\{displaylines\}/g, "\\end{gathered}");
  if (
    (s.includes("\\\\") || s.includes("\\newline")) &&
    !/\\begin\{/.test(s)
  ) {
    s = `\\begin{gathered}${s}\\end{gathered}`;
  }
  return s;
}

export function katexHtmlHasError(html: string) {
  return html.includes("katex-error") || html.includes("ParseError");
}
