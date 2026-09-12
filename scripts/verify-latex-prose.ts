import assert from "node:assert/strict";
import { convertTexDelimiters, prepareProseForLatex } from "../src/lib/latex-normalize";

assert.equal(convertTexDelimiters("\\(x^2\\)"), "$x^2$");
assert.equal(convertTexDelimiters("\\[a+b\\]"), "$$a+b$$");

const mixed = prepareProseForLatex(
  "和の公式n(n+1)(2n+1)/6でn=2026とする。1^2+2^2+...も同じ。",
);
assert.match(mixed, /\$n\(n\+1\)\(2n\+1\)\/6\$/);
assert.match(mixed, /\$1\^2\+2\^2\+\.\.\.\$/);
assert.match(mixed, /和の公式/);
assert.doesNotMatch(mixed, /\\frac/);

const frac = prepareProseForLatex("面積は \\frac{1}{3} 倍");
assert.match(frac, /\$\\frac\{1\}\{3\}\$/);

const already = prepareProseForLatex("すでに $n^2$ です");
assert.equal(already.includes("$$n^2$$"), false);
assert.match(already, /\$n\^2\$/);

const raw = prepareProseForLatex("\\(n^5-n\\) を考える");
assert.match(raw, /\$n\^5-n\$/);
assert.doesNotMatch(raw, /\\\(/);

console.log("ok latex prose wrapping");
