import type { Trade } from "../types";

const DAILY_PRICE_UPDATE_KEY = "mio-portafoglio-daily-price-update";

export type DailyPrice = {
  ticker: string;
  open: number;
  close: number;
  date: string;
  source: string;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

export async function refreshDailyPrices(trades: Trade[]): Promise<{ trades: Trade[]; updatedCount: number }> {
  const tickers = Array.from(new Set(trades.filter((trade) => trade.status === "open").map((trade) => trade.ticker)));
  const prices = await fetchDailyPrices(tickers);

  if (!prices.size) {
    return { trades, updatedCount: 0 };
  }

  const nextTrades = trades.map((trade) => {
    const dailyPrice = prices.get(trade.ticker);
    if (!dailyPrice) {
      return trade;
    }

    return {
      ...trade,
      currentPrice: dailyPrice.close,
      dailyOpen: dailyPrice.open,
      dailyClose: dailyPrice.close,
      dailyPriceDate: dailyPrice.date,
      dailyPriceUpdatedAt: new Date().toISOString(),
      dailyPriceSource: dailyPrice.source,
      updatedAt: new Date().toISOString(),
    };
  });

  return { trades: nextTrades, updatedCount: prices.size };
}

export async function fetchHistoricalDailyPrices(
  tickers: string[],
  startDate: string,
  endDate: string,
): Promise<Map<string, DailyPrice[]>> {
  const uniqueTickers = Array.from(new Set(tickers));
  const results = await Promise.allSettled(
    uniqueTickers.map(async (ticker) => ({
      ticker,
      prices: await fetchHistoricalDailyPrice(ticker, startDate, endDate),
    })),
  );
  const history = new Map<string, DailyPrice[]>();

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.prices.length > 0) {
      history.set(result.value.ticker, result.value.prices);
    }
  }

  return history;
}

export async function autoRefreshDailyPricesIfNeeded(trades: Trade[]): Promise<{ trades: Trade[]; updatedCount: number }> {
  const updateSlot = getMarketUpdateSlot();

  if (!updateSlot || !shouldAttemptDailyPriceUpdate(updateSlot.key)) {
    return { trades, updatedCount: 0 };
  }

  const result = await refreshDailyPrices(trades);
  if (result.updatedCount > 0 && latestUpdatedPriceDate(result.trades) >= updateSlot.expectedPriceDate) {
    markDailyPriceUpdateAttempt(updateSlot.key);
  }

  return result;
}

function shouldAttemptDailyPriceUpdate(updateKey: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(DAILY_PRICE_UPDATE_KEY) !== updateKey;
}

function markDailyPriceUpdateAttempt(updateKey: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DAILY_PRICE_UPDATE_KEY, updateKey);
  }
}

type MarketUpdateSlot = {
  key: string;
  expectedPriceDate: string;
};

function getMarketUpdateSlot(date = new Date()): MarketUpdateSlot | null {
  const marketTime = irelandMarketTime(date);
  const todayKey = irelandDateKey(date);
  const isWeekday = !["Sat", "Sun"].includes(marketTime.weekday);

  if (isWeekday && marketTime.minutes >= 14 * 60 + 30 && marketTime.minutes < 21 * 60) {
    return null;
  }

  const phase = isWeekday && marketTime.minutes >= 21 * 60 ? "post-close" : "pre-open";
  const expectedPriceDate = phase === "post-close" ? todayKey : previousBusinessDateKey(date);

  return {
    key: `${todayKey}:${phase}:${expectedPriceDate}`,
    expectedPriceDate,
  };
}

function irelandMarketTime(date = new Date()): { weekday: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Dublin",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  return {
    weekday: String(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function irelandDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function previousBusinessDateKey(date: Date): string {
  const cursor = new Date(date);

  do {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  } while (["Sat", "Sun"].includes(irelandMarketTime(cursor).weekday));

  return irelandDateKey(cursor);
}

function latestUpdatedPriceDate(trades: Trade[]): string {
  return trades.reduce((latestDate, trade) => {
    if (!trade.dailyPriceDate) {
      return latestDate;
    }

    return trade.dailyPriceDate > latestDate ? trade.dailyPriceDate : latestDate;
  }, "");
}

async function fetchDailyPrices(tickers: string[]): Promise<Map<string, DailyPrice>> {
  const results = await Promise.allSettled(tickers.map((ticker) => fetchDailyPrice(ticker)));
  const prices = new Map<string, DailyPrice>();

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      prices.set(result.value.ticker, result.value);
    }
  }

  return prices;
}

async function fetchDailyPrice(ticker: string): Promise<DailyPrice | null> {
  for (const provider of [fetchYahooDailyPrice, fetchYahooViaReaderDailyPrice, fetchStooqDailyPrice]) {
    try {
      const dailyPrice = await provider(ticker);
      if (dailyPrice) {
        return dailyPrice;
      }
    } catch {
      // Prova il provider successivo: alcune fonti gratuite bloccano richieste browser/CORS.
    }
  }

  return null;
}

async function fetchHistoricalDailyPrice(ticker: string, startDate: string, endDate: string): Promise<DailyPrice[]> {
  for (const provider of [fetchYahooHistoricalDailyPrice, fetchYahooViaReaderHistoricalDailyPrice, fetchStooqHistoricalDailyPrice]) {
    try {
      const prices = await provider(ticker, startDate, endDate);
      if (prices.length > 0) {
        return prices;
      }
    } catch {
      // Prova il provider successivo.
    }
  }

  return [];
}

async function fetchYahooDailyPrice(ticker: string): Promise<DailyPrice | null> {
  const response = await fetch(yahooChartUrl(ticker));

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as YahooChartResponse;
  return parseYahooDailyPrice(ticker, payload, "Yahoo");
}

async function fetchYahooHistoricalDailyPrice(ticker: string, startDate: string, endDate: string): Promise<DailyPrice[]> {
  const response = await fetch(yahooChartHistoryUrl(ticker, startDate, endDate));

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as YahooChartResponse;
  return parseYahooDailyPriceHistory(ticker, payload, "Yahoo", startDate, endDate);
}

async function fetchYahooViaReaderDailyPrice(ticker: string): Promise<DailyPrice | null> {
  const response = await fetch(`https://r.jina.ai/http://r.jina.ai/http://${yahooChartUrl(ticker)}`);

  if (!response.ok) {
    return null;
  }

  const text = await response.text();
  const jsonStart = text.indexOf("{");
  if (jsonStart < 0) {
    return null;
  }

  try {
    const payload = JSON.parse(text.slice(jsonStart)) as YahooChartResponse;
    return parseYahooDailyPrice(ticker, payload, "Yahoo");
  } catch {
    return null;
  }
}

async function fetchYahooViaReaderHistoricalDailyPrice(
  ticker: string,
  startDate: string,
  endDate: string,
): Promise<DailyPrice[]> {
  const response = await fetch(`https://r.jina.ai/http://r.jina.ai/http://${yahooChartHistoryUrl(ticker, startDate, endDate)}`);

  if (!response.ok) {
    return [];
  }

  const text = await response.text();
  const jsonStart = text.indexOf("{");
  if (jsonStart < 0) {
    return [];
  }

  try {
    const payload = JSON.parse(text.slice(jsonStart)) as YahooChartResponse;
    return parseYahooDailyPriceHistory(ticker, payload, "Yahoo", startDate, endDate);
  } catch {
    return [];
  }
}

async function fetchStooqDailyPrice(ticker: string): Promise<DailyPrice | null> {
  const response = await fetch(stooqDailyUrl(ticker));

  if (!response.ok) {
    return null;
  }

  const rows = (await response.text()).trim().split(/\r?\n/);
  const lastRow = rows[rows.length - 1];
  if (!lastRow || lastRow.startsWith("No data")) {
    return null;
  }

  const [date, open, , , close] = lastRow.split(",");
  const openPrice = Number(open);
  const closePrice = Number(close);

  if (!date || Number.isNaN(openPrice) || Number.isNaN(closePrice)) {
    return null;
  }

  return {
    ticker,
    open: roundPrice(openPrice),
    close: roundPrice(closePrice),
    date,
    source: "Stooq",
  };
}

async function fetchStooqHistoricalDailyPrice(ticker: string, startDate: string, endDate: string): Promise<DailyPrice[]> {
  const response = await fetch(stooqDailyUrl(ticker, startDate, endDate));

  if (!response.ok) {
    return [];
  }

  const rows = (await response.text()).trim().split(/\r?\n/).slice(1);
  const prices: DailyPrice[] = [];

  for (const row of rows) {
    if (!row || row.startsWith("No data")) {
      continue;
    }

    const [date, open, , , close] = row.split(",");
    const openPrice = Number(open);
    const closePrice = Number(close);

    if (!date || Number.isNaN(openPrice) || Number.isNaN(closePrice) || date < startDate || date > endDate) {
      continue;
    }

    prices.push({
      ticker,
      open: roundPrice(openPrice),
      close: roundPrice(closePrice),
      date,
      source: "Stooq",
    });
  }

  return prices;
}

function roundPrice(value: number): number {
  return Number(value.toFixed(2));
}

function yahooChartUrl(ticker: string): string {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=10d&interval=1d`;
}

function stooqDailyUrl(ticker: string, startDate?: string, endDate?: string): string {
  const params = new URLSearchParams({
    s: `${ticker.toLowerCase()}.us`,
    i: "d",
  });

  if (startDate && endDate) {
    params.set("d1", startDate.replace(/-/g, ""));
    params.set("d2", endDate.replace(/-/g, ""));
  }

  return `https://stooq.com/q/d/l/?${params.toString()}`;
}

function yahooChartHistoryUrl(ticker: string, startDate: string, endDate: string): string {
  const period1 = Math.floor(new Date(`${startDate}T00:00:00.000Z`).getTime() / 1000);
  const period2 = Math.floor(new Date(`${endDate}T23:59:59.000Z`).getTime() / 1000);

  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker,
  )}?period1=${period1}&period2=${period2}&interval=1d`;
}

function parseYahooDailyPrice(ticker: string, payload: YahooChartResponse, source: string): DailyPrice | null {
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  const opens = quote?.open ?? [];
  const closes = quote?.close ?? [];

  for (let index = timestamps.length - 1; index >= 0; index -= 1) {
    const open = opens[index];
    const close = closes[index];
    if (typeof open === "number" && typeof close === "number") {
      return {
        ticker,
        open: roundPrice(open),
        close: roundPrice(close),
        date: new Date(timestamps[index] * 1000).toISOString().slice(0, 10),
        source,
      };
    }
  }

  return null;
}

function parseYahooDailyPriceHistory(
  ticker: string,
  payload: YahooChartResponse,
  source: string,
  startDate: string,
  endDate: string,
): DailyPrice[] {
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  const opens = quote?.open ?? [];
  const closes = quote?.close ?? [];
  const prices: DailyPrice[] = [];

  for (let index = 0; index < timestamps.length; index += 1) {
    const open = opens[index];
    const close = closes[index];
    const date = new Date(timestamps[index] * 1000).toISOString().slice(0, 10);

    if (typeof open === "number" && typeof close === "number" && date >= startDate && date <= endDate) {
      prices.push({
        ticker,
        open: roundPrice(open),
        close: roundPrice(close),
        date,
        source,
      });
    }
  }

  return prices;
}
