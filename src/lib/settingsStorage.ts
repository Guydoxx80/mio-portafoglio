import { DEFAULT_PORTFOLIO_SETTINGS, type PortfolioSettings } from "../types";

const SETTINGS_STORAGE_KEY = "mio-portafoglio-settings";

export function loadPortfolioSettings(): PortfolioSettings {
  if (typeof window === "undefined") {
    return DEFAULT_PORTFOLIO_SETTINGS;
  }

  try {
    const rawValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : {};
    return normalizeSettings(parsedValue);
  } catch {
    return DEFAULT_PORTFOLIO_SETTINGS;
  }
}

export function savePortfolioSettings(settings: PortfolioSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function normalizeSettings(value: Partial<PortfolioSettings>): PortfolioSettings {
  return {
    ...DEFAULT_PORTFOLIO_SETTINGS,
    ...value,
    capitalAdditions: Array.isArray(value.capitalAdditions) ? value.capitalAdditions : [],
  };
}
