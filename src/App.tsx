import { useEffect, useMemo, useRef, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { Dashboard } from "./components/Dashboard";
import { Header, type VisualView } from "./components/Header";
import { NewTradeModal } from "./components/NewTradeModal";
import { TradeTable } from "./components/TradeTable";
import { TradeTabs } from "./components/TradeTabs";
import { calculateProfitLoss } from "./lib/calculations";
import { demoTrades } from "./lib/demoTrades";
import {
  downloadPortfolioWorkbook,
  loadPortfolioSnapshots,
  savePortfolioSnapshots,
  upsertPortfolioSnapshots,
} from "./lib/excelExport";
import { autoRefreshDailyPricesIfNeeded, refreshDailyPrices } from "./lib/marketData";
import { loadTrades, saveTrades } from "./lib/storage";
import {
  fetchCloudPortfolio,
  isSupabaseConfigured,
  loadStoredSession,
  saveCloudPortfolio,
  saveStoredSession,
  signInWithPassword,
  signUpWithPassword,
  type SupabaseSession,
} from "./lib/supabaseClient";
import type { Sector, SortDirection, SortKey, Strategy, Trade, TradeStatus } from "./types";

type FilterStrategy = Strategy | "Tutte";
type FilterSector = Sector | "Tutti";

function App() {
  const supabaseConfigured = isSupabaseConfigured();
  const [trades, setTrades] = useState<Trade[]>(() => loadTrades(supabaseConfigured ? [] : demoTrades));
  const [activeStatus, setActiveStatus] = useState<TradeStatus>("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState<FilterStrategy>("Tutte");
  const [selectedSector, setSelectedSector] = useState<FilterSector>("Tutti");
  const [sortKey, setSortKey] = useState<SortKey>("openDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [activeView, setActiveView] = useState<VisualView>("sector");
  const [isDarkTheme, setIsDarkTheme] = useState(() => localStorage.getItem("portfolio-theme") === "dark");
  const [session, setSession] = useState<SupabaseSession | null>(() => loadStoredSession());
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [cloudReady, setCloudReady] = useState(false);
  const latestTradesRef = useRef(trades);
  const latestSessionRef = useRef(session);

  useEffect(() => {
    saveTrades(trades);
    latestTradesRef.current = trades;
  }, [trades]);

  useEffect(() => {
    latestSessionRef.current = session;
  }, [session]);

  useEffect(() => {
    localStorage.setItem("portfolio-theme", isDarkTheme ? "dark" : "light");
  }, [isDarkTheme]);

  useEffect(() => {
    let cancelled = false;

    function runAutoRefresh(): void {
      autoRefreshDailyPricesIfNeeded(latestTradesRef.current)
        .then((result) => {
          if (!cancelled && result.updatedCount > 0) {
            setTrades(result.trades);
            upsertPortfolioSnapshots(result.trades);
            void syncPortfolioToCloud(result.trades);
            setLastUpdatedAt(new Date());
          }
        })
        .catch(() => {
          // L'app resta local-first: se internet non c'e, usa gli ultimi dati salvati.
        });
    }

    runAutoRefresh();
    const intervalId = window.setInterval(runAutoRefresh, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setCloudReady(false);
      return;
    }

    const activeSession = session;
    let cancelled = false;

    async function hydrateFromCloud(): Promise<void> {
      setAuthError("");
      setSyncStatus("Sincronizzazione cloud...");

      try {
        const cloudPortfolio = await fetchCloudPortfolio(activeSession);
        if (cancelled) {
          return;
        }

        if (!cloudPortfolio) {
          const dedupedTrades = dedupeTrades(latestTradesRef.current);
          await saveCloudPortfolio(activeSession, {
            trades: dedupedTrades,
            snapshots: loadPortfolioSnapshots(),
          });
          saveTrades(dedupedTrades);
          setTrades(dedupedTrades);
          if (!cancelled) {
            setCloudReady(true);
            setSyncStatus("Cloud inizializzato.");
          }
          return;
        }

        const mergedTrades = dedupeTrades(cloudPortfolio.trades);
        const mergedSnapshots = mergeSnapshots(loadPortfolioSnapshots(), cloudPortfolio.snapshots);

        saveTrades(mergedTrades);
        savePortfolioSnapshots(mergedSnapshots);
        setTrades(mergedTrades);
        await saveCloudPortfolio(activeSession, {
          trades: mergedTrades,
          snapshots: mergedSnapshots,
        });

        if (!cancelled) {
          setCloudReady(true);
          setSyncStatus("Dati sincronizzati.");
        }
      } catch (error) {
        if (!cancelled) {
          setAuthError(error instanceof Error ? error.message : "Errore sync cloud.");
          setSyncStatus("Cloud non sincronizzato.");
        }
      }
    }

    void hydrateFromCloud();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session || !cloudReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void syncPortfolioToCloud(trades);
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [cloudReady, session, trades]);

  const counts = useMemo<Record<TradeStatus, number>>(
    () => ({
      open: trades.filter((trade) => trade.status === "open").length,
      closed: trades.filter((trade) => trade.status === "closed").length,
      watchlist: trades.filter((trade) => trade.status === "watchlist").length,
    }),
    [trades],
  );

  const existingTickers = useMemo(
    () => Array.from(new Set(trades.map((trade) => trade.ticker))).sort((a, b) => a.localeCompare(b)),
    [trades],
  );

  const filteredTrades = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toUpperCase();

    const visibleTrades = trades.filter((trade) => {
      const matchesStatus = trade.status === activeStatus;
      const matchesSearch = !normalizedQuery || trade.ticker.includes(normalizedQuery);
      const matchesStrategy = selectedStrategy === "Tutte" || trade.strategy === selectedStrategy;
      const matchesSector = selectedSector === "Tutti" || trade.sector === selectedSector;

      return matchesStatus && matchesSearch && matchesStrategy && matchesSector;
    });

    return [...visibleTrades].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const firstValue = sortableValue(a, sortKey);
      const secondValue = sortableValue(b, sortKey);

      if (typeof firstValue === "string" && typeof secondValue === "string") {
        return firstValue.localeCompare(secondValue) * direction;
      }

      return (Number(firstValue) - Number(secondValue)) * direction;
    });
  }, [activeStatus, searchQuery, selectedSector, selectedStrategy, sortDirection, sortKey, trades]);

  function handleSortChange(nextSortKey: SortKey): void {
    if (sortKey === nextSortKey) {
      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("desc");
  }

  function handleSaveTrade(trade: Trade): void {
    const exists = trades.some((currentTrade) => currentTrade.id === trade.id);
    const nextTrades = dedupeTrades(exists
      ? trades.map((currentTrade) => (currentTrade.id === trade.id ? trade : currentTrade))
      : [trade, ...trades]);

    setTrades(nextTrades);
    upsertPortfolioSnapshots(nextTrades);
    void syncPortfolioToCloud(nextTrades);
    void downloadPortfolioWorkbook(nextTrades);
  }

  function handleEditTrade(trade: Trade): void {
    setEditingTrade(trade);
    setModalOpen(true);
  }

  function handleNewTrade(): void {
    setEditingTrade(null);
    setModalOpen(true);
  }

  function handleDeleteTrade(tradeId: string): void {
    const canDelete = window.confirm("Eliminare questo trade?");
    if (!canDelete) {
      return;
    }

    setTrades((currentTrades) => {
      const nextTrades = currentTrades.filter((trade) => trade.id !== tradeId);
      void syncPortfolioToCloud(nextTrades);
      return nextTrades;
    });
  }

  function handleChangeStatus(tradeId: string, status: TradeStatus): void {
    setTrades((currentTrades) => {
      const nextTrades = dedupeTrades(currentTrades.map((trade) =>
        trade.id === tradeId
          ? {
              ...trade,
              status,
              closeDate: status === "closed" ? new Date().toISOString() : undefined,
              updatedAt: new Date().toISOString(),
            }
          : trade,
      ));
      void syncPortfolioToCloud(nextTrades);
      return nextTrades;
    });
  }

  async function handleRefreshPrices(): Promise<void> {
    try {
      const result = await refreshDailyPrices(trades);
      if (result.updatedCount > 0) {
        setTrades(result.trades);
        upsertPortfolioSnapshots(result.trades);
        await syncPortfolioToCloud(result.trades);
      }
    } catch {
      // Se internet non risponde, conserva gli ultimi dati reali salvati.
    }
    setLastUpdatedAt(new Date());
  }

  async function handleLogin(email: string, password: string): Promise<void> {
    setAuthLoading(true);
    setAuthError("");
    try {
      const nextSession = await signInWithPassword(email.trim(), password);
      saveStoredSession(nextSession);
      setSession(nextSession);
      setSyncStatus("Login completato.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login non riuscito.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignup(email: string, password: string): Promise<void> {
    setAuthLoading(true);
    setAuthError("");
    try {
      const nextSession = await signUpWithPassword(email.trim(), password);
      saveStoredSession(nextSession);
      setSession(nextSession);
      setSyncStatus("Account creato.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Creazione account non riuscita.");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout(): void {
    saveStoredSession(null);
    setSession(null);
    setCloudReady(false);
    setSyncStatus("Logout completato. Modalita locale attiva.");
  }

  async function syncPortfolioToCloud(nextTrades = latestTradesRef.current): Promise<void> {
    const currentSession = latestSessionRef.current;
    if (!currentSession || !cloudReady) {
      return;
    }

    try {
      setSyncStatus("Salvataggio cloud...");
      const dedupedTrades = dedupeTrades(nextTrades);
      saveTrades(dedupedTrades);
      await saveCloudPortfolio(currentSession, {
        trades: dedupedTrades,
        snapshots: loadPortfolioSnapshots(),
      });
      setSyncStatus("Cloud salvato.");
    } catch (error) {
      setSyncStatus("Cloud non salvato.");
      setAuthError(error instanceof Error ? error.message : "Errore salvataggio cloud.");
    }
  }

  const lastUpdatedLabel = lastUpdatedAt.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (supabaseConfigured && !session) {
    return (
      <div className={`min-h-screen ${isDarkTheme ? "theme-dark" : ""}`}>
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
          <section className="w-full max-w-3xl space-y-5">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold text-ink">Mio Portafoglio</h1>
              <p className="text-sm text-muted">Accesso riservato. Effettua il login per visualizzare i trade.</p>
            </div>
            <AuthPanel
              allowSignup={false}
              configured={supabaseConfigured}
              errorMessage={authError}
              loading={authLoading}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onSignup={handleSignup}
              session={session}
              syncStatus={syncStatus}
            />
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkTheme ? "theme-dark" : ""}`}>
      <Header
        activeView={activeView}
        closedCount={counts.closed}
        isDarkTheme={isDarkTheme}
        onToggleTheme={() => setIsDarkTheme((current) => !current)}
        onViewChange={setActiveView}
        openCount={counts.open}
      />
      <main className="mx-auto max-w-[1920px] space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        <AuthPanel
          configured={supabaseConfigured}
          errorMessage={authError}
          loading={authLoading}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onSignup={handleSignup}
          session={session}
          syncStatus={syncStatus}
        />

        <Dashboard activeView={activeView} trades={trades} />

        <div className="space-y-4">
          <TradeTabs
            activeStatus={activeStatus}
            counts={counts}
            lastUpdatedLabel={lastUpdatedLabel}
            onNewTrade={handleNewTrade}
            onRefreshPrices={handleRefreshPrices}
            onExportExcel={() => {
              void downloadPortfolioWorkbook(trades);
            }}
            onSearchChange={setSearchQuery}
            onSectorChange={setSelectedSector}
            onStatusChange={setActiveStatus}
            onStrategyChange={setSelectedStrategy}
            searchQuery={searchQuery}
            selectedSector={selectedSector}
            selectedStrategy={selectedStrategy}
          />

          <TradeTable
            onChangeStatus={handleChangeStatus}
            onDeleteTrade={handleDeleteTrade}
            onEditTrade={handleEditTrade}
            onSortChange={handleSortChange}
            sortDirection={sortDirection}
            sortKey={sortKey}
            trades={filteredTrades}
          />
        </div>
      </main>

      <NewTradeModal
        existingTickers={existingTickers}
        onClose={() => {
          setModalOpen(false);
          setEditingTrade(null);
        }}
        onSave={handleSaveTrade}
        open={modalOpen}
        tradeToEdit={editingTrade}
      />
    </div>
  );
}

function sortableValue(trade: Trade, sortKey: SortKey): string | number {
  if (sortKey === "profitLoss") {
    return calculateProfitLoss(trade.entryPrice, trade.currentPrice, trade.quantity).euro;
  }

  if (sortKey === "openDate") {
    return Date.parse(trade.openDate);
  }

  if (sortKey === "dailyOpen") {
    return trade.dailyOpen ?? 0;
  }

  if (sortKey === "dailyClose") {
    return trade.dailyClose ?? 0;
  }

  return trade[sortKey];
}

function mergeTrades(localTrades: Trade[], cloudTrades: Trade[]): Trade[] {
  return dedupeTrades([...cloudTrades, ...localTrades]);
}

function dedupeTrades(tradesToDedupe: Trade[]): Trade[] {
  const mergedTrades = new Map<string, Trade>();

  for (const trade of tradesToDedupe) {
    const key = tradeSignature(trade);
    const existingTrade = mergedTrades.get(key);
    mergedTrades.set(key, existingTrade ? pickBestTrade(existingTrade, trade) : trade);
  }

  return Array.from(mergedTrades.values()).sort((a, b) => Date.parse(b.openDate) - Date.parse(a.openDate));
}

function pickBestTrade(firstTrade: Trade, secondTrade: Trade): Trade {
  if (firstTrade.status !== secondTrade.status) {
    if (secondTrade.status === "closed") {
      return secondTrade;
    }

    if (firstTrade.status === "closed") {
      return firstTrade;
    }
  }

  const firstUpdatedAt = Date.parse(firstTrade.updatedAt || firstTrade.createdAt || "");
  const secondUpdatedAt = Date.parse(secondTrade.updatedAt || secondTrade.createdAt || "");

  if (Number.isNaN(firstUpdatedAt)) {
    return secondTrade;
  }

  if (Number.isNaN(secondUpdatedAt)) {
    return firstTrade;
  }

  return secondUpdatedAt >= firstUpdatedAt ? secondTrade : firstTrade;
}

function mergeSnapshots(localSnapshots: unknown[], cloudSnapshots: unknown[]): unknown[] {
  const mergedSnapshots = new Map<string, unknown>();

  for (const snapshot of [...cloudSnapshots, ...localSnapshots]) {
    const key = snapshotKey(snapshot);
    if (key) {
      mergedSnapshots.set(key, snapshot);
    }
  }

  return Array.from(mergedSnapshots.values());
}

function tradeSignature(trade: Trade): string {
  return [
    trade.ticker.toUpperCase(),
    trade.openDate.slice(0, 10),
    normalizeNumberForSignature(trade.entryPrice),
    normalizeNumberForSignature(trade.quantity),
  ].join("|");
}

function normalizeNumberForSignature(value: number): string {
  return Number(value).toFixed(4);
}

function snapshotKey(snapshot: unknown): string {
  if (!snapshot || typeof snapshot !== "object") {
    return "";
  }

  const value = snapshot as Record<string, unknown>;
  return [
    String(value.snapshotDate ?? ""),
    String(value.ticker ?? ""),
    String(value.openDate ?? ""),
    String(value.entryPrice ?? ""),
    String(value.quantity ?? ""),
  ].join("|");
}

export default App;
