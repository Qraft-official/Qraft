"use client";

import { PEN_COLORS, PREMIUM_PENS } from "@/lib/constants";
import type { CanvasPage, Stroke } from "@/lib/types";
import { motion } from "framer-motion";
import { Eraser, Plus, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function uid() {
  return `p-${Math.random().toString(36).slice(2, 9)}`;
}

function drawPage(ctx: CanvasRenderingContext2D, page: CanvasPage, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(168,85,247,0.12)";
  ctx.lineWidth = 1;
  for (let y = 24; y < h; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (const s of page.strokes) {
    if (s.points.length < 2) continue;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = s.width;
    ctx.globalCompositeOperation = s.eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = s.eraser ? "rgba(0,0,0,1)" : s.color;
    const glow = !s.eraser && (s.color === "#FBBF24" || s.color === "#FB7185");
    ctx.shadowColor = glow ? s.color : "transparent";
    ctx.shadowBlur = glow ? 10 : 0;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }
  ctx.globalCompositeOperation = "source-over";
}

export function MultiPageCanvas({
  pages,
  onChange,
  className = "",
  premium = false,
}: {
  pages: CanvasPage[];
  onChange: (pages: CanvasPage[]) => void;
  className?: string;
  premium?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef<Stroke | null>(null);
  const [index, setIndex] = useState(0);
  const pens = premium ? [...PEN_COLORS, ...PREMIUM_PENS] : PEN_COLORS;
  const [color, setColor] = useState(PEN_COLORS[0].value);
  const [eraser, setEraser] = useState(false);
  const [width, setWidth] = useState(3.2);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const page = pagesRef.current[index] ?? pagesRef.current[0];
    if (page) drawPage(ctx, page, rect.width, rect.height);
  }, [index]);

  useEffect(() => {
    redraw();
  }, [pages, index, redraw]);

  useEffect(() => {
    const ro = new ResizeObserver(() => redraw());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  const pos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const commit = (next: CanvasPage[]) => {
    pagesRef.current = next;
    onChange(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const stroke: Stroke = {
      color,
      width: eraser ? 18 : width,
      eraser,
      points: [pos(e)],
    };
    drawing.current = stroke;
    const next = pagesRef.current.map((p, i) =>
      i === index ? { ...p, strokes: [...p.strokes, stroke] } : p,
    );
    commit(next);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    drawing.current.points.push(pos(e));
    commit(pagesRef.current.map((p) => ({ ...p, strokes: [...p.strokes] })));
  };

  const onPointerUp = () => {
    drawing.current = null;
  };

  const undo = () => {
    commit(
      pagesRef.current.map((p, i) =>
        i === index ? { ...p, strokes: p.strokes.slice(0, -1) } : p,
      ),
    );
  };

  const clear = () => {
    commit(pagesRef.current.map((p, i) => (i === index ? { ...p, strokes: [] } : p)));
  };

  const addPage = () => {
    const next = [...pagesRef.current, { id: uid(), strokes: [] }];
    commit(next);
    setIndex(next.length - 1);
  };

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
        <div className="flex gap-1">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setIndex(i)}
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

      <div ref={wrapRef} className="relative min-h-0 flex-1 touch-none px-2">
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-crosshair rounded-2xl border border-gray-800"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      <div className="safe-bottom flex items-center gap-2 overflow-x-auto px-3 py-3">
        {pens.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setColor(c.value);
              setEraser(false);
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
          onClick={() => setEraser(true)}
          className={`rounded-full p-2 ${eraser ? "bg-white text-black" : "bg-white/10 text-muted"}`}
        >
          <Eraser size={16} />
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
}
