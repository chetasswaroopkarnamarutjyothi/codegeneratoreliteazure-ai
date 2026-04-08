import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Sparkles, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminDocGeneratorPanel() {
  const [prompt, setPrompt] = useState("");
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateDocument = async () => {
    if (!prompt.trim()) {
      toast({ title: "Enter a prompt", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setGeneratedDoc("");

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
            prompt: `You are a professional document generator for CodeNova AI by StackMind Technologies Limited. Generate a well-structured, formatted document based on the following prompt. Include proper sections, headings, and content. The document should be professional and ready for business use.

Document Header:
- Logo: CodeNova AI
- Company: StackMind Technologies Limited
- © CodeNova AI - All Rights Reserved

Prompt: ${prompt}

Generate the document content in a clean, professional format.`,
            language: "text",
            userId: "admin",
          }),
        }
      );

      if (!resp.ok || !resp.body) {
        toast({ title: "Generation failed", variant: "destructive" });
        setGenerating(false);
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
              setGeneratedDoc(fullContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      toast({ title: "✅ Document generated!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            AI Document Generator
          </CardTitle>
          <CardDescription>Generate professional documents with AI prompts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the document you want to generate... (e.g., 'Generate an employee onboarding guide for StackMind Technologies')"
            className="min-h-[120px]"
          />
          <Button onClick={generateDocument} disabled={generating || !prompt.trim()}>
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Document</>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedDoc && (
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Generated Document</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(generatedDoc);
                  toast({ title: "Copied!" });
                }}
              >
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              {/* Document Header */}
              <div className="text-center mb-6 pb-4 border-b border-border/50">
                <h2 className="text-lg font-bold text-primary">CodeNova AI</h2>
                <p className="text-xs text-muted-foreground">StackMind Technologies Limited</p>
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed max-h-[500px] overflow-y-auto">
                {generatedDoc}
              </pre>
              <div className="text-center mt-6 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">© CodeNova AI - All Rights Reserved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
