-- Phase 1 schema: cards catalog + user-owned decks.
--
-- To apply: paste into Supabase dashboard → SQL Editor → Run.
-- (Or `supabase db push` if you set up the Supabase CLI later.)

-- ───────── extensions (must come before any indexes that use them) ─────────
-- pg_trgm gives fast LIKE/ILIKE name search via gin_trgm_ops.
-- In Supabase, extensions live in the `extensions` schema by convention.
create extension if not exists pg_trgm with schema extensions;

-- ───────── cards ─────────
-- Master catalog. Includes every art variant as its own row (e.g. GD01-001, GD01-001_p1).
-- Deck-construction rules (max 4 copies, max 2 colors) apply to base_id, not id —
-- this is enforced in the app layer.
create table if not exists public.cards (
  id              text primary key,
  base_id         text not null,
  set_code        text not null,
  card_number     text not null,
  variant_suffix  text,
  name            text not null,
  card_type       text,
  color           text,
  cost            integer,
  level           integer,
  ap              integer,
  hp              integer,
  effect          text,
  zone            text,
  trait           text,
  link            text,
  source_title    text,
  rarity          text,
  image_path      text not null
);

create index if not exists cards_base_id_idx     on public.cards (base_id);
create index if not exists cards_set_code_idx    on public.cards (set_code);
create index if not exists cards_color_idx       on public.cards (color);
create index if not exists cards_card_type_idx   on public.cards (card_type);
create index if not exists cards_name_trgm_idx   on public.cards using gin (name extensions.gin_trgm_ops);

-- ───────── decks ─────────
create table if not exists public.decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists decks_user_id_idx on public.decks (user_id);

-- ───────── deck_cards ─────────
-- Composition rows. card_id refers to a specific art variant; copies bounded 1..4.
create table if not exists public.deck_cards (
  deck_id   uuid not null references public.decks(id) on delete cascade,
  card_id   text not null references public.cards(id),
  copies    integer not null check (copies > 0 and copies <= 4),
  primary key (deck_id, card_id)
);

create index if not exists deck_cards_deck_id_idx on public.deck_cards (deck_id);

-- ───────── updated_at trigger on decks ─────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists decks_touch_updated_at on public.decks;
create trigger decks_touch_updated_at
  before update on public.decks
  for each row execute function public.touch_updated_at();

-- ───────── RLS ─────────
alter table public.cards      enable row level security;
alter table public.decks      enable row level security;
alter table public.deck_cards enable row level security;

drop policy if exists "cards readable to all" on public.cards;
create policy "cards readable to all"
  on public.cards for select
  using (true);

drop policy if exists "users read own decks" on public.decks;
create policy "users read own decks"
  on public.decks for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own decks" on public.decks;
create policy "users insert own decks"
  on public.decks for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own decks" on public.decks;
create policy "users update own decks"
  on public.decks for update
  using (auth.uid() = user_id);

drop policy if exists "users delete own decks" on public.decks;
create policy "users delete own decks"
  on public.decks for delete
  using (auth.uid() = user_id);

drop policy if exists "users read own deck_cards" on public.deck_cards;
create policy "users read own deck_cards"
  on public.deck_cards for select
  using (exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid()));

drop policy if exists "users insert own deck_cards" on public.deck_cards;
create policy "users insert own deck_cards"
  on public.deck_cards for insert
  with check (exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid()));

drop policy if exists "users update own deck_cards" on public.deck_cards;
create policy "users update own deck_cards"
  on public.deck_cards for update
  using (exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid()));

drop policy if exists "users delete own deck_cards" on public.deck_cards;
create policy "users delete own deck_cards"
  on public.deck_cards for delete
  using (exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid()));

-- ───────── Storage bucket for card images ─────────
-- Public bucket: card images are shown to opponents during play; they need to load
-- without per-request signing. The product owner already holds rights to host these.
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do update set public = excluded.public;

-- Anyone can read; only service_role (via seed script) can write.
drop policy if exists "card-images public read" on storage.objects;
create policy "card-images public read"
  on storage.objects for select
  using (bucket_id = 'card-images');
