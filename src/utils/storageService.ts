import { supabase } from "@/integrations/supabase/client";

const BUCKET_NAME = "kyc-documents";

/**
 * Converts a base64 data URL to a Blob
 */
const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

/**
 * Uploads a document image to Supabase Storage
 * @param dataUrl - The base64 data URL of the image
 * @param userId - The user's ID
 * @param documentType - Type of document (identity, address, face)
 * @returns The storage path of the uploaded file
 */
export const uploadDocument = async (
  dataUrl: string,
  userId: string,
  documentType: "identity" | "address" | "face"
): Promise<string> => {
  const blob = dataUrlToBlob(dataUrl);
  const fileName = `${userId}/${documentType}_${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload ${documentType} document: ${error.message}`);
  }

  return fileName;
};

/**
 * Gets a signed URL for a document (valid for 1 hour)
 * @param storagePath - The storage path of the document
 * @returns A signed URL for the document
 */
export const getSignedDocumentUrl = async (
  storagePath: string
): Promise<string | null> => {
  if (!storagePath) return null;
  
  // If it's already a data URL (legacy), return as-is
  if (storagePath.startsWith("data:")) {
    return storagePath;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error) {
    // Log to server would happen here in production
    return null;
  }

  return data.signedUrl;
};

/**
 * Gets signed URLs for multiple documents
 * @param paths - Object with document paths
 * @returns Object with signed URLs
 */
export const getSignedDocumentUrls = async (paths: {
  identity?: string | null;
  address?: string | null;
  face?: string | null;
}): Promise<{
  identity: string | null;
  address: string | null;
  face: string | null;
}> => {
  const [identity, address, face] = await Promise.all([
    paths.identity ? getSignedDocumentUrl(paths.identity) : null,
    paths.address ? getSignedDocumentUrl(paths.address) : null,
    paths.face ? getSignedDocumentUrl(paths.face) : null,
  ]);

  return { identity, address, face };
};

/**
 * Deletes a document from storage
 * @param storagePath - The storage path of the document
 */
export const deleteDocument = async (storagePath: string): Promise<void> => {
  if (!storagePath || storagePath.startsWith("data:")) return;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
};
