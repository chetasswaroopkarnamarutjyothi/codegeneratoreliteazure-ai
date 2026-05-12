import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Loader2, CheckCircle, X } from "lucide-react";

export function PaymentSubmissionsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("credit_payment_submissions").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    const ids = Array.from(new Set((data || []).map(r => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = `${p.full_name} (${p.email})`; });
      setNames(map);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("pay-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "credit_payment_submissions" }, (p) => {
        if (p.eventType === "INSERT") toast({ title: "💳 New payment submission", description: `Txn ${(p.new as any).transaction_id}` });
        load();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const review = async (id: string, status: "approved" | "rejected", row: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("credit_payment_submissions").update({
      status, reviewed_by: session?.user.id, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (status === "approved") {
      await supabase.from("user_points").update({ daily_points: row.amount }).eq("user_id", row.user_id);
    }
    await supabase.from("admin_audit_trail").insert({
      action_category: "credit_allocation", action_type: `payment_${status}`,
      target_name: names[row.user_id], target_id: row.user_id, amount: row.amount,
      notes: `Txn: ${row.transaction_id}`, performed_by: session?.user.id,
    });
    toast({ title: `✅ Payment ${status}` });
    load();
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto" />;
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Payment Submissions ({rows.length})</CardTitle>
        <CardDescription>Real-time alerts when users submit a paid-credit transaction ID.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="p-3 rounded-lg border bg-muted/10 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{names[r.user_id] || r.user_id}</p>
              <p className="text-xs text-muted-foreground">₹{r.amount.toLocaleString()} • Txn {r.transaction_id} • {r.payment_method} • {r.plan_type || "—"}</p>
              {r.notes && <p className="text-xs italic mt-1">{r.notes}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            {r.status === "pending" ? (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => review(r.id, "approved", r)}><CheckCircle className="w-4 h-4" /></Button>
                <Button size="sm" variant="destructive" onClick={() => review(r.id, "rejected", r)}><X className="w-4 h-4" /></Button>
              </div>
            ) : <Badge variant={r.status === "approved" ? "default" : "destructive"}>{r.status}</Badge>}
          </div>
        ))}
        {rows.length === 0 && <p className="text-center text-muted-foreground py-6">No submissions yet.</p>}
      </CardContent>
    </Card>
  );
}
