import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileCheck, Video, ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { VoiceInstructionButton } from "@/components/VoiceInstructionButton";
import { useUserRole } from "@/hooks/useUserRole";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isAdmin } = useUserRole();

  const voiceText =
    "Welcome to SecureBank KYC, your secure digital identity verification portal. Complete your KYC process in minutes with our advanced verification system. Click Start Verification to begin. You will need your identity document like Aadhaar or PAN card, and an address proof document.";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user.email || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="HDFC Bank logo"
                className="w-8 h-8"
              />
              <h1 className="text-2xl font-bold text-foreground">HDFC Bank KYC</h1>
            </div>
            <div className="flex items-center gap-4">
              <VoiceInstructionButton text={voiceText} variant="ghost" size="sm" />
              {isAuthenticated && (
                <>
                  <span className="text-sm text-muted-foreground hidden md:inline">{userEmail}</span>
                  {isAdmin && (
                    <Button onClick={() => navigate("/admin/dashboard")} variant="outline" size="sm">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Admin
                    </Button>
                  )}
                  <Button onClick={handleLogout} variant="outline" size="sm">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Secure Digital Identity Verification
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Complete your KYC process in minutes with our advanced verification system
            </p>
          </div>
          
          {isAuthenticated ? (
            <Button asChild size="lg" className="h-14 px-8 text-lg font-semibold">
              <Link to="/verify">
                Start Verification
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="h-14 px-8 text-lg font-semibold">
              <Link to="/auth">
                Login to Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            How It Works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="shadow-lg border-2">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Step 1: Verify</CardTitle>
                <CardDescription className="text-base">
                  Enter your document number to check registration status
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-lg border-2">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <FileCheck className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Step 2: Documents</CardTitle>
                <CardDescription className="text-base">
                  Capture your identity and address proof documents
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="shadow-lg border-2">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Video className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Step 3: Face Scan</CardTitle>
                <CardDescription className="text-base">
                  Complete live facial verification for security
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-background/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">
            © 2025 SecureBank. All rights reserved. Your security is our priority.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
