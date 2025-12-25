# Supabase Admin Roles Setup

Run this SQL script in your Supabase SQL Editor to enable admin role management.

```sql
-- Create admin_roles table if it doesn't exist
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON public.admin_roles(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_roles
CREATE POLICY "Admin roles are viewable by authenticated users"
  ON public.admin_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only head admins can manage admin roles"
  ON public.admin_roles FOR ALL
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
GRANT SELECT ON public.admin_roles TO authenticated;
GRANT ALL ON public.admin_roles TO service_role;

-- Insert a head admin role (replace 'YOUR_USER_ID' with your actual user ID from auth.users)
-- You can find your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';
-- INSERT INTO public.admin_roles (user_id, role, is_active)
-- VALUES ('YOUR_USER_ID', 'head_admin', true);
```

## Finding Your User ID

Run this query in Supabase SQL Editor to find your user ID:

```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

Then use that ID to create your head admin role.

## Grant Head Admin Role

```sql
-- Replace 'your-user-id-here' with your actual user ID
INSERT INTO public.admin_roles (user_id, role, is_active)
VALUES ('your-user-id-here', 'head_admin', true)
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
```
