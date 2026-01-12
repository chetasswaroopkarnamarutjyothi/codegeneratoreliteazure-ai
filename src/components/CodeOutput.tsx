import { Code2 } from "lucide-react";

interface CodeOutputProps {
  code: string;
  language: string;
  isGenerating: boolean;
}

export default function CodeOutput({ code, language, isGenerating }: CodeOutputProps) {
  // Clean up markdown code fences if present
  const cleanCode = code
    .replace(/^```[\w]*\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();

  if (!code && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <Code2 className="w-8 h-8" />
        </div>
        <p className="text-sm">Your generated code will appear here</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <pre className="p-6 overflow-x-auto min-h-[300px] max-h-[500px]">
        <code className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {cleanCode}
          {isGenerating && <span className="typing-cursor" />}
        </code>
      </pre>

      {/* Gradient overlay at bottom when content is long */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
    </div>
  );
}
