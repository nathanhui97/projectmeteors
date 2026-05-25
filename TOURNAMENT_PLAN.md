# Tournament & Ranked System — Project V

## Overview

Two connected features:
1. **Tournaments** — admin-created brackets with prizes, players register and play through the bracket using the existing room system
2. **Ranked** — ELO-based rating calculated automatically from all match results, with a public leaderboard

---

## Database Schema

### New tables

```sql
-- Admin role on existing auth users
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  elo integer not null default 1000,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Tournament definition
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  prize text,                        -- free text e.g. "1st: $50 store credit"
  format text not null default 'single_elimination',
  status text not null default 'registration', -- registration | active | completed
  max_players integer not null default 16,
  starts_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Player registrations
create table public.tournament_registrations (
  tournament_id uuid references public.tournaments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  deck_id uuid references public.decks(id),
  registered_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

-- Bracket matches
create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  round integer not null,            -- 1 = first round, 2 = quarter, etc.
  match_number integer not null,     -- position within the round
  player1_id uuid references auth.users(id),
  player2_id uuid references auth.users(id),
  winner_id uuid references auth.users(id),
  room_id uuid references public.rooms(id),  -- linked game room (nullable until match starts)
  status text not null default 'pending',    -- pending | active | completed | bye
  created_at timestamptz not null default now()
);
```

### Changes to existing tables

```sql
-- Link match results to tournament matches for ELO calculation
alter table public.match_results
  add column if not exists tournament_match_id uuid references public.tournament_matches(id),
  add column if not exists is_ranked boolean not null default true;
```

---

## ELO Formula

Standard ELO with K=32 (aggressive enough for a small player pool):

```
expected = 1 / (1 + 10^((opponent_elo - player_elo) / 400))
new_elo   = player_elo + 32 * (actual - expected)
           where actual = 1 for win, 0 for loss
```

ELO is updated server-side in the `reportResult` action whenever a ranked match finalises. Starting ELO is 1000 for all new players.

---

## Pages & Routes

### Admin (`/admin`) — protected, admin only

| Route | Purpose |
|---|---|
| `/admin` | Dashboard — list all tournaments, quick stats |
| `/admin/tournaments/new` | Create tournament form |
| `/admin/tournaments/[id]` | Manage tournament — view registrations, start, advance rounds |

### Public

| Route | Purpose |
|---|---|
| `/tournaments` | List upcoming + active tournaments with prizes |
| `/tournaments/[id]` | Tournament detail — bracket, registrations, prize info |
| `/leaderboard` | ELO rankings table |

### Home page additions
- Banner/card for active or upcoming tournaments with prize teaser
- Player's current ELO rank shown in the logged-in dashboard

---

## Feature Phases

### Phase 1 — Admin foundation
- [ ] `user_profiles` table + seed admin flag for your account
- [ ] `/admin` route with auth guard (redirect non-admins)
- [ ] Create tournament form (name, description, prize, date, max players)
- [ ] Tournament list in admin dashboard

### Phase 2 — Public tournament listing
- [ ] `/tournaments` page listing upcoming + active tournaments
- [ ] Tournament detail page with prize info and registration count
- [ ] Register button (adds row to `tournament_registrations`)
- [ ] Tournament banner on home page for active/upcoming events

### Phase 3 — Bracket & match play
- [ ] "Start Tournament" button in admin — locks registration, generates bracket
- [ ] Single-elimination bracket generation algorithm (handle byes for non-power-of-2 player counts)
- [ ] Bracket view on tournament detail page
- [ ] "Play Match" button for matched players — creates a room linked to `tournament_matches`
- [ ] Match result feeds back to bracket (advance winner, update match status)
- [ ] Admin can manually advance or override results

### Phase 4 — Ranked ELO
- [ ] `user_profiles` table with starting ELO 1000
- [ ] ELO recalculated on every ranked `match_results` insert (Supabase trigger or server action)
- [ ] `/leaderboard` page — ranked table with display name, ELO, W/L record
- [ ] Player's ELO shown on home dashboard
- [ ] Option to mark a room as "casual" (skips ELO update)

---

## Bracket Generation (single elimination)

```
Players: [A, B, C, D, E, F] → 6 players
Next power of 2 above 6 = 8
Byes needed = 8 - 6 = 2

Round 1 matches:
  Match 1: A vs B
  Match 2: C vs D
  Match 3: E vs BYE  ← E advances automatically
  Match 4: F vs BYE  ← F advances automatically

Round 2 (quarter-final):
  Match 1: winner(M1) vs winner(M2)
  Match 2: E vs F
  ...
```

Bracket rows are pre-created with `status = 'bye'` for bye matches so the UI can render the full bracket immediately.

---

## Admin Auth Guard

Simple check — no separate auth system needed:

```typescript
// lib/admin/guard.ts
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/");
}
```

Your account gets `is_admin = true` via a one-time SQL statement in Supabase dashboard.

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Bracket format | Single elimination only (for now) | Simplest to implement and explain |
| ELO K-factor | 32 | Good for small competitive pools |
| Prize handling | Free text field | No payment processing needed |
| Admin access | DB flag, not a separate login | Simple, you're the only admin |
| Casual vs ranked | Room-level flag | Easy to add, players choose before creating room |
| Display names | Optional, falls back to email | Players can set a username later |

---

## What We Are NOT Building (yet)

- Payment / entry fees (no Stripe)
- Double elimination
- Swiss format
- In-app notifications / push alerts
- Team tournaments
- Seeding / skill-based bracket placement

---

## Build Order Summary

```
Phase 1  →  Admin panel + create tournaments
Phase 2  →  Public listing + registration + home banner
Phase 3  →  Bracket generation + match play
Phase 4  →  ELO ranked system + leaderboard
```

Each phase ships independently and adds visible value.
