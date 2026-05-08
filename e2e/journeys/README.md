# Journey tests

End-to-end Playwright specs that walk a user from a known starting URL through a complete product journey, asserting the testids/copy that prove each step works. Plan source: `~/.claude/plans/zazzy-coalescing-thacker.md`.

## What's tested

14 journeys (≥10 required by the brief), grouped by the 3-tier blueprint:

- **PUBLIC · NO AUTH** (6): home → spot preview, species → spot, stub-species coming-soon, 4-segment species filter, regulations, pricing-to-signup.
- **FREE · AUTHENTICATED** (5): favorite-add, favorite-cap, alert-add, alert-cap, free-spot-clip.
- **PRO · PAID** (4): pro-dashboard, pro-spot-full, pro-alert-cap, manage-subscription.

Real Stripe card-fill is intentionally **out of scope** — Phase B/C seed flips a test user to `subscription_status='active'` directly. Webhook plumbing is assumed working from the Phase 4 consolidation work.

## Prerequisites (local-only, no CI yet)

1. **Bluecaster dev server** running on `:3001`:
   ```sh
   cd ../../bluecaster && npm run dev
   ```
2. **Frontend dev server** auto-started by `playwright.config.ts` (`webServer.reuseExistingServer = true`), but you can pre-warm it:
   ```sh
   pnpm dev   # :3004
   ```
3. **Seed data loaded once.** Both seed scripts are idempotent:
   ```sh
   # BC content (species profiles, hero images, is_published flips, featured_species_ids)
   cd ../../bluecaster && npx tsx scripts/seed-demo-content.ts

   # Frontend test users (free + pro with seeded favorites)
   cd ../reelcaster-frontend && npx tsx scripts/seed-demo-users.ts
   ```
4. **`.env.test` populated.** `e2e/fixtures/env.ts` reads it. Sample shape:
   ```
   PLAYWRIGHT_BASE_URL=http://localhost:3004
   BLUECASTER_URL=http://localhost:3001
   BLUECASTER_PUBLIC_API_KEY=<bc public key>

   NEXT_PUBLIC_SUPABASE_URL=https://pehcvwiwtubzfgahuzuz.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<frontend anon key>
   SUPABASE_SERVICE_ROLE_KEY=<frontend service-role key>

   TEST_FREE_USER_EMAIL=free@reelcaster.test
   TEST_FREE_USER_PASSWORD=<from seed-demo-users.ts output>
   TEST_PRO_USER_EMAIL=pro@reelcaster.test
   TEST_PRO_USER_PASSWORD=<from seed-demo-users.ts output>

   # Optional / out of scope for journey suite (the real-Stripe smoke is a separate canary)
   # STRIPE_SECRET_KEY=
   # STRIPE_WEBHOOK_SECRET=
   ```
5. **BC service-role key** for the seed script (NOT used by Playwright):
   ```
   # in bluecaster/.env or shell
   SUPABASE_URL=https://szbrwccppikqkystlgmq.supabase.co
   SUPABASE_SERVICE_KEY=<BC service-role key>
   ```

## Run

```sh
# All journeys
pnpm test:e2e e2e/journeys/

# Just one
pnpm test:e2e e2e/journeys/01-anon-home-to-spot.spec.ts

# UI mode (interactive)
pnpm test:e2e:ui
```

## Resolved contradictions (Phase A research)

- **Signed-out forecast clip is 6h, not 0d**, but only on the *SSR-rendered marketing spot page* (`src/app/fishing/[...slug]/page.tsx:230-234`). The `/api/spot-page/[slug]` proxy returns `available_horizon_days: 0` and `forecast.rows: []` for unauth callers (`src/app/api/spot-page/[slug]/route.ts:27`). Both are correct in their context — the page does not call the proxy, it calls `fetchSpotPage` server-side directly to BC and pre-clips a 6h preview. So:
  - Journey #1 UI assertion: ≤6 forecast hours visible (page-side clip).
  - API contract assertion (Phase C.5): `/api/spot-page/[slug]` unauth returns 0 rows.
- **`/regulations` reads `dfo_fishery_notices`** directly via service-role admin client at `src/app/(marketing)/regulations/page.tsx:43-58`. 191 rows in the frontend Supabase project. JSON-LD `GovernmentService` is at line 61. The `<ul data-testid="regulations-list">` mounts when `notices.length > 0`.

## `is_published` fan-out (BC routes that change behavior post-seed)

Verified by `grep -rn is_published bluecaster/app/api/v1/`:

| Route | Filters on `is_published`? | Effect after Phase B flip |
|---|---|---|
| `app/api/v1/species/[slug]/route.ts:107` | YES (`is_published && status IN ('approved','published')`) | `top_spots` array becomes non-empty for the 6 seeded species |
| `app/api/v1/cities/[slug]/spots/route.ts:75` | YES (`is_published === true && status IN (...)`) | Spot grids on city pages start populating |
| `app/api/v1/hierarchy/route.ts:48-52` | NO — selects flag, filters on `status` only | Already returns 24 `status='published'` spots; no behavior change. Field just becomes informative. |
| `app/api/v1/fishing-spots/[id]/route.ts` | Reads + returns flag (admin route) | N/A — admin only |
| `app/api/v1/fishing-spots/custom/route.ts:91` | Sets `is_published: false` on user-created spots | N/A — user spots stay unpublished, intended |

So the seed flip's user-visible reach is exactly two routes: `/api/v1/species/[slug]` and `/api/v1/cities/[slug]/spots`.

## Test-user fixture API (already shipped from Phase 0)

`e2e/fixtures/users.ts` exports:

- `freeUser`, `proUser` — credentials from `.env.test`
- `loginAs(page, user)` — fills /login form, waits for redirect away
- `logout(page)` — clears Supabase session in localStorage + cookies
- `getUserId(email)` — resolves auth.users.id via `auth.admin.listUsers()`
- `setUserTier(email, tier, status?)` — upserts `user_settings.subscription_tier/status` (bypasses Stripe)
- `resetUserState(email)` — wipes alerts/favorites/onboarding so each spec starts clean

Phase D specs use `setUserTier(proUser.email, 'pro_annual')` once the user exists (post Phase C seed); the function will not need to flip on every run because the seed sets pro on creation.

## How journey specs are organized

```
e2e/journeys/
  README.md                           (this file)
  01-anon-home-to-spot.spec.ts        (PUBLIC)
  02-anon-species-to-spot.spec.ts     (PUBLIC)
  03-anon-species-stub.spec.ts        (PUBLIC)
  04-anon-4-segment-species.spec.ts   (PUBLIC)
  05-anon-regulations.spec.ts         (PUBLIC)
  06-anon-pricing-signup.spec.ts      (PUBLIC → FREE)
  07-free-favorite-add.spec.ts        (FREE)
  08-free-favorite-cap.spec.ts        (FREE)
  09-free-alert-add.spec.ts           (FREE)
  10-free-alert-cap.spec.ts           (FREE)
  11-free-spot-clip.spec.ts           (FREE)
  12-pro-dashboard.spec.ts            (PRO)
  13-pro-spot-full.spec.ts            (PRO)
  14-pro-alert-cap.spec.ts            (PRO)
  15-pro-portal.spec.ts               (PRO)
```

Numbering matches the plan's journey list (#12 in the plan is the skipped real-Stripe path; the file number 12 here is the next pro-tier journey).

## Skipping behavior

Each spec uses `test.beforeAll()` to hit a precondition (e.g. BC API returning the seeded city) and `test.skip(true, ...)` if it's missing — same pattern as `e2e/sections/`. This means a partially-seeded environment surfaces the missing data via skipped tests rather than red noise.
