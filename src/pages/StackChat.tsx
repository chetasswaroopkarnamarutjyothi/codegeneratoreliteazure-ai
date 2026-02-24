import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  Paperclip,
  Settings,
  Circle,
  Clock,
  MinusCircle,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { CreateChannelDialog } from "@/components/chat/CreateChannelDialog";
import { ChannelSidebar } from "@/components/chat/ChannelSidebar";
import { EmployeeStatusSettings } from "@/components/chat/EmployeeStatusSettings";
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
  file_url: string | null;
  sender_name?: string;
}

interface EmployeeProfile {
  user_id: string;
  full_name: string;
  email: string;
  designation: string | null;
  status: string;
  status_message: string | null;
  avatar_url: string | null;
  last_active_at: string | null;
  ooo_until: string | null;
}

const AUTO_AWAY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

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
  const [members, setMembers] = useState<{ user_id: string; role: string }[]>([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showStatusSettings, setShowStatusSettings] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, string>>(new Map());
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [showPeople, setShowPeople] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const awayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Auto-away logic
  const resetAwayTimer = useCallback(async () => {
    if (!user) return;
    
    if (awayTimerRef.current) clearTimeout(awayTimerRef.current);

    // Set to available if currently auto-away
    const currentProfile = employees.find(e => e.user_id === user.id);
    if (currentProfile?.status === "away") {
      await supabase.from("profiles").update({ status: "available", last_active_at: new Date().toISOString() }).eq("user_id", user.id);
    } else {
      await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("user_id", user.id);
    }

    awayTimerRef.current = setTimeout(async () => {
      // Only auto-away if current status is "available"
      const { data } = await supabase.from("profiles").select("status").eq("user_id", user.id).single();
      if (data?.status === "available") {
        await supabase.from("profiles").update({ status: "away" }).eq("user_id", user.id);
      }
    }, AUTO_AWAY_TIMEOUT);
  }, [user, employees]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    const handler = () => resetAwayTimer();
    events.forEach(e => document.addEventListener(e, handler, { passive: true }));
    resetAwayTimer();
    return () => {
      events.forEach(e => document.removeEventListener(e, handler));
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);
    };
  }, [resetAwayTimer]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }
      setUser(session.user);

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
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

      // Set status to available on login
      await supabase.from("profiles").update({ status: "available", last_active_at: new Date().toISOString() }).eq("user_id", session.user.id);

      await fetchChannels(session.user.id);
      await fetchEmployees();
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchEmployees = async () => {
    // Get all employees and admins
    const { data: empRoles } = await supabase.from("user_roles").select("user_id, role").in("role", ["employee", "admin"]);
    if (!empRoles) return;

    const userIds = [...new Set(empRoles.map(r => r.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email, designation, status, status_message, avatar_url, last_active_at, ooo_until").in("user_id", userIds);
    
    if (profiles) {
      setEmployees(profiles as EmployeeProfile[]);
      const map = new Map<string, string>();
      profiles.forEach(p => map.set(p.user_id, p.full_name));
      setUserProfiles(map);
    }
  };

  const fetchChannels = async (userId: string) => {
    const { data } = await supabase.from("chat_channels").select("*").order("updated_at", { ascending: false });
    if (data) setChannels(data);
  };

  const fetchMessages = async (channelId: string) => {
    const { data } = await supabase.from("chat_messages").select("*").eq("channel_id", channelId).eq("is_deleted", false).order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const fetchMembers = async (channelId: string) => {
    const { data } = await supabase.from("chat_channel_members").select("user_id, role").eq("channel_id", channelId);
    if (data) setMembers(data);
  };

  const handleSelectChannel = async (channel: Channel) => {
    setSelectedChannel(channel);
    setShowPeople(false);
    await Promise.all([fetchMessages(channel.id), fetchMembers(channel.id)]);
  };

  // Real-time messages
  useEffect(() => {
    if (!selectedChannel) return;
    const channel = supabase
      .channel(`messages-${selectedChannel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${selectedChannel.id}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedChannel?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({ channel_id: selectedChannel.id, sender_id: user.id, content: newMessage.trim() });
      if (error) throw error;
      setNewMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChannel || !user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File size must be under 10MB"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${selectedChannel.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("chat-files").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(path);
      
      const { error } = await supabase.from("chat_messages").insert({
        channel_id: selectedChannel.id,
        sender_id: user.id,
        content: `📎 ${file.name}`,
        message_type: "file",
        file_url: urlData.publicUrl,
      });
      if (error) throw error;
      toast.success("File shared!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  };

  const groupedMessages = messages.reduce<Record<string, Message[]>>((acc, msg) => {
    const date = formatDate(msg.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available": return <Circle className="w-2.5 h-2.5 fill-green-500 text-green-500" />;
      case "away": return <Clock className="w-2.5 h-2.5 text-yellow-500" />;
      case "busy": return <MinusCircle className="w-2.5 h-2.5 text-red-500" />;
      case "ooo": return <Calendar className="w-2.5 h-2.5 text-muted-foreground" />;
      default: return <Circle className="w-2.5 h-2.5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available": return "Available";
      case "away": return "Away";
      case "busy": return "Busy";
      case "ooo": return "Out of Office";
      case "dnd": return "Do Not Disturb";
      default: return status;
    }
  };

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
          <Button variant="ghost" size="sm" onClick={() => { setShowPeople(!showPeople); setSelectedChannel(null); }}>
            <Users className="w-4 h-4 mr-1" />
            People
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowStatusSettings(true)} title="Status Settings">
            <Settings className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
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

        {/* Main Area */}
        <div className="flex-1 flex flex-col">
          {showPeople ? (
            /* People Directory */
            <div className="flex-1 overflow-auto">
              <div className="p-6 max-w-3xl mx-auto">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" /> People ({employees.length})
                </h2>
                <div className="space-y-2">
                  {employees.map(emp => (
                    <div key={emp.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors">
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          {emp.avatar_url && <AvatarImage src={emp.avatar_url} />}
                          <AvatarFallback className="bg-primary/20 text-primary text-sm">
                            {emp.full_name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0">{getStatusIcon(emp.status || "available")}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{emp.full_name}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{getStatusLabel(emp.status || "available")}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {emp.designation || "Employee"} • {emp.email}
                        </p>
                        {emp.status_message && (
                          <p className="text-xs text-muted-foreground/70 truncate italic">"{emp.status_message}"</p>
                        )}
                        {emp.ooo_until && new Date(emp.ooo_until) > new Date() && (
                          <p className="text-xs text-yellow-500">OOO until {new Date(emp.ooo_until).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="h-12 border-b border-border px-4 flex items-center gap-2 shrink-0">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{selectedChannel.name}</span>
                {selectedChannel.description && (
                  <span className="text-sm text-muted-foreground ml-2 hidden md:block">— {selectedChannel.description}</span>
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
                              <span className="font-semibold text-sm">{userProfiles.get(msg.sender_id) || "Unknown"}</span>
                              <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                              {msg.is_edited && <span className="text-xs text-muted-foreground">(edited)</span>}
                            </div>
                            {msg.message_type === "file" && msg.file_url ? (
                              <div>
                                <p className="text-sm">{msg.content}</p>
                                <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline hover:no-underline">
                                  Download File
                                </a>
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                            )}
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
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </Button>
                  <Input
                    placeholder={`Message #${selectedChannel.name}`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="flex-1"
                    disabled={sending}
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending} size="icon">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-1">Welcome to StackMind Chat</h3>
                <p className="text-sm">Select a channel or click People to see your team</p>
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
          onCreated={async () => { if (user) await fetchChannels(user.id); }}
        />
      )}

      {showStatusSettings && user && (
        <EmployeeStatusSettings
          open={showStatusSettings}
          onClose={() => setShowStatusSettings(false)}
          userId={user.id}
          onUpdated={fetchEmployees}
        />
      )}
    </div>
  );
}
