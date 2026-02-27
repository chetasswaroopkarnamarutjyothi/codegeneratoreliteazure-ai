import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfessionalCodeToggleProps {
  userId?: string;
  subscriptionType: string;
  isAdmin: boolean;
  isEmployee: boolean;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function ProfessionalCodeToggle({
  userId,
  subscriptionType,
  isAdmin,
  isEmployee,
  enabled,
  onToggle,
}: ProfessionalCodeToggleProps) {
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchCount = async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("professional_code_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("used_at", startOfMonth.toISOString());

      setMonthlyCount(count || 0);
      setLoading(false);
    };
    fetchCount();
  }, [userId]);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      // Free users: once per month
      if (subscriptionType === "free" && !isAdmin && !isEmployee) {
        if (monthlyCount >= 1) {
          toast.error("Free users can only generate professional code once per month. Upgrade to Pro+ (₹5,000 + ₹2,000) for unlimited access.");
          return;
        }
      }
      // Employees: check if 50+ times (salary deduction warning)
      if (isEmployee && monthlyCount >= 50) {
        toast.warning("⚠️ You have used professional code 50+ times this month. 10% salary deduction will apply.");
      }
      toast.info("Professional mode enabled. This will deduct 50 credits and generate fully functional, production-ready code.");
    }
    onToggle(checked);
  };

  const getStatusText = () => {
    if (isAdmin) return "Unlimited (Admin)";
    if (isEmployee) return `${monthlyCount}/50 this month (free)`;
    if (subscriptionType === "pro_plus") return "Unlimited (Pro+)";
    return `${monthlyCount}/1 this month (free)`;
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-2 flex-1">
        <Sparkles className="w-4 h-4 text-yellow-500" />
        <Label htmlFor="professional-mode" className="text-sm font-medium cursor-pointer">
          Professional Code
        </Label>
        <Badge variant="outline" className="text-xs">
          50 credits
        </Badge>
        <span className="text-xs text-muted-foreground">
          {loading ? "..." : getStatusText()}
        </span>
      </div>
      <Switch
        id="professional-mode"
        checked={enabled}
        onCheckedChange={handleToggle}
      />
    </div>
  );
}
