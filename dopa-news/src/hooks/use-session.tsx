"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

interface SessionValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  savedIds: Set<string>;
  unreadCount: number;
  refreshProfile: () => Promise<void>;
  refreshSaved: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  setSavedLocally: (newsId: string, saved: boolean) => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured;
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(configured);
  const userId = session?.user.id ?? null;
  const lastLoadedUser = useRef<string | null>(null);

  useEffect(() => {
    // `loading` already starts false when Supabase is not configured.
    if (!configured) return;
    const supabase = getSupabase();
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session ?? null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      if (!next) {
        lastLoadedUser.current = null;
        setProfile(null);
        setSavedIds(new Set());
        setUnreadCount(0);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  const refreshProfile = useCallback(async () => {
    if (!configured || !userId) return;
    const { data } = await getSupabase()
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, [configured, userId]);

  const refreshSaved = useCallback(async () => {
    if (!configured || !userId) return;
    const { data } = await getSupabase().from("saved_news").select("news_id").eq("user_id", userId);
    setSavedIds(new Set((data ?? []).map((row: { news_id: string }) => row.news_id)));
  }, [configured, userId]);

  const refreshUnread = useCallback(async () => {
    if (!configured || !userId) return;
    const { count } = await getSupabase()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);
    setUnreadCount(count ?? 0);
  }, [configured, userId]);

  // Sign-out resets are handled by the auth listener above.
  useEffect(() => {
    if (!userId) return;
    if (lastLoadedUser.current === userId) return;
    lastLoadedUser.current = userId;
    void refreshProfile();
    void refreshSaved();
    void refreshUnread();
  }, [userId, refreshProfile, refreshSaved, refreshUnread]);

  const setSavedLocally = useCallback((newsId: string, saved: boolean) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(newsId);
      else next.delete(newsId);
      return next;
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!configured) return;
    await getSupabase().auth.signOut();
    setSession(null);
    setProfile(null);
    setSavedIds(new Set());
    setUnreadCount(0);
  }, [configured]);

  const value = useMemo<SessionValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      configured,
      savedIds,
      unreadCount,
      refreshProfile,
      refreshSaved,
      refreshUnread,
      setSavedLocally,
      signOut,
    }),
    [
      session,
      profile,
      loading,
      configured,
      savedIds,
      unreadCount,
      refreshProfile,
      refreshSaved,
      refreshUnread,
      setSavedLocally,
      signOut,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
