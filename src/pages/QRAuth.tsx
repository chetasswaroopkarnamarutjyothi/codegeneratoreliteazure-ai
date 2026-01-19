import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, QrCode, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

export default function QRAuth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "login" | "success" | "error" | "expired">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    // Check if token is valid
    const checkToken = async () => {
      const { data, error } = await supabase
        .from("qr_login_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (error || !data) {
        setStatus("error");
        return;
      }

      if (data.status === "expired" || new Date(data.expires_at) < new Date()) {
        setStatus("expired");
        return;
      }

      if (data.status === "authenticated") {
        setStatus("success");
        return;
      }

      // Mark as scanned
      await supabase
        .from("qr_login_tokens")
        .update({ status: "scanned" })
        .eq("id", data.id);

      setStatus("login");
    };

    checkToken();
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Update the QR token with user info and mark as authenticated
      await supabase
        .from("qr_login_tokens")
        .update({
          user_id: authData.user.id,
          status: "authenticated",
          authenticated_at: new Date().toISOString(),
        })
        .eq("token", token);

      setStatus("success");
      toast.success("Login successful! You can close this page.");

      // Redirect after a moment
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid QR Code</h2>
            <p className="text-muted-foreground">This QR code is invalid or has already been used.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">QR Code Expired</h2>
            <p className="text-muted-foreground">Please generate a new QR code from the login page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Login Successful!</h2>
            <p className="text-muted-foreground">You can now close this page. The other device is now logged in.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md glass relative z-10">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-primary/20 w-fit mb-4">
            <QrCode className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Complete QR Login</CardTitle>
          <CardDescription>
            Enter your credentials to log in on the other device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Confirm Login"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} StackMind Technologies Limited
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
