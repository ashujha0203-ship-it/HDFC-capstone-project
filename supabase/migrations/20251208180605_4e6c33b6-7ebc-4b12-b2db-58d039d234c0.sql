-- Create private storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents', 
  'kyc-documents', 
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
);

-- RLS policies for kyc-documents bucket
-- Users can upload to their own folder
CREATE POLICY "Users can upload KYC documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own documents
CREATE POLICY "Users can view own KYC documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own documents
CREATE POLICY "Users can update own KYC documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own documents
CREATE POLICY "Users can delete own KYC documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all KYC documents
CREATE POLICY "Admins can view all KYC documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Add address column constraint for length validation
ALTER TABLE public.customers 
ADD CONSTRAINT customers_address_length 
CHECK (admin_notes IS NULL OR length(admin_notes) <= 2000);

-- Create a function to validate and sanitize address before storage
CREATE OR REPLACE FUNCTION public.validate_customer_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sanitized_notes text;
BEGIN
  -- Validate admin_notes length (already constrained but double-check)
  IF NEW.admin_notes IS NOT NULL AND length(NEW.admin_notes) > 2000 THEN
    RAISE EXCEPTION 'Admin notes must be less than 2000 characters';
  END IF;
  
  -- Validate failure_reason length
  IF NEW.failure_reason IS NOT NULL AND length(NEW.failure_reason) > 1000 THEN
    RAISE EXCEPTION 'Failure reason must be less than 1000 characters';
  END IF;
  
  -- Basic sanitization - remove potential script tags (XSS prevention at DB level)
  IF NEW.admin_notes IS NOT NULL THEN
    NEW.admin_notes := regexp_replace(NEW.admin_notes, '<[^>]*>', '', 'gi');
  END IF;
  
  IF NEW.failure_reason IS NOT NULL THEN
    NEW.failure_reason := regexp_replace(NEW.failure_reason, '<[^>]*>', '', 'gi');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for validation
CREATE TRIGGER validate_customer_data_trigger
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.validate_customer_address();

-- Add an address column for storing validated address
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS address text;

-- Add constraint for address length
ALTER TABLE public.customers 
ADD CONSTRAINT customers_address_max_length 
CHECK (address IS NULL OR length(address) <= 500);