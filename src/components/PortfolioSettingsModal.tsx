import { Settings, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "../lib/formatters";
import type { PortfolioSettings } from "../types";

type PortfolioSettingsModalProps = {
  open: boolean;
  settings: PortfolioSettings;
  onClose: () => void;
  onSave: (settings: PortfolioSettings) => void;
};

export function PortfolioSettingsModal({ open, settings, onClose, onSave }: PortfolioSettingsModalProps) {
  const [initialCapital, setInitialCapital] = useState(String(settings.initialCapital));
  const [maxTradeRisk, setMaxTradeRisk] = useState(String(settings.maxTradeRisk));
  const [portfolioDivisor, setPortfolioDivisor] = useState(String(settings.portfolioDivisor));
  const [maxLeverage, setMaxLeverage] = useState(String(settings.maxLeverage));
  const [alertThresholdPercent, setAlertThresholdPercent] = useState(String(settings.alertThresholdPercent));

  useEffect(() => {
    if (!open) {
      return;
    }

    setInitialCapital(String(settings.initialCapital));
    setMaxTradeRisk(String(settings.maxTradeRisk));
    setPortfolioDivisor(String(settings.portfolioDivisor));
    setMaxLeverage(String(settings.maxLeverage));
    setAlertThresholdPercent(String(settings.alertThresholdPercent));
  }, [open, settings]);

  const initialCapitalValue = numberFromInput(initialCapital);
  const maxTradeRiskValue = numberFromInput(maxTradeRisk);
  const divisorValue = numberFromInput(portfolioDivisor);
  const maxPerTrade = useMemo(
    () => (divisorValue > 0 ? initialCapitalValue / divisorValue : 0),
    [divisorValue, initialCapitalValue],
  );
  const percentPerTrade = initialCapitalValue > 0 ? (maxPerTrade / initialCapitalValue) * 100 : 0;
  const buyingPower = initialCapitalValue * Math.max(numberFromInput(maxLeverage), 0);

  if (!open) {
    return null;
  }

  function handleSubmit(): void {
    onSave({
      ...settings,
      initialCapital: initialCapitalValue,
      maxTradeRisk: maxTradeRiskValue,
      portfolioDivisor: divisorValue,
      maxLeverage: numberFromInput(maxLeverage),
      alertThresholdPercent: numberFromInput(alertThresholdPercent),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8">
      <section className="w-full max-w-[520px] rounded-xl bg-white p-4 shadow-2xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-ink">Impostazioni Portafoglio</h2>
          <button className="rounded-md p-1 text-slate-600 transition hover:bg-slate-100" onClick={onClose} type="button">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5">
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-slate-600">Capitale Totale Investito</p>
                <p className="mt-2 font-mono text-3xl font-bold text-ink">{formatMoney(initialCapitalValue)}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">Capitale iniziale: {formatMoney(initialCapitalValue)}</p>
              </div>
              <Settings aria-hidden="true" className="h-5 w-5 text-blue-600" />
            </div>
          </section>

          <section className="rounded-xl border border-violet-100 bg-violet-50/70 p-5">
            <h3 className="font-mono text-sm font-bold text-slate-800">📊 Configurazione Strategia Volumi</h3>
            <div className="mt-4 space-y-4">
              <Field label="Max Size per Trade ($)" onChange={setMaxTradeRisk} value={maxTradeRisk} />
              <Field label="Divisore Portafoglio (N° Titoli Max)" onChange={setPortfolioDivisor} value={portfolioDivisor} />
            </div>

            <div className="mt-4 rounded-lg border border-blue-200 bg-white p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Metric label="Max $ per Trade" value={formatMoney(maxPerTrade)} />
                <Metric label="N° Divisioni" value={String(divisorValue || 0)} />
                <Metric label="% per Trade" value={`${percentPerTrade.toFixed(3)}%`} />
              </div>
              <div className="mt-4 border-t border-line pt-3 text-center font-mono text-xs text-slate-600">
                {formatMoney(initialCapitalValue)} ÷ {divisorValue || 0} = {formatMoney(maxPerTrade)}
              </div>
            </div>
          </section>

          <div>
            <label className="font-mono text-xs text-slate-700" htmlFor="max-leverage">
              Leva Massima (Margine)
            </label>
            <div className="mt-3 flex items-center gap-4">
              <input
                className="w-full accent-black"
                id="max-leverage"
                max="5"
                min="1"
                onChange={(event) => setMaxLeverage(event.target.value)}
                step="0.1"
                type="range"
                value={maxLeverage}
              />
              <span className="font-mono text-2xl font-bold">{numberFromInput(maxLeverage).toFixed(0)}x</span>
            </div>
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 py-2 text-center font-mono text-xs text-slate-700">
              Buying Power: <b className="text-blue-600">{formatMoney(buyingPower)}</b>
            </div>
          </div>

          <Field label="Soglia Alert TP/SL (%)" onChange={setAlertThresholdPercent} value={alertThresholdPercent} />
          <div className="rounded-lg border border-orange-200 bg-orange-50 py-2 text-center font-mono text-xs text-slate-700">
            Alert scatta a <b className="text-orange-600">±{numberFromInput(alertThresholdPercent)}%</b> da TP/SL
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button className="h-11 rounded-lg border border-line font-semibold text-slate-700" onClick={onClose} type="button">
              Annulla
            </button>
            <button className="h-11 rounded-lg bg-black font-semibold text-white" onClick={handleSubmit} type="button">
              Salva
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function Field({ label, value, onChange }: FieldProps) {
  return (
    <label className="block">
      <span className="font-mono text-xs text-slate-700">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-line px-4 text-center font-mono text-sm outline-none focus:border-blue-300"
        onChange={(event) => onChange(event.target.value)}
        type="number"
        value={value}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold text-emerald-600">{value}</p>
    </div>
  );
}

function numberFromInput(value: string): number {
  const parsedValue = Number(value.replace(",", "."));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}
