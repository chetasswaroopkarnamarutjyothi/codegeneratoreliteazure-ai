import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Landmark, Save, Loader2, Eye, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminExportButton } from "./AdminExportButton";

export function AdminBankDetailsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userBank, setUserBank] = useState<any[]>([]);
  const [form, setForm] = useState({
    id: "" as string | undefined,
    account_name: "StackMind Technologies Limited",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    swift_code: "",
    upi_id: "",
    branch: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("company_bank_details")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setForm({ ...form, ...data });

      const { data: users } = await supabase.from("user_bank_details").select("*").order("updated_at", { ascending: false });
      setUserBank(users || []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const payload = { ...form, updated_by: session?.user.id };
    delete (payload as any).id;
    let error;
    if (form.id) {
      ({ error } = await supabase.from("company_bank_details").update(payload).eq("id", form.id));
    } else {
      const res = await supabase.from("company_bank_details").insert(payload).select().single();
      error = res.error;
      if (res.data) setForm({ ...form, id: res.data.id });
    }
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "✅ Bank details saved" });
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Landmark className="w-5 h-5 text-primary" /> Company Bank Details</CardTitle>
          <CardDescription>Posted publicly to all signed-in users for subscription payments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Account Name</Label><Input value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Bank Name</Label><Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Account Number</Label><Input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} /></div>
            <div className="space-y-2"><Label>IFSC Code</Label><Input value={form.ifsc_code || ""} onChange={e => setForm({ ...form, ifsc_code: e.target.value })} /></div>
            <div className="space-y-2"><Label>SWIFT Code</Label><Input value={form.swift_code || ""} onChange={e => setForm({ ...form, swift_code: e.target.value })} /></div>
            <div className="space-y-2"><Label>UPI ID</Label><Input value={form.upi_id || ""} onChange={e => setForm({ ...form, upi_id: e.target.value })} /></div>
            <div className="space-y-2"><Label>Branch</Label><Input value={form.branch || ""} onChange={e => setForm({ ...form, branch: e.target.value })} /></div>
            <div className="space-y-2 flex items-end gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Show to users</Label>
            </div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Company Bank Details
          </Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5" /> User-Submitted Bank Details ({userBank.length})</CardTitle>
              <CardDescription>Verify or reject user refund/payout details. All actions are audit-logged.</CardDescription>
            </div>
            <AdminExportButton
              data={userBank.map(b => ({
                ...b,
                verification_status: b.verification_status || "pending",
                reviewed_at: b.reviewed_at ? new Date(b.reviewed_at).toLocaleString() : "—",
                created_at: new Date(b.created_at).toLocaleString(),
              }))}
              columns={[
                { key: "account_name", label: "Account Name" },
                { key: "bank_name", label: "Bank" },
                { key: "account_number", label: "Account #" },
                { key: "ifsc_code", label: "IFSC" },
                { key: "upi_id", label: "UPI" },
                { key: "verification_status", label: "Status" },
                { key: "review_notes", label: "Review Notes" },
                { key: "reviewed_by", label: "Reviewed By" },
                { key: "reviewed_at", label: "Reviewed At" },
                { key: "created_at", label: "Submitted At" },
              ]}
              fileName="bank-verification-audit"
              tabName="Bank Verification Audit"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {userBank.map(b => {
              const review = async (status: "verified" | "rejected") => {
                const notes = status === "rejected" ? (window.prompt("Reason for rejection?") || "") : "";
                const { data: { session } } = await supabase.auth.getSession();
                const { error } = await supabase.from("user_bank_details").update({
                  verification_status: status,
                  reviewed_by: session?.user.id,
                  reviewed_at: new Date().toISOString(),
                  review_notes: notes,
                }).eq("id", b.id);
                if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
                else {
                  toast({ title: status === "verified" ? "✅ Verified" : "❌ Rejected" });
                  const { data: users } = await supabase.from("user_bank_details").select("*").order("updated_at", { ascending: false });
                  setUserBank(users || []);
                }
              };
              const status = b.verification_status || "pending";
              return (
                <div key={b.id} className="p-3 rounded border bg-muted/20 text-sm space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{b.account_name} • {b.bank_name}</p>
                      <p className="text-muted-foreground text-xs">A/C: {b.account_number} • IFSC: {b.ifsc_code || "—"} • UPI: {b.upi_id || "—"}</p>
                      {b.review_notes && <p className="text-xs text-destructive mt-1">Note: {b.review_notes}</p>}
                    </div>
                    <Badge variant={status === "verified" ? "default" : status === "rejected" ? "destructive" : "secondary"}>
                      {status === "verified" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : status === "rejected" ? <XCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                      {status}
                    </Badge>
                  </div>
                  {status !== "verified" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => review("verified")}><CheckCircle2 className="w-3 h-3 mr-1" /> Verify</Button>
                      {status !== "rejected" && <Button size="sm" variant="outline" onClick={() => review("rejected")}><XCircle className="w-3 h-3 mr-1" /> Reject</Button>}
                    </div>
                  )}
                </div>
              );
            })}
            {userBank.length === 0 && <p className="text-center text-muted-foreground py-6">No user bank details yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
