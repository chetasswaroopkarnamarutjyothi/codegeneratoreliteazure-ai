import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

interface Employee {
  user_id: string;
  full_name: string;
  email: string;
  designation: string | null;
  employee_id: string | null;
}

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onCreated: () => void;
}

export function CreateChannelDialog({ open, onClose, userId, onCreated }: CreateChannelDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("team");
  const [creating, setCreating] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [dmRecipient, setDmRecipient] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) fetchEmployees();
  }, [open]);

  const fetchEmployees = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["employee", "admin"]);
    if (!roles) return;

    const ids = roles.map(r => r.user_id).filter(id => id !== userId);
    if (ids.length === 0) { setEmployees([]); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, designation")
      .in("user_id", ids);
    if (profiles) setEmployees(profiles.map(p => ({ ...p, employee_id: null })) as Employee[]);
  };

  const filteredEmployees = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (uid: string) => {
    setSelectedMembers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() && type !== "direct") {
      toast.error("Channel name is required");
      return;
    }

    if (type === "team" && selectedMembers.length === 0) {
      toast.error("Select at least one participant");
      return;
    }

    if (type === "direct" && !dmRecipient) {
      toast.error("Select a recipient for the direct message");
      return;
    }

    setCreating(true);
    try {
      let channelName = name.trim().toLowerCase().replace(/\s+/g, "-");
      
      if (type === "direct") {
        const recipient = employees.find(e => e.user_id === dmRecipient);
        channelName = `dm-${Date.now().toString(36)}`;
        // Use recipient name as description
        const { data: myProfile } = await supabase.from("profiles").select("full_name").eq("user_id", userId).single();
        const desc = `${myProfile?.full_name || "You"} ↔ ${recipient?.full_name || "Unknown"}`;
        
        const { data: channel, error } = await supabase
          .from("chat_channels")
          .insert({
            name: channelName,
            description: desc,
            channel_type: "direct",
            created_by: userId,
          })
          .select()
          .single();

        if (error) throw error;

        // Add both users as members
        const { error: m1 } = await supabase.from("chat_channel_members").insert({ channel_id: channel.id, user_id: userId, role: "owner" });
        if (m1) throw m1;
        const { error: m2 } = await supabase.from("chat_channel_members").insert({ channel_id: channel.id, user_id: dmRecipient, role: "member" });
        if (m2) throw m2;

        toast.success("Direct message created!");
      } else {
        // Team or support channel
        const { data: channel, error } = await supabase
          .from("chat_channels")
          .insert({
            name: channelName,
            description: description.trim() || null,
            channel_type: type,
            created_by: userId,
          })
          .select()
          .single();

        if (error) throw error;

        // Add creator as owner
        const { error: ownerErr } = await supabase
          .from("chat_channel_members")
          .insert({ channel_id: channel.id, user_id: userId, role: "owner" });
        if (ownerErr) throw ownerErr;

        // Add selected members
        for (const memberId of selectedMembers) {
          await supabase.from("chat_channel_members").insert({
            channel_id: channel.id,
            user_id: memberId,
            role: "member",
          });
        }

        toast.success(`#${channel.name} created with ${selectedMembers.length + 1} members!`);
      }

      onCreated();
      onClose();
      setName("");
      setDescription("");
      setType("team");
      setSelectedMembers([]);
      setDmRecipient("");
      setSearch("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create channel");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>Create a new team channel or direct message</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Channel Type</Label>
            <Select value={type} onValueChange={(v) => { setType(v); setSelectedMembers([]); setDmRecipient(""); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team">Team Channel</SelectItem>
                <SelectItem value="direct">Direct Message</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type !== "direct" && (
            <>
              <div className="space-y-2">
                <Label>Channel Name</Label>
                <Input
                  placeholder="e.g. general, engineering, design"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="What's this channel about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Member Selection */}
          <div className="space-y-2">
            <Label>{type === "direct" ? "Select Recipient" : "Select Participants"}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-48 border rounded-md">
              <div className="p-2 space-y-1">
                {filteredEmployees.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No employees found</p>
                )}
                {filteredEmployees.map(emp => (
                  <button
                    key={emp.user_id}
                    onClick={() => {
                      if (type === "direct") {
                        setDmRecipient(emp.user_id);
                      } else {
                        toggleMember(emp.user_id);
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                      (type === "direct" && dmRecipient === emp.user_id) || selectedMembers.includes(emp.user_id)
                        ? "bg-primary/20 border border-primary/30"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {type !== "direct" && (
                      <Checkbox
                        checked={selectedMembers.includes(emp.user_id)}
                        className="pointer-events-none"
                      />
                    )}
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {emp.full_name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.employee_id && <span className="mr-1">{emp.employee_id} •</span>}
                        {emp.designation || "Employee"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
            {type !== "direct" && selectedMembers.length > 0 && (
              <p className="text-xs text-muted-foreground">{selectedMembers.length} participant(s) selected</p>
            )}
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating || (type !== "direct" && !name.trim()) || (type === "direct" && !dmRecipient) || (type === "team" && selectedMembers.length === 0)}
            className="w-full"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {type === "direct" ? "Start Conversation" : "Create Channel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
