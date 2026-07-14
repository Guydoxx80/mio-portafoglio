create table if not exists public.portfolio_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trades jsonb not null default '[]'::jsonb,
  snapshots jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_data enable row level security;

drop policy if exists "portfolio_data_select_own" on public.portfolio_data;
drop policy if exists "portfolio_data_insert_own" on public.portfolio_data;
drop policy if exists "portfolio_data_update_own" on public.portfolio_data;
drop policy if exists "portfolio_data_delete_own" on public.portfolio_data;

create policy "portfolio_data_select_own"
on public.portfolio_data
for select
to authenticated
using (auth.uid() = user_id);

create policy "portfolio_data_insert_own"
on public.portfolio_data
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "portfolio_data_update_own"
on public.portfolio_data
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "portfolio_data_delete_own"
on public.portfolio_data
for delete
to authenticated
using (auth.uid() = user_id);
