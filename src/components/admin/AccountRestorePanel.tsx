import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { AdminExportButton } from "./AdminExportButton";

export function AccountRestorePanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("account_restore_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  const handleRestore = async (id: string) => {
    const tempPwd = tempPasswords[id];
    const response = responses[id];
    if (!tempPwd) {
      toast({ title: "Enter a temporary password", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("account_restore_requests")
      .update({
        status: "restored",
        admin_response: response || "Account restored with temporary credentials",
        temp_password: tempPwd,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Account restore processed" });
      fetchRequests();
    }
  };

  const handleDeny = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("account_restore_requests")
      .update({
        status: "denied",
        admin_response: responses[id] || "Request denied",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    toast({ title: "Request denied" });
    fetchRequests();
  };

  const exportColumns = [
    { key: "email", label: "Email" },
    { key: "reason", label: "Reason" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Requested At" },
  ];

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                Account Restore Requests
              </CardTitle>
              <CardDescription>Restore user access with temporary credentials</CardDescription>
            </div>
            <AdminExportButton data={requests} columns={exportColumns} fileName="account_restores" tabName="Account Restore" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : requests.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No restore requests</p>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="p-4 rounded-lg border bg-muted/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{req.email}</p>
                      <p className="text-sm text-muted-foreground">{req.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(req.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant={req.status === "restored" ? "default" : req.status === "denied" ? "destructive" : "secondary"}>
                      {req.status === "restored" ? <CheckCircle className="w-3 h-3 mr-1" /> : req.status === "denied" ? <XCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                      {req.status}
                    </Badge>
                  </div>
                  {req.status === "pending" && (
                    <div className="space-y-2 mt-3">
                      <Input
                        placeholder="Temporary password"
                        value={tempPasswords[req.id] || ""}
                        onChange={(e) => setTempPasswords(p => ({ ...p, [req.id]: e.target.value }))}
                      />
                      <Textarea
                        placeholder="Admin response..."
                        value={responses[req.id] || ""}
                        onChange={(e) => setResponses(p => ({ ...p, [req.id]: e.target.value }))}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleRestore(req.id)}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Restore
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeny(req.id)}>
                          <XCircle className="w-4 h-4 mr-1" /> Deny
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
