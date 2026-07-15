---
name: Aurum Watch auth & trial
description: How Clerk auth, per-user data scoping, and the 4-day trial/premium gate fit together in the price tracker.
---

Aurum Watch uses Replit-managed Clerk for auth (email/password + Google), with custom-themed `/sign-in` and `/sign-up` pages (native Clerk hosted pages don't work with the proxy setup).

- Alerts are scoped per user via a `clerkUserId` column on the `alerts` table — every alert route requires auth and filters/checks ownership by this column.
- A local `users` table JIT-provisions a row on first authenticated request; `users.createdAt` is the trial start date (not Clerk's own createdAt) and `isPremium`/`premiumGrantedAt` track subscription state.
- Trial length is 4 days, enforced **server-side** in `POST /api/alerts` (403 with a `contactUrl` once expired and not premium) — the frontend trial banner/gate is only for UX, not the source of truth.
- There's no in-app payment flow: upgrading is a manual, out-of-band step (a "Contact Admin" link to a Telegram handle). A password-gated `/admin` page (shared secret via `x-admin-password` header, checked against `ADMIN_PASSWORD`) lets the operator search Clerk users by email and set each one's plan (trial/monthly/yearly) + active/expired status.
- Plan state lives on `users`: `plan` enum, `trialStartedAt`, `premiumExpiresAt` (nullable, used for monthly/yearly). `isPremium` is a denormalized legacy field — `computeAccountStatus` always re-derives status fresh from `plan`+timestamps, never trusts stored `isPremium`, so admin changes take effect on the user's very next request.
- The web app calls its own API via plain relative `/api/...` fetches (both the orval-generated client and hand-written admin fetches) with no explicit base-URL/proxy config in `vite.config.ts` — this project's routing convention resolves `/api` to the api-server artifact automatically, so don't add a proxy or prefix with the price-tracker's own `BASE_URL`.

**Why:** the user explicitly asked for a trial + manual-upgrade-via-Telegram model rather than real billing, then later asked for an admin panel to set plan/status per user instead of hand-editing the DB.

**How to apply:** if a payment provider is added later, `computeAccountStatus` and `applyAdminPlanAction` in `artifacts/api-server/src/lib/account.ts` are the single place trial/premium logic lives — wire real subscription state through there rather than re-deriving it elsewhere.
