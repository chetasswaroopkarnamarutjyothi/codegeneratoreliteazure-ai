import { ArrowRight, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onContinue: () => void;
}

export default function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_hsl(var(--background))_70%)]" />
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          <span>Welcome to Leo AI</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          <span className="gradient-text animate-gradient">Leo AI</span>
          <span className="text-foreground"> Platform</span>
        </h1>

        <p className="text-lg text-muted-foreground mb-8">
          Generate production-ready code, build complete applications, and verify your code with the power of AI.
        </p>

        <div className="glass rounded-xl p-6 mb-8 inline-block">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <User className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">Code Author</h3>
          </div>
          <p className="text-muted-foreground text-lg">Karnam Chetas Swaroop</p>
        </div>

        <div className="glass rounded-xl p-6 mb-8">
          <h3 className="font-semibold mb-2">Website Owner</h3>
          <p className="text-muted-foreground">
            Karnam Chetas Swaroop
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            (VII F Shishya Beml Public School Bangalore)
          </p>
        </div>

        <Button
          onClick={onContinue}
          size="lg"
          className="glow-primary hover:scale-[1.02] transition-transform"
        >
          Continue to Platform
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()} Leo AI Limited. All rights reserved.
        </p>
      </div>
    </div>
  );
}
