// Model credit costs - synced with model_credit_costs table
export const MODEL_CREDITS: Record<string, { standard: number; proMultiplier: number; label: string }> = {
  "auto": { standard: 10, proMultiplier: 50, label: "Auto" },
  "gemini-2.5": { standard: 10, proMultiplier: 50, label: "Gemini 2.5" },
  "gemini-2.5-flash": { standard: 15, proMultiplier: 50, label: "Gemini 2.5 Flash" },
  "gemini-2.5-pro": { standard: 20, proMultiplier: 50, label: "Gemini 2.5 Pro" },
  "gemini-3-flash-preview": { standard: 25, proMultiplier: 50, label: "Gemini 3 Flash" },
  "gpt-5-mini": { standard: 30, proMultiplier: 50, label: "GPT-5 Mini" },
  "gpt-5": { standard: 35, proMultiplier: 50, label: "GPT-5" },
  "gpt-5-nano": { standard: 40, proMultiplier: 50, label: "GPT-5 Nano" },
  "gemini-3.1-pro-preview": { standard: 50, proMultiplier: 50, label: "Gemini 3.1 Pro" },
  "gpt-5.2": { standard: 60, proMultiplier: 50, label: "GPT-5.2" },
  "gemini-2.5-flash-lite": { standard: 5, proMultiplier: 50, label: "Gemini 2.5 Flash Lite" },
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
