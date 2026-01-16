import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Zap, 
  Gift,
  Calendar,
  Activity,
  Loader2
} from "lucide-react";

interface GrantHistory {
  id: string;
  target_user_id: string;
  points_granted: number;
  reason: string | null;
  created_at: string;
}

interface UsageData {
  id: string;
  user_id: string;
  action_type: string;
  points_used: number;
  created_at: string;
}

interface UserPointsData {
  user_id: string;
  daily_points: number;
  monthly_points: number;
  is_premium: boolean;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444"];

export function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [grantHistory, setGrantHistory] = useState<GrantHistory[]>([]);
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    activeToday: 0,
    totalCreditsGranted: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch grant history
      const { data: grants } = await supabase
        .from("point_grants")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      setGrantHistory((grants as GrantHistory[]) || []);

      // Fetch usage data
      const { data: usage } = await supabase
        .from("usage_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      setUsageData((usage as UsageData[]) || []);

      // Fetch user stats
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, created_at");

      const { data: points } = await supabase
        .from("user_points")
        .select("user_id, daily_points, monthly_points, is_premium");

      const today = new Date().toISOString().split("T")[0];
      const activeToday = (usage || []).filter(
        u => u.created_at.split("T")[0] === today
      );
      const uniqueActiveUsers = new Set(activeToday.map(u => u.user_id));

      const totalGranted = (grants || []).reduce((sum, g) => sum + g.points_granted, 0);
      const premiumCount = (points as UserPointsData[] || []).filter(p => p.is_premium).length;

      setUserStats({
        totalUsers: profiles?.length || 0,
        premiumUsers: premiumCount,
        activeToday: uniqueActiveUsers.size,
        totalCreditsGranted: totalGranted,
      });
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const getUsageByDay = () => {
    const last7Days: Record<string, number> = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      last7Days[key] = 0;
    }

    usageData.forEach(u => {
      const day = u.created_at.split("T")[0];
      if (last7Days[day] !== undefined) {
        last7Days[day] += u.points_used || 5;
      }
    });

    return Object.entries(last7Days).map(([date, credits]) => ({
      date: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      credits,
    }));
  };

  const getUsageByType = () => {
    const byType: Record<string, number> = {};
    
    usageData.forEach(u => {
      const type = u.action_type || "unknown";
      byType[type] = (byType[type] || 0) + 1;
    });

    return Object.entries(byType)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const getGrantsByDay = () => {
    const last7Days: Record<string, number> = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      last7Days[key] = 0;
    }

    grantHistory.forEach(g => {
      const day = g.created_at.split("T")[0];
      if (last7Days[day] !== undefined) {
        last7Days[day] += g.points_granted;
      }
    });

    return Object.entries(last7Days).map(([date, credits]) => ({
      date: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      credits,
    }));
  };

  if (loading) {
    return (
      <Card className="glass">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{userStats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Activity className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Today</p>
                <p className="text-2xl font-bold">{userStats.activeToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Premium Users</p>
                <p className="text-2xl font-bold">{userStats.premiumUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Gift className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits Granted</p>
                <p className="text-2xl font-bold">{userStats.totalCreditsGranted.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Credit Usage Trend */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Credit Usage (7 Days)
            </CardTitle>
            <CardDescription>Total credits consumed per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getUsageByDay()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="credits"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Credits Granted Trend */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-500" />
              Credits Granted (7 Days)
            </CardTitle>
            <CardDescription>Admin-granted credits per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={getGrantsByDay()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="credits" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Type & Recent Grants */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Usage by Type Pie Chart */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Usage by Action Type
            </CardTitle>
            <CardDescription>Distribution of credit usage</CardDescription>
          </CardHeader>
          <CardContent>
            {getUsageByType().length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={getUsageByType()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getUsageByType().map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No usage data yet
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {getUsageByType().map((item, index) => (
                <Badge
                  key={item.name}
                  variant="secondary"
                  style={{ backgroundColor: `${COLORS[index % COLORS.length]}20` }}
                >
                  {item.name}: {item.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Grants */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Recent Grant Activity
            </CardTitle>
            <CardDescription>Latest credit grants to users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {grantHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No grants yet
                </div>
              ) : (
                grantHistory.slice(0, 10).map((grant) => (
                  <div
                    key={grant.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div>
                      <Badge variant="outline" className="font-bold">
                        +{grant.points_granted}
                      </Badge>
                      {grant.reason && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {grant.reason}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(grant.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
