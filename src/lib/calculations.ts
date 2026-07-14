import type { ProfitLoss } from "../types";

export const MAX_RISK_BUDGET = 1000;

export function calculateRiskEuro(maxRiskBudget: number, riskPercent: number): number {
  return Number((maxRiskBudget * (riskPercent / 100)).toFixed(2));
}

export function calculateRiskPerShare(entryPrice: number, stopLoss: number): number {
  return Number((entryPrice - stopLoss).toFixed(6));
}

export function calculateQuantity(
  entryPrice: number,
  stopLoss: number,
  riskPercent: number,
  maxRiskBudget = 1000,
  decimals = 2,
): number {
  const riskPerShare = entryPrice - stopLoss;
  if (!entryPrice || !stopLoss || riskPerShare <= 0) return 0;
  const riskEuro = maxRiskBudget * (riskPercent / 100);
  const quantity = riskEuro / riskPerShare;
  return Number(quantity.toFixed(decimals));
}

export function calculateProfitLoss(
  entryPrice: number,
  currentPrice: number,
  quantity: number,
): ProfitLoss {
  if (!entryPrice || !quantity) {
    return { euro: 0, percent: 0 };
  }

  const euro = (currentPrice - entryPrice) * quantity;
  const percent = ((currentPrice - entryPrice) / entryPrice) * 100;

  return {
    euro: Number(euro.toFixed(2)),
    percent: Number(percent.toFixed(2)),
  };
}

// Test manuali richiesti:
// calculateQuantity(10, 8, 50, 1000) === 250
// calculateQuantity(10, 8, 10, 1000) === 50
// calculateQuantity(10, 8, 25, 1000) === 125
// calculateQuantity(10, 8, 75, 1000) === 375
// calculateQuantity(10, 8, 100, 1000) === 500
