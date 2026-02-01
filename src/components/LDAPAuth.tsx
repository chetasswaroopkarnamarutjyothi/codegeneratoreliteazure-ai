import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Loader2, ArrowLeft, CheckCircle, Shield, Mail, Lock, User, Users } from "lucide-react";
import { toast } from "sonner";

interface LDAPAuthProps {
  onBack: () => void;
  onAuthenticated: () => void;
}

type LDAPStep = "verify-code" | "login" | "signup" | "profile-setup";

export default function LDAPAuth({ onBack, onAuthenticated }: LDAPAuthProps) {
  const [step, setStep] = useState<LDAPStep>("verify-code");
  const [secretCode, setSecretCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  const verifySecretCode = async () => {
    if (!secretCode.trim()) {
      toast.error("Please enter the secret code");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-ldap`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ secretCode }),
        }
      );

      const data = await response.json();

      if (data.valid) {
        setCodeVerified(true);
        setStep("login");
        toast.success("Employee access verified!");
      } else {
        toast.error("Invalid secret code. Access denied.");
      }
    } catch (error) {
      toast.error("Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeVerified) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has LDAP record
      const { data: ldapRecord } = await supabase
        .from("employee_ldap")
        .select("*")
        .eq("user_id", data.user.id)
        .single();

      if (!ldapRecord) {
        toast.error("This account is not registered as an employee. Please sign up first.");
        await supabase.auth.signOut();
        setStep("signup");
        return;
      }

      toast.success("Employee login successful!");
      onAuthenticated();
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeVerified) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?ldap=true`,
        },
      });

      if (error) throw error;

      toast.success("Verification email sent! Please check your inbox.");
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      toast.error("Please enter a valid age");
      setLoading(false);
      return;
    }

    if (ageNum < 18 && !parentEmail) {
      toast.error("Users under 18 must provide a parent's email");
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

      // Add employee role
      await supabase
        .from("user_roles")
        .insert({
          user_id: session.user.id,
          role: "employee",
        });

      // Add LDAP record
      await supabase
        .from("employee_ldap")
        .insert({
          user_id: session.user.id,
        });

      // Initialize employee points (100 daily)
      const { error: pointsError } = await supabase
        .from("user_points")
        .insert({
          user_id: session.user.id,
          daily_points: 100,
          monthly_points: 0,
        });

      if (pointsError) throw pointsError;

      toast.success("Employee profile created successfully!");
      onAuthenticated();
    } catch (error: any) {
      toast.error(error.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  // Secret code verification screen
  if (step === "verify-code") {
    return (
      <Card className="glass w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-amber-500/20 w-fit mb-4">
            <KeyRound className="w-8 h-8 text-amber-500" />
          </div>
          <CardTitle>Employee LDAP Access</CardTitle>
          <CardDescription>
            Enter your employee secret code to access LDAP authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="secretCode">Secret Code</Label>
            <Input
              id="secretCode"
              type="password"
              placeholder="Enter your employee secret code"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifySecretCode()}
            />
          </div>

          <Button
            onClick={verifySecretCode}
            className="w-full bg-amber-600 hover:bg-amber-700"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Verify Access
          </Button>

          <Button variant="ghost" onClick={onBack} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Regular Login
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            This access is reserved for StackMind Technologies employees only.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Login screen
  if (step === "login") {
    return (
      <Card className="glass w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-green-500/20 w-fit mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <CardTitle>Employee Login</CardTitle>
          <CardDescription>
            Access verified. Sign in with your employee credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmployeeLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="employee@stackmind.com"
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

            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <KeyRound className="w-4 h-4 mr-2" />
              )}
              Employee Sign In
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setStep("signup")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Don't have an employee account?{" "}
              <span className="text-amber-500 font-medium">Register</span>
            </button>
          </div>

          <Button variant="ghost" onClick={onBack} className="w-full mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Signup screen
  if (step === "signup") {
    return (
      <Card className="glass w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-amber-500/20 w-fit mb-4">
            <KeyRound className="w-8 h-8 text-amber-500" />
          </div>
          <CardTitle>Employee Registration</CardTitle>
          <CardDescription>
            Create your employee account for StackMind Technologies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmployeeSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Company Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="employee@stackmind.com"
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
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Create Employee Account
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setStep("login")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Already have an account?{" "}
              <span className="text-amber-500 font-medium">Sign in</span>
            </button>
          </div>

          <Button variant="ghost" onClick={onBack} className="w-full mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Profile setup screen
  const ageNum = parseInt(age) || 0;
  const showParentEmail = ageNum > 0 && ageNum < 18;

  return (
    <Card className="glass w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto p-3 rounded-full bg-amber-500/20 w-fit mb-4">
          <User className="w-8 h-8 text-amber-500" />
        </div>
        <CardTitle>Complete Employee Profile</CardTitle>
        <CardDescription>
          Please provide your details to complete registration
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                className="pl-10"
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
                  className="pl-10"
                  required
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Complete Registration
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
