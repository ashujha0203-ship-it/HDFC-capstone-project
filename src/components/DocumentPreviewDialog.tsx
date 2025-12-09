import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, X } from "lucide-react";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string | null;
  title: string;
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  documentUrl,
  title,
}: DocumentPreviewDialogProps) {
  if (!documentUrl) return null;

  // Check if it's a base64 data URL or an external URL
  const isBase64 = documentUrl.startsWith("data:");

  const handleDownload = () => {
    if (!documentUrl) return;

    const link = document.createElement("a");
    link.href = documentUrl;
    link.download = `${title.replace(/\s+/g, "_")}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewTab = () => {
    if (!documentUrl) return;

    // For base64, create a blob and open it
    if (isBase64) {
      const byteString = atob(documentUrl.split(",")[1]);
      const mimeString = documentUrl.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } else {
      window.open(documentUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenNewTab}>
                <ExternalLink className="h-4 w-4 mr-1" />
                New Tab
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-4 max-h-[70vh] overflow-auto rounded-lg bg-muted/50 p-2">
          <img
            src={documentUrl}
            alt={title}
            className="w-full h-auto rounded-lg object-contain"
            style={{ maxHeight: "65vh" }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
