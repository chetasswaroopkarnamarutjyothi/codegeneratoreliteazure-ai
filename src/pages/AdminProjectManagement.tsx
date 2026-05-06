import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Layers, KanbanSquare, Calendar, ListChecks, Trash2 } from "lucide-react";

type Project = { id: string; name: string; key: string; description: string | null; status: string };
type Sprint = { id: string; project_id: string; name: string; goal: string | null; status: string; start_date: string | null; end_date: string | null };
type Task = { id: string; project_id: string; sprint_id: string | null; title: string; description: string | null; status: string; priority: string; task_type: string; assignee_user_id: string | null; story_points: number | null; due_date: string | null };

const STATUSES = ["todo", "in_progress", "review", "done"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

export default function AdminProjectManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newProj, setNewProj] = useState({ name: "", key: "", description: "" });
  const [newSprint, setNewSprint] = useState({ name: "", goal: "", start_date: "", end_date: "" });
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", sprint_id: "", story_points: "" });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (!data) { setAuthorized(false); return; }
      setAuthorized(true);
      loadProjects();
    })();
  }, [navigate]);

  const loadProjects = async () => {
    const { data } = await supabase.from("pm_projects").select("*").order("created_at", { ascending: false });
    setProjects((data || []) as Project[]);
    if (data && data.length && !activeProject) setActiveProject(data[0] as Project);
  };

  useEffect(() => {
    if (!activeProject) return;
    (async () => {
      const [{ data: s }, { data: t }] = await Promise.all([
        supabase.from("pm_sprints").select("*").eq("project_id", activeProject.id).order("created_at", { ascending: false }),
        supabase.from("pm_tasks").select("*").eq("project_id", activeProject.id).order("created_at", { ascending: false }),
      ]);
      setSprints((s || []) as Sprint[]);
      setTasks((t || []) as Task[]);
    })();
  }, [activeProject]);

  const createProject = async () => {
    if (!newProj.name || !newProj.key) return toast({ title: "Name and key required", variant: "destructive" });
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("pm_projects").insert({ ...newProj, key: newProj.key.toUpperCase(), created_by: user!.id });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setNewProj({ name: "", key: "", description: "" });
    toast({ title: "Project created" });
    loadProjects();
  };

  const createSprint = async () => {
    if (!activeProject || !newSprint.name) return;
    const { error } = await supabase.from("pm_sprints").insert({
      project_id: activeProject.id,
      name: newSprint.name,
      goal: newSprint.goal || null,
      start_date: newSprint.start_date || null,
      end_date: newSprint.end_date || null,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setNewSprint({ name: "", goal: "", start_date: "", end_date: "" });
    const { data } = await supabase.from("pm_sprints").select("*").eq("project_id", activeProject.id).order("created_at", { ascending: false });
    setSprints((data || []) as Sprint[]);
  };

  const createTask = async () => {
    if (!activeProject || !newTask.title) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("pm_tasks").insert({
      project_id: activeProject.id,
      title: newTask.title,
      description: newTask.description || null,
      priority: newTask.priority,
      sprint_id: newTask.sprint_id || null,
      story_points: newTask.story_points ? parseInt(newTask.story_points) : null,
      reporter_user_id: user!.id,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setNewTask({ title: "", description: "", priority: "medium", sprint_id: "", story_points: "" });
    const { data } = await supabase.from("pm_tasks").select("*").eq("project_id", activeProject.id).order("created_at", { ascending: false });
    setTasks((data || []) as Task[]);
  };

  const moveTask = async (id: string, status: string) => {
    await supabase.from("pm_tasks").update({ status }).eq("id", id);
    setTasks(t => t.map(x => x.id === id ? { ...x, status } : x));
  };

  const delTask = async (id: string) => {
    await supabase.from("pm_tasks").delete().eq("id", id);
    setTasks(t => t.filter(x => x.id !== id));
  };

  if (authorized === null) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (authorized === false) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <p className="text-lg">Admins only.</p>
      <Button onClick={() => navigate("/")}>Back</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}><ArrowLeft className="w-4 h-4 mr-1" /> Admin</Button>
            <h1 className="text-2xl font-bold flex items-center gap-2"><KanbanSquare className="w-6 h-6 text-primary" /> Project Management</h1>
          </div>
          <Dialog>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> New Project</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Project Name" value={newProj.name} onChange={e => setNewProj({ ...newProj, name: e.target.value })} />
                <Input placeholder="KEY (e.g. STK)" value={newProj.key} onChange={e => setNewProj({ ...newProj, key: e.target.value.toUpperCase() })} />
                <Textarea placeholder="Description" value={newProj.description} onChange={e => setNewProj({ ...newProj, description: e.target.value })} />
                <Button onClick={createProject} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 md:col-span-3">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4" /> Projects</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {projects.length === 0 && <p className="text-xs text-muted-foreground">No projects yet.</p>}
              {projects.map(p => (
                <button key={p.id} onClick={() => setActiveProject(p)}
                  className={`w-full text-left p-2 rounded-lg border transition ${activeProject?.id === p.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.key}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="col-span-12 md:col-span-9">
            {activeProject ? (
              <Tabs defaultValue="board">
                <TabsList>
                  <TabsTrigger value="board"><KanbanSquare className="w-4 h-4 mr-1" /> Board</TabsTrigger>
                  <TabsTrigger value="backlog"><ListChecks className="w-4 h-4 mr-1" /> Backlog</TabsTrigger>
                  <TabsTrigger value="sprints"><Calendar className="w-4 h-4 mr-1" /> Sprints</TabsTrigger>
                </TabsList>

                <TabsContent value="board">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {STATUSES.map(s => (
                      <Card key={s} className="bg-muted/30">
                        <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wide">{s.replace("_", " ")}</CardTitle></CardHeader>
                        <CardContent className="space-y-2 min-h-[200px]">
                          {tasks.filter(t => t.status === s).map(t => (
                            <div key={t.id} className="p-2 rounded bg-background border border-border space-y-1">
                              <div className="flex justify-between items-start">
                                <p className="text-xs font-semibold">{t.title}</p>
                                <button onClick={() => delTask(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                              </div>
                              <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                              <Select value={t.status} onValueChange={v => moveTask(t.id, v)}>
                                <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{STATUSES.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="backlog">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Add Task</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <Input placeholder="Task title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
                      <Textarea placeholder="Description" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
                      <div className="grid grid-cols-3 gap-2">
                        <Select value={newTask.priority} onValueChange={v => setNewTask({ ...newTask, priority: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={newTask.sprint_id || "none"} onValueChange={v => setNewTask({ ...newTask, sprint_id: v === "none" ? "" : v })}>
                          <SelectTrigger><SelectValue placeholder="Sprint" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No sprint</SelectItem>
                            {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input placeholder="SP" type="number" value={newTask.story_points} onChange={e => setNewTask({ ...newTask, story_points: e.target.value })} />
                      </div>
                      <Button onClick={createTask} className="w-full"><Plus className="w-4 h-4 mr-1" /> Create Task</Button>
                    </CardContent>
                  </Card>
                  <div className="mt-4 space-y-2">
                    {tasks.map(t => (
                      <Card key={t.id}>
                        <CardContent className="p-3 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-sm">{t.title}</p>
                            <p className="text-xs text-muted-foreground">{t.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{t.priority}</Badge>
                            <Badge>{t.status}</Badge>
                            {t.story_points && <Badge variant="secondary">{t.story_points} SP</Badge>}
                            <button onClick={() => delTask(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="sprints">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">New Sprint</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <Input placeholder="Sprint name" value={newSprint.name} onChange={e => setNewSprint({ ...newSprint, name: e.target.value })} />
                      <Input placeholder="Goal" value={newSprint.goal} onChange={e => setNewSprint({ ...newSprint, goal: e.target.value })} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={newSprint.start_date} onChange={e => setNewSprint({ ...newSprint, start_date: e.target.value })} />
                        <Input type="date" value={newSprint.end_date} onChange={e => setNewSprint({ ...newSprint, end_date: e.target.value })} />
                      </div>
                      <Button onClick={createSprint} className="w-full"><Plus className="w-4 h-4 mr-1" /> Create Sprint</Button>
                    </CardContent>
                  </Card>
                  <div className="mt-4 space-y-2">
                    {sprints.map(s => (
                      <Card key={s.id}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center">
                            <p className="font-semibold">{s.name}</p>
                            <Badge>{s.status}</Badge>
                          </div>
                          {s.goal && <p className="text-xs text-muted-foreground mt-1">{s.goal}</p>}
                          <p className="text-xs text-muted-foreground">{s.start_date} → {s.end_date}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <Card><CardContent className="p-10 text-center text-muted-foreground">Create your first project to get started.</CardContent></Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
