import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserPoints } from "@/hooks/useUserPoints";
import { Wrench, Loader2, Sparkles, Copy, ArrowRight } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";

interface CodeRefactorProps {
  userId: string;
}

export default function CodeRefactor({ userId }: CodeRefactorProps) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [result, setResult] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { points, deductPoints } = useUserPoints(userId);
  const { toast } = useToast();

  const handleRefactor = async () => {
    if (!code.trim()) {
      toast({ title: "Enter code", description: "Paste code you want to refactor.", variant: "destructive" });
      return;
    }

    const totalPoints = (points?.daily_points || 0) + (points?.monthly_points || 0);
    if (totalPoints < 5) {
      toast({ title: "Insufficient credits", description: "You need at least 5 credits.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setResult("");

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prompt: `You are a senior code reviewer and refactoring expert. Analyze the following ${language} code and provide:

1. **Issues Found**: List any bugs, anti-patterns, performance issues, or security concerns.
2. **Refactored Code**: Provide the improved, refactored version of the code.
3. **Improvements Summary**: Explain what was changed and why.

Be specific, actionable, and professional.

Code to analyze:
\`\`\`${language}
${code}
\`\`\``,
            language,
            userId,
          }),
        }
      );

      if (!resp.ok || !resp.body) {
        toast({ title: "Analysis failed", variant: "destructive" });
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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setResult(fullContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      await deductPoints(5);
      await supabase.from("usage_history").insert({
        user_id: userId,
        action_type: "code_refactor",
        language,
        prompt: code.slice(0, 500),
        result: fullContent.slice(0, 1000),
        points_used: 5,
      });

      toast({ title: "✅ Analysis complete!", description: "Code reviewed and refactored." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="glass glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-500" />
            Code Refactoring & Analysis
          </CardTitle>
          <CardDescription>
            Paste your code below. AI will analyze it for bugs, anti-patterns, and suggest improvements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LanguageSelector value={language} onChange={setLanguage} />
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here to analyze and refactor..."
            className="min-h-[200px] font-mono text-sm bg-muted/50 border-border"
          />
          <div className="flex justify-between items-center">
            <Badge variant="outline" className="text-xs">
              5 credits per analysis
            </Badge>
            <Button
              onClick={handleRefactor}
              disabled={isAnalyzing || !code.trim()}
              className="glow-primary hover:scale-[1.02] transition-transform"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze & Refactor
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-green-500" />
                Refactoring Results
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(result);
                  toast({ title: "Copied!", description: "Results copied to clipboard." });
                }}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-foreground bg-muted/30 rounded-lg p-6 border border-border/50 leading-relaxed max-h-[600px] overflow-y-auto font-mono">
              {result}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
