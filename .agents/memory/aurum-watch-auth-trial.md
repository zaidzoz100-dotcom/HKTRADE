---
name: Aurum Watch auth & trial
description: How Clerk auth, per-user data scoping, and the 4-day trial/premium gate fit together in the price tracker.
---

Aurum Watch uses Replit-managed Clerk for auth (email/password + Google), with custom-themed `/sign-in` and `/sign-up` pages (native Clerk hosted pages don't work with the proxy setup).

- Alerts are scoped per user via a `clerkUserId` column on the `alerts` table — every alert route requires auth and filters/checks ownership by this column.
- A local `users` table JIT-provisions a row on first authenticated request; `users.createdAt` is the trial start date (not Clerk's own createdAt) and `isPremium`/`premiumGrantedAt` track subscription state.
- Trial length is 4 days, enforced **server-side** in `POST /api/alerts` (403 with a `contactUrl` once expired and not premium) — the frontend trial banner/gate is only for UX, not the source of truth.
- There's no in-app payment flow: upgrading is a manual, out-of-band step (a "Contact Admin" link to a Telegram handle). Premium is granted by directly flipping `isPremium` in the `users` table — no admin UI exists yet.

**Why:** the user explicitly asked for a trial + manual-upgrade-via-Telegram model rather than real billing, and wanted per-user alert isolation once auth was added.

**How to apply:** if a payment provider is added later, `computeAccountStatus` in `artifacts/api-server/src/lib/account.ts` is the single place trial/premium logic lives — wire real subscription state through there rather than re-deriving it elsewhere.
