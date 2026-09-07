export type SourceType = "official" | "major_media" | "multi_report" | "unconfirmed";
export type QuizOption = "A" | "B" | "C";
export type MapPostType = "weather" | "live";
export type NotificationType =
  | "breaking"
  | "local_emergency"
  | "vote_result"
  | "important"
  | "map_nearby";
export type ReportTargetType = "map_post" | "news" | "profile";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_admin: boolean;
  home_area: string | null;
  preferred_categories: string[];
  notify_breaking: boolean;
  notify_local_emergency: boolean;
  notify_vote_result: boolean;
  notify_important: boolean;
  notify_map_nearby: boolean;
  allow_location: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  what_happened: string;
  why_trending: string;
  three_second_summary: string;
  social_reaction_summary: string | null;
  category: string;
  image_url: string | null;
  source_name: string;
  source_url: string;
  source_type: SourceType;
  keywords: string[];
  heat: number;
  is_breaking: boolean;
  is_published: boolean;
  is_sample: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface NewsQuiz {
  id: string;
  news_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  result_option: QuizOption | null;
  result_note: string | null;
  resolved_at: string | null;
  votes_a: number;
  votes_b: number;
  votes_c: number;
  /** Development seed baselines; 0 for real articles. */
  sample_votes_a: number;
  sample_votes_b: number;
  sample_votes_c: number;
  created_at: string;
}

export interface NewsVote {
  id: string;
  quiz_id: string;
  user_id: string;
  selected_option: QuizOption;
  created_at: string;
}

export interface MapPost {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  post_type: MapPostType;
  category: string;
  comment: string | null;
  image_url: string | null;
  urgency: boolean;
  area: string | null;
  helpful_count: number;
  report_count: number;
  is_official: boolean;
  is_hidden: boolean;
  is_sample: boolean;
  created_at: string;
  expires_at: string;
}

export interface MapPostWithAuthor extends MapPost {
  author_name: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface ReportRow {
  id: string;
  user_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: "open" | "reviewed" | "dismissed";
  created_at: string;
}

/** A news article joined with its prediction quiz, as the feed consumes it. */
export interface NewsWithQuiz extends NewsArticle {
  quiz: NewsQuiz | null;
}
