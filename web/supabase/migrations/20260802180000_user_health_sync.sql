create table if not exists public.user_health_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_date date not null,
  checkin jsonb,
  pulses jsonb,
  wellbeing jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, record_date)
);

alter table public.user_health_records enable row level security;
create policy "Users can read their own health records" on public.user_health_records for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their own health records" on public.user_health_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own health records" on public.user_health_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on table public.user_health_records from anon;
grant select, insert, update on table public.user_health_records to authenticated;
