import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePerfectVenueExchangeCode } from '@/hooks/usePerfectVenueIntegration';
import { toast } from '@/components/ui/use-toast';
import AdminRoute from '@/components/AdminRoute';

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
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 px-4 text-center">
        <p className="text-destructive text-sm">{error}</p>
        <a href="/admin/integrations/perfect-venue" className="text-sm text-navy underline">
          Back to Perfect Venue settings
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-navy" />
      <p className="text-sm text-muted-foreground">Completing Perfect Venue connection…</p>
    </div>
  );
}

export default function PerfectVenueOAuthCallback() {
  return (
    <AdminRoute>
      <CallbackBody />
    </AdminRoute>
  );
}
