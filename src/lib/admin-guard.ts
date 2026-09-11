import { bearerTokenFromRequest, userFromRequest } from "@/lib/api-auth";
import { createClient, type User } from "@supabase/supabase-js";

export async function requireAdminUser(request: Request): Promise<
  { user: User; token: string } | { error: string; status: number }
> {
  const user = await userFromRequest(request);
  const token = bearerTokenFromRequest(request);
  if (!user || !token) {
    return { error: "ログインしてください", status: 401 };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { error: "サーバー設定が不足しています", status: 500 };
  }

  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await sb.rpc("is_admin");
  if (error) {
    return { error: "権限の確認に失敗しました", status: 500 };
  }
  if (data !== true) {
    return { error: "管理者のみアクセスできます", status: 403 };
  }
  return { user, token };
}
