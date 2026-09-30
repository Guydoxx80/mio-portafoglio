import { formatMoney, formatNumber } from "../lib/formatters";

type RiskSummaryCardProps = {
  riskPercent: number;
  riskEuro: number;
  quantity: number;
};

export function RiskSummaryCard({ riskPercent, riskEuro, quantity }: RiskSummaryCardProps) {
  return (
    <div className="risk-summary-card rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-600">Percentuale:</span>
        <strong className="text-lg text-blue-700">{riskPercent.toFixed(1)}%</strong>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-600">Rischio Base:</span>
        <strong className="text-ink">{formatMoney(riskEuro)}</strong>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-600">Quantità calcolata:</span>
        <strong className="text-ink">{quantity > 0 ? formatNumber(quantity, 6) : "-"}</strong>
      </div>
    </div>
  );
}
