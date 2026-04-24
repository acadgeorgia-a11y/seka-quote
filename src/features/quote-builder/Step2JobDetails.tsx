import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/shared/NumberInput';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TierBadge } from '@/components/quote-builder/TierBadge';
import { useQuoteDraft } from '@/stores/useQuoteDraft';
import { jobsBookedToTier, crewSizeFromCuft } from '@/lib/pricing';
import { US_STATES } from '@/lib/apis/zipToState';
import type { Settings } from '@/lib/supabase/types';

const PRICING_METHODS = [
  { value: 'cuft', label: 'CuFT flat rate' },
  { value: 'hourly', label: 'Hourly' },
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
          <Label>Total CuFT <span className="text-muted-foreground text-xs">(min 300)</span></Label>
          <NumberInput
            value={draft.total_cuft ?? 300}
            onChange={(n) => update({ total_cuft: Math.max(300, n) })}
            min={300} step={10}
          />
        </div>
        <div className="space-y-1.5">
          <Label>
            Jobs on calendar{' '}
            <span className="text-muted-foreground text-xs">(check SmartMoving)</span>
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
          <Label>Destination state</Label>
          <select
            value={draft.destination_state ?? ''}
            onChange={(e) => update({ destination_state: e.target.value || undefined })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
          <Label>Pricing method</Label>
          <div className="flex gap-2">
            {PRICING_METHODS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => update({ pricing_method: value })}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-all ${
                  draft.pricing_method === value
                    ? 'border-accent bg-accent/5 text-accent'
                    : 'border-border/60 text-muted-foreground hover:border-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {showDualHint && (
            <p className="text-xs text-muted-foreground">≤ 400 CuFT — both morning and afternoon prices will be shown</p>
          )}
        </div>
      )}

      {isLocal && isHourly && (
        <div className="space-y-1.5">
          <Label>Hours <span className="text-muted-foreground text-xs">(min 3, step 0.5)</span></Label>
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
          <Label>Time slot</Label>
          <div className="flex gap-2">
            {(['morning', 'afternoon'] as const).map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => update({ time_slot: slot })}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium capitalize transition-all ${
                  draft.time_slot === slot
                    ? 'border-accent bg-accent/5 text-accent'
                    : 'border-border/60 text-muted-foreground hover:border-border'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Crew size</Label>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => update({ crew_override: n === autoCrew ? undefined : n })}
                className={`w-10 h-10 rounded-xl border text-sm font-medium transition-all ${
                  crew === n
                    ? 'border-accent bg-accent/5 text-accent'
                    : 'border-border/60 text-muted-foreground hover:border-border'
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

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <Checkbox
          checked={draft.fourth_man ?? false}
          onCheckedChange={(v) => update({ fourth_man: !!v })}
        />
        <div>
          <div className="text-sm font-medium">4th man</div>
          <div className="text-xs text-muted-foreground">+{settings.fourth_man_rate}/hr</div>
        </div>
      </label>

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
        <button type="button" onClick={onNext} className="px-5 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Next — Add-ons
        </button>
      </div>
    </div>
  );
}
