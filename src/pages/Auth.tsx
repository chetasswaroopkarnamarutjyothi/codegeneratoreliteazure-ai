import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Mail, Lock, ArrowRight, Shield, User, Users, QrCode, KeyRound, Phone } from "lucide-react";
import QRCodeLogin from "@/components/QRCodeLogin";
import LDAPAuth from "@/components/LDAPAuth";

type AuthStep = "login" | "signup" | "profile-setup" | "email-sent" | "blocked" | "qr-login" | "ldap-login" | "phone-verify";
type SignupMethod = "email" | "phone";

export default function Auth() {
  const [step, setStep] = useState<AuthStep>("login");
  const [signupMethod, setSignupMethod] = useState<SignupMethod>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is coming from email verification
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check if user is blocked
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

        // If profile exists, go to main page
        if (profile) {
          sessionStorage.setItem('2fa_completed', 'true');
          navigate("/");
          return;
        }

        // If no profile, need to set up profile
        setStep("profile-setup");
      }
    };

    checkSession();

    // Listen for auth state changes (including email verification)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Check for profile
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

      // Check if user is blocked
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
      if (signupMethod === "phone") {
        // Phone signup - send OTP
        const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });
        if (error) throw error;
        setStep("phone-verify");
        toast({
          title: "OTP Sent!",
          description: `A verification code has been sent to ${formattedPhone}`,
        });
      } else {
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
      }
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

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: "sms",
      });
      if (error) throw error;
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", data.user.id)
          .single();
        if (profile) {
          sessionStorage.setItem('2fa_completed', 'true');
          navigate("/");
        } else {
          setStep("profile-setup");
        }
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP",
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

      // Create profile
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

      // Initialize user points
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

  // Blocked user screen
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

  // Email sent screen
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
            <Button
              variant="outline"
              onClick={() => setStep("login")}
              className="w-full"
            >
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

  // Profile setup screen
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
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Your age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="bg-background/50 border-border/50 focus:border-primary"
                  required
                  min={1}
                  max={120}
                />
              </div>

              {showParentEmail && (
                <div className="space-y-2">
                  <Label htmlFor="parentEmail">Parent's Email</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="parentEmail"
                      type="email"
                      placeholder="Parent's email address"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Since you're under 18, your parent will be notified of your activities.
                  </p>
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

  // QR Login screen
  if (step === "qr-login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <QRCodeLogin onAuthenticated={() => navigate("/")} />
          
          <Button
            variant="ghost"
            onClick={() => setStep("login")}
            className="mt-4"
          >
            Back to Email Login
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} StackMind Technologies Limited. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  // LDAP Login screen
  if (step === "ldap-login") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <LDAPAuth 
            onBack={() => setStep("login")} 
            onAuthenticated={() => navigate("/")} 
          />

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} StackMind Technologies Limited. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  // Phone OTP verification screen
  if (step === "phone-verify") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="glass rounded-2xl p-8">
            <div className="p-4 rounded-full bg-primary/20 text-primary w-fit mx-auto mb-6">
              <Phone className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Verify Phone</h1>
            <p className="text-muted-foreground mb-6">
              Enter the OTP sent to <strong>{phone.startsWith("+") ? phone : `+91${phone}`}</strong>
            </p>
            <form onSubmit={handlePhoneVerify} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="text-center text-2xl tracking-widest"
                maxLength={6}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>
            </form>
            <Button variant="ghost" onClick={() => setStep("signup")} className="mt-4">
              Back to Signup
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} StackMind Technologies Limited. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  // Login/Signup screen
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
            {/* Signup method toggle */}
            {step === "signup" && (
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    signupMethod === "email" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setSignupMethod("email")}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    signupMethod === "phone" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setSignupMethod("phone")}
                >
                  <Phone className="w-3.5 h-3.5" /> Phone
                </button>
              </div>
            )}

            {/* Email field - shown for login always, signup only when email method */}
            {(step === "login" || signupMethod === "email") && (
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
            )}

            {/* Phone field - signup phone method only */}
            {step === "signup" && signupMethod === "phone" && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Include country code (e.g., +91 for India)</p>
              </div>
            )}

            {/* Password - login always, signup email only */}
            {(step === "login" || (step === "signup" && signupMethod === "email")) && (
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
              </div>
            )}

            {step === "signup" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                {signupMethod === "email" ? (
                  <><Mail className="w-4 h-4 text-primary" /><span>A verification link will be sent to your email</span></>
                ) : (
                  <><Phone className="w-4 h-4 text-primary" /><span>An OTP will be sent to your phone</span></>
                )}
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

          {/* Alternative Login Options */}
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
              
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("qr-login")}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-amber-500/30 hover:bg-amber-500/10"
                  onClick={() => setStep("ldap-login")}
                >
                  <KeyRound className="w-4 h-4 mr-2 text-amber-500" />
                  Employee
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setStep(step === "login" ? "signup" : "login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {step === "login" ? (
                <>
                  Don't have an account?{" "}
                  <span className="text-primary font-medium">Sign up</span>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <span className="text-primary font-medium">Sign in</span>
                </>
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
