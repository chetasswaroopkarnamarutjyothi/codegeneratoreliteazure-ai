import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Landmark, Save, Loader2, Building2, Copy } from "lucide-react";

export function UserBankDetails({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [form, setForm] = useState({
    id: "" as string | undefined,
    account_name: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    upi_id: "",
    notes: "",
  });

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("company_bank_details")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setCompany(c);

      const { data: mine } = await supabase.from("user_bank_details").select("*").eq("user_id", userId).maybeSingle();
      if (mine) setForm({ ...form, ...mine });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const save = async () => {
    if (!form.account_name || !form.bank_name || !form.account_number) {
      toast({ title: "Account name, bank, and number are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...form, user_id: userId };
    delete (payload as any).id;
    let error;
    if (form.id) ({ error } = await supabase.from("user_bank_details").update(payload).eq("id", form.id));
    else {
      const res = await supabase.from("user_bank_details").insert(payload).select().single();
      error = res.error;
      if (res.data) setForm({ ...form, id: res.data.id });
    }
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "✅ Bank details saved" });
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {company && (
        <Card className="glass border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Pay To (Company Bank)</CardTitle>
            <CardDescription>Use these details for subscription payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Account Name", company.account_name],
              ["Bank", company.bank_name],
              ["Account Number", company.account_number],
              ["IFSC", company.ifsc_code],
              ["SWIFT", company.swift_code],
              ["UPI ID", company.upi_id],
              ["Branch", company.branch],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <div><span className="text-muted-foreground">{k}:</span> <span className="font-medium">{v}</span></div>
                <Button size="icon" variant="ghost" onClick={() => copy(v as string, k as string)}><Copy className="w-3 h-3" /></Button>
              </div>
            ))}
            {company.notes && <p className="text-xs text-muted-foreground pt-2">{company.notes}</p>}
          </CardContent>
        </Card>
      )}

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Landmark className="w-5 h-5" /> Your Bank Details</CardTitle>
          <CardDescription>Saved for refunds and payouts. Visible only to you and admins.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Account Holder Name *</Label><Input value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Bank Name *</Label><Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Account Number *</Label><Input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} /></div>
            <div className="space-y-2"><Label>IFSC Code</Label><Input value={form.ifsc_code} onChange={e => setForm({ ...form, ifsc_code: e.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label>UPI ID</Label><Input value={form.upi_id} onChange={e => setForm({ ...form, upi_id: e.target.value })} /></div>
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save My Bank Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
