import React, { useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Plus, Server } from 'lucide-react';
import {
  useDeleteCustomSmtp,
  useEmailIntegration,
  useSetActiveCustomSmtp,
} from '@/hooks/useEmailIntegration';
import CustomSmtpForm from '@/components/admin/CustomSmtpForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';

function inferProviderLabel(host) {
  if (!host) return 'smtp';
  if (host.includes('gmail')) return 'gmail';
  return host.split('.')[0] || 'smtp';
}

function statusBadge(config) {
  if (config.is_active) {
    return <Badge>Active</Badge>;
  }
  if (config.last_test_status === 'success') {
    return <Badge variant="secondary">Tested</Badge>;
  }
  if (config.last_test_status === 'failed') {
    return <Badge variant="destructive">Failed</Badge>;
  }
  return <Badge variant="outline">Untested</Badge>;
}

export default function CustomSmtpSection() {
  const { data, isLoading, isError, error } = useEmailIntegration();
  const setActiveMutation = useSetActiveCustomSmtp();
  const deleteMutation = useDeleteCustomSmtp();

  const [formOpen, setFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activeProvider = data?.active_provider ?? 'resend';
  const configs = data?.custom_smtp_configs ?? [];
  const activeCustom = data?.active_custom_smtp;
  const isActive = activeProvider === 'custom_smtp';

  const openAdd = () => {
    setEditingConfig(null);
    setFormOpen(true);
  };

  const openEdit = (config) => {
    setEditingConfig(config);
    setFormOpen(true);
  };

  const handleSetActive = async (id) => {
    try {
      await setActiveMutation.mutateAsync(id);
      toast({ title: 'Active SMTP config updated' });
    } catch (err) {
      toast({
        title: 'Could not set active',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await deleteMutation.mutateAsync(deleteTarget.id);
      if (result?.warning) {
        toast({ title: 'Configuration deleted', description: result.warning });
      } else {
        toast({ title: 'Configuration deleted' });
      }
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const deleteDescription = () => {
    if (!deleteTarget) return '';
    const isOnly = configs.length === 1;
    const isActiveConfig = deleteTarget.is_active;
    if (isOnly && isActiveConfig && isActive) {
      return 'This is your only Custom SMTP config and it is active. Deleting it will switch the active email provider back to Resend.';
    }
    if (isActiveConfig && !isOnly) {
      return 'This config is active. Another tested configuration will become active automatically.';
    }
    return 'This configuration will be permanently removed.';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-destructive">
          Failed to load Custom SMTP: {error?.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={!isActive ? 'opacity-75' : undefined}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Server className="h-5 w-5 text-gold" />
                Custom SMTP
              </CardTitle>
              <CardDescription className="mt-1">
                Multiple saved configs (Gmail, etc.). Used when Custom SMTP is the active provider.
              </CardDescription>
            </div>
            {!isActive && <Badge variant="outline">Inactive</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeCustom && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Active configuration
              </p>
              <p>
                From: <strong>{activeCustom.from_name || 'Gradito'}</strong> &lt;{activeCustom.from_email}&gt;
              </p>
              <p className="text-muted-foreground">
                via {activeCustom.smtp_host}:{activeCustom.smtp_port} ({activeCustom.encryption.toUpperCase()})
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Saved SMTP configurations</p>
            <Button type="button" size="sm" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add New SMTP
            </Button>
          </div>

          {configs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
              No SMTP configurations yet. Add one to use Custom SMTP.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last tested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium capitalize">
                        {inferProviderLabel(config.smtp_host)}
                      </TableCell>
                      <TableCell>{config.from_email}</TableCell>
                      <TableCell>{statusBadge(config)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {config.last_tested_at
                          ? format(new Date(config.last_tested_at), 'PP')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end flex-wrap gap-1">
                          {!config.is_active && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={setActiveMutation.isPending}
                              onClick={() => handleSetActive(config.id)}
                            >
                              Set Active
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(config)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(config)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomSmtpForm
        open={formOpen}
        onOpenChange={setFormOpen}
        config={editingConfig}
        onSaved={() => setEditingConfig(null)}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SMTP configuration?</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
