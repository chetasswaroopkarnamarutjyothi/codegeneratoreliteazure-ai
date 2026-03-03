import { useState, useRef, useEffect } from "react";
import { Bot, User, Send, Loader2, Trash2, Sparkles, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useUsageHistory } from "@/hooks/useUsageHistory";
import CodeOutput from "./CodeOutput";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-code`;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIchatProps {
  userId?: string;
}

export default function AIChat({ userId }: AIchatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { deductPoints, getTotalPoints } = useUserPoints(userId);
  const { addHistoryItem } = useUsageHistory(userId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const extractCodeBlocks = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: { type: "text" | "code"; content: string; language?: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: "code", content: match[2], language: match[1] || "typescript" });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: "text" as const, content: text }];
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const creditCost = 5;
    if (getTotalPoints() < creditCost) {
      toast.error("Insufficient CodeNova Credits. Need 5 credits per message.");
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    try {
      const { success, error: deductError } = await deductPoints(creditCost);
      if (!success) {
        toast.error(deductError || "Failed to deduct credits");
        setIsStreaming(false);
        return;
      }

      // Build conversation context for the AI
      const conversationContext = [...messages, userMessage]
        .map((m) => `${m.role === "user" ? "User" : "CodeNova AI"}: ${m.content}`)
        .join("\n\n");

      const prompt = `This is a multi-turn conversation. Here is the full conversation history:\n\n${conversationContext}\n\nRespond to the latest user message. If the user asks for code, provide it in markdown code blocks with the language specified. If they ask questions about their code, analyze and explain. Be helpful, precise, and conversational.`;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          language: "typescript",
          professionalMode: false,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limit exceeded. Please try again.");
        else if (resp.status === 402) toast.error("Usage limit reached.");
        else toast.error("Failed to get response.");
        setIsStreaming(false);
        return;
      }

      const assistantId = crypto.randomUUID();
      let fullContent = "";

      // Add empty assistant message
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
      ]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                )
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: fullContent } : m
                )
              );
            }
          } catch {
            /* ignore */
          }
        }
      }

      await addHistoryItem({
        action_type: "ai_chat",
        language: "multi",
        prompt: userMessage.content,
        result: fullContent,
        points_used: creditCost,
      });

      toast.success(`Response received (-${creditCost} credits)`);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Chat cleared");
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="glass rounded-xl overflow-hidden flex flex-col" style={{ height: "70vh" }}>
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">CodeNova AI Chat</h2>
              <p className="text-xs text-muted-foreground">
                Multi-turn conversation • Ask anything about code
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              {messages.filter((m) => m.role === "assistant").length} responses
            </Badge>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearChat}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="p-4 rounded-full bg-primary/10 text-primary mb-4">
                <Bot className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground text-sm max-w-md mb-6">
                Ask CodeNova AI to write code, debug issues, explain concepts, or
                refactor your code. The AI remembers your entire conversation.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-md">
                {[
                  "Write a React hook for dark mode",
                  "Explain async/await in JavaScript",
                  "Create a REST API with Express",
                  "Debug this code for me",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-left text-xs p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary h-fit mt-1 shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 border border-border/50"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="space-y-2">
                        {extractCodeBlocks(msg.content).map((part, i) =>
                          part.type === "code" ? (
                            <div key={i} className="rounded-lg overflow-hidden border border-border/50 my-2">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/80 text-xs text-muted-foreground border-b border-border/50">
                                <Code2 className="w-3 h-3" />
                                {part.language}
                              </div>
                              <CodeOutput
                                code={part.content}
                                language={part.language || "typescript"}
                                isGenerating={false}
                              />
                            </div>
                          ) : (
                            <p
                              key={i}
                              className="text-sm whitespace-pre-wrap leading-relaxed"
                            >
                              {part.content}
                            </p>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.role === "user"
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground"
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {msg.role === "user" && (
                    <div className="p-1.5 rounded-lg bg-accent/10 text-accent h-fit mt-1 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.content === "" && (
                <div className="flex gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary h-fit mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-muted/50 border border-border/50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      CodeNova is thinking...
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask CodeNova AI anything about code..."
              className="min-h-[48px] max-h-[120px] resize-none bg-muted/30 border-border/50 focus:border-primary"
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              size="icon"
              className="h-12 w-12 shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press <kbd className="px-1 py-0.5 rounded bg-muted border text-xs">Enter</kbd> to send • <kbd className="px-1 py-0.5 rounded bg-muted border text-xs">Shift+Enter</kbd> for new line • 5 credits/message
          </p>
        </div>
      </div>
    </div>
  );
}
