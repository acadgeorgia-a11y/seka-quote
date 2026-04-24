import { useState, type PropsWithChildren } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const STORAGE_KEY = 'seka.admin_ok';

function isUnlocked() {
  return typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === '1';
}

export function AdminGate({ children }: PropsWithChildren) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function tryUnlock(e: React.FormEvent) {
    e.preventDefault();
    const expected = import.meta.env.VITE_ADMIN_PASSCODE as string | undefined;
    if (!expected) {
      setError('Admin passcode not configured. Set VITE_ADMIN_PASSCODE in .env.local.');
      return;
    }
    if (value === expected) {
      window.localStorage.setItem(STORAGE_KEY, '1');
      setUnlocked(true);
    } else {
      setError('Wrong passcode.');
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.form
        onSubmit={tryUnlock}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm rounded-xl border bg-card p-6 space-y-4"
      >
        <div>
          <h2 className="font-serif text-3xl tracking-tight2">Admin access</h2>
          <p className="text-sm text-muted-foreground mt-1">Enter the shared passcode.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pc">Passcode</Label>
          <Input
            id="pc"
            type="password"
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full">
          Unlock
        </Button>
      </motion.form>
    </div>
  );
}
