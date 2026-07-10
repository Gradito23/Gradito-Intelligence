import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Users } from 'lucide-react';
import { useUsersStats } from '@/hooks/useUsers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

function StatCard({ label, value }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-heading font-semibold text-navy mt-1">{value ?? '—'}</p>
      </CardContent>
    </Card>
  );
}

export default function UserManagementHub() {
  const { data: stats, isLoading } = useUsersStats();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-semibold text-navy flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users, roles, and permissions
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total users" value={isLoading ? '…' : stats?.total} />
        <StatCard label="Active" value={isLoading ? '…' : stats?.active} />
        <StatCard label="Invited" value={isLoading ? '…' : stats?.invited} />
        <StatCard label="Admins" value={isLoading ? '…' : stats?.admins} />
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
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
