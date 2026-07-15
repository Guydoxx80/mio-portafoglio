import type { PortfolioSettings, Trade } from "../types";

export type TradeAlert = {
  key: string;
  kind: "TP" | "SL";
  ticker: string;
  currentPrice: number;
  targetPrice: number;
  distancePercent: number;
  tradeId: string;
  openDate: string;
};

export function buildTradeAlerts(trades: Trade[], settings: PortfolioSettings): TradeAlert[] {
  const threshold = Math.max(settings.alertThresholdPercent, 0);

  return trades
    .filter((trade) => trade.status === "open")
    .flatMap((trade) => buildAlertsForTrade(trade, threshold))
    .sort((firstAlert, secondAlert) => firstAlert.distancePercent - secondAlert.distancePercent);
}

function buildAlertsForTrade(trade: Trade, threshold: number): TradeAlert[] {
  const alerts: TradeAlert[] = [];

  if (trade.stopLoss > 0) {
    const distancePercent = percentageDistance(trade.currentPrice, trade.stopLoss);
    if (distancePercent <= threshold || trade.currentPrice <= trade.stopLoss) {
      alerts.push(createAlert(trade, "SL", trade.stopLoss, distancePercent));
    }
  }

  for (const takeProfit of trade.takeProfits) {
    if (!takeProfit.price || takeProfit.price <= 0) {
      continue;
    }

    const distancePercent = percentageDistance(trade.currentPrice, takeProfit.price);
    if (distancePercent <= threshold || trade.currentPrice >= takeProfit.price) {
      alerts.push(createAlert(trade, "TP", takeProfit.price, distancePercent));
    }
  }

  return alerts;
}

function createAlert(trade: Trade, kind: "TP" | "SL", targetPrice: number, distancePercent: number): TradeAlert {
  return {
    key: [trade.id, kind, targetPrice.toFixed(4)].join("|"),
    kind,
    ticker: trade.ticker,
    currentPrice: trade.currentPrice,
    targetPrice,
    distancePercent,
    tradeId: trade.id,
    openDate: trade.openDate,
  };
}

function percentageDistance(currentPrice: number, targetPrice: number): number {
  if (!targetPrice) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs((currentPrice - targetPrice) / targetPrice) * 100;
}
