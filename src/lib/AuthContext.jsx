import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { permissionKey } from '@/lib/permissionMeta';

const AuthContext = createContext();

function getIdentityFlags(identities) {
  const providers = (identities ?? []).map((i) => i.provider);
  const hasGoogle = providers.includes('google');
  const hasPassword = providers.includes('email');
  let loginMethodLabel = 'Email & Password';
  if (hasGoogle && hasPassword) loginMethodLabel = 'Google + Password';
  else if (hasGoogle) loginMethodLabel = 'Google only';
  return { hasGoogle, hasPassword, loginMethodLabel, identities: identities ?? [] };
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role_id, role, display_name, avatar_url, last_login_at, status')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchPermissions(roleId) {
  if (!roleId) return new Set();
  const { data, error } = await supabase
    .from('role_permissions')
    .select('resource, action')
    .eq('role_id', roleId);
  if (error) throw error;
  return new Set((data ?? []).map((p) => permissionKey(p.resource, p.action)));
}

async function activateInvitedUser(userId, profile) {
  if (profile?.status === 'invited') {
    await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', userId);
    return 'active';
  }
  return profile?.status ?? 'active';
}

async function buildAppUser(session) {
  if (!session?.user) return null;

  const { data: { user: authUser } } = await supabase.auth.getUser();
  const identities = authUser?.identities ?? session.user.identities ?? [];

  let profile = await fetchProfile(session.user.id);

  if (!profile) {
    await supabase.auth.signOut();
    throw new Error('Access denied. Your account must be invited by an administrator.');
  }

  if (profile.status === 'deactivated') {
    await supabase.auth.signOut();
    throw new Error('Your account has been deactivated. Contact an administrator.');
  }

  const status = await activateInvitedUser(session.user.id, profile);
  if (status !== profile.status) {
    profile = await fetchProfile(session.user.id);
  }

  const permissions = await fetchPermissions(profile?.role_id);
  const identityFlags = getIdentityFlags(identities);

  return {
    id: session.user.id,
    email: session.user.email,
    role_id: profile.role_id ?? null,
    role: profile.role ?? 'user',
    display_name: profile.display_name ?? null,
    avatar_url: profile.avatar_url ?? null,
    last_login_at: profile.last_login_at ?? null,
    status: profile.status ?? status,
    permissions,
    ...identityFlags,
  };
}

async function touchLastLogin(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) console.error('Failed to update last_login_at:', error.message);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const hasPermission = useCallback((resource, action) => {
    if (!user?.permissions) return false;
    return user.permissions.has(permissionKey(resource, action));
  }, [user]);

  const applySession = useCallback(async (session, { touchLogin = false } = {}) => {
    if (!session?.user) {
      setUser(null);
      setIsAuthenticated(false);
      return;
    }
    if (touchLogin) {
      await touchLastLogin(session.user.id);
    }
    try {
      const appUser = await buildAppUser(session);
      setUser(appUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      console.error('Failed to build app user:', error);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: 'auth_required',
        message: error.message || 'Authentication failed',
      });
    }
  }, []);

  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      await applySession(session);
    } catch (error) {
      console.error('User auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: 'auth_required',
        message: error.message || 'Authentication required',
      });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, [applySession]);

  const checkAppState = useCallback(async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      setAppPublicSettings({ id: 'gradito-intelligence' });
      setIsLoadingPublicSettings(false);
      await checkUserAuth();
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred',
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        return;
      }
      if (session) {
        await applySession(session, { touchLogin: event === 'SIGNED_IN' });
        setAuthChecked(true);
        setIsLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [applySession, checkAppState]);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await applySession(session);
    }
  }, [applySession]);

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?next=${next}`;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      refreshUser,
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
