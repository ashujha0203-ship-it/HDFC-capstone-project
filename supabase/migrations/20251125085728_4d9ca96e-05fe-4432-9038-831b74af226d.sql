-- Add user_id column to customers table to link records to authenticated users
ALTER TABLE public.customers 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_customers_user_id ON public.customers(user_id);

-- Drop the existing permissive policies
DROP POLICY IF EXISTS "Anyone can check document existence" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customer" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customer" ON public.customers;

-- Create secure RLS policies that require authentication and ownership
CREATE POLICY "Users can view their own KYC records"
ON public.customers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own KYC records"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own KYC records"
ON public.customers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create profiles table for additional user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text,
  phone_number text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();