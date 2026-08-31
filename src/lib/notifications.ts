import { createClient } from "@supabase/supabase-js";
import {
  FEEDBACK_THANKS_MESSAGE,
  FEEDBACK_THANKS_TITLE,
  PREMIUM_THANKS_MESSAGE,
  PREMIUM_THANKS_TITLE,
  WELCOME_NOTIFICATION_MESSAGE,
  WELCOME_NOTIFICATION_TITLE,
} from "./constants";
import { supabase } from "./supabase";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function ensureWelcomeNotification() {
  const { error: rpcError } = await supabase.rpc("ensure_welcome_notification");
  if (!rpcError) return;
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user.id;
  if (!uid) return;
  const { error } = await supabase.from("notifications").insert({
    user_id: uid,
    title: WELCOME_NOTIFICATION_TITLE,
    message: WELCOME_NOTIFICATION_MESSAGE,
  });
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.warn("ensureWelcomeNotification failed:", error.message);
  }
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,message,is_read,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("fetchNotifications failed:", error.message);
    return [];
  }
  return (data as NotificationRow[] | null)?.map(mapRow) ?? [];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  if (error) console.warn("markNotificationRead failed:", error.message);
  return { error: error?.message };
}

export async function insertOwnNotification(title: string, message: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user.id;
  if (!uid) return { error: "ログインしてください" };
  const { error } = await supabase.from("notifications").insert({
    user_id: uid,
    title,
    message,
  });
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.warn("insertOwnNotification failed:", error.message);
    return { error: error.message };
  }
  return {};
}

export async function insertNotificationWithToken(
  accessToken: string,
  title: string,
  message: string,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { error: "Supabase が未設定です" };
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error: userError } = await client.auth.getUser(accessToken);
  if (userError || !data.user) return { error: "ログインしてください" };
  const { error } = await client.from("notifications").insert({
    user_id: data.user.id,
    title,
    message,
  });
  if (error && !/duplicate|unique/i.test(error.message)) {
    return { error: error.message };
  }
  return {};
}

export async function notifyFeedbackThanks() {
  return insertOwnNotification(FEEDBACK_THANKS_TITLE, FEEDBACK_THANKS_MESSAGE);
}

export async function ensurePremiumThanksNotification() {
  return insertOwnNotification(PREMIUM_THANKS_TITLE, PREMIUM_THANKS_MESSAGE);
}
