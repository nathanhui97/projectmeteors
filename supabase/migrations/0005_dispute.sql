-- Phase 3c: mutual-agreement match result.
-- Apply: paste into Supabase dashboard → SQL Editor → Run.
-- Safe to run even if 0004 was already applied.

-- Ensure winner_id / finished_at exist (idempotent with 0004).
alter table public.rooms
  add column if not exists winner_id   uuid references auth.users(id) on delete set null,
  add column if not exists finished_at timestamptz;

-- Drop the old status check constraint and recreate with 'disputed'.
do $$
declare v_con text;
begin
  select conname into v_con
  from pg_constraint
  where conrelid = 'public.rooms'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';
  if v_con is not null then
    execute format('alter table public.rooms drop constraint %I', v_con);
  end if;
end $$;

alter table public.rooms
  add constraint rooms_status_check
  check (status in ('waiting', 'active', 'finished', 'disputed'));

-- Independent result claims — each player reports separately.
alter table public.rooms
  add column if not exists host_result_claim  uuid references auth.users(id) on delete set null,
  add column if not exists guest_result_claim uuid references auth.users(id) on delete set null;
