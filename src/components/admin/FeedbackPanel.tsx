import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Star, Send } from "lucide-react";

export function FeedbackPanel() {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => { fetchFeedback(); }, []);

  const fetchFeedback = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    setFeedbackList(data || []);
  };

  const respond = async (id: string) => {
    const response = responses[id];
    if (!response?.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("feedback").update({
      admin_response: response.trim(),
      responded_by: user?.id,
      responded_at: new Date().toISOString(),
      status: "resolved",
    }).eq("id", id);
    setResponses({ ...responses, [id]: "" });
    await fetchFeedback();
    toast({ title: "Response sent!" });
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("feedback").update({ status }).eq("id", id);
    await fetchFeedback();
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          User Feedback ({feedbackList.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedbackList.map((fb) => (
          <div key={fb.id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="capitalize text-xs">{fb.category}</Badge>
              <Select value={fb.status} onValueChange={(v) => updateStatus(fb.id, v)}>
                <SelectTrigger className="h-6 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              {fb.rating && (
                <div className="flex">{Array.from({ length: fb.rating }).map((_, i) => <Star key={i} className="w-3 h-3 text-yellow-500 fill-yellow-500" />)}</div>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{new Date(fb.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm mb-2">{fb.message}</p>
            <p className="text-xs text-muted-foreground">User: {fb.user_id.slice(0, 8)}...</p>
            {fb.admin_response ? (
              <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20">
                <p className="text-xs font-medium text-primary">Your response:</p>
                <p className="text-sm">{fb.admin_response}</p>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <Textarea
                  placeholder="Write a response..."
                  value={responses[fb.id] || ""}
                  onChange={(e) => setResponses({ ...responses, [fb.id]: e.target.value })}
                  className="text-sm min-h-[60px]"
                />
                <Button size="sm" onClick={() => respond(fb.id)} disabled={!responses[fb.id]?.trim()}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {feedbackList.length === 0 && <p className="text-center text-muted-foreground py-8">No feedback yet</p>}
      </CardContent>
    </Card>
  );
}
