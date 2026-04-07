import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, Code2, LogOut, Layers, ShieldCheck, User, LayoutDashboard, Settings, Shield, FolderOpen, Info, Terminal, Wrench, Brain, MessageSquarePlus, Megaphone } from "lucide-react";
import codenovaIcon from "@/assets/codenova-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CodeGenerator from "@/components/CodeGenerator";
import AppGenerator from "@/components/AppGenerator";
import CodeVerifier from "@/components/CodeVerifier";
import WebsiteVerifier from "@/components/WebsiteVerifier";
import AIChat from "@/components/AIChat";
import CodeRefactor from "@/components/CodeRefactor";
import ToolSelector, { ToolType } from "@/components/ToolSelector";
import WelcomeScreen from "@/components/WelcomeScreen";
import ProfileCompletionGate from "@/components/ProfileCompletionGate";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ThemeToggle } from "@/components/ThemeToggle";

import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function Index() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedTool, setSelectedTool] = useState<ToolType>("code-generator");
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        if (!session?.user) {
          navigate("/auth");
        } else {
          checkProfileComplete(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/auth");
      } else {
        checkProfileComplete(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkProfileComplete = async (userId: string) => {
    const { data } = await supabase.rpc("is_profile_complete", { p_user_id: userId });
    setProfileComplete(data === true);
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('2fa_completed');
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading || profileComplete === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Show profile completion gate if profile is incomplete
  if (!profileComplete) {
    return (
      <ProfileCompletionGate 
        userId={user.id} 
        onComplete={() => setProfileComplete(true)} 
      />
    );
  }

  if (showWelcome) {
    return <WelcomeScreen onContinue={() => setShowWelcome(false)} />;
  }

  const getToolTitle = () => {
    switch (selectedTool) {
      case "code-generator": return { text: "CodeNova", gradient: true };
      case "app-generator": return { text: "CodeNova", gradient: true };
      case "code-verifier": return { text: "CodeNova", gradient: true };
      case "ai-chat": return { text: "CodeNova", gradient: true };
      case "code-refactor": return { text: "CodeNova", gradient: true };
    }
  };

  const getToolSubtitle = () => {
    switch (selectedTool) {
      case "code-generator": return "Generator";
      case "app-generator": return "App Builder";
      case "code-verifier": return "Verifier";
      case "ai-chat": return "AI Chat";
      case "code-refactor": return "Refactor";
    }
  };

  const getToolDescription = () => {
    switch (selectedTool) {
      case "code-generator": return "Transform your ideas into production-ready code with CodeNova AI by StackMind Technologies.";
      case "app-generator": return "Generate complete applications with CodeNova AI. Describe your app and watch it come to life.";
      case "code-verifier": return "Verify your code with CodeNova AI. Check for errors, bugs, and get improvement suggestions.";
      case "ai-chat": return "Have multi-turn conversations with CodeNova AI. Ask questions, debug code, and get explanations.";
      case "code-refactor": return "Analyze your code for bugs, anti-patterns, and get AI-powered refactoring suggestions.";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Enhanced background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_hsl(var(--background))_70%)]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 flex-1">
        {/* User menu */}
        <div className="absolute top-4 right-4 flex items-center gap-3 flex-wrap justify-end">
          <PointsDisplay userId={user.id} />
          <ThemeToggle />
          
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <LayoutDashboard className="w-4 h-4 mr-1" />
            Dashboard
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
            <FolderOpen className="w-4 h-4 mr-1" />
            Projects
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/ide")}>
            <Terminal className="w-4 h-4 mr-1" />
            IDE
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
            <Settings className="w-4 h-4 mr-1" />
            Profile
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/feedback")}>
            <MessageSquarePlus className="w-4 h-4 mr-1" />
            Feedback
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/announcements")}>
            <Megaphone className="w-4 h-4 mr-1" />
            News
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/about")}>
            <Info className="w-4 h-4 mr-1" />
            About Us
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
            <img src={codenovaIcon} alt="CodeNova" className="w-5 h-5 rounded" />
            <span>CodeNova AI by StackMind Technologies</span>
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
          {selectedTool === "code-generator" && <CodeGenerator userId={user.id} />}
          {selectedTool === "app-generator" && <AppGenerator userId={user.id} />}
          {selectedTool === "code-verifier" && <CodeVerifier userId={user.id} />}
          {selectedTool === "ai-chat" && <AIChat userId={user.id} />}
          {selectedTool === "code-refactor" && <CodeRefactor userId={user.id} />}
        </div>

        {/* Feature Cards - Enhanced */}
        <div className="grid md:grid-cols-4 gap-4 mt-12 max-w-5xl mx-auto">
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
            icon={<Brain className="w-5 h-5" />}
            title="Smart Routing"
            description="AI auto-selects the best model for your task"
          />
          <FeatureCard
            icon={<Wrench className="w-5 h-5" />}
            title="Code Refactor"
            description="AI-powered code analysis and improvement"
          />
        </div>

        {/* Author Credit */}
        <div className="text-center mt-12">
          <div className="glass rounded-xl p-4 inline-flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <User className="w-4 h-4" />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">CodeNova AI</span> by StackMind Technologies — Author: Karnam Chetas Swaroop
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center border-t border-border/50">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} StackMind Technologies Limited. All rights reserved. | CodeNova AI
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
  const { points, isAdmin, getTotalPoints, subscriptionType } = useUserPoints(userId);
  const { profile } = useUserProfile(userId);
  
  const getSubscriptionBadge = () => {
    if (isAdmin) return { label: "Admin", color: "text-yellow-500" };
    if (subscriptionType === "pro_plus") return { label: "Pro+", color: "text-purple-500" };
    if (subscriptionType === "pro") return { label: "Pro", color: "text-blue-500" };
    return null;
  };

  const badge = getSubscriptionBadge();

  return (
    <Badge variant="outline" className="bg-primary/10 border-primary/30">
      <Zap className="w-3 h-3 mr-1 text-primary" />
      {getTotalPoints().toLocaleString()} credits
      {badge && <span className={`ml-1 ${badge.color}`}>• {badge.label}</span>}
      {isAdmin && <Shield className="w-3 h-3 ml-1 text-yellow-500" />}
    </Badge>
  );
}
