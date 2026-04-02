import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MessageSquarePlus, Star, Send, Loader2, CheckCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function Feedback() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }
      setUser(session.user);
      await fetchFeedback(session.user.id);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchFeedback = async (userId: string) => {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setFeedbackList(data || []);
  };

  const handleSubmit = async () => {
    if (!user || !message.trim()) {
      toast({ title: "Please enter your feedback", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        category,
        message: message.trim(),
        rating: rating || null,
      });
      if (error) throw error;
      setSubmitted(true);
      setMessage("");
      setRating(0);
      await fetchFeedback(user.id);
      toast({ title: "✅ Feedback submitted!", description: "Thank you for your feedback." });
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === "resolved") return "bg-green-500/20 text-green-500";
    if (s === "in_progress") return "bg-blue-500/20 text-blue-500";
    return "bg-yellow-500/20 text-yellow-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              <span className="gradient-text animate-gradient">Feedback</span>
            </h1>
            <p className="text-muted-foreground">Help us improve CodeNova</p>
          </div>
        </div>

        {/* Submit Form */}
        <Card className="glass glow-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-primary" />
              Share Your Feedback
            </CardTitle>
            <CardDescription>We read every submission and use it to make CodeNova better.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">💬 General</SelectItem>
                    <SelectItem value="bug">🐛 Bug Report</SelectItem>
                    <SelectItem value="feature">✨ Feature Request</SelectItem>
                    <SelectItem value="improvement">📈 Improvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rating (optional)</Label>
                <div className="flex gap-1 pt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setRating(s)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-6 h-6 ${s <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Your Feedback</Label>
              <Textarea
                placeholder="Tell us what you think..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <Button onClick={handleSubmit} disabled={submitting || !message.trim()} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : submitted ? <CheckCircle className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {submitted ? "Submitted!" : "Submit Feedback"}
            </Button>
          </CardContent>
        </Card>

        {/* Previous Feedback */}
        {feedbackList.length > 0 && (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Your Previous Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedbackList.map((fb) => (
                <div key={fb.id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs capitalize">{fb.category}</Badge>
                    <Badge className={`text-xs ${statusColor(fb.status)}`}>{fb.status}</Badge>
                    {fb.rating && (
                      <div className="flex">
                        {Array.from({ length: fb.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(fb.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{fb.message}</p>
                  {fb.admin_response && (
                    <div className="mt-3 p-3 rounded bg-primary/5 border border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1">Admin Response:</p>
                      <p className="text-sm">{fb.admin_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
