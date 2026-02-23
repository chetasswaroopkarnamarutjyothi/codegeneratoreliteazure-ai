import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, UserX, Loader2, Shield, History } from "lucide-react";
import { toast } from "sonner";

interface EmployeeTerminationProps {
  isSuperAdmin: boolean;
}

interface Employee {
  user_id: string;
  full_name: string;
  email: string;
}

interface TerminationLog {
  id: string;
  employee_user_id: string;
  reason: string;
  terminated_at: string;
}

export function EmployeeTermination({ isSuperAdmin }: EmployeeTerminationProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [terminations, setTerminations] = useState<TerminationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [reason, setReason] = useState("");
  const [terminating, setTerminating] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) fetchData();
  }, [isSuperAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get employees
      const { data: empRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "employee");

      if (empRoles && empRoles.length > 0) {
        const empIds = empRoles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", empIds);
        
        if (profiles) setEmployees(profiles);
      }

      // Get termination logs
      const { data: logs } = await supabase
        .from("employee_terminations")
        .select("*")
        .order("terminated_at", { ascending: false })
        .limit(20);
      
      if (logs) setTerminations(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminate = async () => {
    if (!selectedEmployee || !reason.trim()) {
      toast.error("Select an employee and provide a reason");
      return;
    }

    const emp = employees.find(e => e.user_id === selectedEmployee);
    if (!confirm(`Are you sure you want to terminate ${emp?.full_name}? This will block their account and remove all access.`)) {
      return;
    }

    setTerminating(true);
    try {
      // 1. Block the user profile
      const { error: blockError } = await supabase
        .from("profiles")
        .update({ is_blocked: true })
        .eq("user_id", selectedEmployee);
      if (blockError) throw blockError;

      // 2. Remove employee role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedEmployee)
        .eq("role", "employee");
      if (roleError) throw roleError;

      // 3. Log termination
      const { data: { session } } = await supabase.auth.getSession();
      const { error: logError } = await supabase
        .from("employee_terminations")
        .insert({
          employee_user_id: selectedEmployee,
          terminated_by: session!.user.id,
          reason: reason.trim(),
        });
      if (logError) throw logError;

      // 4. Reset credits to 0
      const { error: pointsError } = await supabase
        .from("user_points")
        .update({ daily_points: 0, monthly_points: 0, approval_bank_credits: 0 })
        .eq("user_id", selectedEmployee);
      if (pointsError) throw pointsError;

      toast.success(`${emp?.full_name} has been terminated`);
      setSelectedEmployee("");
      setReason("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to terminate employee");
    } finally {
      setTerminating(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card className="glass border-destructive/30">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Super Admin Only</h3>
          <p className="text-muted-foreground">Only the super admin can terminate employees.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="glass border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <UserX className="w-5 h-5" />
            Employee Termination
          </CardTitle>
          <CardDescription>
            Terminate an employee — this blocks their account and revokes all access permanently
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Employee</Label>
            <select
              className="w-full p-2 rounded-md border bg-background"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">Choose an employee...</option>
              {employees.map(emp => (
                <option key={emp.user_id} value={emp.user_id}>
                  {emp.full_name} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Reason for Termination</Label>
            <Textarea
              placeholder="Provide a detailed reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            variant="destructive"
            onClick={handleTerminate}
            disabled={!selectedEmployee || !reason.trim() || terminating}
            className="w-full"
          >
            {terminating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserX className="w-4 h-4 mr-2" />}
            Terminate Employee
          </Button>
        </CardContent>
      </Card>

      {/* Termination History */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Termination History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {terminations.map(t => (
              <div key={t.id} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive" className="text-xs">TERMINATED</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.terminated_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-muted-foreground">{t.reason}</p>
              </div>
            ))}
            {terminations.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No terminations recorded</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
