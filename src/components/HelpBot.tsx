import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";


interface Msg { role: "user" | "assistant"; content: string }

export function HelpBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm StackNova Bot 🤖 — your StackCodeNova AI guide. Ask me anything about credits, tools, or how to use the platform." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [msgs, open]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("help-bot", {
        body: { messages: next.map(m => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      const text = (data as any)?.reply || "I'm here to help — could you rephrase that?";
      setMsgs(m => [...m, { role: "assistant", content: text }]);
    } catch (e: any) {
      setMsgs(m => [...m, { role: "assistant", content: "I had trouble reaching the AI. Please try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 group"
          aria-label="Open StackNova Bot"
        >
          <span className="absolute inset-0 rounded-full bg-primary/40 blur-lg animate-pulse" />
          <span className="relative flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-2xl border border-primary/40 hover:scale-105 transition">
            <Bot className="w-5 h-5" />
            <span className="font-semibold text-sm">StackNova Bot</span>
            <Sparkles className="w-4 h-4" />
          </span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[92vw] h-[520px] glass rounded-2xl shadow-2xl border border-primary/30 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-primary/15 to-accent/15">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold">StackNova Bot</p>
                <p className="text-[10px] text-muted-foreground">Your StackCodeNova AI guide</p>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}>{m.content}</div>
              </div>
            ))}
            {busy && <div className="text-xs text-muted-foreground italic">StackNova Bot is thinking…</div>}
          </div>
          <div className="p-2 border-t border-border/50 flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask anything…"
              disabled={busy}
            />
            <Button onClick={send} disabled={busy || !input.trim()} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
