import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Plus, Trash2, Pin, Loader2 } from "lucide-react";

export function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");
  const [isPinned, setIsPinned] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setAnnouncements(data || []);
  };

  const createAnnouncement = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("announcements").insert({
        created_by: user.id,
        title: title.trim(),
        content: content.trim(),
        priority,
        is_pinned: isPinned,
      });
      if (error) throw error;
      setTitle(""); setContent(""); setPriority("normal"); setIsPinned(false);
      await fetchAnnouncements();
      toast({ title: "✅ Announcement created!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    await fetchAnnouncements();
    toast({ title: "Announcement deleted" });
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("announcements").update({ is_published: !current }).eq("id", id);
    await fetchAnnouncements();
  };

  return (
    <div className="space-y-6">
      <Card className="glass glow-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create Announcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="Announcement title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea placeholder="Write the announcement..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[100px]" />
          </div>
          <div className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={isPinned} onCheckedChange={setIsPinned} />
              <Label className="flex items-center gap-1"><Pin className="w-3 h-3" /> Pin</Label>
            </div>
          </div>
          <Button onClick={createAnnouncement} disabled={creating} className="w-full">
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Megaphone className="w-4 h-4 mr-2" />}
            Publish Announcement
          </Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>All Announcements ({announcements.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {a.is_pinned && <Pin className="w-3 h-3 text-primary" />}
                  <span className="font-medium">{a.title}</span>
                  <Badge variant="outline" className="text-xs">{a.priority}</Badge>
                  <Badge className={`text-xs ${a.is_published ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                    {a.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{a.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm" onClick={() => togglePublish(a.id, a.is_published)}>
                  {a.is_published ? "Unpublish" : "Publish"}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => deleteAnnouncement(a.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          {announcements.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No announcements yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
