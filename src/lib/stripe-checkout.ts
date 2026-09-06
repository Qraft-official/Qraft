import { supabase } from "./supabase";

export async function fetchCheckoutSessionStatus(sessionId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;
  const res = await fetch(`/api/checkout?session_id=${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as { status?: string; paymentStatus?: string };
}
