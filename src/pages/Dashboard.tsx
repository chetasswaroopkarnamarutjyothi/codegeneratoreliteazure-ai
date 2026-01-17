import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useUsageHistory } from "@/hooks/useUsageHistory";
import { useUserProfile } from "@/hooks/useUserProfile";
import { CreditRequestForm } from "@/components/CreditRequestForm";
import SupportTicketForm from "@/components/SupportTicketForm";
import { 
  Zap, 
  History, 
  Crown, 
  ArrowLeft, 
  Code2, 
  Layers, 
  ShieldCheck,
  Calendar,
  TrendingUp,
  Wallet,
  Shield,
  MessageSquare
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const { 
    points, 
    isAdmin, 
    getTotalPoints, 
    subscriptionType,
    ADMIN_DAILY_CREDITS,
    ADMIN_MONTHLY_CREDITS,
    ADMIN_APPROVAL_BANK,
    USER_DAILY_CREDITS,
    PRO_CREDITS,
    PRO_PLUS_CREDITS
  } = useUserPoints(user?.id);
  const { history } = useUsageHistory(user?.id);
  const { profile } = useUserProfile(user?.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const getActionIcon = (actionType: string) => {
    if (actionType.includes("code_generation")) return <Code2 className="w-4 h-4" />;
    if (actionType.includes("app_generation")) return <Layers className="w-4 h-4" />;
    if (actionType.includes("code_verification")) return <ShieldCheck className="w-4 h-4" />;
    return <History className="w-4 h-4" />;
  };

  const getActionLabel = (actionType: string) => {
    if (actionType.includes("code_generation")) return "Code Generated";
    if (actionType.includes("app_generation")) return "App Generated";
    if (actionType.includes("code_verification")) return "Code Verified";
    if (actionType.includes("parent_notified")) return "Parent Notified";
    return actionType;
  };

  const getDailyLimit = () => {
    if (isAdmin) return ADMIN_DAILY_CREDITS.toLocaleString();
    if (subscriptionType === "pro_plus") return PRO_PLUS_CREDITS.toLocaleString();
    if (subscriptionType === "pro") return PRO_CREDITS.toLocaleString();
    return USER_DAILY_CREDITS.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {profile?.full_name || user?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">
                  <Crown className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                  <Shield className="w-4 h-4 mr-1" />
                  Admin Panel
                </Button>
              </>
            )}
            {subscriptionType === "pro" && (
              <Badge className="bg-blue-500/20 text-blue-500">Pro</Badge>
            )}
            {subscriptionType === "pro_plus" && (
              <Badge className="bg-purple-500/20 text-purple-500">Pro+</Badge>
            )}
          </div>
        </div>

        {/* Credits Overview */}
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Daily Credits
              </CardTitle>
              <CardDescription>Resets every day (no rollover)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{(points?.daily_points || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">
                of {getDailyLimit()} daily
              </p>
            </CardContent>
          </Card>

          {isAdmin && (
            <>
              <Card className="glass glow-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-accent" />
                    Monthly Credits
                  </CardTitle>
                  <CardDescription>Resets every month</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-accent">{(points?.monthly_points || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    of {ADMIN_MONTHLY_CREDITS.toLocaleString()} monthly
                  </p>
                </CardContent>
              </Card>

              <Card className="glass glow-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-yellow-500" />
                    Approval Bank
                  </CardTitle>
                  <CardDescription>For user credit requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-yellow-500">{(points?.approval_bank_credits || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    of {ADMIN_APPROVAL_BANK.toLocaleString()} bank
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          <Card className="glass glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Total Available
              </CardTitle>
              <CardDescription>Credits you can use now</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-500">{getTotalPoints().toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">
                5 credits per action
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Plans (for non-premium users) */}
        {!isAdmin && subscriptionType === "free" && (
          <Card className="glass mb-8 border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Upgrade Your Plan
              </CardTitle>
              <CardDescription>
                Get more Azure AI Power Credits and access to premium AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Pro Monthly */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="font-semibold text-lg text-blue-500">Pro Monthly</p>
                  <p className="text-3xl font-bold text-primary my-2">₹3,000</p>
                  <p className="text-sm text-muted-foreground mb-2">per month • 100 credits/day</p>
                  <p className="text-xs text-muted-foreground mb-4">Copilot + Gemini models</p>
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    onClick={() => navigate("/payment?plan=pro_monthly")}
                  >
                    Subscribe Pro
                  </Button>
                </div>

                {/* Pro Yearly */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="font-semibold text-lg text-blue-500">Pro Yearly</p>
                  <p className="text-3xl font-bold text-primary my-2">₹35,900</p>
                  <p className="text-sm text-muted-foreground mb-2">per year • Save ₹100</p>
                  <p className="text-xs text-muted-foreground mb-4">Copilot + Gemini models</p>
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    onClick={() => navigate("/payment?plan=pro_yearly")}
                  >
                    Subscribe Pro
                  </Button>
                </div>

                {/* Pro+ Monthly */}
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <p className="font-semibold text-lg text-purple-500">Pro+ Monthly</p>
                  <p className="text-3xl font-bold text-primary my-2">₹5,000</p>
                  <p className="text-sm text-muted-foreground mb-2">per month • 200 credits/day</p>
                  <p className="text-xs text-muted-foreground mb-4">ChatGPT + Gemini + Copilot</p>
                  <Button 
                    className="w-full bg-purple-500 hover:bg-purple-600"
                    onClick={() => navigate("/payment?plan=pro_plus_monthly")}
                  >
                    Subscribe Pro+
                  </Button>
                </div>

                {/* Pro+ Yearly */}
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30 relative overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-500 text-white text-xs">Best Value</Badge>
                  </div>
                  <p className="font-semibold text-lg text-purple-500">Pro+ Yearly</p>
                  <p className="text-3xl font-bold text-primary my-2">₹59,900</p>
                  <p className="text-sm text-muted-foreground mb-2">per year • Save ₹100</p>
                  <p className="text-xs text-muted-foreground mb-4">ChatGPT + Gemini + Copilot</p>
                  <Button 
                    className="w-full bg-purple-500 hover:bg-purple-600"
                    onClick={() => navigate("/payment?plan=pro_plus_yearly")}
                  >
                    Subscribe Pro+
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Visit our branch to complete payment. Contact support for location details.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Credit Request & Support Tickets (for non-admin users) */}
        {!isAdmin && user && (
          <Tabs defaultValue="credits" className="mb-8">
            <TabsList>
              <TabsTrigger value="credits" className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Request Credits
              </TabsTrigger>
              <TabsTrigger value="support" className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                Support Tickets
              </TabsTrigger>
            </TabsList>
            <TabsContent value="credits">
              <CreditRequestForm
                userId={user.id}
                currentCredits={points?.daily_points || 0}
              />
            </TabsContent>
            <TabsContent value="support">
              <SupportTicketForm userId={user.id} />
            </TabsContent>
          </Tabs>
        )}

        {/* Usage History */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Usage History
            </CardTitle>
            <CardDescription>Your recent code generations and verifications</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No usage history yet</p>
                <p className="text-sm">Start generating code to see your history here</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {getActionIcon(item.action_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{getActionLabel(item.action_type)}</p>
                        {item.language && (
                          <Badge variant="outline" className="text-xs">
                            {item.language}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          -{item.points_used || 5} credits
                        </Badge>
                      </div>
                      {item.prompt && (
                        <p className="text-sm text-muted-foreground truncate">
                          {item.prompt}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
