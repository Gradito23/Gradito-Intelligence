import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePerfectVenueExchangeCode } from '@/hooks/usePerfectVenueIntegration';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { getDefaultLandingPath } from '@/lib/permissionMeta';

function CenteredShell({ children }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 px-4 bg-background">
      {children}
    </div>
  );
}

function CallbackBody() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exchangeMutation = usePerfectVenueExchangeCode();
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const oauthError = searchParams.get('error_description') || searchParams.get('error');
    if (oauthError) {
      setError(oauthError);
      toast({ title: 'Authorization failed', description: oauthError, variant: 'destructive' });
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code || !state) {
      setError('Missing authorization code');
      return;
    }

    exchangeMutation.mutateAsync({ code, state })
      .then(() => {
        toast({ title: 'Perfect Venue connected' });
        navigate('/admin/integrations/perfect-venue', { replace: true });
      })
      .catch((err) => {
        setError(err.message);
        toast({ title: 'Connection failed', description: err.message, variant: 'destructive' });
      });
  }, [searchParams, navigate, exchangeMutation]);

  if (error) {
    return (
      <CenteredShell>
        <p className="text-destructive text-sm text-center max-w-md">{error}</p>
        <Link to="/admin/integrations/perfect-venue" className="text-sm text-navy underline">
          Back to Perfect Venue settings
        </Link>
      </CenteredShell>
    );
  }

  return (
    <CenteredShell>
      <Loader2 className="h-8 w-8 animate-spin text-navy" />
      <p className="text-sm text-muted-foreground">Completing Perfect Venue connection…</p>
    </CenteredShell>
  );
}

export default function PerfectVenueOAuthCallback() {
  const { user, isAuthenticated, isLoadingAuth, authChecked, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoadingAuth || !authChecked) {
    return (
      <CenteredShell>
        <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </CenteredShell>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  if (user?.needsPasswordSetup) {
    return <Navigate to="/accept-invite" replace />;
  }

  if (!hasPermission('admin_panel', 'access')) {
    return (
      <CenteredShell>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Admin access is required to connect Perfect Venue.
        </p>
        <Link to={getDefaultLandingPath(hasPermission)} className="text-sm text-navy underline">
          Back to app
        </Link>
      </CenteredShell>
    );
  }

  return <CallbackBody />;
}
