import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, Wallet, Plus, Loader2 } from "lucide-react";

export function EnterpriseCreditsPanel() {
  const { toast } = useToast();
  const [enterprises, setEnterprises] = useState<any[]>([]);
  const [members, setMembers] = useState<Map<string, any[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Create enterprise
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // Action state
  const [selectedId, setSelectedId] = useState("");
  const [poolAmount, setPoolAmount] = useState("");
  const [perEmployee, setPerEmployee] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: ents } = await supabase.from("enterprises").select("*").order("created_at", { ascending: false });
    setEnterprises(ents || []);
    if (ents) {
      const map = new Map<string, any[]>();
      for (const e of ents) {
        const { data: m } = await supabase.from("enterprise_members").select("*").eq("enterprise_id", e.id);
        map.set(e.id, m || []);
      }
      setMembers(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createEnterprise = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("enterprises").insert({ name: newName, contact_email: newEmail || null });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "✅ Enterprise created" }); setNewName(""); setNewEmail(""); load(); }
  };

  const addPool = async () => {
    if (!selectedId || !poolAmount) return;
    const amount = parseInt(poolAmount);
    if (isNaN(amount) || amount <= 0) return;
    const ent = enterprises.find(e => e.id === selectedId);
    setBusy(true);
    const { error } = await supabase.from("enterprises").update({ credit_pool: (ent.credit_pool || 0) + amount }).eq("id", selectedId);
    setBusy(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `✅ Added ${amount.toLocaleString()} to ${ent.name} pool` }); setPoolAmount(""); load(); }
  };

  const bulkAllocate = async () => {
    if (!selectedId || !perEmployee) return;
    const each = parseInt(perEmployee);
    if (isNaN(each) || each <= 0) return;
    const list = members.get(selectedId) || [];
    if (list.length === 0) { toast({ title: "No members in this enterprise", variant: "destructive" }); return; }
    setBusy(true);
    let success = 0;
    for (const m of list) {
      const { data: pts } = await supabase.from("user_points").select("daily_points").eq("user_id", m.user_id).maybeSingle();
      const newDaily = (pts?.daily_points || 0) + each;
      const { error } = await supabase.from("user_points").update({ daily_points: newDaily, custom_daily_limit: newDaily, is_premium: true }).eq("user_id", m.user_id);
      if (!error) success++;
    }
    setBusy(false);
    toast({ title: `✅ Allocated ${each} credits to ${success}/${list.length} employees` });
    setPerEmployee("");
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Enterprises</CardTitle>
          <CardDescription>Manage enterprise credit pools and bulk distribute to employees.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-2">
            <Input placeholder="Enterprise name" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input placeholder="Contact email (optional)" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            <Button onClick={createEnterprise}><Plus className="w-4 h-4 mr-1" /> Create</Button>
          </div>

          <div className="grid gap-2">
            {enterprises.map(e => {
              const list = members.get(e.id) || [];
              return (
                <div key={e.id} className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.contact_email || "no contact"} • {list.length} members</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Pool: {(e.credit_pool || 0).toLocaleString()}</Badge>
                    <Badge variant="outline">Used: {(e.credits_used || 0).toLocaleString()}</Badge>
                  </div>
                </div>
              );
            })}
            {enterprises.length === 0 && <p className="text-center text-muted-foreground py-4">No enterprises yet</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Allocate Credits</CardTitle>
          <CardDescription>Choose enterprise then distribute via pool or bulk.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Enterprise</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Select enterprise" /></SelectTrigger>
              <SelectContent>
                {enterprises.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="pool">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="pool"><Wallet className="w-4 h-4 mr-1" /> Add to Pool</TabsTrigger>
              <TabsTrigger value="bulk"><Users className="w-4 h-4 mr-1" /> Bulk Distribute</TabsTrigger>
            </TabsList>
            <TabsContent value="pool" className="space-y-2 pt-3">
              <Label>Credits to add to enterprise pool</Label>
              <div className="flex gap-2">
                <Input type="number" value={poolAmount} onChange={e => setPoolAmount(e.target.value)} placeholder="e.g. 100000" />
                <Button onClick={addPool} disabled={busy || !selectedId}>Add to Pool</Button>
              </div>
            </TabsContent>
            <TabsContent value="bulk" className="space-y-2 pt-3">
              <Label>Credits per employee</Label>
              <div className="flex gap-2">
                <Input type="number" value={perEmployee} onChange={e => setPerEmployee(e.target.value)} placeholder="e.g. 200" />
                <Button onClick={bulkAllocate} disabled={busy || !selectedId}>Distribute to All</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
