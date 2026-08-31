import nodemailer from "nodemailer";

export const DEVELOPER_EMAIL = "qraft.study@gmail.com";

export type MailAttachment = {
  filename: string;
  contentType: string;
  contentBase64: string;
};

export type SendMailInput = {
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: MailAttachment[];
};

function fromAddress() {
  return (
    process.env.RESEND_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    "Qraft <onboarding@resend.dev>"
  );
}

function parseDataUrl(dataUrl: string): MailAttachment | null {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  const contentType = m[1];
  const contentBase64 = m[2];
  if (contentBase64.length > 900_000) return null;
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("jpeg") || contentType.includes("jpg")
      ? "jpg"
      : contentType.includes("webp")
        ? "webp"
        : "bin";
  return { filename: `problem-image.${ext}`, contentType, contentBase64 };
}

export function attachmentFromPhoto(photo?: string | null): MailAttachment | undefined {
  if (!photo) return undefined;
  return parseDataUrl(photo) ?? undefined;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function preHtml(value: string) {
  return `<pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:14px;line-height:1.5">${escapeHtml(value)}</pre>`;
}

async function sendWithResend(input: SendMailInput, apiKey: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [DEVELOPER_EMAIL],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo || undefined,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.contentBase64,
        content_type: a.contentType,
      })),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend 送信に失敗しました（${res.status}）: ${body.slice(0, 400)}`);
  }
}

async function sendWithSmtp(input: SendMailInput) {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "メール送信の環境変数が未設定です。RESEND_API_KEY、または SMTP_USER / SMTP_PASS（Gmail の場合は GMAIL_USER / GMAIL_APP_PASSWORD）を設定してください。",
    );
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_PORT || "465") !== "587",
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: fromAddress(),
    to: DEVELOPER_EMAIL,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      content: Buffer.from(a.contentBase64, "base64"),
    })),
  });
}

export async function sendDeveloperMail(input: SendMailInput) {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    await sendWithResend(input, resendKey);
    return;
  }
  await sendWithSmtp(input);
}
