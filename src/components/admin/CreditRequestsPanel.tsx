import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  MessageSquare,
  User
} from "lucide-react";

interface CreditRequest {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "denied";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
}

interface CreditRequestsPanelProps {
  approvalBankCredits: number;
  onRequestProcessed: () => void;
}

export function CreditRequestsPanel({ approvalBankCredits, onRequestProcessed }: CreditRequestsPanelProps) {
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("credit_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data as CreditRequest[]) || []);

      // Fetch user profiles for all requests
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", userIds);

        if (profiles) {
          const usersMap = new Map<string, UserProfile>();
          profiles.forEach(p => usersMap.set(p.user_id, p));
          setUsers(usersMap);
        }
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (request: CreditRequest) => {
    if (request.amount > approvalBankCredits) {
      toast({
        title: "Insufficient credits",
        description: "You don't have enough credits in your Approval Bank",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(request.id);

    try {
      const { error } = await supabase.rpc("approve_credit_request", {
        request_id: request.id,
        admin_notes_text: adminNotes[request.id] || null,
      });

      if (error) throw error;

      toast({
        title: "Request approved!",
        description: `${request.amount} credits granted to user`,
      });

      fetchRequests();
      onRequestProcessed();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to approve request";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (request: CreditRequest) => {
    setProcessingId(request.id);

    try {
      const { error } = await supabase.rpc("deny_credit_request", {
        request_id: request.id,
        admin_notes_text: adminNotes[request.id] || null,
      });

      if (error) throw error;

      toast({
        title: "Request denied",
        description: "The user has been notified",
      });

      fetchRequests();
      onRequestProcessed();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to deny request";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  if (loading) {
    return (
      <Card className="glass">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card className="glass border-yellow-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Pending Requests ({pendingRequests.length})
          </CardTitle>
          <CardDescription>
            Review and process credit requests from users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => {
                const user = users.get(request.user_id);
                const isProcessing = processingId === request.id;
                
                return (
                  <div
                    key={request.id}
                    className="p-4 rounded-lg bg-muted/50 border border-yellow-500/20"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{user?.full_name || "Unknown"}</span>
                          <span className="text-sm text-muted-foreground">({user?.email})</span>
                        </div>
                        <Badge variant="outline" className="text-lg font-bold">
                          {request.amount} credits
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="mb-3 p-2 rounded bg-background/50">
                      <p className="text-sm flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                        {request.reason}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Admin notes (optional)"
                        value={adminNotes[request.id] || ""}
                        onChange={(e) => setAdminNotes({ ...adminNotes, [request.id]: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request)}
                        disabled={isProcessing || request.amount > approvalBankCredits}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeny(request)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            Deny
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {request.amount > approvalBankCredits && (
                      <p className="text-xs text-red-500 mt-2">
                        ⚠️ Insufficient approval bank credits
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests History */}
      {processedRequests.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Recent History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processedRequests.slice(0, 10).map((request) => {
                const user = users.get(request.user_id);
                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-2 rounded bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className={
                          request.status === "approved"
                            ? "bg-green-500/20 text-green-500"
                            : "bg-red-500/20 text-red-500"
                        }
                      >
                        {request.status === "approved" ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {request.status}
                      </Badge>
                      <span className="text-sm">{user?.full_name}</span>
                      <span className="text-sm font-medium">{request.amount} credits</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {request.reviewed_at
                        ? new Date(request.reviewed_at).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
