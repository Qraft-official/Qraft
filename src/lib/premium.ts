import {
  COMPLIMENTARY_PREMIUM_IDENTIFIERS,
  DEV_HANDLES,
  DEV_USER_IDS,
  VERIFIED_CREATOR_IDS,
} from "./constants";
import type { Post, Subject } from "./types";

export function isDeveloperAccount(id?: string, handle?: string) {
  if (id && DEV_USER_IDS.includes(id as (typeof DEV_USER_IDS)[number])) return true;
  if (handle && DEV_HANDLES.includes(handle as (typeof DEV_HANDLES)[number])) return true;
  return false;
}

function normalizeAccountToken(raw?: string | null) {
  return (raw ?? "").trim().toLowerCase().replace(/^@+/, "");
}

function tokenIsComplimentaryPremium(token: string) {
  if (!token) return false;
  const local = token.includes("@") ? token.slice(0, token.indexOf("@")) : token;
  return COMPLIMENTARY_PREMIUM_IDENTIFIERS.some((id) => token === id || local === id);
}

export type PremiumIdentity = {
  id?: string | null;
  handle?: string | null;
  name?: string | null;
  email?: string | null;
};

/** id / ユーザー名 / handle / メールが qrafter なら Stripe 契約なしで Premium */
export function isComplimentaryPremiumAccount(identity: PremiumIdentity) {
  return [identity.id, identity.handle, identity.name, identity.email]
    .map(normalizeAccountToken)
    .some(tokenIsComplimentaryPremium);
}

export function accountHasPremium(identity: PremiumIdentity & {
  subscribed?: boolean;
  isDeveloper?: boolean;
}) {
  return Boolean(
    identity.isDeveloper ||
      identity.subscribed ||
      isComplimentaryPremiumAccount(identity),
  );
}

export function isVerifiedCreator(id: string) {
  return VERIFIED_CREATOR_IDS.includes(id as (typeof VERIFIED_CREATOR_IDS)[number]);
}

export function generateAiProblem(subject: Subject, prompt: string) {
  const p = prompt.trim() || "対称式";
  if (subject === "physics") {
    return {
      subject,
      text: `**【AI生成・物理】** ${p}\n\n質量 $m$ の質点が力 $F=-kx$ を受ける。エネルギー保存から周期を求めよ。\n\n$$T=2\\pi\\sqrt{\\frac{m}{k}}$$\n\nさらに減衰 $\\gamma$ を入れたとき、振る舞いがどう変わるか述べよ。`,
    };
  }
  if (subject === "chemistry") {
    return {
      subject,
      text: `**【AI生成・化学】** ${p}\n\n反応 $\\mathrm{A}\\rightleftharpoons\\mathrm{B}$ で $K=2.0$。初期 $[\\mathrm{A}]=1.0\\,\\mathrm{M}$ の平衡濃度を求めよ。\n\n$$K=\\frac{[B]}{[A]}$$\n\n温度を上げると $K$ はどう動く？（Le Chatelier）`,
    };
  }
  return {
    subject,
    text: `**【AI生成・数学】** ${p}\n\n正の実数 $x,y$ が $x+y=xy$ を満たすとき\n\n$$\\frac{1}{x^2+1}+\\frac{1}{y^2+1}$$\n\nの値を求めよ。置換 $x=1+\\frac{1}{t}$ を試せ。`,
  };
}

export const LOUNGE_POSTS: Post[] = [
  {
    id: "lounge-1",
    authorId: "u-mirai",
    kind: "problem" as const,
    subject: "math" as const,
    text: "**【Premium Lounge】** 今週の秘密問。$n$ 次元単体の体積公式を組合せ的に導け。",
    createdAt: "2026-08-29T22:00:00",
    replyCount: 9,
    repostCount: 3,
    likeCount: 120,
    ahaSum: 5 * 20,
    ahaCount: 20,
    eleganceSum: 0,
    eleganceCount: 0,
  },
  {
    id: "lounge-2",
    authorId: "u-alice",
    kind: "problem" as const,
    subject: "physics" as const,
    text: "**【Premium Lounge】** ブラックホール準固有振動。線形摂動の玩具モデルで $\\omega$ を求めよ。",
    createdAt: "2026-08-29T21:10:00",
    replyCount: 4,
    repostCount: 1,
    likeCount: 67,
    ahaSum: 4.8 * 12,
    ahaCount: 12,
    eleganceSum: 0,
    eleganceCount: 0,
  },
];
