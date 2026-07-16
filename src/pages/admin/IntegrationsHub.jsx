import React from 'react';
import { Plug } from 'lucide-react';
import IntegrationCategorySection from '@/components/admin/IntegrationCategorySection';
import { useEmailIntegration } from '@/hooks/useEmailIntegration';
import { useOpenAIIntegration } from '@/hooks/useOpenAIIntegration';
import { INTEGRATION_CATEGORIES, getEmailIntegrationStatus, getGoogleSSOIntegrationStatus, getOpenAIIntegrationStatus } from '@/lib/integrationMeta';

export default function IntegrationsHub() {
  const { data: emailData } = useEmailIntegration();
  const { data: openaiData } = useOpenAIIntegration();

  const getStatusText = (integration) => {
    if (integration.id === 'email') {
      return getEmailIntegrationStatus(emailData);
    }
    if (integration.id === 'openai') {
      return getOpenAIIntegrationStatus(openaiData);
    }
    if (integration.id === 'google_sso') {
      return getGoogleSSOIntegrationStatus();
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-xl font-semibold text-navy flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Integrations
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect external services to Gradito Chef Intelligence
        </p>
      </div>

      {INTEGRATION_CATEGORIES.map((category) => (
        <IntegrationCategorySection
          key={category.id}
          label={category.label}
          integrations={category.integrations}
          getStatusText={getStatusText}
        />
      ))}
    </div>
  );
}
