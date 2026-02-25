import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Loader2, ArrowLeft, CheckCircle, Shield, Mail, Lock, User, Users, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

interface LDAPAuthProps {
  onBack: () => void;
  onAuthenticated: () => void;
}

type LDAPStep = "verify-employee-id" | "verify-code" | "login" | "signup" | "profile-setup";

export default function LDAPAuth({ onBack, onAuthenticated }: LDAPAuthProps) {
  const [step, setStep] = useState<LDAPStep>("verify-employee-id");
  const [employeeId, setEmployeeId] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  const verifyEmployeeId = async () => {
    if (!employeeId.trim()) {
      toast.error("Please enter your Employee ID");
      return;
    }

    setLoading(true);
    try {
      // Verify employee ID exists in the profiles table (designation field stores employee_id as SM-EMP-XXXX)
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .or(`designation.ilike.%${employeeId.trim()}%,username.eq.${employeeId.trim()}`)
        .limit(1);

      // Also check if employee_id matches pattern in any profile
      // Employee IDs are stored or can be searched by pattern
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, designation");

      // Search for matching employee ID in profiles
      const matchedProfile = allProfiles?.find(p => {
        // Check if the designation or any field contains the employee ID
        return p.designation?.includes(employeeId.trim());
      });

      if (!matchedProfile && (!data || data.length === 0)) {
        // Notify admin about invalid employee ID attempt
        await notifyAdminInvalidEmployeeId(employeeId.trim());
        toast.error("Invalid Employee ID. The admin has been notified.");
        setLoading(false);
        return;
      }

      // Verify employee has the employee role
      const userId = matchedProfile?.user_id || data?.[0]?.user_id;
      if (userId) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["employee", "admin"]);

        if (!roleData || roleData.length === 0) {
          await notifyAdminInvalidEmployeeId(employeeId.trim());
          toast.error("Invalid Employee ID. The admin has been notified.");
          setLoading(false);
          return;
        }
      }

      toast.success("Employee ID verified! Please enter the secret code.");
      setStep("verify-code");
    } catch (error) {
      toast.error("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const notifyAdminInvalidEmployeeId = async (attemptedId: string) => {
    try {
      // Get admin emails
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles) {
        for (const admin of adminRoles) {
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", admin.user_id)
            .single();

          if (adminProfile) {
            await supabase.from("email_notifications").insert({
              recipient_user_id: admin.user_id,
              recipient_email: adminProfile.email,
              notification_type: "invalid_employee_id_attempt",
              subject: "⚠️ Invalid Employee ID Attempt",
              body: `An invalid Employee ID was attempted during LDAP authentication.\n\nAttempted ID: ${attemptedId}\nTime: ${new Date().toISOString()}\n\nThis may indicate an unauthorized access attempt.`,
              metadata: JSON.stringify({ attempted_id: attemptedId, timestamp: new Date().toISOString() }),
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to notify admin:", err);
    }
  };

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

      await supabase
        .from("user_roles")
        .insert({
          user_id: session.user.id,
          role: "employee",
        });

      await supabase
        .from("employee_ldap")
        .insert({
          user_id: session.user.id,
        });

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

  // Step 1: Employee ID verification
  if (step === "verify-employee-id") {
    return (
      <Card className="glass w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-amber-500/20 w-fit mb-4">
            <BadgeCheck className="w-8 h-8 text-amber-500" />
          </div>
          <CardTitle>Employee Verification</CardTitle>
          <CardDescription>
            Enter your Employee ID (e.g., SM-EMP-0001) to proceed with LDAP authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee ID</Label>
            <Input
              id="employeeId"
              type="text"
              placeholder="SM-EMP-XXXX"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && verifyEmployeeId()}
              className="font-mono"
            />
          </div>

          <Button
            onClick={verifyEmployeeId}
            className="w-full bg-amber-600 hover:bg-amber-700"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <BadgeCheck className="w-4 h-4 mr-2" />
            )}
            Verify Employee ID
          </Button>

          <Button variant="ghost" onClick={onBack} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Regular Login
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            This access is reserved for StackMind Technologies employees only.
            Invalid attempts will be reported to the admin.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Secret code verification
  if (step === "verify-code") {
    return (
      <Card className="glass w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-amber-500/20 w-fit mb-4">
            <KeyRound className="w-8 h-8 text-amber-500" />
          </div>
          <CardTitle>Enter Secret Code</CardTitle>
          <CardDescription>
            Your Employee ID has been verified. Now enter your employee secret code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-sm text-green-500">
            <CheckCircle className="w-4 h-4" />
            Employee ID verified: {employeeId}
          </div>

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

          <Button variant="ghost" onClick={() => setStep("verify-employee-id")} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
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
