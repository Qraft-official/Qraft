import { pageHasInk } from "./draw-canvas";
import type { CanvasPage, NotePage } from "./types";

export const HANDWRITING_EXPORT_ERROR =
  "手書き画像の書き出しに失敗しました。書いた内容は残っているので、もう一度お試しください。";

export const HANDWRITING_UPLOAD_ERROR =
  "手書き画像のアップロードに失敗したため、投稿を中止しました。書いた内容は残っています。";

export function canvasPagesHaveInk(pages: CanvasPage[]) {
  return pages.some((p) => pageHasInk(p));
}

/** Keep only pages that actually exported a PNG. Blank pages are dropped. */
export function packHandwritingExport(
  pages: CanvasPage[],
  blobs: (Blob | null)[],
  size: { w: number; h: number },
): { pages: NotePage[]; drawingBlobs: Blob[] } {
  const notePages: NotePage[] = [];
  const drawingBlobs: Blob[] = [];
  pages.forEach((page, i) => {
    const blob = blobs[i];
    if (!blob || blob.size <= 0) return;
    notePages.push({
      id: page.id,
      latex: "",
      doodle: notePages.length,
      contentWidth: size.w,
      contentHeight: size.h,
    });
    drawingBlobs.push(blob);
  });
  return { pages: notePages, drawingBlobs };
}
