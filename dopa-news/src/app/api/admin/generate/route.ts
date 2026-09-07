import { NextResponse } from "next/server";
import {
  MAX_SOURCE_LENGTH,
  SYSTEM_PROMPT,
  buildUserPrompt,
  coerceDraft,
  draftFromText,
  type DraftInput,
  type NewsDraft,
} from "@/lib/ai/news-draft";
import { getSupabaseForToken, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface GenerateResponse {
  draft: NewsDraft;
  /** Tells the editor whether a model produced this or the extractive fallback. */
  engine: "llm" | "fallback";
  notice?: string;
}

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/** Only admins may spend model credits or write news drafts. */
async function requireAdmin(request: Request): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const token = bearer(request);
  if (!token) return null;
  const supabase = getSupabaseForToken(token);
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  return profile?.is_admin ? userId : null;
}

async function callModel(input: DraftInput): Promise<NewsDraft | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;
    return coerceDraft(JSON.parse(content), draftFromText(input));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) {
    return NextResponse.json({ error: "管理者のみ利用できます" }, { status: 403 });
  }

  let body: Partial<DraftInput>;
  try {
    body = (await request.json()) as Partial<DraftInput>;
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 80) {
    return NextResponse.json(
      { error: "元記事のテキストを80文字以上貼り付けてください" },
      { status: 400 },
    );
  }

  const input: DraftInput = {
    text: text.slice(0, MAX_SOURCE_LENGTH),
    sourceName: typeof body.sourceName === "string" ? body.sourceName : undefined,
    sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : undefined,
    title: typeof body.title === "string" ? body.title : undefined,
  };

  const generated = await callModel(input);
  const result: GenerateResponse = generated
    ? { draft: generated, engine: "llm" }
    : {
        draft: draftFromText(input),
        engine: "fallback",
        notice: process.env.OPENAI_API_KEY
          ? "AIの呼び出しに失敗したため、元記事から抜き出した下書きを表示しています。内容を必ず編集してください。"
          : "AIキーが未設定のため、元記事から抜き出した下書きを表示しています。内容を必ず編集してください。",
      };

  return NextResponse.json(result);
}
