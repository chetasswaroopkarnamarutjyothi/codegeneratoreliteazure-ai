// Model credit costs - synced with model_credit_costs table
export const MODEL_CREDITS: Record<string, { standard: number; proMultiplier: number; label: string }> = {
  "auto": { standard: 10, proMultiplier: 50, label: "Nova Auto" },
  "gemini-2.5": { standard: 10, proMultiplier: 50, label: "Nova 1.0" },
  "gemini-2.5-flash": { standard: 15, proMultiplier: 50, label: "Nova 1.2 Flash" },
  "gemini-2.5-pro": { standard: 20, proMultiplier: 50, label: "Nova 1.4 Pro" },
  "gemini-3-flash-preview": { standard: 25, proMultiplier: 50, label: "Nova 1.6 Flash" },
  "gpt-5-mini": { standard: 30, proMultiplier: 50, label: "Nova 1.8 Mini" },
  "gpt-5": { standard: 35, proMultiplier: 50, label: "Nova 2.0 Pro" },
  "gpt-5-nano": { standard: 40, proMultiplier: 50, label: "Nova 2.2 Nano" },
  "gemini-3.1-pro-preview": { standard: 50, proMultiplier: 50, label: "Nova 2.4 Pro" },
  "gpt-5.2": { standard: 60, proMultiplier: 50, label: "Nova 3.0 Ultra" },
  "gemini-2.5-flash-lite": { standard: 5, proMultiplier: 50, label: "Nova Lite" },
};

export function getModelCost(modelId: string, isProfessional: boolean = false): number {
  const model = MODEL_CREDITS[modelId] || MODEL_CREDITS["auto"];
  if (isProfessional) {
    return model.standard * model.proMultiplier;
  }
  return model.standard;
}

export function getModelLabel(modelId: string): string {
  return MODEL_CREDITS[modelId]?.label || modelId;
}
