import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Loader2 } from "lucide-react";
import { AdminExportButton } from "./AdminExportButton";

export function OfficeVisitsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState({ from: "", to: "", q: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("office_swipes").select("*").order("swipe_in_at", { ascending: false }).limit(500);
    setRows(data || []);
    const ids = Array.from(new Set((data || []).map(r => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name || p.email; });
      setNames(map);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("office-swipes-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "office_swipes" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = rows.filter(r => {
    if (filters.from && r.swipe_date < filters.from) return false;
    if (filters.to && r.swipe_date > filters.to) return false;
    if (filters.q && !(names[r.user_id] || "").toLowerCase().includes(filters.q.toLowerCase())) return false;
    return true;
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = rows.filter(r => r.swipe_date === today).length;
  const lateCount = rows.filter(r => r.swipe_date === today && new Date(r.swipe_in_at).getHours() >= 10).length;

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto" />;
  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Office Visits ({filtered.length})</CardTitle>
            <CardDescription>Live attendance feed from ID-card swipes.</CardDescription>
          </div>
          <AdminExportButton
            data={filtered.map(r => ({ ...r, name: names[r.user_id] || "—", swipe_in_at: new Date(r.swipe_in_at).toLocaleString() }))}
            columns={[
              { key: "swipe_date", label: "Date" },
              { key: "name", label: "Employee" },
              { key: "swipe_in_at", label: "Swiped In At" },
              { key: "method", label: "Method" },
              { key: "device_info", label: "Device" },
            ]}
            fileName="office-visits" tabName="Office Visits" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30">
          <div className="text-center"><p className="text-2xl font-bold text-primary">{todayCount}</p><p className="text-xs text-muted-foreground">Today</p></div>
          <div className="text-center"><p className="text-2xl font-bold text-yellow-500">{lateCount}</p><p className="text-xs text-muted-foreground">Late (after 10:00)</p></div>
          <div className="text-center"><p className="text-2xl font-bold">{rows.length}</p><p className="text-xs text-muted-foreground">All-time</p></div>
        </div>
        <div className="grid md:grid-cols-3 gap-2">
          <div><Label className="text-xs">From</Label><Input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} /></div>
          <div><Label className="text-xs">Employee</Label><Input value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} placeholder="Search…" /></div>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Employee</TableHead><TableHead>In</TableHead><TableHead>Method</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.swipe_date}</TableCell>
                  <TableCell className="text-sm">{names[r.user_id] || "—"}</TableCell>
                  <TableCell className="text-xs">{new Date(r.swipe_in_at).toLocaleTimeString()}</TableCell>
                  <TableCell><Badge variant="outline">{r.method}</Badge></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No swipes</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
