import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, FileText, CreditCard, Video } from "lucide-react";
import { VoiceInstructionButton } from "@/components/VoiceInstructionButton";

const instructionsVoiceText = `Welcome to the KYC Instructions page. Please listen carefully before proceeding with your verification.

For Identity Proof, you will need one of the following documents:
AADHAAR Card - A government-issued identity document with a 12-digit number.
PAN Card - Your Permanent Account Number issued by the Income Tax Department.

For Address Proof, you can use any of these documents:
AADHAAR Card with your current address.
Utility bills such as electricity, water, or gas, not older than 3 months.
Bank statement or passbook with your address.

For the Live Facial Video verification, please ensure:
You are in a well-lit environment.
Remove any sunglasses, hats, or face coverings.
Look directly at the camera and follow the on-screen instructions.
Keep your face centered in the frame.

When you are ready, click the Start KYC Process button to begin.`;

const KycInstructions = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const documentNumber = searchParams.get("doc");

  const handleStartKyc = () => {
    if (documentNumber) {
      navigate(`/kyc/capture?doc=${encodeURIComponent(documentNumber)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-xl border-2">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-end mb-2">
              <VoiceInstructionButton text={instructionsVoiceText} autoPlay />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">
              KYC Instructions
            </CardTitle>
            <CardDescription className="text-base">
              Please read the following instructions carefully before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Identity Proof Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Identity Proof Documents
                </h3>
              </div>
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">
                        <strong>AADHAAR Card:</strong> Government-issued identity document with 12-digit number
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">
                        <strong>PAN Card:</strong> Permanent Account Number issued by Income Tax Department
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Address Proof Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Address Proof Documents
                </h3>
              </div>
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">
                        AADHAAR Card with current address
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">
                        Utility bills (electricity, water, gas) not older than 3 months
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">
                        Bank statement or passbook with address
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Video KYC Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Live Facial Video KYC
                </h3>
              </div>
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">
                        Ensure you are in a well-lit environment
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">
                        Remove any sunglasses, hats, or face coverings
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">
                        Look directly at the camera and follow on-screen instructions
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">
                        Keep your face centered in the frame
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Button 
              onClick={handleStartKyc}
              className="w-full h-14 text-lg font-semibold"
              size="lg"
            >
              Start KYC Process
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KycInstructions;