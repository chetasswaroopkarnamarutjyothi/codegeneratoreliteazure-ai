import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Shield, 
  Crown, 
  UserPlus, 
  UserMinus, 
  Loader2, 
  CalendarIcon,
  Clock,
  History,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
}

interface AdminManagementLog {
  id: string;
  target_user_id: string;
  action_type: string;
  is_temporary: boolean;
  temp_expires_at: string | null;
  created_at: string;
  notes: string | null;
}

interface AdminManagementProps {
  isSuperAdmin: boolean;
  onAdminChanged: () => void;
}

export function AdminManagement({ isSuperAdmin, onAdminChanged }: AdminManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [managementLogs, setManagementLogs] = useState<AdminManagementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isTemporary, setIsTemporary] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .order("created_at", { ascending: false });

      if (profiles) {
        setUsers(profiles);
      }

      // Fetch admin user IDs
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles) {
        setAdminUserIds(new Set(adminRoles.map(r => r.user_id)));
      }

      // Fetch management logs
      const { data: logs } = await supabase
        .from("admin_management")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (logs) {
        setManagementLogs(logs);
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAdmin = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("grant_admin_role", {
        p_target_user_id: selectedUser.user_id,
        p_is_temporary: isTemporary,
        p_expires_at: isTemporary && expiryDate ? expiryDate.toISOString() : null,
        p_notes: notes || null,
      });

      if (error) throw error;

      toast.success(`Admin role granted to ${selectedUser.full_name}`);
      setSelectedUser(null);
      setIsTemporary(false);
      setExpiryDate(undefined);
      setNotes("");
      onAdminChanged();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to grant admin role");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAdmin = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to revoke admin privileges from ${userName}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("revoke_admin_role", {
        p_target_user_id: userId,
        p_notes: `Revoked by super admin`,
      });

      if (error) throw error;

      toast.success(`Admin role revoked from ${userName}`);
      onAdminChanged();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke admin role");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card className="glass border-amber-500/30">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
          <h3 className="text-lg font-semibold mb-2">Super Admin Access Required</h3>
          <p className="text-muted-foreground">
            Only Chetas Swaroop (kchetasswaroop@gmail.com) can manage admin roles.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grant Admin Section */}
      <Card className="glass border-green-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-500" />
            Grant Admin Role
          </CardTitle>
          <CardDescription>
            Make a user an admin (temporary or permanent)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select User</Label>
            <select
              className="w-full p-2 rounded-md border bg-background"
              value={selectedUser?.user_id || ""}
              onChange={(e) => {
                const user = users.find(u => u.user_id === e.target.value);
                setSelectedUser(user || null);
              }}
            >
              <option value="">Choose a user...</option>
              {users.filter(u => !adminUserIds.has(u.user_id)).map(user => (
                <option key={user.user_id} value={user.user_id}>
                  {user.full_name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={isTemporary}
              onCheckedChange={setIsTemporary}
              id="temporary"
            />
            <Label htmlFor="temporary" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Temporary Admin
            </Label>
          </div>

          {isTemporary && (
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {expiryDate ? format(expiryDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Input
              placeholder="Reason for granting admin..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            onClick={handleGrantAdmin}
            disabled={!selectedUser || actionLoading || (isTemporary && !expiryDate)}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Crown className="w-4 h-4 mr-2" />
            )}
            Grant Admin Role
          </Button>
        </CardContent>
      </Card>

      {/* Current Admins */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-500" />
            Current Admins
          </CardTitle>
          <CardDescription>
            Users with admin privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.filter(u => adminUserIds.has(u.user_id)).map(user => (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
              >
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {user.email === "kchetasswaroop@gmail.com" && (
                    <Badge className="bg-purple-500/20 text-purple-500">
                      <Crown className="w-3 h-3 mr-1" />
                      Super Admin
                    </Badge>
                  )}
                  {user.email !== "kchetasswaroop@gmail.com" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevokeAdmin(user.user_id, user.full_name)}
                      disabled={actionLoading}
                    >
                      <UserMinus className="w-4 h-4 mr-1" />
                      Revoke
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Management History */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Admin Management History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {managementLogs.map(log => {
              const targetUser = users.find(u => u.user_id === log.target_user_id);
              return (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-muted/30 text-sm"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={log.action_type === "grant_admin" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {log.action_type.replace("_", " ").toUpperCase()}
                    </Badge>
                    {log.is_temporary && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Temporary
                      </Badge>
                    )}
                  </div>
                  <p>
                    <strong>{targetUser?.full_name || "Unknown"}</strong> - {targetUser?.email}
                  </p>
                  {log.notes && <p className="text-muted-foreground">{log.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              );
            })}
            {managementLogs.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No management history yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
