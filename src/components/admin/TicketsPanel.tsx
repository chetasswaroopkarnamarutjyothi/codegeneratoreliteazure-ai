import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Bug, 
  Lightbulb, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  MessageSquare,
  User
} from "lucide-react";

interface SupportTicket {
  id: string;
  user_id: string;
  ticket_type: "bug" | "suggestion";
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "declined";
  admin_response: string | null;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  username: string | null;
}

export function TicketsPanel() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('support-tickets-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets((data as SupportTicket[]) || []);

      // Fetch user profiles
      const userIds = [...new Set((data || []).map(t => t.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, full_name, username")
          .in("user_id", userIds);

        if (profiles) {
          const usersMap = new Map<string, UserProfile>();
          profiles.forEach(p => usersMap.set(p.user_id, p));
          setUsers(usersMap);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (ticket: SupportTicket, status: "resolved" | "declined" | "in_progress") => {
    setProcessingId(ticket.id);

    try {
      const { error } = await supabase.rpc("resolve_ticket", {
        p_ticket_id: ticket.id,
        p_status: status,
        p_admin_response: responses[ticket.id] || null,
      });

      if (error) throw error;

      toast({
        title: status === "resolved" ? "Ticket Resolved!" : status === "declined" ? "Ticket Declined" : "Ticket Updated",
        description: ticket.ticket_type === "suggestion" && status === "resolved" 
          ? "User awarded +2 credits"
          : ticket.ticket_type === "suggestion" && status === "declined"
          ? "User penalized with 4-month credit reduction"
          : "Ticket status updated",
      });

      fetchTickets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openTickets = tickets.filter(t => t.status === "open");
  const inProgressTickets = tickets.filter(t => t.status === "in_progress");
  const closedTickets = tickets.filter(t => t.status === "resolved" || t.status === "declined");

  if (loading) {
    return (
      <Card className="glass">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const TicketCard = ({ ticket }: { ticket: SupportTicket }) => {
    const user = users.get(ticket.user_id);
    const isProcessing = processingId === ticket.id;
    
    return (
      <div className={`p-4 rounded-lg border ${
        ticket.ticket_type === "bug" ? "border-red-500/20" : "border-yellow-500/20"
      } bg-muted/50`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {ticket.ticket_type === "bug" ? (
                <Bug className="w-4 h-4 text-red-500" />
              ) : (
                <Lightbulb className="w-4 h-4 text-yellow-500" />
              )}
              <span className="font-medium">{ticket.title}</span>
              <Badge variant="outline" className="text-xs">
                {ticket.ticket_type}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-3 h-3" />
              <span>{user?.full_name || "Unknown"}</span>
              <span>({user?.email})</span>
              {user?.username && <span>@{user.username}</span>}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(ticket.created_at).toLocaleString()}
          </span>
        </div>

        <div className="p-3 rounded bg-background/50 mb-3">
          <p className="text-sm">{ticket.description}</p>
        </div>

        {ticket.status === "open" || ticket.status === "in_progress" ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Admin response..."
              value={responses[ticket.id] || ""}
              onChange={(e) => setResponses({ ...responses, [ticket.id]: e.target.value })}
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleResolve(ticket, "resolved")}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {ticket.ticket_type === "suggestion" ? "Approve (+2 credits)" : "Resolve"}
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleResolve(ticket, "declined")}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <XCircle className="w-4 h-4 mr-1" />
                    {ticket.ticket_type === "suggestion" ? "Decline (penalty)" : "Close"}
                  </>
                )}
              </Button>
              {ticket.status === "open" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolve(ticket, "in_progress")}
                  disabled={isProcessing}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  Mark In Progress
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge className={ticket.status === "resolved" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
              {ticket.status === "resolved" ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
              {ticket.status}
            </Badge>
            {ticket.admin_response && (
              <span className="text-sm text-muted-foreground">Response: {ticket.admin_response}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Tabs defaultValue="open" className="space-y-4">
      <TabsList>
        <TabsTrigger value="open" className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          Open ({openTickets.length})
        </TabsTrigger>
        <TabsTrigger value="in_progress" className="flex items-center gap-1">
          <Loader2 className="w-4 h-4" />
          In Progress ({inProgressTickets.length})
        </TabsTrigger>
        <TabsTrigger value="closed" className="flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          Closed ({closedTickets.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="open">
        <Card className="glass border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-yellow-500" />
              Open Tickets
            </CardTitle>
            <CardDescription>
              Review and respond to user tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No open tickets</p>
              </div>
            ) : (
              <div className="space-y-4">
                {openTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="in_progress">
        <Card className="glass border-blue-500/30">
          <CardHeader>
            <CardTitle>In Progress Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {inProgressTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tickets in progress</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inProgressTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="closed">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Closed Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {closedTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No closed tickets</p>
              </div>
            ) : (
              <div className="space-y-4">
                {closedTickets.slice(0, 20).map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
