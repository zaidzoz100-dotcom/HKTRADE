---
name: Aurum Watch price feeds
description: Which free, no-auth APIs power the gold/silver/forex tracker, and why.
---

The price tracker (`artifacts/price-tracker` + `artifacts/api-server`) uses free, no-API-key public feeds instead of a paid provider like GoldAPI.io:

- `https://api.gold-api.com/price/{XAU|XAG}` — gold/silver spot prices in USD.
- `https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,AUD,CAD,CHF,NZD` — ECB-based forex rates; USD/EUR, USD/GBP, USD/AUD, USD/NZD are inverted to get conventional pair quoting (EUR/USD, GBP/USD, AUD/USD, NZD/USD), while USD/CAD and USD/CHF are used direct.
- `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd` — free, no-key crypto spot prices (BTC, ETH). Treated as a secondary/optional source: if it fails, the snapshot still serves fresh metals+forex with the last-known crypto prices rather than failing the whole refresh.

**Why:** the user declined to provide a GoldAPI.io key, and no Replit integration exists for gold/forex/crypto data, so free unauthenticated feeds were the only path without asking for credentials again.

**How to apply:** if the user asks for more precision, historical data, or additional assets, these free feeds won't support it — that's when it's worth asking again about a paid provider/API key. The canonical list of trackable assets (symbol/name/category) lives server-side in `artifacts/api-server/src/lib/assets.ts` and is exposed via `GET /assets` — extend that file (not a hardcoded frontend list) when adding new assets, since the frontend's asset picker and alert-creation dropdown both fetch it dynamically.
