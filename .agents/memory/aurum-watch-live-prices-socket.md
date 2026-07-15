---
name: aurum-watch live prices via socket.io
description: How Forex Alarm pushes live price updates over WebSocket instead of client polling — architecture and proxy path constraint.
---

Price updates are pushed from the server over Socket.io instead of the client polling `GET
/prices` on an interval. The server keeps a single upstream poll loop (5s, in
`artifacts/api-server/src/lib/priceFeed.ts`) that fetches once per tick regardless of connection
count, then fans that one result out with a single `io.emit()` broadcast
(`artifacts/api-server/src/lib/socket.ts`) — connection count never multiplies upstream API calls
or server work. The frontend (`src/hooks/use-live-prices.ts`) does one REST fetch on mount for
first paint, then writes every socket-pushed snapshot straight into the react-query cache; no
`refetchInterval` after that.

**Why:** the free upstream price APIs (gold-api, frankfurter, coingecko) don't offer literal
per-second ticks and coingecko rate-limits aggressively — pushing on data-change instead of
polling minimizes perceived latency without over-fetching upstream, and a broadcast (not per-user
work) keeps the design scalable as concurrent users grow.

**How to apply:** the Socket.io path is `/api/socket.io` — nested under the api-server artifact's
already-whitelisted `/api` proxy path, so no `artifact.toml` edit was needed. If a *new* artifact
ever needs its own top-level WS path outside an already-listed prefix, that path must be added to
`artifact.toml`'s `paths` array or the proxy silently drops the upgrade (see `react-vite` skill).
