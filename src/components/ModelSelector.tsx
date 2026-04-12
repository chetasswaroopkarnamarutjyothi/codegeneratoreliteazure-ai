import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain } from "lucide-react";
import { MODEL_CREDITS, getModelCost } from "@/lib/modelCredits";

const MODELS = Object.entries(MODEL_CREDITS).map(([id, info]) => ({
  id,
  label: info.label,
  cost: info.standard,
}));

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  subscriptionType?: string;
  isAdmin?: boolean;
  isProfessional?: boolean;
}

export default function ModelSelector({ value, onChange, subscriptionType, isAdmin, isProfessional }: ModelSelectorProps) {
  const availableModels = MODELS.filter((m) => {
    if (m.id === "auto") return true;
    if (isAdmin) return true;
    if (subscriptionType === "pro_plus") return true;
    if (subscriptionType === "pro") return m.cost <= 35;
    // Free users: only cheaper models
    return m.cost <= 15;
  });

  return (
    <div className="flex items-center gap-2">
      <Brain className="w-4 h-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[220px] h-9 text-sm">
          <SelectValue placeholder="Select Model" />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((m) => {
            const cost = isProfessional ? getModelCost(m.id, true) : m.cost;
            return (
              <SelectItem key={m.id} value={m.id}>
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-sm">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{cost} credits</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
