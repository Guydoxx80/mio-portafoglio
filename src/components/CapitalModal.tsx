import { Plus, X } from "lucide-react";
import { useState } from "react";
import { createId } from "../lib/id";
import { formatDate, formatMoney } from "../lib/formatters";
import type { CapitalAddition, PortfolioSettings } from "../types";

type CapitalModalProps = {
  open: boolean;
  settings: PortfolioSettings;
  onClose: () => void;
  onSave: (settings: PortfolioSettings) => void;
};

export function CapitalModal({ open, settings, onClose, onSave }: CapitalModalProps) {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const totalAdded = settings.capitalAdditions.reduce((sum, addition) => sum + addition.amount, 0);
  const totalCapital = settings.initialCapital + totalAdded;

  if (!open) {
    return null;
  }

  function handleAddCapital(): void {
    const parsedAmount = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    const addition: CapitalAddition = {
      id: createId("capital"),
      amount: parsedAmount,
      date: new Date().toISOString(),
      note,
    };

    onSave({
      ...settings,
      capitalAdditions: [addition, ...settings.capitalAdditions],
    });
    setAmount("");
    setNote("");
    setShowForm(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8">
      <section className="w-full max-w-[700px] rounded-xl bg-white p-5 shadow-2xl">
        <header className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-ink">Gestione Capitale</h2>
          <button className="rounded-md p-1 text-slate-600 transition hover:bg-slate-100" onClick={onClose} type="button">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_124px]">
          <SummaryBox label="Capitale Totale" sublabel="Solo capitale iniziale" tone="green" value={formatMoney(totalCapital)} />
          <SummaryBox label="Capitale Iniziale" sublabel="Valore di partenza" tone="blue" value={formatMoney(settings.initialCapital)} />
          <button
            className="flex min-h-[104px] flex-col items-center justify-center rounded-xl border border-line bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => setShowForm((current) => !current)}
            type="button"
          >
            <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-600 text-white">
              <Plus aria-hidden="true" className="h-5 w-5" />
            </span>
            Aggiungi
            <br />
            Capitale
          </button>
        </div>

        {showForm ? (
          <div className="mt-5 grid gap-3 rounded-xl border border-line bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]">
            <input
              className="h-11 rounded-lg border border-line px-4 font-mono outline-none focus:border-blue-300"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Importo"
              type="number"
              value={amount}
            />
            <input
              className="h-11 rounded-lg border border-line px-4 outline-none focus:border-blue-300"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nota"
              type="text"
              value={note}
            />
            <button className="h-11 rounded-lg bg-black px-5 font-semibold text-white" onClick={handleAddCapital} type="button">
              Salva
            </button>
          </div>
        ) : null}

        <div className="mt-10 min-h-36">
          {settings.capitalAdditions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-slate-400">
              <div className="font-mono text-5xl">$</div>
              <p className="mt-2 text-sm">Nessuna aggiunta registrata</p>
            </div>
          ) : (
            <div className="space-y-2">
              {settings.capitalAdditions.map((addition) => (
                <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3" key={addition.id}>
                  <div>
                    <p className="font-mono text-sm font-bold text-ink">{formatMoney(addition.amount)}</p>
                    <p className="text-xs text-slate-500">{addition.note || "Aggiunta capitale"} · {formatDate(addition.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryBox({ label, sublabel, tone, value }: { label: string; sublabel: string; tone: "green" | "blue"; value: string }) {
  const toneClass = tone === "green" ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50";

  return (
    <section className={`rounded-xl border p-5 ${toneClass}`}>
      <p className="font-mono text-xs text-slate-600">{label}</p>
      <p className="mt-2 font-mono text-3xl font-bold text-ink">{value}</p>
      <p className="mt-1 font-mono text-xs text-slate-500">{sublabel}</p>
    </section>
  );
}
