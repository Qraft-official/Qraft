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
