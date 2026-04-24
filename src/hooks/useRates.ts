import { useCallback, useEffect, useState } from 'react';
import { getAllRates, type RateBundle } from '@/lib/supabase/queries/rates';

export function useRates() {
  const [rates, setRates] = useState<RateBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getAllRates();
      setRates(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rates, loading, error, reload };
}
