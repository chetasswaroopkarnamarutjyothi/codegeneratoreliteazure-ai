import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Bug, 
  Lightbulb, 
  Send, 
  Loader2, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  MessageSquare
} from "lucide-react";
import { useEffect } from "react";

interface SupportTicket {
  id: string;
  ticket_type: "bug" | "suggestion";
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "declined";
  admin_response: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface SupportTicketFormProps {
  userId: string;
}

export default function SupportTicketForm({ userId }: SupportTicketFormProps) {
  const [ticketType, setTicketType] = useState<"bug" | "suggestion">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    fetchTickets();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('support-tickets-user')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets((data as SupportTicket[]) || []);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: userId,
        ticket_type: ticketType,
        title: title.trim(),
        description: description.trim(),
      });

      if (error) throw error;

      toast.success("Ticket submitted successfully!");
      setTitle("");
      setDescription("");
      fetchTickets();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500"><Clock className="w-3 h-3 mr-1" />Open</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-500"><Loader2 className="w-3 h-3 mr-1" />In Progress</Badge>;
      case "resolved":
        return <Badge variant="secondary" className="bg-green-500/20 text-green-500"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      case "declined":
        return <Badge variant="secondary" className="bg-red-500/20 text-red-500"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Submit New Ticket */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Report Issue or Suggestion
          </CardTitle>
          <CardDescription>
            Submit bugs or suggestions. Valid suggestions earn +2 credits; declined ones apply a 4-month penalty (-11 credits/day).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Ticket Type</Label>
              <Select value={ticketType} onValueChange={(v) => setTicketType(v as "bug" | "suggestion")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">
                    <div className="flex items-center gap-2">
                      <Bug className="w-4 h-4 text-red-500" />
                      Bug Report
                    </div>
                  </SelectItem>
                  <SelectItem value="suggestion">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Suggestion
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Brief summary of the issue or suggestion"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide detailed information..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            {ticketType === "suggestion" && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-500">Important</p>
                    <p className="text-muted-foreground">
                      Approved suggestions earn +2 credits. Declined suggestions result in a 4-month penalty 
                      where your daily credits are reduced from 50 to 39.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Ticket
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Tickets */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Your Tickets ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTickets ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No tickets submitted yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`p-4 rounded-lg border ${
                    ticket.status === "resolved" 
                      ? "bg-green-500/5 border-green-500/20" 
                      : ticket.status === "declined"
                      ? "bg-red-500/5 border-red-500/20"
                      : "bg-muted/50 border-border"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {ticket.ticket_type === "bug" ? (
                        <Bug className="w-4 h-4 text-red-500" />
                      ) : (
                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="font-medium">{ticket.title}</span>
                    </div>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{ticket.description}</p>
                  
                  {ticket.admin_response && (
                    <div className="mt-3 p-3 rounded bg-background/50 border border-border/50">
                      <p className="text-xs font-medium text-primary mb-1">Admin Response:</p>
                      <p className="text-sm">{ticket.admin_response}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Submitted: {new Date(ticket.created_at).toLocaleDateString()}</span>
                    {ticket.reviewed_at && (
                      <span>Reviewed: {new Date(ticket.reviewed_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
