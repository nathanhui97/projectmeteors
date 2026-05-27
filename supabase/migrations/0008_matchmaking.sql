-- Phase 8: Matchmaking queue + user profiles
-- Apply: Supabase dashboard → SQL Editor → Run

-- ── User profiles ────────────────────────────────────────────────────────────
create table if not exists public.user_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  elo          integer     not null default 1000,
  wins         integer     not null default 0,
  losses       integer     not null default 0,
  is_admin     boolean     not null default false,
  created_at   timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
create policy "profiles_public_read"  on public.user_profiles for select using (true);
create policy "profiles_own_update"   on public.user_profiles for update using (auth.uid() = user_id);
create policy "profiles_own_insert"   on public.user_profiles for insert with check (auth.uid() = user_id);

-- ── Matchmaking queue ────────────────────────────────────────────────────────
create table if not exists public.matchmaking_queue (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  deck_id         uuid        not null references public.decks(id),
  mode            text        not null default 'casual',   -- casual | ranked
  status          text        not null default 'waiting',  -- waiting | matched | cancelled
  matched_room_id uuid        references public.rooms(id),
  joined_at       timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '3 minutes')
);

alter table public.matchmaking_queue enable row level security;
create policy "queue_own_select" on public.matchmaking_queue for select using (auth.uid() = user_id);
create policy "queue_own_insert" on public.matchmaking_queue for insert with check (auth.uid() = user_id);
create policy "queue_own_update" on public.matchmaking_queue for update using (auth.uid() = user_id);

-- One active waiting entry per user at a time
create unique index if not exists matchmaking_one_active_per_user
  on public.matchmaking_queue(user_id)
  where status = 'waiting';

-- Enable realtime so the waiting player gets pushed the match instantly
alter publication supabase_realtime add table public.matchmaking_queue;

-- ── Matchmaking RPC ──────────────────────────────────────────────────────────
-- SECURITY DEFINER lets the function update the opponent's queue row
-- FOR UPDATE SKIP LOCKED prevents two simultaneous joins from matching the same opponent
create or replace function public.find_or_create_match(
  p_deck_id uuid,
  p_mode    text,
  p_user_id uuid,
  p_email   text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opponent matchmaking_queue%rowtype;
  v_room_id  uuid;
  v_code     text;
  v_queue_id uuid;
  v_chars    text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_i        int;
  v_attempt  int := 0;
begin
  -- Cancel expired entries
  update matchmaking_queue
     set status = 'cancelled'
   where status = 'waiting' and expires_at < now();

  -- Cancel any existing waiting entry this user has (re-queue is fresh)
  update matchmaking_queue
     set status = 'cancelled'
   where user_id = p_user_id and status = 'waiting';

  -- Find the oldest waiting opponent (same mode, different user)
  select * into v_opponent
    from matchmaking_queue
   where status = 'waiting'
     and mode   = p_mode
     and user_id != p_user_id
   order by joined_at asc
   limit 1
   for update skip locked;

  if v_opponent.id is not null then
    -- Generate a unique room code using random()
    loop
      v_code := '';
      for v_i in 1..6 loop
        v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
      end loop;
      exit when not exists (select 1 from rooms where code = v_code);
      v_attempt := v_attempt + 1;
      exit when v_attempt > 20;
    end loop;

    -- Create room: opponent is host, current user is guest; both ready immediately
    insert into rooms (
      code,
      host_id,  host_email,  host_deck_id,  host_ready,
      guest_id, guest_email, guest_deck_id, guest_ready,
      status
    )
    select
      v_code,
      v_opponent.user_id,
      (select email from auth.users where id = v_opponent.user_id),
      v_opponent.deck_id, true,
      p_user_id, p_email, p_deck_id, true,
      'active'
    returning id into v_room_id;

    -- Mark both queue entries as matched
    update matchmaking_queue
       set status = 'matched', matched_room_id = v_room_id
     where id = v_opponent.id
        or (user_id = p_user_id and status = 'cancelled');  -- the one we just cancelled above

    -- Also update the freshly-cancelled own entry
    update matchmaking_queue
       set status = 'matched', matched_room_id = v_room_id
     where user_id = p_user_id and status = 'cancelled' and matched_room_id is null;

    return json_build_object(
      'matched',   true,
      'room_code', v_code,
      'room_id',   v_room_id
    );

  else
    -- No opponent waiting — add to queue
    insert into matchmaking_queue (user_id, deck_id, mode)
    values (p_user_id, p_deck_id, p_mode)
    returning id into v_queue_id;

    return json_build_object(
      'matched',  false,
      'queue_id', v_queue_id
    );
  end if;
end;
$$;

grant execute on function public.find_or_create_match(uuid, text, uuid, text) to authenticated;
