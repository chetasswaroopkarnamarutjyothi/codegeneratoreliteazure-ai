import { useState, useRef, useEffect } from "react";
import { Bot, User, Send, Loader2, Trash2, Sparkles, Code2, Save, FolderOpen, Plus, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

interface SavedConversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

interface AIchatProps {
  userId?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
    </button>
  );
}

export default function AIChat({ userId }: AIchatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [currentConvoId, setCurrentConvoId] = useState<string | null>(null);
  const [saveTitle, setSaveTitle] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { deductPoints, getTotalPoints } = useUserPoints(userId);
  const { addHistoryItem } = useUsageHistory(userId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (userId) loadConversations();
  }, [userId]);

  const loadConversations = async () => {
    if (!userId) return;
    setLoadingConvos(true);
    const { data } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    
    if (data) {
      setSavedConversations(data.map(d => ({
        ...d,
        messages: (d.messages as any[]).map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
      })));
    }
    setLoadingConvos(false);
  };

  const saveConversation = async () => {
    if (!userId || messages.length === 0) return;
    const title = saveTitle.trim() || `Chat ${new Date().toLocaleDateString()}`;
    
    const serializedMessages = messages.map(m => ({
      ...m,
      timestamp: m.timestamp.toISOString()
    }));

    if (currentConvoId) {
      await supabase
        .from("ai_conversations")
        .update({ title, messages: serializedMessages as any, updated_at: new Date().toISOString() })
        .eq("id", currentConvoId);
      toast.success("Conversation updated!");
    } else {
      const { data } = await supabase
        .from("ai_conversations")
        .insert({ user_id: userId, title, messages: serializedMessages as any })
        .select()
        .single();
      if (data) setCurrentConvoId(data.id);
      toast.success("Conversation saved!");
    }
    
    setSaveTitle("");
    setShowSaveDialog(false);
    loadConversations();
  };

  const loadConversation = (convo: SavedConversation) => {
    setMessages(convo.messages);
    setCurrentConvoId(convo.id);
    setSaveTitle(convo.title);
    setShowLoadDialog(false);
    toast.success(`Loaded: ${convo.title}`);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("ai_conversations").delete().eq("id", id);
    if (currentConvoId === id) {
      setCurrentConvoId(null);
      setMessages([]);
    }
    loadConversations();
    toast.success("Conversation deleted");
  };

  const newConversation = () => {
    setMessages([]);
    setCurrentConvoId(null);
    setSaveTitle("");
    toast.success("New conversation started");
  };

  const extractCodeBlocks = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: { type: "text" | "code"; content: string; language?: string }[] = [];
    let lastIndex = 0;
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      parts.push({ type: "code", content: match[2], language: match[1] || "typescript" });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push({ type: "text", content: text.slice(lastIndex) });
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
        body: JSON.stringify({ prompt, language: "typescript", professionalMode: false }),
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
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);

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
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullContent } : m));
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

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
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullContent } : m));
            }
          } catch { /* ignore */ }
        }
      }

      await addHistoryItem({
        action_type: "ai_chat",
        language: "multi",
        prompt: userMessage.content,
        result: fullContent,
        points_used: creditCost,
      });

      // Auto-save if conversation is already saved
      if (currentConvoId) {
        const allMessages = [...messages, userMessage, { id: assistantId, role: "assistant" as const, content: fullContent, timestamp: new Date() }];
        await supabase
          .from("ai_conversations")
          .update({ messages: allMessages.map(m => ({ ...m, timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp })) as any, updated_at: new Date().toISOString() })
          .eq("id", currentConvoId);
      }

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
    setCurrentConvoId(null);
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
              <h2 className="font-semibold text-sm">
                CodeNova AI Chat
                {currentConvoId && <span className="text-muted-foreground font-normal ml-1">• {saveTitle || "Saved"}</span>}
              </h2>
              <p className="text-xs text-muted-foreground">Multi-turn conversation • Ask anything about code</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs mr-1">
              <Sparkles className="w-3 h-3 mr-1" />
              {messages.filter((m) => m.role === "assistant").length} responses
            </Badge>
            <Button variant="ghost" size="sm" onClick={newConversation} title="New Chat">
              <Plus className="w-4 h-4" />
            </Button>

            {/* Save Dialog */}
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={messages.length === 0} title="Save">
                  <Save className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="Conversation title..."
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                  />
                  <Button onClick={saveConversation} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    {currentConvoId ? "Update" : "Save"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Load Dialog */}
            <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" title="Load">
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Saved Conversations</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[400px]">
                  {loadingConvos ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                  ) : savedConversations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No saved conversations yet</p>
                  ) : (
                    <div className="space-y-2">
                      {savedConversations.map((convo) => (
                        <button
                          key={convo.id}
                          onClick={() => loadConversation(convo)}
                          className={`w-full text-left p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors flex items-center justify-between ${currentConvoId === convo.id ? "bg-primary/10 border-primary/30" : ""}`}
                        >
                          <div>
                            <p className="text-sm font-medium">{convo.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {convo.messages.length} messages • {new Date(convo.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={(e) => deleteConversation(convo.id, e)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

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
                Ask CodeNova AI to write code, debug issues, explain concepts, or refactor your code. The AI remembers your entire conversation.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-md">
                {["Write a React hook for dark mode", "Explain async/await in JavaScript", "Create a REST API with Express", "Debug this code for me"].map((suggestion) => (
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
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary h-fit mt-1 shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50 border border-border/50"}`}>
                    {msg.role === "assistant" ? (
                      <div className="space-y-2">
                        {extractCodeBlocks(msg.content).map((part, i) =>
                          part.type === "code" ? (
                            <div key={i} className="rounded-lg overflow-hidden border border-border/50 my-2">
                              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80 text-xs text-muted-foreground border-b border-border/50">
                                <div className="flex items-center gap-2">
                                  <Code2 className="w-3 h-3" />
                                  {part.language}
                                </div>
                                <CopyButton text={part.content} />
                              </div>
                              <CodeOutput code={part.content} language={part.language || "typescript"} isGenerating={false} />
                            </div>
                          ) : (
                            <p key={i} className="text-sm whitespace-pre-wrap leading-relaxed">{part.content}</p>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                    <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {(msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask CodeNova AI anything about code..."
              className="min-h-[48px] max-h-[120px] resize-none bg-muted/30 border-border/50 focus:border-primary"
              rows={1}
            />
            <Button onClick={sendMessage} disabled={isStreaming || !input.trim()} size="icon" className="h-12 w-12 shrink-0">
              {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
