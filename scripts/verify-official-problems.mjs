import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const problems = JSON.parse(readFileSync(join(root, "src/content/official-problems.json"), "utf8"));
const answers = JSON.parse(readFileSync(join(root, "src/content/official-problem-answers.json"), "utf8"));
const answersById = new Map(answers.map((answer) => [answer.id, answer]));
const choose = (n, k) => {
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
  return result;
};
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);

assert.equal(problems.length, 25, "official problem count");
assert.equal(new Set(problems.map((problem) => problem.id)).size, 25, "unique slugs");
assert.equal(answers.length, 25, "official answer count");
for (const problem of problems) {
  assert.match(problem.sourceId, /^P\d{2}$/);
  assert.ok(problem.title && problem.body && problem.hint && problem.explanation);
  assert.ok(problem.category && answersById.get(problem.id)?.correctAnswer);
  assert.ok(problem.difficultyLevel >= 1 && problem.difficultyLevel <= 4);
}

const truthSolutions = [];
for (const a of [false, true]) for (const b of [false, true]) for (const c of [false, true]) {
  if (a === !b && b === !c && c === (a === b)) truthSolutions.push([a, b, c]);
}
assert.deepEqual(truthSolutions, [[false, true, false]], "P18 truth table");

const segments = {
  3: new Set(["a", "b", "c", "d", "g"]),
  5: new Set(["a", "c", "d", "f", "g"]),
};
const removed = [...segments[5]].filter((segment) => !segments[3].has(segment));
const added = [...segments[3]].filter((segment) => !segments[5].has(segment));
assert.deepEqual(removed, ["f"], "P25 removes the upper-left match");
assert.deepEqual(added, ["b"], "P25 adds the upper-right match");

const computed = new Map([
  ["grid-shortest-routes", String(choose(6, 3))],
  ["reverse-three-digit-number", String(643)],
  ["square-difference-sequence", String(31 + 25)],
  ["triangles-on-six-points", String(choose(6, 3))],
  ["midpoints-triangle-area", String(Math.abs(0 * 8 + 4 * 4 + 8 * 0 - 0 * 4 - 8 * 8 - 4 * 0) / 2)],
  ["fixed-base-moving-point-area", String((12 * 8) / 2)],
  ["rectangles-in-two-by-three-grid", String(choose(3, 2) * choose(4, 2))],
  ["count-digit-seven", String(10 + 10)],
  ["cube-net-opposite-face", "E"],
  ["isosceles-inner-segment-angle", String(80 - (180 - 80 - 60))],
  ["not-multiple-three-five", String(100 - (Math.floor(100 / 3) + Math.floor(100 / 5) - Math.floor(100 / 15)))],
  ["arrange-five-nonadjacent", String(120 - 2 * 24)],
  ["three-digit-even-without-repeat", String(2 * 4 * 3)],
  ["toggle-lamps-perfect-squares", String(Math.floor(Math.sqrt(100)))],
  ["nine-coins-two-weighings", String(Math.ceil(Math.log(9) / Math.log(3) - 1e-12))],
  ["one-less-than-lcm", String([2, 3, 4, 5].reduce(lcm) - 1)],
  ["missing-score-from-average", String(20 * 72 - 19 * 73)],
  ["three-people-truth-liar", "B"],
  ["choose-two-different-row-column", String(choose(4, 2) * choose(4, 2) * 2)],
  ["clock-angle-three-twenty", String(Math.abs(20 * 6 - (3 * 30 + 20 * 0.5)))],
  ["painted-cube-two-faces", String(12 * (3 - 2))],
  ["grid-path-avoid-center", String(choose(8, 4) - choose(4, 2) ** 2)],
  ["odd-cycle-two-coloring", "不可能"],
  ["make-twenty-four-four-cards", String(6 / (1 - 3 / 4))],
  ["move-one-matchstick-equation", 9 - 3 === 6 ? "9-3=6" : "invalid"],
]);
for (const problem of problems) {
  assert.equal(answersById.get(problem.id)?.correctAnswer, computed.get(problem.id), `${problem.sourceId} answer`);
}

const imageProblems = problems.filter((problem) => problem.image);
assert.equal(imageProblems.length, 14, "image problem count");
const assetNames = readdirSync(join(root, "public/official-problems")).filter((name) => name.endsWith(".svg"));
assert.equal(assetNames.length, 14, "SVG asset count");
for (const problem of imageProblems) {
  const file = join(root, "public", problem.image.replace(/^\//, ""));
  const svg = readFileSync(file, "utf8");
  assert.match(svg, /<svg[^>]+viewBox=/, `${problem.sourceId} viewBox`);
  assert.match(svg, /<title[^>]*>.+<\/title>/, `${problem.sourceId} title`);
  assert.match(svg, /<desc[^>]*>.+<\/desc>/, `${problem.sourceId} desc`);
  assert.doesNotMatch(svg, /<script|\son\w+=|javascript:/i, `${problem.sourceId} unsafe SVG content`);
}

const readSvg = (id) => {
  const problem = problems.find((item) => item.id === id);
  assert.ok(problem?.image, `${id} has an SVG`);
  return readFileSync(join(root, "public", problem.image.replace(/^\//, "")), "utf8");
};
const length = ([x1, y1], [x2, y2]) => Math.hypot(x2 - x1, y2 - y1);
const angle = (a, vertex, b) => {
  const left = [a[0] - vertex[0], a[1] - vertex[1]];
  const right = [b[0] - vertex[0], b[1] - vertex[1]];
  const cosine = (left[0] * right[0] + left[1] * right[1]) / (Math.hypot(...left) * Math.hypot(...right));
  return Math.acos(cosine) * 180 / Math.PI;
};

// P09: the exact net is B above C, F below C, and A-C-D-E in one row.
const p09 = readSvg("cube-net-opposite-face");
for (const face of ["A", "B", "C", "D", "E", "F"]) assert.match(p09, new RegExp(`>${face}<\\/text>`));
assert.match(p09, /x="90" y="160"[^>]+width="120"/);
assert.match(p09, /x="210" y="40"[^>]+width="120"/);
assert.match(p09, /x="210" y="160"[^>]+width="120"/);
assert.match(p09, /x="330" y="160"[^>]+width="120"/);
assert.match(p09, /x="450" y="160"[^>]+width="120"/);
assert.match(p09, /x="210" y="280"[^>]+width="120"/);

// P10: coordinates reproduce A=80°, B=60°, and AD=DC (rounding tolerance only).
const p10 = readSvg("isosceles-inner-segment-angle");
assert.match(p10, /M254 125L130 340H510Z/);
assert.match(p10, /M254 125L292 340/);
const A = [254, 125], B = [130, 340], C = [510, 340], D = [292, 340];
assert.ok(Math.abs(angle(B, A, C) - 80) < 0.2, "P10 angle A");
assert.ok(Math.abs(angle(A, B, C) - 60) < 0.2, "P10 angle B");
assert.ok(Math.abs(length(A, D) - length(D, C)) < 0.5, "P10 AD = DC");

// P20: minute hand is at 120°, hour hand at 100° at 3:20.
const p20 = readSvg("clock-angle-three-twenty");
assert.match(p20, /M260 260L397 339/);
assert.match(p20, /M260 260L358 277/);
const clockAngle = ([x, y]) => (Math.atan2(x - 260, 260 - y) * 180 / Math.PI + 360) % 360;
assert.ok(Math.abs(clockAngle([397, 339]) - 120) < 0.3, "P20 minute hand");
assert.ok(Math.abs(clockAngle([358, 277]) - 100) < 0.3, "P20 hour hand");

// P21: three visible outer faces are each divided into a 3 by 3 grid.
const p21 = readSvg("painted-cube-two-faces");
assert.equal((p21.match(/fill-opacity=/g) ?? []).length, 3, "P21 three painted faces");
for (const division of ["M243 115L423 215", "M317 85L497 185", "M230 178V368", "M290 212V402", "M423 215V405", "M497 185V375"]) {
  assert.ok(p21.includes(division), `P21 division ${division}`);
}

// P25: the SVG's 5 has a,f,g,c,d. Moving only f to b produces a,b,g,c,d = 3.
const p25 = readSvg("move-one-matchstick-equation");
assert.match(p25, /transform="translate\(330 75\)"/);
assert.match(p25, /<use href="#v"\/><use href="#v" x="64" y="74"\/>/);
assert.equal(removed.length, 1, "P25 removes exactly one match");
assert.equal(added.length, 1, "P25 adds exactly one match");

console.log(`official problems: ${problems.length}`);
console.log(`official SVGs: ${imageProblems.length}`);
console.log("answers, required fields, unique slugs, SVG safety, and P09/P10/P20/P21/P25 geometry: ok");
