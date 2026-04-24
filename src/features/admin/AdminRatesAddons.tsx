import { useRates } from '@/hooks/useRates';
import { Skeleton } from '@/components/ui/skeleton';
import { BoxesTable } from './BoxesTable';
import { HeavyItemsTable } from './HeavyItemsTable';
import { MiscTable } from './MiscTable';

export function AdminRatesAddons() {
  const { rates, loading, reload } = useRates();
  if (loading || !rates) return <Skeleton className="h-96" />;
  return (
    <div className="space-y-12">
      <BoxesTable rates={rates.boxes} onSaved={reload} />
      <HeavyItemsTable rates={rates.heavyItems} onSaved={reload} />
      <MiscTable misc={rates.misc} onSaved={reload} />
    </div>
  );
}
