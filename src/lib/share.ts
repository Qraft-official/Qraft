export async function sharePost(input: { id: string; text: string }) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${input.id}`
      : `/p/${input.id}`;
  const title = "Qraft";
  const snippet = input.text.replace(/\s+/g, " ").trim().slice(0, 120);
  const shareData = { title, text: snippet || "Qraftの問題", url };

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

  try {
    await navigator.clipboard.writeText(url);
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
