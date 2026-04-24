const BASE = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  searched?: boolean;
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<{ reply: string; searched: boolean }> {
  const res = await fetch(`${BASE}/ai-chat`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Chat request failed');
  return { reply: data.reply as string, searched: data.searched as boolean };
}
