import { useEffect, useState } from 'react';
import { useAgent } from '@/stores/useAgent';
import { listActiveAgents } from '@/lib/supabase/queries/agents';
import type { Agent } from '@/lib/supabase/types';

export function AgentGate({ children }: { children: React.ReactNode }) {
  const { agentId, setAgentId } = useAgent();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listActiveAgents()
      .then(setAgents)
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (!agentId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <div className="w-16 h-16 rounded-2xl bg-foreground text-background flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              SM
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Who are you?</h1>
            <p className="text-sm text-muted-foreground mt-1">Select your name to start a quote</p>
          </div>

          <div className="space-y-2">
            {agents.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                No agents found. Ask Alex to add agents in Admin → Agents.
              </p>
            )}
            {agents.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAgentId(a.id)}
                className="w-full py-3.5 px-5 rounded-2xl bg-card shadow-sm border border-border/40 text-left hover:border-foreground/30 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="font-semibold text-base">{a.full_name}</div>
                <div className="text-xs text-muted-foreground capitalize mt-0.5">{a.role}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
