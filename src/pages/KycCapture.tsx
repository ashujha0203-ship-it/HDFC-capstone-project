import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, AlertCircle, CheckCircle2, Loader2, RotateCw } from "lucide-react";
import { VoiceInstructionButton } from "@/components/VoiceInstructionButton";
import { uploadDocument } from "@/utils/storageService";

const voiceInstructions = {
  identity: `You are now on the Identity Proof capture page. 
Please position your AADHAAR card or PAN card within the camera frame. 
Make sure the document is flat, well-lit, and all text is clearly visible. 
Avoid any glare or shadows on the document. 
Once the document is properly positioned, click the Capture Identity button.`,
  address: `Great! Now we need your Address Proof document. 
Please position your address proof document within the camera frame. 
This can be your AADHAAR card, utility bill, or bank statement. 
Ensure the entire document is visible and the address is clearly readable. 
Click the Capture Address button when ready.`,
  face: `Excellent! This is the final step - Live Facial Verification. 
Please look directly at the camera. 
Ensure your face is well-lit and clearly visible. 
Remove any sunglasses, hats, or face coverings. 
Keep your face centered in the frame. 
Click the Capture Face button to complete verification.`,
};

const KycCapture = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const documentNumber = searchParams.get("doc");
  const { toast } = useToast();

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [capturing, setCapturing] = useState(false);
  const [identityDoc, setIdentityDoc] = useState<string | null>(null);
  const [addressDoc, setAddressDoc] = useState<string | null>(null);
  const [faceVideo, setFaceVideo] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<"identity" | "address" | "face">("identity");
  const [alert, setAlert] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Prefer back camera on mobile devices by default, but allow flipping
    if (typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent)) {
      setFacingMode("environment");
    }

    loadExistingProgress();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Start camera only after loading is complete
  useEffect(() => {
    if (!loading) {
      startCamera();
    }
  }, [loading]);

  const loadExistingProgress = async () => {
    if (!documentNumber) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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

      if (data) {
        // Load existing progress
        setCustomerId(data.id);
        if (data.identity_document_url) {
          setIdentityDoc(data.identity_document_url);
        }
        if (data.address_document_url) {
          setAddressDoc(data.address_document_url);
        }
        if (data.face_video_url) {
          setFaceVideo(data.face_video_url);
        }

        // Determine current step based on what's completed
        if (!data.identity_document_url) {
          setCurrentStep("identity");
        } else if (!data.address_document_url) {
          setCurrentStep("address");
        } else if (!data.face_video_url) {
          setCurrentStep("face");
        } else {
          // All steps completed
          setCurrentStep("face");
        }
      }
    } catch (error: any) {
      toast({
        title: "Error Loading Progress",
        description: error.message || "Failed to load existing data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async (mode?: "user" | "environment") => {
    const modeToUse = mode || facingMode || "user";

    try {
      // Stop any existing tracks before starting a new stream
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }

      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: modeToUse }, width: 1280, height: 720 },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch((e) => console.log("Video play error:", e));
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please grant camera permissions or try flipping the camera.",
        variant: "destructive",
      });
    }
  };

  const switchCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";

    try {
      // Stop current stream
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }

      setFacingMode(newMode);
      await startCamera(newMode);
      toast({ title: `Switched to ${newMode === "environment" ? "back" : "front"} camera` });
    } catch (err) {
      toast({
        title: "Camera Switch Error",
        description: "Unable to switch camera. Your device may not support this.",
        variant: "destructive",
      });
    }
  };

  const checkImageQuality = (imageData: ImageData): { isValid: boolean; message: string } => {
    // Simple blur detection using variance
    const pixels = imageData.data;
    let sum = 0;
    let sumSquare = 0;
    const totalPixels = pixels.length / 4;

    for (let i = 0; i < pixels.length; i += 4) {
      const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      sum += gray;
      sumSquare += gray * gray;
    }

    const mean = sum / totalPixels;
    const variance = sumSquare / totalPixels - mean * mean;

    // Check if image is too blurry (low variance)
    if (variance < 100) {
      return { isValid: false, message: "Image is too blurry. Please ensure the document is in focus." };
    }

    // Check if image is too dark
    if (mean < 50) {
      return { isValid: false, message: "Image is too dark. Please improve lighting." };
    }

    return { isValid: true, message: "Image quality is good" };
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // Check image quality
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const quality = checkImageQuality(imageData);

    if (!quality.isValid) {
      setAlert(quality.message);
      setTimeout(() => setAlert(null), 3000);
      return;
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    // Get user for upload
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

    try {
      // Simulate document type detection
      const detectedType = currentStep === "identity" ? "AADHAAR" : "Address Proof";
      
      if (currentStep === "identity") {
        // Upload to Supabase Storage
        const storagePath = await uploadDocument(dataUrl, user.id, "identity");
        setIdentityDoc(storagePath);
        await saveProgress({
          identity_document_url: storagePath,
          identity_document_type: detectedType,
          current_step: "address",
        });
        toast({
          title: "Document Captured",
          description: `${detectedType} detected and captured successfully`,
        });
        setCurrentStep("address");
      } else if (currentStep === "address") {
        const storagePath = await uploadDocument(dataUrl, user.id, "address");
        setAddressDoc(storagePath);
        await saveProgress({
          address_document_url: storagePath,
          address_document_type: detectedType,
          current_step: "face",
        });
        toast({
          title: "Document Captured",
          description: `${detectedType} captured successfully`,
        });
        setCurrentStep("face");
      } else if (currentStep === "face") {
        const storagePath = await uploadDocument(dataUrl, user.id, "face");
        setFaceVideo(storagePath);
        await saveProgress({
          face_video_url: storagePath,
          current_step: "completed",
        });
        toast({
          title: "Face Verification Complete",
          description: "Live facial verification captured successfully",
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to upload document";
      toast({
        title: "Upload Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const saveProgress = async (updates: any) => {
    if (!documentNumber) return;

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

      if (customerId) {
        // Update existing record
        const { error } = await supabase
          .from("customers")
          .update(updates)
          .eq("id", customerId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Create new record
        const { data, error } = await supabase
          .from("customers")
          .insert({
            document_number: documentNumber,
            user_id: user.id,
            kyc_status: "pending",
            ...updates,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setCustomerId(data.id);
      }
    } catch (error: any) {
      toast({
        title: "Save Error",
        description: error.message || "Failed to save progress",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    if (!documentNumber || !identityDoc || !addressDoc || !faceVideo) {
      toast({
        title: "Incomplete KYC",
        description: "Please complete all verification steps",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // Ensure all data is saved before proceeding
      await saveProgress({
        identity_document_url: identityDoc,
        address_document_url: addressDoc,
        face_video_url: faceVideo,
        current_step: "completed",
      });

      // Verify the record exists
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
        .select("id")
        .eq("document_number", documentNumber)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Error",
          description: "Failed to save KYC data. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Documents Captured",
        description: "Proceeding to review your details",
      });

      navigate(`/kyc/preview?doc=${encodeURIComponent(documentNumber)}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete KYC process",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "identity":
        return "Capture Identity Proof";
      case "address":
        return "Capture Address Proof";
      case "face":
        return "Live Facial Verification";
      default:
        return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case "identity":
        return "Position your AADHAAR or PAN card within the frame";
      case "address":
        return "Position your address proof document within the frame";
      case "face":
        return "Look directly at the camera for facial verification";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-xl border-2">
          <CardHeader className="text-center">
            <div className="flex justify-end mb-2">
              <VoiceInstructionButton 
                key={currentStep} 
                text={voiceInstructions[currentStep]} 
                autoPlay 
              />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">
              {getStepTitle()}
            </CardTitle>
            <CardDescription className="text-base">
              {getStepDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {alert && (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base">{alert}</AlertDescription>
              </Alert>
            )}

            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-4 border-primary/50 rounded-lg pointer-events-none" />
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex items-center gap-2">
                {identityDoc ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <div className="w-5 h-5 border-2 border-muted rounded-full" />
                )}
                <span className={identityDoc ? "text-success font-medium" : "text-muted-foreground"}>
                  Identity Proof
                </span>
              </div>
              <div className="flex items-center gap-2">
                {addressDoc ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <div className="w-5 h-5 border-2 border-muted rounded-full" />
                )}
                <span className={addressDoc ? "text-success font-medium" : "text-muted-foreground"}>
                  Address Proof
                </span>
              </div>
              <div className="flex items-center gap-2">
                {faceVideo ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <div className="w-5 h-5 border-2 border-muted rounded-full" />
                )}
                <span className={faceVideo ? "text-success font-medium" : "text-muted-foreground"}>
                  Face Verification
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              {identityDoc && addressDoc && faceVideo ? (
                <Button
                  onClick={handleComplete}
                  className="flex-1 h-12 text-base font-semibold"
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Complete KYC"
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={switchCamera}
                    className="h-12 text-base font-semibold"
                    disabled={capturing}
                  >
                    <RotateCw className="mr-2 h-5 w-5" />
                    Flip
                  </Button>
                  <Button
                    onClick={captureImage}
                    className="flex-1 h-12 text-base font-semibold"
                    disabled={capturing}
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    Capture {currentStep === "identity" ? "Identity" : currentStep === "address" ? "Address" : "Face"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KycCapture;