import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, Code2, LogOut, Layers, ShieldCheck, User, LayoutDashboard, Settings, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CodeGenerator from "@/components/CodeGenerator";
import AppGenerator from "@/components/AppGenerator";
import CodeVerifier from "@/components/CodeVerifier";
import ToolSelector, { ToolType } from "@/components/ToolSelector";
import WelcomeScreen from "@/components/WelcomeScreen";
import { useUserPoints } from "@/hooks/useUserPoints";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function Index() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedTool, setSelectedTool] = useState<ToolType>("code-generator");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    sessionStorage.removeItem('2fa_completed');
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (showWelcome) {
    return <WelcomeScreen onContinue={() => setShowWelcome(false)} />;
  }

  const getToolTitle = () => {
    switch (selectedTool) {
      case "code-generator":
        return { text: "Code", gradient: true };
      case "app-generator":
        return { text: "App", gradient: true };
      case "code-verifier":
        return { text: "Code", gradient: true };
    }
  };

  const getToolSubtitle = () => {
    switch (selectedTool) {
      case "code-generator":
        return "Generator";
      case "app-generator":
        return "Generator";
      case "code-verifier":
        return "Verifier";
    }
  };

  const getToolDescription = () => {
    switch (selectedTool) {
      case "code-generator":
        return "Transform your ideas into production-ready code. Simply describe what you need, select your language, and let AI do the heavy lifting.";
      case "app-generator":
        return "Generate complete applications with all the components, logic, and styling you need. Describe your app and watch it come to life.";
      case "code-verifier":
        return "Paste your code to check for errors, bugs, and get suggestions for improvements. Keep your code clean and error-free.";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_hsl(var(--background))_70%)]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 flex-1">
        {/* User menu */}
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <PointsDisplay userId={user.id} />
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <LayoutDashboard className="w-4 h-4 mr-1" />
            Dashboard
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
            <Settings className="w-4 h-4 mr-1" />
            Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Powered by AI</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            <span className="gradient-text animate-gradient">{getToolTitle().text}</span>
            <span className="text-foreground"> {getToolSubtitle()}</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {getToolDescription()}
          </p>

          {/* Tool Selector */}
          <ToolSelector value={selectedTool} onChange={setSelectedTool} />
        </header>

        {/* Main Content */}
        <div className="mt-8">
          {selectedTool === "code-generator" && <CodeGenerator />}
          {selectedTool === "app-generator" && <AppGenerator />}
          {selectedTool === "code-verifier" && <CodeVerifier />}
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-12 max-w-4xl mx-auto">
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            title="Lightning Fast"
            description="Get code in seconds with streaming generation"
          />
          <FeatureCard
            icon={<Code2 className="w-5 h-5" />}
            title="35+ Languages"
            description="TypeScript, Python, Angular, React, and more"
          />
          <FeatureCard
            icon={<Sparkles className="w-5 h-5" />}
            title="Smart Context"
            description="AI understands best practices and patterns"
          />
        </div>

        {/* Author Credit */}
        <div className="text-center mt-12">
          <div className="glass rounded-xl p-4 inline-flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <User className="w-4 h-4" />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Code Author:</span> Karnam Chetas Swaroop
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center border-t border-border/50">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Leo AI Limited. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass rounded-xl p-5 hover:glow-border transition-all duration-300 group">
      <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mb-3 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PointsDisplay({ userId }: { userId: string }) {
  const { points, isAdmin, getTotalPoints } = useUserPoints(userId);
  
  return (
    <Badge variant="outline" className="bg-primary/10 border-primary/30">
      <Zap className="w-3 h-3 mr-1 text-primary" />
      {getTotalPoints()} pts
      {isAdmin && <Shield className="w-3 h-3 ml-1 text-yellow-500" />}
    </Badge>
  );
}
