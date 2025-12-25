# Admin Audit Trail - Database Setup

Run this SQL in your Supabase SQL Editor to enable admin audit trail.

```sql
-- ============================================================================
-- ADMIN AUDIT TRAIL
-- ============================================================================

CREATE TYPE IF NOT EXISTS audit_action AS ENUM (
  'ban',
  'unban',
  'timeout',
  'delete_content',
  'resolve_report',
  'assign_role',
  'approve_payout',
  'reject_payout'
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action audit_action NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_admin ON public.admin_audit_log(admin_id, created_at DESC);
CREATE INDEX idx_admin_audit_log_target ON public.admin_audit_log(target_user_id);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log(action);

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view audit log
CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles
      WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('admin', 'head_admin')
    )
  );

CREATE POLICY "Admins can insert audit entries"
  ON public.admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_roles
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
```

## Audit Actions Tracked

- **ban**: User permanently banned
- **unban**: User unbanned
- **timeout**: Temporary ban
- **delete_content**: Post/story/message deleted
- **resolve_report**: Report marked as resolved
- **assign_role**: Admin role assigned
- **approve_payout**: Payout request approved
- **reject_payout**: Payout request rejected

## Metadata Field

The `metadata` JSONB field stores additional context:
- Ban duration
- Content ID
- Report ID
- Role assigned
- Payout amount
