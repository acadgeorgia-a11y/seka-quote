import { cn } from '@/lib/utils';

export function GlassPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm', className)}>
      {children}
    </div>
  );
}
