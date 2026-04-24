import { useRef, useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/shared/NumberInput';
import { IOSSegment } from '@/components/shared/IOSSegment';
import { AddressInput } from '@/components/quote-builder/AddressInput';
import { useQuoteDraft } from '@/stores/useQuoteDraft';
import { getRoundTripMiles } from '@/lib/apis/mileage';
import { detectMoveType } from '@/lib/apis/zipToState';
import { calculateTollFromZones } from '@/lib/tolls';
import { getTollZones, getTollRoutes, getCrzRates } from '@/lib/supabase/queries/tolls';
import { formatMoney } from '@/lib/utils';
import type { Settings, TollZone, TollRoute, CrzRate } from '@/lib/supabase/types';

const MOVE_TYPES = [
  { value: 'local', label: 'Local', hint: 'NY/NJ metro' },
  { value: 'long_distance', label: 'Long Distance', hint: 'NY/NJ → other state' },
  { value: 'out_of_state', label: 'Out-of-State', hint: '3rd party carrier' },
] as const;

function ZoneLabel({ zoneId, zones }: { zoneId: string; zones: TollZone[] }) {
  if (!zoneId) return null;
  const zone = zones.find((z) => z.id === zoneId);
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-foreground/10 text-foreground px-2 py-0.5 rounded-full font-medium">
      {zone?.name ?? zoneId}
    </span>
  );
}

export function Step1MoveType({ settings, onNext }: { settings: Settings; onNext: () => void }) {
  const { draft, update } = useQuoteDraft();
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [zones, setZones] = useState<TollZone[]>([]);
  const [routes, setRoutes] = useState<TollRoute[]>([]);
  const [crzRates, setCrzRates] = useState<CrzRate[]>([]);

  useEffect(() => {
    Promise.all([getTollZones(), getTollRoutes(), getCrzRates()]).then(([z, r, c]) => {
      setZones(z);
      setRoutes(r);
      setCrzRates(c);
    });
  }, []);

  // Recalculate toll whenever zones, stops, or date change
  useEffect(() => {
    if (!routes.length || !crzRates.length) return;
    const { draft: d } = useQuoteDraft.getState();
    const allZones = [
      d.origin_zone,
      ...d.extra_stops.map((s) => s.zone),
      d.destination_zone,
    ];
    const result = calculateTollFromZones(allZones, d.move_date ?? null, routes, crzRates);
    useQuoteDraft.getState().update({
      calculated_toll: result.total,
      toll_breakdown: result.breakdown,
      toll_notes: result.notes,
      tolls: result.total,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.origin_zone, draft.destination_zone, draft.extra_stops, draft.move_date, routes, crzRates]);

  function scheduleMileageFetch() {
    const { draft: d } = useQuoteDraft.getState();
    if (!d.origin_address || !d.destination_address) return;
    if (fetchRef.current) clearTimeout(fetchRef.current);
    fetchRef.current = setTimeout(async () => {
      useQuoteDraft.getState().update({ auto_mileage_loading: true });
      try {
        const extraStops = d.extra_stops.map((s) => s.address).filter(Boolean);
        const res = await getRoundTripMiles({
          origin: d.origin_address,
          destination: d.destination_address,
          officeAddress: settings.office_address,
          extraStops,
        });
        useQuoteDraft.getState().update({ round_trip_miles: res.roundTripMiles });
      } catch { /* leave existing */ }
      finally { useQuoteDraft.getState().update({ auto_mileage_loading: false }); }
    }, 600);

    const snap = useQuoteDraft.getState().draft;
    if (snap.origin_zip?.length === 5 && snap.destination_zip?.length === 5) {
      const detected = detectMoveType(snap.origin_zip, snap.destination_zip);
      if (detected) useQuoteDraft.getState().update({ move_type: detected });
    }
  }

  function handleOriginSelect(address: string, zip: string, zone: string) {
    update({ origin_address: address, origin_zip: zip, origin_zone: zone });
    scheduleMileageFetch();
  }

  function handleDestinationSelect(address: string, zip: string, zone: string) {
    update({ destination_address: address, destination_zip: zip, destination_zone: zone });
    scheduleMileageFetch();
  }

  function addStop() {
    update({ extra_stops: [...draft.extra_stops, { address: '', zip: '', zone: '' }] });
  }

  function removeStop(i: number) {
    update({ extra_stops: draft.extra_stops.filter((_, idx) => idx !== i) });
    scheduleMileageFetch();
  }

  function handleStopSelect(i: number, address: string, zip: string, zone: string) {
    const updated = draft.extra_stops.map((s, idx) =>
      idx === i ? { address, zip, zone } : s,
    );
    update({ extra_stops: updated });
    scheduleMileageFetch();
  }

  const canContinue = draft.origin_address && draft.destination_address;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Move Type</Label>
        <IOSSegment
          options={MOVE_TYPES}
          value={draft.move_type ?? 'local'}
          onChange={(v) => update({ move_type: v })}
        />
      </div>

      <div className="space-y-3">
        {/* Origin */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origin</Label>
            <ZoneLabel zoneId={draft.origin_zone} zones={zones} />
          </div>
          <AddressInput
            value={draft.origin_address}
            onChange={handleOriginSelect}
            placeholder="Start typing origin address…"
          />
        </div>

        {/* Extra stops */}
        {draft.extra_stops.map((stop, i) => (
          <div key={i} className="rounded-2xl bg-secondary/50 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Stop {i + 1}
              </Label>
              <div className="flex items-center gap-2">
                <ZoneLabel zoneId={stop.zone} zones={zones} />
                <button type="button" onClick={() => removeStop(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <AddressInput
              value={stop.address}
              onChange={(addr, zip, zone) => handleStopSelect(i, addr, zip, zone)}
              placeholder="Stop address…"
            />
          </div>
        ))}

        <button type="button" onClick={addStop}
          className="flex items-center gap-2 text-sm text-foreground font-medium hover:opacity-60 transition-opacity py-1">
          <Plus className="h-4 w-4" />
          Add stop
        </button>

        {/* Destination */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination</Label>
            <ZoneLabel zoneId={draft.destination_zone} zones={zones} />
          </div>
          <AddressInput
            value={draft.destination_address}
            onChange={handleDestinationSelect}
            placeholder="Start typing destination address…"
          />
        </div>
      </div>

      {/* Move date */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Move Date</Label>
        <Input
          type="date"
          value={draft.move_date ?? ''}
          onChange={(e) => update({ move_date: e.target.value || null })}
          className="w-48"
        />
      </div>

      {/* Travel summary */}
      <div className="rounded-2xl bg-secondary/60 p-4 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          {draft.auto_mileage_loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <span className="font-semibold">Mileage</span>
          <span className="tabular-nums">{draft.round_trip_miles ?? 0} mi round trip</span>
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">Tolls</span>
            <span className="tabular-nums font-semibold text-accent">
              {formatMoney(draft.tolls ?? 0)}
            </span>
            {draft.toll_breakdown && (
              <span className="text-xs text-muted-foreground">({draft.toll_breakdown})</span>
            )}
          </div>
          {draft.toll_notes && (
            <div className="text-xs text-amber-600 dark:text-amber-400">{draft.toll_notes}</div>
          )}
          {!draft.origin_zone && !draft.destination_zone && (
            <div className="text-xs text-muted-foreground">Tolls auto-fill once addresses are selected</div>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1 border-t border-border/40">
          <span className="font-medium">Manual override:</span>
          <div className="flex items-center gap-1.5">
            <span>Miles</span>
            <NumberInput value={draft.round_trip_miles ?? 0} onChange={(n) => update({ round_trip_miles: n })}
              min={0} className="w-24 h-7 text-sm px-2" />
          </div>
          <div className="flex items-center gap-1.5">
            <span>Tolls ($)</span>
            <NumberInput value={draft.tolls ?? 0} onChange={(n) => update({ tolls: n })}
              min={0} step={0.5} className="w-24 h-7 text-sm px-2" />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button type="button" onClick={onNext} disabled={!canContinue}
          className="px-6 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-40 transition-opacity hover:opacity-90 active:scale-[0.98]">
          Continue
        </button>
      </div>
    </div>
  );
}
