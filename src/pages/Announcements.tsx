import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Megaphone, Pin } from "lucide-react";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_published", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      setAnnouncements(data || []);
      setLoading(false);
    };
    init();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const priorityColor = (p: string) => {
    if (p === "urgent") return "bg-red-500/20 text-red-500 border-red-500/30";
    if (p === "high") return "bg-orange-500/20 text-orange-500 border-orange-500/30";
    return "bg-blue-500/20 text-blue-500 border-blue-500/30";
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
              <span className="gradient-text animate-gradient">Announcements</span>
            </h1>
            <p className="text-muted-foreground">Latest updates from StackMind Technologies</p>
          </div>
        </div>

        {announcements.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-12 text-center">
              <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No announcements yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <Card key={a.id} className={`glass ${a.is_pinned ? "glow-border" : ""}`}>
                <CardHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.is_pinned && (
                      <Pin className="w-4 h-4 text-primary" />
                    )}
                    <CardTitle className="text-lg">{a.title}</CardTitle>
                    <Badge className={`text-xs ${priorityColor(a.priority)}`}>
                      {a.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.published_at || a.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric"
                    })}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{a.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
