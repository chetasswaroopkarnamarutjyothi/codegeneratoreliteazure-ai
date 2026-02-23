import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Hash,
  Send,
  Plus,
  Users,
  MessageSquare,
  Loader2,
  Phone,
  Video,
  Monitor,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { CreateChannelDialog } from "@/components/chat/CreateChannelDialog";
import { ChannelSidebar } from "@/components/chat/ChannelSidebar";
import type { User } from "@supabase/supabase-js";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
  created_by: string;
  created_at: string;
}

interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  sender_name?: string;
}

interface ChannelMember {
  user_id: string;
  role: string;
  full_name?: string;
  email?: string;
}

export default function StackChat() {
  const [user, setUser] = useState<User | null>(null);
  const [isEmployee, setIsEmployee] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      // Check role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const roleSet = new Set(roles?.map(r => r.role) || []);
      const emp = roleSet.has("employee");
      const adm = roleSet.has("admin");

      if (!emp && !adm) {
        toast.error("Stack Chat is only available for employees");
        navigate("/");
        return;
      }

      setIsEmployee(emp);
      setIsAdmin(adm);

      // Fetch channels user is a member of
      await fetchChannels(session.user.id);
      
      // Fetch profiles for display names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name");
      if (profiles) {
        const map = new Map<string, string>();
        profiles.forEach(p => map.set(p.user_id, p.full_name));
        setUserProfiles(map);
      }

      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchChannels = async (userId: string) => {
    const { data } = await supabase
      .from("chat_channels")
      .select("*")
      .order("updated_at", { ascending: false });
    
    if (data) setChannels(data);
  };

  const fetchMessages = async (channelId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("channel_id", channelId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true });
    
    if (data) setMessages(data);
  };

  const fetchMembers = async (channelId: string) => {
    const { data } = await supabase
      .from("chat_channel_members")
      .select("user_id, role")
      .eq("channel_id", channelId);
    
    if (data) setMembers(data);
  };

  // Select channel
  const handleSelectChannel = async (channel: Channel) => {
    setSelectedChannel(channel);
    await Promise.all([fetchMessages(channel.id), fetchMembers(channel.id)]);
  };

  // Real-time messages subscription
  useEffect(() => {
    if (!selectedChannel) return;

    const channel = supabase
      .channel(`messages-${selectedChannel.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${selectedChannel.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChannel?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          channel_id: selectedChannel.id,
          sender_id: user.id,
          content: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = messages.reduce<Record<string, Message[]>>((acc, msg) => {
    const date = formatDate(msg.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-card/80 backdrop-blur-lg shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <MessageSquare className="w-6 h-6 text-primary" />
        <h1 className="text-lg font-bold">StackMind Chat</h1>
        <Badge variant="secondary" className="ml-2">
          <Lock className="w-3 h-3 mr-1" />
          Employees Only
        </Badge>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="Voice Call (Coming Soon)" disabled>
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Video Call (Coming Soon)" disabled>
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Screen Share (Coming Soon)" disabled>
            <Monitor className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ChannelSidebar
          channels={channels}
          selectedChannel={selectedChannel}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={() => setShowCreateChannel(true)}
          userProfiles={userProfiles}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="h-12 border-b border-border px-4 flex items-center gap-2 shrink-0">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{selectedChannel.name}</span>
                {selectedChannel.description && (
                  <span className="text-sm text-muted-foreground ml-2 hidden md:block">
                    — {selectedChannel.description}
                  </span>
                )}
                <div className="flex-1" />
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {members.length}
                </Badge>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                      <div className="flex items-center gap-2 my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground font-medium">{date}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      {msgs.map((msg) => (
                        <div key={msg.id} className="flex items-start gap-3 py-1.5 hover:bg-muted/30 rounded-lg px-2 group">
                          <Avatar className="w-8 h-8 mt-0.5 shrink-0">
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {(userProfiles.get(msg.sender_id) || "?")[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold text-sm">
                                {userProfiles.get(msg.sender_id) || "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(msg.created_at)}
                              </span>
                              {msg.is_edited && (
                                <span className="text-xs text-muted-foreground">(edited)</span>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border shrink-0">
                <div className="flex items-center gap-2 max-w-3xl mx-auto">
                  <Input
                    placeholder={`Message #${selectedChannel.name}`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    size="icon"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-1">Welcome to StackMind Chat</h3>
                <p className="text-sm">Select a channel or create one to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateChannel && user && (
        <CreateChannelDialog
          open={showCreateChannel}
          onClose={() => setShowCreateChannel(false)}
          userId={user.id}
          onCreated={async () => {
            if (user) await fetchChannels(user.id);
          }}
        />
      )}
    </div>
  );
}
