import { ArrowDownUp, CheckCircle2, Eye, MoreVertical, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { calculateProfitLoss } from "../lib/calculations";
import { formatDate, formatMoney, formatNumber, formatPercent, formatTime } from "../lib/formatters";
import type { SortDirection, SortKey, Trade, TradeStatus } from "../types";

type TradeTableProps = {
  trades: Trade[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSortChange: (key: SortKey) => void;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (tradeId: string) => void;
  onChangeStatus: (tradeId: string, status: TradeStatus) => void;
};

const sortableHeaders: Array<{ key: SortKey; label: string; className?: string }> = [
  { key: "openDate", label: "Apertura" },
  { key: "ticker", label: "Ticker" },
  { key: "strategy", label: "Strategia", className: "hidden md:table-cell" },
  { key: "quantity", label: "Pezzi" },
  { key: "entryPrice", label: "Entry" },
  { key: "currentPrice", label: "Corrente" },
  { key: "riskEuro", label: "Rischio" },
  { key: "profitLoss", label: "P/L" },
];

export function TradeTable({
  trades,
  sortKey,
  sortDirection,
  onSortChange,
  onEditTrade,
  onDeleteTrade,
  onChangeStatus,
}: TradeTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-muted shadow-line">
        Nessun trade per i filtri selezionati.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-line">
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold text-ink">
            <tr>
              {sortableHeaders.map((header) => (
                <th key={header.key} className={`border-b border-line px-4 py-3 ${header.className ?? ""}`}>
                  <button
                    className="inline-flex items-center gap-1 text-left"
                    onClick={() => onSortChange(header.key)}
                    type="button"
                  >
                    {header.label}
                    <ArrowDownUp
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 ${
                        sortKey === header.key ? "text-blue-600" : "text-slate-400"
                      } ${sortKey === header.key && sortDirection === "desc" ? "rotate-180" : ""}`}
                    />
                  </button>
                </th>
              ))}
              <th className="border-b border-line px-4 py-3">SL / TP</th>
              <th className="border-b border-line px-4 py-3">Trend</th>
              <th className="border-b border-line px-4 py-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const profitLoss = calculateProfitLoss(trade.entryPrice, trade.currentPrice, trade.quantity);
              const isPositive = profitLoss.euro >= 0;
              const firstTargetLevel = trade.takeProfits.find((level) => level.price) ?? trade.takeProfits[0];
              const firstTarget = firstTargetLevel?.price
                ? formatMoney(firstTargetLevel.price)
                : firstTargetLevel?.label ?? "-";

              return (
                <tr key={trade.id} className="border-b border-line last:border-0 hover:bg-slate-50/80">
                  <td className="px-4 py-4 align-middle">
                    <div className="font-mono text-xs text-ink">{formatDate(trade.openDate)}</div>
                    <div className="font-mono text-xs text-slate-500">{formatTime(trade.openDate)}</div>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="text-base font-bold text-ink">{trade.ticker}</div>
                    <div className="text-xs text-slate-500">{trade.sector}</div>
                  </td>
                  <td className="hidden px-4 py-4 align-middle md:table-cell">
                    <span className="whitespace-nowrap rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      {trade.strategy}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-middle font-mono text-xs text-ink">{formatNumber(trade.quantity, 6)}</td>
                  <td className="px-4 py-4 align-middle font-mono text-xs text-ink">{formatMoney(trade.entryPrice)}</td>
                  <td
                    className={`px-4 py-4 align-middle font-mono text-xs font-bold ${
                      trade.currentPrice >= trade.entryPrice ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {formatMoney(trade.currentPrice)}
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="font-mono text-xs font-bold text-ink">{formatMoney(trade.riskEuro)}</div>
                    <div className="font-mono text-xs text-blue-600">{trade.riskPercent}%</div>
                  </td>
                  <td className="px-4 py-4 text-center align-middle">
                    <div className={`font-mono text-sm font-bold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                      {isPositive ? "+" : ""}
                      {formatMoney(profitLoss.euro)}
                    </div>
                    <div className={`font-mono text-xs ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                      {formatPercent(profitLoss.percent)}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="font-mono text-xs">
                      <span className="font-bold text-red-600">{formatMoney(trade.stopLoss)}</span>
                      <span className="mx-1 text-slate-400">/</span>
                      <span className="font-bold text-emerald-600">{firstTarget}</span>
                      {trade.takeProfits.length > 1 && <span className="ml-1 text-slate-400">+{trade.takeProfits.length - 1}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <Sparkline ticker={trade.ticker} trendPercent={profitLoss.percent} />
                  </td>
                  <td className="relative px-4 py-4 text-right align-middle">
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-ink"
                      onClick={() => setOpenMenuId(openMenuId === trade.id ? null : trade.id)}
                      type="button"
                      title="Azioni"
                    >
                      <MoreVertical aria-hidden="true" className="h-4 w-4" />
                    </button>

                    {openMenuId === trade.id && (
                      <div className="absolute right-4 top-12 z-20 w-48 overflow-hidden rounded-lg border border-line bg-white py-1 text-left shadow-soft">
                        <ActionButton
                          icon={<Pencil aria-hidden="true" className="h-4 w-4" />}
                          label="Modifica"
                          onClick={() => {
                            setOpenMenuId(null);
                            onEditTrade(trade);
                          }}
                        />
                        {trade.status === "open" && (
                          <>
                            <ActionButton
                              icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
                              label="Chiudi trade"
                              onClick={() => {
                                setOpenMenuId(null);
                                onChangeStatus(trade.id, "closed");
                              }}
                            />
                            <ActionButton
                              icon={<Eye aria-hidden="true" className="h-4 w-4" />}
                              label="Osserva"
                              onClick={() => {
                                setOpenMenuId(null);
                                onChangeStatus(trade.id, "watchlist");
                              }}
                            />
                          </>
                        )}
                        {trade.status !== "open" && (
                          <ActionButton
                            icon={<RotateCcw aria-hidden="true" className="h-4 w-4" />}
                            label="Riapri"
                            onClick={() => {
                              setOpenMenuId(null);
                              onChangeStatus(trade.id, "open");
                            }}
                          />
                        )}
                        <ActionButton
                          danger
                          icon={<Trash2 aria-hidden="true" className="h-4 w-4" />}
                          label="Elimina"
                          onClick={() => {
                            setOpenMenuId(null);
                            onDeleteTrade(trade.id);
                          }}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type ActionButtonProps = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
};

function ActionButton({ label, icon, onClick, danger = false }: ActionButtonProps) {
  return (
    <button
      className={`flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold transition ${
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50 hover:text-ink"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

type SparklineProps = {
  ticker: string;
  trendPercent: number;
};

function Sparkline({ ticker, trendPercent }: SparklineProps) {
  const points = useMemo(() => {
    const seed = ticker.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const width = 88;
    const height = 28;
    const baseline = trendPercent >= 0 ? 17 : 12;
    const values = Array.from({ length: 16 }, (_, index) => {
      const wave = Math.sin((seed + index * 7) * 0.55) * 5;
      const drift = (index / 15) * (trendPercent >= 0 ? -8 : 8);
      return baseline + wave + drift;
    });

    return values
      .map((value, index) => {
        const x = (index / 15) * width;
        const y = Math.max(2, Math.min(height - 2, value));
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [ticker, trendPercent]);

  const color = trendPercent >= 0 ? "#10b981" : "#ef4444";

  return (
    <div className="w-[92px]">
      <svg aria-hidden="true" className="h-8 w-[92px]" viewBox="0 0 92 32">
        <polyline fill="none" points={points} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
      <div className={`text-center font-mono text-xs ${trendPercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
        {formatPercent(trendPercent)}
      </div>
    </div>
  );
}
