import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Shield, 
  Users, 
  Search, 
  Gift, 
  Ban, 
  CheckCircle,
  Crown
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  age: number;
  is_blocked: boolean;
  created_at: string;
}

interface UserPointsData {
  user_id: string;
  daily_points: number;
  monthly_points: number;
  is_premium: boolean;
}

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userPoints, setUserPoints] = useState<Map<string, UserPointsData>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [grantPoints, setGrantPoints] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await fetchUsers();
      setLoading(false);
    };

    checkAdmin();
  }, [navigate, toast]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUsers(profiles || []);

      // Fetch points for all users
      const { data: pointsData } = await supabase
        .from("user_points")
        .select("*");

      if (pointsData) {
        const pointsMap = new Map<string, UserPointsData>();
        pointsData.forEach((p) => {
          pointsMap.set(p.user_id, p);
        });
        setUserPoints(pointsMap);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  const handleGrantPoints = async () => {
    if (!selectedUser || !grantPoints || !user) return;

    const points = parseInt(grantPoints);
    if (isNaN(points) || points <= 0) {
      toast({
        title: "Invalid points",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    try {
      // Record the grant
      const { error: grantError } = await supabase.from("point_grants").insert({
        admin_user_id: user.id,
        target_user_id: selectedUser.user_id,
        points_granted: points,
        reason: grantReason || null,
      });

      if (grantError) throw grantError;

      // Update user's points
      const currentPoints = userPoints.get(selectedUser.user_id);
      const newDailyPoints = (currentPoints?.daily_points || 0) + points;

      const { error: updateError } = await supabase
        .from("user_points")
        .update({ daily_points: newDailyPoints })
        .eq("user_id", selectedUser.user_id);

      if (updateError) throw updateError;

      toast({
        title: "Points granted!",
        description: `${points} points added to ${selectedUser.full_name}`,
      });

      setSelectedUser(null);
      setGrantPoints("");
      setGrantReason("");
      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to grant points",
        variant: "destructive",
      });
    }
  };

  const handleBlockUser = async (profile: UserProfile) => {
    try {
      const newBlockedState = !profile.is_blocked;

      const { error } = await supabase
        .from("profiles")
        .update({ is_blocked: newBlockedState })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      toast({
        title: newBlockedState ? "User blocked" : "User unblocked",
        description: `${profile.full_name} has been ${newBlockedState ? "blocked" : "unblocked"}`,
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">Manage users and grant points</p>
          </div>
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            <Crown className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        </div>

        {/* Search */}
        <Card className="glass mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Grant Points Modal */}
        {selectedUser && (
          <Card className="glass glow-border mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Grant Points to {selectedUser.full_name}
              </CardTitle>
              <CardDescription>
                Add extra points to this user's account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Points to Grant</Label>
                <Input
                  type="number"
                  placeholder="Enter points amount"
                  value={grantPoints}
                  onChange={(e) => setGrantPoints(e.target.value)}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Input
                  placeholder="Reason for granting points"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleGrantPoints} className="flex-1">
                  <Gift className="w-4 h-4 mr-2" />
                  Grant Points
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null);
                    setGrantPoints("");
                    setGrantReason("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((profile) => {
                const points = userPoints.get(profile.user_id);

                return (
                  <div
                    key={profile.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      profile.is_blocked
                        ? "bg-destructive/10 border-destructive/30"
                        : "bg-muted/30 border-border/50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{profile.full_name}</p>
                        {profile.is_blocked && (
                          <Badge variant="destructive" className="text-xs">
                            Blocked
                          </Badge>
                        )}
                        {points?.is_premium && (
                          <Badge className="bg-yellow-500/20 text-yellow-500 text-xs">
                            <Crown className="w-3 h-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Age: {profile.age}</span>
                        <span>
                          Points: {points?.daily_points || 0} daily
                          {points?.monthly_points ? ` + ${points.monthly_points} monthly` : ""}
                        </span>
                        <span>Joined: {new Date(profile.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(profile)}
                        disabled={profile.is_blocked}
                      >
                        <Gift className="w-4 h-4 mr-1" />
                        Grant
                      </Button>
                      <Button
                        variant={profile.is_blocked ? "default" : "destructive"}
                        size="sm"
                        onClick={() => handleBlockUser(profile)}
                      >
                        {profile.is_blocked ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Unblock
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4 mr-1" />
                            Block
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No users found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
