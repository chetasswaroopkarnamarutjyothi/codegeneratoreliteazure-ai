import { useState, useRef } from "react";
import { ShieldCheck, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "./LanguageSelector";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useUsageHistory } from "@/hooks/useUsageHistory";
import { useParentNotification } from "@/hooks/useParentNotification";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-code`;

interface VerificationResult {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  summary: string;
}

interface CodeVerifierProps {
  userId?: string;
}

export default function CodeVerifier({ userId }: CodeVerifierProps) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const { deductPoints, getTotalPoints } = useUserPoints(userId);
  const { addHistoryItem } = useUsageHistory(userId);
  const { notifyParent } = useParentNotification();

  const verifyCode = async () => {
    if (!code.trim()) {
      toast.error("Please enter code to verify");
      return;
    }

    // Check if user has enough points
    if (getTotalPoints() < 5) {
      toast.error("Insufficient Azure AI Power Credits. Please upgrade to Pro or Pro+.");
      navigate("/payment");
      return;
    }

    setIsVerifying(true);
    setResult(null);

    try {
      // Deduct points first
      const { success, error: deductError } = await deductPoints(5);
      if (!success) {
        toast.error(deductError || "Failed to deduct credits");
        setIsVerifying(false);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ code, language }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error("Rate limit exceeded. Please try again in a moment.");
        } else if (resp.status === 402) {
          toast.error("Usage limit reached. Please add credits to continue.");
        } else {
          toast.error("Failed to verify code. Please try again.");
        }
        setIsVerifying(false);
        return;
      }

      const data = await resp.json();
      setResult(data);

      // Record usage
      await addHistoryItem({
        action_type: "code_verification",
        language,
        prompt: code.slice(0, 200),
        result: JSON.stringify(data),
        points_used: 5,
      });
      
      // Notify parent if applicable
      await notifyParent("", "", "code_verification", `Verified ${language} code`);
      
      if (data.isValid) {
        toast.success("Code verification passed! (-5 credits)");
      } else {
        toast.warning("Code has some issues to review (-5 credits)");
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      verifyCode();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Input Section */}
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20 text-green-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold">Paste your code to verify</h2>
        </div>

        <div className="flex gap-4 items-start">
          <div className="flex-1 space-y-3">
            <Textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste your code here to check for errors, bugs, and improvements..."
              className="min-h-[200px] resize-none bg-muted/50 border-border focus:border-green-500 font-mono text-sm transition-all"
            />
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs">⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs">Enter</kbd> to verify • Costs 5 credits
            </p>
          </div>

          <div className="space-y-3">
            <LanguageSelector value={language} onChange={setLanguage} />
            <Button
              onClick={verifyCode}
              disabled={isVerifying || !code.trim()}
              className="w-full bg-green-600 hover:bg-green-600/90 hover:scale-[1.02] transition-transform"
              size="lg"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Verify Code
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Result Section */}
      {result && (
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            {result.isValid ? (
              <>
                <div className="p-2 rounded-lg bg-green-500/20 text-green-500">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-green-500">Code Looks Good!</h3>
              </>
            ) : (
              <>
                <div className="p-2 rounded-lg bg-destructive/20 text-destructive">
                  <XCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-destructive">Issues Found</h3>
              </>
            )}
          </div>

          <p className="text-muted-foreground">{result.summary}</p>

          {result.issues.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" />
                Issues
              </h4>
              <ul className="space-y-1">
                {result.issues.map((issue, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-destructive">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Suggestions
              </h4>
              <ul className="space-y-1">
                {result.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-yellow-500">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
