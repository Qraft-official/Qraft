"use client";

import { PEN_COLORS, PREMIUM_PENS } from "@/lib/constants";
import {
  drawPage,
  emptyCanvasPage,
  hitResizeHandle,
  hitTestText,
  loadCanvasBackgrounds,
  pageHasInk,
  rasterizePage,
  rasterizePageBlob,
  sharedNotebookHeight,
  backgroundHeightForWidth,
  textBounds,
  wrapWidthForText,
  type ResizeCorner,
} from "@/lib/draw-canvas";
import type { CanvasPage, CanvasText, Stroke } from "@/lib/types";
import { confirmDialog } from "@/lib/app-dialog";
import { motion } from "framer-motion";
import {
  Circle,
  Eraser,
  MoreHorizontal,
  PenLine,
  Plus,
  Redo2,
  RotateCcw,
  Trash2,
  Type,
  Undo2,
  Minimize2,
} from "lucide-react";
import type { TextSizeId } from "@/lib/text-size";
import { NotebookExpandButton } from "./NotebookExpandControls";
import { TextSizeBar } from "./TextSizeBar";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

function uid() {
  return `p-${Math.random().toString(36).slice(2, 9)}`;
}

function applyResize(
  r: {
    corner: ResizeCorner;
    startX: number;
    startY: number;
    x: number;
    y: number;
    w: number;
    h: number;
  },
  clientX: number,
  clientY: number,
) {
  const dx = clientX - r.startX;
  const dy = clientY - r.startY;
  let { x, y, w, h } = r;
  if (r.corner.includes("e")) w = Math.max(64, r.w + dx);
  if (r.corner.includes("s")) h = Math.max(32, r.h + dy);
  if (r.corner.includes("w")) {
    w = Math.max(64, r.w - dx);
    x = r.x + (r.w - w);
  }
  if (r.corner.includes("n")) {
    h = Math.max(32, r.h - dy);
    y = r.y + (r.h - h);
  }
  return { x, y, w, h };
}

const WIDTH_PRESETS = [
  { id: "thin", label: "細い", value: 1.5 },
  { id: "mid", label: "普通", value: 3.2 },
  { id: "thick", label: "太い", value: 6.5 },
] as const;

type ChromePanel = "color" | "width" | "pages" | "more" | null;

function ToolBtn({
  active,
  label,
  onClick,
  children,
  className = "",
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:h-11 md:w-11 ${
        active ? "bg-aha text-black" : "text-muted hover:bg-white/10 hover:text-white"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function ToolSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[96] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label={title}
        className="relative mx-2 mb-[max(0.5rem,env(safe-area-inset-bottom))] w-full max-w-sm overflow-hidden rounded-2xl border border-gray-700 bg-[#15202b] p-3 shadow-2xl sm:mb-0"
      >
        <p className="px-1 pb-2 text-sm font-black">{title}</p>
        {children}
      </div>
    </div>
  );
}

export type MultiPageCanvasHandle = {
  exportPageImages: () => string[];
  exportPageBlobs: () => Promise<(Blob | null)[]>;
  getContentSize: () => { w: number; h: number };
};

export const CANVAS_TEXT_PX: Record<TextSizeId, number> = {
  sm: 16,
  md: 22,
  lg: 28,
  xl: 36,
};

export const MultiPageCanvas = forwardRef<
  MultiPageCanvasHandle,
  {
    pages: CanvasPage[];
    onChange: (pages: CanvasPage[]) => void;
    className?: string;
    premium?: boolean;
    flush?: boolean;
    textSize?: TextSizeId;
    onTextSizeChange?: (size: TextSizeId) => void;
    onToggleExpand?: () => void;
    expanded?: boolean;
  }
>(function MultiPageCanvas(
  {
    pages,
    onChange,
    className = "",
    premium = false,
    flush = false,
    textSize = "md",
    onTextSizeChange,
    onToggleExpand,
    expanded = false,
  },
  ref,
) {
  const canvasEls = useRef<(HTMLCanvasElement | null)[]>([]);
  const wrapEls = useRef<(HTMLDivElement | null)[]>([]);
  const drawing = useRef<Stroke | null>(null);
  const dragText = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const sizeRef = useRef({ w: 800, h: 280 });
  const stopTrack = useRef<(() => void) | null>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  indexRef.current = index;
  const pens = premium ? [...PEN_COLORS, ...PREMIUM_PENS] : PEN_COLORS;
  const [color, setColor] = useState(PEN_COLORS[0].value);
  const [eraser, setEraser] = useState(false);
  const [textTool, setTextTool] = useState(false);
  const [width, setWidth] = useState(3.2);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const redoPageRef = useRef<CanvasPage | null>(null);
  const [editSize, setEditSize] = useState({ w: 180, h: 48 });
  const [panel, setPanel] = useState<ChromePanel>(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const lastKind = useRef<"stroke" | "text">("stroke");
  const editValueRef = useRef(editValue);
  editValueRef.current = editValue;
  const editSizeRef = useRef(editSize);
  editSizeRef.current = editSize;
  const editingIdRef = useRef(editingId);
  editingIdRef.current = editingId;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeRef = useRef<{
    corner: ResizeCorner;
    startX: number;
    startY: number;
    x: number;
    y: number;
    w: number;
    h: number;
    id: string;
  } | null>(null);

  const contentH = sharedNotebookHeight(pages);
  const flushRef = useRef(flush);
  flushRef.current = flush;
  const bgKey = pages.map((p) => p.backgroundImage ?? "").join("|");

  const redraw = useCallback(() => {
    const list = pagesRef.current;
    const inkH = sharedNotebookHeight(list);
    const firstWrap = wrapEls.current.find(Boolean);
    const w = firstWrap?.getBoundingClientRect().width || sizeRef.current.w;
    const dpr = window.devicePixelRatio || 1;
    let usedH = inkH;
    list.forEach((page, i) => {
      const canvas = canvasEls.current[i];
      const wrap = wrapEls.current[i];
      if (!canvas) return;
      const rectW = wrap?.getBoundingClientRect().width || w;
      const wrapH = wrap?.getBoundingClientRect().height || 0;
      const cssW = Math.max(1, rectW);
      const bgH = backgroundHeightForWidth(page, cssW);
      const cssH = flushRef.current
        ? Math.max(inkH, wrapH, bgH)
        : wrapH > 1
          ? wrapH
          : Math.max(inkH, bgH);
      usedH = Math.max(usedH, cssH);
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPage(ctx, page, cssW, cssH, i === indexRef.current ? editingId : null);
    });
    sizeRef.current = { w: Math.max(1, w), h: usedH };
  }, [editingId, pages]);

  useEffect(() => {
    let cancelled = false;
    void loadCanvasBackgrounds(pages).then(() => {
      if (!cancelled) redraw();
    });
    return () => {
      cancelled = true;
    };
  }, [bgKey, pages, redraw]);

  const commit = (next: CanvasPage[]) => {
    pagesRef.current = next;
    onChange(next);
  };

  const pageTexts = (p: CanvasPage) => p.texts ?? [];

  const patchPage = (fn: (p: CanvasPage) => CanvasPage, pageIndex = indexRef.current) => {
    commit(pagesRef.current.map((p, i) => (i === pageIndex ? fn(p) : p)));
  };

  const clientToCanvas = (clientX: number, clientY: number, canvas?: HTMLCanvasElement | null) => {
    const el = canvas ?? canvasEls.current[indexRef.current];
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const pos = (e: { clientX: number; clientY: number }, canvas?: HTMLCanvasElement | null) =>
    clientToCanvas(e.clientX, e.clientY, canvas);

  const trackPointer = (pointerId: number, onMove: (e: PointerEvent) => void, onUp: () => void) => {
    stopTrack.current?.();
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      e.preventDefault();
      onMove(e);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      cleanup();
      onUp();
    };
    function cleanup() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      stopTrack.current = null;
    }
    stopTrack.current = cleanup;
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  /** Some mobile IMEs deliver Enter without inserting the break themselves. */
  const insertTextareaNewline = (el: HTMLTextAreaElement) => {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = `${el.value.slice(0, start)}\n${el.value.slice(end)}`;
    el.value = next;
    el.setSelectionRange(start + 1, start + 1);
    setEditValue(next);
  };

  const flushEdit = () => {
    const id = editingIdRef.current;
    if (!id) return;
    const value = editValueRef.current;
    const size = editSizeRef.current;
    patchPage((p) => {
      const texts = pageTexts(p)
        .map((t) =>
          t.id === id ? { ...t, text: value, width: size.w, height: size.h } : t,
        )
        .filter((t) => t.id !== id || value.trim());
      return { ...p, texts };
    });
    setEditingId(null);
  };

  const finishEdit = () => flushEdit();

  useImperativeHandle(ref, () => ({
    exportPageImages: () => {
      flushEdit();
      const { w, h } = sizeRef.current;
      const tall = sharedNotebookHeight(pagesRef.current);
      const bgH = pagesRef.current.reduce((m, p) => Math.max(m, backgroundHeightForWidth(p, w)), 0);
      const height = Math.max(h, tall, bgH);
      return pagesRef.current.map((p) =>
        pageHasInk(p) ? rasterizePage(p, w, height) : "",
      );
    },
    exportPageBlobs: async () => {
      flushEdit();
      await loadCanvasBackgrounds(pagesRef.current);
      const { w, h } = sizeRef.current;
      const tall = sharedNotebookHeight(pagesRef.current);
      const bgH = pagesRef.current.reduce((m, p) => Math.max(m, backgroundHeightForWidth(p, w)), 0);
      const height = Math.max(h, tall, bgH);
      return Promise.all(
        pagesRef.current.map((p) =>
          pageHasInk(p) ? rasterizePageBlob(p, w, height) : Promise.resolve(null),
        ),
      );
    },
    getContentSize: () => {
      const h = sharedNotebookHeight(pagesRef.current);
      return { w: sizeRef.current.w, h: Math.max(sizeRef.current.h, h) };
    },
  }));

  useLayoutEffect(() => {
    redraw();
  }, [pages, index, redraw, editingId, flush]);

  useEffect(() => {
    const ro = new ResizeObserver(() => redraw());
    wrapEls.current.forEach((el) => {
      if (el) ro.observe(el);
    });
    return () => ro.disconnect();
  }, [redraw, pages.length, flush]);

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  useEffect(() => {
    if (!editingId) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [editingId]);

  const openEditor = (t: CanvasText) => {
    const { w, h } = textBounds(t);
    setEditSize({ w, h });
    setSelectedId(t.id);
    setEditingId(t.id);
    setEditValue(t.text);
  };

  const beginMove = (
    t: CanvasText,
    pt: { x: number; y: number },
    pointerId: number,
    canvas?: HTMLCanvasElement | null,
  ) => {
    dragText.current = { id: t.id, dx: pt.x - t.x, dy: pt.y - t.y, moved: false };
    setSelectedId(t.id);
    trackPointer(
      pointerId,
      (ev) => {
        const p = clientToCanvas(ev.clientX, ev.clientY, canvas);
        const drag = dragText.current;
        if (!drag) return;
        drag.moved = true;
        patchPage((page) => ({
          ...page,
          texts: pageTexts(page).map((box) =>
            box.id === drag.id ? { ...box, x: p.x - drag.dx, y: p.y - drag.dy } : box,
          ),
        }));
      },
      () => {
        const drag = dragText.current;
        dragText.current = null;
        if (drag && !drag.moved) {
          const page = pagesRef.current[index];
          const found = pageTexts(page).find((x) => x.id === drag.id);
          if (found) openEditor(found);
        }
      },
    );
  };

  const beginResize = (t: CanvasText, corner: ResizeCorner, e: { clientX: number; clientY: number; pointerId: number }) => {
    const { w, h } = textBounds(t);
    const size = t.id === editingId ? editSize : { w, h };
    resizeRef.current = {
      corner,
      startX: e.clientX,
      startY: e.clientY,
      x: t.x,
      y: t.y,
      w: size.w,
      h: size.h,
      id: t.id,
    };
    setSelectedId(t.id);
    trackPointer(
      e.pointerId,
      (ev) => {
        const r = resizeRef.current;
        if (!r) return;
        const next = applyResize(r, ev.clientX, ev.clientY);
        if (r.id === editingIdRef.current) setEditSize({ w: next.w, h: next.h });
        patchPage((page) => ({
          ...page,
          texts: pageTexts(page).map((box) =>
            box.id === r.id ? { ...box, x: next.x, y: next.y, width: next.w, height: next.h } : box,
          ),
        }));
      },
      () => {
        resizeRef.current = null;
      },
    );
  };

  const onPointerDown = (pageIndex: number, e: ReactPointerEvent<HTMLCanvasElement>) => {
    indexRef.current = pageIndex;
    setIndex(pageIndex);
    if (editingIdRef.current) {
      finishEdit();
      return;
    }
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* already captured */
    }
    const canvas = e.currentTarget;
    const pt = pos(e, canvas);
    const page = pagesRef.current[pageIndex];
    if (!page) return;

    const hit = hitTestText(pageTexts(page), pt.x, pt.y);
    if (hit && !eraser) {
      const handle = hitResizeHandle(hit, pt.x, pt.y);
      if (handle) {
        beginResize(hit, handle, e);
        return;
      }
      beginMove(hit, pt, e.pointerId, canvas);
      return;
    }

    if (textTool) {
      const canvasW = canvas.getBoundingClientRect().width || sizeRef.current.w;
      const width = Math.max(64, Math.min(180, canvasW - pt.x - 8));
      const next: CanvasText = {
        id: uid(),
        x: pt.x,
        y: pt.y,
        text: "",
        color,
        fontSize: CANVAS_TEXT_PX[textSize],
        width,
        height: 48,
      };
      lastKind.current = "text";
      patchPage((p) => ({ ...p, texts: [...pageTexts(p), next] }), pageIndex);
      setEditSize({ w: width, h: 48 });
      setSelectedId(next.id);
      setEditingId(next.id);
      setEditValue("");
      return;
    }

    if (eraser) {
      if (hit) {
        lastKind.current = "text";
        patchPage((p) => ({ ...p, texts: pageTexts(p).filter((t) => t.id !== hit.id) }), pageIndex);
        if (selectedId === hit.id) setSelectedId(null);
        return;
      }
    }

    setSelectedId(null);
    const stroke: Stroke = {
      color,
      width: eraser ? 18 : width,
      eraser,
      points: [pt],
    };
    drawing.current = stroke;
    lastKind.current = "stroke";
    patchPage((p) => ({ ...p, strokes: [...p.strokes, stroke] }), pageIndex);
    trackPointer(
      e.pointerId,
      (ev) => {
        if (!drawing.current) return;
        drawing.current.points.push(clientToCanvas(ev.clientX, ev.clientY, canvas));
        commit(pagesRef.current.map((p) => ({ ...p, strokes: [...p.strokes] })));
      },
      () => {
        drawing.current = null;
      },
    );
  };

  const undo = () => {
    const page = pagesRef.current[indexRef.current];
    if (page) redoPageRef.current = page;
    patchPage((p) => {
      if (lastKind.current === "text" && pageTexts(p).length) {
        return { ...p, texts: pageTexts(p).slice(0, -1) };
      }
      return { ...p, strokes: p.strokes.slice(0, -1) };
    });
  };

  const redo = () => {
    const snap = redoPageRef.current;
    if (!snap) return;
    redoPageRef.current = null;
    patchPage(() => snap);
  };

  const clear = () => {
    patchPage((p) => ({ ...p, strokes: [], texts: [] }));
    setSelectedId(null);
    setEditingId(null);
  };

  const addPage = () => {
    finishEdit();
    const next = [...pagesRef.current, emptyCanvasPage(uid())];
    commit(next);
    setIndex(next.length - 1);
    setSelectedId(null);
  };

  const activeId = editingId || selectedId;
  const activeBox = activeId
    ? pageTexts(pages[index] ?? emptyCanvasPage()).find((t) => t.id === activeId)
    : undefined;
  const boxSize = activeBox
    ? activeId === editingId
      ? editSize
      : textBounds(activeBox)
    : { w: 0, h: 0 };

  const handleStyle = (corner: ResizeCorner): CSSProperties => {
    const cursors: Record<ResizeCorner, string> = {
      nw: "nwse-resize",
      se: "nwse-resize",
      ne: "nesw-resize",
      sw: "nesw-resize",
    };
    const base: CSSProperties = {
      position: "absolute",
      width: 22,
      height: 22,
      margin: -11,
      background: "#CCFF00",
      border: "2px solid #000",
      borderRadius: 4,
      zIndex: 40,
      pointerEvents: "auto",
      touchAction: "none",
      cursor: cursors[corner],
    };
    if (corner.includes("n")) base.top = 0;
    if (corner.includes("s")) base.bottom = 0;
    if (corner.includes("w")) base.left = 0;
    if (corner.includes("e")) base.right = 0;
    return base;
  };

  const renderPageSurface = (pageIndex: number, fill: boolean) => {
    const showOverlay = pageIndex === index && !!activeBox;
    return (
      <div
        ref={(el) => {
          wrapEls.current[pageIndex] = el;
        }}
        className={`relative w-full ${fill ? "h-full min-h-0" : ""}`}
        style={fill ? { height: "100%", minHeight: 0 } : { height: contentH }}
      >
        <canvas
          ref={(el) => {
            canvasEls.current[pageIndex] = el;
          }}
          className={`touch-none rounded-2xl border border-gray-800 ${
            fill ? "h-full w-full" : "block w-full"
          } ${textTool ? "cursor-text" : "cursor-crosshair"}`}
          onPointerDown={(e) => onPointerDown(pageIndex, e)}
        />
        {showOverlay && activeBox && (
          <div
            className="absolute z-30 max-w-full"
            style={{
              left: activeBox.x,
              top: activeBox.y,
              width: Math.min(
                boxSize.w,
                wrapWidthForText(
                  { ...activeBox, width: boxSize.w },
                  wrapEls.current[pageIndex]?.getBoundingClientRect().width || sizeRef.current.w,
                ),
              ),
              height: boxSize.h,
              pointerEvents: "auto",
              touchAction: "none",
            }}
          >
            {editingId === activeBox.id ? (
              <>
                <div
                  className="absolute -top-6 left-0 right-0 flex h-6 cursor-grab items-center justify-center rounded-t-md bg-aha text-[10px] font-black text-black active:cursor-grabbing"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      /* ignore */
                    }
                    beginMove(
                      activeBox,
                      pos(e, canvasEls.current[pageIndex]),
                      e.pointerId,
                      canvasEls.current[pageIndex],
                    );
                  }}
                >
                  移動
                </div>
                <textarea
                  ref={textareaRef}
                  autoFocus
                  value={editValue}
                  inputMode="text"
                  enterKeyHint="enter"
                  autoCapitalize="sentences"
                  autoCorrect="on"
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      finishEdit();
                      return;
                    }
                    if (
                      (e.key === "Enter" || e.key === "Return") &&
                      !e.nativeEvent.isComposing &&
                      e.keyCode !== 229
                    ) {
                      e.preventDefault();
                      insertTextareaNewline(e.currentTarget);
                    }
                    e.stopPropagation();
                  }}
                  onBeforeInput={(e) => {
                    const ie = e.nativeEvent as InputEvent;
                    if (ie.isComposing) return;
                    if (
                      ie.inputType === "insertLineBreak" ||
                      ie.inputType === "insertParagraph" ||
                      (ie.inputType === "insertText" &&
                        (ie.data === "\n" || ie.data === "\r" || ie.data === "\r\n"))
                    ) {
                      e.preventDefault();
                      insertTextareaNewline(e.currentTarget);
                    }
                  }}
                  className="h-full w-full max-w-full resize-none rounded-md border-2 border-aha bg-black/85 px-1.5 py-0.5 font-semibold leading-[1.35] break-words whitespace-pre-wrap text-white outline-none [overflow-wrap:anywhere] [word-break:break-word]"
                  style={{
                    color: activeBox.color,
                    fontSize: activeBox.fontSize,
                    pointerEvents: "auto",
                    touchAction: "manipulation",
                  }}
                  placeholder="テキストを入力"
                />
                <button
                  type="button"
                  onClick={finishEdit}
                  className="absolute -bottom-8 left-0 rounded-full bg-aha px-2.5 py-0.5 text-[10px] font-black text-black"
                >
                  完了
                </button>
              </>
            ) : (
              <div
                className="h-full w-full cursor-grab rounded-md border-2 border-aha/90 bg-aha/5 active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    /* ignore */
                  }
                  beginMove(
                    activeBox,
                    pos(e, canvasEls.current[pageIndex]),
                    e.pointerId,
                    canvasEls.current[pageIndex],
                  );
                }}
              />
            )}
            {(["nw", "ne", "sw", "se"] as const).map((corner) => (
              <div
                key={corner}
                role="slider"
                aria-label={`リサイズ ${corner}`}
                style={handleStyle(corner)}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    /* ignore */
                  }
                  beginResize(activeBox, corner, e);
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const goToPage = (i: number) => {
    finishEdit();
    indexRef.current = i;
    setIndex(i);
    setSelectedId(null);
    setPanel(null);
    requestAnimationFrame(() => {
      wrapEls.current[i]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const removeCurrentPage = async () => {
    if (pagesRef.current.length <= 1) return;
    const ok = await confirmDialog({
      title: "このページを削除しますか？",
      message: "このページの手書きは元に戻せません。",
      confirmLabel: "削除する",
      cancelLabel: "キャンセル",
      destructive: true,
    });
    if (!ok) return;
    const next = pagesRef.current.filter((_, i) => i !== indexRef.current);
    commit(next);
    const nextIndex = Math.min(indexRef.current, next.length - 1);
    indexRef.current = nextIndex;
    setIndex(nextIndex);
    setPanel(null);
  };

  const togglePanel = (next: ChromePanel) => {
    setPanel((cur) => (cur === next ? null : next));
  };

  const closestWidth = WIDTH_PRESETS.reduce((best, p) =>
    Math.abs(p.value - width) < Math.abs(best.value - width) ? p : best,
  );

  const pageChromeMobile = (
    <div className="flex h-10 shrink-0 items-center gap-1 px-2 md:hidden">
      <button
        type="button"
        onClick={() => togglePanel("pages")}
        className="flex h-8 min-w-[3.25rem] items-center justify-center rounded-lg bg-white/10 px-2 text-[12px] font-bold text-white"
        aria-label={`ページ ${index + 1} / ${pages.length}`}
        aria-expanded={panel === "pages"}
      >
        {index + 1} / {pages.length}
      </button>
      <button
        type="button"
        onClick={addPage}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-aha hover:bg-white/10"
        aria-label="ページ追加"
      >
        <Plus size={14} />
      </button>
      <span className="min-w-0 flex-1" />
      {onToggleExpand &&
        (expanded ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-white"
            aria-label="縮小"
          >
            <Minimize2 size={15} />
          </button>
        ) : (
          <NotebookExpandButton onClick={onToggleExpand} className="!h-8 !w-8" />
        ))}
      <button
        type="button"
        onClick={() => togglePanel("more")}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-white"
        aria-label="その他"
        aria-expanded={panel === "more"}
      >
        <MoreHorizontal size={16} />
      </button>
    </div>
  );

  const pageChromeDesktop = (
    <div className="hidden items-center gap-1.5 overflow-x-auto px-3 py-1 md:flex">
      <div className="flex gap-1">
        {pages.map((p, i) => (
          <button
            key={p.id}
            onClick={() => goToPage(i)}
            className={`h-11 min-w-11 rounded-lg text-sm font-bold ${
              i === index ? "bg-neon text-white glow-purple" : "bg-white/10 text-muted"
            }`}
            aria-label={`${i + 1}ページ`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={addPage}
        className="flex h-9 items-center gap-1 rounded-full border border-gray-700 px-2.5 text-xs font-bold text-white hover:bg-white/10"
        aria-label="ページ追加"
      >
        <Plus size={14} /> ページ
      </motion.button>
      <TextSizeBar
        compact
        active={textSize}
        onPick={(size) => {
          onTextSizeChange?.(size);
          if (!selectedId) return;
          patchPage((p) => ({
            ...p,
            texts: pageTexts(p).map((t) =>
              t.id === selectedId ? { ...t, fontSize: CANVAS_TEXT_PX[size] } : t,
            ),
          }));
        }}
      />
      {onToggleExpand &&
        (expanded ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-white"
            aria-label="縮小"
            title="縮小"
          >
            <Minimize2 size={16} />
          </button>
        ) : (
          <NotebookExpandButton onClick={onToggleExpand} />
        ))}
      <button
        onClick={() => void removeCurrentPage()}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-white/10 disabled:opacity-30"
        disabled={pages.length <= 1}
        aria-label="このページを削除"
      >
        <Trash2 size={16} />
      </button>
      <span className="ml-auto shrink-0 text-[11px] text-muted">{pages.length}ページ</span>
    </div>
  );

  const applyTextSize = (size: typeof textSize) => {
    onTextSizeChange?.(size);
    if (!selectedId) return;
    patchPage((p) => ({
      ...p,
      texts: pageTexts(p).map((t) =>
        t.id === selectedId ? { ...t, fontSize: CANVAS_TEXT_PX[size] } : t,
      ),
    }));
  };

  const mobileToolbar = (
    <div className="flex h-11 shrink-0 items-center justify-between gap-0.5 px-1 md:hidden">
      <ToolBtn
        active={!textTool && !eraser}
        label="ペン"
        onClick={() => {
          setTextTool(false);
          setEraser(false);
        }}
      >
        <PenLine size={16} />
      </ToolBtn>
      <ToolBtn
        active={eraser}
        label="消しゴム"
        onClick={() => {
          setEraser(true);
          setTextTool(false);
        }}
      >
        <Eraser size={16} />
      </ToolBtn>
      <button
        type="button"
        onClick={() => togglePanel("color")}
        className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"
        aria-label="色"
        aria-expanded={panel === "color"}
      >
        <span
          className="h-5 w-5 rounded-full border-2 border-white/80"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </button>
      <ToolBtn active={panel === "width"} label="太さ" onClick={() => togglePanel("width")}>
        <Circle size={closestWidth.id === "thin" ? 10 : closestWidth.id === "mid" ? 14 : 18} />
      </ToolBtn>
      {textTool ? (
        <TextSizeBar compact active={textSize} onPick={applyTextSize} />
      ) : (
        <ToolBtn
          active={textTool}
          label="テキスト"
          onClick={() => {
            setTextTool(true);
            setEraser(false);
          }}
        >
          <Type size={16} />
        </ToolBtn>
      )}
      <ToolBtn label="元に戻す" onClick={undo}>
        <Undo2 size={16} />
      </ToolBtn>
      <ToolBtn label="やり直す" onClick={redo}>
        <Redo2 size={16} />
      </ToolBtn>
    </div>
  );

  const desktopToolbar = (
    <div className="hidden shrink-0 items-center gap-2 overflow-x-auto px-3 py-2 md:flex">
      <button
        type="button"
        onClick={() => {
          setTextTool(true);
          setEraser(false);
        }}
        className={`flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold ${
          textTool ? "bg-aha text-black" : "bg-white/10 text-muted"
        }`}
        aria-label="テキスト追加"
        aria-pressed={textTool}
      >
        <Type size={14} /> テキスト
      </button>
      {pens.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => {
            setColor(c.value);
            setEraser(false);
            setTextTool(false);
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center"
          aria-label={c.label}
          title={c.label}
        >
          <span
            className="h-6 w-6 rounded-full border-2"
            style={{
              background: c.value,
              borderColor: !eraser && color === c.value ? "#fff" : "transparent",
              boxShadow: !eraser && color === c.value ? `0 0 12px ${c.value}` : "none",
            }}
          />
        </button>
      ))}
      <button
        onClick={() => {
          setEraser(true);
          setTextTool(false);
        }}
        className={`flex h-9 w-9 items-center justify-center rounded-full ${eraser ? "bg-white text-black" : "bg-white/10 text-muted"}`}
        aria-label="消しゴム"
        title="消しゴム"
        aria-pressed={eraser}
      >
        <Eraser size={16} />
      </button>
      <button
        type="button"
        onClick={() => setTextTool(false)}
        className={`h-9 rounded-full px-3 text-xs font-bold ${
          !textTool && !eraser ? "bg-white/20 text-white" : "text-muted"
        }`}
        aria-pressed={!textTool && !eraser}
      >
        ペン
      </button>
      <input
        type="range"
        min={1.5}
        max={10}
        step={0.5}
        value={width}
        onChange={(e) => setWidth(Number(e.target.value))}
        className="w-20 accent-neon"
        aria-label="ペンの太さ"
      />
      <button
        type="button"
        onClick={undo}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-muted"
        aria-label="元に戻す"
      >
        <Undo2 size={16} />
      </button>
      <button
        type="button"
        onClick={redo}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-muted"
        aria-label="やり直す"
      >
        <Redo2 size={16} />
      </button>
      <button
        type="button"
        onClick={clear}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-muted"
        aria-label="ページをクリア"
      >
        <RotateCcw size={16} />
      </button>
    </div>
  );

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      {pageChromeMobile}
      {pageChromeDesktop}

      <div
        className={`relative min-h-0 flex-1 ${flush ? "overflow-y-auto px-0" : "overflow-hidden px-0 md:px-2"}`}
      >
        <div className={`relative h-full min-h-0 ${flush ? "" : "overflow-hidden"}`}>
          {pages[index] ? renderPageSurface(index, true) : null}
        </div>
      </div>

      {mobileToolbar}
      {desktopToolbar}

      <ToolSheet open={panel === "color"} title="色" onClose={() => setPanel(null)}>
        <div className="flex flex-wrap gap-2 px-1 pb-1">
          {pens.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setColor(c.value);
                setEraser(false);
                setTextTool(false);
                setPanel(null);
              }}
              className="flex h-11 w-11 items-center justify-center"
              aria-label={c.label}
            >
              <span
                className="h-8 w-8 rounded-full border-2"
                style={{
                  background: c.value,
                  borderColor: color === c.value ? "#fff" : "transparent",
                  boxShadow: color === c.value ? `0 0 12px ${c.value}` : "none",
                }}
              />
            </button>
          ))}
        </div>
      </ToolSheet>

      <ToolSheet open={panel === "width"} title="太さ" onClose={() => setPanel(null)}>
        <div className="space-y-1">
          {WIDTH_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setWidth(p.value);
                setPanel(null);
              }}
              className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-sm font-bold ${
                closestWidth.id === p.id ? "bg-aha/15 text-aha" : "text-white hover:bg-white/5"
              }`}
            >
              <span>{p.label}</span>
              <span
                className="rounded-full bg-white"
                style={{ width: 8 + p.value * 2, height: p.value + 2 }}
              />
            </button>
          ))}
          <label className="mt-2 flex items-center gap-2 px-1 text-[11px] text-muted">
            スライダー
            <input
              type="range"
              min={1.5}
              max={10}
              step={0.5}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="min-w-0 flex-1 accent-neon"
            />
          </label>
        </div>
      </ToolSheet>

      <ToolSheet open={panel === "pages"} title="ページ" onClose={() => setPanel(null)}>
        <div className="flex flex-wrap gap-1.5">
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => goToPage(i)}
              className={`h-10 min-w-10 rounded-lg text-sm font-bold ${
                i === index ? "bg-aha text-black" : "bg-white/10 text-muted"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </ToolSheet>

      <ToolSheet open={panel === "more"} title="ページ操作" onClose={() => setPanel(null)}>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => {
              setTextTool(true);
              setEraser(false);
              setPanel(null);
            }}
            className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-left text-sm font-bold hover:bg-white/5"
          >
            <Type size={16} /> テキストを置く
          </button>
          <button
            type="button"
            onClick={() => {
              clear();
              setPanel(null);
            }}
            className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-left text-sm font-bold hover:bg-white/5"
          >
            <RotateCcw size={16} /> このページをクリア
          </button>
          <button
            type="button"
            disabled={pages.length <= 1}
            onClick={() => void removeCurrentPage()}
            className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-left text-sm font-bold text-red-400 hover:bg-white/5 disabled:opacity-30"
          >
            <Trash2 size={16} /> このページを削除
          </button>
        </div>
      </ToolSheet>
    </div>
  );
});
