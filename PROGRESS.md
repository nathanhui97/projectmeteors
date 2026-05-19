# Project status & onboarding

This is the **Gundam Webcam Companion** — a desktop web app that's the focused remote-play home for the physical Gundam Card Game. See [`PRODUCT_BRIEF_FINAL.md`](./PRODUCT_BRIEF_FINAL.md) for the locked product scope. **Read that first.**

This file is the running log of what's been built, what comes next, and how to pick up the work on a fresh machine.

---

## Tech stack (locked)

- **Framework:** Next.js 16.2.6 with Turbopack
  - ⚠️ This Next has breaking changes vs older versions. Notably: `middleware.ts` is renamed to `proxy.ts`, and dynamic-route `params` is a `Promise` that must be awaited. Read `node_modules/next/dist/docs/` for anything non-trivial.
- **Auth, DB, realtime, storage:** Supabase (project `lkrxrakdfqclerflvtxn`)
- **Hosting:** Vercel (auto-deploys from `main`)
- **Video (later, Phase 2):** Daily API — not wired yet
- **Language:** TypeScript

---

## Phase progress

### ✅ Phase 1 — Deck registration (complete)

| # | What | Where |
|---|------|-------|
| 1.1 | Scraped 1067 cards across all current sets (GD01–GD04 + ST01–ST09) with images. Pure-HTTP scraper (no Playwright). | `scripts/scrape-cards.ts` → outputs `scripts/cards.json` + `scripts/card-images/` (gitignored) |
| 1.2 | Postgres schema: `cards`, `decks`, `deck_cards` + RLS + `card-images` storage bucket | `supabase/migrations/0001_init_decks.sql` |
| 1.3 | Seed: uploads images + upserts catalog rows | `scripts/seed-supabase.ts` |
| 1.4 | "My Decks" list | `app/decks/page.tsx` |
| 1.5 | Deck builder with name/color/type/set filters, click-to-preview modal, validation (50 / 4 / 2-colors) | `app/decks/new/page.tsx` + `app/decks/_components/DeckBuilder.tsx` + `CardPreviewModal.tsx` |
| 1.6 | Deck detail view | `app/decks/[id]/page.tsx` |
| 1.7 | Edit + delete | `app/decks/[id]/edit/page.tsx` |
| + | Decklist import (paste text) and export-as-text (variants collapse to base ID) | `lib/decks/parse.ts` + `ImportModal.tsx` + `ExportButton.tsx` |

### ⏳ Phase 2+ — not started

Per the product brief, the next things to build are the **game room**, **card-showing during play** (the headline feature), **built-in video** (Daily API, bolted on last), **match history**, and **guided setup**. The brief is explicit that video is the LAST piece — core experience first.

---

## Key product principles (so future work doesn't drift)

These come from the brief; flagged here because they shape implementation decisions:

- **The app is a companion, not a referee.** Never tries to read/verify game state.
- **Pull, not push.** No forced bookkeeping during play (damage tracking was explicitly cut for this reason).
- **Desktop-browser-first.** The user's phone is often the overhead camera.
- **Build safe-first.** Daily video gets bolted on last and kept isolated.
- **Win by focus.** Resist scope creep beyond the Gundam community.

## Important deviations from the brief

- **No resource deck modelling.** The deck builder handles the 50-card main deck only. Reason: card-showing is the purpose of registering a deck, and players never need to "show" a resource card. The brief mentions "main + resource"; this overrides it.
- **Alt-art variants collapse to base ID on export.** So exported text pastes cleanly into other tools that don't track alt arts.

---

## Setting up on a new computer

Most of this can be skipped — the Supabase project already has all the data. You only need to re-scrape or re-seed if you're rebuilding the catalog.

### Minimal (just want to run the app)

1. Clone the repo.
2. Create `.env.local` in the project root with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://lkrxrakdfqclerflvtxn.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<copy from Supabase dashboard → Project Settings → API>
   ```
   (Both values are also set in Vercel; if you've forgotten them, check there.)
3. `npm install`
4. `npm run dev` → http://localhost:3000

You should be able to sign in (Supabase auth), go to `/decks`, create a deck, and the catalog will show up because it's already in the live Supabase project.

### Optional (re-scrape / re-seed the catalog)

Only needed if the Gundam card list has new sets you want to import, or if the DB was wiped.

1. **Re-scrape** (writes to `scripts/cards.json` + `scripts/card-images/`):
   ```powershell
   npx tsx scripts/scrape-cards.ts
   ```
   Takes ~5 min. Resumable.

2. **Re-seed Supabase** (uploads images + upserts card rows). Needs the service-role key:
   ```powershell
   $env:SUPABASE_URL="https://lkrxrakdfqclerflvtxn.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key from Supabase dashboard>"
   npx tsx scripts/seed-supabase.ts
   ```
   ⚠️ The `service_role` key bypasses all RLS. Don't commit it, don't paste it in chat.

---

## Repo layout (the parts that matter)

```
app/
├─ page.tsx                  home
├─ login/                    sign-in flow
├─ auth/                     callback + signout routes
└─ decks/                    Phase 1
   ├─ page.tsx               My Decks list
   ├─ new/page.tsx           create deck
   ├─ [id]/page.tsx          view deck (has Export)
   ├─ [id]/edit/page.tsx     edit deck (has Delete)
   └─ _components/           DeckBuilder, CardPreviewModal, ImportModal, ExportButton

lib/
├─ supabase/                 SSR client setup (server, browser, middleware/proxy)
├─ cards/queries.ts          catalog fetch
├─ decks/queries.ts          deck reads
├─ decks/actions.ts          server actions: create/update/delete
├─ decks/parse.ts            decklist text parser + exporter
└─ types.ts                  shared types + DECK_RULES

scripts/                     dev-only, NOT deployed
├─ scrape-cards.ts           catalog scraper
├─ seed-supabase.ts          DB + storage seed
└─ explore-*.ts              one-off discovery scripts (kept for documentation)

supabase/migrations/
└─ 0001_init_decks.sql       Phase 1 schema (idempotent — safe to re-run)

proxy.ts                     auth session refresh (formerly middleware.ts)
PRODUCT_BRIEF_FINAL.md       source of truth for product scope
```

---

## Useful commands

```powershell
npm run dev               # local dev server
npm run build             # production build (also runs type-check)
npm run lint              # eslint

# scraper / seed (see "Optional" above)
npx tsx scripts/scrape-cards.ts
npx tsx scripts/scrape-cards.ts --set GD01     # one set only
npx tsx scripts/seed-supabase.ts               # needs env vars
```

---

## How to verify a fresh setup works

1. `npm run dev`
2. Open http://localhost:3000 → sign in
3. Click **My Decks** → **New deck**
4. Search "Gundam", click a card to preview, click `+` to add
5. Add until you have 50 cards in ≤2 colors → name the deck → **Save**
6. You should land on the deck detail page with **Edit** and **Export as text** buttons

If any step fails, check:
- `.env.local` matches the Supabase project
- The schema migration has been applied (run `supabase/migrations/0001_init_decks.sql` in the SQL editor if cards table is missing)
- Browser console / network tab for the actual error
