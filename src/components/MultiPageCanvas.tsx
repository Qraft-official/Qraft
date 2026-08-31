"use client";

import { PEN_COLORS, PREMIUM_PENS } from "@/lib/constants";
import {
  drawPage,
  emptyCanvasPage,
  hitResizeHandle,
  hitTestText,
  rasterizePage,
  textBounds,
  type ResizeCorner,
} from "@/lib/draw-canvas";
import type { CanvasPage, CanvasText, Stroke } from "@/lib/types";
import { motion } from "framer-motion";
import { Eraser, Plus, RotateCcw, Trash2, Type, Undo2 } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
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

export type MultiPageCanvasHandle = {
  exportPageImages: () => string[];
};

export const MultiPageCanvas = forwardRef<
  MultiPageCanvasHandle,
  {
    pages: CanvasPage[];
    onChange: (pages: CanvasPage[]) => void;
    className?: string;
    premium?: boolean;
  }
>(function MultiPageCanvas({ pages, onChange, className = "", premium = false }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef<Stroke | null>(null);
  const dragText = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const sizeRef = useRef({ w: 800, h: 1000 });
  const stopTrack = useRef<(() => void) | null>(null);
  const [index, setIndex] = useState(0);
  const pens = premium ? [...PEN_COLORS, ...PREMIUM_PENS] : PEN_COLORS;
  const [color, setColor] = useState(PEN_COLORS[0].value);
  const [eraser, setEraser] = useState(false);
  const [textTool, setTextTool] = useState(false);
  const [width, setWidth] = useState(3.2);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editSize, setEditSize] = useState({ w: 180, h: 48 });
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

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    sizeRef.current = { w: rect.width, h: rect.height };
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const page = pagesRef.current[index] ?? pagesRef.current[0];
    if (page) drawPage(ctx, page, rect.width, rect.height, editingId);
  }, [index, editingId]);

  const commit = (next: CanvasPage[]) => {
    pagesRef.current = next;
    onChange(next);
  };

  const pageTexts = (p: CanvasPage) => p.texts ?? [];

  const patchPage = (fn: (p: CanvasPage) => CanvasPage) => {
    commit(pagesRef.current.map((p, i) => (i === index ? fn(p) : p)));
  };

  const clientToCanvas = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const pos = (e: { clientX: number; clientY: number }) => clientToCanvas(e.clientX, e.clientY);

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
      return pagesRef.current.map((p) => rasterizePage(p, w, h));
    },
  }));

  useEffect(() => {
    redraw();
  }, [pages, index, redraw, editingId]);

  useEffect(() => {
    const ro = new ResizeObserver(() => redraw());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => () => stopTrack.current?.(), []);

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

  const beginMove = (t: CanvasText, pt: { x: number; y: number }, pointerId: number) => {
    dragText.current = { id: t.id, dx: pt.x - t.x, dy: pt.y - t.y, moved: false };
    setSelectedId(t.id);
    trackPointer(
      pointerId,
      (ev) => {
        const p = clientToCanvas(ev.clientX, ev.clientY);
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

  const onPointerDown = (e: ReactPointerEvent) => {
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
    const pt = pos(e);
    const page = pagesRef.current[index];
    if (!page) return;

    const hit = hitTestText(pageTexts(page), pt.x, pt.y);
    if (hit && !eraser) {
      const handle = hitResizeHandle(hit, pt.x, pt.y);
      if (handle) {
        beginResize(hit, handle, e);
        return;
      }
      beginMove(hit, pt, e.pointerId);
      return;
    }

    if (textTool) {
      const next: CanvasText = {
        id: uid(),
        x: pt.x,
        y: pt.y,
        text: "",
        color,
        fontSize: 22,
        width: 180,
        height: 48,
      };
      lastKind.current = "text";
      patchPage((p) => ({ ...p, texts: [...pageTexts(p), next] }));
      setEditSize({ w: 180, h: 48 });
      setSelectedId(next.id);
      setEditingId(next.id);
      setEditValue("");
      return;
    }

    if (eraser) {
      if (hit) {
        lastKind.current = "text";
        patchPage((p) => ({ ...p, texts: pageTexts(p).filter((t) => t.id !== hit.id) }));
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
    patchPage((p) => ({ ...p, strokes: [...p.strokes, stroke] }));
    trackPointer(
      e.pointerId,
      (ev) => {
        if (!drawing.current) return;
        drawing.current.points.push(clientToCanvas(ev.clientX, ev.clientY));
        commit(pagesRef.current.map((p) => ({ ...p, strokes: [...p.strokes] })));
      },
      () => {
        drawing.current = null;
      },
    );
  };

  const undo = () => {
    patchPage((p) => {
      if (lastKind.current === "text" && pageTexts(p).length) {
        return { ...p, texts: pageTexts(p).slice(0, -1) };
      }
      return { ...p, strokes: p.strokes.slice(0, -1) };
    });
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

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
        <div className="flex gap-1">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                finishEdit();
                setIndex(i);
                setSelectedId(null);
              }}
              className={`h-8 min-w-8 rounded-lg text-xs font-bold ${
                i === index ? "bg-neon text-white glow-purple" : "bg-white/10 text-muted"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={addPage}
          className="flex items-center gap-1 rounded-full bg-aha px-3 py-1.5 text-xs font-bold text-black"
        >
          <Plus size={14} /> Add Page
        </motion.button>
        <span className="ml-auto text-[11px] text-muted">{pages.length} pages</span>
      </div>

      <div className="relative min-h-0 flex-1 px-2">
        <div ref={wrapRef} className="relative h-full min-h-0">
          <canvas
            ref={canvasRef}
            className={`h-full w-full touch-none rounded-2xl border border-gray-800 ${
              textTool ? "cursor-text" : "cursor-crosshair"
            }`}
            onPointerDown={onPointerDown}
          />
          {activeBox && (
            <div
              className="absolute z-30"
              style={{
                left: activeBox.x,
                top: activeBox.y,
                width: boxSize.w,
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
                      beginMove(activeBox, pos(e), e.pointerId);
                    }}
                  >
                    移動
                  </div>
                  <textarea
                    ref={textareaRef}
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") finishEdit();
                      e.stopPropagation();
                    }}
                    className="h-full w-full resize-none rounded-md border-2 border-aha bg-black/85 px-1.5 py-0.5 font-semibold leading-[1.35] whitespace-pre-wrap text-white outline-none"
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
                    beginMove(activeBox, pos(e), e.pointerId);
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
      </div>

      <div className="safe-bottom flex items-center gap-2 overflow-x-auto px-3 py-3">
        <button
          type="button"
          onClick={() => {
            setTextTool(true);
            setEraser(false);
          }}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold ${
            textTool ? "bg-aha text-black" : "bg-white/10 text-muted"
          }`}
          aria-label="テキスト追加"
        >
          <Type size={14} /> テキスト
        </button>
        {pens.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setColor(c.value);
              setEraser(false);
              setTextTool(false);
            }}
            className="h-8 w-8 rounded-full border-2"
            style={{
              background: c.value,
              borderColor: !eraser && color === c.value ? "#fff" : "transparent",
              boxShadow: !eraser && color === c.value ? `0 0 12px ${c.value}` : "none",
            }}
            aria-label={c.label}
          />
        ))}
        <button
          onClick={() => {
            setEraser(true);
            setTextTool(false);
          }}
          className={`rounded-full p-2 ${eraser ? "bg-white text-black" : "bg-white/10 text-muted"}`}
        >
          <Eraser size={16} />
        </button>
        <button
          type="button"
          onClick={() => setTextTool(false)}
          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
            !textTool && !eraser ? "bg-white/20 text-white" : "text-muted"
          }`}
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
        />
        <button onClick={undo} className="rounded-full bg-white/10 p-2 text-muted">
          <Undo2 size={16} />
        </button>
        <button onClick={clear} className="rounded-full bg-white/10 p-2 text-muted">
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => {
            if (pagesRef.current.length <= 1) return;
            const next = pagesRef.current.filter((_, i) => i !== index);
            commit(next);
            setIndex(Math.min(index, next.length - 1));
          }}
          className="rounded-full bg-white/10 p-2 text-muted disabled:opacity-30"
          disabled={pages.length <= 1}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
});
