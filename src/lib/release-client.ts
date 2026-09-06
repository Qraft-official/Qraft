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
};

export function deniedClientAccess(): ClientAccess {
  return {
    phase: "prelaunch",
    earlyAccessStart: "2026-09-12T00:00:00+09:00",
    publicReleaseAt: "2026-09-19T00:00:00+09:00",
    cap: 30,
    memberCount: 30,
    remaining: 0,
    canAccess: false,
    signupOpen: false,
    joinOpen: false,
    isAdmin: false,
    isMember: false,
  };
}

export async function fetchAccessStatus(token?: string | null): Promise<ClientAccess> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch("/api/access", {
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as (ClientAccess & { error?: string }) | null;
  if (!res.ok || !body || body.canAccess === undefined) {
    throw new Error(body?.error || `公開状態の確認に失敗しました (${res.status})`);
  }
  return {
    phase: body.phase === "early" || body.phase === "public" ? body.phase : "prelaunch",
    earlyAccessStart: body.earlyAccessStart,
    publicReleaseAt: body.publicReleaseAt,
    cap: Number(body.cap) || 30,
    memberCount: Number(body.memberCount) || 0,
    remaining: Number(body.remaining) || 0,
    canAccess: body.canAccess === true,
    signupOpen: body.signupOpen === true,
    joinOpen: body.joinOpen === true,
    isAdmin: body.isAdmin === true,
    isMember: body.isMember === true,
  };
}

export async function clearAccessCookie() {
  try {
    await fetch("/api/access", {
      method: "DELETE",
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    /* ignore */
  }
}
