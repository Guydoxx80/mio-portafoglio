import type { ReactNode } from "react";

type StatCardProps = {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  collapsed?: boolean;
};

export function StatCard({ title, children, icon, collapsed = false }: StatCardProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-line">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-bold text-ink">{title}</h2>
        </div>
        <span className="text-slate-400">⌄</span>
      </div>
      {!collapsed && <div className="mt-4">{children}</div>}
    </section>
  );
}
