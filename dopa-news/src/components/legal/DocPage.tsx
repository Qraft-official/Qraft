import type { ReactNode } from "react";
import { PageHeader } from "@/components/navigation/TopBar";

export function DocSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="card px-4 py-4">
      <h2 className="text-[14px] font-bold text-fg">{heading}</h2>
      <div className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-fg-muted">{children}</div>
    </section>
  );
}

export function DocList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full bg-[#4ef5a3]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DocPage({
  title,
  lead,
  updated,
  backHref = "/me",
  children,
}: {
  title: string;
  lead: string;
  updated: string;
  backHref?: string;
  children: ReactNode;
}) {
  return (
    <main className="pad-nav min-h-dvh">
      <PageHeader title={title} backHref={backHref} />
      <div className="space-y-3 px-4 pt-3.5">
        <p className="text-[13px] leading-relaxed text-fg-muted">{lead}</p>
        {children}
        <p className="px-1 pb-2 text-[11px] text-fg-faint">最終更新: {updated}</p>
      </div>
    </main>
  );
}
