import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import GoogleIcon from '@/components/GoogleIcon';
import GoogleSSOSetupGuide from '@/components/admin/GoogleSSOSetupGuide';
import { Button } from '@/components/ui/button';

export default function GoogleSSOIntegration() {
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/admin/integrations">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Integrations
        </Link>
      </Button>

      <div>
        <h2 className="font-heading text-xl font-semibold text-navy flex items-center gap-2">
          <GoogleIcon className="h-5 w-5" />
          Google SSO
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Google Cloud and Supabase setup for sign-in
        </p>
      </div>

      <GoogleSSOSetupGuide />
    </div>
  );
}
