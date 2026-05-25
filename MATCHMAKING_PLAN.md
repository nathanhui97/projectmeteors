# Matchmaking & Ranked System — Project V

## Overview

Two phases building on each other:
1. **Auto-matching** — player clicks "Find Match", gets paired automatically, both redirected to a room. No code sharing needed.
2. **Ranked** — same queue with ELO rating calculated after every match. Players have a visible rank.

---

## How It Works (User Flow)

### Casual match
```
Player A clicks "Find Match (Casual)"
  → joins queue, sees waiting screen
  
  [no one waiting]           [Player B joins queue]
  → polls/listens            → server finds A waiting
                             → creates room
                             → marks both as matched
                             
Both players redirected to /rooms/[code] automatically
Game plays out as normal
No ELO change
```

### Ranked match (Phase 2)
```
Same flow, but:
- Only players with a profile + ELO can queue
- ELO updated after match result is confirmed
- Match marked as ranked in match_results
```

---

## Database Schema

### New tables

```sql
-- Player profiles (also used for ranked)
create table public.user_profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  elo           integer not null default 1000,
  wins          integer not null default 0,
  losses        integer not null default 0,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Matchmaking queue
create table public.matchmaking_queue (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  deck_id       uuid not null references public.decks(id),
  mode          text not null default 'casual',  -- casual | ranked
  status        text not null default 'waiting', -- waiting | matched | cancelled
  matched_room_id uuid references public.rooms(id),
  joined_at     timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '3 minutes'
);

-- One active queue entry per user at a time
create unique index matchmaking_queue_active_user
  on public.matchmaking_queue(user_id)
  where status = 'waiting';
```

### Changes to existing tables

```sql
-- Tag match results as ranked/casual and store ELO change
alter table public.match_results
  add column if not exists mode text not null default 'casual',
  add column if not exists winner_elo_after integer,
  add column if not exists loser_elo_after  integer;
```

---

## API & Server Actions

### `joinQueue(deckId, mode)` — server action
1. Check user is authenticated and owns the deck
2. Clean up any expired queue entries (`expires_at < now()`)
3. Look for a waiting opponent in the same mode
4. **If opponent found:**
   - Create a room (reuse existing `createRoom` logic)
   - Update both queue entries: `status = 'matched'`, `matched_room_id = room.id`
   - Return `{ matched: true, roomCode }`
5. **If no opponent:**
   - Insert queue entry with `status = 'waiting'`
   - Return `{ matched: false, queueId }`

### `cancelQueue(queueId)` — server action
- Set `status = 'cancelled'` for the user's queue entry
- Return immediately

### Realtime subscription (client-side)
- After joining queue, subscribe to `matchmaking_queue` row for their `id`
- When `status` changes to `matched` → read `matched_room_id` → redirect to room

---

## Pages & Components

### `/play` — new page (replaces current rooms page as primary entry point)
```
┌─────────────────────────────────────┐
│  Find a Match                       │
│                                     │
│  Deck: [dropdown]          [Edit]   │
│                                     │
│  [  Find Match (Casual)  ]          │
│  [  Find Match (Ranked)  ]  ← Ph2  │
│                                     │
│  ── or ──                           │
│                                     │
│  [  Create Private Room  ]          │
│  [  Join with Code       ]          │
└─────────────────────────────────────┘
```

### Waiting screen (shown after joining queue)
```
┌─────────────────────────────────────┐
│  Looking for opponent…              │
│                                     │
│         ◌  (spinner)                │
│                                     │
│  Deck: Zeon Strike Force            │
│  Mode: Casual                       │
│  Waiting: 0:23                      │
│                                     │
│  [  Cancel  ]                       │
└─────────────────────────────────────┘
```
- Timer counts up
- Cancels automatically if queue entry expires (3 min)
- On match: brief "Opponent found!" flash → redirect

---

## ELO System (Phase 2)

### Formula — standard ELO with K=32
```
expected  = 1 / (1 + 10^((opponent_elo - my_elo) / 400))
new_elo   = my_elo + 32 * (result - expected)
            result: 1 = win, 0 = loss
```

### When ELO updates
- Only for `mode = 'ranked'` matches
- Triggered in `reportResult` server action when both players agree on winner
- Both players' `user_profiles.elo`, `wins`, `losses` updated atomically
- Stored in `match_results.winner_elo_after` / `loser_elo_after` for history

### Starting ELO
- All players start at 1000
- Profile auto-created on first ranked queue join

---

## Leaderboard (`/leaderboard`)

Simple ranked table:

| Rank | Player | ELO | W | L | Win % |
|------|--------|-----|---|---|-------|
| 1 | ShiroAmada | 1187 | 24 | 8 | 75% |
| 2 | ChampoTank | 1143 | 19 | 11 | 63% |

- Only shows players who have played at least 1 ranked match
- Updates live (or on page refresh)

---

## Build Phases

### Phase 1 — Auto-matching (casual)
- [ ] DB: `matchmaking_queue` table + `user_profiles` table (for display name, no ELO yet)
- [ ] Server action: `joinQueue` — match or insert
- [ ] Server action: `cancelQueue`
- [ ] `/play` page with deck selector + Find Match button
- [ ] Waiting screen with realtime subscription + cancel
- [ ] Auto-redirect both players to room on match
- [ ] Home page: update "Play" button → `/play`

### Phase 2 — Ranked
- [ ] DB: add ELO columns to `user_profiles`, mode + ELO columns to `match_results`
- [ ] Profile auto-create on first ranked queue join
- [ ] ELO calculation in `reportResult` for ranked matches
- [ ] "Find Match (Ranked)" button on `/play` page
- [ ] `/leaderboard` page
- [ ] Player's ELO shown on home dashboard

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Queue polling | Supabase Realtime (row-level subscription) | Instant redirect, no polling needed |
| Queue timeout | 3 minutes | Short enough to not leave ghosts, long enough to find a match |
| ELO K-factor | 32 | Good for small active player pools |
| Ranked requirement | Any player can queue ranked | No minimum games needed to start |
| Match mode | Stored on room + match_result | Clean separation of casual vs ranked |
| Opponent selection | First available (no ELO matching) | Player pool too small for skill-based matching |

---

## What We Are NOT Building
- Skill-based matchmaking (ELO range filter) — pool too small
- Spectator mode
- Rematch button
- Party / duo queue
- Placement matches

---

## Build Order Summary

```
Phase 1  →  Casual auto-matching queue + /play page
Phase 2  →  Ranked queue + ELO + leaderboard
(Later)  →  Tournaments (uses same room creation logic)
```
