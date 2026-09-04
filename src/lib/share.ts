import { CANONICAL_ORIGIN, problemShareUrl } from "./constants";

export { CANONICAL_ORIGIN, problemShareUrl };

export function sanitizeInviteCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === "undefined" || lower === "null" || lower === "nan") return null;
  return trimmed;
}

export function problemShareCopy(inviteCode: string | null | undefined) {
  const code = sanitizeInviteCode(inviteCode);
  if (code) {
    return {
      title: "Qraftの問題",
      text: `この問題解ける？\n招待コードは【${code}】`,
    };
  }
  return {
    title: "Qraftの問題",
    text: "この問題解ける？\nQraftで挑戦してみよう！",
  };
}

export async function sharePost(input: {
  id: string;
  inviteCode?: string | null;
}) {
  const url = problemShareUrl(input.id);
  const { title, text } = problemShareCopy(input.inviteCode);
  const shareData = { title, text, url };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
      return { ok: true as const, method: "share" as const };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return { ok: false as const, method: "share" as const, aborted: true };
      }
    }
  }

  const payload = `${text}\n${url}`;
  try {
    await navigator.clipboard.writeText(payload);
    return { ok: true as const, method: "copy" as const };
  } catch {
    return { ok: false as const, method: "copy" as const };
  }
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

async function copyText(text: string) {
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

export async function shareInvite(inviteUrl: string) {
  const text = inviteShareMessage(inviteUrl);
  const shareData: ShareData = {
    title: "Qraft（クラフト）",
    text,
    url: inviteUrl,
  };

  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare(shareData));

  if (canShare) {
    try {
      await navigator.share(shareData);
      return { ok: true as const, method: "share" as const };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return { ok: false as const, method: "share" as const, aborted: true };
      }
    }
  }

  const copied = await copyText(text);
  return copied
    ? { ok: true as const, method: "copy" as const }
    : { ok: false as const, method: "copy" as const };
}
