import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import LanguageSelector from "@/components/LanguageSelector";
import {
  ArrowLeft,
  Save,
  Download,
  Play,
  Code2,
  FolderOpen,
  Plus,
  Cloud,
  Loader2,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const languageExtensions: Record<string, string> = {
  typescript: "ts",
  javascript: "js",
  python: "py",
  java: "java",
  csharp: "cs",
  cpp: "cpp",
  c: "c",
  go: "go",
  rust: "rs",
  ruby: "rb",
  php: "php",
  swift: "swift",
  kotlin: "kt",
  dart: "dart",
  html: "html",
  css: "css",
  sql: "sql",
  bash: "sh",
  powershell: "ps1",
  react: "tsx",
  angular: "ts",
  vue: "vue",
  svelte: "svelte",
  nextjs: "tsx",
  tailwind: "css",
  graphql: "graphql",
  terraform: "tf",
  dockerfile: "dockerfile",
  yaml: "yaml",
  json: "json",
  xml: "xml",
  markdown: "md",
  latex: "tex",
  r: "r",
  scala: "scala",
};

export default function CodeIDE() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [fileName, setFileName] = useState("untitled");
  const [language, setLanguage] = useState("typescript");
  const [saving, setSaving] = useState(false);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await fetchProjects(session.user.id);
      setLoading(false);
    };
    checkSession();
  }, [navigate]);

  const fetchProjects = async (userId: string) => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    setSavedProjects(data || []);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (currentProjectId) {
        const { error } = await supabase
          .from("projects")
          .update({ code, name: fileName, language, updated_at: new Date().toISOString() })
          .eq("id", currentProjectId);
        if (error) throw error;
        toast({ title: "Saved to Cloud!", description: `${fileName} saved successfully.` });
      } else {
        const { data, error } = await supabase
          .from("projects")
          .insert({ user_id: user.id, name: fileName, language, code, description: `IDE project - ${language}` })
          .select("id")
          .single();
        if (error) throw error;
        setCurrentProjectId(data.id);
        toast({ title: "Saved to Cloud!", description: `${fileName} created successfully.` });
      }
      await fetchProjects(user.id);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const ext = languageExtensions[language] || "txt";
    const fullName = `${fileName}.${ext}`;
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fullName;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: `${fullName} downloaded.` });
  };

  const handleRun = () => {
    setShowOutput(true);
    if (language === "javascript" || language === "typescript") {
      try {
        const logs: string[] = [];
        const mockConsole = { log: (...args: any[]) => logs.push(args.map(String).join(" ")) };
        const fn = new Function("console", code);
        fn(mockConsole);
        setOutput(logs.join("\n") || "✅ Code executed successfully (no output).");
      } catch (err: any) {
        setOutput(`❌ Error: ${err.message}`);
      }
    } else if (language === "html") {
      setOutput("📄 HTML preview — use Download to view in browser.");
    } else {
      setOutput(`⚙️ ${language.toUpperCase()} execution is not supported in the browser.\nUse Download to run locally.`);
    }
  };

  const loadProject = (project: any) => {
    setCurrentProjectId(project.id);
    setFileName(project.name);
    setLanguage(project.language);
    setCode(project.code || "");
    toast({ title: "Loaded", description: `${project.name} loaded from Cloud.` });
  };

  const handleNew = () => {
    setCurrentProjectId(null);
    setFileName("untitled");
    setCode("");
    setLanguage("typescript");
    setOutput("");
    setShowOutput(false);
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    },
    [code, fileName, language, currentProjectId]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="border-b border-border/50 bg-card/80 backdrop-blur-xl px-4 py-2 flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">CodeNova IDE</span>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="h-8 text-sm bg-background/50"
            placeholder="File name..."
          />
          <Badge variant="outline" className="text-xs shrink-0">
            .{languageExtensions[language] || "txt"}
          </Badge>
        </div>

        <LanguageSelector value={language} onChange={setLanguage} />

        <div className="flex items-center gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={handleNew}>
            <Plus className="w-3 h-3 mr-1" />
            New
          </Button>
          <Button size="sm" variant="outline" onClick={handleRun}>
            <Play className="w-3 h-3 mr-1" />
            Run
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload} disabled={!code.trim()}>
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !code.trim()}>
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Cloud className="w-3 h-3 mr-1" />}
            Save to Cloud
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Saved Projects */}
        <div className="w-56 border-r border-border/50 bg-card/50 overflow-y-auto hidden md:block">
          <div className="p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />
              Cloud Projects
            </p>
            {savedProjects.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">No projects yet</p>
            )}
            {savedProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => loadProject(p)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors mb-0.5 ${
                  currentProjectId === p.id ? "bg-primary/20 text-primary font-medium" : "text-foreground"
                }`}
              >
                <div className="truncate font-medium">{p.name}</div>
                <div className="text-[10px] text-muted-foreground">{p.language}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`// Start writing your ${language} code here...\n// Press Ctrl+S to save to Cloud\n// Click Run to execute (JS/TS only)`}
            className="flex-1 resize-none font-mono text-sm bg-background border-0 rounded-none focus-visible:ring-0 min-h-0 p-4"
            style={{ tabSize: 2 }}
          />

          {/* Output Panel */}
          {showOutput && (
            <div className="border-t border-border/50 bg-card/80 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
                <span className="text-xs font-semibold text-muted-foreground">Output</span>
                <Button variant="ghost" size="sm" className="h-5 text-xs" onClick={() => setShowOutput(false)}>
                  Close
                </Button>
              </div>
              <pre className="p-3 text-xs font-mono text-foreground whitespace-pre-wrap">{output}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
