import { CANONICAL_ORIGIN, problemShareUrl as problemPathUrl } from "./constants";

export { CANONICAL_ORIGIN };

export function sanitizeInviteCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === "undefined" || lower === "null" || lower === "nan") return null;
  if (trimmed.length > 64) return null;
  return trimmed;
}

/** Problem permalink. Uses existing `?ref=` capture (`parseInviteCodeFromLocation`). */
export function problemShareUrl(problemId: string, inviteCode?: string | null) {
  const path = problemPathUrl(problemId);
  const code = sanitizeInviteCode(inviteCode);
  if (!code) return path;
  try {
    const u = new URL(path);
    u.searchParams.set("ref", code);
    return u.toString();
  } catch {
    return path;
  }
}

export function problemShareCopy(input: {
  inviteCode?: string | null;
  includeUrl?: boolean;
  url?: string;
}) {
  const code = sanitizeInviteCode(input.inviteCode);
  const lines = ["この問題解ける？ Qraftで挑戦してみよう。"];
  if (input.includeUrl && input.url) {
    lines.push("", input.url);
  }
  if (code) {
    lines.push("", `招待コード：【${code}】`);
  }
  return {
    title: "Qraftの問題",
    text: lines.join("\n"),
    inviteCode: code,
  };
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(el);
    }
  }
}

type NavShare = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

export async function tryWebShare(data: ShareData): Promise<{
  ok: boolean;
  aborted?: boolean;
  unsupported?: boolean;
}> {
  const nav = navigator as NavShare;
  if (typeof nav.share !== "function") return { ok: false, unsupported: true };
  const can = typeof nav.canShare !== "function" || nav.canShare(data);
  if (!can) return { ok: false, unsupported: true };
  try {
    await nav.share(data);
    return { ok: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, aborted: true };
    }
    return { ok: false, unsupported: true };
  }
}

export async function sharePost(input: {
  id: string;
  inviteCode?: string | null;
}) {
  const url = problemShareUrl(input.id, input.inviteCode);
  const { title, text } = problemShareCopy({
    inviteCode: input.inviteCode,
    includeUrl: false,
    url,
  });
  const shared = await tryWebShare({ title, text, url });
  if (shared.ok || shared.aborted) {
    return { ok: shared.ok, method: "share" as const, aborted: shared.aborted };
  }

  const payload = problemShareCopy({
    inviteCode: input.inviteCode,
    includeUrl: true,
    url,
  }).text;
  const copied = await copyText(payload);
  return copied
    ? { ok: true as const, method: "copy" as const }
    : { ok: false as const, method: "copy" as const };
}

export function inviteShareMessage(inviteUrl: string) {
  return [
    "問題を自作したり、仲間と解いて競える学習アプリ「Qraft（クラフト）」！",
    "",
    "友達紹介キャンペーン中🎁",
    "招待リンクからアクセス＆簡単な条件達成で、利用料金が半額になるよ！",
    "",
    "下のリンクから登録してね👇",
    inviteUrl,
  ].join("\n");
}

export async function shareInvite(inviteUrl: string) {
  const text = inviteShareMessage(inviteUrl);
  const shareData: ShareData = {
    title: "Qraft（クラフト）",
    text,
    url: inviteUrl,
  };

  const shared = await tryWebShare(shareData);
  if (shared.ok || shared.aborted) {
    return { ok: shared.ok, method: "share" as const, aborted: shared.aborted };
  }

  const copied = await copyText(text);
  return copied
    ? { ok: true as const, method: "copy" as const }
    : { ok: false as const, method: "copy" as const };
}

export async function shareCardImage(
  blob: Blob,
  problemId: string,
  inviteCode?: string | null,
) {
  const url = problemShareUrl(problemId, inviteCode);
  const { title, text } = problemShareCopy({ inviteCode, includeUrl: false, url });
  const file = new File([blob], "qraft-problem.png", { type: blob.type || "image/png" });
  const withFile: ShareData = { files: [file], title, text, url };
  let shared = await tryWebShare(withFile);
  if (shared.ok) return { ok: true as const, method: "share" as const };
  if (shared.aborted) return { ok: false as const, method: "share" as const, aborted: true };

  shared = await tryWebShare({ files: [file], title, text: `${text}\n${url}` });
  if (shared.ok) return { ok: true as const, method: "share" as const };
  if (shared.aborted) return { ok: false as const, method: "share" as const, aborted: true };

  return { ok: false as const, method: "fallback" as const, url, text };
}
