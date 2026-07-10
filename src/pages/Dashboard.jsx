import React from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Calendar, BarChart3, Settings, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const QUICK_LINKS = [
  { path: '/', label: 'Chefs', description: 'Roster and chef profiles', icon: ChefHat },
  { path: '/events', label: 'Events', description: 'Events and assignments', icon: Calendar },
  { path: '/reports', label: 'Reports', description: 'Analytics and insights', icon: BarChart3 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const displayName = user?.display_name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">
          Welcome back, {displayName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Your Gradito Chef Intelligence home
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map(({ path, label, description, icon: Icon }) => (
          <Link key={path} to={path}>
            <Card className="hover:bg-muted/30 transition-colors h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <Icon className="h-5 w-5 text-gold" />
                  {label}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <span className="text-sm text-primary font-medium inline-flex items-center gap-1">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {isAdmin && (
        <Card className="border-gold/20 bg-gold/5">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Settings className="h-5 w-5 text-gold" />
              Admin Panel
            </CardTitle>
            <CardDescription>
              System configuration, reference data, and platform operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/admin">Go to Admin Panel</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
