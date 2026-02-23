import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Channel name is required");
      return;
    }

    setCreating(true);
    try {
      // Create channel
      const { data: channel, error } = await supabase
        .from("chat_channels")
        .insert({
          name: name.trim().toLowerCase().replace(/\s+/g, "-"),
          description: description.trim() || null,
          channel_type: type,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from("chat_channel_members")
        .insert({
          channel_id: channel.id,
          user_id: userId,
          role: "owner",
        });

      if (memberError) throw memberError;

      toast.success(`#${channel.name} created!`);
      onCreated();
      onClose();
      setName("");
      setDescription("");
      setType("team");
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
          <DialogDescription>Create a new team channel for communication</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
          <div className="space-y-2">
            <Label>Channel Type</Label>
            <Select value={type} onValueChange={setType}>
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
          <Button onClick={handleCreate} disabled={creating || !name.trim()} className="w-full">
            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Channel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
