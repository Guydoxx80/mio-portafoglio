import { ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

type StatCardProps = {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  collapsed?: boolean;
};

export function StatCard({ title, children, icon, collapsed = false }: StatCardProps) {
  return (
    <section className="rounded-[14px] border border-line bg-white p-5 shadow-line">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
        </div>
        <ChevronUp aria-hidden="true" className="h-4 w-4 text-slate-400" />
      </div>
      {!collapsed && <div className="mt-5">{children}</div>}
    </section>
  );
}
