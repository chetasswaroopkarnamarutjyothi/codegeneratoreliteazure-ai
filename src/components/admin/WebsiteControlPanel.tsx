import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Shield, MessageSquare, Code2, Brain, FolderOpen, AlertTriangle, Loader2, Save } from "lucide-react";

export function WebsiteControlPanel() {
  const [controls, setControls] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchControls(); }, []);

  const fetchControls = async () => {
    const { data } = await supabase.from("website_controls").select("*").limit(1).single();
    setControls(data);
    setLoading(false);
  };

  const saveControls = async () => {
    if (!controls) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("website_controls")
        .update({ ...controls, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq("id", controls.id);
      if (error) throw error;
      toast({ title: "✅ Settings saved!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !controls) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const update = (key: string, value: any) => setControls({ ...controls, [key]: value });

  return (
    <div className="space-y-6">
      {/* Maintenance Mode */}
      <Card className="glass border-red-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Maintenance Mode
          </CardTitle>
          <CardDescription>When enabled, non-admin users will see a maintenance page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Maintenance Mode</Label>
            <Switch checked={controls.maintenance_mode} onCheckedChange={(v) => update("maintenance_mode", v)} />
          </div>
          <div className="space-y-2">
            <Label>Maintenance Message</Label>
            <Input value={controls.maintenance_message} onChange={(e) => update("maintenance_message", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Registration */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            User Registration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow New Registrations</Label>
              <p className="text-xs text-muted-foreground">When disabled, new users cannot create accounts</p>
            </div>
            <Switch checked={controls.registration_enabled} onCheckedChange={(v) => update("registration_enabled", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Feature Flags
          </CardTitle>
          <CardDescription>Enable or disable platform features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "feature_chat_enabled", label: "Stack Chat", icon: <MessageSquare className="w-4 h-4" /> },
            { key: "feature_ide_enabled", label: "Code IDE", icon: <Code2 className="w-4 h-4" /> },
            { key: "feature_ai_enabled", label: "AI Features", icon: <Brain className="w-4 h-4" /> },
            { key: "feature_projects_enabled", label: "Projects", icon: <FolderOpen className="w-4 h-4" /> },
          ].map((feat) => (
            <div key={feat.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                {feat.icon}
                <Label>{feat.label}</Label>
              </div>
              <Switch checked={controls[feat.key]} onCheckedChange={(v) => update(feat.key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Banner */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Site Banner</CardTitle>
          <CardDescription>Show a banner message to all users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Banner</Label>
            <Switch checked={controls.banner_enabled} onCheckedChange={(v) => update("banner_enabled", v)} />
          </div>
          <div className="space-y-2">
            <Label>Banner Message</Label>
            <Input value={controls.banner_message} onChange={(e) => update("banner_message", e.target.value)} placeholder="Enter banner text..." />
          </div>
          <div className="space-y-2">
            <Label>Banner Type</Label>
            <Select value={controls.banner_type} onValueChange={(v) => update("banner_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">ℹ️ Info</SelectItem>
                <SelectItem value="warning">⚠️ Warning</SelectItem>
                <SelectItem value="success">✅ Success</SelectItem>
                <SelectItem value="error">🚨 Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveControls} disabled={saving} className="w-full" size="lg">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save All Settings
      </Button>
    </div>
  );
}
