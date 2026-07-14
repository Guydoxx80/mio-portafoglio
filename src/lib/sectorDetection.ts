import type { Sector } from "../types";

const LOCAL_SECTOR_MAP: Record<string, Sector> = {
  AAPL: "Technology",
  MSFT: "Technology",
  NVDA: "Technology",
  GOOGL: "Communication Services",
  META: "Communication Services",
  AMZN: "Consumer Cyclical",
  TSLA: "Consumer Cyclical",
  JPM: "Financial Services",
  BAC: "Financial Services",
  V: "Financial Services",
  MA: "Financial Services",
  UNH: "Healthcare",
  JNJ: "Healthcare",
  PFE: "Healthcare",
  XOM: "Energy",
  CVX: "Energy",
  BE: "Energy",
  PL: "Industrials",
  SPCX: "Industrials",
  SPCE: "Industrials",
  FLEX: "Technology",
  AEHR: "Technology",
  BTC: "Cryptocurrency",
  "BTC-USD": "Cryptocurrency",
  ETH: "Cryptocurrency",
  "ETH-USD": "Cryptocurrency",
  SOL: "Cryptocurrency",
  BNB: "Cryptocurrency",
  SPY: "ETF / Fund",
  QQQ: "ETF / Fund",
  VOO: "ETF / Fund",
};

const EXTERNAL_SECTOR_MAP: Record<string, Sector> = {
  technology: "Technology",
  healthcare: "Healthcare",
  "financial services": "Financial Services",
  "consumer cyclical": "Consumer Cyclical",
  "communication services": "Communication Services",
  "communication service": "Communication Services",
  "communication": "Communication Services",
  industrials: "Industrials",
  "consumer defensive": "Consumer Defensive",
  energy: "Energy",
  utilities: "Utilities",
  "real estate": "Real Estate",
  "basic materials": "Basic Materials",
  cryptocurrency: "Cryptocurrency",
  crypto: "Cryptocurrency",
  etf: "ETF / Fund",
  fund: "ETF / Fund",
  "aerospace & defense": "Industrials",
  aerospace: "Industrials",
  defense: "Industrials",
  airlines: "Industrials",
  "specialty industrial machinery": "Industrials",
  "capital markets": "Financial Services",
  banks: "Financial Services",
  "asset management": "Financial Services",
  "credit services": "Financial Services",
  biotechnology: "Healthcare",
  "medical devices": "Healthcare",
  "drug manufacturers": "Healthcare",
  software: "Technology",
  semiconductors: "Technology",
  "electronic components": "Technology",
  "internet content & information": "Communication Services",
  "auto manufacturers": "Consumer Cyclical",
  "consumer electronics": "Technology",
  "oil & gas": "Energy",
  "transportation services": "Industrials",
  transportation: "Industrials",
  "energy & transportation": "Industrials",
};

type SecTickerRow = [number, string, string, string];

type SecCompanyTickerResponse = {
  fields: string[];
  data: SecTickerRow[];
};

type SecSubmissionResponse = {
  sic?: string;
  sicDescription?: string;
  ownerOrg?: string;
};

let secTickerDatabasePromise: Promise<SecCompanyTickerResponse | null> | null = null;

type YahooAssetProfile = {
  sector?: string;
};

type YahooQuoteSummaryResult = {
  assetProfile?: YahooAssetProfile;
};

type YahooQuoteSummaryResponse = {
  quoteSummary?: {
    result?: YahooQuoteSummaryResult[];
  };
};

async function lookupSectorFromExternalApi(ticker: string): Promise<Sector | null> {
  const secSector = await lookupSectorFromSec(ticker);
  if (secSector) {
    return secSector;
  }

  const yahooSector = await lookupSectorFromYahooFinance(ticker);
  if (yahooSector) {
    return yahooSector;
  }

  const directFinvizSector = await lookupSectorFromFinviz(ticker);
  if (directFinvizSector) {
    return directFinvizSector;
  }

  return lookupSectorFromFinvizReader(ticker);
}

async function lookupSectorFromSec(ticker: string): Promise<Sector | null> {
  try {
    const tickerDatabase = await getSecTickerDatabase();
    if (!tickerDatabase) {
      return null;
    }

    const normalizedTicker = ticker.toUpperCase();
    const row = tickerDatabase.data.find((item) => item[2]?.toUpperCase() === normalizedTicker);
    const cik = row?.[0];
    if (!cik) {
      return null;
    }

    const paddedCik = String(cik).padStart(10, "0");
    const response = await fetchWithTimeout(
      `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
      {
        headers: {
          Accept: "application/json",
        },
      },
      5000,
    );

    if (!response.ok) {
      return null;
    }

    const submission = (await response.json()) as SecSubmissionResponse;
    return parseSectorFromText([submission.sicDescription, submission.ownerOrg, submission.sic].filter(Boolean).join(" "));
  } catch {
    return null;
  }
}

function getSecTickerDatabase(): Promise<SecCompanyTickerResponse | null> {
  secTickerDatabasePromise ??= fetchSecTickerDatabase();
  return secTickerDatabasePromise;
}

async function fetchSecTickerDatabase(): Promise<SecCompanyTickerResponse | null> {
  try {
    const response = await fetchWithTimeout(
      "https://www.sec.gov/files/company_tickers_exchange.json",
      {
        headers: {
          Accept: "application/json",
        },
      },
      7000,
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SecCompanyTickerResponse;
  } catch {
    return null;
  }
}

async function lookupSectorFromYahooFinance(ticker: string): Promise<Sector | null> {
  try {
    const response = await fetchWithTimeout(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=assetProfile`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as YahooQuoteSummaryResponse;
    const sector = data.quoteSummary?.result?.[0]?.assetProfile?.sector;
    return mapExternalSector(sector);
  } catch {
    return null;
  }
}

async function lookupSectorFromFinviz(ticker: string): Promise<Sector | null> {
  try {
    const response = await fetchWithTimeout(`https://finviz.com/quote.ashx?t=${encodeURIComponent(ticker)}&p=d`, {
      headers: {
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      return null;
    }

    return parseSectorFromText(await response.text());
  } catch {
    return null;
  }
}

async function lookupSectorFromFinvizReader(ticker: string): Promise<Sector | null> {
  try {
    const finvizUrl = `https://finviz.com/quote.ashx?t=${encodeURIComponent(ticker)}&p=d`;
    const readerUrl = `https://r.jina.ai/${finvizUrl}`;
    const response = await fetchWithTimeout(
      readerUrl,
      {
        headers: {
          Accept: "text/plain",
        },
      },
      5000,
    );

    if (!response.ok) {
      return null;
    }

    return parseSectorFromText(await response.text());
  } catch {
    return null;
  }
}

export async function detectSectorFromTicker(ticker: string): Promise<Sector> {
  const normalizedTicker = ticker.trim().toUpperCase();

  if (!normalizedTicker) {
    return "Altro";
  }

  await new Promise((resolve) => window.setTimeout(resolve, 180));

  const localMatch = LOCAL_SECTOR_MAP[normalizedTicker];
  if (localMatch) {
    return localMatch;
  }

  const apiMatch = await lookupSectorFromExternalApi(normalizedTicker);
  return apiMatch ?? "Altro";
}

function mapExternalSector(sector: string | undefined): Sector | null {
  if (!sector) {
    return null;
  }

  return EXTERNAL_SECTOR_MAP[sector.trim().toLowerCase()] ?? null;
}

function parseSectorFromText(text: string): Sector | null {
  const normalizedText = normalizeText(text);

  for (const externalSector of Object.keys(EXTERNAL_SECTOR_MAP).sort((first, second) => second.length - first.length)) {
    const sectorPattern = new RegExp(`(^|[^a-z])${escapeRegExp(externalSector)}([^a-z]|$)`, "i");
    if (sectorPattern.test(normalizedText)) {
      return EXTERNAL_SECTOR_MAP[externalSector];
    }
  }

  return null;
}

function normalizeText(value: string): string {
  const withoutHtml = value.replace(/<[^>]*>/g, " ");
  const decoded = new DOMParser().parseFromString(withoutHtml, "text/html").documentElement.textContent ?? withoutHtml;
  return decoded.replace(/\s+/g, " ").trim().toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}
