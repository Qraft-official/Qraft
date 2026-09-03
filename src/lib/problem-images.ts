import { supabase } from "./supabase";
import type { NotePage } from "./types";

export const PROBLEM_IMAGES_BUCKET = "problem-images";

export function isDisplayImageSrc(value?: string | null): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("data:image/")) return true;
  if (v.startsWith("blob:")) return true;
  if (v.startsWith("/")) return true;
  return /^https?:\/\//i.test(v);
}

function isHttpUrl(value?: string | null): boolean {
  return !!value && /^https?:\/\//i.test(value.trim());
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  try {
    const binary = atob(m[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: m[1] || "image/png" });
  } catch {
    return null;
  }
}

function drawingPath(userId: string, index: number) {
  const stamp = `${Date.now()}-${index}-${crypto.randomUUID().slice(0, 8)}`;
  return `drawings/${userId}/${stamp}.png`;
}

export async function uploadDrawingBlob(userId: string, blob: Blob, index = 0) {
  const path = drawingPath(userId, index);
  const { error } = await supabase.storage.from(PROBLEM_IMAGES_BUCKET).upload(path, blob, {
    cacheControl: "3600",
    contentType: blob.type || "image/png",
    upsert: false,
  });
  if (error) return { url: null as string | null, error: error.message };
  const { data } = supabase.storage.from(PROBLEM_IMAGES_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null as string | null };
}

async function blobFromImageValue(image?: string | null, blob?: Blob | null) {
  if (blob && blob.size > 0) return blob;
  if (!image) return null;
  if (isHttpUrl(image)) return null;
  if (image.startsWith("data:image/")) return dataUrlToBlob(image);
  return null;
}

export async function persistHandwritingPages(
  userId: string,
  pages: NotePage[] | undefined,
  drawingBlobs?: (Blob | null)[],
): Promise<{ pages?: NotePage[]; error: string | null }> {
  if (!pages?.length) return { pages, error: null };

  const next: NotePage[] = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const existing = page.image;
    if (isHttpUrl(existing)) {
      next.push(page);
      continue;
    }
    const blob = await blobFromImageValue(existing, drawingBlobs?.[i]);
    if (!blob) {
      next.push({ ...page, image: isDisplayImageSrc(existing) ? existing : undefined });
      continue;
    }
    const uploaded = await uploadDrawingBlob(userId, blob, i);
    if (uploaded.error || !uploaded.url) {
      return { error: uploaded.error || "手書き画像のアップロードに失敗しました" };
    }
    next.push({ ...page, image: uploaded.url });
  }
  return { pages: next, error: null };
}

export function firstDrawingUrl(pages?: NotePage[], fallback?: string) {
  const fromPages = pages?.find((p) => isHttpUrl(p.image))?.image;
  if (fromPages) return fromPages;
  if (fallback && isHttpUrl(fallback)) return fallback;
  return undefined;
}
