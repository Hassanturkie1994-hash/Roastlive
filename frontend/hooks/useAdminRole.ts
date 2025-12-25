// hooks/useAdminRole.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/* =======================
   Types
======================= */

export type AdminRole = 'head_admin' | 'admin' | 'moderator' | 'support' | null;

export interface AdminPermissions {
  canManageAdmins: boolean;
  canBanUsers: boolean;
  canDeleteContent: boolean;
  canViewReports: boolean;
  canResolveReports: boolean;
  canViewAnalytics: boolean;
  canManageVIP: boolean;
  canSendWarnings: boolean;
  canViewLogs: boolean;
}

/* =======================
   Role hierarchy
======================= */

const ROLE_HIERARCHY: Record<Exclude<AdminRole, null>, number> = {
  head_admin: 4,
  admin: 3,
  moderator: 2,
  support: 1,
};

/* =======================
   Permissions per role
======================= */

const ROLE_PERMISSIONS: Record<Exclude<AdminRole, null>, AdminPermissions> = {
  head_admin: {
    canManageAdmins: true,
    canBanUsers: true,
    canDeleteContent: true,
    canViewReports: true,
    canResolveReports: true,
    canViewAnalytics: true,
    canManageVIP: true,
    canSendWarnings: true,
    canViewLogs: true,
  },
  admin: {
    canManageAdmins: false,
    canBanUsers: true,
    canDeleteContent: true,
    canViewReports: true,
    canResolveReports: true,
    canViewAnalytics: true,
    canManageVIP: true,
    canSendWarnings: true,
    canViewLogs: true,
  },
  moderator: {
    canManageAdmins: false,
    canBanUsers: false,
    canDeleteContent: true,
    canViewReports: true,
    canResolveReports: true,
    canViewAnalytics: false,
    canManageVIP: false,
    canSendWarnings: true,
    canViewLogs: false,
  },
  support: {
    canManageAdmins: false,
    canBanUsers: false,
    canDeleteContent: true,
    canViewReports: true,
    canResolveReports: true,
    canViewAnalytics: false,
    canManageVIP: false,
    canSendWarnings: true,
    canViewLogs: false,
  },
};

const EMPTY_PERMISSIONS: AdminPermissions = {
  canManageAdmins: false,
  canBanUsers: false,
  canDeleteContent: false,
  canViewReports: false,
  canResolveReports: false,
  canViewAnalytics: false,
  canManageVIP: false,
  canSendWarnings: false,
  canViewLogs: false,
};

/* =======================
   Hook
======================= */

export function useAdminRole() {
  const { user } = useAuth();

  const [role, setRole] = useState<AdminRole>(null);
  const [permissions, setPermissions] = useState<AdminPermissions>(EMPTY_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  /* =======================
     Fetch role from DB
     (source of truth)
  ======================= */

  const fetchRole = useCallback(async () => {
    if (!user?.id) {
      setRole(null);
      setPermissions(EMPTY_PERMISSIONS);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Query admin_roles table directly
      const { data, error } = await supabase
        .from('admin_roles')
        .select('role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();  // Use maybeSingle to avoid error if no role

      if (error) {
        console.log('Error fetching role:', error.message);
        setRole(null);
        setPermissions(EMPTY_PERMISSIONS);
      } else if (!data) {
        // No admin role found
        console.log('No admin role for user');
        setRole(null);
        setPermissions(EMPTY_PERMISSIONS);
      } else {
        const adminRole = data.role as AdminRole;
        console.log('✅ Admin role loaded:', adminRole);
        setRole(adminRole);
        setPermissions(ROLE_PERMISSIONS[adminRole]);
      }
    } catch (err) {
      console.error('Exception loading admin role:', err);
      setRole(null);
      setPermissions(EMPTY_PERMISSIONS);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /* =======================
     Fetch on login / change
  ======================= */

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  /* =======================
     Realtime updates
  ======================= */

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`admin-role-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_roles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchRole();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchRole]);

  /* =======================
     Helpers
  ======================= */

  const hasRole = (requiredRole: Exclude<AdminRole, null>): boolean => {
    if (!role) return false;
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
  };

  const isAdmin = (): boolean => role !== null;

  /* =======================
     Public API
  ======================= */

  return {
    role,
    permissions,
    loading,
    isAdmin,
    hasRole,
    refreshRole: fetchRole,
  };
}
