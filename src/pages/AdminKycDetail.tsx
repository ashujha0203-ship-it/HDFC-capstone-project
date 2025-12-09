import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import {
  ArrowLeft,
  Shield,
  User,
  MapPin,
  Camera,
  Save,
  RefreshCw,
  Eye,
} from "lucide-react";
import { VoiceInstructionButton } from "@/components/VoiceInstructionButton";
import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";
import { sanitizeText } from "@/utils/validation";
import { getSignedDocumentUrls } from "@/utils/storageService";

interface KycRecord {
  id: string;
  document_number: string;
  kyc_status: string;
  current_step: string;
  identity_document_type: string | null;
  identity_document_url: string | null;
  address_document_type: string | null;
  address_document_url: string | null;
  face_video_url: string | null;
  created_at: string;
  updated_at: string;
  failure_reason: string | null;
  admin_notes: string | null;
  kyc_completed_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  in_review: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  approved: "bg-green-500/10 text-green-600 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  on_hold: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

export default function AdminKycDetail() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<KycRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [failureReason, setFailureReason] = useState("");
  
  // Document preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  
  // Signed URLs for documents
  const [documentUrls, setDocumentUrls] = useState<{
    identity: string | null;
    address: string | null;
    face: string | null;
  }>({ identity: null, address: null, face: null });

  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading, userId } = useUserRole();

  const voiceText = record
    ? `Viewing KYC application for document number ${record.document_number}. Current status is ${record.kyc_status}. You can review the uploaded documents and update the application status.`
    : "Loading KYC application details.";

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate, toast]);

  const fetchRecord = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setRecord(data);
      setNewStatus(data.kyc_status || "pending");
      setAdminNotes(data.admin_notes || "");
      setFailureReason(data.failure_reason || "");
      
      // Fetch signed URLs for documents
      const urls = await getSignedDocumentUrls({
        identity: data.identity_document_url,
        address: data.address_document_url,
        face: data.face_video_url,
      });
      setDocumentUrls(urls);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load record";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      navigate("/admin/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && id) {
      fetchRecord();
    }
  }, [isAdmin, id]);

  // Open document preview dialog
  const openDocumentPreview = (url: string | null, title: string) => {
    if (!url) return;
    setPreviewUrl(url);
    setPreviewTitle(title);
    setPreviewOpen(true);
  };

  const handleSave = async () => {
    if (!record || !userId) return;

    setSaving(true);
    try {
      // Sanitize text inputs to prevent XSS
      const sanitizedNotes = sanitizeText(adminNotes);
      const sanitizedReason = sanitizeText(failureReason);

      const updates: Record<string, any> = {
        kyc_status: newStatus,
        admin_notes: sanitizedNotes,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "rejected") {
        if (!failureReason.trim()) {
          toast({
            title: "Rejection Reason Required",
            description: "Please provide a reason for rejection.",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
        updates.failure_reason = sanitizedReason;
      }

      if (newStatus === "approved") {
        updates.kyc_completed_at = new Date().toISOString();
        updates.failure_reason = null;
      }

      const { error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", record.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "KYC record updated successfully",
      });

      fetchRecord();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!record) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-primary" />
                <div>
                  <h1 className="text-lg font-bold text-foreground">KYC Detail</h1>
                  <p className="text-sm text-muted-foreground font-mono">
                    {record.document_number}
                  </p>
                </div>
              </div>
            </div>
            <VoiceInstructionButton text={voiceText} variant="ghost" size="sm" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Application Status</CardTitle>
                  <Badge
                    variant="outline"
                    className={statusColors[record.kyc_status || "pending"]}
                  >
                    {record.kyc_status || "pending"}
                  </Badge>
                </div>
                <CardDescription>
                  Current step: {record.current_step?.replace("_", " ") || "N/A"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="font-medium">
                      {new Date(record.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Updated:</span>
                    <p className="font-medium">
                      {new Date(record.updated_at).toLocaleString()}
                    </p>
                  </div>
                  {record.kyc_completed_at && (
                    <div>
                      <span className="text-muted-foreground">Completed:</span>
                      <p className="font-medium">
                        {new Date(record.kyc_completed_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {record.reviewed_at && (
                    <div>
                      <span className="text-muted-foreground">Reviewed:</span>
                      <p className="font-medium">
                        {new Date(record.reviewed_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Documents</CardTitle>
                <CardDescription>
                  Click on any document to view it in full size
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Identity Document */}
                <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Identity Document</h4>
                    <p className="text-sm text-muted-foreground">
                      Type: {record.identity_document_type || "Not provided"}
                    </p>
                    {documentUrls.identity ? (
                      <div className="mt-2 space-y-2">
                        {/* Thumbnail preview */}
                        <div 
                          className="w-full max-w-xs h-32 bg-muted rounded-lg overflow-hidden cursor-pointer border hover:border-primary transition-colors"
                          onClick={() => openDocumentPreview(documentUrls.identity, "Identity Document")}
                        >
                          <img
                            src={documentUrls.identity}
                            alt="Identity Document"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDocumentPreview(documentUrls.identity, "Identity Document")}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Full Size
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No document uploaded</p>
                    )}
                  </div>
                </div>

                {/* Address Document */}
                <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Address Document</h4>
                    <p className="text-sm text-muted-foreground">
                      Type: {record.address_document_type || "Not provided"}
                    </p>
                    {documentUrls.address ? (
                      <div className="mt-2 space-y-2">
                        <div 
                          className="w-full max-w-xs h-32 bg-muted rounded-lg overflow-hidden cursor-pointer border hover:border-primary transition-colors"
                          onClick={() => openDocumentPreview(documentUrls.address, "Address Document")}
                        >
                          <img
                            src={documentUrls.address}
                            alt="Address Document"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDocumentPreview(documentUrls.address, "Address Document")}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Full Size
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No document uploaded</p>
                    )}
                  </div>
                </div>

                {/* Face Video */}
                <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Face Verification</h4>
                    {documentUrls.face ? (
                      <div className="mt-2 space-y-2">
                        <div 
                          className="w-full max-w-xs h-32 bg-muted rounded-lg overflow-hidden cursor-pointer border hover:border-primary transition-colors"
                          onClick={() => openDocumentPreview(documentUrls.face, "Face Verification Photo")}
                        >
                          <img
                            src={documentUrls.face}
                            alt="Face Verification"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDocumentPreview(documentUrls.face, "Face Verification Photo")}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Full Size
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">No face image captured</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
                <CardDescription>
                  Change the KYC application status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>New Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newStatus === "rejected" && (
                  <div className="space-y-2">
                    <Label>Rejection Reason</Label>
                    <Textarea
                      placeholder="Enter the reason for rejection..."
                      value={failureReason}
                      onChange={(e) => setFailureReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    placeholder="Add internal notes..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    These notes are internal and not visible to the customer.
                  </p>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" disabled={saving}>
                      {saving ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Status Update</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to change the status to "{newStatus}"?
                        {newStatus === "approved" &&
                          " This will mark the KYC as complete."}
                        {newStatus === "rejected" &&
                          " The customer will be notified of the rejection."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSave}>
                        Confirm
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Current Failure Reason */}
            {record.failure_reason && (
              <Card className="border-destructive/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-destructive text-sm">
                    Rejection Reason
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{record.failure_reason}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      {/* Document Preview Dialog */}
      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        documentUrl={previewUrl}
        title={previewTitle}
      />
    </div>
  );
}
