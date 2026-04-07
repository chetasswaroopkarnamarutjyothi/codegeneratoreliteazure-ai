import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Crown, CheckCircle, Sparkles, Upload, FileText } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const PLANS: Record<string, {
  name: string;
  amount: number;
  credits: number;
  period: string;
  models: string;
  color: string;
  savings?: number;
}> = {
  pro_monthly: {
    name: "Pro Monthly",
    amount: 3000,
    credits: 100,
    period: "month",
    models: "Copilot + Gemini",
    color: "blue",
  },
  pro_yearly: {
    name: "Pro Yearly",
    amount: 35900,
    credits: 100,
    period: "year",
    models: "Copilot + Gemini",
    savings: 100,
    color: "blue",
  },
  pro_plus_monthly: {
    name: "Pro+ Monthly",
    amount: 5000,
    credits: 200,
    period: "month",
    models: "ChatGPT + Gemini + Copilot",
    color: "purple",
  },
  pro_plus_yearly: {
    name: "Pro+ Yearly",
    amount: 59900,
    credits: 200,
    period: "year",
    models: "ChatGPT + Gemini + Copilot",
    savings: 100,
    color: "purple",
  },
  chat_access: {
    name: "Client Team Chat Access",
    amount: 4500,
    credits: 0,
    period: "1 week",
    models: "StackMind Chat access",
    color: "green",
  },
  enterprise_monthly: {
    name: "Enterprise Monthly",
    amount: 20000,
    credits: 2000,
    period: "month",
    models: "All Models + Priority Support",
    color: "amber",
  },
  enterprise_yearly: {
    name: "Enterprise Yearly",
    amount: 247900,
    credits: 2000,
    period: "year",
    models: "All Models + Priority Support",
    savings: 12100,
    color: "amber",
  },
};

export default function Payment() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [proofDescription, setProofDescription] = useState("");
  const [enterpriseName, setEnterpriseName] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is employee - if so, redirect
  const [isEmployee, setIsEmployee] = useState(false);

  const planKey = (searchParams.get("plan") || "pro_monthly") as keyof typeof PLANS;
  const plan = PLANS[planKey] || PLANS.pro_monthly;

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      // Check employee status
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "employee")
        .maybeSingle();

      if (roleData) {
        setIsEmployee(true);
        toast({
          title: "Access Not Required",
          description: "Employees already have full access. No payment needed.",
        });
        navigate("/dashboard");
        return;
      }

      setLoading(false);
    };

    checkSession();
  }, [navigate, toast]);

  const handleRequestPremium = async () => {
    if (!user) return;

    if (!transactionId.trim()) {
      toast({
        title: "Transaction ID Required",
        description: "Please enter your transaction/reference ID",
        variant: "destructive",
      });
      return;
    }

    // Enterprise plans require enterprise name
    const isEnterprisePlan = planKey.startsWith("enterprise");
    if (isEnterprisePlan && !enterpriseName.trim()) {
      toast({
        title: "Enterprise Name Required",
        description: "Please enter your enterprise/company name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("payments").insert({
        user_id: user.id,
        amount: plan.amount,
        plan_type: planKey,
        status: "pending",
        currency: "INR",
        razorpay_payment_id: transactionId.trim(),
      });

      if (error) throw error;

      // Notify admins with transaction proof
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles) {
        for (const admin of adminRoles) {
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", admin.user_id)
            .single();

          if (adminProfile) {
            await supabase.from("email_notifications").insert({
              recipient_user_id: admin.user_id,
              recipient_email: adminProfile.email,
              notification_type: "payment_request",
              subject: `Payment Proof - ${plan.name}${enterpriseName ? ` [${enterpriseName}]` : ''} - TXN: ${transactionId}`,
              body: `Payment proof submitted:\n\nPlan: ${plan.name}\n${enterpriseName ? `Enterprise: ${enterpriseName}\n` : ''}Amount: ₹${plan.amount.toLocaleString()}\nTransaction ID: ${transactionId}\nProof/Notes: ${proofDescription || 'No additional notes'}\nUser Email: ${user.email}\n\nPlease verify the payment and activate the subscription.`,
              metadata: JSON.stringify({
                plan: planKey,
                amount: plan.amount,
                user_email: user.email,
                user_id: user.id,
                transaction_id: transactionId,
                proof_description: proofDescription,
                enterprise_name: enterpriseName || null,
              }),
            });
          }
        }
      }

      setRequestSent(true);
      toast({
        title: "Payment proof submitted!",
        description: "Admin will verify and activate your plan.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit",
        variant: "destructive",
      });
    }
  };

  if (loading || isEmployee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (requestSent) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
          <Card className="glass glow-border text-center">
            <CardContent className="py-12">
              <div className="p-4 rounded-full bg-green-500/20 text-green-500 w-fit mx-auto mb-6">
                <CheckCircle className="w-16 h-16" />
              </div>
              <h1 className="text-3xl font-bold mb-4">Payment Proof Submitted!</h1>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Your transaction ID <strong>{transactionId}</strong> has been sent to our admin team.
                Your {plan.name} plan will be activated after verification.
              </p>
              <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Upgrade to {plan.name}</h1>
            <p className="text-muted-foreground">Submit payment proof to activate</p>
          </div>
        </div>

        {/* Plan Summary */}
        <Card className="glass glow-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              {plan.name}
            </CardTitle>
            <CardDescription>{plan.credits > 0 ? `${plan.credits} CodeNova Credits per day` : plan.models}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-primary">₹{plan.amount.toLocaleString()}</span>
              <span className="text-muted-foreground">/{plan.period}</span>
            </div>
            <ul className="space-y-2 text-sm">
              {plan.credits > 0 && (
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {plan.credits} daily credits (no rollover)
                </li>
              )}
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-500" />
                {plan.models}
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Payment Proof Form */}
        <Card className="glass mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Submit Payment Proof
            </CardTitle>
            <CardDescription>
              Enter your transaction details after completing payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Transaction ID / Reference Number *</Label>
              <Input
                placeholder="e.g., TXN123456789"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Proof / Notes (Optional)</Label>
              <Textarea
                placeholder="Describe payment method, bank name, screenshot details, etc."
                value={proofDescription}
                onChange={(e) => setProofDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleRequestPremium}
          className="w-full"
          size="lg"
          disabled={!transactionId.trim()}
        >
          <Upload className="w-4 h-4 mr-2" />
          Submit Payment Proof
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Admin will verify your payment and activate your plan within 24 hours.
        </p>
      </div>
    </div>
  );
}
