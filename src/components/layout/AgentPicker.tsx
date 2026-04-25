import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, User } from 'lucide-react';
import { useAgent } from '@/stores/useAgent';
import { listActiveAgents } from '@/lib/supabase/queries/agents';
import type { Agent } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

export function AgentPicker() {
  const { agentId, setAgent } = useAgent();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    listActiveAgents().then(setAgents).catch(() => setAgents([]));
  }, []);

  const current = agents.find((a) => a.id === agentId);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const el = document.getElementById('agent-picker-root');
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" id="agent-picker-root">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 h-9 px-3 text-sm rounded-md transition-colors',
          'bg-secondary/60 hover:bg-secondary text-foreground',
        )}
      >
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">You are:</span>
        <span>{current?.full_name ?? 'Pick agent'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-11 w-56 rounded-lg border bg-popover shadow-md overflow-hidden"
        >
          {agents.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No agents yet. Add one in /admin.</div>
          )}
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setAgent(a);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors',
                a.id === agentId && 'bg-secondary',
              )}
            >
              {a.full_name}
              {a.role === 'owner' && <span className="ml-2 text-xs text-muted-foreground">(owner)</span>}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
