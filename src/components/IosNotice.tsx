"use client";

import { IOS_NOTICE } from "@/lib/constants";
import { useEffect, useState } from "react";

const KEY = "qraft.iosNoticeHidden";

export function IosNotice() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  return (
    <div className="mx-4 mt-2 flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2">
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-sky-100">{IOS_NOTICE}</p>
      <button
        type="button"
        className="tap-target flex shrink-0 items-center justify-center text-xs font-bold text-sky-200"
        aria-label="お知らせを閉じる"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* ignore */
          }
        }}
      >
        閉じる
      </button>
    </div>
  );
}
