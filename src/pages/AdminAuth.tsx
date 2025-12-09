import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import { VoiceInstructionButton } from "@/components/VoiceInstructionButton";
import { emailSchema, passwordSchema } from "@/utils/validation";

export default function AdminAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const voiceText = isLogin
    ? "Welcome to the admin login page. Enter your email and password to access the admin dashboard. If you don't have an admin account, switch to sign up mode and use your invite code."
    : "Admin registration page. Enter your email, password, and the invite code provided to you. The invite code is required to create an admin account.";

  useEffect(() => {
    const checkAdminRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: roleData } = await supabase.rpc("get_user_role", {
          _user_id: user.id,
        });

        if (roleData === "admin") {
          navigate("/admin/dashboard");
        }
      }
    };

    checkAdminRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Defer the role check to avoid deadlock
        setTimeout(async () => {
          const { data: roleData } = await supabase.rpc("get_user_role", {
            _user_id: session.user.id,
          });

          if (roleData === "admin") {
            navigate("/admin/dashboard");
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email and password
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        throw new Error(emailResult.error.errors[0]?.message || "Invalid email");
      }

      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        throw new Error(passwordResult.error.errors[0]?.message || "Invalid password");
      }

      if (isLogin) {
        // Admin login
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailResult.data,
          password,
        });

        if (authError) {
          // Don't expose specific auth errors
          throw new Error("Invalid email or password");
        }

        // Check if user is admin
        const { data: roleData, error: roleError } = await supabase.rpc("get_user_role", {
          _user_id: authData.user.id,
        });

        if (roleError || roleData !== "admin") {
          await supabase.auth.signOut();
          throw new Error("You don't have admin access. Please use the regular login.");
        }

        toast({
          title: "Welcome, Admin!",
          description: "You have successfully logged in.",
        });

        navigate("/admin/dashboard");
      } else {
        // Admin signup with invite code
        const trimmedCode = inviteCode.trim().toUpperCase();
        if (!trimmedCode) {
          throw new Error("Invite code is required for admin registration");
        }

        // Validate invite code using secure RPC function (not direct table access)
        const { data: isValidCode, error: validateError } = await supabase.rpc("validate_invite_code", {
          code_to_check: trimmedCode,
        });

        if (validateError || !isValidCode) {
          throw new Error("Invalid or expired invite code");
        }

        // Create the user account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: emailResult.data,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin/dashboard`,
          },
        });

        if (signUpError) {
          // Handle specific signup errors without exposing details
          if (signUpError.message.includes("already registered")) {
            throw new Error("An account with this email already exists");
          }
          throw new Error("Failed to create account. Please try again.");
        }

        if (!signUpData.user) {
          throw new Error("Failed to create account");
        }

        // Assign admin role using secure RPC function
        const { data: roleAssigned, error: roleError } = await supabase.rpc("assign_admin_role", {
          user_id_to_assign: signUpData.user.id,
          invite_code: trimmedCode,
        });

        if (roleError || !roleAssigned) {
          throw new Error("Failed to assign admin role. Please contact support.");
        }

        toast({
          title: "Admin account created!",
          description: "You can now log in with your credentials.",
        });
        
        setIsLogin(true);
        setInviteCode("");
        setPassword("");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md border-primary/20 bg-card/95 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? "Admin Login" : "Admin Registration"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your credentials to access the admin dashboard"
              : "Create an admin account using your invite code"}
          </CardDescription>
          <div className="pt-2">
            <VoiceInstructionButton text={voiceText} variant="ghost" size="sm" />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="ADMIN2024SECURE"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  className="font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the invite code provided by your organization
                </p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                <>{isLogin ? "Sign In" : "Create Admin Account"}</>
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isLogin ? "Need an admin account?" : "Already have an account?"}
            <Button
              variant="link"
              className="ml-1"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Register with invite code" : "Sign in"}
            </Button>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => navigate("/auth")}
            >
              ← Back to User Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
