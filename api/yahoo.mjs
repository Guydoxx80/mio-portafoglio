const TICKER_PATTERN = /^[A-Z0-9.^=-]{1,20}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "GET") {
    response.status(405).json({ error: "Metodo non consentito." });
    return;
  }

  const ticker = firstQueryValue(request.query.ticker)?.trim().toUpperCase() ?? "";
  const startDate = firstQueryValue(request.query.start);
  const endDate = firstQueryValue(request.query.end);

  if (!TICKER_PATTERN.test(ticker)) {
    response.status(400).json({ error: "Ticker non valido." });
    return;
  }

  const yahooUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`);
  yahooUrl.searchParams.set("interval", "1d");
  yahooUrl.searchParams.set("includePrePost", "false");
  yahooUrl.searchParams.set("events", "history");

  if (startDate && endDate && DATE_PATTERN.test(startDate) && DATE_PATTERN.test(endDate)) {
    yahooUrl.searchParams.set("period1", String(Math.floor(Date.parse(`${startDate}T00:00:00.000Z`) / 1000)));
    yahooUrl.searchParams.set("period2", String(Math.floor(Date.parse(`${endDate}T23:59:59.999Z`) / 1000)));
  } else {
    yahooUrl.searchParams.set("range", "10d");
  }

  try {
    const yahooResponse = await fetch(yahooUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 MioPortafoglio/1.0",
      },
    });
    const payload = await yahooResponse.json();

    if (!yahooResponse.ok) {
      response.status(yahooResponse.status).json(payload);
      return;
    }

    response.status(200).json(payload);
  } catch {
    response.status(502).json({ error: "Yahoo Finance non raggiungibile." });
  }
}

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}
