---
name: Aurum Watch price feeds
description: Which free, no-auth APIs power the gold/silver/forex tracker, and why.
---

The price tracker (`artifacts/price-tracker` + `artifacts/api-server`) uses free, no-API-key public feeds instead of a paid provider like GoldAPI.io:

- `https://api.gold-api.com/price/{XAU|XAG}` — gold/silver spot prices in USD.
- `https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY` — ECB-based forex rates; USD/EUR and USD/GBP are inverted to get EUR/USD and GBP/USD conventions.

**Why:** the user declined to provide a GoldAPI.io key, and no Replit integration exists for gold/forex data, so free unauthenticated feeds were the only path without asking for credentials again.

**How to apply:** if the user asks for more precision, historical data, or additional assets, these free feeds won't support it — that's when it's worth asking again about a paid provider/API key.
