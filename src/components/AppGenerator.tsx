import { useState, useRef } from "react";
import { Layers, Copy, Check, Loader2, Sparkles, Layout, Save, ImageIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const { points, deductPoints, getTotalPoints, subscriptionType } = useUserPoints(userId);
  const { addHistoryItem } = useUsageHistory(userId);
  const { notifyParent } = useParentNotification();

  const generateApp = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    // Check if user has enough points
    if (getTotalPoints() < 5) {
      toast.error("Insufficient Azure AI Power Credits. Please upgrade to Pro or Pro+.");
      navigate("/payment");
      return;
    }

    setIsGenerating(true);
    setCode("");

    try {
      // Deduct points first
      const { success, error: deductError } = await deductPoints(5);
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
        body: JSON.stringify({ prompt, language, subscriptionType }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast.error("Rate limit exceeded. Please try again in a moment.");
        } else if (resp.status === 402) {
          toast.error("Usage limit reached. Please add credits to continue.");
        } else {
          toast.error("Failed to generate app. Please try again.");
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
        action_type: "app_generation",
        language,
        prompt,
        result: fullCode,
        points_used: 5,
      });
      
      // Notify parent if applicable
      await notifyParent("", "", "app_generation", prompt);

      toast.success("App code generated successfully! (-5 credits)");
    } catch (error) {
      console.error("Error generating app:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAsProject = async () => {
    if (!code || !userId) {
      toast.error("Generate code first");
      return;
    }

    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("projects").insert({
        user_id: userId,
        name: projectName,
        description: prompt,
        language,
        code,
      });

      if (error) throw error;

      toast.success("Project saved successfully!");
      setProjectName("");
    } catch (error: any) {
      toast.error(error.message || "Failed to save project");
    } finally {
      setIsSaving(false);
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
      generateApp();
    }
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error("Please enter an image description");
      return;
    }

    if (getTotalPoints() < 5) {
      toast.error("Insufficient credits for image generation");
      navigate("/payment");
      return;
    }

    setIsGeneratingImage(true);
    setGeneratedImage(null);

    try {
      const { success, error: deductError } = await deductPoints(5);
      if (!success) {
        toast.error(deductError || "Failed to deduct credits");
        setIsGeneratingImage(false);
        return;
      }

      const resp = await fetch(IMAGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt: imagePrompt }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (resp.status === 402) {
          toast.error("Payment required. Please add credits.");
        } else {
          toast.error("Failed to generate image");
        }
        setIsGeneratingImage(false);
        return;
      }

      const data = await resp.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        await addHistoryItem({
          action_type: "image_generation",
          language: "image",
          prompt: imagePrompt,
          result: data.imageUrl,
          points_used: 5,
        });
        toast.success("Image generated! (-5 credits)");
      }
    } catch (error) {
      console.error("Image generation error:", error);
      toast.error("Failed to generate image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Input Section */}
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
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs">⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs">Enter</kbd> to generate • Costs 5 credits
            </p>
          </div>

          <div className="space-y-3">
            <LanguageSelector value={language} onChange={setLanguage} />
            <Button
              onClick={generateApp}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-accent hover:bg-accent/90 hover:scale-[1.02] transition-transform"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 mr-2" />
                  Generate App
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
              <Layers className="w-4 h-4" />
              <span className="font-mono">{language} app</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {code && (
              <>
                <Input
                  placeholder="Project name..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-40 h-8 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveAsProject}
                  disabled={isSaving || !projectName.trim()}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1.5" />
                      Save
                    </>
                  )}
                </Button>
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
              </>
            )}
          </div>
        </div>

        <CodeOutput code={code} language={language} isGenerating={isGenerating} />
      </div>

      {/* AI Image Generation Section */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-accent" />
            AI Image Generation for Apps
          </CardTitle>
          <CardDescription>
            Generate custom images, icons, and assets for your application using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Describe the image you want (e.g., 'Modern app icon with gradient blue background')"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={generateImage}
              disabled={isGeneratingImage || !imagePrompt.trim()}
              className="bg-accent hover:bg-accent/90"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate (5 credits)
                </>
              )}
            </Button>
          </div>

          {generatedImage && (
            <div className="relative">
              <img
                src={generatedImage}
                alt="Generated"
                className="w-full max-w-md mx-auto rounded-lg border border-border"
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = generatedImage;
                  link.download = 'generated-image.png';
                  link.click();
                }}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
