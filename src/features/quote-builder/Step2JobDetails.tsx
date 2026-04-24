import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/shared/NumberInput';
import { IOSSegment } from '@/components/shared/IOSSegment';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TierBadge } from '@/components/quote-builder/TierBadge';
import { useQuoteDraft } from '@/stores/useQuoteDraft';
import { jobsBookedToTier, crewSizeFromCuft } from '@/lib/pricing';
import { US_STATES } from '@/lib/apis/zipToState';
import type { Settings } from '@/lib/supabase/types';

const PRICING_METHODS = [
  { value: 'cuft', label: 'CuFT Flat Rate' },
  { value: 'hourly', label: 'Hourly' },
] as const;

const TIME_SLOTS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
] as const;

export function Step2JobDetails({
  settings,
  onBack,
  onNext,
}: { settings: Settings; onBack: () => void; onNext: () => void }) {
  const { draft, update } = useQuoteDraft();
  const tier = jobsBookedToTier(draft.jobs_on_calendar ?? 0);
  const autoCrew = crewSizeFromCuft(draft.total_cuft ?? 300);
  const crew = draft.crew_override ?? autoCrew;

  function setJobs(n: number) {
    update({ jobs_on_calendar: n, tier: jobsBookedToTier(n) });
  }

  const isLocal = draft.move_type === 'local';
  const isHourly = draft.pricing_method === 'hourly';
  const showDualHint = isLocal && !isHourly && (draft.total_cuft ?? 0) <= 400;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total CuFT <span className="normal-case font-normal">(min 300)</span>
          </Label>
          <NumberInput
            value={draft.total_cuft ?? 300}
            onChange={(n) => update({ total_cuft: Math.max(300, n) })}
            min={300} step={10}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Jobs on Calendar
          </Label>
          <NumberInput
            value={draft.jobs_on_calendar ?? 0}
            onChange={setJobs}
            min={0} step={1}
          />
        </div>
      </div>

      <TierBadge tier={tier} jobs={draft.jobs_on_calendar ?? 0} />

      {draft.move_type === 'long_distance' && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination State</Label>
          <select
            value={draft.destination_state ?? ''}
            onChange={(e) => update({ destination_state: e.target.value || undefined })}
            className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="">Select state…</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {isLocal && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing Method</Label>
          <IOSSegment
            options={PRICING_METHODS}
            value={draft.pricing_method ?? 'cuft'}
            onChange={(v) => update({ pricing_method: v })}
          />
          {showDualHint && (
            <p className="text-xs text-accent pl-1">≤ 400 CuFT — both morning and afternoon prices will be shown</p>
          )}
        </div>
      )}

      {isLocal && isHourly && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Hours <span className="normal-case font-normal">(min 3, step 0.5)</span>
          </Label>
          <NumberInput
            value={draft.hours ?? 3}
            onChange={(n) => update({ hours: Math.max(3, n) })}
            min={3} max={24} step={0.5}
            className="w-28"
          />
        </div>
      )}

      {isLocal && !isHourly && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time Slot</Label>
          <IOSSegment
            options={TIME_SLOTS}
            value={draft.time_slot ?? 'morning'}
            onChange={(v) => update({ time_slot: v })}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Crew Size</Label>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => update({ crew_override: n === autoCrew ? undefined : n })}
                className={`w-11 h-11 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  crew === n
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {draft.crew_override && (
            <Badge variant="warn" className="text-xs">manual override</Badge>
          )}
          {!draft.crew_override && (
            <span className="text-xs text-muted-foreground">auto from CuFT</span>
          )}
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none rounded-2xl bg-secondary/60 px-4 py-3">
        <Checkbox
          checked={draft.fourth_man ?? false}
          onCheckedChange={(v) => update({ fourth_man: !!v })}
        />
        <div>
          <div className="text-sm font-semibold">4th Man</div>
          <div className="text-xs text-muted-foreground">+{settings.fourth_man_rate}/hr</div>
        </div>
      </label>

      <div className="flex justify-between pt-1">
        <button type="button" onClick={onBack}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-accent hover:bg-accent/10 transition-colors">
          ← Back
        </button>
        <button type="button" onClick={onNext}
          className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity active:scale-[0.98]">
          Continue
        </button>
      </div>
    </div>
  );
}
