import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import EmailProviderSelector from '@/components/admin/EmailProviderSelector';
import ResendEmailCard from '@/components/admin/ResendEmailCard';
import CustomSmtpSection from '@/components/admin/CustomSmtpSection';
import EmailAnalyticsCard from '@/components/admin/EmailAnalyticsCard';
import { useEmailIntegration } from '@/hooks/useEmailIntegration';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

export default function EmailIntegration() {
  const { data } = useEmailIntegration();
  const activeProvider = data?.active_provider ?? 'resend';
  const hasCustomConfigs = (data?.custom_smtp_configs?.length ?? 0) > 0;

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
          <Mail className="h-5 w-5" />
          Email
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Resend API or Custom SMTP — one active provider at a time
        </p>
      </div>

      <EmailProviderSelector />

      {activeProvider === 'resend' ? (
        <>
          <ResendEmailCard />
          {hasCustomConfigs && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="custom-smtp" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  Custom SMTP configurations
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <CustomSmtpSection />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          {!hasCustomConfigs && <CustomSmtpSection />}
        </>
      ) : (
        <>
          <CustomSmtpSection />
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="resend" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                Resend API settings
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <ResendEmailCard />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}

      <EmailAnalyticsCard />
    </div>
  );
}
