-- Phase 2 schema: two-player game rooms with realtime sync.
-- Apply: paste into Supabase dashboard → SQL Editor → Run.

create table if not exists public.rooms (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  host_id         uuid not null references auth.users(id) on delete cascade,
  guest_id        uuid references auth.users(id) on delete set null,
  host_email      text not null,
  guest_email     text,
  host_deck_id    uuid references public.decks(id) on delete set null,
  guest_deck_id   uuid references public.decks(id) on delete set null,
  status          text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  created_at      timestamptz not null default now()
);

create index if not exists rooms_code_idx    on public.rooms (code);
create index if not exists rooms_host_id_idx on public.rooms (host_id);

-- Full replica identity so UPDATE payloads include all columns in realtime events.
alter table public.rooms replica identity full;

alter table public.rooms enable row level security;

-- Any authenticated user can read rooms (needed to look up by code before joining).
drop policy if exists "authenticated users can read rooms" on public.rooms;
create policy "authenticated users can read rooms"
  on public.rooms for select
  using (auth.uid() is not null);

-- Users can create rooms where they are the host.
drop policy if exists "users can create rooms" on public.rooms;
create policy "users can create rooms"
  on public.rooms for insert
  with check (auth.uid() = host_id);

-- Host and guest can update the room; a non-member can also join a waiting room.
drop policy if exists "room members can update" on public.rooms;
create policy "room members can update"
  on public.rooms for update
  using (
    auth.uid() = host_id
    or auth.uid() = guest_id
    or (guest_id is null and status = 'waiting' and auth.uid() != host_id)
  );

-- Host can delete their own room.
drop policy if exists "host can delete room" on public.rooms;
create policy "host can delete room"
  on public.rooms for delete
  using (auth.uid() = host_id);

-- Subscribe rooms to realtime publication (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end $$;
