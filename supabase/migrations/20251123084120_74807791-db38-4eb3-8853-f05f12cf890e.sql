-- Add progress tracking field to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS current_step text DEFAULT 'identity';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_document_number ON public.customers(document_number);
CREATE INDEX IF NOT EXISTS idx_customers_kyc_status ON public.customers(kyc_status);