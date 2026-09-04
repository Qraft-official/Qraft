"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { Minimize2, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import type { TextSizeId } from "@/lib/text-size";
import { VisualMathEditor, type VisualMathEditorHandle } from "./VisualMathEditor";
import { NotebookExpandButton } from "./NotebookExpandControls";
import { TextSizeBar } from "./TextSizeBar";

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
  textSize,
  onTextSizeChange,
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
  textSize: TextSizeId;
  onTextSizeChange: (size: TextSizeId) => void;
}) {
  const page = pages[index] ?? pages[0];
  const editorRef = useRef<VisualMathEditorHandle>(null);

  return (
    <div className={`flex min-w-0 w-full flex-col ${expanded ? "min-h-0 flex-1" : ""}`}>
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto px-2 py-1 sm:gap-1.5 sm:px-3">
        <div className="flex gap-1">
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onIndex(i)}
              className={`h-11 min-w-11 rounded-lg text-sm font-bold ${
                i === index ? "bg-neon text-white glow-purple" : "bg-white/10 text-muted"
              }`}
              aria-label={`${i + 1}ページ`}
              aria-current={i === index}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onAddPage}
          className="flex h-11 items-center gap-1 rounded-full bg-aha px-3 text-xs font-bold text-black"
          aria-label="ページ追加"
        >
          <Plus size={14} /> ページ追加
        </motion.button>
        <TextSizeBar
          compact
          active={textSize}
          onPick={(size) => {
            onTextSizeChange(size);
            editorRef.current?.applySize(size);
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
          type="button"
          onClick={onDeletePage}
          disabled={pages.length <= 1}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-white/10 disabled:opacity-30"
          aria-label="このページを削除"
          title="このページを削除"
        >
          <Trash2 size={16} />
        </button>
        <span className="ml-auto shrink-0 pr-1 text-[11px] text-muted">{pages.length}ページ</span>
      </div>
      {header}
      {page && (
        <VisualMathEditor
          ref={editorRef}
          key={page.id}
          value={page.latex}
          onChange={(latex) => onChangeLatex(latex, index)}
          expanded={expanded}
          showChrome={false}
          showKeyboard
          textSize={textSize}
          onTextSizeChange={onTextSizeChange}
          footer={expanded ? undefined : footer}
        />
      )}
    </div>
  );
}
