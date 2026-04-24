import { useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/shared/NumberInput';
import { IOSSegment } from '@/components/shared/IOSSegment';
import { AddressInput } from '@/components/quote-builder/AddressInput';
import { useQuoteDraft } from '@/stores/useQuoteDraft';
import { getRoundTripMiles } from '@/lib/apis/mileage';
import { detectMoveType } from '@/lib/apis/zipToState';
import { formatMoney } from '@/lib/utils';
import type { Settings } from '@/lib/supabase/types';

const MOVE_TYPES = [
  { value: 'local', label: 'Local', hint: 'NY/NJ metro' },
  { value: 'long_distance', label: 'Long Distance', hint: 'NY/NJ → other state' },
  { value: 'out_of_state', label: 'Out-of-State', hint: '3rd party carrier' },
] as const;

export function Step1MoveType({ settings, onNext }: { settings: Settings; onNext: () => void }) {
  const { draft, update } = useQuoteDraft();
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        // leave existing values
      } finally {
        useQuoteDraft.getState().update({ auto_mileage_loading: false, auto_tolls_loading: false });
      }
    }, 600);

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
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Move Type</Label>
        <IOSSegment
          options={MOVE_TYPES}
          value={draft.move_type ?? 'local'}
          onChange={(v) => update({ move_type: v })}
        />
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origin Address</Label>
          <AddressInput
            value={draft.origin_address}
            onChange={handleOriginSelect}
            placeholder="Start typing origin address…"
          />
          {draft.origin_zip && (
            <div className="text-xs text-muted-foreground pl-1">ZIP: {draft.origin_zip}</div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination Address</Label>
          <AddressInput
            value={draft.destination_address}
            onChange={handleDestinationSelect}
            placeholder="Start typing destination address…"
          />
          {draft.destination_zip && (
            <div className="text-xs text-muted-foreground pl-1">ZIP: {draft.destination_zip}</div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Move Date</Label>
        <Input
          type="date"
          value={draft.move_date ?? ''}
          onChange={(e) => update({ move_date: e.target.value || null })}
          className="w-48"
        />
      </div>

      <div className="rounded-2xl bg-secondary/60 p-4 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          {(draft.auto_mileage_loading || draft.auto_tolls_loading) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <span className="font-semibold">Travel</span>
          <span className="tabular-nums">{draft.round_trip_miles ?? 0} mi round trip</span>
          <span className="text-muted-foreground">·</span>
          <span className="tabular-nums">{formatMoney(draft.tolls ?? 0)} tolls</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium">Override:</span>
          <div className="flex items-center gap-1.5">
            <span>Miles</span>
            <NumberInput
              value={draft.round_trip_miles ?? 0}
              onChange={(n) => update({ round_trip_miles: n })}
              min={0} className="w-24 h-7 text-sm px-2"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span>Tolls ($)</span>
            <NumberInput
              value={draft.tolls ?? 0}
              onChange={(n) => update({ tolls: n })}
              min={0} step={0.5} className="w-24 h-7 text-sm px-2"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold disabled:opacity-40 transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
