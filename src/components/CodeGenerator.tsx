import { useState, useRef, useEffect } from "react";
import { Code2, Copy, Check, Loader2, Sparkles, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "./LanguageSelector";
import ModelSelector from "./ModelSelector";
import CodeOutput from "./CodeOutput";
import { ProfessionalCodeToggle } from "./ProfessionalCodeToggle";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useUsageHistory } from "@/hooks/useUsageHistory";
import { useParentNotification } from "@/hooks/useParentNotification";
import { supabase } from "@/integrations/supabase/client";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-code`;

interface CodeGeneratorProps {
  userId?: string;
}

export default function CodeGenerator({ userId }: CodeGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [code, setCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [professionalMode, setProfessionalMode] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [selectedModel, setSelectedModel] = useState("auto");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const { points, deductPoints, getTotalPoints, subscriptionType, isAdmin } = useUserPoints(userId);
  const { addHistoryItem } = useUsageHistory(userId);
  const { notifyParent } = useParentNotification();

  useEffect(() => {
    if (!userId) return;
    const checkEmployee = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "employee")
        .maybeSingle();
      setIsEmployee(!!data);
    };
    checkEmployee();
  }, [userId]);

  const generateCode = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    const creditCost = professionalMode ? 50 : 5;

    // Check if user has enough points
    if (getTotalPoints() < creditCost) {
      toast.error(`Insufficient CodeNova Credits. Need ${creditCost} credits.`);
      navigate("/payment");
      return;
    }

    // Professional mode: check monthly limit for free users
    if (professionalMode && subscriptionType === "free" && !isAdmin && !isEmployee) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("professional_code_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId!)
        .gte("used_at", startOfMonth.toISOString());
      if ((count || 0) >= 1) {
        toast.error("Free users can generate professional code once per month. Upgrade to Pro+ (₹5,000 + ₹2,000) for unlimited.");
        navigate("/payment?plan=pro_plus_monthly");
        return;
      }
    }

    setIsGenerating(true);
    setCode("");

    try {
      // Deduct points first
      const { success, error: deductError } = await deductPoints(creditCost);
      if (!success) {
        toast.error(deductError || "Failed to deduct credits");
        setIsGenerating(false);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt, language, subscriptionType, professionalMode, model: selectedModel }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast.error("Rate limit exceeded. Please try again in a moment.");
        } else if (resp.status === 402) {
          toast.error("Usage limit reached. Please add credits to continue.");
        } else {
          toast.error("Failed to generate code. Please try again.");
        }
        setIsGenerating(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullCode = "";

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
              fullCode += content;
              setCode(fullCode);
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
              fullCode += content;
              setCode(fullCode);
            }
          } catch {
            /* ignore */
          }
        }
      }

      // Record usage
      await addHistoryItem({
        action_type: professionalMode ? "professional_code_generation" : "code_generation",
        language,
        prompt,
        result: fullCode,
        points_used: creditCost,
      });

      // Track professional code usage
      if (professionalMode && userId) {
        await supabase.from("professional_code_usage").insert({
          user_id: userId,
          prompt,
          language,
          credits_used: creditCost,
        });

        // Employee salary deduction check (50+ times)
        if (isEmployee) {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          const { count } = await supabase
            .from("professional_code_usage")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("used_at", startOfMonth.toISOString());
          if ((count || 0) >= 50) {
            toast.warning("⚠️ 50+ professional codes this month. 10% salary deduction will apply automatically.");
          }
        }
      }
      
      // Notify parent if applicable
      await notifyParent("", "", "code_generation", prompt);

      toast.success(`Code generated successfully! (-${creditCost} credits)`);
    } catch (error) {
      console.error("Error generating code:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      generateCode();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Input Section */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Terminal className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold">CodeNova AI — Describe your code</h2>
        </div>

        <div className="flex gap-4 items-start">
          <div className="flex-1 space-y-3">
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Create a function that validates email addresses with regex..."
              className="min-h-[120px] resize-none bg-muted/50 border-border focus:border-primary focus:glow-border transition-all"
            />
            <ProfessionalCodeToggle
              userId={userId}
              subscriptionType={subscriptionType}
              isAdmin={isAdmin}
              isEmployee={isEmployee}
              enabled={professionalMode}
              onToggle={setProfessionalMode}
            />
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs">⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs">Enter</kbd> to generate • Costs {professionalMode ? 50 : 5} credits
            </p>
          </div>

          <div className="space-y-3">
            <LanguageSelector value={language} onChange={setLanguage} />
            <Button
              onClick={generateCode}
              disabled={isGenerating || !prompt.trim()}
              className="w-full glow-primary hover:scale-[1.02] transition-transform"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Output Section */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-destructive/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Code2 className="w-4 h-4" />
              <span className="font-mono">{language}</span>
            </div>
          </div>

          {code && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1.5" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>

        <CodeOutput code={code} language={language} isGenerating={isGenerating} />
      </div>
    </div>
  );
}
