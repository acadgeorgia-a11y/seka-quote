-- Seka Quote Calculator — Supabase Schema
-- Run in Supabase SQL editor. Safe to re-run (uses IF NOT EXISTS).

-- ============================================================
-- AGENTS (extends auth.users)
-- ============================================================
create table if not exists public.agents (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null default 'agent' check (role in ('agent','owner','dispatch')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SETTINGS (singleton — office address, API keys, feature flags)
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

-- Local CuFT flat rates by tier and time slot
create table if not exists public.rates_local_cuft (
  tier text primary key check (tier in ('t1','t2','t3','t4','t5')),
  morning numeric not null,
  afternoon numeric not null
);

-- Local hourly rates by crew size and tier
create table if not exists public.rates_local_hourly (
  id serial primary key,
  crew_size int not null check (crew_size in (2,3)),
  tier text not null check (tier in ('t1','t2','t3','t4','t5')),
  rate numeric not null,
  unique (crew_size, tier)
);

-- Long-distance rates per destination state
create table if not exists public.rates_long_distance (
  state_code text primary key,
  state_name text not null,
  rate_per_cuft numeric not null,
  delivery_window text not null,
  max_discount_pct numeric not null default 5
);

-- Out-of-state carrier rate (singleton)
create table if not exists public.rates_out_of_state (
  id int primary key default 1,
  rate_per_cuft numeric not null default 7.50,
  markup_pct numeric not null default 10,
  max_discount_pct numeric not null default 5,
  constraint ros_singleton check (id = 1)
);

-- Add-on rates
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
-- Expected keys: stairs_multiplier (0.15), soft_crate (150),
-- overnight_offpeak (250), overnight_peak (500), storage_per_cuft (0.60),
-- min_cuft (300)

-- ============================================================
-- QUOTES
-- ============================================================
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_code text unique not null,           -- e.g. SQ-2026-0423-A1B2
  agent_id uuid not null references public.agents(id),
  created_at timestamptz not null default now(),

  -- Customer
  customer_name text,
  customer_email text,
  customer_phone text,

  -- Move type
  move_type text not null check (move_type in ('local','long_distance','out_of_state')),
  pricing_method text check (pricing_method in ('cuft','hourly')),
  is_hra boolean not null default false,

  -- Addresses
  origin_address text not null,
  origin_zip text not null,
  destination_address text not null,
  destination_zip text not null,
  round_trip_miles numeric,
  tolls_amount numeric,

  -- Job details
  total_cuft int,
  crew_size int,
  fourth_man boolean not null default false,
  hours numeric,                              -- for hourly method
  time_slot text check (time_slot in ('morning','afternoon')),
  move_date date,
  jobs_on_calendar int,                       -- agent-entered
  tier text check (tier in ('t1','t2','t3','t4','t5')),

  -- Full breakdown stored as JSON for audit
  breakdown jsonb not null,
  addons jsonb not null default '[]',

  -- Totals
  subtotal numeric not null,
  discount_pct numeric not null default 0,
  final_total numeric not null,
  morning_total numeric,                      -- set when both shown
  afternoon_total numeric,

  -- Storage (separate line)
  monthly_storage_cuft int,
  monthly_storage_amount numeric,

  -- Flags
  needs_owner_review boolean not null default false,
  review_note text,

  status text not null default 'draft' check (status in ('draft','sent','booked','lost'))
);

create index if not exists quotes_agent_idx on public.quotes(agent_id);
create index if not exists quotes_created_idx on public.quotes(created_at desc);
create index if not exists quotes_status_idx on public.quotes(status);

-- ============================================================
-- RLS
-- ============================================================
alter table public.agents enable row level security;
alter table public.quotes enable row level security;
alter table public.settings enable row level security;

-- Agents: can read their own row; owners read all
create policy "agents_self_read" on public.agents
  for select using (auth.uid() = id or exists (
    select 1 from public.agents a where a.id = auth.uid() and a.role = 'owner'
  ));

-- Quotes: agents see their own; owners see all
create policy "quotes_own_read" on public.quotes
  for select using (agent_id = auth.uid() or exists (
    select 1 from public.agents a where a.id = auth.uid() and a.role = 'owner'
  ));

create policy "quotes_insert_self" on public.quotes
  for insert with check (agent_id = auth.uid());

create policy "quotes_update_own" on public.quotes
  for update using (agent_id = auth.uid() or exists (
    select 1 from public.agents a where a.id = auth.uid() and a.role = 'owner'
  ));

-- Settings and rates: read by any agent; write by owner only
create policy "settings_read_all" on public.settings for select using (true);
create policy "settings_write_owner" on public.settings for all using (
  exists (select 1 from public.agents a where a.id = auth.uid() and a.role = 'owner')
);
