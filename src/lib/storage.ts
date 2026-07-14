import type { Trade } from "../types";

const STORAGE_KEY = "mio-portafoglio-trades";

export function loadTrades(fallback: Trade[]): Trade[] {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return fallback;
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return fallback;
    }

    return mergeMissingFallbackTrades(migrateStoredTrades(parsedValue as Trade[]), fallback);
  } catch {
    return fallback;
  }
}

export function saveTrades(trades: Trade[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  } catch {
    // Se localStorage non è disponibile, l'app resta comunque usabile in memoria.
  }
}

export function resetStoredTrades(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function mergeMissingFallbackTrades(storedTrades: Trade[], fallbackTrades: Trade[]): Trade[] {
  const storedSignatures = new Set(storedTrades.map(tradeSignature));
  const missingFallbackTrades = fallbackTrades.filter((trade) => !storedSignatures.has(tradeSignature(trade)));

  return [...storedTrades, ...missingFallbackTrades];
}

function migrateStoredTrades(storedTrades: Trade[]): Trade[] {
  return storedTrades.map((trade) => {
    if (trade.ticker !== "SATS") {
      return trade;
    }

    return {
      ...trade,
      ticker: "ECHO",
      currentPrice: 97.96,
      dailyOpen: 96.2,
      dailyClose: 97.96,
      dailyPriceDate: "2026-07-09",
      dailyPriceUpdatedAt: new Date().toISOString(),
      dailyPriceSource: "Yahoo",
      updatedAt: new Date().toISOString(),
    };
  });
}

function tradeSignature(trade: Trade): string {
  return [
    trade.ticker,
    trade.openDate,
    trade.entryPrice.toFixed(4),
    trade.quantity.toFixed(4),
  ].join("|");
}
