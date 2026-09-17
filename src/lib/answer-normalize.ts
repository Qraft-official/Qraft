export const ANSWER_UNIT_MAX = 12;

const KANJI_DIGIT: Record<string, number> = {
  〇: 0,
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const KANJI_SMALL: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };
const KANJI_LARGE: Record<string, number> = { 万: 10_000, 億: 100_000_000 };

/** Trim, cap length. Empty → null. */
export function sanitizeAnswerUnit(raw: string | null | undefined): string | null {
  const s = (raw ?? "").normalize("NFKC").trim();
  if (!s) return null;
  return s.slice(0, ANSWER_UNIT_MAX);
}

/** Spaces, case, NFKC digits, thousands commas. Does not interpret math. */
export function normalizeAnswerLiteral(raw: string): string {
  let s = (raw ?? "").normalize("NFKC").trim();
  s = s.replace(/[\s\u00a0\u3000]+/g, "");
  s = s.replace(/,/g, "");
  s = s.toLowerCase();
  return s;
}

export function parseKanjiInteger(raw: string): number | null {
  const s = normalizeAnswerLiteral(raw);
  if (!s) return null;
  if (!/^[〇零一二三四五六七八九十百千万億]+$/.test(s)) return null;
  let result = 0;
  let group = 0;
  let num = 0;
  for (const ch of s) {
    if (ch in KANJI_DIGIT) {
      num = KANJI_DIGIT[ch];
      continue;
    }
    if (ch in KANJI_SMALL) {
      group += (num === 0 ? 1 : num) * KANJI_SMALL[ch];
      num = 0;
      continue;
    }
    if (ch in KANJI_LARGE) {
      group += num;
      result += (group === 0 ? 1 : group) * KANJI_LARGE[ch];
      group = 0;
      num = 0;
      continue;
    }
    return null;
  }
  const total = result + group + num;
  return Number.isFinite(total) ? total : null;
}

function parseAsciiNumber(s: string): number | null {
  if (!s || s === "-" || s === "." || s === "-.") return null;
  const frac = /^(-?\d+)\/(-?\d+)$/.exec(s);
  if (frac) {
    const den = Number(frac[2]);
    if (!den) return null;
    const n = Number(frac[1]) / den;
    return Number.isFinite(n) ? n : null;
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Integer kanji, ASCII integers/decimals, and simple a/b fractions. */
export function parseLooseNumber(raw: string): number | null {
  const s = normalizeAnswerLiteral(raw);
  if (!s) return null;
  const kanji = parseKanjiInteger(s);
  if (kanji != null) return kanji;
  return parseAsciiNumber(s);
}

export function numbersClose(a: number, b: number) {
  if (a === 0 && b === 0) return true;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-8 * scale;
}

function stripUnitSuffix(value: string, unit: string | null | undefined) {
  const u = normalizeAnswerLiteral(unit ?? "");
  if (!u) return value;
  if (value.endsWith(u) && value.length > u.length) return value.slice(0, -u.length);
  return value;
}

const UNITISH = /^[a-zA-Z%°µμℓ²³円人個冊問台本巻点秒分時年月日個組組]+$/;

function splitLegacyNumberAndUnit(normalized: string): { value: string; unit: string } | null {
  const m = /^((?:[〇零一二三四五六七八九十百千万億]+)|(?:-?\d+(?:\.\d+)?(?:\/-?\d+)?))([^0-9+\-*/=].*)$/.exec(
    normalized,
  );
  if (!m) return null;
  const value = m[1];
  const unit = m[2];
  if (!unit || unit.length > ANSWER_UNIT_MAX) return null;
  if (/[とや・,]/.test(unit)) return null;
  if (!UNITISH.test(unit) && !/^[a-z%°µμℓ²³\/]+$/.test(unit)) return null;
  if (parseLooseNumber(value) == null) return null;
  return { value, unit };
}

export function answersMatch(
  expected: string | null | undefined,
  given: string | null | undefined,
  unit?: string | null,
) {
  const expRaw = expected ?? "";
  const givenRaw = given ?? "";
  if (!normalizeAnswerLiteral(expRaw) || !normalizeAnswerLiteral(givenRaw)) return false;

  const exp = stripUnitSuffix(normalizeAnswerLiteral(expRaw), unit);
  const got = stripUnitSuffix(normalizeAnswerLiteral(givenRaw), unit);
  if (exp && exp === got) return true;

  const nExp = parseLooseNumber(exp);
  const nGot = parseLooseNumber(got);
  if (nExp != null && nGot != null && numbersClose(nExp, nGot)) return true;

  if (!sanitizeAnswerUnit(unit ?? "")) {
    const split = splitLegacyNumberAndUnit(normalizeAnswerLiteral(expRaw));
    if (split) {
      const left = parseLooseNumber(split.value);
      const right = parseLooseNumber(got);
      if (left != null && right != null && numbersClose(left, right)) {
        const givenSplit = splitLegacyNumberAndUnit(got);
        if (!givenSplit) return true;
        if (givenSplit.unit === split.unit) return true;
      }
    }
  }
  return false;
}
