import { Check } from "lucide-react";
import { formatMoney } from "../lib/formatters";
import type { Trade } from "../types";

type RiskDashboardProps = {
  trades: Trade[];
};

const initialCapital = 20000;
const maxLeverage = 1;

export function RiskDashboard({ trades }: RiskDashboardProps) {
  const openTrades = trades.filter((trade) => trade.status === "open");
  const investedCapital = openTrades.reduce((sum, trade) => sum + trade.entryPrice * trade.quantity, 0);
  const riskExposed = openTrades.reduce((sum, trade) => sum + trade.riskEuro, 0);
  const buyingPowerTotal = initialCapital * maxLeverage;
  const available = Math.max(0, buyingPowerTotal - investedCapital);
  const leverageUsed = buyingPowerTotal > 0 ? investedCapital / buyingPowerTotal : 0;
  const investedPercent = Math.min(leverageUsed * 100, 100);
  const riskPercent = initialCapital > 0 ? (riskExposed / initialCapital) * 100 : 0;

  return (
    <section className="grid min-h-[520px] items-center gap-8 rounded-lg border border-line bg-white px-6 py-8 shadow-line lg:grid-cols-[minmax(0,1fr)_540px] lg:px-10">
      <RiskGauge riskPercent={riskPercent} />

      <div className="space-y-5">
        <section className="rounded-[22px] border border-indigo-200 bg-indigo-50/70 p-7">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-indigo-700">Buying Power Totale</p>
            <span className="rounded-full bg-indigo-100 px-4 py-1 text-sm font-bold text-indigo-700">{maxLeverage}x leva</span>
          </div>
          <p className="mt-6 font-mono text-4xl font-bold text-ink">{formatMoney(buyingPowerTotal)}</p>
          <p className="mt-2 font-mono text-sm text-indigo-700">
            {formatMoney(initialCapital)} x {maxLeverage}x
          </p>
        </section>

        <section className="rounded-[22px] border border-emerald-200 bg-emerald-50/80 p-7">
          <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.14em] text-emerald-700">
            <Check aria-hidden="true" className="h-4 w-4" />
            Disponibile
          </div>
          <p className="mt-5 font-mono text-4xl font-bold text-emerald-700">{formatMoney(available)}</p>
        </section>

        <section className="rounded-[22px] border border-line bg-slate-50 p-7">
          <div className="flex items-center justify-between gap-4">
            <p className="text-base font-semibold text-slate-600">Utilizzo Leva</p>
            <p className="font-mono text-lg font-bold text-emerald-700">
              {leverageUsed.toFixed(2)}x / {maxLeverage}x
            </p>
          </div>
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${investedPercent}%` }} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 font-mono text-sm">
            <span className="text-slate-400">Investito: {formatMoney(investedCapital)}</span>
            <span className="text-slate-600">{investedPercent.toFixed(1)}%</span>
          </div>
        </section>
      </div>
    </section>
  );
}

function RiskGauge({ riskPercent }: { riskPercent: number }) {
  const clampedRisk = Math.max(0, Math.min(riskPercent, 30));
  const needleAngle = 180 - (clampedRisk / 30) * 180;
  const needleEnd = polarPoint(needleAngle, 124);
  const riskLabel = riskPercent < 10 ? "Basso" : riskPercent < 20 ? "Medio" : "Alto";
  const riskTone = riskPercent < 10 ? "text-emerald-500" : riskPercent < 20 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="flex min-w-0 justify-center">
      <svg className="h-auto w-full max-w-[520px] overflow-visible" viewBox="0 0 360 260" role="img" aria-label={`Rischio portfolio ${riskPercent.toFixed(1)}%`}>
        <defs>
          <filter height="160%" id="riskSoftGlow" width="160%" x="-30%" y="-30%">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="6" />
            <feColorMatrix
              in="blur"
              result="glow"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .25 0"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path d={arcPath(180, 120, 166, 28)} fill="none" stroke="#34d399" strokeLinecap="butt" strokeWidth="28" />
        <path d={arcPath(120, 66, 166, 28)} fill="none" stroke="#fbbf24" strokeLinecap="butt" strokeWidth="28" />
        <path d={arcPath(66, 26, 166, 28)} fill="none" stroke="#fb923c" strokeLinecap="butt" strokeWidth="28" />
        <path d={arcPath(26, 0, 166, 28)} fill="none" stroke="#fb6681" strokeLinecap="butt" strokeWidth="28" />

        {Array.from({ length: 33 }).map((_, index) => {
          const angle = 180 - (index / 32) * 180;
          const outer = polarPoint(angle, 132);
          const inner = polarPoint(angle, index % 4 === 0 ? 112 : 120);
          const color = angle > 120 ? "#34d399" : angle > 66 ? "#fbbf24" : angle > 26 ? "#fb923c" : "#fb6681";

          return (
            <line
              key={angle}
              stroke={color}
              strokeLinecap="butt"
              strokeWidth={index % 4 === 0 ? 2.4 : 1.6}
              x1={inner.x}
              x2={outer.x}
              y1={inner.y}
              y2={outer.y}
            />
          );
        })}

        <line filter="url(#riskSoftGlow)" stroke="#34d399" strokeLinecap="round" strokeWidth="2.4" x1="180" x2={needleEnd.x} y1="206" y2={needleEnd.y} />
        <circle cx="180" cy="206" fill="#34d399" r="8" />

        <text fill="#64748b" fontFamily="monospace" fontSize="13" fontWeight="700" letterSpacing="2" textAnchor="middle" x="180" y="20">
          {riskLabel}
        </text>
        <text className={riskTone} fill="currentColor" fontFamily="monospace" fontSize="46" fontWeight="800" textAnchor="middle" x="180" y="218">
          {riskPercent.toFixed(1)}%
        </text>
        <text fill="#64748b" fontSize="15" fontWeight="700" textAnchor="middle" x="180" y="246">
          Rischio Portafoglio
        </text>
        <text fill="#64748b" fontSize="13" fontWeight="700" textAnchor="middle" x="33" y="246">
          Basso
        </text>
        <text fill="#64748b" fontSize="13" fontWeight="700" textAnchor="middle" x="324" y="246">
          Alto
        </text>
      </svg>
    </div>
  );
}

function arcPath(startAngle: number, endAngle: number, radius: number, offsetY = 0): string {
  const start = polarPoint(startAngle, radius, offsetY);
  const end = polarPoint(endAngle, radius, offsetY);
  const largeArcFlag = Math.abs(startAngle - endAngle) > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function polarPoint(angle: number, radius: number, offsetY = 0): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;

  return {
    x: Number((180 + radius * Math.cos(radians)).toFixed(2)),
    y: Number((206 - offsetY - radius * Math.sin(radians)).toFixed(2)),
  };
}
