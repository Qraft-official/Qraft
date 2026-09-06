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
      <div className="flex h-10 shrink-0 items-center gap-1 px-2 md:h-auto md:gap-1.5 md:px-3 md:py-1">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onIndex(i)}
              className={`h-8 min-w-8 rounded-md text-xs font-bold md:h-11 md:min-w-11 md:rounded-lg md:text-sm ${
                i === index ? "bg-neon text-white glow-purple" : "bg-white/10 text-muted"
              }`}
              aria-label={`${i + 1}ページ`}
              aria-current={i === index}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onAddPage}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-aha md:hidden"
          aria-label="ページ追加"
        >
          <Plus size={14} />
        </button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onAddPage}
          className="hidden h-9 items-center gap-1 rounded-full border border-gray-700 px-2.5 text-xs font-bold text-white hover:bg-white/10 md:flex"
          aria-label="ページ追加"
        >
          <Plus size={14} /> ページ
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
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-white md:h-11 md:w-11"
              aria-label="縮小"
              title="縮小"
            >
              <Minimize2 size={16} />
            </button>
          ) : (
            <NotebookExpandButton onClick={onToggleExpand} className="h-8 w-8 md:h-11 md:w-11" />
          ))}
        <button
          type="button"
          onClick={onDeletePage}
          disabled={pages.length <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white/10 disabled:opacity-30 md:h-11 md:w-11"
          aria-label="このページを削除"
          title="このページを削除"
        >
          <Trash2 size={16} />
        </button>
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
