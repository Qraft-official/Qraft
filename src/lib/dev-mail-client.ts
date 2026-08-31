import { supabase } from "./supabase";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    return { error: json.error || `送信に失敗しました（${res.status}）` };
  }
  return {};
}

export async function sendFeedbackMail(input: {
  category: string;
  subject: string;
  message: string;
  name: string;
  handle: string;
}) {
  return postJson("/api/feedback", input);
}

export async function sendPulseProblemMail(input: {
  problemId: string;
  title: string;
  text: string;
  subject: string;
  solution?: string;
  photo?: string;
  authorName: string;
  authorHandle: string;
}) {
  return postJson("/api/pulse-problem", input);
}
