-- Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  agent_id uuid references public.agents(id),
  customer_name text not null,
  customer_email text,
  job_number text,
  line_items jsonb not null default '[]',
  subtotal numeric not null default 0,
  tax_pct numeric not null default 0,
  total numeric not null default 0,
  notes text,
  status text not null default 'draft' check (status in ('draft','sent','paid')),
  created_at timestamptz not null default now()
);

create index if not exists invoices_created_idx on public.invoices(created_at desc);
create index if not exists invoices_status_idx on public.invoices(status);

-- Contract templates
create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null,
  signature_fields jsonb not null default '[]',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Contracts
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.contract_templates(id),
  token text unique not null default encode(gen_random_bytes(24), 'hex'),
  agent_id uuid references public.agents(id),
  customer_name text not null,
  customer_email text not null,
  job_number text,
  notes text,
  sender_signature text,
  sender_signed_at timestamptz,
  client_signature text,
  client_signed_at timestamptz,
  status text not null default 'draft' check (status in ('draft','sender_signed','sent','completed')),
  signed_pdf_path text,
  created_at timestamptz not null default now()
);

create index if not exists contracts_token_idx on public.contracts(token);
create index if not exists contracts_created_idx on public.contracts(created_at desc);

-- RLS
alter table public.invoices enable row level security;
alter table public.contract_templates enable row level security;
alter table public.contracts enable row level security;

drop policy if exists "invoices_all" on public.invoices;
create policy "invoices_all" on public.invoices for all using (true) with check (true);

drop policy if exists "contract_templates_all" on public.contract_templates;
create policy "contract_templates_all" on public.contract_templates for all using (true) with check (true);

drop policy if exists "contracts_all" on public.contracts;
create policy "contracts_all" on public.contracts for all using (true) with check (true);
