import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Layout, Save, Loader2, RotateCcw } from "lucide-react";

const DEFAULT_PREFS = {
  sidebar_position: "left",
  density: "comfortable",
  font_size: "medium",
  font_family: "inter",
  accent_color: "teal",
  theme_variant: "midnight",
};

const ACCENTS: Record<string, string> = {
  teal: "173 80% 40%",
  purple: "280 70% 50%",
  rose: "340 82% 52%",
  amber: "38 92% 50%",
  emerald: "152 76% 40%",
  sky: "200 90% 50%",
};

const FONTS: Record<string, string> = {
  inter: "'Inter', system-ui, sans-serif",
  manrope: "'Manrope', system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  jetbrains: "'JetBrains Mono', monospace",
};

const FONT_SIZE: Record<string, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

const DENSITY: Record<string, string> = {
  compact: "0.85",
  comfortable: "1",
  spacious: "1.15",
};

export function applyLayout(prefs: any) {
  if (!prefs) return;
  const root = document.documentElement;
  if (prefs.accent_color && ACCENTS[prefs.accent_color]) {
    root.style.setProperty("--primary", ACCENTS[prefs.accent_color]);
  }
  if (prefs.font_family && FONTS[prefs.font_family]) {
    root.style.setProperty("--font-sans", FONTS[prefs.font_family]);
    document.body.style.fontFamily = FONTS[prefs.font_family];
  }
  if (prefs.font_size && FONT_SIZE[prefs.font_size]) {
    root.style.fontSize = FONT_SIZE[prefs.font_size];
  }
  if (prefs.density && DENSITY[prefs.density]) {
    root.style.setProperty("--density", DENSITY[prefs.density]);
  }
  if (prefs.sidebar_position) {
    root.setAttribute("data-sidebar-position", prefs.sidebar_position);
  }
  if (prefs.theme_variant) {
    root.setAttribute("data-theme-variant", prefs.theme_variant);
  }
}

export function UserLayoutSettings({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("user_layout_preferences").select("*").eq("user_id", userId).maybeSingle();
      if (data) {
        setPrefs({
          sidebar_position: data.sidebar_position || "left",
          density: data.density || "comfortable",
          font_size: data.font_size || "medium",
          font_family: data.font_family || "inter",
          accent_color: data.accent_color || "teal",
          theme_variant: data.theme_variant || "midnight",
        });
      }
      setLoading(false);
    })();
  }, [userId]);

  useEffect(() => { applyLayout(prefs); }, [prefs]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("user_layout_preferences")
      .upsert({ user_id: userId, ...prefs }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Layout saved" }); applyLayout(prefs); }
  };

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  const Field = ({ label, value, onChange, options }: any) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o: any) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Layout className="w-5 h-5 text-primary" /> Layout & Customization</CardTitle>
        <CardDescription>Personalize your interface. Changes preview live.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Sidebar Position" value={prefs.sidebar_position} onChange={(v: string) => setPrefs({ ...prefs, sidebar_position: v })}
            options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]} />
          <Field label="Density" value={prefs.density} onChange={(v: string) => setPrefs({ ...prefs, density: v })}
            options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "spacious", label: "Spacious" }]} />
          <Field label="Font Size" value={prefs.font_size} onChange={(v: string) => setPrefs({ ...prefs, font_size: v })}
            options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]} />
          <Field label="Font Family" value={prefs.font_family} onChange={(v: string) => setPrefs({ ...prefs, font_family: v })}
            options={[{ value: "inter", label: "Inter" }, { value: "manrope", label: "Manrope" }, { value: "poppins", label: "Poppins" }, { value: "jetbrains", label: "JetBrains Mono" }]} />
          <Field label="Accent Color" value={prefs.accent_color} onChange={(v: string) => setPrefs({ ...prefs, accent_color: v })}
            options={[{ value: "teal", label: "Teal" }, { value: "purple", label: "Purple" }, { value: "rose", label: "Rose" }, { value: "amber", label: "Amber" }, { value: "emerald", label: "Emerald" }, { value: "sky", label: "Sky" }]} />
          <Field label="Theme Variant" value={prefs.theme_variant} onChange={(v: string) => setPrefs({ ...prefs, theme_variant: v })}
            options={[{ value: "midnight", label: "Midnight Dark" }, { value: "clean", label: "Clean Light" }, { value: "sepia", label: "Sepia" }, { value: "system", label: "System Default" }]} />
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Layout
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              setPrefs({ ...DEFAULT_PREFS });
              applyLayout(DEFAULT_PREFS);
              await supabase.from("user_layout_preferences").upsert({ user_id: userId, ...DEFAULT_PREFS }, { onConflict: "user_id" });
              toast({ title: "↺ Reset to default" });
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> Reset to default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
