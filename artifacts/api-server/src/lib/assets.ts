/**
 * Canonical catalog of every asset the price feed can serve, used both to
 * drive `/assets` (the picklist for the "Market Customization" dialog) and
 * to validate the symbols a user tries to save as favorites. Keep this in
 * sync with the symbols actually produced by `priceFeed.ts`.
 */
export type AssetCategory = "metal" | "forex" | "crypto";

export interface AssetInfo {
  symbol: string;
  name: string;
  category: AssetCategory;
}

export const ALL_ASSETS: AssetInfo[] = [
  { symbol: "XAU", name: "Gold", category: "metal" },
  { symbol: "XAG", name: "Silver", category: "metal" },
  { symbol: "EUR/USD", name: "Euro / US Dollar", category: "forex" },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", category: "forex" },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", category: "forex" },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", category: "forex" },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", category: "forex" },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", category: "forex" },
  { symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar", category: "forex" },
  { symbol: "BTC", name: "Bitcoin", category: "crypto" },
  { symbol: "ETH", name: "Ethereum", category: "crypto" },
];

export const ALL_ASSET_SYMBOLS = ALL_ASSETS.map((a) => a.symbol);

export const DEFAULT_FAVORITE_ASSETS = ["XAU", "XAG", "EUR/USD", "GBP/USD", "USD/JPY"];

export function isValidAssetSymbol(symbol: string): boolean {
  return ALL_ASSET_SYMBOLS.includes(symbol);
}
