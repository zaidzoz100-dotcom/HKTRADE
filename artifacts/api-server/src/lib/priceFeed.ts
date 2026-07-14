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

export interface PriceSnapshot {
  updatedAt: string;
  metals: MetalPrice[];
  forex: ForexRate[];
  stale: boolean;
}

const GOLD_API_BASE = "https://api.gold-api.com/price";
const FOREX_API = "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY";

const METAL_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: "XAU", name: "Gold" },
  { symbol: "XAG", name: "Silver" },
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

  const forex: ForexRate[] = [];
  if (eurUsd !== null) forex.push({ pair: "EUR/USD", rate: eurUsd });
  if (gbpUsd !== null) forex.push({ pair: "GBP/USD", rate: gbpUsd });
  if (usdJpy !== null) forex.push({ pair: "USD/JPY", rate: usdJpy });
  return forex;
}

function priceForSymbol(
  symbol: string,
  metals: MetalPrice[],
  forex: ForexRate[],
): number | null {
  const metal = metals.find((m) => m.symbol === symbol);
  if (metal) return metal.price;
  const fx = forex.find((f) => f.pair === symbol);
  if (fx) return fx.rate;
  return null;
}

async function checkAlerts(metals: MetalPrice[], forex: ForexRate[]) {
  const activeAlerts: Alert[] = await db
    .select()
    .from(alertsTable)
    .where(eq(alertsTable.status, "active"));

  for (const alert of activeAlerts) {
    const currentPrice = priceForSymbol(alert.assetSymbol, metals, forex);
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
    const [metals, forex] = await Promise.all([fetchMetals(), fetchForex()]);
    cachedSnapshot = {
      updatedAt: new Date().toISOString(),
      metals,
      forex,
      stale: false,
    };
    await checkAlerts(metals, forex);
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
      stale: true,
    };
  }
  return cachedSnapshot;
}
