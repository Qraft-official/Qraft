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

export async function fetchAccessStatus(token?: string | null): Promise<ClientAccess | null> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch("/api/access", {
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as ClientAccess;
}
