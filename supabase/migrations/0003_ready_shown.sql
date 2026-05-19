-- Phase 3: ready state + card-showing columns.
-- Apply: paste into Supabase dashboard → SQL Editor → Run.

alter table public.rooms
  add column if not exists host_ready          boolean not null default false,
  add column if not exists guest_ready         boolean not null default false,
  add column if not exists host_shown_card_id  text references public.cards(id) on delete set null,
  add column if not exists guest_shown_card_id text references public.cards(id) on delete set null;
