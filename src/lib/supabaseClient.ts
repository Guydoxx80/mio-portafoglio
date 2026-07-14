import type { Trade } from "../types";

const SESSION_STORAGE_KEY = "mio-portafoglio-supabase-session";

type SupabaseError = {
  error?: string;
  error_description?: string;
  message?: string;
};

export type SupabaseUser = {
  id: string;
  email?: string;
};

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: SupabaseUser;
};

export type CloudPortfolio = {
  trades: Trade[];
  snapshots: unknown[];
  updatedAt?: string;
};

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

export function loadStoredSession(): SupabaseSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as SupabaseSession) : null;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: SupabaseSession | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function signInWithPassword(email: string, password: string): Promise<SupabaseSession> {
  const response = await supabaseFetch("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return normalizeSession(await response.json());
}

export async function signUpWithPassword(email: string, password: string): Promise<SupabaseSession> {
  const response = await supabaseFetch("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return normalizeSession(await response.json());
}

export async function refreshSession(session: SupabaseSession): Promise<SupabaseSession> {
  const response = await supabaseFetch("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });

  return normalizeSession(await response.json());
}

export async function fetchCloudPortfolio(session: SupabaseSession): Promise<CloudPortfolio | null> {
  const safeSession = await ensureFreshSession(session);
  const response = await supabaseFetch(
    `/rest/v1/portfolio_data?user_id=eq.${encodeURIComponent(safeSession.user.id)}&select=trades,snapshots,updated_at`,
    {
      headers: authHeaders(safeSession),
    },
  );
  const rows = (await response.json()) as Array<{ trades?: Trade[]; snapshots?: unknown[]; updated_at?: string }>;
  const row = rows[0];

  return row
    ? {
        trades: Array.isArray(row.trades) ? row.trades : [],
        snapshots: Array.isArray(row.snapshots) ? row.snapshots : [],
        updatedAt: row.updated_at,
      }
    : null;
}

export async function saveCloudPortfolio(session: SupabaseSession, portfolio: CloudPortfolio): Promise<void> {
  const safeSession = await ensureFreshSession(session);
  await supabaseFetch("/rest/v1/portfolio_data?on_conflict=user_id", {
    method: "POST",
    headers: {
      ...authHeaders(safeSession),
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      user_id: safeSession.user.id,
      trades: portfolio.trades,
      snapshots: portfolio.snapshots,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function ensureFreshSession(session: SupabaseSession): Promise<SupabaseSession> {
  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  const shouldRefresh = expiresAtMs > 0 && expiresAtMs - Date.now() < 60_000;

  if (!shouldRefresh) {
    return session;
  }

  const nextSession = await refreshSession(session);
  saveStoredSession(nextSession);
  return nextSession;
}

function authHeaders(session: SupabaseSession): HeadersInit {
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function supabaseFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase non configurato.");
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message =
      response.status === 429
        ? "Troppe richieste a Supabase. Aspetta qualche minuto e riprova, oppure crea l'utente dal pannello Supabase."
        : `Errore Supabase ${response.status}`;
    try {
      const error = (await response.json()) as SupabaseError;
      message = error.error_description ?? error.message ?? error.error ?? message;
    } catch {
      // Mantiene il messaggio HTTP se il corpo non e JSON.
    }
    throw new Error(message);
  }

  return response;
}

function normalizeSession(value: unknown): SupabaseSession {
  const session = value as SupabaseSession & { expires_in?: number };
  if (!session.access_token || !session.refresh_token || !session.user?.id) {
    throw new Error("Login non completato. Controlla email e password.");
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
    user: session.user,
  };
}
