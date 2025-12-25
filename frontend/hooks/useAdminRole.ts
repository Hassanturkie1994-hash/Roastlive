import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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

const ROLE_HIERARCHY: Record<AdminRole & string, number> = {
  head_admin: 4,
  admin: 3,
  moderator: 2,
  support: 1,
};

const ROLE_PERMISSIONS: Record<AdminRole & string, AdminPermissions> = {
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
    canManageVIP: false,
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
    canDeleteContent: false,
    canViewReports: true,
    canResolveReports: false,
    canViewAnalytics: false,
    canManageVIP: false,
    canSendWarnings: false,
    canViewLogs: false,
  },
};

export function useAdminRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AdminRole>(null);
  const [permissions, setPermissions] = useState<AdminPermissions>({
    canManageAdmins: false,
    canBanUsers: false,
    canDeleteContent: false,
    canViewReports: false,
    canResolveReports: false,
    canViewAnalytics: false,
    canManageVIP: false,
    canSendWarnings: false,
    canViewLogs: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminRole();
  }, [user?.id]);

  const loadAdminRole = async () => {
    if (!user?.id) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setRole(null);
        setPermissions(ROLE_PERMISSIONS.support);
      } else {
        const adminRole = data.role as AdminRole;
        setRole(adminRole);
        setPermissions(ROLE_PERMISSIONS[adminRole] || ROLE_PERMISSIONS.support);
      }
    } catch (error) {
      console.error('Error loading admin role:', error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (requiredRole: AdminRole): boolean => {
    if (!role || !requiredRole) return false;
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
  };

  const isAdmin = (): boolean => {
    return role !== null;
  };

  return {
    role,
    permissions,
    loading,
    hasRole,
    isAdmin,
    refreshRole: loadAdminRole,
  };
}
