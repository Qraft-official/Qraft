import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { bearerTokenFromRequest } from "@/lib/api-auth";

export function userSupabaseFromRequest(request: Request): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = bearerTokenFromRequest(request);
  if (!url || !anon || !token) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export function rpcErrorMessage(message: string | undefined) {
  const raw = message ?? "";
  if (/DAY_TAKEN|duplicate key|23505/i.test(raw)) return "その日の21時問題はすでに予約されています";
  if (/ALREADY_LIVE/i.test(raw)) return "公開済みの21時問題は変更できません";
  if (/FORBIDDEN/i.test(raw)) return "管理者のみアクセスできます";
  if (/NOT_FOUND/i.test(raw)) return "予約が見つかりません";
  if (/TITLE_REQUIRED/i.test(raw)) return "タイトルは必須です";
  if (/TEXT_REQUIRED/i.test(raw)) return "問題文は必須です";
  if (/ANSWER_REQUIRED/i.test(raw)) return "正解は必須です";
  if (/SPRINT_DAY_REQUIRED/i.test(raw)) return "公開日を指定してください";
  if (/BAD_SUBJECT/i.test(raw)) return "教科が不正です";
  if (/BAD_ANSWER_TYPE/i.test(raw)) return "解答タイプが不正です";
  return raw || "保存に失敗しました";
}
