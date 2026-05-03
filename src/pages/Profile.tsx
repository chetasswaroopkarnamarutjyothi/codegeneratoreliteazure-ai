import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserPoints } from "@/hooks/useUserPoints";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, Users, Calendar, Save, Lock, Camera, AtSign, AlertCircle, Cake } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserBankDetails } from "@/components/UserBankDetails";
import { UserLayoutSettings } from "@/components/UserLayoutSettings";

export default function Profile() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const { profile, updateProfile, loading: profileLoading, refetch } = useUserProfile(user?.id);
  const { subscriptionType, isAdmin } = useUserPoints(user?.id);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setEmail(profile.email);
      setParentEmail(profile.parent_email || "");
      setUsername(profile.username || "");
    }
  }, [profile]);

  const canChangeAvatar = () => {
    if (!profile?.avatar_updated_at) return true;
    const lastUpdate = new Date(profile.avatar_updated_at);
    const sixMonthsLater = new Date(lastUpdate);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    return new Date() >= sixMonthsLater;
  };

  const getNextAvatarChangeDate = () => {
    if (!profile?.avatar_updated_at) return null;
    const lastUpdate = new Date(profile.avatar_updated_at);
    const sixMonthsLater = new Date(lastUpdate);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    return sixMonthsLater;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!canChangeAvatar()) {
        toast({
          title: "Cannot change avatar",
          description: `You can change your avatar after ${getNextAvatarChangeDate()?.toLocaleDateString()}`,
          variant: "destructive",
        });
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    setUploadingAvatar(true);
    try {
      // For simplicity, we'll store avatar as base64 in the profile
      // In production, you'd use Supabase Storage
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(avatarFile);
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    // Check if profile picture is required and missing
    if (!profile.avatar_url && !avatarPreview) {
      toast({
        title: "Profile picture required",
        description: "Please upload a profile picture to continue",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updates: any = {
        full_name: fullName,
        email: email,
      };

      // Allow username change
      if (username.trim() && username !== profile.username) {
        updates.username = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      }

      // Only allow updating parent email if user is under 18
      if (profile.age < 18) {
        updates.parent_email = parentEmail || null;
      }

      // Upload avatar if changed
      if (avatarFile) {
        const avatarUrl = await uploadAvatar();
        if (avatarUrl) {
          updates.avatar_url = avatarUrl;
          updates.avatar_updated_at = new Date().toISOString();
        }
      }

      const { error } = await updateProfile(updates);

      if (error) throw new Error(error);

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
      
      setAvatarFile(null);
      setAvatarPreview(null);
      refetch();
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

  const needsAvatar = !profile.avatar_url && !avatarPreview;

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

        {needsAvatar && (
          <Card className="glass border-destructive/50 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">Profile picture is required. Please upload one to continue.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="bank">Bank Details</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
          </TabsList>
          <TabsContent value="bank">{user && <UserBankDetails userId={user.id} />}</TabsContent>
          <TabsContent value="layout">{user && <UserLayoutSettings userId={user.id} />}</TabsContent>
          <TabsContent value="profile" className="space-y-6">
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
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarPreview || profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {fullName?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => canChangeAvatar() && fileInputRef.current?.click()}
                  className={`absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground ${
                    canChangeAvatar() ? "cursor-pointer hover:bg-primary/90" : "opacity-50 cursor-not-allowed"
                  }`}
                  disabled={!canChangeAvatar()}
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <p className="font-medium">Profile Picture</p>
                {canChangeAvatar() ? (
                  <p className="text-sm text-muted-foreground">
                    {needsAvatar ? "Required: Upload a profile picture" : "Click the camera icon to change"}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Can be changed after {getNextAvatarChangeDate()?.toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Username (Editable) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AtSign className="w-4 h-4" />
                Username
              </Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="your_username"
              />
              <p className="text-xs text-muted-foreground">
                You can change your username. Your User ID (UID) remains constant.
              </p>
            </div>

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

            {/* Birthday */}
            <div className="space-y-2">
              <Label htmlFor="birthday" className="flex items-center gap-2">
                <Cake className="w-4 h-4" />
                Birthday
                {profile.birthday && <Lock className="w-3 h-3 text-muted-foreground" />}
              </Label>
              <div className="relative">
                <Cake className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="birthday"
                  type="date"
                  value={profile.birthday || ""}
                  className="pl-10 bg-muted/50"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {profile.birthday 
                  ? "🎂 You receive 500 bonus credits on your birthday every year!"
                  : "Birthday not set. Complete your profile to set it."}
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
                disabled={saving || uploadingAvatar}
                className="w-full"
              >
                {saving || uploadingAvatar ? (
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
              <span className="font-medium text-foreground">Subscription:</span>{" "}
              <Badge variant="outline" className="ml-1">
                {isAdmin ? "Admin" : subscriptionType === "pro_plus" ? "Pro+" : subscriptionType === "pro" ? "Pro" : "Free"}
              </Badge>
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
