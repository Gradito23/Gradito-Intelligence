import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function IntegrationCard({
  icon: Icon,
  title,
  description,
  status,
  statusText,
  path,
  className,
}) {
  const isComingSoon = status === 'coming_soon';
  const isDisabled = isComingSoon || !path;

  const content = (
    <Card
      className={cn(
        'h-full transition-colors',
        !isDisabled && 'hover:bg-muted/30 cursor-pointer',
        isDisabled && 'opacity-70',
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-gold shrink-0" />}
            {title}
          </span>
          {!isDisabled && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex flex-wrap items-center gap-2">
        {isComingSoon ? (
          <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
        ) : (
          <Badge variant={status === 'active' ? 'default' : 'outline'} className="text-xs">
            {statusText || 'Active'}
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  if (isDisabled) {
    return <div className="h-full">{content}</div>;
  }

  return (
    <Link to={path} className="block h-full">
      {content}
    </Link>
  );
}
