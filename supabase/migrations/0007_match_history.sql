-- Phase 7: Match history — record win/loss when a game finishes.
-- Apply: paste into Supabase dashboard → SQL Editor → Run.

create table if not exists public.match_results (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null,
  guest_id    uuid not null,
  winner_id   uuid not null,
  finished_at timestamptz not null default now()
);

alter table public.match_results enable row level security;

create policy "Users can read own results"
  on public.match_results for select
  using (auth.uid() = host_id or auth.uid() = guest_id);

create policy "Anyone can insert results"
  on public.match_results for insert
  with check (true);
