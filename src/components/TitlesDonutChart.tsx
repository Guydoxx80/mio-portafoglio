import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { calculateProfitLoss } from "../lib/calculations";
import { formatMoney, formatPercent } from "../lib/formatters";
import type { Sector, Trade } from "../types";

type TitleDatum = {
  ticker: string;
  sector: Sector;
  value: number;
  quantity: number;
  currentPrice: number;
  weightPercent: number;
  profitLossEuro: number;
  profitLossPercent: number;
  color: string;
};

type TitleSlice = {
  item: TitleDatum;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  outerRadius: number;
  lineStart: Point;
  lineTurn: Point;
  lineEnd: Point;
  label: Point;
  textX: number;
  labelAnchor: "start" | "end";
};

type Point = {
  x: number;
  y: number;
};

type TooltipState = {
  item: TitleDatum;
  x: number;
  y: number;
};

type TitlesDonutChartProps = {
  trades: Trade[];
};

const center = 180;
const innerRadius = 62;
const minOuterRadius = 72;
const maxOuterRadius = 128;
const labelRadius = 166;
const gapAngle = 5;

const palette = ["#fb6681", "#cbd5e1", "#7c83f4", "#38bdf8", "#cbd5e1", "#7c83f4", "#34d399"];

export function TitlesDonutChart({ trades }: TitlesDonutChartProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const data = buildTitleData(trades);
  const slices = buildTitleSlices(data);

  if (!data.length) {
    return (
      <div className="flex min-h-[520px] items-center justify-center text-sm text-muted">
        Nessun titolo aperto da visualizzare
      </div>
    );
  }

  function updateTooltip(event: MouseEvent<SVGPathElement>, item: TitleDatum): void {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return;

    setTooltip({
      item,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }

  return (
    <div className="flex min-h-[420px] min-w-0 flex-col items-center justify-center gap-6 px-4 py-10 sm:min-h-[520px]">
      <div
        className="relative h-[min(360px,calc(100vw-56px))] w-[min(360px,calc(100vw-56px))] max-w-full sm:h-[540px] sm:w-[720px]"
        ref={wrapperRef}
      >
        <svg className="h-full w-full overflow-visible drop-shadow-sm" viewBox="0 0 360 360">
          <defs>
            <filter height="180%" id="titleGlow" width="180%" x="-40%" y="-40%">
              <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="5" />
              <feColorMatrix
                in="blur"
                result="softGlow"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .22 0"
              />
              <feMerge>
                <feMergeNode in="softGlow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            cx={center}
            cy={center}
            fill="transparent"
            r={(minOuterRadius + innerRadius) / 2}
            stroke="#eef2f7"
            strokeWidth={minOuterRadius - innerRadius}
          />

          {slices.map((slice) => (
            <g key={slice.item.ticker}>
              <polyline
                className="hidden sm:block"
                fill="none"
                points={`${slice.lineStart.x},${slice.lineStart.y} ${slice.lineTurn.x},${slice.lineTurn.y} ${slice.lineEnd.x},${slice.lineEnd.y}`}
                stroke="#94a3b8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.3"
              />
              <text
                className="hidden sm:block"
                fill="#0f172a"
                fontSize="7.4"
                fontWeight="800"
                textAnchor={slice.labelAnchor}
                x={slice.textX}
                y={slice.label.y}
              >
                {slice.item.ticker}
              </text>
              <text
                className="hidden sm:block"
                fill="#64748b"
                fontSize="6.4"
                fontWeight="800"
                textAnchor={slice.labelAnchor}
                x={slice.textX + (slice.labelAnchor === "start" ? 18 : -18)}
                y={slice.label.y}
              >
                {shortPercent(slice.item.profitLossPercent)}
              </text>
              <path
                className="cursor-pointer transition-opacity duration-150 hover:opacity-90"
                d={donutSlicePath(slice.startAngle, slice.endAngle, slice.outerRadius, innerRadius)}
                fill={slice.item.color}
                filter="url(#titleGlow)"
                onMouseEnter={(event) => updateTooltip(event, slice.item)}
                onMouseLeave={() => setTooltip(null)}
                onMouseMove={(event) => updateTooltip(event, slice.item)}
                stroke="#ffffff"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </g>
          ))}

          <circle cx={center} cy={center} fill="#ffffff" r={innerRadius - 2} />
          <circle cx={center} cy={center} fill="none" r={innerRadius - 2} stroke="rgba(15,23,42,0.05)" strokeWidth="2" />
        </svg>

        {tooltip && (
          <div
            className="pointer-events-none absolute z-20 w-[235px] rounded-xl bg-slate-950 p-4 text-white shadow-[0_24px_45px_rgba(15,23,42,0.35)]"
            style={{
              left: Math.min(Math.max(tooltip.x, 124), (wrapperRef.current?.clientWidth ?? 360) - 124),
              top: Math.min(Math.max(tooltip.y, 86), (wrapperRef.current?.clientHeight ?? 360) - 86),
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tooltip.item.color }} />
                <strong className="truncate text-base">{tooltip.item.ticker}</strong>
              </div>
              <span className="max-w-[92px] truncate rounded-md bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300">
                {tooltip.item.sector}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-xs">
              <TooltipMetric label="Shares" value={tooltip.item.quantity.toFixed(2)} />
              <TooltipMetric label="Prezzo" value={formatMoney(tooltip.item.currentPrice)} />
              <TooltipMetric label="Market Value" value={formatMoney(tooltip.item.value)} strong />
              <TooltipMetric label="Peso" value={formatPercent(tooltip.item.weightPercent).replace("+", "")} strong />
            </div>

            <div className="mt-4 border-t border-slate-800 pt-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs text-slate-400">P/L</span>
                <span
                  className={`text-sm font-bold ${
                    tooltip.item.profitLossEuro >= 0 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {tooltip.item.profitLossEuro >= 0 ? "+" : ""}
                  {formatMoney(tooltip.item.profitLossEuro)}{" "}
                  <span className="text-xs">({formatPercent(tooltip.item.profitLossPercent)})</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex max-w-full flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:max-w-3xl">
        {data.slice(0, 8).map((item) => (
          <div key={item.ticker} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="font-semibold text-ink">{item.ticker}</span>
            <span>{shortPercent(item.profitLossPercent)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TooltipMetric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className={`mt-1 ${strong ? "font-bold text-white" : "font-semibold text-slate-200"}`}>{value}</p>
    </div>
  );
}

function buildTitleData(trades: Trade[]): TitleDatum[] {
  const groupedTrades = trades
    .filter((trade) => trade.status === "open")
    .reduce<
      Record<
        string,
        Omit<TitleDatum, "color" | "currentPrice" | "profitLossPercent" | "weightPercent"> & { invested: number }
      >
    >((groups, trade) => {
      const current = groups[trade.ticker] ?? {
        ticker: trade.ticker,
        sector: trade.sector,
        value: 0,
        quantity: 0,
        profitLossEuro: 0,
        invested: 0,
      };
      const profitLoss = calculateProfitLoss(trade.entryPrice, trade.currentPrice, trade.quantity);

      groups[trade.ticker] = {
        ...current,
        value: current.value + trade.currentPrice * trade.quantity,
        quantity: current.quantity + trade.quantity,
        profitLossEuro: current.profitLossEuro + profitLoss.euro,
        invested: current.invested + trade.entryPrice * trade.quantity,
      };

      return groups;
    }, {});

  const items = Object.values(groupedTrades);
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);

  return items
    .sort((first, second) => second.value - first.value)
    .map((item, index) => ({
      ticker: item.ticker,
      sector: item.sector,
      value: item.value,
      quantity: item.quantity,
      currentPrice: item.quantity > 0 ? item.value / item.quantity : 0,
      weightPercent: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
      profitLossEuro: item.profitLossEuro,
      profitLossPercent: item.invested > 0 ? (item.profitLossEuro / item.invested) * 100 : 0,
      color: palette[index % palette.length],
    }));
}

function buildTitleSlices(data: TitleDatum[]): TitleSlice[] {
  const count = data.length;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const sweepAngle = 360 / count;

  const slices = data.map((item, index) => {
    const startAngle = -82 + index * sweepAngle + gapAngle / 2;
    const endAngle = -82 + (index + 1) * sweepAngle - gapAngle / 2;
    const midAngle = (startAngle + endAngle) / 2;
    const depthRatio = Math.sqrt(item.value / maxValue);
    const outerRadius = minOuterRadius + (maxOuterRadius - minOuterRadius) * depthRatio;
    const label = polarPoint(midAngle, labelRadius);
    const lineStart = polarPoint(midAngle, outerRadius + 2);
    const lineTurn = polarPoint(midAngle, 142);
    const lineEnd = polarPoint(midAngle, 156);
    const labelAnchor: "start" | "end" = label.x >= center ? "start" : "end";
    const textX = label.x + (labelAnchor === "start" ? 5 : -5);

    return {
      item,
      startAngle,
      endAngle,
      midAngle,
      outerRadius,
      lineStart,
      lineTurn,
      lineEnd,
      label,
      textX,
      labelAnchor,
    };
  });

  return spreadTitleLabels(slices);
}

function spreadTitleLabels(slices: TitleSlice[]): TitleSlice[] {
  const nextSlices = slices.map((slice) => ({ ...slice, label: { ...slice.label }, lineEnd: { ...slice.lineEnd } }));

  for (const side of ["start", "end"] as const) {
    const sideSlices = nextSlices.filter((slice) => slice.labelAnchor === side).sort((first, second) => first.label.y - second.label.y);
    const minGap = 20;

    for (let index = 1; index < sideSlices.length; index += 1) {
      const previous = sideSlices[index - 1];
      const current = sideSlices[index];
      if (current.label.y - previous.label.y < minGap) {
        current.label.y = previous.label.y + minGap;
      }
    }

    for (let index = sideSlices.length - 1; index >= 0; index -= 1) {
      const current = sideSlices[index];
      current.label.y = Math.min(current.label.y, 340);
      if (index > 0 && current.label.y - sideSlices[index - 1].label.y < minGap) {
        sideSlices[index - 1].label.y = current.label.y - minGap;
      }
    }
  }

  for (const slice of nextSlices) {
    slice.label.y = Math.max(20, Math.min(340, slice.label.y));
    slice.labelAnchor = slice.label.x >= center ? "start" : "end";
    slice.textX = slice.label.x + (slice.labelAnchor === "start" ? 5 : -5);
    slice.lineEnd = { x: slice.label.x, y: slice.label.y };
  }

  return nextSlices;
}

function donutSlicePath(startAngle: number, endAngle: number, outerRadiusValue: number, innerRadiusValue: number): string {
  const outerStart = polarPoint(startAngle, outerRadiusValue);
  const outerEnd = polarPoint(endAngle, outerRadiusValue);
  const innerEnd = polarPoint(endAngle, innerRadiusValue);
  const innerStart = polarPoint(startAngle, innerRadiusValue);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadiusValue} ${outerRadiusValue} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadiusValue} ${innerRadiusValue} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function polarPoint(angle: number, distance: number): Point {
  const radians = (angle * Math.PI) / 180;

  return {
    x: Number((center + distance * Math.cos(radians)).toFixed(2)),
    y: Number((center + distance * Math.sin(radians)).toFixed(2)),
  };
}

function shortPercent(value: number): string {
  const formatted = formatPercent(value);
  return formatted.length > 8 ? `${formatted.slice(0, 6)}...` : formatted;
}
