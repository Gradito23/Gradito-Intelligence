import React from 'react';
import IntegrationCard from '@/components/admin/IntegrationCard';

export default function IntegrationCategorySection({ label, integrations, getStatusText }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            icon={integration.icon}
            title={integration.label}
            description={integration.description}
            status={integration.status}
            statusText={getStatusText?.(integration)}
            path={integration.path}
          />
        ))}
      </div>
    </section>
  );
}
