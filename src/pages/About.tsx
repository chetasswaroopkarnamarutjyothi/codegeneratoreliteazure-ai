import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, User, Globe, Shield, Sparkles, Code2, GraduationCap, Lightbulb } from "lucide-react";
import codenovaLogo from "@/assets/codenova-logo.png";
import ceoPhoto from "@/assets/ceo-photo.png";

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
              <img src={codenovaLogo} alt="CodeNova AI" className="w-20 h-20 rounded-xl object-contain" />
              <div>
                <h2 className="text-2xl font-bold gradient-text animate-gradient">CodeNova AI</h2>
                <p className="text-muted-foreground">by StackMind Technologies Limited</p>
              </div>
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                CodeNova is an AI-powered code generation platform developed by StackMind Technologies Limited 
                to demonstrate how artificial intelligence can support modern software development. The platform 
                is designed to convert natural language instructions into structured and readable code, making it 
                easier to understand how ideas can be translated into functional programs.
              </p>
              <p>
                The primary objective of CodeNova is educational and exploratory. It provides a practical environment 
                where users can observe how AI models assist in reducing repetitive coding tasks, improving efficiency, 
                and supporting problem-solving. By integrating cloud technologies and secure access mechanisms, the 
                platform also highlights the importance of scalability, reliability, and responsible system design.
              </p>
              <p>
                CodeNova supports multiple programming languages and showcases how intelligent automation can enhance 
                productivity while maintaining clarity and logical structure in code. The project serves as a 
                demonstration of how emerging technologies such as artificial intelligence and cloud computing can be 
                applied in real-world development scenarios.
              </p>
              <p>
                Through CodeNova, the goal is to encourage curiosity, promote hands-on learning, and illustrate the 
                evolving relationship between developers and intelligent tools. It represents a step toward understanding 
                how technology can be used not only to build software but also to support innovation and continuous learning.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              <Badge variant="secondary"><Sparkles className="w-3 h-3 mr-1" /> AI-Powered</Badge>
              <Badge variant="secondary"><Globe className="w-3 h-3 mr-1" /> 35+ Languages</Badge>
              <Badge variant="secondary"><Shield className="w-3 h-3 mr-1" /> Enterprise Ready</Badge>
              <Badge variant="secondary"><Code2 className="w-3 h-3 mr-1" /> Code Generation</Badge>
              <Badge variant="secondary"><GraduationCap className="w-3 h-3 mr-1" /> Educational</Badge>
              <Badge variant="secondary"><Lightbulb className="w-3 h-3 mr-1" /> Innovation</Badge>
            </div>
          </CardContent>
        </Card>

        {/* CEO */}
        <Card className="glass glow-border mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="shrink-0">
                <img 
                  src={ceoPhoto} 
                  alt="Karnam Chetas Swaroop - Founder & CEO" 
                  className="w-40 h-40 md:w-48 md:h-48 rounded-2xl object-cover border-2 border-primary/20 shadow-lg"
                />
              </div>
              <div className="flex-1">
                <Badge variant="outline" className="mb-2 text-yellow-500 border-yellow-500/30">
                  <Building2 className="w-3 h-3 mr-1" />
                  Founder & Chief Executive Officer
                </Badge>
                <h3 className="text-2xl font-bold mb-1">Karnam Chetas Swaroop</h3>
                <p className="text-muted-foreground text-sm mb-4">Founder, StackMind Technologies Limited</p>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Karnam Chetas Swaroop is the Founder of StackMind Technologies Limited and the developer of the 
                    CodeNova platform. He has a strong interest in artificial intelligence, software engineering, and 
                    emerging technologies, with a focus on building practical solutions that demonstrate how modern 
                    tools can simplify complex tasks.
                  </p>
                  <p>
                    His work on CodeNova reflects a curiosity-driven approach to learning and innovation. The project 
                    was created to explore how AI can assist programmers by converting ideas into structured code, while 
                    also serving as a learning platform to understand real-world applications of machine intelligence.
                  </p>
                  <p>
                    As a young technology enthusiast, Chetas believes that hands-on experimentation is one of the most 
                    effective ways to understand computing concepts. Through CodeNova, he aims to encourage students and 
                    learners to explore programming, problem-solving, and creative thinking in a more interactive way.
                  </p>
                  <p>
                    He continues to refine the platform by studying new advancements in AI and software development, 
                    demonstrating a commitment to continuous improvement, responsible innovation, and knowledge sharing. 
                    His goal is to build technology that is not only functional but also educational and accessible to 
                    aspiring developers.
                  </p>
                </div>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* CEO Quote */}
        <Card className="glass glow-border mb-8">
          <CardContent className="pt-6">
            <div className="relative">
              <div className="text-6xl text-primary/20 font-serif absolute -top-2 -left-2">"</div>
              <blockquote className="pl-8 pr-4 py-4 text-muted-foreground leading-relaxed italic text-lg">
                Building CodeNova has been a journey of exploration into how intelligent systems can transform 
                simple ideas into functional solutions. My goal was to create something that reflects the practical 
                side of artificial intelligence while also encouraging learners to experiment, question, and grow 
                their technical skills. This project represents my commitment to understanding technology deeply 
                and applying it in meaningful ways.
              </blockquote>
              <div className="pl-8 mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/30">
                  <img src={ceoPhoto} alt="Karnam Chetas Swaroop" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="font-semibold">
                    — <span className="gradient-text animate-gradient">Karnam Chetas Swaroop</span>
                  </p>
                  <p className="text-sm text-muted-foreground">Founder & CEO, StackMind Technologies Limited</p>
                </div>
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
