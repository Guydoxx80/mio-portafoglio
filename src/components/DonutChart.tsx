import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { formatMoney } from "../lib/formatters";
import type { Sector } from "../types";

type DonutDatum = {
  sector: Sector;
  value: number;
  positions: number;
  profitLoss: number;
  color: string;
};

type DonutChartProps = {
  data: DonutDatum[];
};

type TooltipState = {
  item: DonutDatum;
  percent: number;
  x: number;
  y: number;
};

type DonutSlice = {
  item: DonutDatum;
  portion: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  label: { x: number; y: number };
  lineStart: { x: number; y: number };
  lineTurn: { x: number; y: number };
  lineEnd: { x: number; y: number };
  labelAnchor: "start" | "end";
  textX: number;
  displayLabel: string;
};

const center = 160;
const outerRadius = 124;
const innerRadius = 74;
const sliceGapAngle = 2.2;

export function DonutChart({ data }: DonutChartProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const slices = buildDonutSlices(data, total);

  if (total <= 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted">
        Nessun dato da visualizzare
      </div>
    );
  }

  function updateTooltip(event: MouseEvent<SVGPathElement>, item: DonutDatum): void {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    const percent = total > 0 ? (item.value / total) * 100 : 0;

    if (!bounds) {
      return;
    }

    setTooltip({
      item,
      percent,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }

  return (
    <div className="flex min-h-[420px] min-w-0 flex-col items-center justify-center gap-8 px-4 py-10 sm:min-h-[520px]">
      <div
        className="relative h-[min(340px,calc(100vw-56px))] w-[min(340px,calc(100vw-56px))] max-w-full sm:h-[500px] sm:w-[620px]"
        ref={wrapperRef}
      >
        <svg className="h-full w-full overflow-visible drop-shadow-sm" viewBox="0 0 320 320">
          <defs>
            <filter height="150%" id="donutGlow" width="150%" x="-25%" y="-25%">
              <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="5" />
              <feColorMatrix
                in="blur"
                result="softGlow"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .23 0"
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
            r={(outerRadius + innerRadius) / 2}
            stroke="#eef2f7"
            strokeWidth={outerRadius - innerRadius}
          />
          {slices.map((slice) => {
            const slicePath = donutSlicePath(slice.startAngle, slice.endAngle);
            return (
              <g key={slice.item.sector}>
                <polyline
                  className="hidden sm:block"
                  fill="none"
                  points={`${slice.lineStart.x},${slice.lineStart.y} ${slice.lineTurn.x},${slice.lineTurn.y} ${slice.lineEnd.x},${slice.lineEnd.y}`}
                  stroke="#94a3b8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
                <text
                  className="hidden sm:block"
                  fill="#0f172a"
                  fontSize="9.5"
                  fontWeight={tooltip?.item.sector === slice.item.sector ? "800" : "700"}
                  textAnchor={slice.labelAnchor}
                  x={slice.textX}
                  y={slice.label.y - 2}
                >
                  {slice.displayLabel}
                </text>
                <text
                  className="hidden sm:block"
                  fill="#0f172a"
                  fontSize="8.5"
                  fontWeight="700"
                  textAnchor={slice.labelAnchor}
                  x={slice.textX}
                  y={slice.label.y + 9}
                >
                  {slice.portion * 100 < 10 ? (slice.portion * 100).toFixed(1) : (slice.portion * 100).toFixed(2)}%
                </text>
                <path
                  className="cursor-pointer transition-opacity duration-150"
                  d={slicePath}
                  fill={slice.item.color}
                  filter="url(#donutGlow)"
                  onMouseEnter={(event) => updateTooltip(event, slice.item)}
                  onMouseLeave={() => setTooltip(null)}
                  onMouseMove={(event) => updateTooltip(event, slice.item)}
                  stroke="#ffffff"
                  strokeLinejoin="miter"
                  strokeWidth="2"
                />
              </g>
            );
          })}
          <circle cx={center} cy={center} fill="#ffffff" r={innerRadius - 1} />
          <circle
            cx={center}
            cy={center}
            fill="none"
            r={innerRadius - 1}
            stroke="rgba(15,23,42,0.05)"
            strokeWidth="2"
          />
        </svg>

        {tooltip && (
          <div
            className="pointer-events-none absolute z-20 w-[236px] rounded-xl bg-slate-950 p-4 text-white shadow-[0_24px_45px_rgba(15,23,42,0.35)]"
            style={{
              left: Math.min(Math.max(tooltip.x, 128), (wrapperRef.current?.clientWidth ?? 320) - 128),
              top: Math.min(Math.max(tooltip.y, 84), (wrapperRef.current?.clientHeight ?? 320) - 84),
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: tooltip.item.color }} />
              <strong className="text-base">{tooltip.item.sector}</strong>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
              <div>
                <p className="text-slate-400">Peso</p>
                <p className="mt-1 text-sm font-bold">{tooltip.percent.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-slate-400">Posizioni</p>
                <p className="mt-1 text-sm font-bold">{tooltip.item.positions}</p>
              </div>
              <div>
                <p className="text-slate-400">Market Value</p>
                <p className="mt-1 text-sm font-bold">{formatMoney(tooltip.item.value)}</p>
              </div>
              <div>
                <p className="text-slate-400">P/L</p>
                <p className={`mt-1 text-sm font-bold ${tooltip.item.profitLoss >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {tooltip.item.profitLoss >= 0 ? "+" : ""}
                  {formatMoney(tooltip.item.profitLoss)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex max-w-full flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:max-w-3xl">
        {data.map((item) => (
          <div key={item.sector} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <span>{item.sector}</span>
            <span className="font-semibold text-ink">{((item.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildDonutSlices(data: DonutDatum[], total: number): DonutSlice[] {
  let currentAngle = -90;

  const slices = data.map((item) => {
    const portion = item.value / total;
    const sweepAngle = portion * 360;
    const gapAngle = Math.min(sliceGapAngle, sweepAngle * 0.35);
    const startAngle = currentAngle + gapAngle / 2;
    const endAngle = currentAngle + sweepAngle - gapAngle / 2;
    const midAngle = currentAngle + sweepAngle / 2;
    const label = labelPoint(midAngle, outerRadius + 20);
    const lineStart = labelPoint(midAngle, outerRadius + 2);
    const lineTurn = labelPoint(midAngle, outerRadius + 11);
    const lineEnd = labelPoint(midAngle, outerRadius + 18);
    const labelAnchor: "start" | "end" = label.x >= center ? "start" : "end";
    const textX = label.x + (label.x >= center ? 5 : -5);
    currentAngle += sweepAngle;

    return {
      item,
      portion,
      startAngle,
      endAngle,
      midAngle,
      label,
      lineStart,
      lineTurn,
      lineEnd,
      labelAnchor,
      textX,
      displayLabel: shortenSector(item.sector),
    };
  });

  return spreadLabels(slices);
}

function spreadLabels(slices: DonutSlice[]): DonutSlice[] {
  const nextSlices = slices.map((slice) => ({
    ...slice,
    label: { ...slice.label },
    lineEnd: { ...slice.lineEnd },
    lineTurn: { ...slice.lineTurn },
  }));
  const minGap = 18;
  const minY = 26;
  const maxY = 294;

  for (const side of ["start", "end"] as const) {
    const sideSlices = nextSlices.filter((slice) => slice.labelAnchor === side).sort((a, b) => a.label.y - b.label.y);

    for (let index = 1; index < sideSlices.length; index += 1) {
      const previous = sideSlices[index - 1];
      const current = sideSlices[index];

      if (current.label.y - previous.label.y < minGap) {
        current.label.y = previous.label.y + minGap;
      }
    }

    for (let index = sideSlices.length - 1; index >= 0; index -= 1) {
      const current = sideSlices[index];
      current.label.y = Math.min(current.label.y, maxY);

      if (index > 0 && current.label.y - sideSlices[index - 1].label.y < minGap) {
        sideSlices[index - 1].label.y = current.label.y - minGap;
      }
    }

    for (const slice of sideSlices) {
      slice.label.y = Math.max(minY, Math.min(maxY, slice.label.y));
      slice.lineEnd.y = slice.label.y;
      slice.textX = slice.label.x + (slice.labelAnchor === "start" ? 5 : -5);
    }
  }

  resolveGlobalLabelCollisions(nextSlices, minY, maxY);

  return nextSlices;
}

function resolveGlobalLabelCollisions(slices: DonutSlice[], minY: number, maxY: number): void {
  const padding = 5;
  const passes = 7;

  for (let pass = 0; pass < passes; pass += 1) {
    for (let firstIndex = 0; firstIndex < slices.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < slices.length; secondIndex += 1) {
        const first = slices[firstIndex];
        const second = slices[secondIndex];

        if (!boxesOverlap(labelBox(first), labelBox(second))) {
          continue;
        }

        const firstShift = tangentShift(first.midAngle, -padding);
        const secondShift = tangentShift(second.midAngle, padding);
        first.label.x += firstShift.x;
        first.label.y += firstShift.y;
        second.label.x += secondShift.x;
        second.label.y += secondShift.y;
      }
    }

    for (const slice of slices) {
      slice.label.y = Math.max(minY, Math.min(maxY, slice.label.y));
      slice.label.x = Math.max(18, Math.min(302, slice.label.x));
      slice.labelAnchor = slice.label.x >= center ? "start" : "end";
      slice.textX = slice.label.x + (slice.labelAnchor === "start" ? 5 : -5);
      slice.lineEnd = { ...slice.label };
    }
  }
}

type LabelBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function labelBox(slice: DonutSlice): LabelBox {
  const width = labelWidth(slice);
  const height = labelHeight(slice);
  const left = slice.labelAnchor === "start" ? slice.textX : slice.textX - width;
  const right = slice.labelAnchor === "start" ? slice.textX + width : slice.textX;

  return {
    left,
    right,
    top: slice.label.y - height / 2,
    bottom: slice.label.y + height / 2,
  };
}

function labelWidth(slice: DonutSlice): number {
  const percentageText = `${(slice.portion * 100).toFixed(slice.portion * 100 < 10 ? 1 : 2)}%`;
  const longestLine = Math.max(slice.displayLabel.length, percentageText.length);
  return longestLine * 6.4 + 6;
}

function labelHeight(_slice: DonutSlice): number {
  return 22;
}

function boxesOverlap(first: LabelBox, second: LabelBox): boolean {
  const horizontalPadding = 10;
  const verticalPadding = 3;

  return (
    first.left - horizontalPadding < second.right &&
    first.right + horizontalPadding > second.left &&
    first.top - verticalPadding < second.bottom &&
    first.bottom + verticalPadding > second.top
  );
}

function tangentShift(angle: number, amount: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;

  return {
    x: Number((-Math.sin(radians) * amount).toFixed(2)),
    y: Number((Math.cos(radians) * amount).toFixed(2)),
  };
}

function labelPoint(angle: number, distance: number): { x: number; y: number } {
  return polarPoint(angle, distance);
}

function polarPoint(angle: number, distance: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;

  return {
    x: Number((center + distance * Math.cos(radians)).toFixed(2)),
    y: Number((center + distance * Math.sin(radians)).toFixed(2)),
  };
}

function donutSlicePath(startAngle: number, endAngle: number): string {
  const outerStart = polarPoint(startAngle, outerRadius);
  const outerEnd = polarPoint(endAngle, outerRadius);
  const innerEnd = polarPoint(endAngle, innerRadius);
  const innerStart = polarPoint(startAngle, innerRadius);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function shortenSector(sector: Sector): string {
  if (sector === "Communication Services") {
    return "Communi...";
  }

  if (sector === "Financial Services") {
    return "Financial...";
  }

  if (sector === "Consumer Defensive") {
    return "Consumer...";
  }

  if (sector === "Basic Materials") {
    return "Materials";
  }

  return sector;
}
