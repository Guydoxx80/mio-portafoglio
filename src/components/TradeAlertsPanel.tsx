import { AlertTriangle } from "lucide-react";
import { formatDate, formatMoney } from "../lib/formatters";
import type { TradeAlert } from "../lib/tradeAlerts";

type TradeAlertsPanelProps = {
  alerts: TradeAlert[];
  onConfirm: (alertKey: string) => void;
};

export function TradeAlertsPanel({ alerts, onConfirm }: TradeAlertsPanelProps) {
  if (alerts.length === 0) {
    return null;
  }

  const title = `${alerts.length} Alert ${alerts.length === 1 ? "Attivo" : "Attivi"}`;

  return (
    <section className="overflow-hidden rounded-xl border border-orange-200 bg-orange-50 shadow-line">
      <header className="flex items-center justify-between gap-4 border-b border-orange-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <AlertTriangle aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-ink">{title}</h3>
            <p className="text-xs text-slate-500">Trade vicini a TP o SL</p>
          </div>
        </div>
        <span className="rounded-full border border-orange-300 bg-orange-100 px-3 py-1 text-xs font-bold uppercase text-orange-600">
          ● Live
        </span>
      </header>

      <div className="space-y-2 p-3">
        {alerts.map((alert) => (
          <article
            className="grid items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 shadow-sm sm:grid-cols-[auto_1fr_auto_auto_auto]"
            key={alert.key}
          >
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                alert.kind === "TP" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              }`}
            >
              {alert.kind}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-ink">{alert.ticker}</p>
              <p className="font-mono text-xs text-slate-500">{formatMoney(alert.currentPrice)}</p>
            </div>
            <div className="font-mono text-xs text-slate-500">
              Target <span className={alert.kind === "TP" ? "font-bold text-emerald-600" : "font-bold text-red-600"}>
                {formatMoney(alert.targetPrice)}
              </span>
            </div>
            <div className="font-mono text-xs text-slate-400">{formatDate(alert.openDate).slice(0, 5)}</div>
            <button
              className="h-9 rounded-lg bg-orange-500 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600"
              onClick={() => onConfirm(alert.key)}
              type="button"
            >
              Conferma
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
