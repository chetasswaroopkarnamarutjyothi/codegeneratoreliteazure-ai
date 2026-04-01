import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Circle, Copy } from "lucide-react";

interface Collaborator {
  userId: string;
  name: string;
  color: string;
  lastActive: number;
}

interface IDECollaborationProps {
  projectId: string | null;
  userId: string;
  onCodeUpdate?: (code: string) => void;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function IDECollaboration({ projectId, userId, onCodeUpdate }: IDECollaborationProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [userName, setUserName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchName = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .single();
      setUserName(data?.full_name || "Anonymous");
    };
    fetchName();
  }, [userId]);

  useEffect(() => {
    if (!projectId || !userName) return;

    const channel = supabase.channel(`ide-${projectId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const collabs: Collaborator[] = [];
        Object.entries(state).forEach(([key, values]) => {
          const v = values[0] as any;
          collabs.push({
            userId: key,
            name: v.name || "Anonymous",
            color: v.color || COLORS[0],
            lastActive: v.lastActive || Date.now(),
          });
        });
        setCollaborators(collabs);
      })
      .on("broadcast", { event: "code-change" }, ({ payload }) => {
        if (payload.userId !== userId && onCodeUpdate) {
          onCodeUpdate(payload.code);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: userName,
            color: COLORS[Math.abs(hashCode(userId)) % COLORS.length],
            lastActive: Date.now(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, userId, userName, onCodeUpdate]);

  const broadcastCode = useCallback(
    (code: string) => {
      if (!projectId) return;
      const channel = supabase.channel(`ide-${projectId}`);
      channel.send({
        type: "broadcast",
        event: "code-change",
        payload: { code, userId },
      });
    },
    [projectId, userId]
  );

  const shareLink = () => {
    if (!projectId) {
      toast({ title: "Save first", description: "Save the project before sharing.", variant: "destructive" });
      return;
    }
    const url = `${window.location.origin}/ide?project=${projectId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Share this link with collaborators." });
  };

  const otherCollabs = collaborators.filter((c) => c.userId !== userId);

  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
          <Users className="w-3 h-3" />
          Live ({collaborators.length})
        </p>
        <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={shareLink}>
          <Copy className="w-3 h-3 mr-1" />
          Share
        </Button>
      </div>

      {/* Current user */}
      <div className="flex items-center gap-2 px-2 py-1 rounded bg-primary/10">
        <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" />
        <span className="text-xs truncate">{userName} (You)</span>
      </div>

      {/* Other collaborators */}
      {otherCollabs.map((c) => (
        <div key={c.userId} className="flex items-center gap-2 px-2 py-1 rounded bg-muted/30">
          <Circle className="w-2.5 h-2.5 fill-current" style={{ color: c.color }} />
          <span className="text-xs truncate">{c.name}</span>
        </div>
      ))}

      {otherCollabs.length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center py-2">
          No other collaborators yet. Share the link to invite!
        </p>
      )}
    </div>
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export { type IDECollaborationProps };
