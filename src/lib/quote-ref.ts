const QUOTE_RE = /^\[qraft-quote:([^\]]+)\]\n?/;
const TITLE_RE = /^(\*\*[^\n*]+\*\*\n\n)/;

/** Persist a quoted problem id in problem_text without a new DB column. */
export function withQuoteRef(text: string, quotePostId: string | undefined) {
  const id = (quotePostId ?? "").trim();
  if (!id) return text;
  const body = stripQuoteRef(text);
  return `[qraft-quote:${id}]\n${body}`;
}

export function stripQuoteRef(text: string) {
  const raw = text ?? "";
  if (QUOTE_RE.test(raw)) return raw.replace(QUOTE_RE, "");
  const titled = TITLE_RE.exec(raw);
  if (!titled) return raw;
  const rest = raw.slice(titled[0].length);
  if (!QUOTE_RE.test(rest)) return raw;
  return titled[1] + rest.replace(QUOTE_RE, "");
}

export function readQuoteRef(text: string | undefined) {
  const raw = text ?? "";
  const direct = QUOTE_RE.exec(raw)?.[1]?.trim();
  if (direct) return direct;
  const titled = TITLE_RE.exec(raw);
  if (!titled) return undefined;
  return QUOTE_RE.exec(raw.slice(titled[0].length))?.[1]?.trim() || undefined;
}
