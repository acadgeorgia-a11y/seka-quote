import { cn } from '@/lib/utils';

export function GlassPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-2xl bg-card shadow-sm', className)}>
      {children}
    </div>
  );
}
