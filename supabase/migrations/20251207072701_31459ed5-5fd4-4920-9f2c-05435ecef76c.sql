-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table (separate from profiles to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create admin_invite_codes table for admin registration
CREATE TABLE public.admin_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  is_active boolean DEFAULT true
);

-- Enable RLS on admin_invite_codes
ALTER TABLE public.admin_invite_codes ENABLE ROW LEVEL SECURITY;

-- Add admin_notes column to customers table for admin remarks
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

-- Security definer function to check user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for admin_invite_codes
CREATE POLICY "Admins can manage invite codes"
ON public.admin_invite_codes
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can check valid invite codes"
ON public.admin_invite_codes
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()) AND used_by IS NULL);

-- Update customers RLS to allow admins to view and update all records
CREATE POLICY "Admins can view all KYC records"
ON public.customers
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all KYC records"
ON public.customers
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Insert a default admin invite code (for initial setup)
INSERT INTO public.admin_invite_codes (code, expires_at)
VALUES ('ADMIN2024SECURE', now() + interval '30 days');