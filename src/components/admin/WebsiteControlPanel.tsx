import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Shield, MessageSquare, Code2, Brain, FolderOpen, AlertTriangle,
  Loader2, Save, Lock, Eye, Paintbrush, Bell, FileText, Coins, Globe, Monitor,
  Clock, Ban, Type, Upload, Hash, Gift
} from "lucide-react";

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
            <Input value={controls.maintenance_message || ""} onChange={(e) => update("maintenance_message", e.target.value)} />
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

      {/* Security Controls */}
      <Card className="glass border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            Security Controls
          </CardTitle>
          <CardDescription>Rate limiting, CAPTCHA, IP blocking and session management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <div>
                <Label>Rate Limiting</Label>
                <p className="text-xs text-muted-foreground">Limit API requests per user</p>
              </div>
            </div>
            <Switch checked={controls.rate_limit_enabled} onCheckedChange={(v) => update("rate_limit_enabled", v)} />
          </div>
          {controls.rate_limit_enabled && (
            <div className="space-y-2 pl-6">
              <Label>Max Requests / Minute</Label>
              <Input type="number" value={controls.rate_limit_max_requests || 100} onChange={(e) => update("rate_limit_max_requests", Number(e.target.value))} />
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <div>
                <Label>CAPTCHA Verification</Label>
                <p className="text-xs text-muted-foreground">Require CAPTCHA on login/registration</p>
              </div>
            </div>
            <Switch checked={controls.captcha_enabled} onCheckedChange={(v) => update("captcha_enabled", v)} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4" />
              <div>
                <Label>IP Blocking</Label>
                <p className="text-xs text-muted-foreground">Auto-block suspicious IP addresses</p>
              </div>
            </div>
            <Switch checked={controls.ip_blocking_enabled} onCheckedChange={(v) => update("ip_blocking_enabled", v)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Lock className="w-3 h-3" /> Max Login Attempts</Label>
              <Input type="number" value={controls.max_login_attempts || 5} onChange={(e) => update("max_login_attempts", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Clock className="w-3 h-3" /> Session Timeout (min)</Label>
              <Input type="number" value={controls.session_timeout_minutes || 60} onChange={(e) => update("session_timeout_minutes", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UI & Appearance */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-primary" />
            UI & Appearance
          </CardTitle>
          <CardDescription>Control the default look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Monitor className="w-3 h-3" /> Default Theme</Label>
              <Select value={controls.default_theme || "system"} onValueChange={(v) => update("default_theme", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">☀️ Light</SelectItem>
                  <SelectItem value="dark">🌙 Dark</SelectItem>
                  <SelectItem value="system">💻 System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Type className="w-3 h-3" /> Default Font Size</Label>
              <Select value={controls.font_size_default || "medium"} onValueChange={(v) => update("font_size_default", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Custom Logo URL</Label>
            <Input placeholder="https://example.com/logo.png" value={controls.custom_logo_url || ""} onChange={(e) => update("custom_logo_url", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Primary Color Override (hex)</Label>
            <div className="flex gap-2 items-center">
              <Input placeholder="#00b4d8" value={controls.primary_color_override || ""} onChange={(e) => update("primary_color_override", e.target.value)} className="flex-1" />
              {controls.primary_color_override && (
                <div className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: controls.primary_color_override }} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications & Communication */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications & Communication
          </CardTitle>
          <CardDescription>Control email, push, and auto-reply settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "email_notifications_enabled", label: "Email Notifications", desc: "Send email alerts for important events" },
            { key: "push_notifications_enabled", label: "Push Notifications", desc: "Browser push notifications for users" },
            { key: "auto_reply_enabled", label: "Auto-Reply", desc: "Auto-respond to support messages" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <Label>{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch checked={controls[item.key]} onCheckedChange={(v) => update(item.key, v)} />
            </div>
          ))}
          {controls.auto_reply_enabled && (
            <div className="space-y-2 pl-3">
              <Label>Auto-Reply Message</Label>
              <Textarea value={controls.auto_reply_message || ""} onChange={(e) => update("auto_reply_message", e.target.value)} rows={3} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content & Moderation */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Content & Moderation
          </CardTitle>
          <CardDescription>Control content limits and moderation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label>Profanity Filter</Label>
              <p className="text-xs text-muted-foreground">Auto-filter offensive content in chat</p>
            </div>
            <Switch checked={controls.profanity_filter_enabled} onCheckedChange={(v) => update("profanity_filter_enabled", v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Upload className="w-3 h-3" /> Max Upload Size (MB)</Label>
              <Input type="number" value={controls.max_upload_size_mb || 10} onChange={(e) => update("max_upload_size_mb", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Hash className="w-3 h-3" /> Max Message Length</Label>
              <Input type="number" value={controls.max_message_length || 5000} onChange={(e) => update("max_message_length", Number(e.target.value))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Free Credits & Access */}
      <Card className="glass border-green-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-green-500" />
            Free Credits & Access
          </CardTitle>
          <CardDescription>Control free credit availability and promotional periods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label>Free Credits Enabled</Label>
              <p className="text-xs text-muted-foreground">When disabled, new users won't receive free daily credits</p>
            </div>
            <Switch checked={controls.free_credits_enabled} onCheckedChange={(v) => update("free_credits_enabled", v)} />
          </div>
          {controls.free_credits_enabled && (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Gift className="w-3 h-3" /> Free Credits Amount / Day</Label>
                <Input type="number" value={controls.free_credits_amount || 50} onChange={(e) => update("free_credits_amount", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Clock className="w-3 h-3" /> Free Credits End Date</Label>
                <Input type="datetime-local" value={controls.free_credits_end_date ? new Date(controls.free_credits_end_date).toISOString().slice(0, 16) : ""} onChange={(e) => update("free_credits_end_date", e.target.value ? new Date(e.target.value).toISOString() : null)} />
                <p className="text-xs text-muted-foreground">Leave empty for no expiration. After this date, free credits will be disabled automatically.</p>
              </div>
            </>
          )}
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
            <Input value={controls.banner_message || ""} onChange={(e) => update("banner_message", e.target.value)} placeholder="Enter banner text..." />
          </div>
          <div className="space-y-2">
            <Label>Banner Type</Label>
            <Select value={controls.banner_type || "info"} onValueChange={(v) => update("banner_type", v)}>
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
