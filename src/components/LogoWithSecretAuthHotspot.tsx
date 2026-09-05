"use client";

import { AUTH_ENTRY_PATH } from "@/lib/auth-entry";
import Link from "next/link";

/** Invisible hit target over 「ラ」 only. Not a privilege bypass — navigates to AuthScreen. */
export function LogoWithSecretAuthHotspot({
  className = "text-4xl font-black",
}: {
  className?: string;
}) {
  return (
    <p className={className}>
      Qraft
      <span className="relative ml-1 text-aha">
        ク
        <span className="relative inline-block">
          ラ
          <Link
            href={AUTH_ENTRY_PATH}
            prefetch={false}
            tabIndex={-1}
            aria-hidden="true"
            title=""
            className="absolute left-1/2 top-1/2 z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-default rounded-none border-0 bg-transparent p-0 no-underline shadow-none outline-none hover:bg-transparent hover:opacity-100 focus:outline-none focus-visible:outline-none"
            style={{ background: "transparent", border: "none", boxShadow: "none" }}
          />
        </span>
        フト
      </span>
    </p>
  );
}
