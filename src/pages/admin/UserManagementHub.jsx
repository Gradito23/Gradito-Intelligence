import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const SUB_PAGES = [
  {
    path: '/admin/users/list',
    title: 'Users',
    description: 'Invite users, list accounts, deactivate users, assign roles.',
  },
  {
    path: '/admin/users/roles',
    title: 'Roles',
    description: 'CRUD application roles. System roles (admin, user) are protected.',
  },
  {
    path: '/admin/users/permissions',
    title: 'Permissions',
    description: 'Editable matrix: role × resource × action.',
  },
];

export default function UserManagementHub() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-semibold text-navy flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
          <Badge variant="secondary">Coming Soon</Badge>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users, roles, and permissions — available in Phase 5
        </p>
      </div>
      <div className="grid gap-3">
        {SUB_PAGES.map(({ path, title, description }) => (
          <Link key={path} to={path}>
            <Card className="hover:bg-muted/30 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading flex items-center justify-between">
                  {title}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Badge variant="outline" className="text-xs">Phase 5</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
