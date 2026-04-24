import { cn } from '@/lib/utils';

export function LoadingShimmer({ className }: { className?: string }) {
  return (
    <div className={cn('shimmer rounded-md bg-muted', className)} />
  );
}
