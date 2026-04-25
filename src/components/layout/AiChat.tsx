import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Globe } from 'lucide-react';
import { sendChatMessage, type ChatMessage } from '@/lib/apis/aiChat';

const WELCOME = "Hi, I'm Seka — your moving specialist. Ask me anything: CuFT of a bedroom, current toll rates, what masonite is, how to handle a 600 lb safe, you name it.";

const SUGGESTIONS = [
  'What\'s the CuFT of a queen bed + dresser + sofa?',
  'What is masonite and when do we use it?',
  'Current Lincoln Tunnel toll for a moving truck?',
  'How do we handle a grand piano?',
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-foreground text-background rounded-br-sm'
            : 'bg-secondary text-foreground rounded-bl-sm'
        }`}
      >
        {msg.content}
      </div>
      {msg.searched && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground px-1">
          <Globe className="h-2.5 w-2.5" />
          Searched the web
        </div>
      )}
    </div>
  );
}

function ThinkingIndicator({ searching }: { searching: boolean }) {
  return (
    <div className="flex justify-start">
      <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
        {searching ? (
          <>
            <Globe className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />
            <span className="text-xs text-muted-foreground">Searching the web…</span>
          </>
        ) : (
          <div className="flex gap-1 items-center">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setSearching(false);

    // Show "Searching the web..." after 3s if still loading
    searchTimerRef.current = setTimeout(() => setSearching(true), 3000);

    try {
      const { reply, searched } = await sendChatMessage(next);
      setMessages([...next, { role: 'assistant', content: reply, searched }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `Error: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
      setSearching(false);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const showSuggestions = messages.length === 0 && !loading;

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            type="button"
            onClick={() => setOpen(true)}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 rounded-2xl bg-foreground text-background shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95"
            style={{ width: 52, height: 52 }}
          >
            <Sparkles className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 md:hidden"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed z-50 bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto md:w-[400px] bg-card rounded-t-3xl md:rounded-3xl shadow-2xl border border-border/50 flex flex-col overflow-hidden"
              style={{ height: 580, maxHeight: '88dvh' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm leading-tight">Seka AI</div>
                    <div className="text-xs text-muted-foreground">Moving specialist · web search</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {/* Welcome */}
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed bg-secondary text-foreground">
                    {WELCOME}
                  </div>
                </div>

                {/* Suggestion chips */}
                {showSuggestions && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="text-xs px-3 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} />
                ))}

                {loading && <ThinkingIndicator searching={searching} />}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 pb-4 pt-2 border-t border-border/40 shrink-0">
                <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 py-2.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask anything about this move…"
                    disabled={loading}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => send()}
                    disabled={!input.trim() || loading}
                    className="w-7 h-7 rounded-xl bg-foreground text-background flex items-center justify-center disabled:opacity-30 transition-opacity active:scale-95 shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
