import { Cloud, LogIn, LogOut, UserPlus } from "lucide-react";
import { useState } from "react";
import type { SupabaseSession } from "../lib/supabaseClient";

type AuthPanelProps = {
  allowSignup?: boolean;
  configured: boolean;
  errorMessage: string;
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => void;
  onSignup: (email: string, password: string) => Promise<void>;
  session: SupabaseSession | null;
  syncStatus: string;
};

export function AuthPanel({
  allowSignup = true,
  configured,
  errorMessage,
  loading,
  onLogin,
  onLogout,
  onSignup,
  session,
  syncStatus,
}: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!configured) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Cloud non configurato. L'app funziona in locale con localStorage.
      </section>
    );
  }

  if (session) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm shadow-line">
        <div className="flex items-center gap-2 text-slate-700">
          <Cloud size={16} className="text-emerald-600" />
          <span>
            Cloud attivo: <strong className="text-ink">{session.user.email ?? session.user.id}</strong>
          </span>
          <span className="text-muted">{syncStatus}</span>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={onLogout}
          type="button"
        >
          <LogOut size={15} />
          Esci
        </button>
      </section>
    );
  }

  async function submit(mode: "login" | "signup"): Promise<void> {
    if (mode === "login") {
      await onLogin(email, password);
      return;
    }

    await onSignup(email, password);
  }

  return (
    <section className="rounded-lg border border-line bg-white px-4 py-3 shadow-line">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="text-xs font-semibold text-slate-600" htmlFor="cloud-email">
            Email
          </label>
          <input
            className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-blue-400"
            id="cloud-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email"
            type="email"
            value={email}
          />
        </div>
        <div className="min-w-48 flex-1">
          <label className="text-xs font-semibold text-slate-600" htmlFor="cloud-password">
            Password
          </label>
          <input
            className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-blue-400"
            id="cloud-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="password"
            type="password"
            value={password}
          />
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading || !email || !password}
          onClick={() => {
            void submit("login");
          }}
          type="button"
        >
          <LogIn size={15} />
          Login
        </button>
        {allowSignup ? (
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || !email || !password}
            onClick={() => {
              void submit("signup");
            }}
            type="button"
          >
            <UserPlus size={15} />
            Crea account
          </button>
        ) : null}
      </div>
      <div className="mt-2 min-h-5 text-xs text-muted">
        {errorMessage ? <span className="text-red-600">{errorMessage}</span> : syncStatus || "Offline/local-first finche non fai login."}
      </div>
    </section>
  );
}
