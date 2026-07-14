import { BarChart3, CandlestickChart, Moon, Shield, Sun } from "lucide-react";

export type VisualView = "sector" | "titles" | "risk";

const navItems = [
  { id: "sector", label: "Settore", icon: CandlestickChart },
  { id: "titles", label: "Titoli", icon: BarChart3 },
  { id: "risk", label: "Rischio", icon: Shield },
] satisfies Array<{
  id: VisualView;
  label: string;
  icon: typeof CandlestickChart;
}>;

const enabledViews: VisualView[] = ["sector", "titles", "risk"];

const viewTitles: Record<VisualView, string> = {
  sector: "Analisi Visuale",
  titles: "Titoli",
  risk: "Rischio",
};

type HeaderProps = {
  openCount: number;
  closedCount: number;
  activeView: VisualView;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onViewChange: (view: VisualView) => void;
};

export function Header({ openCount, closedCount, activeView, isDarkTheme, onToggleTheme, onViewChange }: HeaderProps) {
  const ThemeIcon = isDarkTheme ? Moon : Sun;

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-white/86 backdrop-blur">
      <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-ink sm:text-2xl">{viewTitles[activeView]}</h1>
            <p className="text-xs text-muted">
              {openCount} aperti / {closedCount} chiusi
            </p>
          </div>
        </div>

        <nav className="hidden min-w-0 flex-1 justify-end lg:flex">
          <div className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-line bg-slate-50 p-1">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = activeView === id;
              const isEnabled = enabledViews.includes(id);

              return (
                <button
                  key={label}
                  className={`flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow-line"
                      : isEnabled
                        ? "bg-white text-slate-600 hover:bg-slate-100 hover:text-ink"
                        : "bg-white text-slate-400 opacity-70"
                  }`}
                  disabled={!isEnabled}
                  onClick={() => {
                    if (isEnabled) {
                      onViewChange(id);
                    }
                  }}
                  type="button"
                  title={label}
                >
                  <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            className={`flex h-9 items-center gap-2 rounded-full border px-4 text-xs font-semibold shadow-line transition ${
              isDarkTheme
                ? "border-slate-700 bg-slate-800 text-white hover:border-slate-600"
                : "border-line bg-white text-ink hover:border-slate-300"
            }`}
            onClick={onToggleTheme}
            type="button"
            title={isDarkTheme ? "Tema scuro" : "Tema chiaro"}
          >
            <ThemeIcon
              aria-hidden="true"
              className={`h-4 w-4 ${isDarkTheme ? "fill-amber-300 text-amber-300" : "fill-amber-300 text-amber-500"}`}
            />
            {isDarkTheme ? "Dark" : "Light"}
          </button>
        </div>
      </div>
    </header>
  );
}
