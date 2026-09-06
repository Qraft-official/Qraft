/** Copy the browser Auth session into httpOnly cookies so middleware/SSR see the same user. */
export async function persistSessionCookies(session: {
  access_token: string;
  refresh_token: string;
}) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }),
  });
  if (!res.ok) {
    throw new Error("セッションCookieを保存できませんでした");
  }
}

export async function clearSessionCookies() {
  await fetch("/api/auth/signout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => {
    /* ignore */
  });
}
