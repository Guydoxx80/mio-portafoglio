import { Download, Filter, Plus, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { SECTORS, STRATEGIES, type Sector, type Strategy, type TradeStatus } from "../types";

type FilterStrategy = Strategy | "Tutte";
type FilterSector = Sector | "Tutti";

type TradeTabsProps = {
  activeStatus: TradeStatus;
  alertCount: number;
  counts: Record<TradeStatus, number>;
  searchQuery: string;
  selectedStrategy: FilterStrategy;
  selectedSector: FilterSector;
  lastUpdatedLabel: string;
  onStatusChange: (status: TradeStatus) => void;
  onSearchChange: (value: string) => void;
  onStrategyChange: (value: FilterStrategy) => void;
  onSectorChange: (value: FilterSector) => void;
  onNewTrade: () => void;
  onRefreshPrices: () => void | Promise<void>;
  onExportExcel: () => void;
};

const tabs: Array<{ status: TradeStatus; label: string }> = [
  { status: "open", label: "Trade Aperti" },
  { status: "closed", label: "Storico" },
  { status: "watchlist", label: "In Osservazione" },
];

export function TradeTabs({
  activeStatus,
  alertCount,
  counts,
  searchQuery,
  selectedStrategy,
  selectedSector,
  lastUpdatedLabel,
  onStatusChange,
  onSearchChange,
  onStrategyChange,
  onSectorChange,
  onNewTrade,
  onRefreshPrices,
  onExportExcel,
}: TradeTabsProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <section className="rounded-lg border border-line bg-white shadow-line">
      <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.status}
              className={`relative h-10 shrink-0 rounded-lg px-4 text-sm font-bold transition ${
                activeStatus === tab.status
                  ? "bg-black text-white shadow-line"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={() => onStatusChange(tab.status)}
              type="button"
            >
              {tab.label} ({counts[tab.status]})
              {tab.status === "open" && alertCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {alertCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-bold text-white shadow-line transition hover:bg-slate-800"
            onClick={onNewTrade}
            type="button"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Nuovo Trade
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={onRefreshPrices}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Aggiorna <span className="text-xs font-normal text-slate-400">{lastUpdatedLabel}</span>
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={onExportExcel}
            type="button"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Excel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => setFiltersOpen((value) => !value)}
            type="button"
          >
            <Filter aria-hidden="true" className="h-4 w-4" />
            Filtri
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="grid gap-3 border-b border-line bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="relative block">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Cerca ticker"
              value={searchQuery}
            />
          </label>

          <select
            className="h-10 rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            onChange={(event) => onStrategyChange(event.target.value as FilterStrategy)}
            value={selectedStrategy}
          >
            <option value="Tutte">Tutte le strategie</option>
            {STRATEGIES.map((strategy) => (
              <option key={strategy} value={strategy}>
                {strategy}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            onChange={(event) => onSectorChange(event.target.value as FilterSector)}
            value={selectedSector}
          >
            <option value="Tutti">Tutti i settori</option>
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
}
