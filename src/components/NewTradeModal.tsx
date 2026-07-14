import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { calculateQuantity, calculateRiskEuro, MAX_RISK_BUDGET } from "../lib/calculations";
import { detectSectorFromTicker } from "../lib/sectorDetection";
import { getMockPrice } from "../lib/mockPrices";
import { createId } from "../lib/id";
import type { Sector, Strategy, TakeProfitLevel, Trade } from "../types";
import { RiskSlider } from "./RiskSlider";
import { RiskSummaryCard } from "./RiskSummaryCard";
import { SectorSelect } from "./SectorSelect";
import { StrategySelect } from "./StrategySelect";
import { TakeProfitSelector } from "./TakeProfitSelector";

type NewTradeModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (trade: Trade) => void;
  existingTickers: string[];
  tradeToEdit?: Trade | null;
};

type FieldErrors = Partial<Record<"ticker" | "entryPrice" | "stopLoss" | "quantity", string>>;

const presetPercentages = [100, 80, 60, 40, 30, 20, 10];

function numberFromInput(value: string): number {
  const normalizedValue = value.replace(",", ".");
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function dateInputValue(value?: string): string {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export function NewTradeModal({
  open,
  onClose,
  onSave,
  existingTickers,
  tradeToEdit,
}: NewTradeModalProps) {
  const [tickerMode, setTickerMode] = useState<"new" | "existing">("new");
  const [ticker, setTicker] = useState(tradeToEdit?.ticker ?? "");
  const [strategy, setStrategy] = useState<Strategy>(tradeToEdit?.strategy ?? "Strategia Volumi");
  const [sector, setSector] = useState<Sector>(tradeToEdit?.sector ?? "Technology");
  const [entryPrice, setEntryPrice] = useState(tradeToEdit?.entryPrice ? String(tradeToEdit.entryPrice) : "");
  const [stopLoss, setStopLoss] = useState(tradeToEdit?.stopLoss ? String(tradeToEdit.stopLoss) : "");
  const [riskPercent, setRiskPercent] = useState(tradeToEdit?.riskPercent ?? 50);
  const [quantity, setQuantity] = useState(tradeToEdit?.quantity ? String(tradeToEdit.quantity) : "");
  const [selectedPercentages, setSelectedPercentages] = useState<number[]>(
    tradeToEdit
      ? tradeToEdit.takeProfits.flatMap((level) => (level.percentage ? [level.percentage] : []))
      : presetPercentages,
  );
  const [customLevels, setCustomLevels] = useState<TakeProfitLevel[]>(
    tradeToEdit?.takeProfits.filter((level) => level.isCustom) ?? [],
  );
  const [customDateEnabled, setCustomDateEnabled] = useState(Boolean(tradeToEdit));
  const [openDate, setOpenDate] = useState(dateInputValue(tradeToEdit?.openDate));
  const [analysisFileName, setAnalysisFileName] = useState(tradeToEdit?.analysisFileName ?? "");
  const [journal, setJournal] = useState(tradeToEdit?.journal ?? "");
  const [isDetectingSector, setIsDetectingSector] = useState(false);
  const [sectorTouchedManually, setSectorTouchedManually] = useState(Boolean(tradeToEdit));
  const [errors, setErrors] = useState<FieldErrors>({});

  const entryPriceValue = numberFromInput(entryPrice);
  const stopLossValue = numberFromInput(stopLoss);
  const riskEuro = useMemo(() => calculateRiskEuro(MAX_RISK_BUDGET, riskPercent), [riskPercent]);
  const decimals = sector === "Cryptocurrency" ? 6 : 2;
  const calculatedQuantity = useMemo(
    () => calculateQuantity(entryPriceValue, stopLossValue, riskPercent, MAX_RISK_BUDGET, decimals),
    [decimals, entryPriceValue, riskPercent, stopLossValue],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuantity(calculatedQuantity > 0 ? String(calculatedQuantity) : "");
  }, [calculatedQuantity, open]);

  useEffect(() => {
    if (!ticker.trim() || sectorTouchedManually) {
      setIsDetectingSector(false);
      return;
    }

    let isActive = true;
    const debounceId = window.setTimeout(() => {
      setIsDetectingSector(true);

      detectSectorFromTicker(ticker)
        .then((detectedSector) => {
          if (isActive) {
            setSector(detectedSector);
          }
        })
        .finally(() => {
          if (isActive) {
            setIsDetectingSector(false);
          }
        });
    }, 320);

    return () => {
      isActive = false;
      window.clearTimeout(debounceId);
    };
  }, [sectorTouchedManually, ticker]);

  if (!open) {
    return null;
  }

  function updateTicker(nextTicker: string): void {
    setTicker(nextTicker.toUpperCase());
    setSectorTouchedManually(false);
  }

  function updateSector(nextSector: Sector): void {
    setSector(nextSector);
    setSectorTouchedManually(true);
  }

  function validateForm(): boolean {
    const nextErrors: FieldErrors = {};
    const quantityValue = numberFromInput(quantity);

    if (!ticker.trim()) {
      nextErrors.ticker = "Ticker obbligatorio.";
    }

    if (entryPriceValue <= 0) {
      nextErrors.entryPrice = "Prezzo Entry deve essere maggiore di 0.";
    }

    if (stopLossValue <= 0) {
      nextErrors.stopLoss = "Stop Loss deve essere maggiore di 0.";
    }

    if (entryPriceValue > 0 && stopLossValue > 0 && stopLossValue >= entryPriceValue) {
      nextErrors.stopLoss = "Per un trade long lo stop loss deve essere inferiore al prezzo entry.";
    }

    if (quantityValue <= 0) {
      nextErrors.quantity = "Quantità azioni obbligatoria.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function submitTrade(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const normalizedTicker = ticker.trim().toUpperCase();
    const now = new Date().toISOString();
    const quantityValue = numberFromInput(quantity);
    const selectedTakeProfits: TakeProfitLevel[] = selectedPercentages.map((percentage) => ({
      id: `preset-${percentage}`,
      label: `${percentage}%`,
      percentage,
      isCustom: false,
    }));

    const savedTrade: Trade = {
      id: tradeToEdit?.id ?? createId("trade"),
      ticker: normalizedTicker,
      sector,
      strategy,
      entryPrice: entryPriceValue,
      currentPrice:
        tradeToEdit && tradeToEdit.ticker === normalizedTicker
          ? tradeToEdit.currentPrice
          : getMockPrice(normalizedTicker, entryPriceValue),
      stopLoss: stopLossValue,
      takeProfits: [...selectedTakeProfits, ...customLevels],
      riskPercent,
      riskEuro,
      quantity: Number(quantityValue.toFixed(decimals)),
      status: tradeToEdit?.status ?? "open",
      openDate: customDateEnabled ? new Date(`${openDate}T09:00:00`).toISOString() : now,
      closeDate: tradeToEdit?.closeDate,
      journal,
      analysisFileName: analysisFileName || undefined,
      createdAt: tradeToEdit?.createdAt ?? now,
      updatedAt: now,
    };

    onSave(savedTrade);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/30 p-3 backdrop-blur-sm sm:p-6">
      <form
        className="my-4 w-full max-w-[420px] rounded-2xl bg-white p-4 shadow-soft sm:my-8 sm:p-5"
        onSubmit={submitTrade}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{tradeToEdit ? "Modifica Trade" : "Nuovo Trade"}</h2>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-ink"
            onClick={onClose}
            type="button"
            title="Chiudi"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Ticker *" error={errors.ticker}>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`h-9 rounded-md text-xs font-bold transition ${
                  tickerMode === "new" ? "bg-black text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                onClick={() => setTickerMode("new")}
                type="button"
              >
                Nuova Ticker
              </button>
              <button
                className={`h-9 rounded-md text-xs font-bold transition ${
                  tickerMode === "existing" ? "bg-black text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                onClick={() => setTickerMode("existing")}
                type="button"
              >
                Ticker Esistente
              </button>
            </div>
            <input
              className="mt-2 h-10 w-full rounded-md border border-line px-3 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              list={tickerMode === "existing" ? "existing-tickers" : undefined}
              onChange={(event) => updateTicker(event.target.value)}
              placeholder="AAPL"
              value={ticker}
            />
            <datalist id="existing-tickers">
              {existingTickers.map((existingTicker) => (
                <option key={existingTicker} value={existingTicker} />
              ))}
            </datalist>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Strategia *">
              <StrategySelect onChange={setStrategy} value={strategy} />
            </Field>
            <Field label={isDetectingSector ? "Settore · Analisi ticker..." : "Settore *"}>
              <SectorSelect onChange={updateSector} value={sector} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prezzo Entry *" error={errors.entryPrice}>
              <input
                className="h-10 w-full rounded-md border border-line px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                inputMode="decimal"
                onChange={(event) => setEntryPrice(event.target.value)}
                type="number"
                value={entryPrice}
              />
            </Field>
            <Field label="Stop Loss *" error={errors.stopLoss}>
              <input
                className="h-10 w-full rounded-md border border-line px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                inputMode="decimal"
                onChange={(event) => setStopLoss(event.target.value)}
                type="number"
                value={stopLoss}
              />
            </Field>
          </div>

          <Field label="Take Profit Levels *">
            <TakeProfitSelector
              customLevels={customLevels}
              onCustomLevelsChange={setCustomLevels}
              onSelectedPercentagesChange={setSelectedPercentages}
              selectedPercentages={selectedPercentages}
            />
          </Field>

          <Field label="Rischio Trade *">
            <RiskSlider onChange={setRiskPercent} value={riskPercent} />
          </Field>

          <RiskSummaryCard quantity={calculatedQuantity} riskEuro={riskEuro} riskPercent={riskPercent} />

          <Field label="Quantità Azioni *" error={errors.quantity}>
            <input
              className="h-10 w-full rounded-md border border-line px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              inputMode="decimal"
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="Inserisci quantità"
              type="number"
              value={quantity}
            />
          </Field>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              checked={customDateEnabled}
              className="h-3.5 w-3.5 rounded border-line text-blue-600 focus:ring-blue-500"
              onChange={(event) => setCustomDateEnabled(event.target.checked)}
              type="checkbox"
            />
            Trade effettuato in una data diversa da oggi
          </label>

          {customDateEnabled && (
            <input
              className="h-10 w-full rounded-md border border-line px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              onChange={(event) => setOpenDate(event.target.value)}
              type="date"
              value={openDate}
            />
          )}

          <Field label="File Analisi">
            <input
              className="block h-10 w-full rounded-md border border-line px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-slate-700"
              onChange={(event) => setAnalysisFileName(event.target.files?.[0]?.name ?? "")}
              type="file"
            />
            {analysisFileName && <p className="mt-1 text-xs text-slate-500">{analysisFileName}</p>}
          </Field>

          <Field label="Diario del trading">
            <textarea
              className="min-h-24 w-full resize-y rounded-md border border-line px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              onChange={(event) => setJournal(event.target.value)}
              value={journal}
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="h-11 rounded-md border border-line bg-white text-sm font-semibold text-ink transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Annulla
          </button>
          <button className="h-11 rounded-md bg-black text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
            {tradeToEdit ? "Salva Trade" : "Crea Trade"}
          </button>
        </div>
      </form>
    </div>
  );
}

type FieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
};

function Field({ label, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}
