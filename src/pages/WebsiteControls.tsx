import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";
import { WebsiteControlPanel } from "@/components/admin/WebsiteControlPanel";
import { useToast } from "@/hooks/use-toast";

const ALLOWED_EMAILS = [
  "kchetasswaroop@gmail.com",
  // Add Vicky V Purohit's email here
];

export default function WebsiteControls() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", session.user.id)
        .single();

      if (!profile) {
        navigate("/");
        return;
      }

      // Check by email or by name match
      const isAllowedByEmail = ALLOWED_EMAILS.includes(profile.email.toLowerCase());
      const isAllowedByName =
        profile.full_name?.toLowerCase().includes("chetas") ||
        profile.full_name?.toLowerCase().includes("vicky");

      if (!isAllowedByEmail && !isAllowedByName) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access Website Controls",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    checkAccess();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Website Controls
            </h1>
            <p className="text-muted-foreground">
              Manage platform settings, maintenance mode, and feature flags
            </p>
          </div>
        </div>

        <WebsiteControlPanel />
      </div>
    </div>
  );
}
