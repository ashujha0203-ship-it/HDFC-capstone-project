import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { extractDocumentData } from "@/utils/documentOcr";
import { VoiceInstructionButton } from "@/components/VoiceInstructionButton";
import { validateAddress, sanitizeText } from "@/utils/validation";
import { getSignedDocumentUrl } from "@/utils/storageService";

const previewVoiceText = `You are now on the KYC Preview page. Please review your details before final submission.

Your Full Name and Document Number have been extracted from your uploaded documents. These fields cannot be modified.

You can edit your Address if needed. Please ensure it is correct.

Important: Before submitting, you must check the confirmation box to confirm that all details including your Name, Document Number, and Address are correct and accurate.

Once you click Submit KYC, you will not be able to modify your details. A confirmation dialog will appear asking you to confirm your submission.

Please review everything carefully before proceeding.`;

const KycPreview = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const documentNumber = searchParams.get("doc");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [extracting, setExtracting] = useState(false);
  
  // Customer data
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [documentNumberDisplay, setDocumentNumberDisplay] = useState("");
  const [address, setAddress] = useState("");
  
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    if (!documentNumber) {
      toast({
        title: "Error",
        description: "Document number is required",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    try {
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

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("document_number", documentNumber)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Error",
          description: "No customer record found",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (data) {
        setCustomerId(data.id);
        setDocumentNumberDisplay(data.document_number);
        
        // Extract data from uploaded documents using OCR
        if (data.identity_document_url && data.address_document_url) {
          setExtracting(true);
          try {
            // Get signed URLs for OCR processing
            const identityUrl = await getSignedDocumentUrl(data.identity_document_url);
            const addressUrl = await getSignedDocumentUrl(data.address_document_url);
            
            if (identityUrl && addressUrl) {
              const extractedData = await extractDocumentData(
                identityUrl,
                addressUrl,
                data.document_number
              );
              
              setName(extractedData.name);
              setAddress(extractedData.address);
              
              if (extractedData.documentNumber && extractedData.documentNumber !== data.document_number) {
                setDocumentNumberDisplay(extractedData.documentNumber);
              }
            }
          } catch {
            // Silent fail - user can enter details manually
            toast({
              title: "Data Extraction Notice",
              description: "Unable to extract some details from documents. Please verify and enter manually.",
              variant: "destructive",
            });
          } finally {
            setExtracting(false);
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClick = () => {
    if (!isConfirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that all details are correct",
        variant: "destructive",
      });
      return;
    }

    // Validate address with proper validation
    const addressValidation = validateAddress(address);
    if (!addressValidation.isValid) {
      toast({
        title: "Invalid Address",
        description: addressValidation.error,
        variant: "destructive",
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleFinalSubmit = async () => {
    if (!customerId) return;

    setSubmitting(true);
    try {
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

      // Sanitize address before storing
      const sanitizedAddress = sanitizeText(address.trim());

      const { error } = await supabase
        .from("customers")
        .update({
          kyc_status: "completed",
          kyc_completed_at: new Date().toISOString(),
          current_step: "completed",
          address: sanitizedAddress,
        })
        .eq("id", customerId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "KYC submitted successfully",
      });

      navigate(`/kyc/result?doc=${documentNumber}&status=success`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  if (loading || extracting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">
            {extracting ? "Extracting data from documents..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-end mb-2">
              <VoiceInstructionButton text={previewVoiceText} autoPlay />
            </div>
            <CardTitle>Review Your Details</CardTitle>
            <CardDescription>
              Please review your information before final submission. You can edit your address if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Non-editable fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={name} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Extracted from uploaded document
                </p>
              </div>

              <div className="space-y-2">
                <Label>Document Number</Label>
                <Input value={documentNumberDisplay} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Document number cannot be modified
                </p>
              </div>
            </div>

            {/* Editable address field */}
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your complete address"
                className="min-h-20"
              />
              <p className="text-xs text-muted-foreground">
                You can edit your address if needed
              </p>
            </div>

            {/* Confirmation checkbox */}
            <div className="flex items-start space-x-2 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="confirm"
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
              />
              <label
                htmlFor="confirm"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I confirm that all the details shown above (Name, Document Number, Address) are correct and accurate.
              </label>
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmitClick}
              disabled={submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit KYC"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to submit?</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, you will not be able to modify your KYC details. Please ensure all information is correct before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Yes, Submit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KycPreview;
