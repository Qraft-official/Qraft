import type { SupabaseClient } from "@supabase/supabase-js";
import { roundCoord } from "@/lib/geo";
import { mapCategory } from "@/lib/map-categories";
import type { MapPost, MapPostType, MapPostWithAuthor } from "@/types/database";

const MAP_SELECT = "*, profiles!map_posts_author_profile_fkey(username)";

type RawMapPost = MapPost & { profiles?: { username: string } | null };

function normalize(row: RawMapPost): MapPostWithAuthor {
  const { profiles, ...rest } = row;
  return { ...rest, author_name: profiles?.username ?? "名無しユーザー" };
}

/** Live posts only: hidden and expired reports never reach the map. */
export async function fetchLivePosts(
  supabase: SupabaseClient,
  limit = 400,
): Promise<MapPostWithAuthor[]> {
  const { data, error } = await supabase
    .from("map_posts")
    .select(MAP_SELECT)
    .eq("is_hidden", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => normalize(row as RawMapPost));
}

export async function fetchMyPosts(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<MapPostWithAuthor[]> {
  const { data, error } = await supabase
    .from("map_posts")
    .select(MAP_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => normalize(row as RawMapPost));
}

export interface CreateMapPostInput {
  userId: string;
  latitude: number;
  longitude: number;
  postType: MapPostType;
  category: string;
  comment: string;
  urgency: boolean;
  area: string;
}

export class MapPostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapPostError";
  }
}

export async function createMapPost(
  supabase: SupabaseClient,
  input: CreateMapPostInput,
): Promise<MapPostWithAuthor> {
  const comment = input.comment.trim().slice(0, 100);
  const ttlHours = mapCategory(input.category).ttlHours;

  const { data, error } = await supabase
    .from("map_posts")
    .insert({
      user_id: input.userId,
      // Rounded on the client as well as in the database trigger.
      latitude: roundCoord(input.latitude),
      longitude: roundCoord(input.longitude),
      post_type: input.postType,
      category: input.category,
      comment: comment.length > 0 ? comment : null,
      urgency: input.urgency,
      area: input.area,
      expires_at: new Date(Date.now() + ttlHours * 3600_000).toISOString(),
    })
    .select(MAP_SELECT)
    .single();

  if (error) {
    if (error.message.includes("RATE_LIMIT_COOLDOWN")) {
      throw new MapPostError("投稿の間隔が短すぎます。30秒ほど待ってからもう一度お試しください");
    }
    if (error.message.includes("RATE_LIMIT_BURST")) {
      throw new MapPostError("短時間の投稿が多すぎます。10分ほど待ってからお試しください");
    }
    throw new MapPostError("投稿できませんでした。通信環境を確認してください");
  }

  return normalize(data as RawMapPost);
}

export async function fetchMyHelpfulIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("map_reactions")
    .select("map_post_id")
    .eq("user_id", userId)
    .eq("reaction_type", "helpful");
  return new Set((data ?? []).map((row: { map_post_id: string }) => row.map_post_id));
}

export async function toggleHelpful(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  next: boolean,
): Promise<void> {
  if (next) {
    const { error } = await supabase
      .from("map_reactions")
      .insert({ map_post_id: postId, user_id: userId, reaction_type: "helpful" });
    if (error && error.code !== "23505") throw error;
  } else {
    const { error } = await supabase
      .from("map_reactions")
      .delete()
      .eq("map_post_id", postId)
      .eq("user_id", userId)
      .eq("reaction_type", "helpful");
    if (error) throw error;
  }
}

export async function submitReport(
  supabase: SupabaseClient,
  input: { userId: string; targetType: "map_post" | "news"; targetId: string; reason: string },
): Promise<void> {
  const { error } = await supabase.from("reports").insert({
    user_id: input.userId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
  });
  if (error && error.code !== "23505") throw error;
}

/** How many distinct people reported the same thing nearby. */
export async function nearbyReportCount(
  supabase: SupabaseClient,
  post: Pick<MapPost, "latitude" | "longitude" | "category">,
): Promise<number> {
  const { data, error } = await supabase.rpc("map_nearby_report_count", {
    p_lat: post.latitude,
    p_lng: post.longitude,
    p_category: post.category,
    p_radius_m: 800,
  });
  if (error) return 1;
  return typeof data === "number" ? data : 1;
}
