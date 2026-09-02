"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { VisualMathEditor } from "./VisualMathEditor";

export type TypedPage = { id: string; latex: string };

export function TypedNotebook({
  pages,
  index,
  onIndex,
  onChangeLatex,
  onAddPage,
  onDeletePage,
  header,
  footer,
  expanded,
  onToggleExpand,
}: {
  pages: TypedPage[];
  index: number;
  onIndex: (i: number) => void;
  onChangeLatex: (latex: string, pageIndex?: number) => void;
  onAddPage: () => void;
  onDeletePage: () => void;
  header?: ReactNode;
  footer?: ReactNode;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const page = pages[index] ?? pages[0];

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto px-3 py-2">
        <div className="flex gap-1">
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onIndex(i)}
              className={`h-8 min-w-8 rounded-lg text-xs font-bold ${
                i === index ? "bg-neon text-white glow-purple" : "bg-white/10 text-muted"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onAddPage}
          className="flex items-center gap-1 rounded-full bg-aha px-3 py-1.5 text-xs font-bold text-black"
        >
          <Plus size={14} /> Add Page
        </motion.button>
        <button
          type="button"
          onClick={onDeletePage}
          disabled={pages.length <= 1}
          className="rounded-full bg-white/10 p-2 text-muted disabled:opacity-30"
          aria-label="このページを削除"
        >
          <Trash2 size={14} />
        </button>
        <span className="ml-auto text-[11px] text-muted">{pages.length} pages</span>
      </div>
      {header}
      {expanded ? (
        page && (
          <VisualMathEditor
            key={page.id}
            value={page.latex}
            onChange={(latex) => onChangeLatex(latex, index)}
            expanded
            showKeyboard
          />
        )
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-2">
          <div className="flex flex-col gap-4">
            {pages.map((p, i) => (
              <div key={p.id} onPointerDown={() => onIndex(i)}>
                <VisualMathEditor
                  value={p.latex}
                  onChange={(latex) => {
                    onIndex(i);
                    onChangeLatex(latex, i);
                  }}
                  compact
                  showChrome={i === 0}
                  showKeyboard={i === index}
                  onToggleExpand={i === 0 ? onToggleExpand : undefined}
                />
              </div>
            ))}
          </div>
          {footer && <div className="mt-2 min-w-0 shrink-0 pb-20 sm:pb-2">{footer}</div>}
        </div>
      )}
    </div>
  );
}
