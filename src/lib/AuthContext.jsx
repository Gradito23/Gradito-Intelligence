import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, display_name, avatar_url, last_login_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function buildAppUser(session) {
  if (!session?.user) return null;
  const profile = await fetchProfile(session.user.id);
  return {
    id: session.user.id,
    email: session.user.email,
    role: profile?.role ?? 'user',
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
    last_login_at: profile?.last_login_at ?? null,
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

  const applySession = useCallback(async (session, { touchLogin = false } = {}) => {
    if (!session?.user) {
      setUser(null);
      setIsAuthenticated(false);
      return;
    }
    if (touchLogin) {
      await touchLastLogin(session.user.id);
    }
    const appUser = await buildAppUser(session);
    setUser(appUser);
    setIsAuthenticated(true);
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
      const touchLogin = event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED';
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
