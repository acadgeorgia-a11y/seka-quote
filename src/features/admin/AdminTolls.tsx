import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/shared/NumberInput';
import { getTollZones, getTollRoutes, getCrzRates, updateTollRoute, updateCrzRate } from '@/lib/supabase/queries/tolls';
import type { TollZone, TollRoute, CrzRate } from '@/lib/supabase/types';

function useToast() {
  const [msg, setMsg] = useState('');
  function toast(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000); }
  return { msg, toast };
}

export function AdminTolls() {
  const [zones, setZones] = useState<TollZone[]>([]);
  const [routes, setRoutes] = useState<TollRoute[]>([]);
  const [crzRates, setCrzRates] = useState<CrzRate[]>([]);
  const [loading, setLoading] = useState(true);
  const { msg, toast } = useToast();

  useEffect(() => {
    Promise.all([getTollZones(), getTollRoutes(), getCrzRates()])
      .then(([z, r, c]) => { setZones(z); setRoutes(r); setCrzRates(c); })
      .finally(() => setLoading(false));
  }, []);

  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? id;

  async function saveRoute(route: TollRoute, toll: number, crz: boolean, notes: string) {
    try {
      await updateTollRoute(route.id, { round_trip_toll: toll, crz_applies: crz, notes: notes || null });
      setRoutes((prev) => prev.map((r) => r.id === route.id ? { ...r, round_trip_toll: toll, crz_applies: crz, notes: notes || null } : r));
      toast('Saved');
    } catch { toast('Save failed'); }
  }

  async function saveCrz(rate: CrzRate, amount: number) {
    try {
      await updateCrzRate(rate.id, amount);
      setCrzRates((prev) => prev.map((r) => r.id === rate.id ? { ...r, amount } : r));
      toast('Saved');
    } catch { toast('Save failed'); }
  }

  if (loading) return <div className="text-sm text-muted-foreground py-8">Loading toll data…</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-1">Toll Calculator</h2>
        <p className="text-sm text-muted-foreground">Edit round-trip toll amounts by route. Changes take effect immediately on new quotes.</p>
      </div>

      {msg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-xl shadow-md z-50">
          {msg}
        </div>
      )}

      {/* CRZ Rates */}
      <section className="rounded-2xl bg-card shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Congestion Relief Zone (CRZ)</h3>
        <p className="text-xs text-muted-foreground">Added on top of base toll for routes into/through lower Manhattan (below 60th St).</p>
        <div className="grid grid-cols-2 gap-4 max-w-xs">
          {crzRates.map((rate) => (
            <CrzRateRow key={rate.id} rate={rate} onSave={(amt) => saveCrz(rate, amt)} />
          ))}
        </div>
      </section>

      {/* Route table */}
      <section className="rounded-2xl bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/40 bg-secondary/30">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Routes ({routes.length})
          </h3>
        </div>

        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[1fr_1fr_100px_60px_1fr_80px] gap-3 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/30 bg-secondary/20">
          <div>From</div>
          <div>To</div>
          <div>Round Trip $</div>
          <div>CRZ</div>
          <div>Notes</div>
          <div></div>
        </div>

        {routes.map((route) => (
          <RouteRow
            key={route.id}
            route={route}
            fromName={zoneName(route.from_zone)}
            toName={zoneName(route.to_zone)}
            onSave={saveRoute}
          />
        ))}
      </section>

      {/* Zones reference */}
      <section className="rounded-2xl bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/40 bg-secondary/30">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Zone Reference</h3>
        </div>
        <div className="divide-y divide-border/30">
          {zones.map((z) => (
            <div key={z.id} className="flex items-center gap-4 px-5 py-3 text-sm">
              <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded-md w-16 text-center shrink-0">{z.id}</span>
              <span className="font-medium">{z.name}</span>
              {z.description && <span className="text-muted-foreground text-xs">{z.description}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CrzRateRow({ rate, onSave }: { rate: CrzRate; onSave: (amt: number) => void }) {
  const [val, setVal] = useState(rate.amount);
  const dirty = val !== rate.amount;
  return (
    <div className="space-y-1">
      <Label className="text-xs capitalize text-muted-foreground">{rate.rate_type.replace('_', ' ')}</Label>
      <div className="flex items-center gap-2">
        <NumberInput value={val} onChange={setVal} min={0} step={0.1} className="h-9 w-24" />
        {dirty && (
          <button type="button" onClick={() => onSave(val)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-accent text-white font-medium">
            Save
          </button>
        )}
      </div>
    </div>
  );
}

function RouteRow({
  route, fromName, toName, onSave,
}: {
  route: TollRoute;
  fromName: string;
  toName: string;
  onSave: (r: TollRoute, toll: number, crz: boolean, notes: string) => void;
}) {
  const [toll, setToll] = useState(route.round_trip_toll);
  const [crz, setCrz] = useState(route.crz_applies);
  const [notes, setNotes] = useState(route.notes ?? '');
  const dirty = toll !== route.round_trip_toll || crz !== route.crz_applies || notes !== (route.notes ?? '');

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_100px_60px_1fr_80px] gap-2 md:gap-3 items-center px-5 py-3 border-b border-border/30 last:border-0">
      <div className="font-medium text-sm md:font-normal">{fromName}</div>
      <div className="text-sm text-muted-foreground md:text-foreground">{toName}</div>
      <NumberInput value={toll} onChange={setToll} min={0} step={1} className="h-8 w-24" />
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={crz}
          onChange={(e) => setCrz(e.target.checked)}
          className="accent-accent w-4 h-4"
        />
        <span className="text-xs text-muted-foreground">CRZ</span>
      </label>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes…"
        className="h-8 rounded-lg border border-input bg-background px-2 text-sm w-full"
      />
      <button
        type="button"
        onClick={() => onSave(route, toll, crz, notes)}
        disabled={!dirty}
        className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold disabled:opacity-30 transition-opacity"
      >
        Save
      </button>
    </div>
  );
}
