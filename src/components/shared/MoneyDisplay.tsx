import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { formatMoney } from '@/lib/utils';

export function MoneyDisplay({
  value,
  className,
  cents,
}: {
  value: number;
  className?: string;
  cents?: boolean;
}) {
  const spring = useSpring(value, { stiffness: 120, damping: 30, mass: 0.6 });
  const display = useTransform(spring, (v) => formatMoney(v, { cents }));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
}
