# Assign Head Admin Role to hassan.turkie1994@hotmail.com

## Step 1: Find User ID

Run this query in Supabase SQL Editor:

```sql
-- Find the user ID for hassan.turkie1994@hotmail.com
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'hassan.turkie1994@hotmail.com';
```

## Step 2: Assign Head Admin Role

After getting the user ID from Step 1, run this (replace `USER_ID_HERE` with actual ID):

```sql
-- First, make sure admin_roles table exists
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('head_admin', 'admin', 'moderator', 'support')),
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON public.admin_roles(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin roles are viewable by authenticated users" ON public.admin_roles;
DROP POLICY IF EXISTS "Only head admins can manage admin roles" ON public.admin_roles;

-- Create RLS policies
CREATE POLICY "Admin roles are viewable by authenticated users"
  ON public.admin_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert first head admin"
  ON public.admin_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if no head admin exists yet, or if user is already a head admin
    NOT EXISTS (SELECT 1 FROM public.admin_roles WHERE role = 'head_admin' AND is_active = true)
    OR
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role = 'head_admin'
      AND ar.is_active = true
    )
  );

CREATE POLICY "Head admins can update roles"
  ON public.admin_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = auth.uid()
      AND ar.role = 'head_admin'
      AND ar.is_active = true
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.admin_roles TO authenticated;
GRANT ALL ON public.admin_roles TO service_role;

-- Now assign head admin role (replace USER_ID_HERE with the ID from Step 1)
-- Example: INSERT INTO public.admin_roles (user_id, role, is_active)
-- VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'head_admin', true)
-- ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
```

## Step 3: Quick Assignment (One Command)

If you have the email, use this single query:

```sql
-- Assign head admin role directly by email
INSERT INTO public.admin_roles (user_id, role, is_active)
SELECT id, 'head_admin', true
FROM auth.users
WHERE email = 'hassan.turkie1994@hotmail.com'
ON CONFLICT (user_id, role) 
DO UPDATE SET is_active = true, assigned_at = now();
```

## Verify Assignment

```sql
-- Check if role was assigned
SELECT 
  ar.role,
  ar.is_active,
  ar.created_at,
  u.email
FROM public.admin_roles ar
JOIN auth.users u ON u.id = ar.user_id
WHERE u.email = 'hassan.turkie1994@hotmail.com';
```

## Additional Admin Role Management

```sql
-- Assign Admin role to someone
INSERT INTO public.admin_roles (user_id, role, is_active)
SELECT id, 'admin', true
FROM auth.users
WHERE email = 'user@example.com'
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;

-- Assign Moderator role
INSERT INTO public.admin_roles (user_id, role, is_active)
SELECT id, 'moderator', true
FROM auth.users
WHERE email = 'mod@example.com'
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;

-- Assign Support role
INSERT INTO public.admin_roles (user_id, role, is_active)
SELECT id, 'support', true
FROM auth.users
WHERE email = 'support@example.com'
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;

-- Revoke role (deactivate)
UPDATE public.admin_roles
SET is_active = false
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com')
AND role = 'moderator';
```
