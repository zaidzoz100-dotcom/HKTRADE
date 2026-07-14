# Aurum Watch

A live gold, silver, and forex price tracker with alarm-clock-style price alerts.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/price-tracker run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, Tailwind

## Where things live

- `artifacts/price-tracker` — frontend (dashboard, alert creation, alarm overlay, Web Audio siren in `src/lib/audio-alarm.ts`)
- `artifacts/api-server/src/lib/priceFeed.ts` — in-memory price cache, polls free public APIs every 20s, and evaluates active alerts against latest prices on each poll
- `artifacts/api-server/src/routes/{prices,alerts}.ts` — REST endpoints
- `lib/db/src/schema/alerts.ts` — `alerts` table (source of truth for alert data model)
- `lib/api-spec/openapi.yaml` — API contract; run codegen after editing

## Architecture decisions

- Prices come from free, no-auth public APIs (no API key required): `api.gold-api.com` for gold/silver spot prices (XAU/XAG in USD), and `api.frankfurter.app` (ECB rates) for EUR/USD, GBP/USD, USD/JPY. Chosen because the user declined to provide a GoldAPI.io key.
- Live prices are cached in-memory on the server (not persisted historically) and refreshed on a timer; `stale: true` is returned if the last fetch failed, so the frontend can still render the last known-good snapshot.
- Alerts are persisted in Postgres since they must survive restarts. Alert status flow: `active` → `triggered` (flipped server-side during the price poll when the target condition is met) → `acknowledged` (via explicit user action) or `disabled`.
- The frontend polls `useListTriggeredAlerts` frequently and shows a full-screen, non-dismissible overlay with a synthesized Web Audio siren (oscillator-based, not an audio file) while any alert is unacknowledged — this is a deliberate core product requirement, not just a UI notification.

## Product

- Live dashboard of gold (XAU), silver (XAG), and 3 forex pairs (EUR/USD, GBP/USD, USD/JPY), auto-refreshing.
- Users create price alerts (asset, target price, direction above/below, optional note), and manage them (edit, enable/disable, delete).
- When a target is hit, a persistent full-screen alarm overlay appears with a looping siren sound; it can only be dismissed by explicitly acknowledging each triggered alert.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Browsers block audio autoplay: the alarm's Web Audio context is armed on the user's first click/keydown anywhere in the app, so it can play automatically later when an alert triggers.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
