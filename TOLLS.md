# Toll Calculator — Build Spec

## Context
Seka Moving dispatches box trucks (16/20/26 ft) from Brooklyn, NY. The quote calculator needs ballpark round-trip toll estimates for: Brooklyn dispatch → Customer Origin → Customer Destination → Brooklyn dispatch. Tolls based on a 20ft truck average (2-axle commercial, Tolls By Mail rate). ±$10 accuracy is fine. Agents can manually override.

## Build this in order

1. Create the Supabase tables below
2. Seed them with the data below
3. Build the calculation function
4. Add the fields to the quote form
5. Build the admin panel at `/admin/tolls`

---

## 1. Supabase schema

```sql
CREATE TABLE toll_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE toll_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_zone TEXT REFERENCES toll_zones(id) NOT NULL,
  to_zone TEXT REFERENCES toll_zones(id) NOT NULL,
  round_trip_toll NUMERIC(10,2) NOT NULL,
  crz_applies BOOLEAN DEFAULT FALSE,
  notes TEXT,
  effective_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_zone, to_zone)
);

CREATE TABLE crz_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  effective_date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX idx_toll_routes_lookup ON toll_routes(from_zone, to_zone);
```

## 2. Seed data

```sql
INSERT INTO toll_zones (id, name, description) VALUES
('BK', 'Brooklyn', 'Dispatch origin'),
('QN', 'Queens', 'Queens borough'),
('MN_N', 'Manhattan North', 'Manhattan above 60th St'),
('MN_S', 'Manhattan South', 'Manhattan below 60th St (Congestion Relief Zone)'),
('BX', 'Bronx', 'Bronx borough'),
('SI', 'Staten Island', 'Staten Island'),
('LI', 'Long Island', 'Nassau and Suffolk counties'),
('JC', 'Hudson County NJ', 'Jersey City, Hoboken, Newark, Bayonne'),
('NJ_NE', 'NJ Northeast', 'Bergen, Passaic, eastern Essex'),
('NJ_NW', 'NJ Northwest', 'Sussex, Warren, western Morris, Hunterdon'),
('NJ_C1', 'NJ Central 1', 'Union, Middlesex, Somerset (Edison, New Brunswick, Piscataway)'),
('NJ_C2', 'NJ Central 2', 'Monmouth, northern Ocean (Toms River, Freehold)'),
('NJ_S1', 'NJ South 1', 'Mercer, northern Burlington (Trenton, Princeton)'),
('NJ_S2', 'NJ South 2', 'Camden, Gloucester, southern Burlington (Cherry Hill)'),
('NJ_S3', 'NJ South 3', 'Salem, Cumberland, Atlantic, Cape May');

INSERT INTO toll_routes (from_zone, to_zone, round_trip_toll, crz_applies, notes) VALUES
('BK', 'BK', 0, false, 'Local Brooklyn'),
('QN', 'QN', 0, false, 'Local Queens'),
('MN_N', 'MN_N', 0, false, 'Free bridges'),
('MN_S', 'MN_S', 22, true, 'Free bridges + CRZ'),
('BX', 'BX', 22, false, 'RFK both ways'),
('SI', 'SI', 47, false, 'Verrazzano both ways'),
('LI', 'LI', 0, false, 'No tolls'),
('JC', 'JC', 24, false, 'Holland return only'),
('NJ_NE', 'NJ_NE', 24, false, 'GWB return only'),
('NJ_NW', 'NJ_NW', 24, false, 'GWB return only'),
('NJ_C1', 'NJ_C1', 52, false, 'Goethals + Verrazzano + short NJTP'),
('NJ_C2', 'NJ_C2', 50, false, 'Goethals + Verrazzano + GSP'),
('NJ_S1', 'NJ_S1', 60, false, 'NJTP mid'),
('NJ_S2', 'NJ_S2', 72, false, 'NJTP long'),
('NJ_S3', 'NJ_S3', 85, false, 'Full NJTP + GSP'),
('BK', 'QN', 0, false, 'Local'),
('BK', 'MN_N', 0, false, 'Free bridges'),
('BK', 'MN_S', 22, true, 'Free bridges + CRZ'),
('BK', 'BX', 22, false, 'RFK both ways'),
('BK', 'SI', 47, false, 'Verrazzano both ways'),
('BK', 'LI', 0, false, 'No tolls'),
('BK', 'JC', 24, false, 'Holland return'),
('BK', 'NJ_NE', 24, false, 'GWB return'),
('BK', 'NJ_NW', 24, false, 'GWB return'),
('BK', 'NJ_C1', 52, false, 'Goethals + Verrazzano + NJTP'),
('BK', 'NJ_C2', 50, false, 'Goethals + Verrazzano + GSP'),
('BK', 'NJ_S1', 60, false, 'NJTP mid'),
('BK', 'NJ_S2', 72, false, 'NJTP long'),
('BK', 'NJ_S3', 85, false, 'Full NJTP'),
('MN_S', 'NJ_NE', 46, true, 'GWB return + CRZ'),
('MN_S', 'JC', 46, true, 'Holland return + CRZ'),
('MN_N', 'NJ_NE', 24, false, 'GWB return'),
('MN_N', 'JC', 24, false, 'Holland return'),
('QN', 'NJ_NE', 24, false, 'GWB return'),
('QN', 'JC', 24, false, 'Holland return'),
('LI', 'NJ_NE', 24, false, 'GWB return'),
('LI', 'MN_S', 22, true, 'Free bridge + CRZ'),
('BX', 'NJ_NE', 24, false, 'GWB return'),
('SI', 'NJ_C1', 23, false, 'Verrazzano return only'),
('JC', 'NJ_NE', 24, false, 'GWB return'),
('NJ_NE', 'NJ_C1', 52, false, 'Same as BK to NJ_C1'),
('NJ_NE', 'NJ_S1', 60, false, 'Same as BK to NJ_S1');

INSERT INTO crz_rates (rate_type, amount) VALUES
('peak', 21.60),
('off_peak', 5.40);
```

## 3. Calculation function

Create `/lib/tolls.ts`:

```typescript
export interface TollCalculationInput {
  originZone: string;
  destinationZone: string;
  jobDateTime: Date;
}

export interface TollCalculationResult {
  baseToll: number;
  crzCharge: number;
  total: number;
  breakdown: string;
  notes: string;
}

export async function calculateToll(
  input: TollCalculationInput,
  supabase: any
): Promise<TollCalculationResult> {
  const { originZone, destinationZone, jobDateTime } = input;

  const { data: route } = await supabase
    .from('toll_routes')
    .select('*')
    .or(
      `and(from_zone.eq.${originZone},to_zone.eq.${destinationZone}),` +
      `and(from_zone.eq.${destinationZone},to_zone.eq.${originZone})`
    )
    .single();

  if (!route) {
    return {
      baseToll: 0,
      crzCharge: 0,
      total: 0,
      breakdown: 'No route found — manual override required',
      notes: 'Route not in table. Agent must enter toll manually.',
    };
  }

  let crzCharge = 0;
  if (route.crz_applies) {
    const isPeak = isCRZPeakTime(jobDateTime);
    const { data: crzRate } = await supabase
      .from('crz_rates')
      .select('amount')
      .eq('rate_type', isPeak ? 'peak' : 'off_peak')
      .single();
    crzCharge = crzRate?.amount ?? 0;
  }

  const total = Number(route.round_trip_toll) + crzCharge;

  return {
    baseToll: Number(route.round_trip_toll),
    crzCharge,
    total,
    breakdown: `Base round-trip: $${route.round_trip_toll}${crzCharge > 0 ? ` + CRZ: $${crzCharge}` : ''}`,
    notes: route.notes ?? '',
  };
}

function isCRZPeakTime(date: Date): boolean {
  const hour = date.getHours();
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  if (isWeekend) return hour >= 9 && hour < 21;
  return hour >= 5 && hour < 21;
}
```

## 4. Quote form fields

Add to the quote form:

- Origin Zone dropdown (populated from `toll_zones`)
- Destination Zone dropdown (populated from `toll_zones`)
- Job Date/Time picker
- Calculated Toll (read-only, auto-filled from `calculateToll()`)
- Manual Toll Override (numeric input, optional — overrides calculated value if filled)
- Display `breakdown` and `notes` text below the toll field

Final toll logic: `final_toll = manual_override ?? calculated_toll`

Store both values on the quote record for audit.

## 5. Admin panel at `/admin/tolls`

Single page with:

- Zones table — view/edit zone names and descriptions
- Routes table — view/edit `round_trip_toll`, `crz_applies`, `notes`
- CRZ rates — edit peak / off-peak amounts
- Show `updated_at` per row

Restrict to admin role only.

## Notes

- Use the framework already in this project (don't introduce new ones)
- Use the existing auth pattern to protect `/admin/tolls`
- Don't build multi-stop logic, E-ZPass tiers, or truck-class variants in v1 — manual override handles edge cases
- When tolls change, admin updates values in the panel — no code changes
