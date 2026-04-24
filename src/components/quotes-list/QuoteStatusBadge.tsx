import { Badge } from '@/components/ui/badge';
import type { QuoteStatus } from '@/lib/supabase/types';

const CONFIG: Record<QuoteStatus, { label: string; variant: 'default' | 'accent' | 'success' | 'warn' | 'muted' | 'outline' }> = {
  draft:  { label: 'Draft',  variant: 'muted' },
  sent:   { label: 'Sent',   variant: 'accent' },
  booked: { label: 'Booked', variant: 'success' },
  lost:   { label: 'Lost',   variant: 'warn' },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const { label, variant } = CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
