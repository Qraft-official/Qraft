import { adminSupabase } from "@/lib/admin-supabase";
import { userFromRequest } from "@/lib/api-auth";
import { displayNameError } from "@/lib/display-name";
import { handleValidationError, sanitizeHandleInput } from "@/lib/handle";
import { decideEarlyAccessJoin } from "@/lib/release-gate";
import { countEarlyAccessMembers, getAccessSnapshot, loadReleaseSchedule } from "@/lib/release-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function joinErrorMessage(reason: string) {
  if (reason === "prelaunch") return "Qraftは9月12日から30名限定で先行公開します";
  if (reason === "full") return "先行公開の30名枠は満員になりました。正式公開は9月19日です。";
  if (reason === "invalid") return "招待コードが正しくありません";
  if (reason === "not_open") return "この期間は招待コードでの参加はできません";
  return "参加できませんでした";
}

export async function POST(request: Request) {
  const access = await getAccessSnapshot(request);
  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    email?: string;
    password?: string;
    name?: string;
    handle?: string;
  };
  const code = (body.code ?? "").trim();

  if (access.phase === "public") {
    return NextResponse.json({
      ok: true,
      public: true,
      useNormalSignup: true,
      message: "Qraftは正式公開されました。通常の登録からご利用ください。",
    });
  }

  if (access.phase === "prelaunch") {
    return NextResponse.json({ error: joinErrorMessage("prelaunch") }, { status: 403 });
  }

  const existing = await userFromRequest(request);
  const admin = adminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "参加処理を利用できません" }, { status: 500 });
  }

  if (existing) {
    if (access.isAdmin || access.isMember) {
      return NextResponse.json({ ok: true, reason: "already" });
    }
    const { data, error } = await admin.rpc("try_enroll_early_access", {
      p_user_id: existing.id,
      p_code: code,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const row = data as { ok?: boolean; reason?: string } | null;
    if (!row?.ok) {
      const reason = row?.reason || "invalid";
      return NextResponse.json({ error: joinErrorMessage(reason) }, { status: reason === "full" ? 409 : 400 });
    }
    return NextResponse.json({ ok: true, reason: row.reason });
  }

  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim();
  const handle = sanitizeHandleInput(body.handle ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "パスワードは6文字以上にしてください" }, { status: 400 });
  }
  const nameErr = displayNameError(name);
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
  const handleErr = handleValidationError(handle);
  if (handleErr) return NextResponse.json({ error: handleErr }, { status: 400 });

  const schedule = await loadReleaseSchedule();
  const memberCount = await countEarlyAccessMembers();
  const { data: codeRow } = await admin
    .from("early_access_invite_codes")
    .select("code")
    .eq("code", code.toUpperCase())
    .eq("disabled", false)
    .maybeSingle();
  const preview = decideEarlyAccessJoin({
    phase: "early",
    memberCount,
    cap: schedule.earlyAccessCap,
    alreadyMember: false,
    validCode: Boolean(codeRow?.code),
  });
  if (!preview.ok) {
    return NextResponse.json(
      { error: joinErrorMessage(preview.reason) },
      { status: preview.reason === "full" ? 409 : 400 },
    );
  }

  const { data: taken } = await admin.from("profiles").select("id").ilike("handle", handle).maybeSingle();
  if (taken) {
    return NextResponse.json({ error: "そのアカウントIDは既に登録されています。" }, { status: 400 });
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, handle },
  });
  if (created.error || !created.data.user) {
    return NextResponse.json(
      { error: created.error?.message || "アカウントを作成できませんでした" },
      { status: 400 },
    );
  }
  const userId = created.data.user.id;
  await admin.from("profiles").upsert({ id: userId, name, handle });
  const enrolled = await admin.rpc("try_enroll_early_access", {
    p_user_id: userId,
    p_code: code,
  });
  const row = enrolled.data as { ok?: boolean; reason?: string } | null;
  if (enrolled.error || !row?.ok) {
    await admin.auth.admin.deleteUser(userId);
    const reason = row?.reason || "invalid";
    return NextResponse.json(
      { error: joinErrorMessage(reason) },
      { status: reason === "full" ? 409 : 400 },
    );
  }
  if (row.reason === "developer") {
    return NextResponse.json({ ok: true, reason: "developer", created: true });
  }
  return NextResponse.json({ ok: true, reason: row.reason, created: true });
}
