# Product Brief (FINAL — LOCKED) — Gundam Webcam Companion

> **Status:** Locked. Scope, stack, and feature set are decided. This document is the
> source of truth for the MVP build.
>
> **Purpose:** This brief tells Claude Code *what* the product is and *why* it exists, so
> build decisions stay aligned with the vision. It is not a task list — the phased build
> plan is a separate document. Read this first.

---

## 1. One-line summary

A native web app that gives the Gundam Card Game community the best possible remote
webcam-play experience: built-in video, perfect on-demand card viewing, saved decks, and a
real home for match history — all in one place.

---

## 2. The problem

The Gundam Card Game (Bandai, launched worldwide July 2025) is a fast-growing physical
trading card game with a large, active community that already plays remotely. Today that
community plays over generic tools — typically a Discord voice channel with a camera
pointed at the table (the community Discord literally has voice channels named "Table 1"
through "Table 15" in constant use).

That generic setup has real, repeated pain points:

1. **Cards are hard to read** on a webcam — glare, reflections, and blur make card text
   genuinely difficult to see.
2. **There is no record of anything** — no saved decks, no match history, no win/loss
   tracking, no stats. Every game is ephemeral. Players have no "home" for their remote
   play.
3. **Setup is fiddly** — camera angle, lighting, and positioning are done by trial and
   error with no guidance.

No tool solves this for Gundam. SpellTable is owned by Wizards of the Coast, is
Magic-focused, and offers Gundam players nothing beyond a plain video call. The Discord
tables are just generic voice channels. **Nobody is building for the Gundam community
specifically.** That is the opportunity.

---

## 3. What this product is

A single, native web app where two players play a game of physical Gundam remotely. The
app does NOT replace the physical cards — players use their real decks on a real table
with an overhead camera. The app is the complete remote-play environment:

1. **Built-in video** — players see each other's overhead camera feed inside the app. No
   separate Discord or video call needed.
2. **Deck registration** — players record their physical decklists in the app and save
   them.
3. **Card-showing** — when a player wants their opponent to clearly see a card, they tap
   it from their registered deck and a perfect, crisp card image appears for the opponent.
   This replaces squinting at the webcam.
4. **Match record / "the home"** — saved decks, match history, win/loss records, opponents
   played, and stats over time. This is the thing no current solution offers.
5. **Guided setup** — a genuinely good onboarding flow for camera angle, lighting, and
   hardware.

---

## 4. The product's edge (why players will choose it)

The advantage is not one revolutionary feature. It is being the **focused, purpose-built
home for Gundam remote play**, made of several solid, achievable wins that players feel
every game:

- **Perfect card readability** — card-showing gives a flawless image, every time, vs.
  squinting at glare.
- **A real home** — saved decks, history, and stats. Nothing else gives the community
  this.
- **Smooth setup** — guided onboarding where competitors offer none.
- **Made for Gundam** — every part of the app is shaped around this specific game and
  community, something no generic tool can match.

The moat is focus and care for one community that nobody else is serving — not
out-engineering competitors.

---

## 5. Who it is for

Two players who play the physical Gundam Card Game, want to play remotely, and will run the
app on a desktop or laptop computer. The MVP is for players who already know each other or
arrange their own games (no matchmaking in MVP). It is desktop-browser-first, because the
player's phone is often used as the overhead camera.

---

## 6. The core user journey

1. Both players sign up / log in.
2. Each player registers or selects a saved decklist.
3. One player creates a game room and shares the room code; the other joins.
4. Both players set up their physical space using the in-app setup guide: a phone or
   webcam on an overhead arm pointed straight down at the playmat, plus the computer
   running the app.
5. The two players are now in a shared session — they see each other's video feed inside
   the app.
6. They play their physical game of Gundam. During play, when a player wants the opponent
   to see a card clearly, they tap it from their registered deck and the opponent sees a
   crisp image.
7. At the end of the game, the result (win/loss) is recorded to both players' match
   history.

---

## 7. MVP feature scope

### In scope

| # | Feature | Description |
|---|---------|-------------|
| 1 | Accounts | Sign-up and login. Persists decks and match history. |
| 2 | Deck registration | Create, save, and select decklists (main deck + resource deck). Multiple decks per user. The player owns the card data/images. |
| 3 | Game room | One player creates a room and gets a code; the other joins. Shared two-player session. Each player selects their deck. |
| 4 | Built-in video | Two-player video inside the game room via the Daily API. Players see each other's overhead camera feed. |
| 5 | Card-showing | A player taps a card from their registered deck; a crisp, perfect image of it appears in the opponent's view. The headline in-game feature. |
| 6 | Match record / "the home" | Win/loss recorded at game end. Match history, opponents played, and basic stats per user. Saved decks live here too. |
| 7 | Guided setup | An onboarding flow / help section covering camera angle, lighting, and recommended hardware. |

### Explicitly OUT of MVP scope (deliberate cuts)

- **Damage / game-state tracking** — cut. Requires continuous forced logging by players,
  which playtesting showed is disruptive to play. Damage stays on physical dice, read off
  the webcam, as players already do. Not a logging form — see Section 10.
- **Camera-based card/board recognition** — cut from MVP. See Section 10.
- **Matchmaking / playing strangers** — cut from MVP. Players arrange their own games.
- **Tournaments and payments** — cut. See Section 9 (legal considerations) and Section 10.
- **Mobile-first design** — MVP is desktop-browser-first.
- **Spectating, in-app text chat** — out of scope.

The MVP exists to validate one thing: that a focused, purpose-built remote-play home is
good enough that Gundam players use it repeatedly. Anything not serving that test is out.

---

## 8. Key design principles

- **The app is a companion, not a referee.** It never tries to read or verify the physical
  game state. It shows what players choose to show. This is acceptable for casual play
  between cooperating players, with the webcam always available as a backstop.
- **Pull, not push.** In-game interactions should be things the player *chooses* to do
  because they want something (e.g. tapping to show a card) — never continuous bookkeeping
  the game *forces* on them. Forced logging was playtested and found disruptive; the MVP
  deliberately avoids it.
- **Desktop-browser-first.** The app runs on a laptop/desktop, because the phone is often
  the overhead camera. Design layouts for a computer screen.
- **The physical cards are the real game.** The app adds clarity, record-keeping, and
  convenience; it does not digitize or replace the game.
- **Build safe-first.** Build the core experience (decks, card-showing, room, records)
  before the video. The Daily video integration is bolted on last and kept isolated, so
  the product is a working product even if the video layer is unfinished.
- **Win by focus.** The product's strength is being made specifically and carefully for
  the Gundam community. Protect that focus against scope creep.

---

## 9. Legal considerations (noted — require professional advice before relevant features)

These do NOT affect the MVP (the MVP has no tournaments and no payments), but are recorded
so they are not lost:

- **Card images / IP.** The Gundam card data and images are Bandai's intellectual
  property. The product owner holds the data for use in this product; any broader use or
  scaling should be reviewed with someone qualified in IP law.
- **Tournaments.** Bandai only recognizes "official" and "sanctioned" tournaments;
  sanctioned status requires Bandai approval, certified judges, and use of Bandai's TCG+
  app, and Bandai's rules prohibit electronic devices during sanctioned matches — making a
  webcam-play app incompatible with sanctioned tournaments. Any future tournaments in this
  product would be explicitly *unofficial/casual* and must not imply Bandai endorsement.
- **Prize pools / paid competition.** Any model where players pay in and a winner receives
  something of monetary value (cash, credit, gift cards) may constitute regulated gambling
  and must NOT be built without advice from a lawyer qualified in gaming/gambling law in
  the relevant jurisdiction.

---

## 10. Post-MVP (future directions — NOT to be built now)

Recorded so MVP decisions don't accidentally make them harder later:

- **Matchmaking** — connecting players who don't already know each other.
- **Camera recognition of board state** — if revisited, recognition's real value is
  reading *board/damage state* (card-reading is already solved by card-showing). This is a
  significant effort requiring a technical co-founder, a training dataset, and ongoing
  cost; it is a long-horizon item, not a near-term feature.
- **Damage tracking** — only viable if paired with recognition (so it requires no
  logging); a logging-based version is explicitly rejected.
- **Monetization** — to be determined post-MVP with real users. Must use legally clean
  models (e.g. premium accounts, non-cash cosmetic rewards, sponsor-funded events).
  Prize-pool models are excluded pending legal advice (Section 9).
- **Discord-native version** — the community lives in Discord; a Discord-integrated
  version is worth considering long-term.

---

## 11. Technology stack (LOCKED)

- **Hosting & serverless functions:** Vercel
- **Database, authentication, realtime sync:** Supabase
- **Video:** Daily API (two-participant video; on free-tier minutes for the MVP)
- **App type:** Native web app, desktop-browser-first
- **Built with:** Claude Code

Rationale: this stack lets a non-engineer build with AI assistance without operating
traditional server infrastructure. Supabase realtime powers the shared two-player session.
Vercel serverless functions hold secret keys (e.g. creating Daily rooms securely).

---

## 12. Definition of done (MVP)

The MVP is complete when two players can, in one app:

1. Sign up and log in.
2. Each register/select a decklist.
3. Create and join a shared game room via a room code.
4. See each other's overhead camera video inside the app.
5. During play, show each other cards clearly via the card-showing feature.
6. Record the game result, and see it reflected in their match history and stats.

If two players can do all of the above, the MVP has achieved its goal and is ready to put
in front of the Gundam community for validation.
