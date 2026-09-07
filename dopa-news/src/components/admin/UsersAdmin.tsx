"use client";

import { Search, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Avatar from "@/components/profile/Avatar";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { fetchProfiles } from "@/lib/admin-queries";
import { dateLabel } from "@/lib/format";
import { getSupabase } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export default function UsersAdmin() {
  const [items, setItems] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setFailed(false);
    try {
      setItems(await fetchProfiles(getSupabase(), term));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(search), search ? 320 : 0);
    return () => clearTimeout(timer);
  }, [search, load]);

  return (
    <div className="space-y-3">
      <label className="card flex items-center gap-2 px-3.5 py-2.5">
        <Search size={16} className="text-fg-faint" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ユーザー名で検索"
          className="w-full bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-faint"
        />
      </label>

      {loading ? (
        <RowSkeleton count={4} />
      ) : failed ? (
        <ErrorState message="ユーザーを読み込めませんでした" onRetry={() => void load(search)} />
      ) : items.length === 0 ? (
        <EmptyState title="該当するユーザーがいません" />
      ) : (
        <ul className="space-y-2">
          {items.map((profile) => (
            <li key={profile.id} className="card flex items-center gap-3 px-3.5 py-3">
              <Avatar url={profile.avatar_url} name={profile.username} size={40} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-fg">
                  {profile.username}
                  {profile.is_admin && <Shield size={12} className="shrink-0 text-[#a98bff]" />}
                </p>
                <p className="mt-0.5 truncate text-[10.5px] text-fg-faint">
                  {dateLabel(profile.created_at)}に登録
                  {profile.home_area ? ` ・ ${profile.home_area}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="px-1 text-[10.5px] leading-relaxed text-fg-faint">
        メールアドレスなどの認証情報はここでは扱いません。ユーザーの削除は本人の設定画面からのみ行えます。
      </p>
    </div>
  );
}
