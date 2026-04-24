-- Seka Quote Calculator — Supabase Schema
-- No-auth variant: anon key reads/writes everything, passcode gate in app.
-- Safe to re-run (uses IF NOT EXISTS).

-- ============================================================
-- AGENTS (standalone, not tied to auth.users)
-- ============================================================
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  role text not null default 'agent' check (role in ('agent','owner','dispatch')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SETTINGS (singleton — office address, defaults)
-- ============================================================
create table if not exists public.settings (
  id int primary key default 1,
  office_address text not null,
  office_lat numeric,
  office_lng numeric,
  fourth_man_rate numeric not null default 40,
  default_unpacking_rate numeric not null default 15,
  discounted_unpacking_rate numeric not null default 10,
  box_delivery_minimum numeric not null default 75,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

-- ============================================================
-- RATE TABLES (editable by owner via admin UI)
-- ============================================================

create table if not exists public.rates_local_cuft (
  tier text primary key check (tier in ('t1','t2','t3','t4','t5')),
  morning numeric not null,
  afternoon numeric not null
);

create table if not exists public.rates_local_hourly (
  id serial primary key,
  crew_size int not null check (crew_size in (2,3)),
  tier text not null check (tier in ('t1','t2','t3','t4','t5')),
  rate numeric not null,
  unique (crew_size, tier)
);

create table if not exists public.rates_long_distance (
  state_code text primary key,
  state_name text not null,
  rate_per_cuft numeric not null,
  delivery_window text not null,
  max_discount_pct numeric not null default 5
);

create table if not exists public.rates_out_of_state (
  id int primary key default 1,
  rate_per_cuft numeric not null default 7.50,
  markup_pct numeric not null default 10,
  max_discount_pct numeric not null default 5,
  constraint ros_singleton check (id = 1)
);

create table if not exists public.rates_boxes (
  box_type text primary key,
  packing_cost numeric not null,
  sale_price numeric not null
);

create table if not exists public.rates_heavy_items (
  id serial primary key,
  item_name text unique not null,
  charge numeric,
  is_custom boolean not null default false,
  requires_photo boolean not null default false,
  notes text
);

create table if not exists public.rates_misc (
  key text primary key,
  value numeric not null,
  notes text
);

-- ============================================================
-- QUOTES
-- ============================================================
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_code text unique not null,
  agent_id uuid not null references public.agents(id),
  created_at timestamptz not null default now(),

  customer_name text,
  customer_email text,
  customer_phone text,

  move_type text not null check (move_type in ('local','long_distance','out_of_state')),
  pricing_method text check (pricing_method in ('cuft','hourly')),
  is_hra boolean not null default false,

  origin_address text not null,
  origin_zip text not null,
  destination_address text not null,
  destination_zip text not null,
  round_trip_miles numeric,
  tolls_amount numeric,

  total_cuft int,
  crew_size int,
  fourth_man boolean not null default false,
  hours numeric,
  time_slot text check (time_slot in ('morning','afternoon')),
  move_date date,
  jobs_on_calendar int,
  tier text check (tier in ('t1','t2','t3','t4','t5')),

  breakdown jsonb not null,
  addons jsonb not null default '[]',

  subtotal numeric not null,
  discount_pct numeric not null default 0,
  final_total numeric not null,
  morning_total numeric,
  afternoon_total numeric,

  monthly_storage_cuft int,
  monthly_storage_amount numeric,

  needs_owner_review boolean not null default false,
  review_note text,

  status text not null default 'draft' check (status in ('draft','sent','booked','lost'))
);

create index if not exists quotes_agent_idx on public.quotes(agent_id);
create index if not exists quotes_created_idx on public.quotes(created_at desc);
create index if not exists quotes_status_idx on public.quotes(status);

-- ============================================================
-- RLS (permissive — anon key has full access; app gates admin via passcode)
-- ============================================================

-- Enable RLS so we can write explicit policies (vs disabling RLS entirely).
alter table public.agents enable row level security;
alter table public.settings enable row level security;
alter table public.rates_local_cuft enable row level security;
alter table public.rates_local_hourly enable row level security;
alter table public.rates_long_distance enable row level security;
alter table public.rates_out_of_state enable row level security;
alter table public.rates_boxes enable row level security;
alter table public.rates_heavy_items enable row level security;
alter table public.rates_misc enable row level security;
alter table public.quotes enable row level security;

-- Permissive policies: anon role can do anything. Security is enforced by
-- the app's passcode gate (/admin/*) and the fact that the deploy URL is
-- not public.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'agents','settings','rates_local_cuft','rates_local_hourly',
      'rates_long_distance','rates_out_of_state','rates_boxes',
      'rates_heavy_items','rates_misc','quotes'
    ])
  loop
    execute format('drop policy if exists "%s_all" on public.%I', t, t);
    execute format('create policy "%s_all" on public.%I for all using (true) with check (true)', t, t);
  end loop;
end $$;
