import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { StepIndicator } from '@/components/quote-builder/StepIndicator';
import { PriceBreakdown } from '@/components/quote-builder/PriceBreakdown';
import { GlassPanel } from '@/components/shared/GlassPanel';
import { LoadingShimmer } from '@/components/shared/LoadingShimmer';
import { MoneyDisplay } from '@/components/shared/MoneyDisplay';
import { useRates } from '@/hooks/useRates';
import { useQuoteDraft } from '@/stores/useQuoteDraft';
import { calculateQuote } from '@/lib/pricing';
import type { RateTables } from '@/lib/pricing/types';
import type { RateBundle } from '@/lib/supabase/queries/rates';
import { Step1MoveType } from './Step1MoveType';
import { Step2JobDetails } from './Step2JobDetails';
import { Step3Addons } from './Step3Addons';
import { Step4Review } from './Step4Review';
import { AgentGate } from './AgentGate';

function bundleToRateTables(b: RateBundle): RateTables {
  return {
    localCuft: b.localCuft,
    localHourly: b.localHourly,
    longDistance: b.longDistance,
    outOfState: b.outOfState,
    boxes: b.boxes,
    heavyItems: b.heavyItems,
    misc: b.misc,
    fourthManRate: b.settings.fourth_man_rate,
    defaultUnpackingRate: b.settings.default_unpacking_rate,
    discountedUnpackingRate: b.settings.discounted_unpacking_rate,
    boxDeliveryMinimum: b.settings.box_delivery_minimum,
  };
}

const SLIDE = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.22, ease: 'easeOut' },
};

function NewQuoteButton() {
  const { reset } = useQuoteDraft();
  const [confirm, setConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick() {
    if (confirm) {
      reset();
      setConfirm(false);
    } else {
      setConfirm(true);
      timerRef.current = setTimeout(() => setConfirm(false), 3000);
    }
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
        confirm
          ? 'border-red-400/50 text-red-500 bg-red-500/5 hover:bg-red-500/10'
          : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
      }`}
    >
      <RotateCcw className="h-3 w-3" />
      {confirm ? 'Confirm reset?' : 'New quote'}
    </button>
  );
}

export function QuoteBuilder() {
  const { rates, loading, error } = useRates();
  const { draft, step, setStep } = useQuoteDraft();

  const rateTables = useMemo(() => (rates ? bundleToRateTables(rates) : null), [rates]);

  const breakdown = useMemo(() => {
    if (!rateTables || !draft.move_type) return null;
    const isHourly = draft.pricing_method === 'hourly';
    const cuft = draft.total_cuft ?? 300;
    if (!isHourly && cuft < 300) return null;
    if (isHourly && (draft.hours ?? 3) < 3) return null;
    try {
        return calculateQuote(
        {
          move_type: draft.move_type,
          pricing_method: draft.pricing_method,
          tier: draft.tier ?? 't1',
          jobs_on_calendar: draft.jobs_on_calendar ?? 0,
          total_cuft: cuft,
          time_slot: draft.time_slot,
          hours: draft.hours ?? 3,
          crew_override: draft.crew_override,
          fourth_man: draft.fourth_man,
          destination_state: draft.destination_state,
          round_trip_miles: draft.round_trip_miles ?? 0,
          tolls: draft.tolls ?? 0,
          boxes: draft.boxes,
          customer_provides_boxes: draft.customer_provides_boxes,
          unpacking_qty: draft.unpacking_qty,
          unpacking_discounted: draft.unpacking_discounted,
          stairs_flights: draft.stairs_flights,
          heavy_items: draft.heavy_items,
          crating: draft.crating,
          storage: draft.storage,
          is_hra: draft.is_hra,
          discount_pct: draft.discount_pct,
        },
        rateTables,
      );
    } catch (e) {
      console.error('[quote] pricing error', e);
      return null;
    }
  }, [draft, rateTables]);

  if (loading) return <QuoteBuilderSkeleton />;
  if (error) return <div className="py-16 text-center text-muted-foreground text-sm">Failed to load rates: {error}</div>;
  if (!rates) return null;

  return (
    <AgentGate>
    <div className="py-6">
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-3xl font-bold tracking-tight2">New Quote</h1>
          <NewQuoteButton />
        </div>
        <StepIndicator current={step} onJump={setStep} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
        <GlassPanel className="p-6">
          <AnimatePresence mode="wait">
            <motion.div key={step} {...SLIDE}>
              {step === 0 && (
                <Step1MoveType settings={rates.settings} onNext={() => setStep(1)} />
              )}
              {step === 1 && (
                <Step2JobDetails settings={rates.settings} onBack={() => setStep(0)} onNext={() => setStep(2)} />
              )}
              {step === 2 && (
                <Step3Addons rates={rates} onBack={() => setStep(1)} onNext={() => setStep(3)} />
              )}
              {step === 3 && breakdown && rateTables && (
                <Step4Review breakdown={breakdown} rates={rateTables} onBack={() => setStep(2)} />
              )}
              {step === 3 && !breakdown && (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Complete steps 1–3 to see the full breakdown.
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </GlassPanel>

        <div className="space-y-3 lg:sticky lg:top-20 order-first lg:order-last">
          <GlassPanel className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Live Total</div>
            {breakdown ? (
              <MoneyDisplay
                value={breakdown.final_total}
                className="text-4xl font-bold tracking-tight2 tabular-nums"
              />
            ) : (
              <div className="text-4xl font-bold tracking-tight2 text-muted-foreground/30">—</div>
            )}
          </GlassPanel>

          {breakdown && step < 3 && (
            <GlassPanel className="p-5">
              <div className="text-xs text-muted-foreground mb-3">Breakdown</div>
              <PriceBreakdown breakdown={breakdown} compact />
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
    </AgentGate>
  );
}

function QuoteBuilderSkeleton() {
  return (
    <div className="py-6 space-y-6">
      <LoadingShimmer className="h-10 w-48" />
      <LoadingShimmer className="h-6 w-72" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <LoadingShimmer className="h-96 w-full" />
        <LoadingShimmer className="h-40 w-full" />
      </div>
    </div>
  );
}
