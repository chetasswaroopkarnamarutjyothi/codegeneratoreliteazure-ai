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
import { Loader2, Circle, Clock, MinusCircle, Calendar, BellOff } from "lucide-react";
import { toast } from "sonner";

interface EmployeeStatusSettingsProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onUpdated: () => void;
}

export function EmployeeStatusSettings({ open, onClose, userId, onUpdated }: EmployeeStatusSettingsProps) {
  const [status, setStatus] = useState("available");
  const [statusMessage, setStatusMessage] = useState("");
  const [designation, setDesignation] = useState("");
  const [fullName, setFullName] = useState("");
  const [oooUntil, setOooUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, designation, status, status_message, ooo_until")
        .eq("user_id", userId)
        .single();
      if (data) {
        setFullName(data.full_name || "");
        setDesignation((data as any).designation || "");
        setStatus((data as any).status || "available");
        setStatusMessage((data as any).status_message || "");
        setOooUntil((data as any).ooo_until ? new Date((data as any).ooo_until).toISOString().split("T")[0] : "");
      }
      setLoading(false);
    };
    load();
  }, [open, userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        designation: designation.trim() || null,
        status,
        status_message: statusMessage.trim() || null,
        ooo_until: status === "ooo" && oooUntil ? new Date(oooUntil).toISOString() : null,
      };

      const { error } = await supabase.from("profiles").update(updates).eq("user_id", userId);
      if (error) throw error;

      toast.success("Profile updated!");
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-md">
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile & Status Settings</DialogTitle>
          <DialogDescription>Update your designation, status, and availability</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={fullName} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Name cannot be changed here</p>
          </div>

          <div className="space-y-2">
            <Label>Designation</Label>
            <Input
              placeholder="e.g. Software Engineer, Team Lead"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">
                  <span className="flex items-center gap-2"><Circle className="w-3 h-3 fill-green-500 text-green-500" /> Available</span>
                </SelectItem>
                <SelectItem value="busy">
                  <span className="flex items-center gap-2"><MinusCircle className="w-3 h-3 text-red-500" /> Busy</span>
                </SelectItem>
                <SelectItem value="dnd">
                  <span className="flex items-center gap-2"><BellOff className="w-3 h-3 text-red-500" /> Do Not Disturb</span>
                </SelectItem>
                <SelectItem value="ooo">
                  <span className="flex items-center gap-2"><Calendar className="w-3 h-3 text-muted-foreground" /> Out of Office</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Away status is set automatically after 5 minutes of inactivity
            </p>
          </div>

          <div className="space-y-2">
            <Label>Status Message (Optional)</Label>
            <Input
              placeholder="e.g. In a meeting, Back at 3pm"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
            />
          </div>

          {status === "ooo" && (
            <div className="space-y-2">
              <Label>Out of Office Until</Label>
              <Input
                type="date"
                value={oooUntil}
                onChange={(e) => setOooUntil(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
