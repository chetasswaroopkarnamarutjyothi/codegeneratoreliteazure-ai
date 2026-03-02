import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Banknote, Search, CheckCircle, Calendar } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  age: number;
  is_blocked: boolean;
}

interface SetUserCreditsPanelProps {
  users: UserProfile[];
  searchQuery: string;
  onCreditsSet: () => void;
}

export function SetUserCreditsPanel({ users, searchQuery, onCreditsSet }: SetUserCreditsPanelProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [planType, setPlanType] = useState<string>("custom");
  const [dailyCredits, setDailyCredits] = useState("");
  const [duration, setDuration] = useState<string>("30"); // days
  const [transactionId, setTransactionId] = useState("");
  const [setting, setSetting] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const { toast } = useToast();

  const plans: Record<string, { daily: number; label: string }> = {
    pro_monthly: { daily: 100, label: "Pro Monthly (100/day)" },
    pro_yearly: { daily: 100, label: "Pro Yearly (100/day)" },
    pro_plus_monthly: { daily: 200, label: "Pro+ Monthly (200/day)" },
    pro_plus_yearly: { daily: 200, label: "Pro+ Yearly (200/day)" },
    custom: { daily: 0, label: "Custom" },
  };

  const filteredUsers = users.filter(
    u => u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
         u.full_name.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleSetCredits = async () => {
    if (!selectedUserId) {
      toast({ title: "Select a user", variant: "destructive" });
      return;
    }

    const credits = planType === "custom" ? Number(dailyCredits) : plans[planType].daily;
    const days = Number(duration);

    if (!credits || credits <= 0) {
      toast({ title: "Enter valid credits", variant: "destructive" });
      return;
    }

    setSetting(true);
    try {
      // Calculate total monthly credits = daily * days
      // Each day the user gets `credits` amount
      const totalForPeriod = credits * days;

      // Update user's subscription type
      const subType = planType.includes("pro_plus") ? "pro_plus" : planType.includes("pro") ? "pro" : "free";
      
      await supabase
        .from("profiles")
        .update({ subscription_type: subType })
        .eq("user_id", selectedUserId);

      // Set daily credits
      await supabase
        .from("user_points")
        .update({ 
          daily_points: credits,
          is_premium: true,
        })
        .eq("user_id", selectedUserId);

      // Record payment as completed
      if (transactionId) {
        await supabase.from("payments").insert({
          user_id: selectedUserId,
          amount: 0,
          plan_type: planType,
          status: "completed",
          razorpay_payment_id: transactionId,
        });
      }

      // Log the grant
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from("point_grants").insert({
          admin_user_id: session.user.id,
          target_user_id: selectedUserId,
          points_granted: credits,
          reason: `Set ${credits}/day for ${days} days. Plan: ${planType}. TXN: ${transactionId || 'N/A'}`,
        });
      }

      // Notify user
      const selectedProfile = users.find(u => u.user_id === selectedUserId);
      if (selectedProfile) {
        await supabase.from("email_notifications").insert({
          recipient_user_id: selectedUserId,
          recipient_email: selectedProfile.email,
          notification_type: "credits_set",
          subject: "Your Credits Have Been Activated!",
          body: `Your plan has been activated!\n\nDaily Credits: ${credits}\nDuration: ${days} days\nPlan: ${plans[planType]?.label || planType}\n\nEnjoy CodeNova!`,
        });
      }

      toast({
        title: "✅ Credits Set Successfully",
        description: `${credits}/day for ${days} days set for ${selectedProfile?.full_name || 'user'}`,
      });

      setSelectedUserId("");
      setDailyCredits("");
      setTransactionId("");
      onCreditsSet();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSetting(false);
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary" />
          Set User Daily Credits
        </CardTitle>
        <CardDescription>
          After verifying payment with Transaction ID, set the user's daily credits for their plan period.
          Monthly ÷ days = daily credits. Yearly ÷ 365 = daily credits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Search */}
        <div className="space-y-2">
          <Label>Search & Select User</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {userSearch && (
            <div className="max-h-40 overflow-y-auto border border-border rounded-lg">
              {filteredUsers.slice(0, 10).map(u => (
                <button
                  key={u.user_id}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between ${
                    selectedUserId === u.user_id ? "bg-primary/10" : ""
                  }`}
                  onClick={() => {
                    setSelectedUserId(u.user_id);
                    setUserSearch(u.full_name);
                  }}
                >
                  <span>{u.full_name}</span>
                  <span className="text-muted-foreground text-xs">{u.email}</span>
                </button>
              ))}
            </div>
          )}
          {selectedUserId && (
            <Badge variant="secondary">
              <CheckCircle className="w-3 h-3 mr-1" />
              Selected: {users.find(u => u.user_id === selectedUserId)?.full_name}
            </Badge>
          )}
        </div>

        {/* Plan Type */}
        <div className="space-y-2">
          <Label>Plan Type</Label>
          <Select value={planType} onValueChange={(v) => {
            setPlanType(v);
            if (v !== "custom") {
              setDailyCredits(String(plans[v].daily));
            }
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pro_monthly">Pro Monthly (100/day)</SelectItem>
              <SelectItem value="pro_yearly">Pro Yearly (100/day × 365)</SelectItem>
              <SelectItem value="pro_plus_monthly">Pro+ Monthly (200/day)</SelectItem>
              <SelectItem value="pro_plus_yearly">Pro+ Yearly (200/day × 365)</SelectItem>
              <SelectItem value="custom">Custom Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Daily Credits */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Daily Credits</Label>
            <Input
              type="number"
              placeholder="Credits per day"
              value={dailyCredits}
              onChange={(e) => setDailyCredits(e.target.value)}
              disabled={planType !== "custom"}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Duration (days)
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days (1 week)</SelectItem>
                <SelectItem value="30">30 days (1 month)</SelectItem>
                <SelectItem value="90">90 days (3 months)</SelectItem>
                <SelectItem value="180">180 days (6 months)</SelectItem>
                <SelectItem value="365">365 days (1 year)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transaction ID */}
        <div className="space-y-2">
          <Label>Transaction ID / Reference</Label>
          <Input
            placeholder="Enter the verified transaction ID"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />
        </div>

        <Button 
          onClick={handleSetCredits} 
          disabled={setting || !selectedUserId}
          className="w-full"
        >
          <Banknote className="w-4 h-4 mr-2" />
          {setting ? "Setting..." : "Set User Credits"}
        </Button>
      </CardContent>
    </Card>
  );
}