import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, Plus, MessageSquare, Users } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
  created_by: string;
  created_at: string;
}

interface ChannelSidebarProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  onCreateChannel: () => void;
  userProfiles: Map<string, string>;
}

export function ChannelSidebar({
  channels,
  selectedChannel,
  onSelectChannel,
  onCreateChannel,
}: ChannelSidebarProps) {
  const teamChannels = channels.filter(c => c.channel_type === "team");
  const directChannels = channels.filter(c => c.channel_type === "direct");
  const supportChannels = channels.filter(c => c.channel_type === "support");

  return (
    <div className="w-60 border-r border-border bg-card/50 flex flex-col shrink-0">
      <div className="p-3 border-b border-border">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onCreateChannel}
        >
          <Plus className="w-4 h-4" />
          New Channel
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Team Channels */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-1">
              <Hash className="w-3 h-3 inline mr-1" />
              Team Channels
            </p>
            {teamChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  selectedChannel?.id === ch.id
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Hash className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
            {teamChannels.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1">No channels yet</p>
            )}
          </div>

          {/* Direct Messages */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-1">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Direct Messages
            </p>
            {directChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  selectedChannel?.id === ch.id
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{ch.name}</span>
              </button>
            ))}
            {directChannels.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1">No DMs yet</p>
            )}
          </div>

          {/* Support Channels */}
          {supportChannels.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-1">
                🎧 Support
              </p>
              {supportChannels.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => onSelectChannel(ch)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                    selectedChannel?.id === ch.id
                      ? "bg-primary/20 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
