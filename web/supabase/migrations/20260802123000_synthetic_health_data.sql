-- Synthetic-only fixtures for AkuCheckHome. These tables are intentionally
-- inaccessible through the publishable key; the seed CLI requires a secret key.

create or replace function public.akucheck_valid_pulses(values_json jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(values_json) = 'object'
    and not exists (
      select 1
      from jsonb_each(values_json) as pulse(code, value)
      where code not in ('HT','SI','LV','GB','KI','BL','LU','LI','SP','ST','PC','TE')
         or jsonb_typeof(value) <> 'number'
         or (value #>> '{}')::numeric not between -2 and 2
         or trunc((value #>> '{}')::numeric) <> (value #>> '{}')::numeric
    );
$$;

create table if not exists public.synthetic_users (
  id uuid primary key,
  email text not null unique,
  display_name text not null,
  baseline_scores jsonb not null,
  baseline_pulses jsonb not null check (public.akucheck_valid_pulses(baseline_pulses)),
  is_synthetic boolean not null default true check (is_synthetic)
);

create table if not exists public.daily_health_records (
  id uuid primary key,
  user_id uuid not null references public.synthetic_users(id) on delete cascade,
  record_date date not null,
  checkin jsonb,
  scenario text not null,
  is_synthetic boolean not null default true check (is_synthetic),
  unique (user_id, record_date)
);

create table if not exists public.pulse_sessions (
  id uuid primary key,
  user_id uuid not null references public.synthetic_users(id) on delete cascade,
  record_date date not null,
  phase text not null check (phase in ('before', 'after')),
  scenario text not null,
  values_json jsonb not null check (public.akucheck_valid_pulses(values_json)),
  measured_at timestamptz not null,
  is_synthetic boolean not null default true check (is_synthetic),
  unique (user_id, record_date, phase)
);

create table if not exists public.interventions (
  id uuid primary key,
  user_id uuid not null references public.synthetic_users(id) on delete cascade,
  record_date date not null,
  kind text not null,
  outcome text not null check (outcome in ('improved', 'unchanged', 'not-assessed')),
  performed_at timestamptz not null,
  is_synthetic boolean not null default true check (is_synthetic),
  unique (user_id, record_date)
);

alter table public.synthetic_users enable row level security;
alter table public.daily_health_records enable row level security;
alter table public.pulse_sessions enable row level security;
alter table public.interventions enable row level security;

-- No RLS policies are created. Only an explicitly supplied Supabase secret key
-- can seed or clean these fixtures.
