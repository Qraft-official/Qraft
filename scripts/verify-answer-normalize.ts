import assert from "node:assert/strict";
import {
  answersMatch,
  parseKanjiInteger,
  parseLooseNumber,
  sanitizeAnswerUnit,
} from "../src/lib/answer-normalize";
import { gradeSprintAnswer } from "../src/lib/sprint-grade";

assert.equal(sanitizeAnswerUnit("  cm  "), "cm");
assert.equal(sanitizeAnswerUnit("abcdefghijklmn"), "abcdefghijkl");
assert.equal(sanitizeAnswerUnit("   "), null);

assert.equal(parseKanjiInteger("三十"), 30);
assert.equal(parseKanjiInteger("百"), 100);
assert.equal(parseKanjiInteger("千"), 1000);
assert.equal(parseKanjiInteger("十一"), 11);
assert.equal(parseKanjiInteger("二千二十六"), 2026);
assert.equal(parseLooseNumber("３０"), 30);
assert.equal(parseLooseNumber("1,000"), 1000);
assert.equal(parseLooseNumber("１０００"), 1000);
assert.equal(parseLooseNumber("千"), 1000);
assert.equal(parseLooseNumber("1/2"), 0.5);

assert.equal(answersMatch("30", "30"), true);
assert.equal(answersMatch("30", "３０"), true);
assert.equal(answersMatch("30", "三十"), true);
assert.equal(answersMatch("100", "１００"), true);
assert.equal(answersMatch("100", "百"), true);
assert.equal(answersMatch("1000", "1,000"), true);
assert.equal(answersMatch("1000", "１０００"), true);
assert.equal(answersMatch("1000", "千"), true);
assert.equal(answersMatch("Yes", "yes"), true);
assert.equal(answersMatch("  30  ", "３０"), true);
assert.equal(answersMatch("1/2", "0.5"), true);
assert.equal(answersMatch("1/2", "1/3"), false);

assert.equal(answersMatch("30", "30", "cm"), true);
assert.equal(answersMatch("30", "30cm", "cm"), true);
assert.equal(answersMatch("30cm", "30", "cm"), true);
assert.equal(answersMatch("30", "31", "cm"), false);

assert.equal(answersMatch("30cm", "30"), true);
assert.equal(answersMatch("30 cm", "３０"), true);
assert.equal(answersMatch("30㎝", "三十"), true);

assert.equal(answersMatch("7と13", "7と13"), true);
assert.equal(answersMatch("7と13", "7"), false);
assert.equal(answersMatch("100-25π", "100"), false);
assert.equal(answersMatch("うそつき", "三十"), false);

assert.equal(gradeSprintAnswer({ given: "三十", canonical: "30", answerType: "number" }), "correct");
assert.equal(gradeSprintAnswer({ given: "31", canonical: "30", answerType: "number" }), "incorrect");

console.log("ok answer-normalize");
