create table if not exists public.leads (
  id                   uuid        default gen_random_uuid() primary key,
  quote_number         text        unique not null,
  branch_name          text,
  status_raw           text,
  likelihood           text        check (likelihood in ('booked', 'lost', 'pending')),
  service_type         text,
  volume_weight        text,
  received_at          timestamptz,
  service_date         date,
  quote_sent_at        timestamptz,
  sales_person         text,
  estimator            text,
  move_coordinator     text,
  time_to_contact      text,
  last_communication_at timestamptz,
  referral_source      text,
  estimated_revenue    numeric,
  synced_at            timestamptz default now(),
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists leads_received_at_idx     on public.leads (received_at desc);
create index if not exists leads_sales_person_idx    on public.leads (sales_person);
create index if not exists leads_likelihood_idx      on public.leads (likelihood);
create index if not exists leads_referral_source_idx on public.leads (referral_source);

alter table public.leads enable row level security;
create policy "leads_all" on public.leads for all using (true) with check (true);

-- Sync log
create table if not exists public.lead_sync_logs (
  id              uuid        default gen_random_uuid() primary key,
  synced_at       timestamptz default now(),
  total_processed integer     default 0,
  email_subject   text,
  error           text
);

alter table public.lead_sync_logs enable row level security;
create policy "lead_sync_logs_all" on public.lead_sync_logs for all using (true) with check (true);
