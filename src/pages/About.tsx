import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, User, Globe, Shield, Sparkles } from "lucide-react";
import codenovaIcon from "@/assets/codenova-icon.png";

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_hsl(var(--background))_70%)]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">About Us</h1>
            <p className="text-muted-foreground">CodeNova AI by StackMind Technologies</p>
          </div>
        </div>

        {/* Company */}
        <Card className="glass glow-border mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-6">
              <img src={codenovaIcon} alt="CodeNova" className="w-16 h-16 rounded-xl" />
              <div>
                <h2 className="text-2xl font-bold gradient-text animate-gradient">CodeNova AI</h2>
                <p className="text-muted-foreground">by StackMind Technologies Limited</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              CodeNova AI is a next-generation AI-powered code generation platform built by StackMind Technologies Limited. 
              Our mission is to empower developers and organizations with intelligent tools that transform ideas into 
              production-ready code in seconds. Supporting 35+ programming languages and frameworks, CodeNova AI 
              leverages cutting-edge artificial intelligence to deliver fast, reliable, and context-aware code generation.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary"><Sparkles className="w-3 h-3 mr-1" /> AI-Powered</Badge>
              <Badge variant="secondary"><Globe className="w-3 h-3 mr-1" /> 35+ Languages</Badge>
              <Badge variant="secondary"><Shield className="w-3 h-3 mr-1" /> Enterprise Ready</Badge>
            </div>
          </CardContent>
        </Card>

        {/* CEO */}
        <Card className="glass glow-border mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-xl bg-primary/10">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div className="flex-1">
                <Badge variant="outline" className="mb-2 text-yellow-500 border-yellow-500/30">
                  <Building2 className="w-3 h-3 mr-1" />
                  Chief Executive Officer
                </Badge>
                <h3 className="text-2xl font-bold mb-1">Karnam Chetas Swaroop</h3>
                <p className="text-muted-foreground text-sm mb-4">Founder & CEO, StackMind Technologies Limited</p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Karnam Chetas Swaroop is the visionary founder and CEO of StackMind Technologies Limited. 
                  With a deep passion for artificial intelligence and software engineering, he founded StackMind Technologies 
                  with the goal of building intelligent developer tools that make coding faster, smarter, and more accessible. 
                  Under his leadership, CodeNova AI has grown into a powerful platform trusted by developers 
                  for AI-driven code generation, verification, and application building.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  As the head of the company, Chetas oversees all aspects of product development, engineering, 
                  and strategic direction. His commitment to innovation and quality drives every feature 
                  and improvement delivered through the CodeNova AI platform.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <footer className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} StackMind Technologies Limited. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
