import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ComingSoonPage({ title, description }) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/admin/users">
          <ArrowLeft className="h-4 w-4 mr-1" />
          User Management
        </Link>
      </Button>
      <div>
        <h2 className="font-heading text-xl font-semibold text-navy flex items-center gap-2">
          <Construction className="h-5 w-5" />
          {title}
          <Badge variant="secondary">Coming Soon</Badge>
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Under development</CardTitle>
          <CardDescription>
            This section will be implemented in Phase 5 with Resend email integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Check back after User Management is enabled.
        </CardContent>
      </Card>
    </div>
  );
}
