import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2 } from "lucide-react";
import { AdminExportButton } from "./AdminExportButton";

export function AdminAuditTrailPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: "", from: "", to: "", q: "" });

  useEffect(() => { (async () => {
    const { data } = await supabase.from("admin_audit_trail").select("*").order("created_at", { ascending: false }).limit(500);
    setRows(data || []);
    const ids = Array.from(new Set((data || []).map((r: any) => r.performed_by).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name || p.email; });
      setNames(map);
    }
    setLoading(false);
  })(); }, []);

  const filtered = rows.filter(r => {
    if (filters.category && r.action_category !== filters.category) return false;
    if (filters.from && new Date(r.created_at) < new Date(filters.from)) return false;
    if (filters.to && new Date(r.created_at) > new Date(filters.to + "T23:59:59")) return false;
    if (filters.q && !`${r.target_name || ""} ${r.notes || ""}`.toLowerCase().includes(filters.q.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Admin Audit Trail ({filtered.length})</CardTitle>
            <CardDescription>Bank verifications & enterprise credit allocations — full audit log.</CardDescription>
          </div>
          <AdminExportButton
            data={filtered.map(r => ({ ...r, performed_by_name: names[r.performed_by] || "—", created_at: new Date(r.created_at).toLocaleString() }))}
            columns={[
              { key: "created_at", label: "When" },
              { key: "action_category", label: "Category" },
              { key: "action_type", label: "Action" },
              { key: "target_name", label: "Target" },
              { key: "amount", label: "Amount" },
              { key: "performed_by_name", label: "Performed By" },
              { key: "notes", label: "Notes" },
            ]}
            fileName="admin-audit-trail"
            tabName="Admin Audit Trail"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="space-y-1"><Label className="text-xs">Category</Label>
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}>
              <option value="">All</option>
              <option value="bank_verification">Bank Verification</option>
              <option value="credit_allocation">Credit Allocation</option>
            </select>
          </div>
          <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Search</Label><Input placeholder="Target / notes" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} /></div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Category</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Amount</TableHead><TableHead>By</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{r.action_category}</Badge></TableCell>
                  <TableCell className="text-xs">{r.action_type}</TableCell>
                  <TableCell className="font-medium text-sm">{r.target_name || "—"}</TableCell>
                  <TableCell>{r.amount ? r.amount.toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-xs">{names[r.performed_by] || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.notes || "—"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No audit entries match these filters</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
