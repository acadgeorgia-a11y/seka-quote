import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/shared/NumberInput';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { BoxGrid } from '@/components/quote-builder/BoxGrid';
import { HeavyItemList } from '@/components/quote-builder/HeavyItemList';
import { HraToggle } from '@/components/quote-builder/HraToggle';
import { useQuoteDraft } from '@/stores/useQuoteDraft';
import type { RateBundle } from '@/lib/supabase/queries/rates';

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-3 text-sm font-medium text-left"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Step3Addons({ rates, onBack, onNext }: { rates: RateBundle; onBack: () => void; onNext: () => void }) {
  const { draft, update } = useQuoteDraft();

  return (
    <div className="space-y-1">
      <Section title="Packing">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <Checkbox
            checked={draft.customer_provides_boxes ?? false}
            onCheckedChange={(v) => update({ customer_provides_boxes: !!v })}
          />
          Customer provides their own boxes
        </label>
        <BoxGrid
          boxes={rates.boxes}
          selections={draft.boxes ?? []}
          onChange={(boxes) => update({ boxes })}
          customerProvidesBoxes={draft.customer_provides_boxes ?? false}
        />
      </Section>

      <Section title="Unpacking">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Boxes to unpack</Label>
            <NumberInput
              value={draft.unpacking_qty ?? 0}
              onChange={(n) => update({ unpacking_qty: n })}
              min={0} className="h-8"
            />
          </div>
          {(draft.unpacking_qty ?? 0) > 0 && (
            <label className="flex items-end gap-2 text-sm pb-1 cursor-pointer">
              <Checkbox
                checked={draft.unpacking_discounted ?? false}
                onCheckedChange={(v) => update({ unpacking_discounted: !!v })}
              />
              Discount rate (${rates.settings.discounted_unpacking_rate}/box)
            </label>
          )}
        </div>
      </Section>

      <Section title="Stairs">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Flights at origin</Label>
            <NumberInput
              value={draft.stairs_flights ?? 0}
              onChange={(n) => update({ stairs_flights: n })}
              min={0} className="h-8 w-20"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Destination stairs included — enter total flights</p>
      </Section>

      <Section title="Heavy Items">
        <HeavyItemList
          items={rates.heavyItems}
          selections={draft.heavy_items ?? []}
          onChange={(heavy_items) => update({ heavy_items })}
        />
      </Section>

      <Section title="Crating">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Soft crates</Label>
            <NumberInput
              value={draft.crating?.soft_qty ?? 0}
              onChange={(n) => update({ crating: { ...draft.crating ?? { soft_qty: 0 }, soft_qty: n } })}
              min={0} className="h-8 w-20"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Wood crate value ($)</Label>
            <NumberInput
              value={draft.crating?.wood_amount ?? 0}
              onChange={(n) => update({ crating: { ...draft.crating ?? { soft_qty: 0 }, wood_amount: n || undefined } })}
              min={0} step={50} className="h-8"
              placeholder="quote-based"
            />
          </div>
        </div>
      </Section>

      <Section title="Storage">
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Overnight / off-site storage</div>
              <div className="text-xs text-muted-foreground">Truck/container held overnight</div>
            </div>
            <Switch
              checked={draft.storage?.overnight ?? false}
              onCheckedChange={(v) => update({ storage: { ...draft.storage ?? {}, overnight: v } })}
            />
          </label>
          {draft.storage?.overnight && (
            <div className="grid grid-cols-2 gap-3 pl-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Start date</Label>
                <Input
                  type="date"
                  value={draft.storage?.overnight_start ?? ''}
                  onChange={(e) => update({ storage: { ...draft.storage ?? { overnight: true }, overnight_start: e.target.value || undefined } })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End date</Label>
                <Input
                  type="date"
                  value={draft.storage?.overnight_end ?? ''}
                  onChange={(e) => update({ storage: { ...draft.storage ?? { overnight: true }, overnight_end: e.target.value || undefined } })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Long-term storage (months)</Label>
            <NumberInput
              value={draft.storage?.long_term_months ?? 0}
              onChange={(n) => update({ storage: { ...draft.storage ?? { overnight: false }, long_term_months: n || undefined } })}
              min={0} className="h-8 w-24"
            />
          </div>
        </div>
      </Section>

      <div className="pt-2">
        <HraToggle
          checked={draft.is_hra ?? false}
          onChange={(v) => update({ is_hra: v })}
        />
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-accent hover:bg-accent/10 transition-colors">
          ← Back
        </button>
        <button type="button" onClick={onNext}
          className="px-6 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity active:scale-[0.98]">
          Review Quote
        </button>
      </div>
    </div>
  );
}
