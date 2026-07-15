import { Activity, AlertTriangle, CircleGauge, PieChart, Settings, Wallet } from "lucide-react";
import { calculateProfitLoss } from "../lib/calculations";
import { formatMoney, formatPercent } from "../lib/formatters";
import type { PortfolioSettings, Sector, Trade } from "../types";
import { DonutChart } from "./DonutChart";
import type { VisualView } from "./Header";
import { RiskDashboard } from "./RiskDashboard";
import { StatCard } from "./StatCard";
import { TitlesDonutChart } from "./TitlesDonutChart";

const sectorColors: Record<Sector, string> = {
  Technology: "#7c83f4",
  Healthcare: "#34d399",
  "Financial Services": "#f59e0b",
  "Consumer Cyclical": "#f97316",
  "Communication Services": "#38bdf8",
  Industrials: "#cbd5e1",
  "Consumer Defensive": "#a3e635",
  Energy: "#fb6681",
  Utilities: "#14b8a6",
  "Real Estate": "#a78bfa",
  "Basic Materials": "#94a3b8",
  Cryptocurrency: "#facc15",
  "ETF / Fund": "#60a5fa",
  Altro: "#d4d4d8",
};

type DashboardProps = {
  activeView: VisualView;
  onOpenCapital: () => void;
  onOpenSettings: () => void;
  settings: PortfolioSettings;
  trades: Trade[];
};

export function Dashboard({ activeView, onOpenCapital, onOpenSettings, settings, trades }: DashboardProps) {
  const openTrades = trades.filter((trade) => trade.status === "open");
  const closedTrades = trades.filter((trade) => trade.status === "closed");
  const totalCapital = settings.initialCapital + settings.capitalAdditions.reduce((sum, addition) => sum + addition.amount, 0);
  const maxTradeRisk = settings.maxTradeRisk || (settings.portfolioDivisor > 0 ? totalCapital / settings.portfolioDivisor : 0);
  const investedCapital = openTrades.reduce((sum, trade) => sum + trade.entryPrice * trade.quantity, 0);
  const profitLoss = openTrades.reduce((sum, trade) => {
    return sum + calculateProfitLoss(trade.entryPrice, trade.currentPrice, trade.quantity).euro;
  }, 0);
  const realizedProfitLoss = closedTrades.reduce((sum, trade) => {
    return sum + calculateProfitLoss(trade.entryPrice, trade.currentPrice, trade.quantity).euro;
  }, 0);
  const totalProfitLoss = profitLoss + realizedProfitLoss;
  const riskExposed = openTrades.reduce((sum, trade) => sum + trade.riskEuro, 0);
  const buyingPower = totalCapital * settings.maxLeverage - investedCapital;
  const leverage = investedCapital / totalCapital;
  const accountBalance = totalCapital + profitLoss;
  const riskPercent = (riskExposed / totalCapital) * 100;
  const profitLossPercent = investedCapital ? (profitLoss / investedCapital) * 100 : 0;
  const realizedProfitLossPercent = totalCapital ? (realizedProfitLoss / totalCapital) * 100 : 0;
  const totalProfitLossPercent = totalCapital ? (totalProfitLoss / totalCapital) * 100 : 0;
  const alertCount = [buyingPower < 0, riskExposed > maxTradeRisk, leverage > settings.maxLeverage].filter(Boolean).length;

  const dailyTrades = openTrades.map((trade) => {
    const previousPrice = trade.dailyOpen ?? trade.dailyClose ?? trade.currentPrice;
    const currentPrice = trade.dailyClose ?? trade.currentPrice;
    return {
      trade,
      dailyProfitLoss: (currentPrice - previousPrice) * trade.quantity,
    };
  });
  const dailyProfitLoss = dailyTrades.reduce((sum, item) => sum + item.dailyProfitLoss, 0);
  const dailyProfitLossPercent = investedCapital ? (dailyProfitLoss / investedCapital) * 100 : 0;

  const sectorData = Object.entries(
    openTrades.reduce<Record<string, { value: number; positions: number; profitLoss: number }>>((groups, trade) => {
      const sectorGroup = groups[trade.sector] ?? { value: 0, positions: 0, profitLoss: 0 };
      const tradeProfitLoss = calculateProfitLoss(trade.entryPrice, trade.currentPrice, trade.quantity).euro;

      groups[trade.sector] = {
        value: sectorGroup.value + trade.currentPrice * trade.quantity,
        positions: sectorGroup.positions + 1,
        profitLoss: sectorGroup.profitLoss + tradeProfitLoss,
      };

      return groups;
    }, {}),
  )
    .map(([sector, group]) => ({
      sector: sector as Sector,
      value: group.value,
      positions: group.positions,
      profitLoss: group.profitLoss,
      color: sectorColors[sector as Sector],
    }))
    .sort((a, b) => b.value - a.value);

  const bestTrade = [...dailyTrades].sort((a, b) => b.dailyProfitLoss - a.dailyProfitLoss)[0];
  const worstTrade = [...dailyTrades].sort((a, b) => a.dailyProfitLoss - b.dailyProfitLoss)[0];

  if (activeView === "risk") {
    return <RiskDashboard trades={trades} />;
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 rounded-lg border border-line bg-white shadow-line">
        {activeView === "titles" ? <TitlesDonutChart trades={trades} /> : <DonutChart data={sectorData} />}
      </div>

      <aside className="min-w-0 space-y-4">
        <section className="rounded-[14px] border border-emerald-200 bg-emerald-50 p-4 shadow-line">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
            <Activity aria-hidden="true" className="h-4 w-4 text-emerald-600" />
            P/L GIORNALIERO
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className={`font-mono text-2xl font-bold ${dailyProfitLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {signedMoney(dailyProfitLoss)}
            </p>
            <span
              className={`rounded-lg px-3 py-1 font-mono text-sm font-bold ${
                dailyProfitLoss >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}
            >
              {formatPercent(dailyProfitLossPercent)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100 pt-3 text-xs text-slate-500">
            <span>
              Best <b className="text-emerald-700">{bestTrade?.trade.ticker ?? "-"}</b>{" "}
              <span className="font-mono text-emerald-700">
                {bestTrade ? signedMoney(bestTrade.dailyProfitLoss) : formatMoney(0)}
              </span>
            </span>
            <span>
              Worst <b className="text-red-700">{worstTrade?.trade.ticker ?? "-"}</b>{" "}
              <span className="font-mono text-red-700">{worstTrade ? signedMoney(worstTrade.dailyProfitLoss) : formatMoney(0)}</span>
            </span>
          </div>
        </section>

        <StatCard title="Panoramica Portfolio" icon={<PieChart aria-hidden="true" className="h-5 w-5" />}>
          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">Saldo corrente</p>
              <p className="text-right font-mono text-2xl font-bold text-ink">{formatMoney(accountBalance)}</p>
            </div>

            <div className="space-y-1">
              <Row label="Capitale versato" value={formatMoney(totalCapital)} muted />
              <Row
                label="P/L Non Realizzato"
                value={`${signedMoney(profitLoss)} (${formatPercent(profitLossPercent)})`}
                tone={profitLoss >= 0 ? "positive" : "negative"}
              />
              <Row
                label="P/L Realizzato"
                value={`${signedMoney(realizedProfitLoss)} (${formatPercent(realizedProfitLossPercent)})`}
                tone={realizedProfitLoss >= 0 ? "positive" : "negative"}
              />
            </div>

            <div className="border-t border-line pt-1">
              <Row
                label="P/L Totale"
                value={`${signedMoney(totalProfitLoss)} (${formatPercent(totalProfitLossPercent)})`}
                tone={totalProfitLoss >= 0 ? "positive" : "negative"}
                strong
              />
            </div>

            <div className="space-y-2 pt-2">
              <Row label="Esposizione al rischio" value={formatMoney(riskExposed)} />
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(riskPercent, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{riskPercent.toFixed(1)}% del capitale</span>
                <span>Max/Trade: {formatMoney(maxTradeRisk)}</span>
              </div>
            </div>

            {alertCount > 0 ? (
              <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-600">
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                  {alertCount} Alert Attivi
                </span>
                <span>Vai →</span>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                Nessun alert, tutto nella norma
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-50 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                onClick={onOpenSettings}
                type="button"
              >
                <Settings aria-hidden="true" className="h-4 w-4" />
                Impostazioni
              </button>
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-50 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                onClick={onOpenCapital}
                type="button"
              >
                <Wallet aria-hidden="true" className="h-4 w-4" />
                Capitale
              </button>
            </div>
          </div>
        </StatCard>

        <StatCard title="Stats Rapide" icon={<CircleGauge aria-hidden="true" className="h-5 w-5" />}>
          <div className="space-y-4 text-sm">
            <Row label="Rischio Esposto" value={formatMoney(riskExposed)} />
            <Row label="P/L Corrente" value={formatMoney(profitLoss)} tone={profitLoss >= 0 ? "positive" : "negative"} />
            <div className="border-t border-line pt-4">
              <Row label="Capitale Investito" value={formatMoney(investedCapital)} />
            </div>
            <Row label="Buying Power" value={formatMoney(buyingPower)} tone={buyingPower >= 0 ? "positive" : "negative"} />
            <Row
              label="Leverage"
              value={`${leverage.toFixed(2)}x / ${settings.maxLeverage}x`}
              tone={leverage <= settings.maxLeverage ? "positive" : "negative"}
            />
          </div>
        </StatCard>
      </aside>
    </section>
  );
}

type RowProps = {
  label: string;
  value: string;
  muted?: boolean;
  tone?: "positive" | "negative";
  strong?: boolean;
};

function Row({ label, value, muted, tone, strong }: RowProps) {
  const toneClass = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-ink";

  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`${strong ? "text-sm font-bold" : "text-xs"} ${muted ? "text-slate-400" : "text-slate-600"}`}>
        {label}
      </span>
      <span className={`text-right font-mono ${strong ? "text-sm font-bold" : "font-semibold"} ${toneClass}`}>{value}</span>
    </div>
  );
}

function signedMoney(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatMoney(value)}`;
}
