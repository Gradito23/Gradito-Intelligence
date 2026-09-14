import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import GraditoLogo from '@/components/brand/GraditoLogo';

export default function GuideRedirect() {
  const { token } = useParams();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function openGuide() {
      if (!token) {
        setError('This guide link is incomplete.');
        return;
      }
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('onboarding-guide-email', {
          method: 'POST',
          body: { action: 'click', token },
        });
        if (cancelled) return;
        const url = data?.url;
        if (invokeError || !url) {
          setError('This guide link is invalid or has expired.');
          return;
        }
        window.location.replace(url);
      } catch {
        if (!cancelled) setError('This guide link is invalid or has expired.');
      }
    }

    openGuide();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center text-navy">
          <GraditoLogo className="h-9 w-auto" title="Gradito" />
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-navy" />
            <p className="text-sm text-muted-foreground">Opening the Onboarding Guide…</p>
          </>
        )}
      </div>
    </div>
  );
}
