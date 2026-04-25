import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Agent } from '@/lib/supabase/types';

interface AgentState {
  agentId: string | null;
  agent: Agent | null;
  setAgent: (agent: Agent | null) => void;
  setAgentId: (id: string | null) => void;
}

export const useAgent = create<AgentState>()(
  persist(
    (set) => ({
      agentId: null,
      agent: null,
      setAgent: (agent) => set({ agent, agentId: agent?.id ?? null }),
      setAgentId: (agentId) => set({ agentId, agent: null }),
    }),
    { name: 'seka.agent' },
  ),
);
