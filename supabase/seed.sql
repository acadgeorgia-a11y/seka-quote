-- Seka Quote Calculator — Seed data
-- Values transcribed from /docs/pricing-logic-*.md.
-- Run after schema.sql. Safe to re-run (uses upsert).

-- ============================================================
-- SETTINGS
-- ============================================================
insert into public.settings (id, office_address, fourth_man_rate,
  default_unpacking_rate, discounted_unpacking_rate, box_delivery_minimum)
values (1, 'Seka HQ — update in /admin/settings', 40, 15, 10, 75)
on conflict (id) do nothing;

-- ============================================================
-- LOCAL CUFT rates (per /docs/pricing-logic-local.md)
-- Morning rates: t1=1.25, t2=1.35, t3=1.50, t4=1.75, t5=2.00
-- Afternoon flat: 1.00 for all tiers (≤ 400 CuFT only; enforced in code)
-- ============================================================
insert into public.rates_local_cuft (tier, morning, afternoon) values
  ('t1', 1.25, 1.00),
  ('t2', 1.35, 1.00),
  ('t3', 1.50, 1.00),
  ('t4', 1.75, 1.00),
  ('t5', 2.00, 1.00)
on conflict (tier) do update set
  morning = excluded.morning,
  afternoon = excluded.afternoon;

-- ============================================================
-- LOCAL HOURLY rates
-- 2-men: t1=139, t2=149, t3=159, t4=169, t5=179
-- 3-men: t1=159, t2=169, t3=179, t4=199, t5=220
-- ============================================================
insert into public.rates_local_hourly (crew_size, tier, rate) values
  (2, 't1', 139), (2, 't2', 149), (2, 't3', 159), (2, 't4', 169), (2, 't5', 179),
  (3, 't1', 159), (3, 't2', 169), (3, 't3', 179), (3, 't4', 199), (3, 't5', 220)
on conflict (crew_size, tier) do update set rate = excluded.rate;

-- ============================================================
-- LONG DISTANCE rates (NY/NJ origin → destination state)
-- Alabama resolved to $6.50 (the higher of the two doc entries).
-- ============================================================
insert into public.rates_long_distance (state_code, state_name, rate_per_cuft, delivery_window, max_discount_pct) values
  -- $6.00 / 1–9 biz days
  ('OH', 'Ohio',           6.00, '1–9 business days', 5),
  ('IN', 'Indiana',        6.00, '1–9 business days', 5),
  ('KY', 'Kentucky',       6.00, '1–9 business days', 5),
  ('WV', 'West Virginia',  6.00, '1–9 business days', 5),
  ('IL', 'Illinois',       6.00, '1–9 business days', 5),
  ('WI', 'Wisconsin',      6.00, '1–9 business days', 5),
  ('GA', 'Georgia',        6.00, '1–9 business days', 5),
  ('VA', 'Virginia',       6.00, '1–9 business days', 5),
  ('NC', 'North Carolina', 6.00, '1–9 business days', 5),
  ('SC', 'South Carolina', 6.00, '1–9 business days', 5),
  ('FL', 'Florida',        6.00, '1–9 business days', 5),
  -- $6.50 / 1–19 biz days
  ('UT', 'Utah',           6.50, '1–19 business days', 5),
  ('NV', 'Nevada',         6.50, '1–19 business days', 5),
  ('NM', 'New Mexico',     6.50, '1–19 business days', 5),
  ('AZ', 'Arizona',        6.50, '1–19 business days', 5),
  ('CA', 'California',     6.50, '1–19 business days', 5),
  ('TX', 'Texas',          6.50, '1–19 business days', 5),
  ('OK', 'Oklahoma',       6.50, '1–19 business days', 5),
  ('MN', 'Minnesota',      6.50, '1–19 business days', 5),
  -- $6.50 / 1–14 biz days
  ('AL', 'Alabama',        6.50, '1–14 business days', 5),
  ('TN', 'Tennessee',      6.50, '1–14 business days', 5),
  ('MO', 'Missouri',       6.50, '1–14 business days', 5),
  ('IA', 'Iowa',           6.50, '1–14 business days', 5),
  ('LA', 'Louisiana',      6.50, '1–14 business days', 5),
  -- $7.00 / 1–19 biz days, NW zone (10% discount cap)
  ('SD', 'South Dakota',   7.00, '1–19 business days', 10),
  ('ND', 'North Dakota',   7.00, '1–19 business days', 10),
  ('MT', 'Montana',        7.00, '1–19 business days', 10),
  ('ID', 'Idaho',          7.00, '1–19 business days', 10),
  ('WA', 'Washington',     7.00, '1–19 business days', 10),
  ('OR', 'Oregon',         7.00, '1–19 business days', 10)
on conflict (state_code) do update set
  state_name = excluded.state_name,
  rate_per_cuft = excluded.rate_per_cuft,
  delivery_window = excluded.delivery_window,
  max_discount_pct = excluded.max_discount_pct;

-- ============================================================
-- OUT OF STATE rate (singleton)
-- ============================================================
insert into public.rates_out_of_state (id, rate_per_cuft, markup_pct, max_discount_pct)
values (1, 7.50, 10, 5)
on conflict (id) do update set
  rate_per_cuft = excluded.rate_per_cuft,
  markup_pct = excluded.markup_pct,
  max_discount_pct = excluded.max_discount_pct;

-- ============================================================
-- BOXES — packing labor + sale price
-- ============================================================
insert into public.rates_boxes (box_type, packing_cost, sale_price) values
  ('small',    15,  5),
  ('medium',   15,  5),
  ('large',    15,  5),
  ('china',    15, 10),
  ('wardrobe', 25, 20),
  ('tv',       50, 50)
on conflict (box_type) do update set
  packing_cost = excluded.packing_cost,
  sale_price = excluded.sale_price;

-- ============================================================
-- HEAVY ITEMS
-- ============================================================
insert into public.rates_heavy_items (item_name, charge, is_custom, requires_photo, notes) values
  ('Heavy Large Safe',                 null, true,  true,  'Varies — enter custom amount, attach photo.'),
  ('Grandfather Clock (small)',        150,  false, false, null),
  ('Grandfather Clock (large)',        250,  false, false, null),
  ('Washer / Dryer',                   150,  false, false, null),
  ('Large Refrigerator',               150,  false, false, null),
  ('Double Door Refrigerator',         250,  true,  true,  '$250+ — photo required.'),
  ('Bunk Bed',                         150,  false, false, null),
  ('Platform Bed',                     150,  false, false, null),
  ('Large Entertainment Center',       150,  false, false, null),
  ('Large China Cabinet',              150,  false, false, null),
  ('Motorcycle',                       null, true,  true,  '$250–$500 — photo + model required.'),
  ('Lawn Mower',                       150,  false, false, null),
  ('Wardrobe',                         150,  false, false, null),
  ('Baby / Grand Piano',               500,  false, false, null),
  ('Upright Piano',                    250,  false, false, null),
  ('Pool Table',                       1000, false, false, '$500 move + $500 reassembly.')
on conflict (item_name) do update set
  charge = excluded.charge,
  is_custom = excluded.is_custom,
  requires_photo = excluded.requires_photo,
  notes = excluded.notes;

-- ============================================================
-- MISC rates
-- ============================================================
insert into public.rates_misc (key, value, notes) values
  ('stairs_multiplier',  0.15, '$ per flight per CuFT'),
  ('soft_crate',         150,  'Per crate'),
  ('overnight_offpeak',  250,  'Overnight storage, standard'),
  ('overnight_peak',     500,  'Overnight when end-of-month → next-month-1st'),
  ('storage_per_cuft',   0.60, 'Monthly long-term storage per CuFT'),
  ('min_cuft',           300,  'Minimum job size to quote')
on conflict (key) do update set
  value = excluded.value,
  notes = excluded.notes;

-- ============================================================
-- SEED AGENTS (only if table is empty)
-- ============================================================
insert into public.agents (full_name, email, role)
select 'Ashley', 'ashley@seka.example', 'agent'
where not exists (select 1 from public.agents);

insert into public.agents (full_name, email, role)
select 'Sammy', 'sammy@seka.example', 'agent'
where not exists (select 1 from public.agents where email = 'sammy@seka.example');

insert into public.agents (full_name, email, role)
select 'Mason', 'mason@seka.example', 'agent'
where not exists (select 1 from public.agents where email = 'mason@seka.example');

insert into public.agents (full_name, email, role)
select 'Alex (Owner)', 'alex@seka.example', 'owner'
where not exists (select 1 from public.agents where email = 'alex@seka.example');
