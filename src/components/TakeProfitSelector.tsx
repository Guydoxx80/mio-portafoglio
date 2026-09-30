import { Plus, X } from "lucide-react";
import { useState } from "react";
import { createId } from "../lib/id";
import type { TakeProfitLevel } from "../types";

const presetPercentages = [20, 50, 100, 200, 300, 400, 500];

type TakeProfitSelectorProps = {
  entryPrice: number;
  selectedPercentages: number[];
  customLevels: TakeProfitLevel[];
  onSelectedPercentagesChange: (values: number[]) => void;
  onCustomLevelsChange: (values: TakeProfitLevel[]) => void;
};

export function TakeProfitSelector({
  entryPrice,
  selectedPercentages,
  customLevels,
  onSelectedPercentagesChange,
  onCustomLevelsChange,
}: TakeProfitSelectorProps) {
  const [customPrice, setCustomPrice] = useState("");
  const formatTargetPrice = (percentage: number): string =>
    Number.isFinite(entryPrice) && entryPrice > 0
      ? ` $${(entryPrice * (1 + percentage / 100)).toFixed(2)}`
      : "";

  function togglePercentage(percentage: number): void {
    if (selectedPercentages.includes(percentage)) {
      onSelectedPercentagesChange(selectedPercentages.filter((item) => item !== percentage));
      return;
    }

    onSelectedPercentagesChange([...selectedPercentages, percentage].sort((a, b) => b - a));
  }

  function addCustomLevel(): void {
    const numericPrice = Number(customPrice);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return;
    }

    onCustomLevelsChange([
      ...customLevels,
      {
        id: createId("tp"),
        label: numericPrice.toFixed(2),
        price: Number(numericPrice.toFixed(2)),
        isCustom: true,
      },
    ]);
    setCustomPrice("");
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {presetPercentages.map((percentage) => (
          (() => {
            const targetPrice = formatTargetPrice(percentage);

            return (
              <label
                key={percentage}
                className="flex h-8 items-center gap-2 rounded-md bg-slate-50 px-2 text-xs font-semibold text-ink"
              >
                <input
                  checked={selectedPercentages.includes(percentage)}
                  className="h-3.5 w-3.5 rounded border-line text-blue-600 focus:ring-blue-500"
                  onChange={() => togglePercentage(percentage)}
                  type="checkbox"
                />
                {percentage}%{targetPrice && ` →${targetPrice}`}
              </label>
            );
          })()
        ))}
      </div>

      {customLevels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customLevels.map((level) => (
            <span
              key={level.id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700"
            >
              TP {level.label}
              <button
                className="rounded-full text-blue-700 hover:bg-blue-200"
                onClick={() => onCustomLevelsChange(customLevels.filter((item) => item.id !== level.id))}
                type="button"
                title="Rimuovi take profit"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="h-10 min-w-0 flex-1 rounded-md border border-line px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          inputMode="decimal"
          onChange={(event) => setCustomPrice(event.target.value)}
          placeholder="Nuovo TP prezzo"
          type="number"
          value={customPrice}
        />
        <button
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-md bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:bg-blue-300"
          disabled={!customPrice}
          onClick={addCustomLevel}
          type="button"
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          Aggiungi
        </button>
      </div>
    </div>
  );
}
