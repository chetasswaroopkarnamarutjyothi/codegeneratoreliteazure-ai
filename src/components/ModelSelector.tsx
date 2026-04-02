import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain } from "lucide-react";

const MODELS = [
  { id: "auto", label: "🤖 Auto (Smart Routing)", description: "AI picks the best model" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Best reasoning" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Fast & balanced" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash", description: "Next-gen fast" },
  { id: "gpt-5", label: "GPT-5", description: "Most powerful" },
  { id: "gpt-5-mini", label: "GPT-5 Mini", description: "Cost efficient" },
];

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  subscriptionType?: string;
  isAdmin?: boolean;
}

export default function ModelSelector({ value, onChange, subscriptionType, isAdmin }: ModelSelectorProps) {
  const availableModels = MODELS.filter((m) => {
    if (m.id === "auto") return true;
    if (isAdmin) return true;
    if (subscriptionType === "pro_plus") return true;
    if (subscriptionType === "pro") return !m.id.startsWith("gpt-5");
    // Free users: only auto and flash models
    return m.id === "gemini-2.5-flash" || m.id === "gemini-3-flash-preview";
  });

  return (
    <div className="flex items-center gap-2">
      <Brain className="w-4 h-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px] h-9 text-sm">
          <SelectValue placeholder="Select Model" />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <div className="flex flex-col">
                <span className="text-sm">{m.label}</span>
                <span className="text-xs text-muted-foreground">{m.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
