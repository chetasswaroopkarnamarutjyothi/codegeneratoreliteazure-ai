import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Search, 
  Loader2, 
  Code2, 
  Layers, 
  ShieldCheck, 
  History,
  User,
  Calendar,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface UsageRecord {
  id: string;
  user_id: string;
  action_type: string;
  prompt: string | null;
  result: string | null;
  language: string | null;
  points_used: number | null;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
}

interface UserDailyUsage {
  user_id: string;
  full_name: string;
  email: string;
  total_credits_used: number;
  action_count: number;
  records: UsageRecord[];
}

export function UserUsagePanel() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dailyUsage, setDailyUsage] = useState<UserDailyUsage[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    fetchDailyUsage();
  }, [selectedDate]);

  const fetchDailyUsage = async () => {
    setLoading(true);
    try {
      // Fetch all usage history for the selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: usageData, error: usageError } = await supabase
        .from("usage_history")
        .select("*")
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: false });

      if (usageError) throw usageError;

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email");

      if (profilesError) throw profilesError;

      // Group usage by user
      const profileMap = new Map<string, UserProfile>();
      profiles?.forEach(p => profileMap.set(p.user_id, p));

      const usageMap = new Map<string, UserDailyUsage>();
      
      usageData?.forEach(record => {
        const existing = usageMap.get(record.user_id);
        const profile = profileMap.get(record.user_id);
        
        if (existing) {
          existing.total_credits_used += record.points_used || 5;
          existing.action_count += 1;
          existing.records.push(record);
        } else {
          usageMap.set(record.user_id, {
            user_id: record.user_id,
            full_name: profile?.full_name || "Unknown User",
            email: profile?.email || "unknown@email.com",
            total_credits_used: record.points_used || 5,
            action_count: 1,
            records: [record],
          });
        }
      });

      setDailyUsage(Array.from(usageMap.values()).sort((a, b) => b.total_credits_used - a.total_credits_used));
    } catch (error) {
      console.error("Failed to fetch daily usage:", error);
    } finally {
      setLoading(false);
    }
  };

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
    return actionType;
  };

  const filteredUsage = dailyUsage.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCreditsUsed = dailyUsage.reduce((sum, u) => sum + u.total_credits_used, 0);
  const totalActions = dailyUsage.reduce((sum, u) => sum + u.action_count, 0);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          User Daily Usage
        </CardTitle>
        <CardDescription>
          Track how many credits each user has used today
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Picker & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-muted/30">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{dailyUsage.length}</p>
            <p className="text-xs text-muted-foreground">Active Users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{totalActions}</p>
            <p className="text-xs text-muted-foreground">Total Actions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-500">{totalCreditsUsed.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Credits Used</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredUsage.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No usage found for this date</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filteredUsage.map((userUsage) => (
              <div
                key={userUsage.user_id}
                className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden"
              >
                {/* User Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedUser(expandedUser === userUsage.user_id ? null : userUsage.user_id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{userUsage.full_name}</p>
                      <p className="text-sm text-muted-foreground">{userUsage.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-primary">{userUsage.total_credits_used}</p>
                      <p className="text-xs text-muted-foreground">credits used</p>
                    </div>
                    <Badge variant="secondary">{userUsage.action_count} actions</Badge>
                    {expandedUser === userUsage.user_id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedUser === userUsage.user_id && (
                  <div className="border-t border-border/50 p-4 bg-background/50 space-y-3">
                    {userUsage.records.map((record) => (
                      <div
                        key={record.id}
                        className="p-3 rounded-lg bg-muted/30 text-sm"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {getActionIcon(record.action_type)}
                          <span className="font-medium">{getActionLabel(record.action_type)}</span>
                          {record.language && (
                            <Badge variant="outline" className="text-xs">{record.language}</Badge>
                          )}
                          <Badge variant="secondary" className="text-xs ml-auto">
                            -{record.points_used || 5} credits
                          </Badge>
                        </div>
                        {record.prompt && (
                          <p className="text-muted-foreground mb-1">
                            <span className="font-medium text-foreground">Prompt:</span> {record.prompt}
                          </p>
                        )}
                        {record.result && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-primary hover:underline">
                              View generated code
                            </summary>
                            <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto max-h-32 overflow-y-auto">
                              <code>{record.result.substring(0, 500)}{record.result.length > 500 ? "..." : ""}</code>
                            </pre>
                          </details>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(record.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
