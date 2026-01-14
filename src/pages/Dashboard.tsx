import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useUsageHistory } from "@/hooks/useUsageHistory";
import { useUserProfile } from "@/hooks/useUserProfile";
import { 
  Zap, 
  History, 
  Crown, 
  ArrowLeft, 
  Code2, 
  Layers, 
  ShieldCheck,
  Calendar,
  TrendingUp
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

  const { points, isAdmin, getTotalPoints } = useUserPoints(user?.id);
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
          
          {isAdmin && (
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              <Crown className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          )}
        </div>

        {/* Points Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="glass glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Daily Points
              </CardTitle>
              <CardDescription>Resets every day</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{points?.daily_points || 0}</p>
              <p className="text-sm text-muted-foreground mt-1">
                of {isAdmin ? 500 : 50} daily
              </p>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="glass glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  Monthly Points
                </CardTitle>
                <CardDescription>Resets every month</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-accent">{points?.monthly_points || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  of 8,500 monthly
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="glass glow-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Total Available
              </CardTitle>
              <CardDescription>Points you can use now</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-500">{getTotalPoints()}</p>
              <p className="text-sm text-muted-foreground mt-1">
                5 points per action
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Premium Upgrade (for non-premium users) */}
        {!points?.is_premium && !isAdmin && (
          <Card className="glass mb-8 border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Upgrade to Premium
              </CardTitle>
              <CardDescription>
                Get more points and unlock premium features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="font-semibold text-lg">Monthly Plan</p>
                  <p className="text-3xl font-bold text-primary my-2">₹2,300</p>
                  <p className="text-sm text-muted-foreground mb-4">per month</p>
                  <Button 
                    className="w-full"
                    onClick={() => navigate("/payment?plan=monthly")}
                  >
                    Subscribe Monthly
                  </Button>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="font-semibold text-lg">Yearly Plan</p>
                  <p className="text-3xl font-bold text-primary my-2">₹27,600</p>
                  <p className="text-sm text-muted-foreground mb-4">per year (save ₹0)</p>
                  <Button 
                    className="w-full bg-primary"
                    onClick={() => navigate("/payment?plan=yearly")}
                  >
                    Subscribe Yearly
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Visit our branch to complete payment. Contact support for location details.
              </p>
            </CardContent>
          </Card>
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
                          -{item.points_used || 5} pts
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
