-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).
-- Then: Database → Replication → ensure the `reports` table is published for Realtime (often on by default for new tables).

create table if not exists public.reports (
  id uuid primary key,
  lat double precision not null,
  lng double precision not null,
  title text not null default '',
  description text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "reports_select_public" on public.reports
  for select using (true);

create policy "reports_insert_public" on public.reports
  for insert with check (true);

-- If new reports from other users don’t appear until refresh: Dashboard → Database → Publications
-- → ensure `supabase_realtime` includes `reports`, or run:
--   alter publication supabase_realtime add table public.reports;
