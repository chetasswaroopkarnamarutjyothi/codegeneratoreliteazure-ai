import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  MoreHorizontal,
  Clock,
  Layers,
  ExternalLink,
  Share2
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import ProjectCollaborators from "@/components/ProjectCollaborators";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

// Language color mapping for thumbnails
const languageColors: Record<string, { bg: string; accent: string }> = {
  react: { bg: "from-cyan-500/20 to-blue-500/20", accent: "bg-cyan-500" },
  typescript: { bg: "from-blue-500/20 to-indigo-500/20", accent: "bg-blue-500" },
  javascript: { bg: "from-yellow-500/20 to-orange-500/20", accent: "bg-yellow-500" },
  python: { bg: "from-green-500/20 to-teal-500/20", accent: "bg-green-500" },
  html: { bg: "from-orange-500/20 to-red-500/20", accent: "bg-orange-500" },
  css: { bg: "from-purple-500/20 to-pink-500/20", accent: "bg-purple-500" },
  java: { bg: "from-red-500/20 to-orange-500/20", accent: "bg-red-500" },
  default: { bg: "from-primary/20 to-accent/20", accent: "bg-primary" },
};

function getLanguageColors(language: string) {
  return languageColors[language.toLowerCase()] || languageColors.default;
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function Projects() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [collaboratorProject, setCollaboratorProject] = useState<Project | null>(null);
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
      toast({ title: "Code copied to clipboard!" });
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

  const allProjects = [...filteredProjects, ...filteredSharedProjects];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const ProjectCard = ({ project, isShared = false }: { project: Project; isShared?: boolean }) => {
    const colors = getLanguageColors(project.language);
    const isOwner = user?.id === project.user_id;

    return (
      <div className="group relative">
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
          {/* Thumbnail/Preview Area */}
          <div className={`relative h-36 bg-gradient-to-br ${colors.bg} overflow-hidden`}>
            {/* Code preview lines */}
            <div className="absolute inset-0 p-4 opacity-40">
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-2">
                    <div className={`h-2 rounded ${colors.accent} opacity-60`} style={{ width: `${20 + Math.random() * 30}%` }} />
                    <div className="h-2 rounded bg-foreground/20" style={{ width: `${30 + Math.random() * 40}%` }} />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Language badge */}
            <div className="absolute top-3 left-3">
              <Badge className={`${colors.accent} text-white border-0 shadow-lg`}>
                <Code2 className="w-3 h-3 mr-1" />
                {project.language}
              </Badge>
            </div>

            {/* Shared badge */}
            {isShared && (
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="bg-accent/90 text-white border-0">
                  <Users className="w-3 h-3 mr-1" />
                  Shared
                </Badge>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              {project.code && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(project.code!, project.id);
                  }}
                >
                  {copiedId === project.id ? (
                    <>
                      <Check className="w-4 h-4 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy Code
                    </>
                  )}
                </Button>
              )}
              {isOwner && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCollaboratorProject(project);
                  }}
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                  {project.description || "No description"}
                </p>
              </div>
              
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => project.code && handleCopy(project.code, project.id)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy code
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCollaboratorProject(project)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Manage collaborators
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDelete(project.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(project.updated_at)}
              </div>
              {project.code && (
                <div className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {Math.ceil(project.code.length / 100)} lines
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Projects</h1>
              <p className="text-sm text-muted-foreground">
                {allProjects.length} project{allProjects.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          
          <Button onClick={() => navigate("/")} className="glow-primary">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50 border-border/50 focus:border-primary/50"
            />
          </div>
        </div>

        {/* Empty State */}
        {allProjects.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <FolderOpen className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first project using the App Generator and save it here.
            </p>
            <Button onClick={() => navigate("/")} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        )}

        {/* No Results */}
        {allProjects.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No results found</h2>
            <p className="text-muted-foreground">
              No projects match "{searchQuery}"
            </p>
          </div>
        )}

        {/* My Projects Section */}
        {filteredProjects.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">My Projects</h2>
              <Badge variant="secondary" className="text-xs">
                {filteredProjects.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        )}

        {/* Shared With Me Section */}
        {filteredSharedProjects.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">Shared with me</h2>
              <Badge variant="secondary" className="text-xs bg-accent/20 text-accent">
                {filteredSharedProjects.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredSharedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} isShared />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Collaborators Dialog */}
      <Dialog open={!!collaboratorProject} onOpenChange={() => setCollaboratorProject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Collaborators</DialogTitle>
          </DialogHeader>
          {collaboratorProject && user && (
            <ProjectCollaborators
              projectId={collaboratorProject.id}
              projectOwnerId={collaboratorProject.user_id}
              currentUserId={user.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
