import { Sparkles, Zap, Code2 } from "lucide-react";
import CodeGenerator from "@/components/CodeGenerator";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_hsl(var(--background))_70%)]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Powered by AI</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            <span className="gradient-text animate-gradient">Code</span>
            <span className="text-foreground"> Generator</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform your ideas into production-ready code. Simply describe what you need,
            select your language, and let AI do the heavy lifting.
          </p>
        </header>

        {/* Main Generator */}
        <CodeGenerator />

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-12 max-w-4xl mx-auto">
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            title="Lightning Fast"
            description="Get code in seconds with streaming generation"
          />
          <FeatureCard
            icon={<Code2 className="w-5 h-5" />}
            title="15+ Languages"
            description="TypeScript, Python, Rust, Go, and more"
          />
          <FeatureCard
            icon={<Sparkles className="w-5 h-5" />}
            title="Smart Context"
            description="AI understands best practices and patterns"
          />
        </div>
      </div>
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
