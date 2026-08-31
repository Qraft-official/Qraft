import { clip, userFromRequest } from "@/lib/api-auth";
import {
  attachmentFromPhoto,
  DEVELOPER_EMAIL,
  escapeHtml,
  preHtml,
  sendDeveloperMail,
} from "@/lib/mail";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const title = clip(body.title, 200);
  const textBody = clip(body.text, 20000);
  const subject = clip(body.subject, 40) || "math";
  const solution = clip(body.solution, 8000);
  const problemId = clip(body.problemId, 80);
  const authorName = clip(body.authorName, 80);
  const authorHandle = clip(body.authorHandle, 40);
  const photo = typeof body.photo === "string" ? body.photo : "";

  if (!textBody.trim()) {
    return NextResponse.json({ error: "問題本文がありません" }, { status: 400 });
  }

  const email = user.email || "(メールなし)";
  const attachment = attachmentFromPhoto(photo);
  const photoNote = photo
    ? attachment
      ? "問題画像を添付しています。"
      : "問題画像はサイズが大きいためメール添付を省略しました（アプリの投稿には保存済みです）。"
    : "画像なし";

  const text = [
    "【Qraft 21時問題（PULSE）投稿】",
    `問題ID: ${problemId || "—"}`,
    `タイトル: ${title || "（なし）"}`,
    `分野: ${subject}`,
    "",
    "—— 投稿者 ——",
    `名前: ${authorName || "—"}`,
    `ハンドル: ${authorHandle ? `@${authorHandle}` : "—"}`,
    `ユーザーID: ${user.id}`,
    `メール: ${email}`,
    "",
    "—— 問題本文 / 数式 ——",
    textBody,
    "",
    "—— 解答メモ ——",
    solution || "（なし）",
    "",
    photoNote,
  ].join("\n");

  const html = `
    <p><strong>Qraft 21時問題（PULSE）投稿</strong></p>
    <p>問題ID: ${escapeHtml(problemId || "—")}<br/>
    タイトル: ${escapeHtml(title || "（なし）")}<br/>
    分野: ${escapeHtml(subject)}</p>
    <p>名前: ${escapeHtml(authorName || "—")}<br/>
    ハンドル: ${escapeHtml(authorHandle ? `@${authorHandle}` : "—")}<br/>
    ユーザーID: ${escapeHtml(user.id)}<br/>
    メール: ${escapeHtml(email)}</p>
    <p><strong>問題本文 / 数式</strong></p>
    ${preHtml(textBody)}
    <p><strong>解答メモ</strong></p>
    ${preHtml(solution || "（なし）")}
    <p>${escapeHtml(photoNote)}</p>
  `;

  try {
    await sendDeveloperMail({
      subject: `[Qraft PULSE] ${title || "無題の21時問題"}`,
      text,
      html,
      replyTo: user.email || undefined,
      attachments: attachment ? [attachment] : undefined,
    });
    return NextResponse.json({ ok: true, to: DEVELOPER_EMAIL });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "メール送信に失敗しました";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
