"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  checkIsAdmin,
  displayNameFromUser,
  emailRedirectTo,
  ensureProfile,
  formatAuthError,
  handleFromUser,
  fetchLearningProfile,
  saveLearningProfile,
  sessionUserFields,
  tiersFromProfile,
} from "./auth";
import { ME_ID, PREMIUM_TITLES, STORAGE_KEYS } from "./constants";
import { isVerifiedCreator, LOUNGE_POSTS } from "./premium";
import {
  communityForDay,
  INITIAL_FOLLOWERS,
  INITIAL_FOLLOWS,
  MOCK_REPLIES,
  POSTS,
  USER_MAP,
  USERS,
} from "./mock-data";
import {
  fallbackUser,
  fetchProblems,
  insertProblem,
  type NewProblem,
} from "./problems";
import { getSprintDayId, makeOfficialPost, remainingMs } from "./sprint";
import { supabase } from "./supabase";
import type {
  ActivityItem,
  CanvasPage,
  Composer,
  Post,
  ProfilePatch,
  RatingKind,
  SprintRecord,
  Subject,
  Tiers,
  User,
} from "./types";

type Ratings = Record<string, Partial<Record<RatingKind, number>>>;

type Store = {
  ready: boolean;
  onboarded: boolean;
  authenticated: boolean;
  signUpWithEmail: (input: {
    email: string;
    password: string;
    name?: string;
    handle?: string;
  }) => Promise<{ error?: string; needsConfirm?: boolean }>;
  signInWithEmail: (input: {
    email: string;
    password: string;
  }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  authViaSupabase: boolean;
  me: User;
  users: User[];
  posts: Post[];
  loungePosts: Post[];
  follows: string[];
  followers: string[];
  likes: string[];
  reposts: string[];
  ratings: Ratings;
  sprint: SprintRecord;
  sprintUnlocked: boolean;
  composer: Composer;
  activities: ActivityItem[];
  completeOnboarding: (input: { age: number; tiers: Tiers }) => Promise<{ error?: string }>;
  toggleFollow: (userId: string) => void;
  toggleLike: (postId: string) => void;
  toggleRepost: (postId: string) => void;
  rate: (postId: string, kind: RatingKind, stars: number) => void;
  addProblem: (input: NewProblem) => Promise<{ error?: string }>;
  addSolution: (input: {
    subject: Subject;
    text: string;
    pages?: { id: string; latex: string; doodle: number }[];
    problemId?: string;
    solutionFormat?: "handwriting" | "typed";
    photo?: string;
  }) => void;
  addReply: (input: { replyToId: string; text: string }) => void;
  startSprint: () => void;
  submitSprint: (pages: CanvasPage[]) => void;
  timeoutSprint: () => void;
  updateSprintPages: (pages: CanvasPage[]) => void;
  officialPost: Post;
  community: Post[];
  updateProfile: (patch: ProfilePatch) => void;
  updateLearningSettings: (input: { age: number; tiers: Tiers }) => Promise<{ error?: string }>;
  profileHydrated: boolean;
  openComposer: (next: Exclude<Composer, { open: false }>) => void;
  closeComposer: () => void;
  userOf: (id: string) => User;
  getPost: (id: string) => Post | undefined;
  repliesTo: (postId: string) => Post[];
  isDeveloper: boolean;
  hasPremium: boolean;
  subscribed: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
  premiumOpen: boolean;
  openPremium: () => void;
  closePremium: () => void;
  paywallOpen: boolean;
  paywallReason: string;
  openPaywall: (reason?: string) => void;
  closePaywall: () => void;
  bgmOn: boolean;
  setBgmOn: (v: boolean) => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
  react: (postId: string, emoji: string) => void;
  reactions: Record<string, string>;
  authorVerified: (userId: string) => boolean;
};

const Ctx = createContext<Store | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function freshSprint(dayId: string): SprintRecord {
  return {
    dayId,
    startedAt: null,
    submittedAt: null,
    timedOut: false,
    pages: [{ id: "page-1", strokes: [] }],
  };
}

const emptyComposer: Composer = { open: false };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [profileHydrated, setProfileHydrated] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [tiers, setTiers] = useState<Tiers>(USER_MAP[ME_ID].tiers);
  const [age, setAge] = useState<number | null>(null);
  const [follows, setFollows] = useState<string[]>(INITIAL_FOLLOWS);
  const [likes, setLikes] = useState<string[]>([]);
  const [reposts, setReposts] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Ratings>({});
  const [extra, setExtra] = useState<Post[]>([]);
  const [remotePosts, setRemotePosts] = useState<Post[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<Record<string, User>>({});
  const [supabaseUid, setSupabaseUid] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<ProfilePatch>({});
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [composer, setComposer] = useState<Composer>(emptyComposer);
  const [subscribed, setSubscribed] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState("この機能は Premium 限定です");
  const [bgmOn, setBgmOnState] = useState(false);
  const [accentColor, setAccentColorState] = useState("#A855F7");
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [sprint, setSprint] = useState<SprintRecord>(() =>
    freshSprint(getSprintDayId()),
  );

  useEffect(() => {
    let cancelled = false;
    const dayId = getSprintDayId();
    setTiers(load(STORAGE_KEYS.tiers, USER_MAP[ME_ID].tiers));
    setFollows(load(STORAGE_KEYS.follows, INITIAL_FOLLOWS));
    setLikes(load(STORAGE_KEYS.likes, [] as string[]));
    setReposts(load(STORAGE_KEYS.reposts, [] as string[]));
    setRatings(load(STORAGE_KEYS.ratings, {} as Ratings));
    setExtra(load(STORAGE_KEYS.extraPosts, [] as Post[]));
    setProfile(load(STORAGE_KEYS.profile, {} as ProfilePatch));
    setActivities(load(STORAGE_KEYS.activities, [] as ActivityItem[]));
    setSubscribed(load(STORAGE_KEYS.premium, false));
    setBgmOnState(load(STORAGE_KEYS.bgm, false));
    setAccentColorState(load(STORAGE_KEYS.accent, "#A855F7"));
    setReactions(load(STORAGE_KEYS.reactions, {} as Record<string, string>));
    const saved = load<SprintRecord | null>(STORAGE_KEYS.sprint, null);
    if (saved && saved.dayId === dayId) {
      const timedOut =
        !!saved.startedAt &&
        !saved.submittedAt &&
        remainingMs(saved.startedAt) <= 0;
      setSprint({ ...saved, timedOut: saved.timedOut || timedOut });
    } else {
      setSprint(freshSprint(dayId));
    }

    const applySession = (
      uid: string | null,
      meta?: { name?: string; handle?: string; email?: string | null },
    ) => {
      setSupabaseUid(uid);
      setSessionEmail(meta?.email ?? null);
      if (uid) {
        setAuthenticated(true);
        setProfile((p) => ({
          ...p,
          ...(meta?.name && !p.name ? { name: meta.name } : {}),
          ...(meta?.handle && !p.handle ? { handle: meta.handle } : {}),
        }));
      } else {
        setAuthenticated(false);
        setIsAdmin(false);
        setOnboarded(false);
        setProfileHydrated(true);
      }
    };

    const hydrateLearning = (user: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, unknown> | null;
    }) => {
      window.setTimeout(() => {
        void (async () => {
          await ensureProfile(user);
          const { data } = await fetchLearningProfile(user.id);
          if (cancelled) return;
          if (data) {
            setOnboarded(!!data.onboarded);
            setTiers(tiersFromProfile(data));
            setAge(typeof data.age === "number" ? data.age : null);
            setProfile((p) => ({
              ...p,
              ...(data.name ? { name: data.name } : {}),
              ...(data.handle ? { handle: data.handle } : {}),
            }));
          } else {
            setOnboarded(false);
          }
          setProfileHydrated(true);
          const admin = await checkIsAdmin();
          if (!cancelled) setIsAdmin(admin);
        })();
      }, 0);
    };

    const afterSignIn = (user: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, unknown> | null;
    }) => {
      setProfileHydrated(false);
      hydrateLearning(user);
    };

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        const user = data.session?.user;
        if (user) {
          applySession(user.id, sessionUserFields(user));
          afterSignIn(user);
        } else {
          setAuthenticated(false);
          setProfileHydrated(true);
        }
        const remote = await fetchProblems();
        if (cancelled) return;
        setRemotePosts(remote.posts);
        setRemoteUsers(remote.profiles);
        if (remote.error) console.warn("Failed to load problems:", remote.error);
      } catch (err) {
        console.warn("Auth bootstrap failed:", err);
        if (!cancelled) setAuthenticated(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      try {
        const user = session?.user;
        if (user) {
          applySession(user.id, sessionUserFields(user));
          afterSignIn(user);
        } else {
          applySession(null);
        }
      } catch (err) {
        console.warn("onAuthStateChange failed:", err);
      }
    });

    const channel = supabase
      .channel("aha-problems")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "problems" },
        () => {
          void fetchProblems().then((remote) => {
            setRemotePosts(remote.posts);
            setRemoteUsers((prev) => ({ ...prev, ...remote.profiles }));
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEYS.onboarded, JSON.stringify(onboarded));
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(authenticated));
    localStorage.setItem(STORAGE_KEYS.tiers, JSON.stringify(tiers));
    localStorage.setItem(STORAGE_KEYS.follows, JSON.stringify(follows));
    localStorage.setItem(STORAGE_KEYS.likes, JSON.stringify(likes));
    localStorage.setItem(STORAGE_KEYS.reposts, JSON.stringify(reposts));
    localStorage.setItem(STORAGE_KEYS.ratings, JSON.stringify(ratings));
    localStorage.setItem(STORAGE_KEYS.extraPosts, JSON.stringify(extra));
    localStorage.setItem(STORAGE_KEYS.sprint, JSON.stringify(sprint));
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.premium, JSON.stringify(subscribed));
    localStorage.setItem(STORAGE_KEYS.bgm, JSON.stringify(bgmOn));
    localStorage.setItem(STORAGE_KEYS.accent, JSON.stringify(accentColor));
    localStorage.setItem(STORAGE_KEYS.reactions, JSON.stringify(reactions));
  }, [
    ready,
    onboarded,
    tiers,
    follows,
    likes,
    reposts,
    ratings,
    extra,
    sprint,
    profile,
    activities,
    subscribed,
    bgmOn,
    accentColor,
    reactions,
    authenticated,
  ]);

  const isDeveloper = useMemo(() => {
    if (isAdmin) return true;
    const emails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (sessionEmail && emails.includes(sessionEmail.toLowerCase())) return true;
    return false;
  }, [isAdmin, sessionEmail]);
  const hasPremium = isDeveloper || subscribed;

  const me: User = useMemo(() => {
    const base = supabaseUid
      ? (remoteUsers[supabaseUid] ?? fallbackUser(supabaseUid))
      : USER_MAP[ME_ID];
    const premium = isDeveloper || subscribed;
    const titles = Array.from(
      new Set([
        ...(Array.isArray(profile.titles) ? profile.titles : base.titles),
        ...(premium ? PREMIUM_TITLES : []),
      ]),
    );
    const activeTitles = Array.isArray(profile.activeTitles)
      ? profile.activeTitles
      : Array.isArray(base.activeTitles)
        ? base.activeTitles
        : [];
    return {
      ...base,
      ...profile,
      id: supabaseUid ?? ME_ID,
      accent: accentColor || base.accent,
      tiers,
      age: profile.age ?? age ?? base.age ?? null,
      followingCount: follows.length,
      followerCount: INITIAL_FOLLOWERS.length,
      titles,
      activeTitles,
      verified: premium || isVerifiedCreator(base.id) || !!base.verified,
    };
  }, [tiers, age, follows.length, profile, subscribed, accentColor, supabaseUid, remoteUsers, isDeveloper]);

  const userOf = useCallback(
    (id: string) => {
      if (id === me.id) return me;
      if (USER_MAP[id]) return USER_MAP[id];
      if (remoteUsers[id]) return remoteUsers[id];
      return fallbackUser(id);
    },
    [me, remoteUsers],
  );

  const mockOfficial = useMemo(() => makeOfficialPost(sprint.dayId), [sprint.dayId]);
  const community = useMemo(() => communityForDay(sprint.dayId), [sprint.dayId]);
  const sprintFromDb = useMemo(
    () => remotePosts.filter((p) => p.isSprint || p.kind === "sprint"),
    [remotePosts],
  );
  const officialPost = sprintFromDb[0] ?? mockOfficial;

  const catalog = useMemo(() => {
    return [
      ...remotePosts,
      ...extra,
      mockOfficial,
      ...POSTS,
      ...MOCK_REPLIES,
      ...community,
      ...LOUNGE_POSTS,
    ];
  }, [extra, mockOfficial, community, remotePosts]);

  const posts = useMemo(() => {
    const extras = extra;
    const seen = new Set<string>();
    const main = [...remotePosts, ...extra, mockOfficial, ...POSTS, ...MOCK_REPLIES]
      .filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return main.map((p) => ({
      ...p,
      replyCount:
        p.kind === "reply"
          ? p.replyCount
          : extras.filter((e) => e.kind === "reply" && e.replyToId === p.id).length +
            MOCK_REPLIES.filter((e) => e.replyToId === p.id).length,
    }));
  }, [extra, mockOfficial, remotePosts]);

  const getPost = useCallback(
    (id: string) =>
      posts.find((p) => p.id === id) || catalog.find((p) => p.id === id),
    [posts, catalog],
  );

  const repliesTo = useCallback(
    (postId: string) =>
      catalog
        .filter(
          (p) =>
            p.replyToId === postId || (p.kind === "solution" && p.problemId === postId),
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [catalog],
  );

  const completeOnboarding = useCallback(
    async (input: { age: number; tiers: Tiers }) => {
      setAge(input.age);
      setTiers(input.tiers);
      if (supabaseUid) {
        const { error } = await saveLearningProfile(supabaseUid, { ...input, onboarded: true });
        if (error) return { error };
      }
      setOnboarded(true);
      return {};
    },
    [supabaseUid],
  );

  const updateLearningSettings = useCallback(
    async (input: { age: number; tiers: Tiers }) => {
      setAge(input.age);
      setTiers(input.tiers);
      setOnboarded(true);
      if (!supabaseUid) return {};
      const { error } = await saveLearningProfile(supabaseUid, { ...input, onboarded: true });
      return error ? { error } : {};
    },
    [supabaseUid],
  );

  const signUpWithEmail = useCallback(
    async (input: {
      email: string;
      password: string;
      name?: string;
      handle?: string;
    }) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: input.email.trim(),
          password: input.password,
          options: {
            emailRedirectTo: emailRedirectTo(),
            data: {
              name: input.name?.trim() || "",
              handle: input.handle?.trim().replace(/^@/, "") || "",
            },
          },
        });
        if (error) return { error: formatAuthError(error.message) };
        if (!data.session) {
          return { needsConfirm: true };
        }
        if (data.user) {
          await ensureProfile(data.user);
          setSupabaseUid(data.user.id);
          setSessionEmail(data.user.email ?? null);
          setAuthenticated(true);
          setOnboarded(false);
          setProfileHydrated(true);
          setProfile((p) => ({
            ...p,
            ...(input.name ? { name: input.name.trim() } : {}),
            ...(input.handle ? { handle: input.handle.trim().replace(/^@/, "") } : {}),
          }));
        }
        return {};
      } catch (err) {
        return { error: formatAuthError(err instanceof Error ? err.message : "登録に失敗しました") };
      }
    },
    [],
  );

  const signInWithEmail = useCallback(async (input: { email: string; password: string }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email.trim(),
        password: input.password,
      });
      if (error) return { error: formatAuthError(error.message) };
      if (data.user) {
        const fields = sessionUserFields(data.user);
        setSupabaseUid(data.user.id);
        setSessionEmail(fields.email);
        setAuthenticated(true);
        setProfile((p) => ({
          ...p,
          ...(fields.name ? { name: fields.name } : {}),
          ...(fields.handle ? { handle: fields.handle } : {}),
        }));
        window.setTimeout(() => {
          setProfileHydrated(false);
          void ensureProfile(data.user);
          void fetchLearningProfile(data.user.id).then(({ data: row }) => {
            if (row) {
              setOnboarded(!!row.onboarded);
              setTiers(tiersFromProfile(row));
              setAge(typeof row.age === "number" ? row.age : null);
            } else {
              setOnboarded(false);
            }
            setProfileHydrated(true);
          });
          void checkIsAdmin().then(setIsAdmin);
        }, 0);
      }
      return {};
    } catch (err) {
      return { error: formatAuthError(err instanceof Error ? err.message : "ログインに失敗しました") };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("signOut failed:", err);
    }
    setSupabaseUid(null);
    setSessionEmail(null);
    setIsAdmin(false);
    setAuthenticated(false);
    setOnboarded(false);
    setAge(null);
    setProfileHydrated(true);

  const toggleFollow = useCallback((userId: string) => {
    if (userId === me.id) return;
    setFollows((prev) => {
      const next = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      if (!prev.includes(userId)) {
        const u = USER_MAP[userId];
        setActivities((a) => [
          {
            id: `act-${Date.now()}`,
            type: "follow",
            userId: me.id,
            text: `${u?.name ?? "ユーザー"} をフォローした`,
            createdAt: new Date().toISOString(),
          },
          ...a,
        ]);
      }
      return next;
    });
  }, [me.id]);

  const toggleLike = useCallback((postId: string) => {
    setLikes((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId],
    );
  }, []);

  const toggleRepost = useCallback((postId: string) => {
    setReposts((prev) => {
      const on = prev.includes(postId);
      if (on) {
        setActivities((a) => a.filter((x) => !(x.type === "repost" && x.postId === postId)));
        return prev.filter((id) => id !== postId);
      }
      setActivities((a) => [
        {
          id: `act-${Date.now()}`,
          type: "repost",
          userId: ME_ID,
          postId,
          text: "がリポストした",
          createdAt: new Date().toISOString(),
        },
        ...a,
      ]);
      return [...prev, postId];
    });
  }, []);

  const rate = useCallback((postId: string, kind: RatingKind, stars: number) => {
    setRatings((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], [kind]: stars },
    }));
  }, []);

  const addProblem = useCallback(async (input: NewProblem) => {
    if (!isDeveloper) {
      return { error: "問題の投稿は管理者のみできます" };
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return { error: "投稿するにはログインしてください" };
    }
    const { post, error } = await insertProblem(input);
    if (error || !post) return { error: error || "投稿に失敗しました" };
    setRemotePosts((p) => [post, ...p.filter((x) => x.id !== post.id)]);
    setRemoteUsers((u) => ({
      ...u,
      [session.user.id]: fallbackUser(session.user.id, {
        id: session.user.id,
        name: displayNameFromUser(session.user),
        handle: handleFromUser(session.user) ?? null,
      }),
    }));
    return {};
  }, [isDeveloper]);

  const addSolution = useCallback(
    (input: {
      subject: Subject;
      text: string;
      pages?: { id: string; latex: string; doodle: number }[];
      problemId?: string;
      solutionFormat?: "handwriting" | "typed";
      photo?: string;
    }) => {
      const format = input.solutionFormat ?? (input.pages?.length ? "handwriting" : "typed");
      const post: Post = {
        id: `local-sol-${Date.now()}`,
        authorId: supabaseUid ?? ME_ID,
        kind: "solution",
        subject: input.subject,
        text: input.text,
        photo: input.photo,
        pages: format === "typed" ? undefined : input.pages,
        problemId: input.problemId,
        solutionFormat: format,
        createdAt: new Date().toISOString(),
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        ahaSum: 0,
        ahaCount: 0,
        eleganceSum: 0,
        eleganceCount: 0,
      };
      setExtra((p) => [post, ...p]);
      if (input.problemId) {
        setActivities((a) => [
          {
            id: `act-${Date.now()}`,
            type: "solution",
            userId: supabaseUid ?? ME_ID,
            postId: post.id,
            text: "が引用解法を投稿した",
            createdAt: new Date().toISOString(),
          },
          ...a,
        ]);
      }
    },
    [supabaseUid],
  );

  const addReply = useCallback((input: { replyToId: string; text: string }) => {
    const parent =
      extra.find((p) => p.id === input.replyToId) ||
      POSTS.find((p) => p.id === input.replyToId) ||
      (input.replyToId.startsWith("sprint-") ? makeOfficialPost(getSprintDayId()) : undefined);
    const post: Post = {
      id: `reply-${Date.now()}`,
      authorId: supabaseUid ?? ME_ID,
      kind: "reply",
      subject: parent?.subject ?? "math",
      text: input.text,
      replyToId: input.replyToId,
      createdAt: new Date().toISOString(),
      replyCount: 0,
      repostCount: 0,
      likeCount: 0,
      ahaSum: 0,
      ahaCount: 0,
      eleganceSum: 0,
      eleganceCount: 0,
    };
    setExtra((p) => [post, ...p]);
    setActivities((a) => [
      {
        id: `act-${Date.now()}`,
        type: "reply",
        userId: supabaseUid ?? ME_ID,
        postId: input.replyToId,
        text: "がリプライした",
        createdAt: new Date().toISOString(),
      },
      ...a,
    ]);
  }, [extra, supabaseUid]);

  const updateProfile = useCallback((patch: ProfilePatch) => {
    setProfile((p) => ({ ...p, ...patch }));
  }, []);

  const openComposer = useCallback(
    (next: Exclude<Composer, { open: false }>) => {
      if (next.mode === "problem" && !isDeveloper) {
        setComposer({ open: true, mode: "menu" });
        return;
      }
      setComposer(next);
    },
    [isDeveloper],
  );

  const closeComposer = useCallback(() => setComposer(emptyComposer), []);

  const subscribe = useCallback(() => {
    setSubscribed(true);
    setPaywallOpen(false);
    setPremiumOpen(false);
  }, []);

  const unsubscribe = useCallback(() => {
    if (isDeveloper) return;
    setSubscribed(false);
  }, [isDeveloper]);

  const openPremium = useCallback(() => setPremiumOpen(true), []);
  const closePremium = useCallback(() => setPremiumOpen(false), []);
  const openPaywall = useCallback((reason?: string) => {
    setPaywallReason(reason || "この機能は Qraft Premium（月額¥300）限定です");
    setPaywallOpen(true);
  }, []);
  const closePaywall = useCallback(() => setPaywallOpen(false), []);
  const setBgmOn = useCallback((v: boolean) => setBgmOnState(v), []);
  const setAccentColor = useCallback((c: string) => setAccentColorState(c), []);
  const react = useCallback((postId: string, emoji: string) => {
    setReactions((prev) => ({ ...prev, [postId]: prev[postId] === emoji ? "" : emoji }));
  }, []);
  const authorVerified = useCallback(
    (userId: string) => {
      const u = userId === me.id ? me : USER_MAP[userId] ?? remoteUsers[userId];
      if (!u) return false;
      if (userId === me.id && isDeveloper) return true;
      if (isVerifiedCreator(u.id)) return true;
      if (userId === me.id && hasPremium) return true;
      return !!u.verified;
    },
    [me, hasPremium, remoteUsers, isDeveloper],
  );

  const startSprint = useCallback(() => {
    setSprint((s) => ({
      ...s,
      startedAt: Date.now(),
      submittedAt: null,
      timedOut: false,
      pages: s.pages.length ? s.pages : [{ id: "page-1", strokes: [] }],
    }));
  }, []);

  const submitSprint = useCallback((pages: CanvasPage[]) => {
    setSprint((s) => ({
      ...s,
      pages,
      submittedAt: Date.now(),
      timedOut: false,
    }));
  }, []);

  const timeoutSprint = useCallback(() => {
    setSprint((s) => ({ ...s, timedOut: true }));
  }, []);

  const updateSprintPages = useCallback((pages: CanvasPage[]) => {
    setSprint((s) => ({ ...s, pages }));
  }, []);

  const sprintUnlocked = !!(sprint.submittedAt || sprint.timedOut);

  const value: Store = {
    ready,
    onboarded,
    profileHydrated,
    authenticated,
    signUpWithEmail,
    signInWithEmail,
    logout,
    authViaSupabase: !!supabaseUid,
    me,
    users: [
      me,
      ...USERS.filter((u) => u.id !== ME_ID).map((u) => ({
        ...u,
        verified: !!u.verified || isVerifiedCreator(u.id),
      })),
    ],
    posts,
    loungePosts: LOUNGE_POSTS,
    follows,
    followers: INITIAL_FOLLOWERS,
    likes,
    reposts,
    ratings,
    sprint,
    sprintUnlocked,
    composer,
    activities,
    completeOnboarding,
    updateLearningSettings,
    toggleFollow,
    toggleLike,
    toggleRepost,
    rate,
    addProblem,
    addSolution,
    addReply,
    startSprint,
    submitSprint,
    timeoutSprint,
    updateSprintPages,
    officialPost,
    community,
    updateProfile,
    openComposer,
    closeComposer,
    userOf,
    getPost,
    repliesTo,
    isDeveloper,
    hasPremium,
    subscribed,
    subscribe,
    unsubscribe,
    premiumOpen,
    openPremium,
    closePremium,
    paywallOpen,
    paywallReason,
    openPaywall,
    closePaywall,
    bgmOn,
    setBgmOn,
    accentColor,
    setAccentColor,
    react,
    reactions,
    authorVerified,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function avgStars(sum: number, count: number) {
  if (!count) return 0;
  return Math.round((sum / count) * 10) / 10;
}

export function userById(id: string): User {
  return USER_MAP[id] ?? USER_MAP[ME_ID];
}

export function isImageSrc(value: string) {
  return value.startsWith("data:") || value.startsWith("http");
}
