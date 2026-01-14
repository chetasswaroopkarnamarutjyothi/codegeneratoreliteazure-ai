import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, Users, Calendar, Save, Lock } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function Profile() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [parentEmail, setParentEmail] = useState("");
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
      setLoading(false);
    };

    checkSession();
  }, [navigate]);

  const { profile, updateProfile, loading: profileLoading } = useUserProfile(user?.id);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setEmail(profile.email);
      setParentEmail(profile.parent_email || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const updates: any = {
        full_name: fullName,
        email: email,
      };

      // Only allow updating parent email if user is under 18
      if (profile.age < 18) {
        updates.parent_email = parentEmail || null;
      }

      const { error } = await updateProfile(updates);

      if (error) throw new Error(error);

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Profile not found</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account information</p>
          </div>
        </div>

        <Card className="glass glow-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your profile details. Note: Age cannot be changed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="Your email address"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age" className="flex items-center gap-2">
                Age
                <Lock className="w-3 h-3 text-muted-foreground" />
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="age"
                  type="number"
                  value={profile.age}
                  className="pl-10 bg-muted/50"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Age cannot be modified for security reasons.
              </p>
            </div>

            {profile.age < 18 && (
              <div className="space-y-2">
                <Label htmlFor="parentEmail">Parent's Email</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="parentEmail"
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="pl-10"
                    placeholder="Parent's email address"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your parent will be notified of your activities on this platform.
                </p>
              </div>
            )}

            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Account ID:</span>{" "}
              {user?.id.slice(0, 8)}...
            </p>
            <p>
              <span className="font-medium text-foreground">Member since:</span>{" "}
              {new Date(profile.created_at).toLocaleDateString()}
            </p>
            <p>
              <span className="font-medium text-foreground">Last updated:</span>{" "}
              {new Date(profile.updated_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
