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
import { isValidHandle, sanitizeHandleInput } from "./handle";
import { ME_ID, PREMIUM_PRICE_JPY, PREMIUM_TITLES, STORAGE_KEYS } from "./constants";
import { getDeviceId, takePendingReferralCode } from "./device-id";
import type { ReferralMe } from "./referral";
import { referralFetch } from "./referral-client";
import { isVerifiedCreator, isComplimentaryPremiumAccount, LOUNGE_POSTS } from "./premium";
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
  updateProblem as persistProblemUpdate,
  type NewProblem,
  type ProblemPatch,
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
import { sendPulseProblemMail } from "./dev-mail-client";
import {
  ensureWelcomeNotification,
  fetchNotifications,
  markNotificationRead as persistNotificationRead,
  type AppNotification,
} from "./notifications";

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
  addProblem: (input: NewProblem) => Promise<{
    error?: string;
    mailError?: string;
    pulseSubmitted?: boolean;
  }>;
  updateProblem: (id: string, patch: ProblemPatch) => Promise<{ error?: string }>;
  openFeedback: () => void;
  closeFeedback: () => void;
  feedbackOpen: boolean;
  addSolution: (input: {
    subject: Subject;
    text: string;
    pages?: { id: string; latex: string; doodle: number }[];
    problemId?: string;
    solutionFormat?: "handwriting" | "typed";
    photo?: string;
    solverAnswer?: string;
  }) => Promise<{ error?: string }>;
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
  referralMe: ReferralMe | null;
  refreshReferral: () => Promise<void>;
  applyReferralCode: (code: string, deviceId: string) => Promise<{ error?: string }>;
  recordCampaignTap: (type: "x_follow" | "x_post") => Promise<{ error?: string }>;
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
  notifications: AppNotification[];
  unreadNotificationCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
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
    pages: [{ id: "page-1", strokes: [], texts: [] }],
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
  const [referralMe, setReferralMe] = useState<ReferralMe | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState("この機能は Premium 限定です");
  const [bgmOn, setBgmOnState] = useState(false);
  const [accentColor, setAccentColorState] = useState("#A855F7");
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [sprint, setSprint] = useState<SprintRecord>(() =>
    freshSprint(getSprintDayId()),
  );
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
        setNotifications([]);
        setReferralMe(null);
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
          await ensureWelcomeNotification();
          const inbox = await fetchNotifications();
          if (cancelled) return;
          setNotifications(inbox);
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
          const deviceId = getDeviceId();
          await referralFetch("/api/referral/event", {
            method: "POST",
            body: JSON.stringify({ type: "login" }),
          });
          const meRes = await referralFetch("/api/referral");
          if (!cancelled && !meRes.error && meRes.data && "code" in meRes.data) {
            setReferralMe(meRes.data as unknown as ReferralMe);
          }
          const pending = takePendingReferralCode();
          const ownCode =
            meRes.data && "code" in meRes.data ? String((meRes.data as { code?: string }).code ?? "") : "";
          if (pending && deviceId && pending !== ownCode) {
            const applied = await referralFetch("/api/referral", {
              method: "POST",
              body: JSON.stringify({ code: pending, deviceId }),
            });
            if (!cancelled && !applied.error && applied.data && "code" in applied.data) {
              setReferralMe(applied.data as unknown as ReferralMe);
            }
          }
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
          void fetchProblems().then((remote) => {
            setRemotePosts(remote.posts);
            setRemoteUsers((prev) => ({ ...prev, ...remote.profiles }));
          });
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
  const complimentaryPremium = useMemo(() => {
    const base = supabaseUid
      ? (remoteUsers[supabaseUid] ?? fallbackUser(supabaseUid))
      : USER_MAP[ME_ID];
    return isComplimentaryPremiumAccount({
      id: supabaseUid ?? ME_ID,
      handle: typeof profile.handle === "string" ? profile.handle : base.handle,
      name: typeof profile.name === "string" ? profile.name : base.name,
      email: sessionEmail,
    });
  }, [supabaseUid, remoteUsers, profile.handle, profile.name, sessionEmail]);
  const trialPremium = Boolean(
    referralMe?.trialUntil && new Date(referralMe.trialUntil).getTime() > Date.now(),
  );
  const hasPremium = isDeveloper || subscribed || complimentaryPremium || trialPremium;

  const me: User = useMemo(() => {
    const base = supabaseUid
      ? (remoteUsers[supabaseUid] ?? fallbackUser(supabaseUid))
      : USER_MAP[ME_ID];
    const premium = hasPremium;
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
  }, [tiers, age, follows.length, profile, hasPremium, accentColor, supabaseUid, remoteUsers]);

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
        const handle = input.handle ? sanitizeHandleInput(input.handle) : "";
        if (handle && !isValidHandle(handle)) {
          return { error: "アカウントIDは半角英数字と - _ . のみ使えます" };
        }
        const { data, error } = await supabase.auth.signUp({
          email: input.email.trim(),
          password: input.password,
          options: {
            emailRedirectTo: emailRedirectTo(),
            data: {
              name: input.name?.trim() || "",
              handle,
            },
          },
        });
        if (error) return { error: formatAuthError(error.message) };
        if (!data.session) {
          return { needsConfirm: true };
        }
        if (data.user) {
          await ensureProfile(data.user);
          await ensureWelcomeNotification();
          const inbox = await fetchNotifications();
          setNotifications(inbox);
          setSupabaseUid(data.user.id);
          setSessionEmail(data.user.email ?? null);
          setAuthenticated(true);
          setOnboarded(false);
          setProfileHydrated(true);
          setProfile((p) => ({
            ...p,
            ...(input.name ? { name: input.name.trim() } : {}),
            ...(handle ? { handle } : {}),
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
          void (async () => {
            await ensureProfile(data.user);
            await ensureWelcomeNotification();
            const inbox = await fetchNotifications();
            setNotifications(inbox);
            const { data: row } = await fetchLearningProfile(data.user.id);
            if (row) {
              setOnboarded(!!row.onboarded);
              setTiers(tiersFromProfile(row));
              setAge(typeof row.age === "number" ? row.age : null);
            } else {
              setOnboarded(false);
            }
            setProfileHydrated(true);
            setIsAdmin(await checkIsAdmin());
          })();
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
    setNotifications([]);
  }, []);

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
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return { error: "投稿するにはログインしてください" };
    }
    const authorId = session.user.id || me.id;

    if (input.isSprint) {
      const mail = await sendPulseProblemMail({
        title: input.title ?? "",
        text: input.text,
        subject: input.subject,
        solution: input.solution,
        format: input.format,
        photo: input.photo || input.pages?.find((p) => p.image)?.image,
        authorId,
        authorName: me.name,
        authorHandle: me.handle,
      });
      if (mail.error) return { error: mail.error };
      return { pulseSubmitted: true };
    }

    const { post, error } = await insertProblem({
      ...input,
      isSprint: false,
      authorId,
    });
    if (error || !post) return { error: error || "投稿に失敗しました" };
    void referralFetch("/api/referral/event", {
      method: "POST",
      body: JSON.stringify({ type: "post" }),
    }).then((res) => {
      if (!res.error && res.data && "code" in res.data) {
        setReferralMe(res.data as unknown as ReferralMe);
      }
    });
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
  }, [me.id, me.name, me.handle]);

  const updateProblem = useCallback(async (id: string, patch: ProblemPatch) => {
    const { post, error } = await persistProblemUpdate(id, patch);
    if (error || !post) return { error: error || "更新に失敗しました" };
    setRemotePosts((p) => p.map((x) => (x.id === id ? post : x)));
    return {};
  }, []);

  const addSolution = useCallback(
    async (input: {
      subject: Subject;
      text: string;
      pages?: { id: string; latex: string; doodle: number; image?: string }[];
      problemId?: string;
      solutionFormat?: "handwriting" | "typed";
      photo?: string;
      solverAnswer?: string;
    }) => {
      if (!input.problemId) return { error: "引用する問題がありません" };
      const problem = getPost(input.problemId);
      const isChallenge = problem?.problemMode === "challenge";
      const solverAnswer = (input.solverAnswer ?? "").trim();
      if (isChallenge && !solverAnswer) {
        return { error: "答えを入力してください（単位は不要です）" };
      }
      let challengeGrade: Post["challengeGrade"];
      if (isChallenge) {
        const res = await referralFetch("/api/challenge/grade", {
          method: "POST",
          body: JSON.stringify({ problemId: input.problemId, answer: solverAnswer }),
        });
        if (res.error) return { error: res.error };
        if (res.data && res.data.graded === true) {
          challengeGrade = res.data.correct === true ? "correct" : "incorrect";
        }
      }
      const format = input.solutionFormat ?? (input.pages?.length ? "handwriting" : "typed");
      const post: Post = {
        id: `local-sol-${Date.now()}`,
        authorId: supabaseUid ?? ME_ID,
        kind: "solution",
        subject: input.subject,
        text: input.text,
        photo: input.photo,
        pages: input.pages,
        problemId: input.problemId,
        solutionFormat: format,
        solverAnswer: isChallenge ? solverAnswer : undefined,
        challengeGrade,
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
      void referralFetch("/api/referral/event", {
        method: "POST",
        body: JSON.stringify({ type: "solve" }),
      }).then((res) => {
        if (!res.error && res.data && "code" in res.data) {
          setReferralMe(res.data as unknown as ReferralMe);
        }
      });
      if (problem && (problem.kind === "sprint" || problem.isSprint)) {
        setSprint((s) => {
          if (!s.startedAt || s.submittedAt) return s;
          return { ...s, submittedAt: Date.now(), timedOut: false };
        });
      }
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
      return {};
    },
    [supabaseUid, getPost],
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
      if (next.mode === "solution" && !next.quotePostId) return;
      setComposer(next);
    },
    [],
  );

  const closeComposer = useCallback(() => setComposer(emptyComposer), []);

  const refreshReferral = useCallback(async () => {
    const res = await referralFetch("/api/referral");
    if (!res.error && res.data && "code" in res.data) {
      setReferralMe(res.data as unknown as ReferralMe);
    }
  }, []);

  const applyReferralCode = useCallback(async (code: string, deviceId: string) => {
    const res = await referralFetch("/api/referral", {
      method: "POST",
      body: JSON.stringify({ code, deviceId }),
    });
    if (!res.error && res.data && "code" in res.data) {
      setReferralMe(res.data as unknown as ReferralMe);
    }
    return { error: res.error };
  }, []);

  const recordCampaignTap = useCallback(async (type: "x_follow" | "x_post") => {
    const res = await referralFetch("/api/referral/campaign", {
      method: "POST",
      body: JSON.stringify({ type, deviceId: getDeviceId() }),
    });
    if (!res.error && res.data && "code" in res.data) {
      setReferralMe(res.data as unknown as ReferralMe);
    }
    return { error: res.error };
  }, []);

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
  const openFeedback = useCallback(() => setFeedbackOpen(true), []);
  const closeFeedback = useCallback(() => setFeedbackOpen(false), []);
  const openPaywall = useCallback((reason?: string) => {
    setPaywallReason(reason || `この機能は Qraft Premium（月額¥${PREMIUM_PRICE_JPY}）限定です`);
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
      if (isComplimentaryPremiumAccount(u)) return true;
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
      pages: s.pages.length ? s.pages : [{ id: "page-1", strokes: [], texts: [] }],
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

  const refreshNotifications = useCallback(async () => {
    const inbox = await fetchNotifications();
    setNotifications(inbox);
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    await persistNotificationRead(id);
  }, []);

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

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
    updateProblem,
    openFeedback,
    closeFeedback,
    feedbackOpen,
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
    referralMe,
    refreshReferral,
    applyReferralCode,
    recordCampaignTap,
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
    notifications,
    unreadNotificationCount,
    refreshNotifications,
    markNotificationRead,
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
