export type ClientAccess = {
  phase: "prelaunch" | "early" | "public";
  earlyAccessStart: string;
  publicReleaseAt: string;
  cap: number;
  memberCount: number;
  remaining: number;
  canAccess: boolean;
  signupOpen: boolean;
  joinOpen: boolean;
  isAdmin: boolean;
  isMember: boolean;
  adminCheckError?: string | null;
};

export async function fetchAccessStatus(token?: string | null): Promise<ClientAccess> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch("/api/access", {
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as ClientAccess & { error?: string } | null;
  if (!res.ok) {
    const message = body?.error || `公開状態の確認に失敗しました (${res.status})`;
    throw new Error(message);
  }
  if (!body) throw new Error("公開状態の確認に失敗しました");
  return body;
}
