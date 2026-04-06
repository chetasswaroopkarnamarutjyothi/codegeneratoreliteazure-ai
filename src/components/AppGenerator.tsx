import { useState, useRef } from "react";
import { Layers, Copy, Check, Loader2, Sparkles, Layout, Save, ImageIcon, Download, Rocket, Code2, Monitor, Smartphone, Globe, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "./LanguageSelector";
import CodeOutput from "./CodeOutput";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useUsageHistory } from "@/hooks/useUsageHistory";
import { useParentNotification } from "@/hooks/useParentNotification";
import { supabase } from "@/integrations/supabase/client";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-app`;
const IMAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`;

interface AppGeneratorProps {
  userId?: string;
}

const APP_TEMPLATES = [
  { id: "todo", name: "Todo App", desc: "Task management with CRUD", icon: "✅", prompt: "Create a modern todo app with add, edit, delete, mark complete, filter by status, and local storage persistence" },
  { id: "ecommerce", name: "E-Commerce", desc: "Product catalog & cart", icon: "🛒", prompt: "Create an e-commerce product page with product grid, filters, shopping cart, and checkout form" },
  { id: "dashboard", name: "Dashboard", desc: "Analytics dashboard", icon: "📊", prompt: "Create an analytics dashboard with charts, stats cards, recent activity feed, and data tables" },
  { id: "chat", name: "Chat App", desc: "Real-time messaging UI", icon: "💬", prompt: "Create a chat application with message list, input, user avatars, timestamps, and typing indicator" },
  { id: "blog", name: "Blog/CMS", desc: "Content management", icon: "📝", prompt: "Create a blog with post listing, individual post view, categories, search, and markdown rendering" },
  { id: "portfolio", name: "Portfolio", desc: "Personal portfolio", icon: "🎨", prompt: "Create a stunning personal portfolio with hero section, projects grid, skills, about section, and contact form" },
  { id: "social", name: "Social Feed", desc: "Social media feed", icon: "👥", prompt: "Create a social media feed with posts, likes, comments, user profiles, and infinite scroll" },
  { id: "weather", name: "Weather App", desc: "Weather dashboard", icon: "🌤️", prompt: "Create a weather dashboard with current conditions, 7-day forecast, hourly breakdown, and location search" },
];

const FRAMEWORK_OPTIONS = [
  { id: "react", name: "React", icon: <Code2 className="w-4 h-4" />, desc: "Web application" },
  { id: "react_native", name: "React Native", icon: <Smartphone className="w-4 h-4" />, desc: "Mobile app" },
  { id: "nextjs", name: "Next.js", icon: <Globe className="w-4 h-4" />, desc: "Full-stack web" },
  { id: "html", name: "HTML/CSS/JS", icon: <Monitor className="w-4 h-4" />, desc: "Static site" },
];

export default function AppGenerator({ userId }: AppGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("react");
  const [code, setCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedFramework, setSelectedFramework] = useState("react");
  const [qualityMode, setQualityMode] = useState<"standard" | "enhanced">("standard");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const { points, deductPoints, getTotalPoints, subscriptionType } = useUserPoints(userId);
  const { addHistoryItem } = useUsageHistory(userId);
  const { notifyParent } = useParentNotification();

  const buildEnhancedPrompt = (basePrompt: string) => {
    const frameworkHints: Record<string, string> = {
      react: "Use React with hooks, proper state management, clean component structure, TypeScript types, and Tailwind CSS for styling.",
      react_native: "Generate React Native code with proper StyleSheet, navigation setup, platform-specific handling, and responsive layouts.",
      nextjs: "Generate Next.js code with App Router, server components where applicable, API routes, and proper SSR/SSG patterns.",
      html: "Generate clean HTML5 with modern CSS (flexbox/grid), vanilla JavaScript with ES6+, and responsive design.",
    };

    const qualityHints = qualityMode === "enhanced"
      ? " Follow best practices: proper error handling, loading states, accessibility (ARIA labels), responsive design, input validation, and clean code architecture. Add helpful comments."
      : "";

    return `${basePrompt}\n\nFramework: ${selectedFramework}. ${frameworkHints[selectedFramework] || ""}${qualityHints}`;
  };

  const generateApp = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (getTotalPoints() < 5) {
      toast.error("Insufficient CodeNova Credits. Please upgrade.");
      navigate("/payment");
      return;
    }

    setIsGenerating(true);
    setCode("");

    try {
      const { success, error: deductError } = await deductPoints(5);
      if (!success) {
        toast.error(deductError || "Failed to deduct credits");
        setIsGenerating(false);
        return;
      }

      const enhancedPrompt = buildEnhancedPrompt(finalPrompt);

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt: enhancedPrompt, language: selectedFramework === "react_native" ? "react" : language, subscriptionType }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limit exceeded. Try again shortly.");
        else if (resp.status === 402) toast.error("Usage limit reached. Add credits.");
        else toast.error("Failed to generate app. Try again.");
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
          if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) { fullCode += content; setCode(fullCode); }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "" || !raw.startsWith("data: ")) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) { fullCode += content; setCode(fullCode); }
          } catch {}
        }
      }

      await addHistoryItem({ action_type: "app_generation", language: selectedFramework, prompt: finalPrompt, result: fullCode, points_used: 5 });
      await notifyParent("", "", "app_generation", finalPrompt);
      toast.success("App code generated! (-5 credits)");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Something went wrong. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAsProject = async () => {
    if (!code || !userId) { toast.error("Generate code first"); return; }
    if (!projectName.trim()) { toast.error("Enter a project name"); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.from("projects").insert({ user_id: userId, name: projectName, description: prompt, language: selectedFramework, code });
      if (error) throw error;
      toast.success("Project saved!");
      setProjectName("");
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Failed to copy"); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); generateApp(); }
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) { toast.error("Enter an image description"); return; }
    if (getTotalPoints() < 5) { toast.error("Insufficient credits"); navigate("/payment"); return; }
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    try {
      const { success, error: deductError } = await deductPoints(5);
      if (!success) { toast.error(deductError || "Failed to deduct credits"); setIsGeneratingImage(false); return; }
      const resp = await fetch(IMAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ prompt: imagePrompt }),
      });
      if (!resp.ok) { toast.error("Failed to generate image"); setIsGeneratingImage(false); return; }
      const data = await resp.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        await addHistoryItem({ action_type: "image_generation", language: "image", prompt: imagePrompt, result: data.imageUrl, points_used: 5 });
        toast.success("Image generated! (-5 credits)");
      }
    } catch (error) {
      console.error("Image error:", error);
      toast.error("Failed to generate image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="generate" className="flex items-center gap-2 py-3">
            <Rocket className="w-4 h-4" /> Generate
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2 py-3">
            <Layout className="w-4 h-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2 py-3">
            <ImageIcon className="w-4 h-4" /> Assets
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          {/* Framework Selection */}
          <div className="glass rounded-xl p-4">
            <Label className="text-sm font-medium mb-3 block">Framework / Platform</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FRAMEWORK_OPTIONS.map((fw) => (
                <button
                  key={fw.id}
                  onClick={() => setSelectedFramework(fw.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                    selectedFramework === fw.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  {fw.icon}
                  <div>
                    <p className="text-sm font-medium">{fw.name}</p>
                    <p className="text-xs text-muted-foreground">{fw.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quality Mode */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-5 h-5 text-accent" />
              <Label className="text-sm font-medium">Code Quality</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setQualityMode("standard")}
                className={`p-3 rounded-lg border text-left transition-all ${
                  qualityMode === "standard" ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <p className="text-sm font-medium">Standard</p>
                <p className="text-xs text-muted-foreground">Quick generation, 5 credits</p>
              </button>
              <button
                onClick={() => setQualityMode("enhanced")}
                className={`p-3 rounded-lg border text-left transition-all ${
                  qualityMode === "enhanced" ? "border-accent bg-accent/10" : "border-border bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium">Enhanced</p>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">PRO</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Better code, accessibility, 5 credits</p>
              </button>
            </div>
          </div>

          {/* Input */}
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20 text-accent">
                <Layout className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold">Describe your application</h2>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-1 space-y-3">
                <Textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., Create a todo app with add, delete, and complete functionality..."
                  className="min-h-[120px] resize-none bg-muted/50 border-border focus:border-accent focus:glow-border transition-all"
                />
                <p className="text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs">⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs">Enter</kbd> to generate • 5 credits
                </p>
              </div>

              <div className="space-y-3">
                <LanguageSelector value={language} onChange={setLanguage} />
                <Button
                  onClick={() => generateApp()}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full bg-accent hover:bg-accent/90 hover:scale-[1.02] transition-transform"
                  size="lg"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Layers className="w-4 h-4 mr-2" /> Generate App</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" /> Pre-built Templates
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start with a template and customize it with your own requirements
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {APP_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    setPrompt(tpl.prompt);
                    setActiveTab("generate");
                    toast.info(`Template "${tpl.name}" loaded. Click Generate!`);
                  }}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/50 transition-all text-left group"
                >
                  <span className="text-2xl">{tpl.icon}</span>
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground">{tpl.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-accent" />
                AI Image Generation for Apps
              </CardTitle>
              <CardDescription>Generate custom images, icons, and assets for your app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Describe the image (e.g., 'Modern app icon with gradient blue')"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={generateImage} disabled={isGeneratingImage || !imagePrompt.trim()} className="bg-accent hover:bg-accent/90">
                  {isGeneratingImage ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate (5 credits)</>
                  )}
                </Button>
              </div>
              {generatedImage && (
                <div className="relative">
                  <img src={generatedImage} alt="Generated" className="w-full max-w-md mx-auto rounded-lg border border-border" />
                  <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={() => {
                    const link = document.createElement('a');
                    link.href = generatedImage;
                    link.download = 'generated-image.png';
                    link.click();
                  }}>
                    <Download className="w-4 h-4 mr-1" /> Download
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Output Section - always visible */}
      {(code || isGenerating) && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-destructive/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Layers className="w-4 h-4" />
                <span className="font-mono">{selectedFramework} app</span>
                {qualityMode === "enhanced" && <Badge variant="secondary" className="text-[10px]">Enhanced</Badge>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {code && (
                <>
                  <Input placeholder="Project name..." value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-40 h-8 text-sm" />
                  <Button variant="outline" size="sm" onClick={saveAsProject} disabled={isSaving || !projectName.trim()}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1.5" /> Save</>}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={copyToClipboard} className="text-muted-foreground hover:text-foreground">
                    {copied ? <><Check className="w-4 h-4 mr-1.5 text-green-500" /> Copied</> : <><Copy className="w-4 h-4 mr-1.5" /> Copy</>}
                  </Button>
                </>
              )}
            </div>
          </div>
          <CodeOutput code={code} language={language} isGenerating={isGenerating} />
        </div>
      )}
    </div>
  );
}
