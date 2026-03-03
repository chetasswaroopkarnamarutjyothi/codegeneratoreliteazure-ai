import { Code2, Layers, ShieldCheck, MessageSquare } from "lucide-react";

export type ToolType = "code-generator" | "app-generator" | "code-verifier" | "ai-chat";

interface ToolSelectorProps {
  value: ToolType;
  onChange: (value: ToolType) => void;
}

const tools = [
  {
    id: "code-generator" as ToolType,
    name: "CodeNova Generator",
    description: "Generate code with CodeNova AI",
    icon: Code2,
    color: "primary",
  },
  {
    id: "app-generator" as ToolType,
    name: "CodeNova App Builder",
    description: "Generate full applications",
    icon: Layers,
    color: "accent",
  },
  {
    id: "code-verifier" as ToolType,
    name: "CodeNova Verifier",
    description: "Check code for errors",
    icon: ShieldCheck,
    color: "green-500",
  },
  {
    id: "ai-chat" as ToolType,
    name: "CodeNova Chat",
    description: "Multi-turn AI conversations",
    icon: MessageSquare,
    color: "purple-500",
  },
];

export default function ToolSelector({ value, onChange }: ToolSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl mx-auto">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isSelected = value === tool.id;
        
        return (
          <button
            key={tool.id}
            onClick={() => onChange(tool.id)}
            className={`glass rounded-xl p-5 text-left transition-all duration-300 hover:scale-[1.02] ${
              isSelected 
                ? "glow-border ring-2 ring-primary" 
                : "hover:glow-border"
            }`}
          >
            <div className={`p-3 rounded-lg w-fit mb-3 ${
              tool.color === "primary" 
                ? "bg-primary/20 text-primary" 
                : tool.color === "accent" 
                ? "bg-accent/20 text-accent"
                : tool.color === "purple-500"
                ? "bg-purple-500/20 text-purple-500"
                : "bg-green-500/20 text-green-500"
            }`}>
              <Icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base mb-1">{tool.name}</h3>
            <p className="text-xs text-muted-foreground">{tool.description}</p>
          </button>
        );
      })}
    </div>
  );
}
