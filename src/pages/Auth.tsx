import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import { VoiceInstructionButton } from "@/components/VoiceInstructionButton";
import { emailSchema, passwordSchema } from "@/utils/validation";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const voiceText = isLogin
    ? "Welcome to the KYC login page. Enter your email and password to access your account. If you don't have an account, click the sign up link below the login button."
    : "Create a new account to start your KYC verification. Enter your email and choose a secure password with at least 6 characters.";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        throw new Error(emailResult.error.errors[0]?.message || "Invalid email");
      }

      // Validate password
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        throw new Error(passwordResult.error.errors[0]?.message || "Invalid password");
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailResult.data,
          password,
        });

        if (error) {
          // Don't expose specific auth errors
          throw new Error("Invalid email or password");
        }

        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: emailResult.data,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          // Handle specific signup errors without exposing details
          if (error.message.includes("already registered")) {
            throw new Error("An account with this email already exists");
          }
          throw new Error("Failed to create account. Please try again.");
        }

        // Assign default 'user' role
        if (data.user) {
          await supabase.from("user_roles").insert({
            user_id: data.user.id,
            role: "user",
          });
        }

        toast({
          title: "Account created!",
          description: "You can now log in with your credentials.",
        });
        setIsLogin(true);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{isLogin ? "Login" : "Sign Up"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your credentials to access your account"
              : "Create an account to start your KYC process"}
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
                placeholder="your@email.com"
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? "Logging in..." : "Creating account..."}
                </>
              ) : (
                <>{isLogin ? "Login" : "Sign Up"}</>
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <Button
              variant="link"
              className="ml-1"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign up" : "Login"}
            </Button>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => navigate("/admin/auth")}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
