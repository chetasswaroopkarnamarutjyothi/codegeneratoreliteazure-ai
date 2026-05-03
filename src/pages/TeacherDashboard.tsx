import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, GraduationCap, UserCheck, UserX, Users, Award, 
  Loader2, RefreshCw
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("teacher");
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonitor, setSelectedMonitor] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [selectedStudentForCredits, setSelectedStudentForCredits] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }
      setUser(session.user);

      // Check if teacher
      const { data: member } = await supabase
        .from("school_members")
        .select("*")
        .eq("user_id", session.user.id)
        .in("school_role", ["teacher", "coordinator", "principal"])
        .maybeSingle();

      if (!member) {
        toast({ title: "Access Denied", description: "Teacher access only", variant: "destructive" });
        navigate("/");
        return;
      }
      setRole(member.school_role);
      if (member.school_role === "coordinator" || member.school_role === "principal") {
        const { data: allM } = await supabase.from("school_members").select("*").eq("school_id", member.school_id);
        setAllMembers(allM || []);
      }

      // Get classes assigned to this teacher
      const { data: classes } = await supabase
        .from("school_classes")
        .select("*")
        .eq("teacher_user_id", session.user.id);
      setMyClasses(classes || []);

      if (classes && classes.length > 0) {
        const classIds = classes.map(c => c.id);
        
        const { data: allStudents } = await supabase
          .from("school_members")
          .select("*")
          .in("class_id", classIds)
          .eq("school_role", "student");

        const approved = (allStudents || []).filter(s => s.is_approved);
        const pending = (allStudents || []).filter(s => !s.is_approved);
        setStudents(approved);
        setPendingStudents(pending);

        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: monitorsData } = await supabase
          .from("school_class_monitors")
          .select("*")
          .in("class_id", classIds)
          .eq("month_year", currentMonth);
        setMonitors(monitorsData || []);
      }
      setLoading(false);
    };
    init();
  }, [navigate, toast]);

  const approveStudent = async (memberId: string) => {
    const { error } = await supabase
      .from("school_members")
      .update({ is_approved: true, approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq("id", memberId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Student approved" });
      setPendingStudents(prev => prev.filter(s => s.id !== memberId));
    }
  };

  const rejectStudent = async (memberId: string) => {
    await supabase.from("school_members").delete().eq("id", memberId);
    toast({ title: "Student rejected" });
    setPendingStudents(prev => prev.filter(s => s.id !== memberId));
  };

  const assignMonitor = async (classId: string) => {
    if (!selectedMonitor) return;
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Deactivate old monitor
    await supabase
      .from("school_class_monitors")
      .update({ is_active: false })
      .eq("class_id", classId)
      .eq("is_active", true);

    const { error } = await supabase.from("school_class_monitors").insert({
      class_id: classId,
      student_user_id: selectedMonitor,
      assigned_by: user?.id,
      month_year: currentMonth,
    });
    if (error && error.code === "23505") {
      // Unique constraint - update instead
      await supabase
        .from("school_class_monitors")
        .update({ student_user_id: selectedMonitor, assigned_by: user?.id, is_active: true })
        .eq("class_id", classId)
        .eq("month_year", currentMonth);
    }
    toast({ title: "✅ Class monitor assigned" });
    setSelectedMonitor("");
  };

  const allocateCredits = async (classId: string) => {
    if (!selectedStudentForCredits || !creditAmount) return;
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) return;

    // Update class credits_used
    await supabase
      .from("school_classes")
      .update({ credits_used: (myClasses.find(c => c.id === classId)?.credits_used || 0) + amount })
      .eq("id", classId);

    // Add to student's points
    await supabase
      .from("user_points")
      .update({ daily_points: amount })
      .eq("user_id", selectedStudentForCredits);

    toast({ title: `✅ ${amount} credits allocated` });
    setCreditAmount("");
    setSelectedStudentForCredits("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-primary" />
              {role === "principal" ? "Principal Dashboard" : role === "coordinator" ? "Coordinator Dashboard" : "Teacher Dashboard"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {role === "principal" && "Oversee coordinators, teachers and students"}
              {role === "coordinator" && "Manage teachers in your school"}
              {role === "teacher" && "Manage your classes and students"}
            </p>
          </div>
          <Badge variant="outline" className="capitalize">{role}</Badge>
        </div>

        {(role === "principal" || role === "coordinator") && (
          <Card className="glass mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {role === "principal" ? "Coordinators" : "Teachers"} ({allMembers.filter(m => m.school_role === (role === "principal" ? "coordinator" : "teacher")).length})
              </CardTitle>
              <CardDescription>
                {role === "principal" ? "Hierarchy: Principal → Coordinator → Teacher → Student" : "You manage teachers and their classes"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {allMembers
                .filter(m => m.school_role === (role === "principal" ? "coordinator" : "teacher"))
                .map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded bg-muted/20 border">
                    <div>
                      <p className="font-medium">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.school_role}</p>
                    </div>
                    <Badge variant={m.is_approved ? "default" : "outline"}>{m.is_approved ? "Active" : "Pending"}</Badge>
                  </div>
                ))}
              {role === "principal" && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium mb-2">Teachers under coordinators ({allMembers.filter(m => m.school_role === "teacher").length})</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {allMembers.filter(m => m.school_role === "teacher").map(m => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded bg-muted/10 text-sm">
                        <span>{m.full_name}</span>
                        <Badge variant="outline" className="text-xs">Teacher</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Approvals */}
        {pendingStudents.length > 0 && (
          <Card className="glass mb-6 border-yellow-500/30">
            <CardHeader>
              <CardTitle className="text-yellow-500">⏳ Pending Student Approvals ({pendingStudents.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingStudents.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  <div>
                    <p className="font-medium">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Class {s.class_name}-{s.section} | Admission: {s.admission_no || "N/A"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => approveStudent(s.id)}>
                      <UserCheck className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => rejectStudent(s.id)}>
                      <UserX className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* My Classes */}
        {myClasses.map(cls => {
          const classStudents = students.filter(s => s.class_id === cls.id);
          const currentMonitor = monitors.find(m => m.class_id === cls.id && m.is_active);
          const remainingCredits = cls.credit_pool - (cls.credits_used || 0);

          return (
            <Card key={cls.id} className="glass mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Class {cls.class_name}-{cls.section}</CardTitle>
                  <Badge variant="outline">
                    Credits: {remainingCredits.toLocaleString()} / {cls.credit_pool.toLocaleString()}
                  </Badge>
                </div>
                <CardDescription>{classStudents.length} students</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Class Monitor */}
                <div className="p-3 rounded-lg bg-muted/20 border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" /> Class Monitor
                    <span className="text-xs text-muted-foreground">(Changes monthly)</span>
                  </h4>
                  {currentMonitor ? (
                    <p className="text-sm mb-2">
                      Current: {classStudents.find(s => s.user_id === currentMonitor.student_user_id)?.full_name || "Unknown"}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-2">No monitor assigned this month</p>
                  )}
                  <div className="flex gap-2">
                    <Select value={selectedMonitor} onValueChange={setSelectedMonitor}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {classStudents.map(s => (
                          <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => assignMonitor(cls.id)}>Assign</Button>
                  </div>
                </div>

                {/* Credit Allocation */}
                <div className="p-3 rounded-lg bg-muted/20 border">
                  <h4 className="font-medium mb-2">Allocate Credits</h4>
                  <div className="flex gap-2">
                    <Select value={selectedStudentForCredits} onValueChange={setSelectedStudentForCredits}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {classStudents.map(s => (
                          <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Credits" className="w-24" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} />
                    <Button size="sm" onClick={() => allocateCredits(cls.id)}>Allocate</Button>
                  </div>
                </div>

                {/* Student List */}
                <div className="space-y-1">
                  {classStudents.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/10">
                      <span className="text-sm">{s.full_name}</span>
                      <span className="text-xs text-muted-foreground">{s.admission_no || "N/A"}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {myClasses.length === 0 && (
          <Card className="glass">
            <CardContent className="py-12 text-center text-muted-foreground">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No classes assigned to you yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
