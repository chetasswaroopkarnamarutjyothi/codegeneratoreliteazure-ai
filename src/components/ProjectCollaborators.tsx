import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, UserPlus, X, Mail, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Collaborator {
  id: string;
  user_id: string;
  project_id: string;
  role: string;
  created_at: string;
  email?: string;
  username?: string;
}

interface ProjectCollaboratorsProps {
  projectId: string;
  projectOwnerId: string;
  currentUserId: string;
}

export default function ProjectCollaborators({
  projectId,
  projectOwnerId,
  currentUserId,
}: ProjectCollaboratorsProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isOwner = currentUserId === projectOwnerId;

  useEffect(() => {
    fetchCollaborators();
  }, [projectId]);

  const fetchCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from("project_collaborators")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;

      // Fetch profile info for each collaborator
      const collaboratorsWithInfo = await Promise.all(
        (data || []).map(async (collab) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, username")
            .eq("user_id", collab.user_id)
            .single();

          return {
            ...collab,
            email: profile?.email,
            username: profile?.username,
          };
        })
      );

      setCollaborators(collaboratorsWithInfo);
    } catch (error: any) {
      console.error("Error fetching collaborators:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsInviting(true);

    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, email, username")
        .eq("email", inviteEmail.trim().toLowerCase())
        .single();

      if (profileError || !profile) {
        toast.error("User not found. They must have an account first.");
        setIsInviting(false);
        return;
      }

      // Check if already a collaborator
      const existingCollab = collaborators.find(c => c.user_id === profile.user_id);
      if (existingCollab) {
        toast.error("This user is already a collaborator");
        setIsInviting(false);
        return;
      }

      // Check if inviting self
      if (profile.user_id === currentUserId) {
        toast.error("You can't invite yourself");
        setIsInviting(false);
        return;
      }

      // Add collaborator
      const { data, error } = await supabase
        .from("project_collaborators")
        .insert({
          project_id: projectId,
          user_id: profile.user_id,
          invited_by: currentUserId,
          role: "collaborator",
        })
        .select()
        .single();

      if (error) throw error;

      // Get project name and inviter info for email notification
      const { data: projectData } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();

      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", currentUserId)
        .single();

      // Send email notification via edge function
      try {
        await supabase.functions.invoke("send-collaboration-invite", {
          body: {
            invitedUserEmail: profile.email,
            invitedByEmail: inviterProfile?.email || "",
            invitedByName: inviterProfile?.full_name || "A user",
            projectName: projectData?.name || "a project",
            projectId,
          },
        });
      } catch (emailError) {
        console.log("Email notification failed (non-blocking):", emailError);
      }

      setCollaborators([
        ...collaborators,
        {
          ...data,
          email: profile.email,
          username: profile.username,
        },
      ]);

      toast.success(`Invited ${profile.username || profile.email} to the project!`);
      setInviteEmail("");
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to invite collaborator");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from("project_collaborators")
        .delete()
        .eq("id", collaboratorId);

      if (error) throw error;

      setCollaborators(collaborators.filter(c => c.id !== collaboratorId));
      toast.success("Collaborator removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove collaborator");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Collaborators</CardTitle>
            <Badge variant="secondary">{collaborators.length}</Badge>
          </div>
          {isOwner && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Collaborator</DialogTitle>
                  <DialogDescription>
                    Enter the email of the person you want to invite to work on this project.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="friend@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="pl-10"
                        onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                      />
                    </div>
                    <Button onClick={handleInvite} disabled={isInviting}>
                      {isInviting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Send"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The person must already have an account to be invited.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <CardDescription>
          People who can view and edit this project
        </CardDescription>
      </CardHeader>
      <CardContent>
        {collaborators.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No collaborators yet. {isOwner && "Invite friends to work together!"}
          </p>
        ) : (
          <div className="space-y-2">
            {collaborators.map((collab) => (
              <div
                key={collab.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {(collab.username || collab.email || "U")[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {collab.username || collab.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {collab.role}
                    </p>
                  </div>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(collab.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
