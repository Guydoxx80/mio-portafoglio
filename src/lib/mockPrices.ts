import type { Trade } from "../types";

const BASE_PRICES: Record<string, number> = {
  FLEX: 149.71,
  BLDP: 4.22,
  POET: 12.53,
  AEHR: 108.47,
  FSLY: 18.55,
  ECHO: 97.96,
  PL: 31.15,
  BE: 260.22,
  UNH: 408.52,
  AAPL: 203.92,
  BTC: 103200,
  "BTC-USD": 103200,
};

function clamp(value: number, min: number): number {
  return Math.max(value, min);
}

export function getMockPrice(ticker: string, fallbackPrice: number): number {
  const normalizedTicker = ticker.trim().toUpperCase();
  const basePrice = fallbackPrice > 0 ? fallbackPrice : BASE_PRICES[normalizedTicker] ?? 1;
  const drift = 1 + (Math.random() - 0.42) * 0.08;
  return Number(clamp(basePrice * drift, 0.01).toFixed(2));
}

export function refreshMockPrices(trades: Trade[]): Trade[] {
  return trades.map((trade) => {
    if (trade.status !== "open") {
      return trade;
    }

    return {
      ...trade,
      currentPrice: getMockPrice(trade.ticker, trade.currentPrice || trade.entryPrice),
      updatedAt: new Date().toISOString(),
    };
  });
}
