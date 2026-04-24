import { Badge } from '@/components/ui/badge';
import { TIER_LABELS } from '@/lib/pricing';
import type { Tier } from '@/lib/pricing/types';

export function TierBadge({ tier, jobs }: { tier: Tier; jobs: number }) {
  return (
    <Badge variant="accent" title={`${jobs} job${jobs !== 1 ? 's' : ''} on calendar`}>
      Tier {tier.toUpperCase()} · {TIER_LABELS[tier]} jobs
    </Badge>
  );
}
