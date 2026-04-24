import { useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/shared/NumberInput';
import { AddressInput } from '@/components/quote-builder/AddressInput';
import { useQuoteDraft } from '@/stores/useQuoteDraft';
import { getRoundTripMiles } from '@/lib/apis/mileage';
import { detectMoveType } from '@/lib/apis/zipToState';
import { formatMoney } from '@/lib/utils';
import type { Settings } from '@/lib/supabase/types';

const MOVE_TYPES = [
  { value: 'local', label: 'Local', hint: 'NY/NJ metro area' },
  { value: 'long_distance', label: 'Long Distance', hint: 'NY/NJ origin → another state' },
  { value: 'out_of_state', label: 'Out-of-State', hint: '3rd party carrier' },
] as const;

export function Step1MoveType({ settings, onNext }: { settings: Settings; onNext: () => void }) {
  const { draft, update } = useQuoteDraft();
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always reads the freshest store state — avoids stale closure bugs
  function scheduleFetch() {
    const { draft: d } = useQuoteDraft.getState();
    const origin = d.origin_address;
    const dest = d.destination_address;
    if (!origin || !dest) return;

    if (fetchRef.current) clearTimeout(fetchRef.current);
    fetchRef.current = setTimeout(async () => {
      useQuoteDraft.getState().update({ auto_mileage_loading: true, auto_tolls_loading: true });
      try {
        const res = await getRoundTripMiles({
          origin,
          destination: dest,
          officeAddress: settings.office_address,
        });
        useQuoteDraft.getState().update({ round_trip_miles: res.roundTripMiles, tolls: res.tolls });
      } catch {
        // leave existing values — agent can override manually
      } finally {
        useQuoteDraft.getState().update({ auto_mileage_loading: false, auto_tolls_loading: false });
      }
    }, 600);

    // Auto-detect move type from ZIPs
    if (d.origin_zip?.length === 5 && d.destination_zip?.length === 5) {
      const detected = detectMoveType(d.origin_zip, d.destination_zip);
      if (detected) useQuoteDraft.getState().update({ move_type: detected });
    }
  }

  function handleOriginSelect(address: string, zip: string) {
    update({ origin_address: address, origin_zip: zip });
    scheduleFetch();
  }

  function handleDestinationSelect(address: string, zip: string) {
    update({ destination_address: address, destination_zip: zip });
    scheduleFetch();
  }

  const canContinue = draft.origin_address && draft.destination_address;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-medium mb-3">Move type</div>
        <div className="grid grid-cols-3 gap-2">
          {MOVE_TYPES.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => update({ move_type: value })}
              className={`rounded-xl border p-3 text-left transition-all ${
                draft.move_type === value
                  ? 'border-accent bg-accent/5 ring-1 ring-accent/40'
                  : 'border-border/60 hover:border-border'
              }`}
            >
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label>Origin address</Label>
          <AddressInput
            value={draft.origin_address}
            onChange={handleOriginSelect}
            placeholder="Start typing origin address…"
          />
          {draft.origin_zip && (
            <div className="text-xs text-muted-foreground">ZIP: {draft.origin_zip}</div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Destination address</Label>
          <AddressInput
            value={draft.destination_address}
            onChange={handleDestinationSelect}
            placeholder="Start typing destination address…"
          />
          {draft.destination_zip && (
            <div className="text-xs text-muted-foreground">ZIP: {draft.destination_zip}</div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Move date</Label>
        <Input
          type="date"
          value={draft.move_date ?? ''}
          onChange={(e) => update({ move_date: e.target.value || null })}
          className="w-48"
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          {(draft.auto_mileage_loading || draft.auto_tolls_loading) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <span className="text-muted-foreground">Travel:</span>
          <span className="tabular-nums font-medium">
            {draft.round_trip_miles ?? 0} mi round trip
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="tabular-nums font-medium">
            {formatMoney(draft.tolls ?? 0)} tolls
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>Override:</span>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">Miles</Label>
            <NumberInput
              value={draft.round_trip_miles ?? 0}
              onChange={(n) => update({ round_trip_miles: n })}
              min={0} className="w-24 h-7 text-sm px-2"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground">Tolls ($)</Label>
            <NumberInput
              value={draft.tolls ?? 0}
              onChange={(n) => update({ tolls: n })}
              min={0} step={0.5} className="w-24 h-7 text-sm px-2"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className="px-5 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 transition-opacity hover:opacity-90"
        >
          Next — Job Details
        </button>
      </div>
    </div>
  );
}
