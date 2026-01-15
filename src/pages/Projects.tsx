import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  FolderOpen, 
  Code2, 
  Trash2, 
  Copy, 
  Check,
  Users,
  Plus,
  Search,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import ProjectCollaborators from "@/components/ProjectCollaborators";

interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  language: string;
  code: string | null;
  created_at: string;
  updated_at: string;
}

export default function Projects() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await Promise.all([
        fetchProjects(session.user.id),
        fetchSharedProjects(session.user.id),
      ]);
      setLoading(false);
    };

    checkSession();
  }, [navigate]);

  const fetchProjects = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch projects",
        variant: "destructive",
      });
    }
  };

  const fetchSharedProjects = async (userId: string) => {
    try {
      // Get projects where user is a collaborator
      const { data: collabs, error: collabError } = await supabase
        .from("project_collaborators")
        .select("project_id")
        .eq("user_id", userId);

      if (collabError) throw collabError;

      if (collabs && collabs.length > 0) {
        const projectIds = collabs.map(c => c.project_id);
        const { data: sharedData, error: projectsError } = await supabase
          .from("projects")
          .select("*")
          .in("id", projectIds)
          .order("updated_at", { ascending: false });

        if (projectsError) throw projectsError;
        setSharedProjects(sharedData || []);
      }
    } catch (error: any) {
      console.error("Failed to fetch shared projects:", error);
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== projectId));
      toast({
        title: "Project deleted",
        description: "Your project has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (code: string, projectId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(projectId);
      toast({ title: "Copied to clipboard!" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.language.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSharedProjects = sharedProjects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.language.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (projectId: string) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <FolderOpen className="w-8 h-8 text-primary" />
                My Projects
              </h1>
              <p className="text-muted-foreground">
                Apps you've generated using App Generator
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <Card className="glass mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* My Projects */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            My Projects ({filteredProjects.length})
          </h2>
          
          {filteredProjects.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate an app and save it to see it here
                </p>
                <Button onClick={() => navigate("/")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First App
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="glass hover:glow-border transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {project.description || "No description"}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        <Code2 className="w-3 h-3 mr-1" />
                        {project.language}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                      <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                    </div>
                    
                    {project.code && (
                      <pre className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-hidden max-h-24 mb-4">
                        {project.code.slice(0, 200)}...
                      </pre>
                    )}

                    <div className="flex gap-2 mb-3">
                      {project.code && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCopy(project.code!, project.id)}
                        >
                          {copiedId === project.id ? (
                            <>
                              <Check className="w-4 h-4 mr-1 text-green-500" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpand(project.id)}
                      >
                        <Users className="w-4 h-4 mr-1" />
                        {expandedProject === project.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(project.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {expandedProject === project.id && user && (
                      <ProjectCollaborators
                        projectId={project.id}
                        projectOwnerId={project.user_id}
                        currentUserId={user.id}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Shared Projects */}
        {filteredSharedProjects.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Shared With Me ({filteredSharedProjects.length})
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSharedProjects.map((project) => (
                <Card key={project.id} className="glass border-accent/30 hover:glow-border transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs">Shared</Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {project.description || "No description"}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        <Code2 className="w-3 h-3 mr-1" />
                        {project.language}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                      <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                    </div>
                    
                    {project.code && (
                      <pre className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-hidden max-h-24 mb-4">
                        {project.code.slice(0, 200)}...
                      </pre>
                    )}

                    <div className="flex gap-2">
                      {project.code && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCopy(project.code!, project.id)}
                        >
                          {copiedId === project.id ? (
                            <>
                              <Check className="w-4 h-4 mr-1 text-green-500" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
