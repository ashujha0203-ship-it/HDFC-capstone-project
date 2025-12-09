import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { VoiceInstructionButton } from "@/components/VoiceInstructionButton";
import { validatePanNumber } from "@/utils/validation";

const verifyVoiceText = `Welcome to the Document Verification page. 
To begin your KYC process, please enter your PAN number in the field provided. 
Your PAN number must be exactly 10 characters: 5 letters, followed by 4 digits, and ending with 1 letter.
For example: A B C D E 1 2 3 4 F.
After entering your PAN number, click the Verify and Continue button.
If you have previously started the KYC process, you will be able to resume from where you left off.`;

const VerifyDocument = () => {
  const [documentNumber, setDocumentNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Validate PAN on input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    // Only allow alphanumeric characters, max 10
    const sanitized = value.replace(/[^A-Z0-9]/gi, "").slice(0, 10);
    setDocumentNumber(sanitized);
    
    // Clear error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate PAN number format
    const validation = validatePanNumber(documentNumber);
    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid PAN number");
      toast({
        title: "Invalid PAN Number",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    const panNumber = validation.formatted!;

    setLoading(true);
    setValidationError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to continue",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Check if document exists for this user
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("document_number", panNumber)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Customer exists - check KYC status
        if (data.kyc_status === "completed" || data.kyc_status === "approved") {
          toast({
            title: "KYC Already Completed",
            description: "Your KYC verification is already complete.",
          });
          navigate(`/kyc/result?doc=${encodeURIComponent(panNumber)}&status=success`);
        } else if (data.kyc_status === "failed" || data.kyc_status === "rejected") {
          toast({
            title: "KYC Previously Failed",
            description: "Your previous KYC attempt was unsuccessful. Starting new verification.",
          });
          navigate(`/kyc/instructions?doc=${encodeURIComponent(panNumber)}`);
        } else {
          // KYC is pending/incomplete - resume from where they left off
          toast({
            title: "Resuming KYC Process",
            description: "Continuing from where you left off.",
          });
          navigate(`/kyc/capture?doc=${encodeURIComponent(panNumber)}`);
        }
      } else {
        // New customer - proceed to KYC
        navigate(`/kyc/instructions?doc=${encodeURIComponent(panNumber)}`);
      }
    } catch (error: any) {
      toast({
        title: "Verification Error",
        description: "Failed to verify document number. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-end">
            <VoiceInstructionButton text={verifyVoiceText} autoPlay />
          </div>
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">
            Document Verification
          </CardTitle>
          <CardDescription className="text-base">
            Enter your document number to begin the KYC process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="documentNumber" className="text-sm font-medium">
                PAN Number
              </Label>
              <Input
                id="documentNumber"
                type="text"
                placeholder="Enter your PAN (e.g., ABCDE1234F)"
                value={documentNumber}
                onChange={handleInputChange}
                className={`h-12 uppercase ${validationError ? "border-destructive" : ""}`}
                disabled={loading}
                maxLength={10}
                autoComplete="off"
              />
              {validationError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{validationError}</AlertDescription>
                </Alert>
              )}
              <p className="text-xs text-muted-foreground">
                Format: 5 letters + 4 digits + 1 letter (e.g., BXJPJ3641Q)
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold"
              disabled={loading || documentNumber.length !== 10}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Continue"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyDocument;