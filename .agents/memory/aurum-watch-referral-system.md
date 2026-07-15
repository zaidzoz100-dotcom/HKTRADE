---
name: aurum-watch referral system
description: How Forex Alarm's referral/invite system rewards inviters with extra trial days — model, redemption rules, and where it lives.
---

Each user has their own unique `referralCode` (short random alphanumeric, generated once at
account creation in `ensureUser`). Sharing `<app>/?ref=CODE` lets a new signup redeem it once;
the **referrer** (code owner), not the redeemer, gets rewarded — `REFERRAL_REWARD_DAYS` (4) added
to their `referralBonusDays`, which stacks on top of `TRIAL_DAYS` when computing `trialEndsAt` for
trial-plan users.

**Why:** the spec asked for "4 extra free trial days" specifically, so the reward is modeled as
a trial-length extension rather than a schedule change to `premiumExpiresAt`. This means a
referrer who is already on a paid plan sees no immediate visible effect — accepted tradeoff, not
a bug, unless a future request asks to extend paid-plan reward too.

**Registration hardening (2026-07-15):** referral rewards are gated on **both** Clerk email verification (`users.isEmailVerified`, synced from `clerkClient.users.getUser()` since Clerk doesn't push verification via a column automatically) AND a mandatory post-signup "complete your profile" step (`country`+`phoneNumber`, `users.profileCompletedAt`) enforced client-side before the dashboard renders (`AuthenticatedTracker` in `App.tsx`). `applyReferral` only *records* `referredByCode` now — the actual reward payout is deferred to `maybeGrantReferralReward`, called from both `completeProfile` and `applyReferral`/verification-resync, idempotent via `users.referralRewardGranted`, since either condition can be the last one satisfied.

**How to apply:** Redemption is enforced server-side (`applyReferral` in
`artifacts/api-server/src/lib/account.ts`, exposed at `POST /account/referral`) inside a DB
transaction: a user can redeem at most once (`referredByCode` starts null, set once), can't redeem
their own code, and the code must belong to an existing user. Frontend captures `?ref=` into
localStorage before auth (Clerk drops query params across its redirect flow) and redeems it once
after the user is signed in and their account is loaded — see `src/lib/referral.ts` and
`src/components/referral-redeemer.tsx` in `artifacts/price-tracker`. The user's own link + earned
bonus days are surfaced in the Settings dialog's "Invite & Earn" section.
