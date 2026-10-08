import React, { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import IntegrationDocCard from '@/components/admin/IntegrationDocCard';
import { Badge } from '@/components/ui/badge';
import {
  INTEGRATION_DOC_CATEGORIES,
  INTEGRATIONS_DOC_CARDS,
} from '@/lib/integrationsDocMeta';
import { cn } from '@/lib/utils';

export default function IntegrationsDocument() {
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    if (category === 'all') return INTEGRATIONS_DOC_CARDS;
    return INTEGRATIONS_DOC_CARDS.filter((card) => card.category === category);
  }, [category]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h2 className="font-heading text-xl font-semibold text-navy flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Integrations Document
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Third-party services used by the platform and what each one is for.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {INTEGRATION_DOC_CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setCategory(id)}
            className={cn(
              'rounded-full transition-colors',
              category === id ? '' : 'opacity-80 hover:opacity-100',
            )}
          >
            <Badge
              variant={category === id ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1"
            >
              {label}
            </Badge>
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((card) => (
          <IntegrationDocCard
            key={card.id}
            icon={card.icon}
            title={card.title}
            vendor={card.vendor}
            purpose={card.purpose}
            usedIn={card.usedIn}
            status={card.status}
            configurePath={card.configurePath}
          />
        ))}
      </div>
    </div>
  );
}
