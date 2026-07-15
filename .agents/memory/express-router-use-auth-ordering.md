---
name: Express sub-router auth ordering gotcha
description: A sub-router that does `router.use(requireAuth)` (no path) blocks every router mounted after it for unauthenticated requests, not just its own routes.
---

In `artifacts/api-server`, several route files are combined with `router.use(subRouter)` in `routes/index.ts`. If a sub-router applies auth as unscoped middleware (e.g. `router.use(requireAuth)` at the top of `alerts.ts`), Express treats that `.use` as matching every path, so it intercepts and can 401 requests meant for routers registered *after* it in `routes/index.ts` — even though those routers never mounted `requireAuth` themselves.

**Why:** Discovered when adding an unauthenticated `GET /push/vapid-public-key` endpoint after `alertsRouter` in the mount order — it 401'd even though `push.ts` never called `requireAuth` on that route.

**How to apply:** Any new router with a public (unauthenticated) endpoint must be mounted in `routes/index.ts` *before* `alertsRouter` and `adminRouter` (or any other router using unscoped `router.use(requireAuth)`). When adding a new globally-authed sub-router, prefer per-route `requireAuth` (like `account.ts` does) over router-wide `.use(requireAuth)` to avoid this class of bug entirely.
