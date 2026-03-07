import { useState } from "react";
import { Video, Film, FileText, Loader2, Sparkles, Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useUsageHistory } from "@/hooks/useUsageHistory";

interface VideoGeneratorProps {
  userId?: string;
}

export default function VideoGenerator({ userId }: VideoGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"promo" | "storyboard">("promo");
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const { deductPoints, getTotalPoints } = useUserPoints(userId);
  const { addHistoryItem } = useUsageHistory(userId);

  const generateVideo = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe the video you want");
      return;
    }
    if (getTotalPoints() < 10) {
      toast.error("Insufficient credits. Video generation costs 10 credits.");
      navigate("/payment");
      return;
    }

    setIsGenerating(true);
    setContent("");

    try {
      const { success, error } = await deductPoints(10);
      if (!success) {
        toast.error(error || "Failed to deduct credits");
        setIsGenerating(false);
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-marketing-video`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt, mode }),
        }
      );

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limit exceeded.");
        else if (resp.status === 402) toast.error("Usage limit reached.");
        else toast.error("Failed to generate video content.");
        setIsGenerating(false);
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
            if (c) { fullContent += c; setContent(fullContent); }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      await addHistoryItem({
        action_type: "video_generation",
        language: mode,
        prompt,
        result: fullContent,
        points_used: 10,
      });

      toast.success("Video content generated! (-10 credits)");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Mode Toggle */}
      <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
        <button
          onClick={() => setMode("promo")}
          className={`glass rounded-xl p-4 text-center transition-all duration-300 ${
            mode === "promo" ? "glow-border ring-2 ring-primary" : "hover:glow-border"
          }`}
        >
          <Film className="w-5 h-5 mx-auto mb-1 text-primary" />
          <span className="text-sm font-medium">Promo Video</span>
        </button>
        <button
          onClick={() => setMode("storyboard")}
          className={`glass rounded-xl p-4 text-center transition-all duration-300 ${
            mode === "storyboard" ? "glow-border ring-2 ring-accent" : "hover:glow-border"
          }`}
        >
          <FileText className="w-5 h-5 mx-auto mb-1 text-accent" />
          <span className="text-sm font-medium">Script & Storyboard</span>
        </button>
      </div>

      {/* Input */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/20 text-orange-500">
            <Video className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold">
            {mode === "promo" ? "Create Promo Video Concept" : "Generate Script & Storyboard"}
          </h2>
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={mode === "promo"
            ? "Describe the promo video: target audience, tone, key features to highlight, duration..."
            : "Describe the script: storyline, scenes, voiceover style, visual effects..."
          }
          className="min-h-[140px] resize-none bg-muted/50 border-border"
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Costs 10 credits per generation</p>
          <Button
            onClick={generateVideo}
            disabled={isGenerating || !prompt.trim()}
            className="glow-primary hover:scale-[1.02] transition-transform"
            size="lg"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Generate</>
            )}
          </Button>
        </div>
      </div>

      {/* Output */}
      {content && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {mode === "promo" ? <Film className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              <span className="font-mono">{mode === "promo" ? "promo-concept" : "script-storyboard"}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(content);
                setCopied(true);
                toast.success("Copied!");
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <><Check className="w-4 h-4 mr-1 text-green-500" />Copied</> : <><Copy className="w-4 h-4 mr-1" />Copy</>}
            </Button>
          </div>
          <div className="p-6">
            <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed max-h-[600px] overflow-y-auto">
              {content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
