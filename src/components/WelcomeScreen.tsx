import { ArrowRight, Sparkles, User, AlertTriangle, CheckCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Welcome to StackMind</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text animate-gradient">CodeNova

            </span>
            <span className="text-foreground"> Platform</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-6">
            CodeNova AI by StackMind Technologies — Generate production-ready code, build complete applications, and verify your code with the power of AI.
          </p>
        </div>

        {/* Important Guidelines */}
        <Card className="glass border-yellow-500/30 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="w-5 h-5" />
              Important: How This Platform Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="font-medium text-foreground mb-2">We Do NOT Provide "AI Does Everything" Services</p>
              <p className="text-muted-foreground">
                This platform is designed for <strong>learning and skill development</strong>. We believe that manually working with code 
                helps you gain valuable knowledge that you wouldn't get if AI did everything automatically.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Step 1: Generate Code</p>
                  <p className="text-muted-foreground">Use the Code Generator or App Generator to create your code.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Step 2: Verify Your Code (Critical!)</p>
                  <p className="text-muted-foreground">
                    Before using or publishing ANY code, you <strong>MUST verify it using the Code Verifier</strong>. 
                    Run verification at least <strong>200+ times</strong> until you get <strong>ZERO suggestions</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Step 3: Iterate Until Perfect</p>
                  <p className="text-muted-foreground">
                    If the Code Verifier suggests improvements, copy your code along with the suggestions, 
                    paste it into the Code Generator, and regenerate. Repeat this process until you achieve 
                    <strong> 0 suggestions</strong>. Only then is your code ready for production.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-500 font-medium">⚠️ Never publish code that hasn't been fully verified!</p>
            </div>
          </CardContent>
        </Card>

        {/* Admin Credits Info */}
        <Card className="glass mb-6">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium mb-1">Admin Credits (Daily Reset)</p>
                <p className="text-muted-foreground">• Daily: 8,85,000 credits</p>
                <p className="text-muted-foreground">• Monthly: 91,85,000 credits</p>
                <p className="text-muted-foreground">​• Approval Bank: 2,85,000 credits (must be used within the day)</p>
              </div>
              <div>
                <p className="font-medium mb-1">Standard Users</p>
                <p className="text-muted-foreground">• Daily: 50 credits</p>
                <p className="text-muted-foreground">• Each action costs 5 credits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <User className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">​​​​​​​​​​Software Developer & Web Owner       </h3>
            </div>
            <p className="text-muted-foreground">Karnam Chetas Swaroop</p>
            <p className="text-xs text-muted-foreground mt-1">
              ​Student — Grade VII, Shishya BEML Public School, Bengaluru
      
            </p>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">​Platfrom Control  </h3>
            </div>
            <p className="text-muted-foreground">StackMind Technologies Limited</p>
            <p className="text-xs text-muted-foreground mt-1">
              Full control: Karnam Chetas Swaroop   
            </p>
          </div>
        </div>

        <div className="text-center">
          <Button onClick={onContinue} size="lg" className="glow-primary hover:scale-[1.02] transition-transform">

            I Understand, Continue to Platform
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} StackMind Technologies Limited. All rights reserved.
          </p>
        </div>
      </div>
    </div>);

}