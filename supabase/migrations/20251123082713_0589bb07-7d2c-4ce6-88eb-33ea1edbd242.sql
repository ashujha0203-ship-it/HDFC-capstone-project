-- Create customers table for document number verification
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number TEXT UNIQUE NOT NULL,
  kyc_status TEXT DEFAULT 'pending',
  kyc_completed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  identity_document_type TEXT,
  identity_document_url TEXT,
  address_document_type TEXT,
  address_document_url TEXT,
  face_video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can check if document exists (for initial verification)
CREATE POLICY "Anyone can check document existence"
ON public.customers
FOR SELECT
USING (true);

-- Policy: Anyone can insert new customer records
CREATE POLICY "Anyone can insert customer"
ON public.customers
FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can update customer records
CREATE POLICY "Anyone can update customer"
ON public.customers
FOR UPDATE
USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();