import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Video, Lock, ShieldCheck, Loader2, Sparkles, Film, 
  FileText, ArrowLeft, Download, Play, Clapperboard
} from "lucide-react";
import codenovaIcon from "@/assets/codenova-icon.png";

type AuthStep = "login" | "admin-verify" | "authenticated";
type VideoMode = "promo" | "storyboard";

export default function Marketing() {
  const [authStep, setAuthStep] = useState<AuthStep>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [videoMode, setVideoMode] = useState<VideoMode>("promo");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [videoScript, setVideoScript] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  // Marketing account credentials check
  const handleLogin = async () => {
    if (!email.endsWith("@stackmind.com")) {
      toast({ title: "Access Denied", description: "Only @stackmind.com accounts can access marketing tools.", variant: "destructive" });
      return;
    }
    setIsAuthenticating(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAuthStep("admin-verify");
      toast({ title: "Step 1 Complete", description: "Now verify your admin email to continue." });
    } catch (err: any) {
      toast({ title: "Login Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Admin email verification
  const handleAdminVerify = async () => {
    setIsAuthenticating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if the entered admin email belongs to an actual admin
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", adminEmail)
        .single();

      if (!adminProfile) {
        toast({ title: "Verification Failed", description: "Admin email not found.", variant: "destructive" });
        setIsAuthenticating(false);
        return;
      }

      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: adminProfile.user_id });
      if (!isAdmin) {
        toast({ title: "Access Denied", description: "The email provided does not belong to an admin.", variant: "destructive" });
        setIsAuthenticating(false);
        return;
      }

      setAuthStep("authenticated");
      toast({ title: "✅ Access Granted", description: "Welcome to CodeNova Marketing Studio." });
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const generateVideo = async () => {
    if (!videoPrompt.trim()) {
      toast({ title: "Enter a prompt", description: "Describe the marketing video you want to create.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent("");
    setVideoScript("");

    try {
      const functionName = videoMode === "promo" ? "generate-marketing-video" : "generate-marketing-video";
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt: videoPrompt, mode: videoMode }),
        }
      );

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast({ title: "Rate limited", description: "Try again in a moment.", variant: "destructive" });
        else if (resp.status === 402) toast({ title: "Credits exhausted", variant: "destructive" });
        else toast({ title: "Generation failed", variant: "destructive" });
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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setGeneratedContent(fullContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      toast({ title: "✅ Generated!", description: `${videoMode === "promo" ? "Promo video concept" : "Storyboard"} created.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Login screen
  if (authStep === "login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <Card className="w-full max-w-md glass glow-border relative z-10">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto p-4 rounded-2xl bg-primary/10 w-fit">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Marketing Studio</CardTitle>
            <CardDescription>Sign in with your @stackmind.com account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="email"
              placeholder="your-name@stackmind.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <Button className="w-full" onClick={handleLogin} disabled={isAuthenticating}>
              {isAuthenticating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Sign In
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to CodeNova
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin verification screen
  if (authStep === "admin-verify") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/3 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[100px]" />
        </div>

        <Card className="w-full max-w-md glass glow-border relative z-10">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto p-4 rounded-2xl bg-green-500/10 w-fit">
              <ShieldCheck className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Admin Verification</CardTitle>
            <CardDescription>Enter an admin's email address to verify your access</CardDescription>
            <Badge variant="outline" className="mx-auto bg-green-500/10 text-green-500 border-green-500/30">
              Step 2 of 2
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="email"
              placeholder="Admin email address"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminVerify()}
            />
            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleAdminVerify} disabled={isAuthenticating}>
              {isAuthenticating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Verify & Access
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated - Marketing Studio
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--primary)/0.08)_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_hsl(var(--accent)/0.08)_0%,_transparent_50%)]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Clapperboard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  <span className="gradient-text animate-gradient">CodeNova</span> Marketing Studio
                </h1>
                <p className="text-sm text-muted-foreground">AI-powered marketing content for StackMind Technologies</p>
              </div>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/30">
            <img src={codenovaIcon} alt="" className="w-4 h-4 mr-1 rounded" />
            Admin Access
          </Badge>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
          <button
            onClick={() => setVideoMode("promo")}
            className={`glass rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02] ${
              videoMode === "promo" ? "glow-border ring-2 ring-primary" : "hover:glow-border"
            }`}
          >
            <div className="p-3 rounded-lg w-fit mb-3 bg-primary/20 text-primary">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base mb-1">AI Promo Video</h3>
            <p className="text-xs text-muted-foreground">Generate full promotional video concepts with scenes, narration, and visual direction</p>
          </button>
          <button
            onClick={() => setVideoMode("storyboard")}
            className={`glass rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02] ${
              videoMode === "storyboard" ? "glow-border ring-2 ring-accent" : "hover:glow-border"
            }`}
          >
            <div className="p-3 rounded-lg w-fit mb-3 bg-accent/20 text-accent">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base mb-1">Video Script & Storyboard</h3>
            <p className="text-xs text-muted-foreground">Generate detailed scripts with storyboard descriptions for production</p>
          </button>
        </div>

        {/* Prompt Input */}
        <Card className="glass glow-border max-w-4xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              {videoMode === "promo" ? "Create Promo Video Concept" : "Generate Script & Storyboard"}
            </CardTitle>
            <CardDescription>
              Describe the marketing video you want. Be specific about tone, audience, and key messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              placeholder={videoMode === "promo" 
                ? "e.g., Create a 60-second promo video showcasing CodeNova AI's code generation capabilities. Target audience: developers and CTOs. Tone: professional yet exciting. Highlight speed, accuracy, and 35+ language support."
                : "e.g., Write a video script for a 2-minute explainer about how CodeNova AI helps development teams ship code faster. Include scene descriptions, camera angles, and voiceover narration."
              }
              className="min-h-[150px] resize-none bg-muted/50 border-border"
            />
            <div className="flex justify-end">
              <Button
                onClick={generateVideo}
                disabled={isGenerating || !videoPrompt.trim()}
                className="glow-primary hover:scale-[1.02] transition-transform"
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
                    Generate {videoMode === "promo" ? "Video Concept" : "Script"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Output */}
        {generatedContent && (
          <Card className="glass max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {videoMode === "promo" ? <Film className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-accent" />}
                  {videoMode === "promo" ? "Promo Video Concept" : "Script & Storyboard"}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(generatedContent);
                    toast({ title: "Copied!", description: "Content copied to clipboard." });
                  }}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-foreground bg-muted/30 rounded-lg p-6 border border-border/50 leading-relaxed max-h-[600px] overflow-y-auto">
                  {generatedContent}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
