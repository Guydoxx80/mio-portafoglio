export type Strategy =
  | "Strategia Volumi"
  | "Cryptocurrencies"
  | "Lungo Termine"
  | "Speculativo";

export type Sector =
  | "Technology"
  | "Healthcare"
  | "Financial Services"
  | "Consumer Cyclical"
  | "Communication Services"
  | "Industrials"
  | "Consumer Defensive"
  | "Energy"
  | "Utilities"
  | "Real Estate"
  | "Basic Materials"
  | "Cryptocurrency"
  | "ETF / Fund"
  | "Altro";

export type TradeStatus = "open" | "closed" | "watchlist";

export type TakeProfitLevel = {
  id: string;
  label: string;
  percentage?: number;
  price?: number;
  isCustom: boolean;
};

export type Trade = {
  id: string;
  ticker: string;
  sector: Sector;
  strategy: Strategy;
  entryPrice: number;
  currentPrice: number;
  dailyOpen?: number;
  dailyClose?: number;
  dailyPriceDate?: string;
  dailyPriceUpdatedAt?: string;
  dailyPriceSource?: string;
  stopLoss: number;
  takeProfits: TakeProfitLevel[];
  riskPercent: number;
  riskEuro: number;
  quantity: number;
  status: TradeStatus;
  openDate: string;
  closeDate?: string;
  journal: string;
  analysisFileName?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProfitLoss = {
  euro: number;
  percent: number;
};

export type SortKey =
  | "openDate"
  | "ticker"
  | "strategy"
  | "quantity"
  | "entryPrice"
  | "currentPrice"
  | "dailyOpen"
  | "dailyClose"
  | "riskEuro"
  | "profitLoss";

export type SortDirection = "asc" | "desc";

export type PortfolioSettings = {
  initialCapital: number;
  maxTradeRisk: number;
  portfolioDivisor: number;
  maxLeverage: number;
  alertThresholdPercent: number;
  capitalAdditions: CapitalAddition[];
};

export type CapitalAddition = {
  id: string;
  amount: number;
  date: string;
  note: string;
};

export const DEFAULT_PORTFOLIO_SETTINGS: PortfolioSettings = {
  initialCapital: 20000,
  maxTradeRisk: 1000,
  portfolioDivisor: 20,
  maxLeverage: 1,
  alertThresholdPercent: 3,
  capitalAdditions: [],
};

export const STRATEGIES: Strategy[] = [
  "Strategia Volumi",
  "Cryptocurrencies",
  "Lungo Termine",
  "Speculativo",
];

export const SECTORS: Sector[] = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Consumer Cyclical",
  "Communication Services",
  "Industrials",
  "Consumer Defensive",
  "Energy",
  "Utilities",
  "Real Estate",
  "Basic Materials",
  "Cryptocurrency",
  "ETF / Fund",
  "Altro",
];
