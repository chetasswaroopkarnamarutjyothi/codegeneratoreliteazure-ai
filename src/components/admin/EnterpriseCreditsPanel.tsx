import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, History, Loader2, Coins } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminExportButton } from "./AdminExportButton";

export function EnterpriseCreditsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tiers, setTiers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyNames, setHistoryNames] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ enterprise_name: "", credit_pool: "", notes: "" });
  const [allocate, setAllocate] = useState<{ name: string; amount: string; mode: "pool" | "bulk"; notes: string }>({
    name: "", amount: "", mode: "pool", notes: "",
  });

  const load = async () => {
    const [{ data: t }, { data: h }] = await Promise.all([
      supabase.from("enterprise_credit_tiers").select("*").order("updated_at", { ascending: false }),
      supabase.from("enterprise_credit_allocations").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setTiers(t || []);
    setHistory(h || []);
    const ids = Array.from(new Set((h || []).map((x: any) => x.allocated_by).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name || p.email; });
      setHistoryNames(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createTier = async () => {
    if (!form.enterprise_name) return toast({ title: "Enterprise name required", variant: "destructive" });
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("enterprise_credit_tiers").upsert({
      enterprise_name: form.enterprise_name.trim(),
      credit_pool: parseInt(form.credit_pool) || 0,
      notes: form.notes,
      updated_by: session?.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "enterprise_name" });
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Enterprise tier saved" }); setForm({ enterprise_name: "", credit_pool: "", notes: "" }); load(); }
  };

  const allocateCredits = async () => {
    const amt = parseInt(allocate.amount);
    if (!allocate.name || !amt || amt <= 0) return toast({ title: "Enterprise and positive amount required", variant: "destructive" });
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const tier = tiers.find(t => t.enterprise_name === allocate.name);
    const { error: histErr } = await supabase.from("enterprise_credit_allocations").insert({
      enterprise_id: tier?.id || null,
      enterprise_name: allocate.name,
      amount: amt,
      mode: allocate.mode,
      notes: allocate.notes,
      allocated_by: session?.user.id,
    });
    if (!histErr && tier) {
      await supabase.from("enterprise_credit_tiers").update({
        credit_pool: (tier.credit_pool || 0) + amt,
        updated_at: new Date().toISOString(),
      }).eq("id", tier.id);
    }
    setSaving(false);
    if (histErr) toast({ title: "Error", description: histErr.message, variant: "destructive" });
    else { toast({ title: `✅ Allocated ${amt} credits to ${allocate.name}` }); setAllocate({ name: "", amount: "", mode: "pool", notes: "" }); load(); }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Enterprise Credit Tiers</CardTitle>
          <CardDescription>Set credit pools per enterprise — like Pro / Pro+ tiers. Individual employees are not exposed here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Enterprise Name</Label><Input value={form.enterprise_name} onChange={e => setForm({ ...form, enterprise_name: e.target.value })} placeholder="e.g. Acme Corp" /></div>
            <div className="space-y-2"><Label>Initial Credit Pool</Label><Input type="number" value={form.credit_pool} onChange={e => setForm({ ...form, credit_pool: e.target.value })} placeholder="0" /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <Button onClick={createTier} disabled={saving} className="w-full"><Plus className="w-4 h-4 mr-2" /> Add / Update Enterprise Tier</Button>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Enterprise</TableHead><TableHead>Credit Pool</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {tiers.map(t => (
                  <TableRow key={t.id}><TableCell className="font-medium">{t.enterprise_name}</TableCell><TableCell>{t.credit_pool?.toLocaleString()}</TableCell><TableCell className="text-muted-foreground text-sm">{t.notes || "—"}</TableCell></TableRow>
                ))}
                {tiers.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No enterprises yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Coins className="w-5 h-5 text-primary" /> Allocate Credits to Enterprise</CardTitle>
          <CardDescription>Top up a pool or trigger a bulk distribution. All allocations are logged.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="space-y-2 md:col-span-2"><Label>Enterprise</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={allocate.name} onChange={e => setAllocate({ ...allocate, name: e.target.value })}>
                <option value="">Select…</option>
                {tiers.map(t => <option key={t.id} value={t.enterprise_name}>{t.enterprise_name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Amount</Label><Input type="number" value={allocate.amount} onChange={e => setAllocate({ ...allocate, amount: e.target.value })} /></div>
            <div className="space-y-2"><Label>Mode</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={allocate.mode} onChange={e => setAllocate({ ...allocate, mode: e.target.value as any })}>
                <option value="pool">Pool top-up</option>
                <option value="bulk">Bulk distribution</option>
              </select>
            </div>
          </div>
          <Textarea placeholder="Notes (optional)" value={allocate.notes} onChange={e => setAllocate({ ...allocate, notes: e.target.value })} />
          <Button onClick={allocateCredits} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Coins className="w-4 h-4 mr-2" />} Allocate Credits
          </Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Allocation History ({history.length})</CardTitle>
              <CardDescription>Audit trail — who allocated, when, and how much.</CardDescription>
            </div>
            <AdminExportButton
              data={history.map(h => ({ ...h, allocated_by_name: historyNames[h.allocated_by] || "—", created_at: new Date(h.created_at).toLocaleString() }))}
              columns={[
                { key: "created_at", label: "Timestamp" },
                { key: "enterprise_name", label: "Enterprise" },
                { key: "amount", label: "Amount" },
                { key: "mode", label: "Mode" },
                { key: "allocated_by_name", label: "Allocated By" },
                { key: "notes", label: "Notes" },
              ]}
              fileName="enterprise-allocation-history"
              tabName="Enterprise Allocation History"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Enterprise</TableHead><TableHead>Amount</TableHead><TableHead>Mode</TableHead><TableHead>By</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {history.map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{new Date(h.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{h.enterprise_name}</TableCell>
                    <TableCell>{h.amount.toLocaleString()}</TableCell>
                    <TableCell><span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">{h.mode}</span></TableCell>
                    <TableCell className="text-xs">{historyNames[h.allocated_by] || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.notes || "—"}</TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No allocations yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
