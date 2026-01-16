import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface CreditRequest {
  id: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "denied";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface CreditRequestFormProps {
  userId: string;
  currentCredits: number;
  onRequestSubmitted?: () => void;
}

export function CreditRequestForm({ userId, currentCredits, onRequestSubmitted }: CreditRequestFormProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("credit_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRequests((data as CreditRequest[]) || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchRequests();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requestAmount = parseInt(amount);
    if (isNaN(requestAmount) || requestAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Reason required",
        description: "Please explain why you need additional credits",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("credit_requests")
        .insert({
          user_id: userId,
          amount: requestAmount,
          reason: reason.trim(),
        });

      if (error) throw error;

      toast({
        title: "Request submitted!",
        description: "An admin will review your request soon.",
      });

      setAmount("");
      setReason("");
      fetchRequests();
      onRequestSubmitted?.();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit request";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="secondary" className="bg-green-500/20 text-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="secondary" className="bg-red-500/20 text-red-500">
            <XCircle className="w-3 h-3 mr-1" />
            Denied
          </Badge>
        );
      default:
        return null;
    }
  };

  const pendingRequest = requests.find(r => r.status === "pending");

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Request Credits
          </CardTitle>
          <CardDescription>
            Need more credits? Submit a request and an admin will review it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequest ? (
            <div className="text-center py-4">
              <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-medium mb-1">Request Pending</h3>
              <p className="text-sm text-muted-foreground mb-2">
                You have a pending request for {pendingRequest.amount} credits.
              </p>
              <p className="text-xs text-muted-foreground">
                Please wait for admin review before submitting another request.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Credits Amount</Label>
                <Input
                  type="number"
                  placeholder="How many credits do you need?"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={1}
                  max={1000}
                />
                <p className="text-xs text-muted-foreground">
                  Current balance: {currentCredits} credits
                </p>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Explain why you need additional credits..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit Request
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Request History */}
      {requests.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Request History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{request.amount} credits</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {request.reason}
                      </p>
                      {request.admin_notes && (
                        <p className="text-xs text-primary mt-1">
                          Admin: {request.admin_notes}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
