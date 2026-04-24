-- ============================================================
-- TOLL CALCULATOR — Migration 001
-- Run this in the Supabase SQL editor (dashboard → SQL editor)
-- ============================================================

-- Toll zones
CREATE TABLE IF NOT EXISTS public.toll_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Toll routes (bidirectional lookup by zone pair)
CREATE TABLE IF NOT EXISTS public.toll_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_zone TEXT REFERENCES public.toll_zones(id) NOT NULL,
  to_zone TEXT REFERENCES public.toll_zones(id) NOT NULL,
  round_trip_toll NUMERIC(10,2) NOT NULL,
  crz_applies BOOLEAN DEFAULT FALSE,
  notes TEXT,
  effective_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_zone, to_zone)
);

-- CRZ (Congestion Relief Zone) peak / off-peak rates
CREATE TABLE IF NOT EXISTS public.crz_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  effective_date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_toll_routes_lookup ON public.toll_routes(from_zone, to_zone);

-- ============================================================
-- RLS — same permissive pattern as the rest of this project
-- ============================================================
ALTER TABLE public.toll_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toll_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crz_rates ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT UNNEST(ARRAY['toll_zones','toll_routes','crz_rates'])
  LOOP
    EXECUTE FORMAT('DROP POLICY IF EXISTS "%s_all" ON public.%I', t, t);
    EXECUTE FORMAT('CREATE POLICY "%s_all" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ============================================================
-- QUOTES TABLE — add toll + extra stops columns
-- ============================================================
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS origin_zone TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS destination_zone TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS extra_stops JSONB DEFAULT '[]';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS calculated_toll NUMERIC(10,2);

-- ============================================================
-- SEED — zones
-- ============================================================
INSERT INTO public.toll_zones (id, name, description) VALUES
  ('BK',    'Brooklyn',          'Dispatch origin'),
  ('QN',    'Queens',            'Queens borough'),
  ('MN_N',  'Manhattan North',   'Manhattan above 60th St'),
  ('MN_S',  'Manhattan South',   'Manhattan below 60th St (Congestion Relief Zone)'),
  ('BX',    'Bronx',             'Bronx borough'),
  ('SI',    'Staten Island',     'Staten Island'),
  ('LI',    'Long Island',       'Nassau and Suffolk counties'),
  ('JC',    'Hudson County NJ',  'Jersey City, Hoboken, Newark, Bayonne'),
  ('NJ_NE', 'NJ Northeast',      'Bergen, Passaic, eastern Essex'),
  ('NJ_NW', 'NJ Northwest',      'Sussex, Warren, western Morris, Hunterdon'),
  ('NJ_C1', 'NJ Central 1',      'Union, Middlesex, Somerset (Edison, New Brunswick, Piscataway)'),
  ('NJ_C2', 'NJ Central 2',      'Monmouth, northern Ocean (Toms River, Freehold)'),
  ('NJ_S1', 'NJ South 1',        'Mercer, northern Burlington (Trenton, Princeton)'),
  ('NJ_S2', 'NJ South 2',        'Camden, Gloucester, southern Burlington (Cherry Hill)'),
  ('NJ_S3', 'NJ South 3',        'Salem, Cumberland, Atlantic, Cape May')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED — routes
-- ============================================================
INSERT INTO public.toll_routes (from_zone, to_zone, round_trip_toll, crz_applies, notes) VALUES
  ('BK',    'BK',    0,  false, 'Local Brooklyn'),
  ('QN',    'QN',    0,  false, 'Local Queens'),
  ('MN_N',  'MN_N',  0,  false, 'Free bridges'),
  ('MN_S',  'MN_S',  22, true,  'Free bridges + CRZ'),
  ('BX',    'BX',    22, false, 'RFK both ways'),
  ('SI',    'SI',    47, false, 'Verrazzano both ways'),
  ('LI',    'LI',    0,  false, 'No tolls'),
  ('JC',    'JC',    24, false, 'Holland return only'),
  ('NJ_NE', 'NJ_NE', 24, false, 'GWB return only'),
  ('NJ_NW', 'NJ_NW', 24, false, 'GWB return only'),
  ('NJ_C1', 'NJ_C1', 52, false, 'Goethals + Verrazzano + short NJTP'),
  ('NJ_C2', 'NJ_C2', 50, false, 'Goethals + Verrazzano + GSP'),
  ('NJ_S1', 'NJ_S1', 60, false, 'NJTP mid'),
  ('NJ_S2', 'NJ_S2', 72, false, 'NJTP long'),
  ('NJ_S3', 'NJ_S3', 85, false, 'Full NJTP + GSP'),
  ('BK',    'QN',    0,  false, 'Local'),
  ('BK',    'MN_N',  0,  false, 'Free bridges'),
  ('BK',    'MN_S',  22, true,  'Free bridges + CRZ'),
  ('BK',    'BX',    22, false, 'RFK both ways'),
  ('BK',    'SI',    47, false, 'Verrazzano both ways'),
  ('BK',    'LI',    0,  false, 'No tolls'),
  ('BK',    'JC',    24, false, 'Holland return'),
  ('BK',    'NJ_NE', 24, false, 'GWB return'),
  ('BK',    'NJ_NW', 24, false, 'GWB return'),
  ('BK',    'NJ_C1', 52, false, 'Goethals + Verrazzano + NJTP'),
  ('BK',    'NJ_C2', 50, false, 'Goethals + Verrazzano + GSP'),
  ('BK',    'NJ_S1', 60, false, 'NJTP mid'),
  ('BK',    'NJ_S2', 72, false, 'NJTP long'),
  ('BK',    'NJ_S3', 85, false, 'Full NJTP'),
  ('MN_S',  'NJ_NE', 46, true,  'GWB return + CRZ'),
  ('MN_S',  'JC',    46, true,  'Holland return + CRZ'),
  ('MN_N',  'NJ_NE', 24, false, 'GWB return'),
  ('MN_N',  'JC',    24, false, 'Holland return'),
  ('QN',    'NJ_NE', 24, false, 'GWB return'),
  ('QN',    'JC',    24, false, 'Holland return'),
  ('LI',    'NJ_NE', 24, false, 'GWB return'),
  ('LI',    'MN_S',  22, true,  'Free bridge + CRZ'),
  ('BX',    'NJ_NE', 24, false, 'GWB return'),
  ('SI',    'NJ_C1', 23, false, 'Verrazzano return only'),
  ('JC',    'NJ_NE', 24, false, 'GWB return'),
  ('NJ_NE', 'NJ_C1', 52, false, 'Same as BK to NJ_C1'),
  ('NJ_NE', 'NJ_S1', 60, false, 'Same as BK to NJ_S1')
ON CONFLICT (from_zone, to_zone) DO NOTHING;

-- ============================================================
-- SEED — CRZ rates
-- ============================================================
INSERT INTO public.crz_rates (rate_type, amount) VALUES
  ('peak',     21.60),
  ('off_peak',  5.40)
ON CONFLICT DO NOTHING;
