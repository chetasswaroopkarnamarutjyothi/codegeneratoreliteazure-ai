import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Loader2, Paperclip, Users, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserOption {
  user_id: string;
  full_name: string;
  email: string;
}

export function AdminMailPanel() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [closure, setClosure] = useState("Best Regards,\nStackCodeNova AI Admin Team\nStackMind Technologies Limited");
  const [sending, setSending] = useState(false);
  const [sentMails, setSentMails] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchSentMails();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name, email").order("full_name");
    if (data) setUsers(data);
  };

  const fetchSentMails = async () => {
    const { data } = await supabase
      .from("email_notifications")
      .select("*")
      .eq("notification_type", "admin_mail")
      .order("sent_at", { ascending: false })
      .limit(20);
    if (data) setSentMails(data);
  };

  const selectedUser = users.find(u => u.user_id === selectedUserId);

  const getFromAddress = () => {
    if (!selectedUser) return "admin@stackmind.com";
    // Check if Indian user (simple heuristic - can be enhanced)
    const isIndian = selectedUser.email.endsWith(".in") || selectedUser.email.includes("gmail") || selectedUser.email.includes("yahoo.in");
    return isIndian ? "admin@stackmind.in" : "admin@stackmind.com";
  };

  const handleSend = async () => {
    if (!selectedUserId || !subject.trim() || !content.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const fromAddress = getFromAddress();
      const fullBody = `From: ${fromAddress}\nTo: ${selectedUser?.email}\n\n${content}\n\n${closure}`;

      const { error } = await supabase.from("email_notifications").insert({
        recipient_user_id: selectedUserId,
        recipient_email: selectedUser?.email || "",
        notification_type: "admin_mail",
        subject,
        body: fullBody,
        metadata: {
          from_address: fromAddress,
          closure,
          sent_by: session.user.id,
        },
      });

      if (error) throw error;

      toast({ title: "✉️ Mail sent!", description: `Email sent to ${selectedUser?.full_name}` });
      setSubject("");
      setContent("");
      setSelectedUserId("");
      fetchSentMails();
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Admin Mail
          </CardTitle>
          <CardDescription>Send emails to users and enterprises</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4" /> From
            </Label>
            <Input value={getFromAddress()} disabled className="bg-muted/50" />
          </div>

          {/* To */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" /> To
            </Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {users.map(u => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    {u.full_name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your email content here..."
              className="min-h-[150px]"
            />
          </div>

          {/* Closure */}
          <div className="space-y-2">
            <Label>Closure</Label>
            <Textarea
              value={closure}
              onChange={(e) => setClosure(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <Button onClick={handleSend} disabled={sending} className="w-full">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Mail
          </Button>
        </CardContent>
      </Card>

      {/* Sent Mail History */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm">Recent Sent Mails</CardTitle>
        </CardHeader>
        <CardContent>
          {sentMails.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No mails sent yet</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {sentMails.map(mail => (
                <div key={mail.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{mail.subject}</span>
                    <Badge variant="outline" className="text-xs">
                      {new Date(mail.sent_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">To: {mail.recipient_email}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
