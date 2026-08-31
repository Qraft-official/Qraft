import { clip, bearerTokenFromRequest, userFromRequest } from "@/lib/api-auth";
import { FEEDBACK_THANKS_MESSAGE, FEEDBACK_THANKS_TITLE } from "@/lib/constants";
import { insertNotificationWithToken } from "@/lib/notifications";
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

  const category = clip(body.category, 40) || "フィードバック";
  const subject = clip(body.subject, 200);
  const message = clip(body.message, 8000);
  if (!subject.trim() || !message.trim()) {
    return NextResponse.json({ error: "件名と本文を入力してください" }, { status: 400 });
  }

  const name = clip(body.name, 80);
  const handle = clip(body.handle, 40);
  const email = user.email || "(メールなし)";
  const replyTo = user.email || undefined;

  const text = [
    "【Qraft フィードバック / 機能リクエスト】",
    `種別: ${category}`,
    `件名: ${subject}`,
    "",
    "—— 送信者 ——",
    `名前: ${name || "—"}`,
    `ハンドル: ${handle ? `@${handle}` : "—"}`,
    `ユーザーID: ${user.id}`,
    `メール: ${email}`,
    "",
    "—— 本文 ——",
    message,
  ].join("\n");

  const html = `
    <p><strong>Qraft フィードバック / 機能リクエスト</strong></p>
    <p>種別: ${escapeHtml(category)}<br/>件名: ${escapeHtml(subject)}</p>
    <p>名前: ${escapeHtml(name || "—")}<br/>
    ハンドル: ${escapeHtml(handle ? `@${handle}` : "—")}<br/>
    ユーザーID: ${escapeHtml(user.id)}<br/>
    メール: ${escapeHtml(email)}</p>
    ${preHtml(message)}
  `;

  try {
    await sendDeveloperMail({
      subject: `[Qraft ${category}] ${subject}`,
      text,
      html,
      replyTo,
    });
    const token = bearerTokenFromRequest(request);
    if (token) {
      await insertNotificationWithToken(token, FEEDBACK_THANKS_TITLE, FEEDBACK_THANKS_MESSAGE);
    }
    return NextResponse.json({ ok: true, to: DEVELOPER_EMAIL });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "メール送信に失敗しました";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
