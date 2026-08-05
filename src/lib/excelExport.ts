import type { Trade } from "../types";
import { calculateProfitLoss } from "./calculations";
import { fetchHistoricalDailyPrices } from "./marketData";

const SNAPSHOT_STORAGE_KEY = "mio-portafoglio-excel-snapshots";

type PortfolioSnapshot = {
  snapshotDate: string;
  ticker: string;
  sector: string;
  strategy: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  dailyOpen?: number;
  dailyClose?: number;
  dailyPriceDate?: string;
  stopLoss: number;
  riskEuro: number;
  riskPercent: number;
  profitLossEuro: number;
  profitLossPercent: number;
  openDate: string;
  status: string;
};

export function upsertPortfolioSnapshots(trades: Trade[], date = new Date()): void {
  if (typeof window === "undefined") {
    return;
  }

  const snapshotDate = dateKey(date);
  const existingSnapshots = loadSnapshots();
  const nextSnapshots = new Map(existingSnapshots.map((snapshot) => [snapshotKey(snapshot), snapshot]));

  for (const snapshot of buildSnapshots(trades, snapshotDate)) {
    nextSnapshots.set(snapshotKey(snapshot), snapshot);
  }

  window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(Array.from(nextSnapshots.values())));
}

export function loadPortfolioSnapshots(): unknown[] {
  return loadSnapshots();
}

export function savePortfolioSnapshots(snapshots: unknown[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
  } catch {
    // Se localStorage non e disponibile, la parte cloud resta comunque indipendente.
  }
}

export async function downloadPortfolioWorkbook(trades: Trade[], date = new Date()): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  upsertPortfolioSnapshots(trades, date);

  const year = yearKey(date);
  const snapshots = mergeSnapshots(
    loadSnapshots().filter((snapshot) => snapshot.snapshotDate.startsWith(`${year}-`)),
    await buildHistoricalSnapshots(trades, year),
  );
  const workbookXml = buildWorkbookXml(year, snapshots);
  const blob = new Blob([workbookXml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = `portfolio-${year}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function buildHistoricalSnapshots(trades: Trade[], year: string): Promise<PortfolioSnapshot[]> {
  const openTrades = trades.filter((trade) => trade.status === "open");
  const tickers = openTrades.map((trade) => trade.ticker);
  const history = await fetchHistoricalDailyPrices(tickers, `${year}-01-01`, `${year}-12-31`);
  const snapshots: PortfolioSnapshot[] = [];

  for (const trade of openTrades) {
    const prices = history.get(trade.ticker) ?? [];
    for (const price of prices) {
      if (price.date < trade.openDate.slice(0, 10)) {
        continue;
      }

      const profitLoss = calculateProfitLoss(trade.entryPrice, price.close, trade.quantity);
      snapshots.push({
        snapshotDate: price.date,
        ticker: trade.ticker,
        sector: trade.sector,
        strategy: trade.strategy,
        quantity: trade.quantity,
        entryPrice: trade.entryPrice,
        currentPrice: price.close,
        dailyOpen: price.open,
        dailyClose: price.close,
        dailyPriceDate: price.date,
        stopLoss: trade.stopLoss,
        riskEuro: trade.riskEuro,
        riskPercent: trade.riskPercent,
        profitLossEuro: profitLoss.euro,
        profitLossPercent: profitLoss.percent / 100,
        openDate: trade.openDate.slice(0, 10),
        status: trade.status,
      });
    }
  }

  return snapshots;
}

function mergeSnapshots(primarySnapshots: PortfolioSnapshot[], backfillSnapshots: PortfolioSnapshot[]): PortfolioSnapshot[] {
  const mergedSnapshots = new Map(primarySnapshots.map((snapshot) => [snapshotKey(snapshot), snapshot]));

  for (const snapshot of backfillSnapshots) {
    const key = snapshotKey(snapshot);
    const existingSnapshot = mergedSnapshots.get(key);

    mergedSnapshots.set(key, {
      ...snapshot,
      ...existingSnapshot,
      currentPrice: snapshot.currentPrice,
      dailyOpen: snapshot.dailyOpen,
      dailyClose: snapshot.dailyClose,
      dailyPriceDate: snapshot.dailyPriceDate,
      profitLossEuro: snapshot.profitLossEuro,
      profitLossPercent: snapshot.profitLossPercent,
    });
  }

  return Array.from(mergedSnapshots.values());
}

function buildSnapshots(trades: Trade[], fallbackSnapshotDate: string): PortfolioSnapshot[] {
  return trades
    .filter((trade) => trade.status === "open")
    .map((trade) => {
      const profitLoss = calculateProfitLoss(trade.entryPrice, trade.currentPrice, trade.quantity);
      const hasDatedDailyPrice =
        typeof trade.dailyPriceDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(trade.dailyPriceDate) &&
        typeof trade.dailyOpen === "number" &&
        typeof trade.dailyClose === "number";
      const snapshotDate = hasDatedDailyPrice ? trade.dailyPriceDate! : fallbackSnapshotDate;

      return {
        snapshotDate,
        ticker: trade.ticker,
        sector: trade.sector,
        strategy: trade.strategy,
        quantity: trade.quantity,
        entryPrice: trade.entryPrice,
        currentPrice: trade.currentPrice,
        dailyOpen: hasDatedDailyPrice ? trade.dailyOpen : undefined,
        dailyClose: hasDatedDailyPrice ? trade.dailyClose : undefined,
        dailyPriceDate: hasDatedDailyPrice ? trade.dailyPriceDate : undefined,
        stopLoss: trade.stopLoss,
        riskEuro: trade.riskEuro,
        riskPercent: trade.riskPercent,
        profitLossEuro: profitLoss.euro,
        profitLossPercent: profitLoss.percent / 100,
        openDate: trade.openDate.slice(0, 10),
        status: trade.status,
      };
    });
}

function loadSnapshots(): PortfolioSnapshot[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsedValue) ? (parsedValue as PortfolioSnapshot[]) : [];
  } catch {
    return [];
  }
}

function buildWorkbookXml(year: string, snapshots: PortfolioSnapshot[]): string {
  const sheets = [1, 2, 3, 4].map((quarter) => {
    const quarterSnapshots = snapshots.filter((snapshot) => quarterFromDate(snapshot.snapshotDate) === quarter);
    return buildWorksheetXml(quarterSheetName(quarter, year), quarter, year, quarterSnapshots);
  });

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/></Style>
  <Style ss:ID="DateHeader"><Font ss:Bold="1"/><Alignment ss:Horizontal="Center"/><Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Money"><NumberFormat ss:Format="&quot;$&quot;#,##0.00"/></Style>
  <Style ss:ID="MoneyStopLoss"><NumberFormat ss:Format="&quot;$&quot;#,##0.00"/><Font ss:Color="#B91C1C"/><Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Number"><NumberFormat ss:Format="#,##0.00"/></Style>
 </Styles>
 ${sheets.join("\n")}
</Workbook>`;
}

function buildWorksheetXml(sheetName: string, quarter: number, year: string, snapshots: PortfolioSnapshot[]): string {
  const dates = quarterBusinessDates(quarter, Number(year));
  const positions = uniquePositions(snapshots);
  const snapshotsByPositionAndDate = new Map(
    snapshots.map((snapshot) => [`${positionKey(snapshot)}|${snapshot.snapshotDate}`, snapshot]),
  );
  const rows = [buildDateHeaderRow(dates), buildOpenCloseHeaderRow(dates)];

  for (const position of positions) {
    rows.push(buildPositionRow(position, dates, snapshotsByPositionAndDate));
  }

  return `<Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table ss:DefaultColumnWidth="72">
   ${rows.join("\n")}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>1</SplitHorizontal>
   <TopRowBottomPane>1</TopRowBottomPane>
  </WorksheetOptions>
 </Worksheet>`;
}

function buildDateHeaderRow(dates: string[]): string {
  const baseCells = [cell(""), cell(""), cell(""), cell("")];
  const dateCells = dates.map((date) => cell(displayDate(date), "String", "DateHeader", 1));
  return `<Row>${baseCells.join("")}${dateCells.join("")}</Row>`;
}

function buildOpenCloseHeaderRow(dates: string[]): string {
  const baseHeaders = ["Ticker", "Entry", "Stop Loss", "Size"].map((header) => cell(header, "String", "Header"));
  const dailyHeaders = dates.flatMap(() => [cell("Open", "String", "Header"), cell("Close", "String", "Header")]);
  return `<Row>${baseHeaders.join("")}${dailyHeaders.join("")}</Row>`;
}

function buildPositionRow(
  position: PortfolioSnapshot,
  dates: string[],
  snapshotsByPositionAndDate: Map<string, PortfolioSnapshot>,
): string {
  const baseCells = [
    cell(position.ticker),
    cell(position.entryPrice, "Number", "Money"),
    cell(position.stopLoss, "Number", "Money"),
    cell(position.riskEuro, "Number", "Money"),
  ];
  const dailyCells = dates.flatMap((date) => {
    const snapshot = snapshotsByPositionAndDate.get(`${positionKey(position)}|${date}`);
    const hasMatchingMarketDate = snapshot?.dailyPriceDate === date;
    const dailyOpen = hasMatchingMarketDate ? snapshot.dailyOpen : undefined;
    const dailyClose = hasMatchingMarketDate ? snapshot.dailyClose : undefined;

    return [
      optionalNumberCell(dailyOpen, dailyOpen !== undefined && dailyOpen <= position.stopLoss),
      optionalNumberCell(dailyClose, dailyClose !== undefined && dailyClose <= position.stopLoss),
    ];
  });

  return `<Row>${baseCells.join("")}${dailyCells.join("")}</Row>`;
}

function optionalNumberCell(value: number | undefined, isAtOrBelowStopLoss: boolean): string {
  return typeof value === "number" ? cell(value, "Number", isAtOrBelowStopLoss ? "MoneyStopLoss" : "Money") : cell("");
}

function cell(
  value: string | number,
  type: "String" | "Number" | "DateTime" = "String",
  style?: string,
  mergeAcross?: number,
): string {
  const styleAttribute = style ? ` ss:StyleID="${style}"` : "";
  const mergeAttribute = typeof mergeAcross === "number" ? ` ss:MergeAcross="${mergeAcross}"` : "";
  const normalizedValue = type === "DateTime" && typeof value === "string" ? `${value}T00:00:00.000` : value;

  return `<Cell${styleAttribute}${mergeAttribute}><Data ss:Type="${type}">${escapeXml(String(normalizedValue))}</Data></Cell>`;
}

function snapshotKey(snapshot: PortfolioSnapshot): string {
  return [snapshot.snapshotDate, positionKey(snapshot)].join("|");
}

function positionKey(snapshot: PortfolioSnapshot): string {
  return [snapshot.ticker, snapshot.openDate, snapshot.entryPrice, snapshot.quantity].join("|");
}

function uniquePositions(snapshots: PortfolioSnapshot[]): PortfolioSnapshot[] {
  const positions = new Map<string, PortfolioSnapshot>();

  for (const snapshot of snapshots) {
    const key = positionKey(snapshot);
    if (!positions.has(key)) {
      positions.set(key, snapshot);
    }
  }

  return Array.from(positions.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

function quarterFromDate(value: string): number {
  const month = Number(value.slice(5, 7));
  return Math.floor((month - 1) / 3) + 1;
}

function yearKey(date: Date): string {
  return dateKey(date).slice(0, 4);
}

function quarterBusinessDates(quarter: number, year: number): string[] {
  const firstMonth = (quarter - 1) * 3;
  const firstDate = new Date(Date.UTC(year, firstMonth, 1));
  const lastDate = new Date(Date.UTC(year, firstMonth + 3, 0));
  const dates: string[] = [];

  for (let date = firstDate; date <= lastDate; date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1))) {
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(date.toISOString().slice(0, 10));
    }
  }

  return dates;
}

function quarterSheetName(quarter: number, year: string): string {
  const ordinal = quarter === 1 ? "1st" : quarter === 2 ? "2nd" : quarter === 3 ? "3rd" : "4th";
  return `${ordinal} quarter ${year}`;
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function dateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
