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
    .replace(/\\begin\{lines\}/g, "")
    .replace(/\\end\{lines\}/g, "")
    .replace(/\\\\(?:\s*\[[^\]]*\])?/g, "\n")
    .replace(/\\newline\b/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\backslash\s?/g, "\\")
    .replace(/\\,/g, " ")
    .replace(/\\ /g, " ")
    .replace(/[{}]/g, "");
}

const MATH_HINT =
  /[\^_]|\\(frac|sum|int|sqrt|begin|alpha|beta|gamma|pi|cdot|times|leq|geq|neq|infty|partial|vec|hat|bar|left|right|dfrac|binom|over|to|in|cdot)/;

export function latexLooksLikePlainText(src: string) {
  const unlined = src.replace(/\\begin\{lines\}/g, "").replace(/\\end\{lines\}/g, "");
  const stripped = replaceNamedBrace(unlined, "displaylines", (inner) => inner);
  const withoutText = stripped.replace(/\\text(?:rm|sf|it|tt|bf)?\s*\{[^{}]*\}/g, "");
  if (MATH_HINT.test(withoutText)) return false;
  const readable = stripSimpleTextCommands(stripped).replace(/\s/g, "");
  if (!readable) return true;
  return !/\\[a-zA-Z@]/.test(readable);
}

export function latexToPlainText(src: string) {
  const unlined = src.replace(/\\begin\{lines\}/g, "").replace(/\\end\{lines\}/g, "");
  const unwrapped = replaceNamedBrace(unlined, "displaylines", (inner) => inner);
  return stripSimpleTextCommands(unwrapped);
}

export function capExcessBlankLines(src: string) {
  return src.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n{5,}/g, "\n\n\n\n");
}

/** Convert `\(...\)` / `\[...\]` into `$` / `$$` so LatexText can tokenize them. */
export function convertTexDelimiters(src: string) {
  return src
    .replace(/\\\[([\s\S]+?)\\\]/g, "$$$$$1$$$$")
    .replace(/\\\(([\s\S]+?)\\\)/g, "$$$1$");
}

function isMathyRun(run: string) {
  const t = run.trim();
  if (t.length < 2) return false;
  if (/[ぁ-んァ-ン一-龯]/.test(t)) return false;
  if (/^https?:/i.test(t)) return false;
  if (/\\[a-zA-Z]/.test(t)) return true;
  if (/[\^_²³¹⁰⁴⁵⁶⁷⁸⁹]/.test(t)) return true;
  if (/[A-Za-z]\s*\([^)]*\)/.test(t) && /[+\-/*=]/.test(t)) return true;
  if (/\([^)]+\)\s*\/\s*[A-Za-z0-9(]/.test(t)) return true;
  if (/[A-Za-z0-9]\/[A-Za-z0-9]/.test(t) && /[A-Za-z()]/.test(t)) return true;
  if (/\.\.\./.test(t) && /[+\-^]/.test(t)) return true;
  return false;
}

function wrapRunsInPlain(text: string) {
  const re =
    /(?:\\[a-zA-Z]+(?:\s*\{[^{}]*\})+|[A-Za-z0-9\\²³¹⁰⁴⁵⁶⁷⁸⁹πθΔΣ√∞()[\]{}+\-*=^_./≤≥≠≈×÷±]|…|\.{3})+/g;
  return text.replace(re, (run) => (isMathyRun(run) ? `$${run}$` : run));
}

function wrapOutsideDollars(src: string) {
  const out: string[] = [];
  const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(wrapRunsInPlain(src.slice(last, m.index)));
    out.push(m[0]);
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(wrapRunsInPlain(src.slice(last)));
  return out.join("");
}

/** Make mixed Japanese + bare math render through the shared KaTeX path. */
export function prepareProseForLatex(src: string) {
  const capped = capExcessBlankLines(src);
  const converted = convertTexDelimiters(capped);
  const fences = converted.split(/(```[\s\S]*?```)/g);
  return fences
    .map((chunk) => (chunk.startsWith("```") ? chunk : wrapOutsideDollars(chunk)))
    .join("");
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
