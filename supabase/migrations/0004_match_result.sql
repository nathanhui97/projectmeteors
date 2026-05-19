-- Phase 3b: match result tracking.
-- Apply: paste into Supabase dashboard → SQL Editor → Run.

alter table public.rooms
  add column if not exists winner_id   uuid references auth.users(id) on delete set null,
  add column if not exists finished_at timestamptz;
