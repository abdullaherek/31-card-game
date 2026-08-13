-- "31" — identity, chip ledger, hand history.
-- Run this once in the Supabase SQL editor (or via `supabase db push` if you use the CLI).
-- See plan: /Users/mac/.claude/plans/tidy-noodling-journal.md

-- One row per Supabase auth identity (Google/Apple). id mirrors auth.users.id so RLS
-- can use auth.uid() directly, and so the Colyseus server's JWT-derived user id always
-- resolves to exactly one row here.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  chips integer not null default 1000,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Append-only audit trail for every chip balance change. Never updated or deleted —
-- users.chips is a derived cache of "1000 + sum(chip_ledger.delta for this user)" and
-- should always reconcile against it.
create table public.chip_ledger (
  id bigserial primary key,
  user_id uuid not null references public.users (id),
  delta integer not null,
  reason text not null check (
    reason in ('SIGNUP_BONUS', 'HAND_WIN', 'HAND_LOSS', 'TABLE_FEE', 'ADMIN_ADJUST')
  ),
  hand_id text,
  counterparty_user_id uuid references public.users (id),
  created_at timestamptz not null default now()
);

create index chip_ledger_user_id_idx on public.chip_ledger (user_id);
create index chip_ledger_hand_id_idx on public.chip_ledger (hand_id);

-- One row per completed hand, for history/audit — result_json is a HandResult
-- snapshot from src/game/bettingEngine.ts (see finish()/HandResult).
create table public.hands (
  id text primary key, -- '<room_code>:<hand_no>'
  room_code text not null,
  hand_no integer not null,
  winner_user_id uuid references public.users (id),
  pot integer not null,
  result_json jsonb not null,
  played_at timestamptz not null default now()
);

create index hands_room_code_idx on public.hands (room_code);

-- Signup bonus: fires once per new Supabase auth identity, regardless of provider
-- (Google or Apple) — this is the "her kullanıcıya 1.000 çip" grant.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, chips)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'Oyuncu'),
      1000
    );
  insert into public.chip_ledger (user_id, delta, reason)
    values (new.id, 1000, 'SIGNUP_BONUS');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: every table starts locked down; add back exactly what the client needs to read.
alter table public.users enable row level security;
alter table public.chip_ledger enable row level security;
alter table public.hands enable row level security;

-- Anyone signed in can see display_name + chips for all users (simple "who's at the
-- table" / leaderboard display) — no email or other auth.users data is ever exposed
-- through this table.
create policy users_select_all on public.users
  for select
  to authenticated
  using (true);

-- No insert/update/delete policies are defined for `users` or `chip_ledger` on purpose:
-- with RLS enabled and no policy, ordinary (anon/authenticated-key) clients cannot
-- write to these tables AT ALL. The Colyseus server writes through the Supabase
-- **service role** key, which bypasses RLS entirely — that is the only chip-writing
-- path that exists. Manual admin balance corrections (is_admin-gated) go through the
-- Supabase SQL editor directly for v1; see the plan's "fast-follow" note.

-- Players can read hand history (useful for an eventual "history" screen); no writes
-- from the client — the Colyseus server writes these via the service role key too.
create policy hands_select_all on public.hands
  for select
  to authenticated
  using (true);

-- chip_ledger is intentionally NOT readable by ordinary clients (no select policy) —
-- it's an internal audit trail, not a user-facing "transaction history" yet. Expose a
-- narrower view/RPC later if you want players to see their own history.
