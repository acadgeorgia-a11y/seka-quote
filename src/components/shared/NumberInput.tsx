import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
}

/**
 * Number input that keeps a local string while the user is typing so they
 * can freely clear and retype without the field snapping back to 0.
 * Commits the numeric value to `onChange` on every keystroke (when valid)
 * and clamps to min/max on blur.
 */
export function NumberInput({ value, onChange, min, max, step = 1, placeholder, className }: Props) {
  const [local, setLocal] = useState(value === 0 ? '' : String(value));

  // Sync when the value changes externally (e.g. store reset)
  useEffect(() => {
    setLocal(value === 0 ? '' : String(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setLocal(raw);
    const n = parseFloat(raw);
    if (!isNaN(n)) onChange(n);
  }

  function handleBlur() {
    let n = parseFloat(local);
    if (isNaN(n)) n = min ?? 0;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    // Round to step precision
    if (step < 1) {
      const decimals = String(step).split('.')[1]?.length ?? 0;
      n = parseFloat(n.toFixed(decimals));
    } else {
      n = Math.round(n);
    }
    onChange(n);
    setLocal(n === 0 ? '' : String(n));
  }

  return (
    <input
      type="number"
      value={local}
      onChange={handleChange}
      onBlur={handleBlur}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder ?? (min !== undefined ? String(min) : '0')}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular-nums',
        'ring-offset-background placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:appearance-auto',
        className,
      )}
    />
  );
}
