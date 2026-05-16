import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Banknote, Search, CheckCircle, Calendar, AlertTriangle, Building2, Plus } from "lucide-react";
import { EnterpriseAllocationsExport } from "./EnterpriseAllocationsExport";

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

const DAILY_ALLOCATION_LIMIT = 10_000_000;

export function SetUserCreditsPanel({ users, searchQuery, onCreditsSet }: SetUserCreditsPanelProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [planType, setPlanType] = useState<string>("custom");
  const [dailyCredits, setDailyCredits] = useState("");
  const [duration, setDuration] = useState<string>("30");
  const [transactionId, setTransactionId] = useState("");
  const [setting, setSetting] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [todayAllocated, setTodayAllocated] = useState(0);
  const { toast } = useToast();

  const plans: Record<string, { daily: number; label: string }> = {
    pro_monthly: { daily: 100, label: "Pro Monthly (100/day)" },
    pro_yearly: { daily: 100, label: "Pro Yearly (100/day)" },
    pro_plus_monthly: { daily: 200, label: "Pro+ Monthly (200/day)" },
    pro_plus_yearly: { daily: 200, label: "Pro+ Yearly (200/day)" },
    enterprise: { daily: 500, label: "Enterprise (500/day per seat)" },
    custom: { daily: 0, label: "Custom (up to 10,000,000/day)" },
  };

  const [tiers, setTiers] = useState<any[]>([]);
  const [entForm, setEntForm] = useState({ name: "", newName: "", amount: "", mode: "pool", notes: "" });
  const [entSaving, setEntSaving] = useState(false);

  const loadTiers = async () => {
    const { data } = await supabase.from("enterprise_credit_tiers").select("*").order("enterprise_name");
    setTiers(data || []);
  };
  useEffect(() => { loadTiers(); }, []);

  const handleEnterpriseAllocate = async () => {
    const name = (entForm.name === "__new__" ? entForm.newName : entForm.name).trim();
    const amt = parseInt(entForm.amount);
    if (!name || !amt || amt <= 0) return toast({ title: "Enterprise name & positive amount required", variant: "destructive" });
    setEntSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    let tier = tiers.find(t => t.enterprise_name === name);
    if (!tier) {
      const { data: created } = await supabase.from("enterprise_credit_tiers")
        .insert({ enterprise_name: name, credit_pool: 0, updated_by: session?.user.id })
        .select().single();
      tier = created;
    }
    const { error } = await supabase.from("enterprise_credit_allocations").insert({
      enterprise_id: tier?.id || null, enterprise_name: name, amount: amt,
      mode: entForm.mode, notes: entForm.notes, allocated_by: session?.user.id,
    });
    if (!error && tier) {
      await supabase.from("enterprise_credit_tiers").update({
        credit_pool: (tier.credit_pool || 0) + amt, updated_at: new Date().toISOString(),
      }).eq("id", tier.id);
    }
    setEntSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `✅ Allocated ${amt} credits to ${name}` }); setEntForm({ name: "", newName: "", amount: "", mode: "pool", notes: "" }); loadTiers(); }
  };

  useEffect(() => {
    fetchTodayAllocation();
  }, []);

  const fetchTodayAllocation = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("admin_credit_allocations")
      .select("credits_allocated")
      .eq("admin_user_id", session.user.id)
      .eq("allocation_date", today)
      .maybeSingle();

    setTodayAllocated(data?.credits_allocated || 0);
  };

  const remaining = DAILY_ALLOCATION_LIMIT - todayAllocated;
  const usagePercent = (todayAllocated / DAILY_ALLOCATION_LIMIT) * 100;

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

    if (!credits || credits <= 0 || credits > 10000000) {
      toast({ title: "Enter valid credits (1 - 10,000,000)", variant: "destructive" });
      return;
    }

    if (credits > remaining) {
      toast({ title: `Exceeds daily limit! You can only allocate ${remaining.toLocaleString()} more credits today.`, variant: "destructive" });
      return;
    }

    setSetting(true);
    try {
      const subType = planType.includes("pro_plus") ? "pro_plus" : planType.includes("pro") ? "pro" : "free";
      
      await supabase.from("profiles").update({ subscription_type: subType }).eq("user_id", selectedUserId);

      await supabase.from("user_points").update({ daily_points: credits, custom_daily_limit: credits, is_premium: true } as any).eq("user_id", selectedUserId);

      if (transactionId) {
        await supabase.from("payments").insert({
          user_id: selectedUserId, amount: 0, plan_type: planType, status: "completed", razorpay_payment_id: transactionId,
        });
      }

      // Track daily allocation
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const today = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("admin_credit_allocations")
          .select("id, credits_allocated")
          .eq("admin_user_id", session.user.id)
          .eq("allocation_date", today)
          .maybeSingle();

        if (existing) {
          await supabase.from("admin_credit_allocations")
            .update({ credits_allocated: existing.credits_allocated + credits })
            .eq("id", existing.id);
        } else {
          await supabase.from("admin_credit_allocations")
            .insert({ admin_user_id: session.user.id, credits_allocated: credits, allocation_date: today });
        }

        await supabase.from("point_grants").insert({
          admin_user_id: session.user.id, target_user_id: selectedUserId, points_granted: credits,
          reason: `Set ${credits}/day for ${days} days. Plan: ${planType}. TXN: ${transactionId || 'N/A'}`,
        });
      }

      const selectedProfile = users.find(u => u.user_id === selectedUserId);
      if (selectedProfile) {
        const emailHtml = `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, hsl(173, 80%, 40%), hsl(280, 70%, 50%)); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 700;">🎉 Credits Activated!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Your CodeNova plan has been updated</p>
            </div>
            <div style="padding: 32px 24px;">
              <p style="font-size: 16px; color: #1a202c; margin: 0 0 20px;">Hi <strong>${selectedProfile.full_name}</strong>,</p>
              <p style="font-size: 14px; color: #4a5568; line-height: 1.6; margin: 0 0 24px;">Great news! An administrator has activated credits on your account. Here are the details:</p>
              <div style="background: #f7fafc; border-radius: 8px; padding: 20px; margin: 0 0 24px; border: 1px solid #e2e8f0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #718096; font-size: 14px;">📊 Daily Credits</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 700; color: hsl(173, 80%, 40%); font-size: 18px;">${credits.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096; font-size: 14px; border-top: 1px solid #e2e8f0;">📅 Duration</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a202c; font-size: 14px; border-top: 1px solid #e2e8f0;">${days} days</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #718096; font-size: 14px; border-top: 1px solid #e2e8f0;">🏷️ Plan</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a202c; font-size: 14px; border-top: 1px solid #e2e8f0;">${plans[planType]?.label || planType}</td>
                  </tr>
                </table>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${window.location.origin}" style="display: inline-block; background: linear-gradient(135deg, hsl(173, 80%, 40%), hsl(280, 70%, 50%)); color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Start Using CodeNova →</a>
              </div>
              <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 24px 0 0;">This is an automated notification from CodeNova by StackMind Technologies Limited.</p>
            </div>
          </div>`;

        await supabase.from("email_notifications").insert({
          recipient_user_id: selectedUserId, recipient_email: selectedProfile.email,
          notification_type: "credits_set", subject: "🎉 Your CodeNova Credits Have Been Activated!",
          body: emailHtml,
          metadata: { credits, days, plan: planType, transaction_id: transactionId || null } as any,
        });
      }

      toast({ title: "✅ Credits Set Successfully", description: `${credits}/day for ${days} days set for ${selectedProfile?.full_name || 'user'}` });
      setSelectedUserId(""); setDailyCredits(""); setTransactionId("");
      setTodayAllocated(prev => prev + credits);
      onCreditsSet();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSetting(false);
    }
  };

  return (
    <div className="space-y-6">
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary" />
          Set User Daily Credits
        </CardTitle>
        <CardDescription>
          After verifying payment with Transaction ID, set the user's daily credits. Daily allocation limit: 10,000,000 credits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Daily Allocation Progress */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Today's Allocation</span>
            <span className={remaining <= 0 ? "text-destructive font-bold" : "text-foreground"}>
              {todayAllocated.toLocaleString()} / {DAILY_ALLOCATION_LIMIT.toLocaleString()}
            </span>
          </div>
          <Progress value={usagePercent} className="h-2" />
          {remaining <= 1000000 && remaining > 0 && (
            <p className="text-xs text-yellow-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Only {remaining.toLocaleString()} credits remaining today
            </p>
          )}
          {remaining <= 0 && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Daily allocation limit reached. Try again tomorrow.
            </p>
          )}
        </div>

        {/* User Search */}
        <div className="space-y-2">
          <Label>Search & Select User</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by email or name..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-10" />
          </div>
          {userSearch && (
            <div className="max-h-40 overflow-y-auto border border-border rounded-lg">
              {filteredUsers.slice(0, 10).map(u => (
                <button
                  key={u.user_id}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between ${selectedUserId === u.user_id ? "bg-primary/10" : ""}`}
                  onClick={() => { setSelectedUserId(u.user_id); setUserSearch(u.full_name); }}
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
          <Select value={planType} onValueChange={(v) => { setPlanType(v); if (v !== "custom") setDailyCredits(String(plans[v].daily)); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pro_monthly">Pro Monthly (100/day)</SelectItem>
              <SelectItem value="pro_yearly">Pro Yearly (100/day × 365)</SelectItem>
              <SelectItem value="pro_plus_monthly">Pro+ Monthly (200/day)</SelectItem>
              <SelectItem value="pro_plus_yearly">Pro+ Yearly (200/day × 365)</SelectItem>
              <SelectItem value="enterprise">Enterprise (allocate to org pool)</SelectItem>
              <SelectItem value="custom">Custom Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Daily Credits & Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Daily Credits</Label>
            <Input type="number" placeholder="Credits per day (max 10M)" value={dailyCredits} onChange={(e) => setDailyCredits(e.target.value)} disabled={planType !== "custom"} max={10000000} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Duration (days)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">365 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transaction ID */}
        <div className="space-y-2">
          <Label>Transaction ID / Reference</Label>
          <Input placeholder="Enter the verified transaction ID" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
        </div>

        <Button onClick={handleSetCredits} disabled={setting || !selectedUserId || remaining <= 0} className="w-full">
          <Banknote className="w-4 h-4 mr-2" />
          {setting ? "Setting..." : "Set User Credits"}
        </Button>
      </CardContent>
    </Card>

    {planType === "enterprise" && (
      <Card className="glass border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Allocate Credits to Enterprise</CardTitle>
          <CardDescription>Top up an enterprise credit pool. Individual employees are not exposed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Enterprise</Label>
              <Select value={entForm.name} onValueChange={(v) => setEntForm({ ...entForm, name: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {tiers.map(t => <SelectItem key={t.id} value={t.enterprise_name}>{t.enterprise_name} ({(t.credit_pool || 0).toLocaleString()})</SelectItem>)}
                  <SelectItem value="__new__">+ Add new enterprise…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {entForm.name === "__new__" && (
              <div className="space-y-2">
                <Label>New Enterprise Name</Label>
                <Input value={entForm.newName} onChange={e => setEntForm({ ...entForm, newName: e.target.value })} placeholder="Acme Corp" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" value={entForm.amount} onChange={e => setEntForm({ ...entForm, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={entForm.mode} onValueChange={v => setEntForm({ ...entForm, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pool">Pool top-up</SelectItem>
                  <SelectItem value="bulk">Bulk distribution</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input placeholder="Notes (optional)" value={entForm.notes} onChange={e => setEntForm({ ...entForm, notes: e.target.value })} />
          <Button onClick={handleEnterpriseAllocate} disabled={entSaving} className="w-full">
            {entSaving ? <span className="flex items-center"><Plus className="w-4 h-4 mr-2 animate-spin" />Allocating…</span> : <span className="flex items-center"><Building2 className="w-4 h-4 mr-2" />Allocate to Enterprise</span>}
          </Button>
        </CardContent>
      </Card>
    )}
    </div>
  );
}
