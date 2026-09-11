export const SPRINT_ANSWER_TYPES = ["number", "expression", "text", "choice", "multiple"] as const;
export type SprintAnswerType = (typeof SPRINT_ANSWER_TYPES)[number];
export type SprintGrade = "correct" | "maybe_correct" | "incorrect";

export function asSprintAnswerType(value: unknown): SprintAnswerType {
  const raw = String(value ?? "").trim().toLowerCase();
  return (SPRINT_ANSWER_TYPES as readonly string[]).includes(raw)
    ? (raw as SprintAnswerType)
    : "number";
}

export function parseAcceptedAnswers(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean).slice(0, 20);
  }
  if (typeof value === "string") {
    return value
      .split(/\n|、|,/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return [];
}

export function normalizeSprintAnswer(raw: string): string {
  let s = (raw ?? "").normalize("NFKC").trim();
  s = s.replace(/[，,]/g, "");
  s = s.replace(/^[「『"'“]+/, "").replace(/[」』"'”]+$/, "");
  s = s.replace(/^(答え(は)?|解答(は)?|正解(は)?|answer\s*(is|=|:)?)\s*/i, "");
  s = s.replace(/^[=\s：:]+/, "");
  s = s.replace(/[。．.、]+$/g, "");
  s = s.replace(/\s+/g, "");
  return s.toLowerCase();
}

function parseNumeric(raw: string): number | null {
  let s = normalizeSprintAnswer(raw);
  s = s.replace(/^x=/, "");
  if (!s || s === "-" || s === ".") return null;
  if (s === "-0") return 0;
  const frac = /^(-?\d+)\/(-?\d+)$/.exec(s);
  if (frac) {
    const den = Number(frac[2]);
    if (!den) return null;
    return Number(frac[1]) / den;
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function numbersEqual(a: number, b: number) {
  if (a === 0 && b === 0) return true;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-8 * scale;
}

function extractEmbeddedNumber(raw: string): number | null {
  const s = normalizeSprintAnswer(raw);
  const frac = /(-?\d+)\/(-?\d+)/.exec(s);
  if (frac) return parseNumeric(frac[0]);
  const num = /-?\d+(\.\d+)?/.exec(s);
  if (num) return parseNumeric(num[0]);
  return null;
}

/** Safe arithmetic + one variable x. No JS eval. */
function evalExpr(expr: string, x: number): number | null {
  const s = normalizeSprintAnswer(expr).replace(/×/g, "*").replace(/÷/g, "/");
  if (!/^[0-9x+\-*/^().]+$/.test(s)) return null;
  let i = 0;
  const peek = () => s[i] ?? "";
  const eat = () => s[i++];
  function parseExpr(): number {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = eat();
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  function parseTerm(): number {
    let v = parseUnary();
    while (peek() === "*" || peek() === "/" || implicitMul()) {
      if (peek() === "*") {
        eat();
        v *= parseUnary();
      } else if (peek() === "/") {
        eat();
        const d = parseUnary();
        if (d === 0) throw new Error("div0");
        v /= d;
      } else {
        v *= parseUnary();
      }
    }
    return v;
  }
  function implicitMul() {
    const c = peek();
    return c === "x" || c === "(" || (c >= "0" && c <= "9");
  }
  function parseUnary(): number {
    if (peek() === "+") {
      eat();
      return parseUnary();
    }
    if (peek() === "-") {
      eat();
      return -parseUnary();
    }
    return parsePower();
  }
  function parsePower(): number {
    let v = parseAtom();
    if (peek() === "^") {
      eat();
      v = v ** parseUnary();
    }
    return v;
  }
  function parseAtom(): number {
    if (peek() === "(") {
      eat();
      const v = parseExpr();
      if (peek() === ")") eat();
      return v;
    }
    if (peek() === "x") {
      eat();
      return x;
    }
    let start = i;
    if (peek() === ".") eat();
    while (peek() >= "0" && peek() <= "9") eat();
    if (peek() === "." && start === i) eat();
    while (peek() >= "0" && peek() <= "9") eat();
    const raw = s.slice(start, i);
    if (!raw) throw new Error("num");
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error("num");
    return n;
  }
  try {
    const v = parseExpr();
    if (i !== s.length) return null;
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

function expressionsEqual(a: string, b: string): boolean | null {
  const na = parseNumeric(a);
  const nb = parseNumeric(b);
  if (na != null && nb != null) return numbersEqual(na, nb);
  const samples = [0, 1, 2, 3, -1, 0.5, 7];
  let compared = 0;
  for (const x of samples) {
    const va = evalExpr(a, x);
    const vb = evalExpr(b, x);
    if (va == null || vb == null) return null;
    compared += 1;
    if (!numbersEqual(va, vb)) return false;
  }
  return compared > 0;
}

function splitMulti(raw: string): string[] {
  return normalizeSprintAnswer(raw)
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .sort();
}

export function gradeSprintAnswer(input: {
  given: string;
  canonical: string;
  accepted?: string[];
  answerType?: SprintAnswerType;
}): SprintGrade {
  const given = input.given ?? "";
  const canonical = input.canonical ?? "";
  const accepted = (input.accepted ?? []).map(String).filter(Boolean);
  const type = input.answerType ?? "number";
  if (!given.trim() || !canonical.trim()) return "incorrect";

  const targets = [canonical, ...accepted];
  const ng = normalizeSprintAnswer(given);

  if (type === "choice") {
    return targets.some((t) => normalizeSprintAnswer(t) === ng) ? "correct" : "incorrect";
  }

  if (type === "multiple") {
    const gs = splitMulti(given).join("|");
    return targets.some((t) => splitMulti(t).join("|") === gs) ? "correct" : "incorrect";
  }

  if (type === "number") {
    const gNum = parseNumeric(given) ?? extractEmbeddedNumber(given);
    for (const t of targets) {
      const tNum = parseNumeric(t) ?? extractEmbeddedNumber(t);
      if (gNum != null && tNum != null && numbersEqual(gNum, tNum)) return "correct";
      if (normalizeSprintAnswer(t) === ng) return "correct";
    }
    return "incorrect";
  }

  if (type === "expression") {
    for (const t of targets) {
      const eq = expressionsEqual(given, t);
      if (eq === true) return "correct";
      if (normalizeSprintAnswer(t) === ng) return "correct";
    }
    const gNum = parseNumeric(given);
    for (const t of targets) {
      const tNum = parseNumeric(t);
      if (gNum != null && tNum != null && numbersEqual(gNum, tNum)) return "correct";
    }
    return "incorrect";
  }

  // text
  for (const t of targets) {
    const nt = normalizeSprintAnswer(t);
    if (nt && nt === ng) return "correct";
  }
  for (const t of targets) {
    const nt = normalizeSprintAnswer(t);
    if (nt.length >= 2 && ng.length >= 2 && (ng.includes(nt) || nt.includes(ng))) {
      const ratio = Math.min(nt.length, ng.length) / Math.max(nt.length, ng.length);
      if (ratio >= 0.4) return "maybe_correct";
    }
  }
  return "incorrect";
}
