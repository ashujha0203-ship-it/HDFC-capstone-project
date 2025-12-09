-- Fix security: Change admin_invite_codes policy to only allow checking specific codes, not full table scan
DROP POLICY IF EXISTS "Anyone can check valid invite codes" ON public.admin_invite_codes;

-- Create a secure function to validate invite codes without exposing all codes
CREATE OR REPLACE FUNCTION public.validate_invite_code(code_to_check text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_invite_codes
    WHERE code = code_to_check
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND used_by IS NULL
  )
$$;

-- Create function to use invite code (marks it as used)
CREATE OR REPLACE FUNCTION public.use_invite_code(code_to_use text, user_id_to_assign uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admin_invite_codes
  SET used_by = user_id_to_assign,
      used_at = now(),
      is_active = false
  WHERE code = code_to_use
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND used_by IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Ensure user_roles table has proper restrictions - remove any UPDATE/DELETE capabilities for users
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

-- Only allow role insertion through the secure function, not directly by users
CREATE POLICY "Only authenticated users can insert their own initial role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'user'::app_role
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid())
);

-- Admins can manage all roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to safely assign admin role (requires valid invite code)
CREATE OR REPLACE FUNCTION public.assign_admin_role(user_id_to_assign uuid, invite_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate the invite code first
  IF NOT validate_invite_code(invite_code) THEN
    RETURN false;
  END IF;
  
  -- Mark the invite code as used
  PERFORM use_invite_code(invite_code, user_id_to_assign);
  
  -- Remove any existing role for this user
  DELETE FROM public.user_roles WHERE user_id = user_id_to_assign;
  
  -- Insert admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id_to_assign, 'admin'::app_role);
  
  RETURN true;
END;
$$;