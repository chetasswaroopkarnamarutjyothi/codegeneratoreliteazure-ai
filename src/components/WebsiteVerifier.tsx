import { useState } from "react";
import { Globe, Loader2, Sparkles, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useUsageHistory } from "@/hooks/useUsageHistory";

interface WebsiteVerifierProps {
  userId?: string;
}

export default function WebsiteVerifier({ userId }: WebsiteVerifierProps) {
  const [url, setUrl] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const { deductPoints, getTotalPoints } = useUserPoints(userId);
  const { addHistoryItem } = useUsageHistory(userId);

  const analyzeWebsite = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    // Basic URL validation
    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    try {
      new URL(finalUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    if (getTotalPoints() < 5) {
      toast.error("Insufficient credits.");
      navigate("/payment");
      return;
    }

    setIsAnalyzing(true);
    setSuggestions("");

    try {
      const { success, error } = await deductPoints(5);
      if (!success) {
        toast.error(error || "Failed to deduct credits");
        setIsAnalyzing(false);
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-website`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ url: finalUrl }),
        }
      );

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limit exceeded.");
        else if (resp.status === 402) toast.error("Usage limit reached.");
        else toast.error("Failed to analyze website.");
        setIsAnalyzing(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullContent = "";

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
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) { fullContent += c; setSuggestions(fullContent); }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      await addHistoryItem({
        action_type: "website_verification",
        language: "url",
        prompt: finalUrl,
        result: fullContent,
        points_used: 5,
      });

      toast.success("Website analyzed! (-5 credits)");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Input */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">CodeNova Website Verifier</h2>
            <p className="text-sm text-muted-foreground">Enter a URL to get AI-powered improvement suggestions</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="pl-10 bg-muted/50 border-border"
              onKeyDown={(e) => { if (e.key === "Enter") analyzeWebsite(); }}
            />
          </div>
          <Button
            onClick={analyzeWebsite}
            disabled={isAnalyzing || !url.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] transition-transform"
            size="lg"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Analyze (5 credits)</>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          AI will analyze the website's design, performance, SEO, accessibility, and provide actionable improvement suggestions.
        </p>
      </div>

      {/* Output */}
      {suggestions && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="w-4 h-4" />
              <span className="font-mono">analysis-report</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(url.startsWith("http") ? url : `https://${url}`, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-1" /> Visit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(suggestions);
                  setCopied(true);
                  toast.success("Copied!");
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <><Check className="w-4 h-4 mr-1 text-green-500" />Copied</> : <><Copy className="w-4 h-4 mr-1" />Copy</>}
              </Button>
            </div>
          </div>
          <div className="p-6">
            <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed max-h-[600px] overflow-y-auto">
              {suggestions}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
