import { Activity, ChartNoAxesColumnIncreasing, CircleGauge, PieChart, ShieldCheck } from "lucide-react";
import { calculateProfitLoss } from "../lib/calculations";
import { formatMoney, formatPercent } from "../lib/formatters";
import type { Sector, Trade } from "../types";
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
  trades: Trade[];
};

export function Dashboard({ activeView, trades }: DashboardProps) {
  const openTrades = trades.filter((trade) => trade.status === "open");
  const investedCapital = openTrades.reduce((sum, trade) => sum + trade.entryPrice * trade.quantity, 0);
  const currentCapital = openTrades.reduce((sum, trade) => sum + trade.currentPrice * trade.quantity, 0);
  const profitLoss = openTrades.reduce((sum, trade) => {
    return sum + calculateProfitLoss(trade.entryPrice, trade.currentPrice, trade.quantity).euro;
  }, 0);
  const riskExposed = openTrades.reduce((sum, trade) => sum + trade.riskEuro, 0);
  const buyingPower = Math.max(0, 20000 - investedCapital);
  const leverage = investedCapital > 0 ? currentCapital / Math.max(investedCapital, 1) : 0;

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

  const bestTrade = openTrades
    .map((trade) => ({ trade, pl: calculateProfitLoss(trade.entryPrice, trade.currentPrice, trade.quantity).euro }))
    .sort((a, b) => b.pl - a.pl)[0];
  const worstTrade = openTrades
    .map((trade) => ({ trade, pl: calculateProfitLoss(trade.entryPrice, trade.currentPrice, trade.quantity).euro }))
    .sort((a, b) => a.pl - b.pl)[0];

  if (activeView === "risk") {
    return <RiskDashboard trades={trades} />;
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 rounded-lg border border-line bg-white shadow-line">
        {activeView === "titles" ? <TitlesDonutChart trades={trades} /> : <DonutChart data={sectorData} />}
      </div>

      <aside className="min-w-0 space-y-4">
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-line">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
            <Activity aria-hidden="true" className="h-4 w-4" />
            P/L GIORNALIERO
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className={`text-2xl font-semibold ${profitLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {profitLoss >= 0 ? "+" : ""}
              {formatMoney(profitLoss)}
            </p>
            <span className="rounded-md bg-emerald-100 px-2 py-1 text-sm font-bold text-emerald-700">
              {formatPercent(investedCapital ? (profitLoss / investedCapital) * 100 : 0)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Best <b className="text-emerald-700">{bestTrade?.trade.ticker ?? "-"}</b>{" "}
              <span className="text-emerald-700">{bestTrade ? formatMoney(bestTrade.pl) : formatMoney(0)}</span>
            </span>
            <span>
              Worst <b className="text-red-700">{worstTrade?.trade.ticker ?? "-"}</b>{" "}
              <span className="text-red-700">{worstTrade ? formatMoney(worstTrade.pl) : formatMoney(0)}</span>
            </span>
          </div>
        </section>

        <StatCard title="Panoramica Portfolio" icon={<PieChart aria-hidden="true" className="h-4 w-4" />}>
          <div className="space-y-3 text-sm">
            <Row label="Saldo corrente" value={formatMoney(currentCapital + buyingPower)} />
            <Row label="Capitale iniziale" value={formatMoney(20000)} muted />
            <Row
              label="P/L Non Realizzato"
              value={`${profitLoss >= 0 ? "+" : ""}${formatMoney(profitLoss)} (${formatPercent(
                investedCapital ? (profitLoss / investedCapital) * 100 : 0,
              )})`}
              tone={profitLoss >= 0 ? "positive" : "negative"}
            />
            <div>
              <Row label="Esposizione al rischio" value={formatMoney(riskExposed)} />
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min((riskExposed / 20000) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>{((riskExposed / 20000) * 100).toFixed(1)}% del capitale</span>
                <span>Max/Trade: {formatMoney(1000)}</span>
              </div>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              Nessun alert, tutto nella norma
            </div>
          </div>
        </StatCard>

        <StatCard title="Stats Rapide" icon={<CircleGauge aria-hidden="true" className="h-4 w-4" />}>
          <div className="space-y-3 text-sm">
            <Row label="Rischio Esposto" value={formatMoney(riskExposed)} />
            <Row label="P/L Corrente" value={formatMoney(profitLoss)} tone={profitLoss >= 0 ? "positive" : "negative"} />
            <div className="border-t border-line pt-3">
              <Row label="Capitale Investito" value={formatMoney(investedCapital)} />
            </div>
            <Row label="Buying Power" value={formatMoney(buyingPower)} tone="positive" />
            <Row label="Leverage" value={`${leverage.toFixed(2)}x / 1x`} tone={leverage <= 1 ? "positive" : "negative"} />
          </div>
        </StatCard>

        <StatCard
          title="Metriche Avanzate"
          icon={<ChartNoAxesColumnIncreasing aria-hidden="true" className="h-4 w-4" />}
          collapsed
        >
          <span />
        </StatCard>
        <StatCard title="Performance" icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />} collapsed>
          <span />
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
};

function Row({ label, value, muted, tone }: RowProps) {
  const toneClass = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-ink";

  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-xs ${muted ? "text-slate-400" : "text-slate-600"}`}>{label}</span>
      <span className={`text-right font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}
