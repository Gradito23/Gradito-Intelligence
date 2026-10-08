import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function IntegrationDocCard({
  icon: Icon,
  title,
  vendor,
  purpose,
  usedIn = [],
  status,
  configurePath,
  className,
}) {
  const isComingSoon = status === 'coming_soon';

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-gold shrink-0" />}
            {title}
          </CardTitle>
          {isComingSoon ? (
            <Badge variant="secondary" className="text-xs shrink-0">Coming soon</Badge>
          ) : (
            <Badge variant="default" className="text-xs shrink-0">Active</Badge>
          )}
        </div>
        {vendor && (
          <CardDescription className="text-xs uppercase tracking-wide">{vendor}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 text-sm">
        <div>
          <p className="text-xs font-medium text-foreground mb-1">Purpose</p>
          <p className="text-muted-foreground leading-relaxed">{purpose}</p>
        </div>
        {usedIn.length > 0 && (
          <div>
            <p className="text-xs font-medium text-foreground mb-1">Used in</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {usedIn.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {configurePath && !isComingSoon && (
          <div className="pt-2 mt-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
              <Link to={configurePath}>
                Configure
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
