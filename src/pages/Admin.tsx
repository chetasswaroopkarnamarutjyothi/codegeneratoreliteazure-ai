import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Shield, 
  Users, 
  Search, 
  Gift, 
  Ban, 
  CheckCircle,
  Crown,
  Wallet,
  ArrowRightLeft,
  Loader2,
  Banknote,
  ClipboardList,
  BarChart3,
  UserX,
  UserPlus,
  IdCard
} from "lucide-react";
import { CreditRequestsPanel } from "@/components/admin/CreditRequestsPanel";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { TicketsPanel } from "@/components/admin/TicketsPanel";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { AdminManagement } from "@/components/admin/AdminManagement";
import { UserUsagePanel } from "@/components/admin/UserUsagePanel";
import { EmployeeTermination } from "@/components/admin/EmployeeTermination";
import type { User } from "@supabase/supabase-js";
import { EmployeeIdGenerator } from "@/components/admin/EmployeeIdGenerator";

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
  approval_bank_credits: number;
  reserved_credits: number;
}

interface AdminCredits {
  daily_points: number;
  monthly_points: number;
  approval_bank_credits: number;
  reserved_credits: number;
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
  const [adminCredits, setAdminCredits] = useState<AdminCredits | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
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
      
      // Check if super admin (Chetas Swaroop)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", session.user.id)
        .single();
      
      if (profileData?.email === "kchetasswaroop@gmail.com") {
        setIsSuperAdmin(true);
      }
      
      await Promise.all([fetchUsers(), fetchAdminCredits(session.user.id)]);
      setLoading(false);
    };

    checkAdmin();
  }, [navigate, toast]);

  const fetchAdminCredits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_points")
        .select("daily_points, monthly_points, approval_bank_credits, reserved_credits")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      setAdminCredits(data);
    } catch (error: any) {
      console.error("Failed to fetch admin credits:", error);
    }
  };

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

  const handleTransferToBank = async () => {
    if (!user || !transferAmount) return;

    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    if (adminCredits && amount > adminCredits.daily_points) {
      toast({
        title: "Insufficient credits",
        description: "You don't have enough daily credits to transfer",
        variant: "destructive",
      });
      return;
    }

    setIsTransferring(true);

    try {
      // Use the database function to transfer credits
      const { error } = await supabase.rpc("transfer_to_approval_bank", {
        amount: amount,
      });

      if (error) throw error;

      toast({
        title: "Transfer successful!",
        description: `${amount.toLocaleString()} credits moved to Approval Bank`,
      });

      setTransferAmount("");
      await fetchAdminCredits(user.id);
    } catch (error: any) {
      toast({
        title: "Transfer failed",
        description: error.message || "Failed to transfer credits",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleGrantFromBank = async () => {
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

    // Check if admin has enough in approval bank
    if (adminCredits && points > (adminCredits.approval_bank_credits || 0)) {
      toast({
        title: "Insufficient bank credits",
        description: "You don't have enough credits in your Approval Bank. Transfer more first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use the database function to grant credits from bank
      const { error } = await supabase.rpc("grant_credits_from_bank", {
        target_user_id: selectedUser.user_id,
        amount: points,
        grant_reason: grantReason || null,
      });

      if (error) throw error;

      toast({
        title: "Credits granted!",
        description: `${points.toLocaleString()} credits sent to ${selectedUser.full_name} from Approval Bank`,
      });

      setSelectedUser(null);
      setGrantPoints("");
      setGrantReason("");
      await Promise.all([fetchUsers(), fetchAdminCredits(user.id)]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to grant credits",
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

  const handlePromoteToEmployee = async (profile: UserProfile) => {
    try {
      // Check if already employee
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id)
        .eq("role", "employee")
        .maybeSingle();

      if (existingRole) {
        toast({ title: "Already an employee", description: `${profile.full_name} is already an employee.` });
        return;
      }

      // Add employee role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.user_id, role: "employee" });

      if (roleError) throw roleError;

      // Add LDAP record
      await supabase
        .from("employee_ldap")
        .insert({ user_id: profile.user_id })
        .throwOnError();

      // Update credits to employee level (100 daily)
      await supabase
        .from("user_points")
        .update({ daily_points: 100 })
        .eq("user_id", profile.user_id);

      toast({
        title: "User promoted!",
        description: `${profile.full_name} is now an employee with 100 daily credits.`,
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to promote user",
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
            <p className="text-muted-foreground">Manage users and grant credits</p>
          </div>
          <Badge variant="secondary" className="bg-primary/20 text-primary hidden sm:flex">
            <Crown className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        </div>

        {/* Admin Credits Overview */}
        {adminCredits && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Daily Credits</p>
                    <p className="text-2xl font-bold">{adminCredits.daily_points.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/20">
                    <Crown className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Credits</p>
                    <p className="text-2xl font-bold">{adminCredits.monthly_points.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-green-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Banknote className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Approval Bank</p>
                    <p className="text-2xl font-bold text-green-500">
                      {(adminCredits.approval_bank_credits || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20">
                    <ArrowRightLeft className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reserved</p>
                    <p className="text-2xl font-bold">{(adminCredits.reserved_credits || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs for different admin sections */}
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid grid-cols-10 w-full max-w-6xl">
            <TabsTrigger value="requests" className="flex items-center gap-1">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-1">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Usage</span>
            </TabsTrigger>
            <TabsTrigger value="transfer" className="flex items-center gap-1">
              <ArrowRightLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Transfer</span>
            </TabsTrigger>
            <TabsTrigger value="employee-ids" className="flex items-center gap-1">
              <IdCard className="w-4 h-4" />
              <span className="hidden sm:inline">Emp IDs</span>
            </TabsTrigger>
            <TabsTrigger value="manage-admins" className="flex items-center gap-1">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Admins</span>
            </TabsTrigger>
            <TabsTrigger value="termination" className="flex items-center gap-1">
              <UserX className="w-4 h-4" />
              <span className="hidden sm:inline">Terminate</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Emails</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Credit Requests Tab */}
          <TabsContent value="requests">
            <CreditRequestsPanel
              approvalBankCredits={adminCredits?.approval_bank_credits || 0}
              onRequestProcessed={() => {
                if (user) fetchAdminCredits(user.id);
                fetchUsers();
              }}
            />
          </TabsContent>

          {/* Support Tickets Tab */}
          <TabsContent value="tickets">
            <TicketsPanel />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <NotificationsPanel />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Search */}
            <Card className="glass">
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

            {/* Grant Credits Modal */}
            {selectedUser && (
              <Card className="glass glow-border border-green-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-green-500" />
                    Grant Credits to {selectedUser.full_name}
                  </CardTitle>
                  <CardDescription>
                    Grant credits from your Approval Bank (Available: {(adminCredits?.approval_bank_credits || 0).toLocaleString()})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Credits to Grant</Label>
                    <Input
                      type="number"
                      placeholder="Enter credits amount"
                      value={grantPoints}
                      onChange={(e) => setGrantPoints(e.target.value)}
                      min={1}
                      max={adminCredits?.approval_bank_credits || 0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (Optional)</Label>
                    <Input
                      placeholder="Reason for granting credits"
                      value={grantReason}
                      onChange={(e) => setGrantReason(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleGrantFromBank} className="flex-1 bg-green-600 hover:bg-green-700">
                      <Gift className="w-4 h-4 mr-2" />
                      Grant from Bank
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

            {/* Users List - Enhanced with Full Credit Details */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  All Users ({filteredUsers.length})
                </CardTitle>
                <CardDescription>
                  Complete list of all registered users with their credit balances
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4 rounded-lg bg-muted/30">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{users.length}</p>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">
                      {Array.from(userPoints.values()).filter(p => p.is_premium).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Premium Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">
                      {users.filter(u => u.is_blocked).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Blocked</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent">
                      {Array.from(userPoints.values()).reduce((sum, p) => sum + (p.daily_points || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Daily Credits</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredUsers.map((profile) => {
                    const points = userPoints.get(profile.user_id);
                    const isUserAdmin = points?.daily_points === 685000 || points?.approval_bank_credits === 285000;

                    return (
                      <div
                        key={profile.id}
                        className={`p-4 rounded-lg border transition-all ${
                          profile.is_blocked
                            ? "bg-destructive/10 border-destructive/30"
                            : isUserAdmin
                            ? "bg-yellow-500/5 border-yellow-500/30"
                            : "bg-muted/30 border-border/50 hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-semibold">{profile.full_name || "No Name"}</p>
                              {profile.is_blocked && (
                                <Badge variant="destructive" className="text-xs">
                                  <Ban className="w-3 h-3 mr-1" />
                                  Blocked
                                </Badge>
                              )}
                              {isUserAdmin && (
                                <Badge className="bg-yellow-500/20 text-yellow-500 text-xs">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                              {points?.is_premium && !isUserAdmin && (
                                <Badge className="bg-purple-500/20 text-purple-500 text-xs">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Premium
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                            
                            {/* Credit Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 p-3 rounded bg-background/50">
                              <div>
                                <p className="text-xs text-muted-foreground">Daily Credits</p>
                                <p className="font-bold text-primary">{(points?.daily_points || 0).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Monthly Credits</p>
                                <p className="font-bold">{(points?.monthly_points || 0).toLocaleString()}</p>
                              </div>
                              {isUserAdmin && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Approval Bank</p>
                                  <p className="font-bold text-green-500">{(points?.approval_bank_credits || 0).toLocaleString()}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-muted-foreground">Age</p>
                                <p className="font-medium">{profile.age || "N/A"}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Joined: {new Date(profile.created_at).toLocaleDateString()}</span>
                              <span>ID: {profile.user_id.slice(0, 8)}...</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
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
                              variant="outline"
                              size="sm"
                              onClick={() => handlePromoteToEmployee(profile)}
                              disabled={profile.is_blocked}
                              className="border-amber-500/30 hover:bg-amber-500/10 text-amber-500"
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Employee
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
          </TabsContent>

          {/* User Usage Tab */}
          <TabsContent value="usage">
            <UserUsagePanel />
          </TabsContent>

          {/* Transfer Tab */}
          <TabsContent value="transfer">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-green-500" />
                  Transfer to Approval Bank
                </CardTitle>
                <CardDescription>
                  Move credits from your daily limit to the Approval Bank for granting to users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Amount to Transfer</Label>
                    <Input
                      type="number"
                      placeholder="Enter credits amount"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      min={1}
                      max={adminCredits?.daily_points || 0}
                    />
                  </div>
                  <Button 
                    onClick={handleTransferToBank} 
                    disabled={isTransferring || !transferAmount}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isTransferring ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                    )}
                    Transfer to Bank
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Credits in the Approval Bank can be granted to users who need immediate credits.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employee IDs Tab */}
          <TabsContent value="employee-ids">
            <EmployeeIdGenerator />
          </TabsContent>

          {/* Admin Management Tab */}
          <TabsContent value="manage-admins">
            <AdminManagement 
              isSuperAdmin={isSuperAdmin}
              onAdminChanged={() => {
                fetchUsers();
                if (user) fetchAdminCredits(user.id);
              }}
            />
          </TabsContent>

          {/* Employee Termination Tab */}
          <TabsContent value="termination">
            <EmployeeTermination isSuperAdmin={isSuperAdmin} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}