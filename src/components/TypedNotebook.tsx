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
    <div className={`flex min-w-0 w-full flex-col ${expanded ? "min-h-0 flex-1" : ""}`}>
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto px-3 py-1 sm:gap-2 sm:py-2">
        <div className="flex gap-1">
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onIndex(i)}
              className={`h-7 min-w-7 rounded-lg text-[11px] font-bold sm:h-8 sm:min-w-8 sm:text-xs ${
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
          className="flex items-center gap-1 rounded-full bg-aha px-2 py-1 text-[11px] font-bold text-black sm:px-3 sm:py-1.5 sm:text-xs"
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
      {page && (
        <VisualMathEditor
          key={page.id}
          value={page.latex}
          onChange={(latex) => onChangeLatex(latex, index)}
          expanded={expanded}
          showKeyboard
          onToggleExpand={expanded ? undefined : onToggleExpand}
          footer={expanded ? undefined : footer}
        />
      )}
    </div>
  );
}
