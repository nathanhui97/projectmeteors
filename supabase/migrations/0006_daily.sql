-- Phase 6: Daily video room URL per game room.
-- Apply: paste into Supabase dashboard → SQL Editor → Run.

alter table public.rooms
  add column if not exists daily_room_url text;
