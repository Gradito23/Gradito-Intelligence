import React, { useState } from 'react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { ConfigRepository } from '@/infrastructure/repositories/ConfigRepository';
import { useConfigAdmin, useInvalidateConfig } from '@/hooks/useConfig';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

function getDefaultValues(columns) {
  const values = {};
  for (const col of columns) {
    if (col.type === 'boolean') values[col.key] = col.default ?? true;
    else if (col.type === 'number') values[col.key] = col.default ?? '';
    else values[col.key] = col.default ?? '';
  }
  return values;
}

function formatCellValue(value, type) {
  if (value === null || value === undefined) return '—';
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'json') return typeof value === 'object' ? JSON.stringify(value) : String(value);
  return String(value);
}

function parseFieldValue(value, type) {
  if (type === 'boolean') return Boolean(value);
  if (type === 'number') {
    if (value === '' || value === null || value === undefined) return null;
    return Number(value);
  }
  if (type === 'json') {
    if (!value || value === '') return null;
    if (typeof value === 'object') return value;
    return JSON.parse(value);
  }
  return value === '' ? null : value;
}

function ConfigFormFields({ columns, values, onChange }) {
  return (
    <div className="space-y-4">
      {columns.map((col) => {
        if (col.key === 'active' && values.id) {
          return (
            <div key={col.key} className="flex items-center justify-between">
              <Label htmlFor={col.key}>{col.label}</Label>
              <Switch
                id={col.key}
                checked={Boolean(values[col.key])}
                onCheckedChange={(checked) => onChange(col.key, checked)}
              />
            </div>
          );
        }
        if (col.type === 'boolean') {
          return (
            <div key={col.key} className="flex items-center justify-between">
              <Label htmlFor={col.key}>{col.label}</Label>
              <Switch
                id={col.key}
                checked={Boolean(values[col.key])}
                onCheckedChange={(checked) => onChange(col.key, checked)}
              />
            </div>
          );
        }
        if (col.type === 'json') {
          const jsonVal = typeof values[col.key] === 'object'
            ? JSON.stringify(values[col.key], null, 2)
            : (values[col.key] ?? '');
          return (
            <div key={col.key} className="space-y-2">
              <Label htmlFor={col.key}>{col.label}</Label>
              <Textarea
                id={col.key}
                rows={4}
                value={jsonVal}
                onChange={(e) => onChange(col.key, e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          );
        }
        return (
          <div key={col.key} className="space-y-2">
            <Label htmlFor={col.key}>{col.label}{col.required ? ' *' : ''}</Label>
            <Input
              id={col.key}
              type={col.type === 'number' ? 'number' : 'text'}
              value={values[col.key] ?? ''}
              onChange={(e) => onChange(col.key, e.target.value)}
              required={col.required}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function ConfigCrudTable({ configType, label, columns }) {
  const { data: rows, isLoading, refetch } = useConfigAdmin(configType);
  const invalidateConfig = useInvalidateConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formValues, setFormValues] = useState(() => getDefaultValues(columns));

  const displayColumns = columns;

  const openCreate = () => {
    setEditing(null);
    setFormValues(getDefaultValues(columns));
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    const vals = {};
    for (const col of columns) {
      if (col.type === 'json' && row[col.key]) {
        vals[col.key] = typeof row[col.key] === 'object'
          ? JSON.stringify(row[col.key], null, 2)
          : row[col.key];
      } else {
        vals[col.key] = row[col.key] ?? (col.type === 'boolean' ? false : '');
      }
    }
    vals.id = row.id;
    setFormValues(vals);
    setDialogOpen(true);
  };

  const handleChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      for (const col of columns) {
        if (col.key === 'active' && !editing) payload[col.key] = true;
        else payload[col.key] = parseFieldValue(formValues[col.key], col.type);
      }

      if (editing) {
        await ConfigRepository.update(configType, editing.id, payload);
        toast({ title: 'Updated successfully' });
      } else {
        await ConfigRepository.create(configType, payload);
        toast({ title: 'Created successfully' });
      }

      invalidateConfig(configType);
      await refetch();
      setDialogOpen(false);
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (row) => {
    try {
      if (row.active) {
        await ConfigRepository.deactivate(configType, row.id);
        toast({ title: 'Deactivated' });
      } else {
        await ConfigRepository.activate(configType, row.id);
        toast({ title: 'Activated' });
      }
      invalidateConfig(configType);
      await refetch();
    } catch (err) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-navy">{label}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage picklist values used across the app
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {displayColumns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length + 2} className="text-center text-muted-foreground py-8">
                  No records yet
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className={!row.active ? 'opacity-60' : ''}>
                  {displayColumns.map((col) => (
                    <TableCell key={col.key} className="max-w-[200px] truncate">
                      {formatCellValue(row[col.key], col.type)}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Badge variant={row.active ? 'default' : 'secondary'}>
                      {row.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(row)}
                    >
                      {row.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${label}` : `Add ${label}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <ConfigFormFields columns={columns} values={formValues} onChange={handleChange} />
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Create'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
