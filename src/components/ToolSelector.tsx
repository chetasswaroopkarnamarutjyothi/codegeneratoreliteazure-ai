import { Code2, Layers, ShieldCheck, MessageSquare, Wrench, Globe } from "lucide-react";

export type ToolType = "code-generator" | "app-generator" | "code-verifier" | "ai-chat" | "code-refactor" | "website-verifier";

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
    gradient: "from-primary to-primary/60",
    bgGlow: "bg-primary/20 text-primary",
    ring: "ring-primary",
  },
  {
    id: "app-generator" as ToolType,
    name: "CodeNova App Builder",
    description: "Generate full applications",
    icon: Layers,
    gradient: "from-accent to-accent/60",
    bgGlow: "bg-accent/20 text-accent",
    ring: "ring-accent",
  },
  {
    id: "code-verifier" as ToolType,
    name: "CodeNova Verifier",
    description: "Check code for errors",
    icon: ShieldCheck,
    gradient: "from-green-500 to-emerald-500",
    bgGlow: "bg-green-500/20 text-green-500",
    ring: "ring-green-500",
  },
  {
    id: "ai-chat" as ToolType,
    name: "CodeNova Chat",
    description: "Multi-turn AI conversations",
    icon: MessageSquare,
    gradient: "from-purple-500 to-pink-500",
    bgGlow: "bg-purple-500/20 text-purple-500",
    ring: "ring-purple-500",
  },
  {
    id: "code-refactor" as ToolType,
    name: "CodeNova Refactor",
    description: "Analyze & improve your code",
    icon: Wrench,
    gradient: "from-orange-500 to-amber-500",
    bgGlow: "bg-orange-500/20 text-orange-500",
    ring: "ring-orange-500",
  },
];

export default function ToolSelector({ value, onChange }: ToolSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-6xl mx-auto">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isSelected = value === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => onChange(tool.id)}
            className={`group glass rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.03] relative overflow-hidden ${
              isSelected
                ? `glow-border ${tool.ring} ring-2`
                : "hover:glow-border"
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
            
            <div className="relative z-10">
              <div className={`p-2.5 rounded-lg w-fit mb-2.5 ${tool.bgGlow} group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm mb-0.5">{tool.name}</h3>
              <p className="text-xs text-muted-foreground leading-tight">{tool.description}</p>
            </div>

            {isSelected && (
              <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-gradient-to-r ${tool.gradient} animate-pulse`} />
            )}
          </button>
        );
      })}
    </div>
  );
}
