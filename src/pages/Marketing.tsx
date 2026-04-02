import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Video, ShieldCheck, Loader2, Sparkles, Film, 
  FileText, ArrowLeft, Download, Clapperboard
} from "lucide-react";
import codenovaIcon from "@/assets/codenova-icon.png";

type VideoMode = "promo" | "storyboard";

export default function Marketing() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [videoMode, setVideoMode] = useState<VideoMode>("promo");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }
      
      // Check admin role directly
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: session.user.id });
      if (!isAdmin) {
        toast({ title: "Access Denied", description: "Only admins can access Marketing Studio.", variant: "destructive" });
        navigate("/");
        return;
      }
      
      setAuthenticated(true);
      setCheckingAuth(false);
    };
    checkAccess();
  }, [navigate, toast]);

  const generateVideo = async () => {
    if (!videoPrompt.trim()) {
      toast({ title: "Enter a prompt", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setGeneratedContent("");
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-marketing-video`,
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
        toast({ title: "Generation failed", variant: "destructive" });
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
            if (content) { fullContent += content; setGeneratedContent(fullContent); }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
      toast({ title: "✅ Generated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (checkingAuth || !authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--primary)/0.08)_0%,_transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_hsl(var(--accent)/0.08)_0%,_transparent_50%)]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
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
                <p className="text-sm text-muted-foreground">AI-powered marketing content</p>
              </div>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/30">
            <img src={codenovaIcon} alt="" className="w-4 h-4 mr-1 rounded" />
            Admin Access
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
          <button onClick={() => setVideoMode("promo")} className={`glass rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02] ${videoMode === "promo" ? "glow-border ring-2 ring-primary" : "hover:glow-border"}`}>
            <div className="p-3 rounded-lg w-fit mb-3 bg-primary/20 text-primary"><Film className="w-6 h-6" /></div>
            <h3 className="font-semibold text-base mb-1">AI Promo Video</h3>
            <p className="text-xs text-muted-foreground">Generate promotional video concepts</p>
          </button>
          <button onClick={() => setVideoMode("storyboard")} className={`glass rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02] ${videoMode === "storyboard" ? "glow-border ring-2 ring-accent" : "hover:glow-border"}`}>
            <div className="p-3 rounded-lg w-fit mb-3 bg-accent/20 text-accent"><FileText className="w-6 h-6" /></div>
            <h3 className="font-semibold text-base mb-1">Script & Storyboard</h3>
            <p className="text-xs text-muted-foreground">Detailed scripts for production</p>
          </button>
        </div>

        <Card className="glass glow-border max-w-4xl mx-auto mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              {videoMode === "promo" ? "Create Promo Video Concept" : "Generate Script & Storyboard"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)} placeholder="Describe the marketing video..." className="min-h-[150px] resize-none bg-muted/50 border-border" />
            <div className="flex justify-end">
              <Button onClick={generateVideo} disabled={isGenerating || !videoPrompt.trim()} size="lg">
                {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {generatedContent && (
          <Card className="glass max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {videoMode === "promo" ? <Film className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-accent" />}
                  {videoMode === "promo" ? "Promo Video Concept" : "Script & Storyboard"}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(generatedContent); toast({ title: "Copied!" }); }}>
                  <Download className="w-4 h-4 mr-1" />Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm text-foreground bg-muted/30 rounded-lg p-6 border border-border/50 leading-relaxed max-h-[600px] overflow-y-auto">
                {generatedContent}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
