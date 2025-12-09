import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Home } from "lucide-react";
import { VoiceInstructionButton } from "@/components/VoiceInstructionButton";

const successVoiceText = `Congratulations! Your KYC verification has been completed successfully. 
Your identity has been verified. 
You can now return to the home page by clicking the Return to Home button.`;

const failureVoiceText = `Unfortunately, your KYC verification was unsuccessful. 
We were unable to verify your identity. 
This may have happened because the document images were blurry, the lighting was inadequate, or document details did not match.
Please ensure your documents are clearly visible and not blurry, all document details are legible, the lighting is adequate, the entire document is within the frame, and your face is clearly visible for facial verification.
You can try again by clicking the Try Again button, or return to home.`;

const KycResult = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");
  const documentNumber = searchParams.get("doc");

  const isSuccess = status === "success";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-2">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="flex justify-end">
            <VoiceInstructionButton 
              text={isSuccess ? successVoiceText : failureVoiceText} 
              autoPlay 
            />
          </div>
          <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center ${
            isSuccess ? "bg-success/10" : "bg-destructive/10"
          }`}>
            {isSuccess ? (
              <CheckCircle2 className="w-12 h-12 text-success" />
            ) : (
              <XCircle className="w-12 h-12 text-destructive" />
            )}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-4xl font-bold text-foreground">
              {isSuccess ? "KYC Completed Successfully" : "KYC Verification Failed"}
            </CardTitle>
            <CardDescription className="text-lg">
              {isSuccess
                ? "Your identity has been verified successfully"
                : "We were unable to verify your identity"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <Card className={`${isSuccess ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Document Number</span>
                  <span className="font-semibold text-foreground">{documentNumber}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={`font-semibold ${isSuccess ? "text-success" : "text-destructive"}`}>
                    {isSuccess ? "Verified" : "Failed"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="font-semibold text-foreground">
                    {new Date().toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Time</span>
                  <span className="font-semibold text-foreground">
                    {new Date().toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {!isSuccess && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-foreground mb-3 text-lg">Reason for Failure:</h3>
                <p className="text-foreground leading-relaxed">
                  Document verification failed: Image quality insufficient or document details do not match.
                  Please ensure:
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2 text-foreground">
                  <li>Your documents are clearly visible and not blurry</li>
                  <li>All document details are legible</li>
                  <li>The lighting is adequate</li>
                  <li>The entire document is within the frame</li>
                  <li>Your face is clearly visible for facial verification</li>
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="flex-1 h-12 text-base font-semibold" variant={isSuccess ? "default" : "outline"}>
              <Link to="/">
                <Home className="mr-2 h-5 w-5" />
                Return to Home
              </Link>
            </Button>
            {!isSuccess && (
              <Button asChild className="flex-1 h-12 text-base font-semibold">
                <Link to={`/kyc/capture?doc=${encodeURIComponent(documentNumber || "")}`}>
                  Try Again
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KycResult;