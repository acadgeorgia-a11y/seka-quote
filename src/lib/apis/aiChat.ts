import { supabase } from '../supabase/client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  searched?: boolean;
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<{ reply: string; searched: boolean }> {
  const { data, error } = await supabase.functions.invoke<{ reply: string; searched: boolean }>('ai-chat', {
    body: { messages: messages.map(({ role, content }) => ({ role, content })) },
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Empty response from AI');
  return data;
}
