import { eq, and } from "drizzle-orm";
import { db, alertsTable, type Alert } from "@workspace/db";
import { logger } from "./logger";

export interface MetalPrice {
  symbol: string;
  name: string;
  price: number;
  currency: string;
}

export interface ForexRate {
  pair: string;
  rate: number;
}

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
}

export interface PriceSnapshot {
  updatedAt: string;
  metals: MetalPrice[];
  forex: ForexRate[];
  crypto: CryptoPrice[];
  stale: boolean;
}

const GOLD_API_BASE = "https://api.gold-api.com/price";
const FOREX_API =
  "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,AUD,CAD,CHF,NZD";
const CRYPTO_API =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd";

const METAL_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: "XAU", name: "Gold" },
  { symbol: "XAG", name: "Silver" },
];

const CRYPTO_IDS: { id: string; symbol: string; name: string }[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
];

let cachedSnapshot: PriceSnapshot | null = null;
let pollTimer: NodeJS.Timeout | null = null;

async function fetchMetals(): Promise<MetalPrice[]> {
  const results = await Promise.all(
    METAL_SYMBOLS.map(async ({ symbol, name }) => {
      const res = await fetch(`${GOLD_API_BASE}/${symbol}`);
      if (!res.ok) {
        throw new Error(`gold-api ${symbol} responded with ${res.status}`);
      }
      const data = (await res.json()) as { price: number; currency?: string };
      return {
        symbol,
        name,
        price: data.price,
        currency: data.currency ?? "USD",
      };
    }),
  );
  return results;
}

async function fetchForex(): Promise<ForexRate[]> {
  const res = await fetch(FOREX_API);
  if (!res.ok) {
    throw new Error(`frankfurter responded with ${res.status}`);
  }
  const data = (await res.json()) as { rates: Record<string, number> };
  const eurUsd = data.rates.EUR ? 1 / data.rates.EUR : null;
  const gbpUsd = data.rates.GBP ? 1 / data.rates.GBP : null;
  const usdJpy = data.rates.JPY ?? null;
  const audUsd = data.rates.AUD ? 1 / data.rates.AUD : null;
  const usdCad = data.rates.CAD ?? null;
  const usdChf = data.rates.CHF ?? null;
  const nzdUsd = data.rates.NZD ? 1 / data.rates.NZD : null;

  const forex: ForexRate[] = [];
  if (eurUsd !== null) forex.push({ pair: "EUR/USD", rate: eurUsd });
  if (gbpUsd !== null) forex.push({ pair: "GBP/USD", rate: gbpUsd });
  if (usdJpy !== null) forex.push({ pair: "USD/JPY", rate: usdJpy });
  if (audUsd !== null) forex.push({ pair: "AUD/USD", rate: audUsd });
  if (usdCad !== null) forex.push({ pair: "USD/CAD", rate: usdCad });
  if (usdChf !== null) forex.push({ pair: "USD/CHF", rate: usdChf });
  if (nzdUsd !== null) forex.push({ pair: "NZD/USD", rate: nzdUsd });
  return forex;
}

// CoinGecko's free tier rate-limits aggressively (HTTP 429) if hit on every
// 20s poll tick. Crypto doesn't need second-by-second freshness, so we only
// actually call out at most once per CRYPTO_MIN_INTERVAL_MS and otherwise
// reuse the last successful result.
const CRYPTO_MIN_INTERVAL_MS = 60_000;
let lastCryptoFetchAt = 0;
let lastCryptoPrices: CryptoPrice[] = [];

async function fetchCrypto(): Promise<CryptoPrice[]> {
  if (Date.now() - lastCryptoFetchAt < CRYPTO_MIN_INTERVAL_MS && lastCryptoPrices.length > 0) {
    return lastCryptoPrices;
  }

  const res = await fetch(CRYPTO_API);
  if (!res.ok) {
    // Rate-limited or otherwise failing: serve the last known-good prices
    // rather than throwing, so a transient 429 doesn't blank out the crypto
    // cards on the dashboard.
    if (lastCryptoPrices.length > 0) return lastCryptoPrices;
    throw new Error(`coingecko responded with ${res.status}`);
  }
  const data = (await res.json()) as Record<string, { usd: number }>;
  const prices = CRYPTO_IDS.filter((c) => data[c.id]?.usd !== undefined).map((c) => ({
    symbol: c.symbol,
    name: c.name,
    price: data[c.id].usd,
  }));
  if (prices.length > 0) {
    lastCryptoPrices = prices;
    lastCryptoFetchAt = Date.now();
  }
  return prices;
}

function priceForSymbol(
  symbol: string,
  metals: MetalPrice[],
  forex: ForexRate[],
  crypto: CryptoPrice[],
): number | null {
  const metal = metals.find((m) => m.symbol === symbol);
  if (metal) return metal.price;
  const fx = forex.find((f) => f.pair === symbol);
  if (fx) return fx.rate;
  const cr = crypto.find((c) => c.symbol === symbol);
  if (cr) return cr.price;
  return null;
}

async function checkAlerts(metals: MetalPrice[], forex: ForexRate[], crypto: CryptoPrice[]) {
  const activeAlerts: Alert[] = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.status, "active"));

  for (const alert of activeAlerts) {
    const currentPrice = priceForSymbol(alert.assetSymbol, metals, forex, crypto);
    if (currentPrice === null) continue;

    const shouldTrigger =
      alert.direction === "above"
        ? currentPrice >= alert.targetPrice
        : currentPrice <= alert.targetPrice;

    if (shouldTrigger) {
      await db
        .update(alertsTable)
        .set({ status: "triggered", triggeredAt: new Date() })
        .where(
          and(eq(alertsTable.id, alert.id), eq(alertsTable.status, "active")),
        );
      logger.info(
        { alertId: alert.id, assetSymbol: alert.assetSymbol, currentPrice },
        "Alert triggered",
      );
    }
  }
}

async function refreshPrices(): Promise<void> {
  try {
    const [metals, forex, crypto] = await Promise.all([
      fetchMetals(),
      fetchForex(),
      fetchCrypto().catch((err) => {
        // Crypto is a secondary/optional source; don't take down the whole
        // snapshot (metals + forex) if CoinGecko has a hiccup.
        logger.error({ err }, "Failed to refresh crypto prices");
        return cachedSnapshot?.crypto ?? [];
      }),
    ]);
    cachedSnapshot = {
      updatedAt: new Date().toISOString(),
      metals,
      forex,
      crypto,
      stale: false,
    };
    await checkAlerts(metals, forex, crypto);
  } catch (err) {
    logger.error({ err }, "Failed to refresh prices");
    if (cachedSnapshot) {
      cachedSnapshot = { ...cachedSnapshot, stale: true };
    }
  }
}

const POLL_INTERVAL_MS = 20_000;

export function startPricePolling(): void {
  if (pollTimer) return;
  void refreshPrices();
  pollTimer = setInterval(() => {
    void refreshPrices();
  }, POLL_INTERVAL_MS);
}

export function getCachedSnapshot(): PriceSnapshot | null {
  return cachedSnapshot;
}

export async function getSnapshotOrFetch(): Promise<PriceSnapshot> {
  if (!cachedSnapshot) {
    await refreshPrices();
  }
  if (!cachedSnapshot) {
    // Upstream failed on the very first request; return an empty stale snapshot
    // rather than throwing, so the client always gets a well-formed response.
    cachedSnapshot = {
      updatedAt: new Date().toISOString(),
      metals: [],
      forex: [],
      crypto: [],
      stale: true,
    };
  }
  return cachedSnapshot;
}
