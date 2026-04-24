import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AgentState {
  agentId: string | null;
  setAgentId: (id: string | null) => void;
}

export const useAgent = create<AgentState>()(
  persist(
    (set) => ({
      agentId: null,
      setAgentId: (agentId) => set({ agentId }),
    }),
    { name: 'seka.agent' },
  ),
);
