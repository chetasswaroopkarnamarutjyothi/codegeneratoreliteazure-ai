import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, UserCheck, UserX, Loader2, School, Users } from "lucide-react";
import { AdminExportButton } from "./AdminExportButton";

export function SBPSManagementPanel() {
  const [members, setMembers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClassName, setNewClassName] = useState("");
  const [newSection, setNewSection] = useState("");
  const [bulkLastSection, setBulkLastSection] = useState("");
  const [bulkClass, setBulkClass] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSchoolData();
  }, []);

  const fetchSchoolData = async () => {
    setLoading(true);
    const { data: school } = await supabase
      .from("school_organizations")
      .select("*")
      .eq("domain_pattern", "@shishyabemlschool.edu.in")
      .single();
    
    if (school) {
      setSchoolId(school.id);
      const { data: classesData } = await supabase
        .from("school_classes")
        .select("*")
        .eq("school_id", school.id)
        .order("class_name");
      setClasses(classesData || []);

      const { data: membersData } = await supabase
        .from("school_members")
        .select("*")
        .eq("school_id", school.id)
        .order("created_at", { ascending: false });
      setMembers(membersData || []);
    }
    setLoading(false);
  };

  const handleCreateClass = async () => {
    if (!schoolId || !newClassName || !newSection) return;
    const { error } = await supabase.from("school_classes").insert({
      school_id: schoolId,
      class_name: newClassName,
      section: newSection,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Class created" });
      setNewClassName("");
      setNewSection("");
      fetchSchoolData();
    }
  };

  const handleApproveMember = async (memberId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("school_members")
      .update({ is_approved: true, approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq("id", memberId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Student approved" });
      fetchSchoolData();
    }
  };

  const handleRejectMember = async (memberId: string) => {
    await supabase.from("school_members").delete().eq("id", memberId);
    toast({ title: "Student rejected" });
    fetchSchoolData();
  };

  const handleBulkGenerateSections = async () => {
    if (!schoolId || !bulkClass || !bulkLastSection) {
      toast({ title: "Enter class and last section letter (e.g., K)", variant: "destructive" });
      return;
    }
    const lastChar = bulkLastSection.trim().toUpperCase().charAt(0);
    if (!/^[A-Z]$/.test(lastChar)) {
      toast({ title: "Last section must be a single letter A-Z", variant: "destructive" });
      return;
    }
    setBulkLoading(true);
    const endCode = lastChar.charCodeAt(0);
    const existing = new Set(
      classes.filter(c => c.class_name === bulkClass).map(c => (c.section || "").toUpperCase())
    );
    const rows: any[] = [];
    for (let code = 65; code <= endCode; code++) {
      const sec = String.fromCharCode(code);
      if (!existing.has(sec)) rows.push({ school_id: schoolId, class_name: bulkClass, section: sec });
    }
    if (rows.length === 0) {
      toast({ title: `All sections A–${lastChar} already exist for class ${bulkClass}` });
      setBulkLoading(false);
      return;
    }
    const { error } = await supabase.from("school_classes").insert(rows);
    setBulkLoading(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: `✅ Generated ${rows.length} sections (A–${lastChar}) for class ${bulkClass}` });
      setBulkClass(""); setBulkLastSection("");
      fetchSchoolData();
    }
  };
    { key: "full_name", label: "Name" },
    { key: "admission_no", label: "Admission No" },
    { key: "class_name", label: "Class" },
    { key: "section", label: "Section" },
    { key: "school_role", label: "Role" },
    { key: "is_approved", label: "Approved" },
  ];

  const pendingMembers = members.filter(m => !m.is_approved);
  const approvedMembers = members.filter(m => m.is_approved);

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                SBPS School Management
              </CardTitle>
              <CardDescription>Manage Shishya BEML Public School users and classes</CardDescription>
            </div>
            <AdminExportButton data={members} columns={exportColumns} fileName="sbps_members" tabName="SBPS Management" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-lg bg-muted/30">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{classes.length}</p>
                  <p className="text-xs text-muted-foreground">Classes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{approvedMembers.length}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-500">{pendingMembers.length}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>

              {/* Create Class */}
              <div className="p-4 rounded-lg border bg-muted/10">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <School className="w-4 h-4" /> Create Class
                </h3>
                <div className="flex gap-2">
                  <Input placeholder="Class (e.g., 10)" value={newClassName} onChange={e => setNewClassName(e.target.value)} />
                  <Input placeholder="Section (e.g., A)" value={newSection} onChange={e => setNewSection(e.target.value)} />
                  <Button onClick={handleCreateClass}>Create</Button>
                </div>
              </div>

              {/* Pending Approvals */}
              {pendingMembers.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-yellow-500">⏳ Pending Approvals</h3>
                  <div className="space-y-2">
                    {pendingMembers.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                        <div>
                          <p className="font-medium">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Class {m.class_name}-{m.section} | Admission: {m.admission_no || "N/A"} | {m.school_role}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleApproveMember(m.id)}>
                            <UserCheck className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectMember(m.id)}>
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Classes & Members */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Classes & Members
                </h3>
                {classes.map(cls => {
                  const classMembers = approvedMembers.filter(m => m.class_name === cls.class_name && m.section === cls.section);
                  return (
                    <div key={cls.id} className="mb-3 p-3 rounded-lg border bg-muted/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Class {cls.class_name}-{cls.section}</Badge>
                          <span className="text-xs text-muted-foreground">{classMembers.length} students</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Credits: {(cls.credit_pool - (cls.credits_used || 0)).toLocaleString()} / {cls.credit_pool.toLocaleString()}
                        </span>
                      </div>
                      {classMembers.length > 0 && (
                        <div className="space-y-1 ml-4">
                          {classMembers.map(m => (
                            <p key={m.id} className="text-sm">
                              {m.full_name} <span className="text-muted-foreground">({m.admission_no || "N/A"})</span>
                              {m.school_role !== "student" && <Badge className="ml-1 text-xs" variant="secondary">{m.school_role}</Badge>}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
