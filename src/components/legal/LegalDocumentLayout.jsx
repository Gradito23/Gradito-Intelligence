import React from 'react';
import { useNavigate } from 'react-router-dom';
import GraditoLogo from '@/components/brand/GraditoLogo';
import { Button } from '@/components/ui/button';
import { CONTRACTOR_LEGAL_EFFECTIVE_LABEL } from '@/lib/contractorLegal';
import { ArrowLeft } from 'lucide-react';

export default function LegalDocumentLayout({ title, children }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/intake');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <div className="mb-8">
          <GraditoLogo className="h-8 w-auto text-navy" title="Gradito" />
        </div>

        <header className="mb-8 space-y-2">
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{CONTRACTOR_LEGAL_EFFECTIVE_LABEL}</p>
        </header>

        <div className="prose prose-sm sm:prose-base max-w-none text-foreground space-y-6">
          {children}
        </div>

        <footer className="mt-12 pt-6 border-t border-border">
          <Button type="button" variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Button>
        </footer>
      </div>
    </div>
  );
}
