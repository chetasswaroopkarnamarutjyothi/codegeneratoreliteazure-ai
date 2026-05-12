import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, Loader2 } from "lucide-react";

export function PoliciesPanel() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", body: "", category: "general", version: "1.0", requires_acknowledgement: false });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("company_policies").select("*").order("created_at", { ascending: false });
    setList(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title || !form.body) return toast({ title: "Title & body required", variant: "destructive" });
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("company_policies").insert({ ...form, created_by: session?.user.id });
    setSaving(false);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "✅ Policy published" });
    setForm({ title: "", body: "", category: "general", version: "1.0", requires_acknowledgement: false });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("company_policies").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> New Policy</CardTitle>
          <CardDescription>Visible to all StackMind staff. Mark as required to force acknowledgement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-2">
            <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="md:col-span-2" />
            <Input placeholder="Version (e.g. 1.0)" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} />
          </div>
          <Input placeholder="Category (general, leave, security, conduct)" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <Textarea rows={6} placeholder="Policy text (markdown supported)" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
          <div className="flex items-center gap-2"><Switch checked={form.requires_acknowledgement} onCheckedChange={v => setForm({ ...form, requires_acknowledgement: v })} /><Label>Requires acknowledgement</Label></div>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Publish</Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Published ({list.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> :
            list.map(p => (
              <div key={p.id} className="p-3 rounded-lg border bg-muted/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold flex items-center gap-2">{p.title}
                      <Badge variant="outline" className="text-xs">v{p.version}</Badge>
                      <Badge variant="secondary" className="text-xs">{p.category}</Badge>
                      {p.requires_acknowledgement && <Badge className="bg-yellow-500/20 text-yellow-500 text-xs">Ack required</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Effective {p.effective_from}</p>
                    <p className="text-sm mt-2 whitespace-pre-wrap">{p.body}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          {!loading && list.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">No policies yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
