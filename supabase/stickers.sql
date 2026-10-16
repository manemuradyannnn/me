-- Sticker board for the portfolio site.
-- Run this once in the Supabase SQL Editor.

create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  src text not null,
  placed_by text not null,
  ax double precision not null,
  ay double precision not null,
  rot double precision not null,
  anchor text not null default 'paper',
  created_at timestamptz not null default now(),
  constraint stickers_key_known check (
    key in (
      'matcha', 'kitty', 'nigiri', 'cn', 'bow', 'fish', 'heart', 'guitar',
      'cat', 'flower', 'wand', 'frisk', 'pacman', 'link', 'shark', 'bunny', 'pinkkitty'
    )
  ),
  constraint stickers_anchor_paper check (anchor = 'paper'),
  constraint stickers_ax check (ax >= 0 and ax <= 1),
  constraint stickers_ay check (ay >= 0 and ay <= 1),
  constraint stickers_rot check (rot >= -180 and rot <= 180),
  constraint stickers_by_format check (placed_by ~ '^[0-9a-fA-F-]{8,80}$')
);

create index if not exists stickers_placed_by_idx on public.stickers (placed_by);

create table if not exists public.board_state (
  id int primary key default 1,
  version int not null default 0,
  constraint board_state_singleton check (id = 1)
);

insert into public.board_state (id, version)
values (1, 0)
on conflict (id) do nothing;

create or replace function public.stickers_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.stickers) >= 200 then
    raise exception 'sticker limit';
  end if;
  return new;
end;
$$;

drop trigger if exists stickers_limit on public.stickers;
create trigger stickers_limit
before insert on public.stickers
for each row
execute function public.stickers_limit();

create or replace function public.touch_board_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.board_state
  set version = version + 1
  where id = 1;
  return null;
end;
$$;

drop trigger if exists stickers_touch_version on public.stickers;
create trigger stickers_touch_version
after insert or update or delete on public.stickers
for each statement
execute function public.touch_board_version();

revoke all on function public.stickers_limit() from public, anon, authenticated;
revoke all on function public.touch_board_version() from public, anon, authenticated;

alter table public.stickers enable row level security;
alter table public.board_state enable row level security;

drop policy if exists "public read stickers" on public.stickers;
drop policy if exists "public add stickers" on public.stickers;
drop policy if exists "public move stickers" on public.stickers;
drop policy if exists "public remove stickers" on public.stickers;
drop policy if exists "authenticated add stickers" on public.stickers;
drop policy if exists "owner update stickers" on public.stickers;
drop policy if exists "owner delete stickers" on public.stickers;

create policy "public read stickers"
  on public.stickers
  for select
  to anon, authenticated
  using (true);

create policy "authenticated add stickers"
  on public.stickers
  for insert
  to authenticated
  with check ((select auth.uid())::text = placed_by);

create policy "owner update stickers"
  on public.stickers
  for update
  to authenticated
  using ((select auth.uid())::text = placed_by)
  with check ((select auth.uid())::text = placed_by);

create policy "owner delete stickers"
  on public.stickers
  for delete
  to authenticated
  using ((select auth.uid())::text = placed_by);

drop policy if exists "public read board" on public.board_state;
create policy "public read board"
  on public.board_state
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.stickers from anon;
grant usage on schema public to anon, authenticated;
grant select on public.stickers to anon, authenticated;
grant insert, update, delete on public.stickers to authenticated;
grant select on public.board_state to anon, authenticated;
