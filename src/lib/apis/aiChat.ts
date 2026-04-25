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
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify({
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`); }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(data.error as string) ?? text.slice(0, 200)}`);
  return { reply: data.reply as string, searched: data.searched as boolean };
}
