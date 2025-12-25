# Helper Functions for Admin Roles

Run this SQL in Supabase to add helper functions for managing admin roles.

```sql
-- ============================================================================
-- HELPER FUNCTIONS FOR ADMIN ROLE MANAGEMENT
-- ============================================================================

-- Function to assign admin role
CREATE OR REPLACE FUNCTION public.assign_admin_role(
  target_email TEXT,
  role_name TEXT
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;

  -- Check if user exists
  IF target_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not found'::TEXT;
    RETURN;
  END IF;

  -- Insert or update role
  INSERT INTO public.admin_roles (user_id, role, is_active)
  VALUES (target_user_id, role_name, true)
  ON CONFLICT (user_id, role)
  DO UPDATE SET is_active = true, assigned_at = now();

  RETURN QUERY SELECT true, 'Role assigned successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(
  check_user_id UUID,
  required_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  IF required_role IS NULL THEN
    -- Check if user has any admin role
    RETURN EXISTS (
      SELECT 1 FROM public.admin_roles
      WHERE user_id = check_user_id
      AND is_active = true
    );
  ELSE
    -- Check for specific role
    RETURN EXISTS (
      SELECT 1 FROM public.admin_roles
      WHERE user_id = check_user_id
      AND role = required_role
      AND is_active = true
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.assign_admin_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_role TO authenticated;
```

## Usage Examples

### Assign Roles Using Function

```sql
-- Assign head admin
SELECT * FROM public.assign_admin_role('hassan.turkie1994@hotmail.com', 'head_admin');

-- Assign admin
SELECT * FROM public.assign_admin_role('user@example.com', 'admin');

-- Assign moderator
SELECT * FROM public.assign_admin_role('mod@example.com', 'moderator');

-- Assign support
SELECT * FROM public.assign_admin_role('support@example.com', 'support');
```

### Check Roles

```sql
-- Check if user has any admin role
SELECT public.has_admin_role(
  (SELECT id FROM auth.users WHERE email = 'hassan.turkie1994@hotmail.com'),
  NULL
);

-- Check for specific role
SELECT public.has_admin_role(
  (SELECT id FROM auth.users WHERE email = 'hassan.turkie1994@hotmail.com'),
  'head_admin'
);
```
