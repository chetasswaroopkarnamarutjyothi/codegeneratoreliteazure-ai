import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserPoints } from "@/hooks/useUserPoints";
import { Bug, Loader2, Sparkles, Copy, ArrowRight, RotateCcw, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";

interface CodeFixAIProps {
  userId: string;
}

interface FixIteration {
  iteration: number;
  issues: string[];
  fixedCode: string;
  isClean: boolean;
}

export default function CodeFixAI({ userId }: CodeFixAIProps) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [isProcessing, setIsProcessing] = useState(false);
  const [iterations, setIterations] = useState<FixIteration[]>([]);
  const [currentStep, setCurrentStep] = useState("");
  const { points, deductPoints } = useUserPoints(userId);
  const { toast } = useToast();

  const callAI = async (prompt: string): Promise<string> => {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt, language, userId }),
      }
    );

    if (!resp.ok || !resp.body) throw new Error("AI request failed");

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
          if (content) fullContent += content;
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    return fullContent;
  };

  const verifyCode = async (codeToVerify: string): Promise<{ isValid: boolean; issues: string[] }> => {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ code: codeToVerify, language }),
      }
    );

    if (!resp.ok) throw new Error("Verification failed");
    return await resp.json();
  };

  const handleFixLoop = async () => {
    if (!code.trim()) {
      toast({ title: "Enter code", description: "Paste code to fix.", variant: "destructive" });
      return;
    }

    const totalPoints = (points?.daily_points || 0) + (points?.monthly_points || 0);
    if (totalPoints < 5) {
      toast({ title: "Insufficient credits", description: "You need at least 5 credits.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setIterations([]);
    let currentCode = code;
    const maxIterations = 5;

    try {
      for (let i = 1; i <= maxIterations; i++) {
        // Step 1: Verify
        setCurrentStep(`Iteration ${i}: Verifying code with CodeNova Verifier...`);
        const verification = await verifyCode(currentCode);

        if (verification.isValid || (verification.issues && verification.issues.length === 0)) {
          setIterations(prev => [...prev, {
            iteration: i,
            issues: [],
            fixedCode: currentCode,
            isClean: true,
          }]);
          setCurrentStep("✅ Code is clean! No issues found.");
          break;
        }

        // Step 2: Fix the issues
        setCurrentStep(`Iteration ${i}: Fixing ${verification.issues.length} issue(s)...`);
        const fixPrompt = `You are CodeNova Fix AI. Fix ALL the following issues in this ${language} code. Return ONLY the fixed code, no explanations.

Issues found by CodeNova Verifier:
${verification.issues.map((issue, idx) => `${idx + 1}. ${issue}`).join("\n")}

Code to fix:
\`\`\`${language}
${currentCode}
\`\`\`

Return ONLY the fixed code inside a code block.`;

        const fixedResult = await callAI(fixPrompt);
        
        // Extract code from the response
        const codeMatch = fixedResult.match(/```[\w]*\n([\s\S]*?)```/);
        const fixedCode = codeMatch ? codeMatch[1].trim() : fixedResult.trim();

        setIterations(prev => [...prev, {
          iteration: i,
          issues: verification.issues,
          fixedCode,
          isClean: false,
        }]);

        currentCode = fixedCode;

        // Deduct 5 credits per iteration
        await deductPoints(5);

        if (i === maxIterations) {
          setCurrentStep(`⚠️ Max iterations reached. Code may still have minor issues.`);
        }
      }

      await supabase.from("usage_history").insert({
        user_id: userId,
        action_type: "code_fix_loop",
        language,
        prompt: code.slice(0, 500),
        result: currentCode.slice(0, 1000),
        points_used: 5 * iterations.length || 5,
      });

      toast({ title: "✅ Fix AI complete!", description: "Code has been analyzed and fixed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setCurrentStep("");
    }
  };

  const lastIteration = iterations[iterations.length - 1];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="glass glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-500" />
            CodeNova Fix AI
          </CardTitle>
          <CardDescription>
            Paste your code. Fix AI will verify it, fix issues, re-verify, and loop until the code is clean — automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LanguageSelector value={language} onChange={setLanguage} />
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here. Fix AI will automatically fix all issues..."
            className="min-h-[200px] font-mono text-sm bg-muted/50 border-border"
          />
          <div className="flex justify-between items-center">
            <Badge variant="outline" className="text-xs">
              5 credits per fix iteration (auto-loop)
            </Badge>
            <Button
              onClick={handleFixLoop}
              disabled={isProcessing || !code.trim()}
              className="bg-red-600 hover:bg-red-700 hover:scale-[1.02] transition-transform"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Start Fix Loop
                </>
              )}
            </Button>
          </div>

          {currentStep && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>{currentStep}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Iterations Timeline */}
      {iterations.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              Fix Iterations ({iterations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {iterations.map((iter) => (
              <div key={iter.iteration} className={`p-4 rounded-lg border ${iter.isClean ? "border-green-500/30 bg-green-500/5" : "border-orange-500/30 bg-orange-500/5"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {iter.isClean ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-orange-500" />
                  )}
                  <span className="font-semibold">Iteration {iter.iteration}</span>
                  {iter.isClean && <Badge className="bg-green-500/20 text-green-500">Clean</Badge>}
                  {!iter.isClean && <Badge variant="outline">{iter.issues.length} issues fixed</Badge>}
                </div>

                {iter.issues.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Issues found & fixed:</p>
                    <ul className="space-y-1">
                      {iter.issues.map((issue, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                          <span className="text-orange-500">•</span> {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {/* Final Fixed Code */}
            {lastIteration && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-green-500" />
                    Final Code
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(lastIteration.fixedCode);
                      toast({ title: "Copied!", description: "Fixed code copied to clipboard." });
                    }}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap text-sm bg-muted/30 rounded-lg p-4 border border-border/50 max-h-[400px] overflow-y-auto font-mono">
                  {lastIteration.fixedCode}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
