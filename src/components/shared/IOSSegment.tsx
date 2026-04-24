import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

export function IOSSegment<T extends string>({ options, value, onChange, className }: Props<T>) {
  return (
    <div className={cn('flex gap-1 rounded-xl bg-secondary p-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 rounded-lg py-1.5 px-3 text-sm font-medium transition-all duration-150',
            value === opt.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
          {opt.hint && (
            <div className="text-[10px] font-normal opacity-60 leading-tight mt-0.5">{opt.hint}</div>
          )}
        </button>
      ))}
    </div>
  );
}
