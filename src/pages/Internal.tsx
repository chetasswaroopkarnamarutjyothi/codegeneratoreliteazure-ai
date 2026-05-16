import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SwipeGate } from "@/components/SwipeGate";
import { ArrowLeft, CalendarDays, Users, Plane, ScanLine, Briefcase, Loader2, Plus, Trash2, CheckCircle, X } from "lucide-react";

export default function Internal() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (!data) { toast({ title: "Admins only", variant: "destructive" }); navigate("/"); return; }
      setIsAdmin(true); setLoading(false);
    })();
  }, [navigate, toast]);

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!isAdmin) return null;

  return (
    <SwipeGate>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="w-7 h-7 text-primary" /> Internal Panel</h1>
              <p className="text-sm text-muted-foreground">Migrated from goodday.work — Attendance, Leaves, Calendar & Directory.</p>
            </div>
          </div>

          <Tabs defaultValue="attendance">
            <TabsList className="grid grid-cols-4 max-w-2xl">
              <TabsTrigger value="attendance"><ScanLine className="w-4 h-4 mr-1" />Attendance</TabsTrigger>
              <TabsTrigger value="leaves"><Plane className="w-4 h-4 mr-1" />Leaves</TabsTrigger>
              <TabsTrigger value="calendar"><CalendarDays className="w-4 h-4 mr-1" />Calendar</TabsTrigger>
              <TabsTrigger value="directory"><Users className="w-4 h-4 mr-1" />Directory</TabsTrigger>
            </TabsList>
            <TabsContent value="attendance" className="mt-6"><AttendanceTab /></TabsContent>
            <TabsContent value="leaves" className="mt-6"><LeavesTab /></TabsContent>
            <TabsContent value="calendar" className="mt-6"><CalendarTab /></TabsContent>
            <TabsContent value="directory" className="mt-6"><DirectoryTab /></TabsContent>
          </Tabs>
        </div>
      </div>
    </SwipeGate>
  );
}

// ============ ATTENDANCE ============
function AttendanceTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const last30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase.from("office_swipes").select("*").gte("swipe_date", last30).order("swipe_date", { ascending: false });
    setRows(data || []);
    const ids = Array.from(new Set((data || []).map(r => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name; });
      setNames(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayRows = rows.filter(r => r.swipe_date === today);

  if (loading) return <Loader2 className="w-5 h-5 animate-spin mx-auto" />;
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Attendance — Last 30 days</CardTitle>
        <CardDescription>{todayRows.length} swiped in today / {rows.length} total swipes in 30 days.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
        {rows.map(r => (
          <div key={r.id} className="flex items-center justify-between p-2 rounded border bg-muted/10 text-sm">
            <div>
              <span className="font-medium">{names[r.user_id] || r.user_id.slice(0, 8)}</span>
              <span className="text-xs text-muted-foreground ml-2">{r.swipe_date}</span>
            </div>
            <Badge variant="outline" className="text-[10px]">{r.method} • {new Date(r.swipe_in_at).toLocaleTimeString()}</Badge>
          </div>
        ))}
        {rows.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">No swipes recorded.</p>}
      </CardContent>
    </Card>
  );
}

// ============ LEAVES ============
function LeavesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("leave_requests").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    const ids = Array.from(new Set((data || []).map(r => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.full_name; });
      setNames(map);
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("leaves-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("leave_requests").update({ status, reviewed_by: session?.user.id, reviewed_at: new Date().toISOString() }).eq("id", id);
    toast({ title: `Leave ${status}` });
    load();
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin mx-auto" />;
  return (
    <Card className="glass">
      <CardHeader><CardTitle>Leave Requests ({rows.length})</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="p-3 rounded border bg-muted/10 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{names[r.user_id] || r.user_id.slice(0, 8)} • <span className="text-xs text-muted-foreground">{r.leave_type}</span></p>
              <p className="text-xs text-muted-foreground">{r.from_date} → {r.to_date}</p>
              {r.reason && <p className="text-xs italic mt-1">"{r.reason}"</p>}
            </div>
            {r.status === "pending" ? (
              <div className="flex gap-1">
                <Button size="sm" onClick={() => decide(r.id, "approved")}><CheckCircle className="w-4 h-4" /></Button>
                <Button size="sm" variant="destructive" onClick={() => decide(r.id, "rejected")}><X className="w-4 h-4" /></Button>
              </div>
            ) : <Badge variant={r.status === "approved" ? "default" : "destructive"}>{r.status}</Badge>}
          </div>
        ))}
        {rows.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">No leave requests.</p>}
      </CardContent>
    </Card>
  );
}

// ============ CALENDAR ============
function CalendarTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({ event_date: "", title: "", description: "", event_type: "holiday" });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("company_events").select("*").order("event_date", { ascending: true });
    setEvents(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.event_date || !form.title) return toast({ title: "Date & title required", variant: "destructive" });
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from("company_events").insert({ ...form, created_by: session?.user.id });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "✅ Event added" });
    setForm({ event_date: "", title: "", description: "", event_type: "holiday" });
    load();
  };
  const remove = async (id: string) => { await supabase.from("company_events").delete().eq("id", id); load(); };

  return (
    <div className="space-y-4">
      <Card className="glass">
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-4 h-4" />Add Holiday / Event</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-2">
          <Input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
          <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="holiday">Holiday</SelectItem>
              <SelectItem value="company_event">Company Event</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={add}>Add</Button>
          <Textarea className="md:col-span-4" placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </CardContent>
      </Card>
      <Card className="glass">
        <CardHeader><CardTitle>Upcoming ({events.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : events.map(e => (
            <div key={e.id} className="p-3 rounded border bg-muted/10 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{e.title} <Badge variant="outline" className="ml-1 text-[10px]">{e.event_type}</Badge></p>
                <p className="text-xs text-muted-foreground">{e.event_date}{e.end_date ? ` → ${e.end_date}` : ""}</p>
                {e.description && <p className="text-xs mt-1">{e.description}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
          {!loading && events.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">No events scheduled.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ DIRECTORY ============
function DirectoryTab() {
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["employee", "admin"]);
      const ids = Array.from(new Set((roles || []).map(r => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email, designation, manager_id, employee_id, avatar_url").in("user_id", ids) as any;
        const roleMap: Record<string, string[]> = {};
        (roles || []).forEach(r => { roleMap[r.user_id] = [...(roleMap[r.user_id] || []), r.role]; });
        setPeople((profs || []).map((p: any) => ({ ...p, roles: roleMap[p.user_id] || [] })));
      }
      setLoading(false);
    })();
  }, []);

  const filtered = people.filter(p =>
    !q || p.full_name?.toLowerCase().includes(q.toLowerCase()) || p.email?.toLowerCase().includes(q.toLowerCase())
  );

  if (loading) return <Loader2 className="w-5 h-5 animate-spin mx-auto" />;
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Org Directory ({people.length})</CardTitle>
        <Input placeholder="Search name or email…" value={q} onChange={e => setQ(e.target.value)} className="mt-2 max-w-md" />
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-3">
        {filtered.map(p => (
          <div key={p.user_id} className="p-3 rounded border bg-muted/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 grid place-items-center font-bold text-primary">{p.full_name?.[0] || "?"}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{p.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{p.designation || "Employee"} • {p.email}</p>
              <div className="flex gap-1 mt-1">
                {p.employee_id && <Badge variant="outline" className="text-[10px] font-mono">{p.employee_id}</Badge>}
                {p.roles.map((r: string) => <Badge key={r} className="text-[10px]" variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>)}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
