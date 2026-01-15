import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Crown, Building2, Phone, MapPin, CheckCircle, Sparkles } from "lucide-react";
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
};

export default function Payment() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

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
      setLoading(false);
    };

    checkSession();
  }, [navigate]);

  const handleRequestPremium = async () => {
    if (!user) return;

    try {
      // Create a payment request record
      const { error } = await supabase.from("payments").insert({
        user_id: user.id,
        amount: plan.amount,
        plan_type: planKey,
        status: "pending",
        currency: "INR",
      });

      if (error) throw error;

      setRequestSent(true);
      toast({
        title: "Request submitted!",
        description: "Please visit our branch to complete payment.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    }
  };

  if (loading) {
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
              <h1 className="text-3xl font-bold mb-4">Request Submitted!</h1>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Your {plan.name} upgrade request has been recorded. Please visit our branch
                to complete the payment process.
              </p>
              
              <div className="bg-muted/30 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                <h3 className="font-semibold mb-4">Payment Details:</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Plan:</span>{" "}
                    <span className="font-medium">{plan.name}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Amount:</span>{" "}
                    <span className="font-medium">
                      ₹{plan.amount.toLocaleString()}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Credits:</span>{" "}
                    <span className="font-medium">{plan.credits}/day</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">AI Models:</span>{" "}
                    <span className="font-medium">{plan.models}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="font-medium">{user?.email}</span>
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Show this confirmation at our branch along with your email ID.
                Your account will be upgraded within 24 hours of payment.
              </p>

              <Button onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Upgrade to {plan.name}</h1>
            <p className="text-muted-foreground">Complete your payment at our branch</p>
          </div>
        </div>

        {/* Selected Plan */}
        <Card className={`glass glow-border mb-6 border-${plan.color}-500/30`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className={`w-5 h-5 text-${plan.color}-500`} />
              {plan.name}
              {plan.savings && (
                <span className="text-sm bg-green-500/20 text-green-500 px-2 py-0.5 rounded">
                  Save ₹{plan.savings}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {plan.credits} Azure AI Power Credits per day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-primary">
                ₹{plan.amount.toLocaleString()}
              </span>
              <span className="text-muted-foreground">
                /{plan.period}
              </span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {plan.credits} daily credits (no rollover)
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-500" />
                AI Models: {plan.models}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Priority code generation
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Save & share projects
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Invite collaborators
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Priority support
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Branch Payment Info */}
        <Card className="glass mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Visit Our Branch
            </CardTitle>
            <CardDescription>
              Complete your payment in person for enhanced security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Leo AI Technologies</p>
                <p className="text-sm text-muted-foreground">
                  Contact support for branch location details
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Contact Support</p>
                <p className="text-sm text-muted-foreground">
                  Email us for appointment scheduling
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Request Button */}
        <Button
          onClick={handleRequestPremium}
          className="w-full"
          size="lg"
        >
          <Crown className="w-4 h-4 mr-2" />
          Request {plan.name} Upgrade
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-4">
          By requesting, you agree to visit our branch to complete payment.
          Your account will be upgraded after payment verification.
        </p>
      </div>
    </div>
  );
}
