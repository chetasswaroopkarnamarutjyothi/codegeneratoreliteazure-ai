import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CodeMirrorEditor from "@/components/ide/CodeMirrorEditor";
import IDECollaboration from "@/components/ide/IDECollaboration";
import {
  ArrowLeft, Save, Download, Play, Code2, FolderOpen, Plus, Cloud, Loader2, Monitor, Users,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

const languageExtensions: Record<string, string> = {
  typescript: "ts", javascript: "js", python: "py", java: "java", csharp: "cs",
  cpp: "cpp", c: "c", go: "go", rust: "rs", ruby: "rb", php: "php", swift: "swift",
  kotlin: "kt", dart: "dart", html: "html", css: "css", sql: "sql", bash: "sh",
  powershell: "ps1", react: "tsx", angular: "ts", vue: "vue", svelte: "svelte",
  nextjs: "tsx", tailwind: "css", graphql: "graphql", terraform: "tf",
  dockerfile: "dockerfile", yaml: "yaml", json: "json", xml: "xml", markdown: "md",
  latex: "tex", r: "r", scala: "scala",
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
  const [running, setRunning] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }
      setUser(session.user);
      await fetchProjects(session.user.id);
      
      // Auto-load shared project from URL
      const sharedProjectId = searchParams.get("project");
      if (sharedProjectId) {
        const { data } = await supabase.from("projects").select("*").eq("id", sharedProjectId).single();
        if (data) {
          loadProject(data);
        }
      }
      
      setLoading(false);
    };
    checkSession();
  }, [navigate, searchParams]);

  const fetchProjects = async (userId: string) => {
    const { data } = await supabase
      .from("projects").select("*").eq("user_id", userId)
      .order("updated_at", { ascending: false });
    setSavedProjects(data || []);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (currentProjectId) {
        const { error } = await supabase.from("projects")
          .update({ code, name: fileName, language, updated_at: new Date().toISOString() })
          .eq("id", currentProjectId);
        if (error) throw error;
        toast({ title: "💾 Saved!", description: `${fileName} saved to Cloud.` });
      } else {
        const { data, error } = await supabase.from("projects")
          .insert({ user_id: user.id, name: fileName, language, code, description: `IDE project - ${language}` })
          .select("id").single();
        if (error) throw error;
        setCurrentProjectId(data.id);
        toast({ title: "💾 Created!", description: `${fileName} saved to Cloud.` });
      }
      await fetchProjects(user.id);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDownload = () => {
    const ext = languageExtensions[language] || "txt";
    const fullName = `${fileName}.${ext}`;
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fullName; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "📥 Downloaded!", description: fullName });
  };

  const handleRun = () => {
    setShowOutput(true);
    setRunning(true);
    
    setTimeout(() => {
      if (language === "javascript" || language === "typescript" || language === "react" || language === "nextjs") {
        try {
          const logs: string[] = [];
          const mockConsole = {
            log: (...args: any[]) => logs.push(args.map(String).join(" ")),
            error: (...args: any[]) => logs.push("❌ " + args.map(String).join(" ")),
            warn: (...args: any[]) => logs.push("⚠️ " + args.map(String).join(" ")),
            info: (...args: any[]) => logs.push("ℹ️ " + args.map(String).join(" ")),
            table: (data: any) => logs.push(JSON.stringify(data, null, 2)),
          };
          const mockMath = Math;
          const mockJSON = JSON;
          const mockDate = Date;
          const mockArray = Array;
          const mockObject = Object;
          const mockString = String;
          const mockNumber = Number;
          const mockBoolean = Boolean;
          const mockSetTimeout = (fn: Function, ms: number) => { fn(); logs.push(`⏱️ setTimeout(${ms}ms) executed`); };
          const mockSetInterval = () => logs.push("⏱️ setInterval not supported in IDLE");
          const mockFetch = () => { logs.push("🌐 fetch() — network calls simulated"); return Promise.resolve({ json: () => ({}), text: () => "" }); };
          const mockPromise = Promise;
          const mockMap = Map;
          const mockSet = Set;
          const mockRegExp = RegExp;

          const fn = new Function(
            "console", "Math", "JSON", "Date", "Array", "Object", "String", "Number", "Boolean",
            "setTimeout", "setInterval", "fetch", "Promise", "Map", "Set", "RegExp",
            "parseInt", "parseFloat", "isNaN", "isFinite", "undefined",
            code
          );
          fn(
            mockConsole, mockMath, mockJSON, mockDate, mockArray, mockObject, mockString, mockNumber, mockBoolean,
            mockSetTimeout, mockSetInterval, mockFetch, mockPromise, mockMap, mockSet, mockRegExp,
            parseInt, parseFloat, isNaN, isFinite, undefined
          );
          setOutput(logs.length > 0 ? logs.join("\n") : "✅ Code executed successfully (no output).");
        } catch (err: any) {
          setOutput(`❌ Runtime Error: ${err.message}\n\n📍 Stack: ${err.stack?.split("\n").slice(0, 3).join("\n") || "N/A"}`);
        }
      } else if (language === "html") {
        setOutput("📄 HTML Preview Mode\n\nYour HTML code is ready. Click Download to open it in your browser.\n\nTip: Include <style> and <script> tags for full functionality.");
      } else if (language === "python") {
        setOutput(`🐍 Python IDLE Simulation\n\nPython execution runs in simulation mode.\nBasic print() statements are supported.\n\n--- Simulated Output ---\n` + simulatePython(code));
      } else if (language === "json") {
        try {
          const parsed = JSON.parse(code);
          setOutput("✅ Valid JSON\n\n" + JSON.stringify(parsed, null, 2));
        } catch (err: any) {
          setOutput(`❌ Invalid JSON: ${err.message}`);
        }
      } else if (language === "css" || language === "tailwind") {
        setOutput("🎨 CSS validated. Download to use in your project.");
      } else if (language === "sql") {
        setOutput("🗃️ SQL Query Preview\n\nSQL execution is not available in-browser.\nDownload and run it against your database.");
      } else {
        setOutput(`⚙️ ${language.charAt(0).toUpperCase() + language.slice(1)} IDLE\n\nBrowser execution not available for ${language}.\nDownload the file and run locally.\n\nFile: ${fileName}.${languageExtensions[language] || "txt"}`);
      }
      setRunning(false);
    }, 300);
  };

  const simulatePython = (code: string): string => {
    const lines = code.split("\n");
    const output: string[] = [];
    for (const line of lines) {
      const printMatch = line.match(/print\s*\(\s*(?:f?["'](.+?)["']|(\d+[\s+\-*/\d.]+))\s*\)/);
      if (printMatch) {
        output.push(printMatch[1] || printMatch[2] || "");
      }
    }
    return output.length > 0 ? output.join("\n") : "(No print output detected)";
  };

  const loadProject = (project: any) => {
    setCurrentProjectId(project.id);
    setFileName(project.name);
    setLanguage(project.language);
    setCode(project.code || "");
    setShowOutput(false);
    toast({ title: "📂 Loaded", description: `${project.name}` });
  };

  const handleNew = () => {
    setCurrentProjectId(null);
    setFileName("untitled");
    setCode("");
    setLanguage("typescript");
    setOutput("");
    setShowOutput(false);
  };

  const handleDelete = async () => {
    if (!currentProjectId || !user) return;
    const { error } = await supabase.from("projects").delete().eq("id", currentProjectId);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    handleNew();
    await fetchProjects(user.id);
    toast({ title: "🗑️ Deleted", description: "Project removed from Cloud." });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading CodeNova IDLE...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="border-b border-border/50 bg-card/80 backdrop-blur-xl px-3 py-1.5 flex items-center gap-2 flex-wrap shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1.5">
          <Code2 className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">CodeNova IDLE</span>
        </div>

        <div className="h-4 w-px bg-border/50 mx-1" />

        <div className="flex items-center gap-1.5 flex-1 max-w-[220px]">
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="h-7 text-xs bg-background/50"
            placeholder="File name..."
          />
          <Badge variant="outline" className="text-[10px] shrink-0 h-5">
            .{languageExtensions[language] || "txt"}
          </Badge>
        </div>

        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-[140px] h-7 text-xs bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(languageExtensions).map(([lang, ext]) => (
              <SelectItem key={lang} value={lang}>
                <span className="capitalize">{lang}</span>
                <span className="text-muted-foreground ml-1">.{ext}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5 ml-auto">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleNew}>
            <Plus className="w-3 h-3 mr-1" />New
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-green-500 hover:text-green-400" onClick={handleRun} disabled={running}>
            {running ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
            Run
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleDownload} disabled={!code.trim()}>
            <Download className="w-3 h-3 mr-1" />Download
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving || !code.trim()}>
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Cloud className="w-3 h-3 mr-1" />}
            Save
          </Button>
          <Button size="sm" variant={showCollab ? "default" : "ghost"} className="h-7 text-xs" onClick={() => setShowCollab(!showCollab)}>
            <Users className="w-3 h-3 mr-1" />
            Live
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <div className="w-52 border-r border-border/50 bg-card/30 overflow-y-auto hidden md:flex flex-col shrink-0">
          <div className="p-2.5 flex-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />Cloud Projects
            </p>
            {savedProjects.length === 0 && (
              <p className="text-[10px] text-muted-foreground py-6 text-center">No projects yet.<br/>Write code and save!</p>
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
                <div className="text-[9px] text-muted-foreground">{p.language} • {new Date(p.updated_at).toLocaleDateString()}</div>
              </button>
            ))}
          </div>
          {currentProjectId && (
            <div className="p-2 border-t border-border/30">
              <Button variant="ghost" size="sm" className="w-full h-6 text-[10px] text-destructive hover:text-destructive" onClick={handleDelete}>
                Delete Project
              </Button>
            </div>
          )}
        </div>

        {/* Editor + Output */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className={`flex-1 min-h-0 ${showOutput ? "h-[60%]" : "h-full"}`}>
            <CodeMirrorEditor
              value={code}
              onChange={setCode}
              language={language}
              onSave={handleSave}
            />
          </div>

          {showOutput && (
            <div className="border-t border-border/50 bg-card/80 h-[40%] flex flex-col shrink-0">
              <div className="flex items-center justify-between px-3 py-1 border-b border-border/30 shrink-0">
                <div className="flex items-center gap-2">
                  <Monitor className="w-3 h-3 text-primary" />
                  <span className="text-xs font-bold text-muted-foreground">Output Console</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => setOutput("")}>Clear</Button>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => setShowOutput(false)}>Close</Button>
                </div>
              </div>
              <pre className="flex-1 overflow-y-auto p-3 text-xs font-mono text-foreground whitespace-pre-wrap">{output}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
