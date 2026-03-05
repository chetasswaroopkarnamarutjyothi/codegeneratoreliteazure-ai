import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Mail, Lock, ArrowRight, Shield, User, Users, QrCode, KeyRound, Chrome, ArrowLeft } from "lucide-react";
import codenovaIcon from "@/assets/codenova-icon.png";
import QRCodeLogin from "@/components/QRCodeLogin";
import LDAPAuth from "@/components/LDAPAuth";
import { lovable } from "@/integrations/lovable/index";

type AuthStep = "login" | "signup" | "profile-setup" | "email-sent" | "blocked" | "qr-login" | "ldap-login" | "forgot-password";

export default function Auth() {
  const [step, setStep] = useState<AuthStep>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_blocked, full_name")
          .eq("user_id", session.user.id)
          .single();

        if (profile?.is_blocked) {
          setStep("blocked");
          await supabase.auth.signOut();
          return;
        }

        if (profile) {
          sessionStorage.setItem('2fa_completed', 'true');
          navigate("/");
          return;
        }

        setStep("profile-setup");
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_blocked, full_name")
          .eq("user_id", session.user.id)
          .single();

        if (profile?.is_blocked) {
          setStep("blocked");
          await supabase.auth.signOut();
          return;
        }

        if (profile) {
          sessionStorage.setItem('2fa_completed', 'true');
          navigate("/");
        } else {
          setStep("profile-setup");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_blocked")
        .eq("user_id", data.user.id)
        .single();

      if (profile?.is_blocked) {
        await supabase.auth.signOut();
        setStep("blocked");
        return;
      }

      sessionStorage.setItem('2fa_completed', 'true');
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;

      setStep("email-sent");
      toast({
        title: "Verification email sent!",
        description: "Please check your email and click the link to verify your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Signup failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      toast({
        title: "Invalid age",
        description: "Please enter a valid age",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (ageNum < 18 && !parentEmail) {
      toast({
        title: "Parent email required",
        description: "Users under 18 must provide a parent's email",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("No session");

      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: session.user.id,
          email: session.user.email!,
          full_name: fullName,
          age: ageNum,
          parent_email: ageNum < 18 ? parentEmail : null,
        });

      if (profileError) throw profileError;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();

      const isAdmin = !!roleData;

      const { error: pointsError } = await supabase
        .from("user_points")
        .insert({
          user_id: session.user.id,
          daily_points: isAdmin ? 500 : 50,
          monthly_points: isAdmin ? 8500 : 0,
        });

      if (pointsError) throw pointsError;

      sessionStorage.setItem('2fa_completed', 'true');
      toast({
        title: "Profile created!",
        description: "Welcome to StackMind Platform",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === "blocked") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="glass rounded-2xl p-8">
            <div className="p-4 rounded-full bg-destructive/20 text-destructive w-fit mx-auto mb-6">
              <Shield className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold mb-4 text-destructive">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              Your account has been blocked. You are no longer able to access this platform.
            </p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "email-sent") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="glass rounded-2xl p-8">
            <div className="p-4 rounded-full bg-primary/20 text-primary w-fit mx-auto mb-6">
              <Mail className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
            <p className="text-muted-foreground mb-6">
              We've sent a verification link to <strong>{email}</strong>. 
              Please click the link to verify your account.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              After verification, you'll be able to complete your profile setup.
            </p>
            <Button variant="outline" onClick={() => setStep("login")} className="w-full">
              Back to Login
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} StackMind Technologies Limited. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  if (step === "profile-setup") {
    const ageNum = parseInt(age) || 0;
    const showParentEmail = ageNum > 0 && ageNum < 18;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <User className="w-4 h-4" />
              <span>Complete Your Profile</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Almost There!</h1>
            <p className="text-muted-foreground">
              Please provide a few more details to complete your account setup.
            </p>
          </div>
          <div className="glass rounded-2xl p-6 glow-border">
            <form onSubmit={handleProfileSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="fullName" type="text" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 bg-background/50 border-border/50 focus:border-primary" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" placeholder="Your age" value={age} onChange={(e) => setAge(e.target.value)} className="bg-background/50 border-border/50 focus:border-primary" required min={1} max={120} />
              </div>
              {showParentEmail && (
                <div className="space-y-2">
                  <Label htmlFor="parentEmail">Parent's Email</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="parentEmail" type="email" placeholder="Parent's email address" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} className="pl-10 bg-background/50 border-border/50 focus:border-primary" required />
                  </div>
                  <p className="text-xs text-muted-foreground">Since you're under 18, your parent will be notified of your activities.</p>
                </div>
              )}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Setting up...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Complete Setup
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} StackMind Technologies Limited. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  if (step === "qr-login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <QRCodeLogin onAuthenticated={() => navigate("/")} />
          <Button variant="ghost" onClick={() => setStep("login")} className="mt-4">Back to Email Login</Button>
          <p className="text-center text-xs text-muted-foreground mt-6">© {new Date().getFullYear()} StackMind Technologies Limited. All rights reserved.</p>
        </div>
      </div>
    );
  }

  if (step === "ldap-login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <LDAPAuth onBack={() => setStep("login")} onAuthenticated={() => navigate("/")} />
          <p className="text-center text-xs text-muted-foreground mt-6">© {new Date().getFullYear()} StackMind Technologies Limited. All rights reserved.</p>
        </div>
      </div>
    );
  }

  if (step === "forgot-password") {
    const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Reset link sent!", description: "Check your email for the password reset link." });
        setStep("login");
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
            <p className="text-muted-foreground">Enter your email to receive a password reset link.</p>
          </div>
          <div className="glass rounded-2xl p-6 glow-border">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="reset-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-background/50 border-border/50 focus:border-primary" required />
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Send Reset Link
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => setStep("login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto">
                <ArrowLeft className="w-3 h-3" /> Back to Login
              </button>
              </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">© {new Date().getFullYear()} StackMind Technologies Limited. All rights reserved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_hsl(var(--background))_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>StackMind Platform</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {step === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-muted-foreground">
            {step === "login"
              ? "Sign in to access Code Generator, App Generator & Code Verifier"
              : "Join to start using AI-powered development tools"}
          </p>
        </div>

        <div className="glass rounded-2xl p-6 glow-border">
          <form onSubmit={step === "login" ? handleLogin : handleSignup} className="space-y-4">
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
                  className="pl-10 bg-background/50 border-border/50 focus:border-primary"
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
                  className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                  required
                  minLength={6}
                />
              </div>
              {step === "login" && (
                <div className="text-right -mt-1">
                  <button type="button" onClick={() => setStep("forgot-password")} className="text-xs text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {step === "signup" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                <Mail className="w-4 h-4 text-primary" />
                <span>A verification link will be sent to your email</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {step === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {step === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {step === "login" && (
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full mt-4"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { error } = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                    });
                    if (error) throw error;
                  } catch (err: any) {
                    toast({ title: "Error", description: err.message || "Google sign in failed", variant: "destructive" });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                <img src={codenovaIcon} alt="CodeNova" className="w-4 h-4 mr-2 rounded-sm" />
                Continue with CodeNova AI
              </Button>

              <div className="flex gap-2 mt-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("qr-login")}>
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
                <Button type="button" variant="outline" className="flex-1 border-primary/30 hover:bg-primary/10" onClick={() => setStep("ldap-login")}>
                  <KeyRound className="w-4 h-4 mr-2 text-primary" />
                  Employee
                </Button>
              </div>
            </div>
          )}

          {step === "signup" && (
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full mt-4"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { error } = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                    });
                    if (error) throw error;
                  } catch (err: any) {
                    toast({ title: "Error", description: err.message || "Google sign up failed", variant: "destructive" });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                <Chrome className="w-4 h-4 mr-2" />
                Sign up with Google
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setStep(step === "login" ? "signup" : "login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {step === "login" ? (
                <>Don't have an account?{" "}<span className="text-primary font-medium">Sign up</span></>
              ) : (
                <>Already have an account?{" "}<span className="text-primary font-medium">Sign in</span></>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center space-y-2">
          <div className="glass rounded-xl p-4 inline-block">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Code Author:</span> Karnam Chetas Swaroop
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} StackMind Technologies Limited. All rights reserved.
        </p>
      </div>
    </div>
  );
}
