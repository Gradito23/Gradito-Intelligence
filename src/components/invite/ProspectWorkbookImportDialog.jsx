import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { buildProspectImportPreview, importRowHasContact } from '@/lib/chefInviteProspectImport';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All rows' },
  { value: 'importable', label: 'Importable only' },
  { value: 'ok', label: 'Ok' },
  { value: 'warning', label: 'Warnings' },
  { value: 'error', label: 'Errors only' },
];

function levelBadgeClass(level) {
  if (level === 'error') return 'border-red-300 text-red-900 bg-red-50';
  if (level === 'warning') return 'border-amber-300 text-amber-900 bg-amber-50';
  return 'border-emerald-300 text-emerald-900 bg-emerald-50';
}

function rowMatchesSheet(row, sheetFilter) {
  if (!sheetFilter || sheetFilter === 'all') return true;
  return row.sourceSheets?.includes(sheetFilter);
}

function rowMatchesStatus(row, statusFilter) {
  if (!statusFilter || statusFilter === 'all') return true;
  if (statusFilter === 'importable') return row.importable;
  return row.level === statusFilter;
}

function rowLevelClass(level) {
  if (level === 'error') return 'bg-red-50/60 dark:bg-red-950/20';
  if (level === 'warning') return 'bg-amber-50/50 dark:bg-amber-950/15';
  return '';
}

function emptyFilterMessage(statusFilter) {
  if (statusFilter === 'error') return 'No error rows for this filter.';
  if (statusFilter === 'warning') return 'No warning rows for this filter.';
  return 'No rows for this filter.';
}

export default function ProspectWorkbookImportDialog({
  open,
  onClose,
  chefs,
  prospects,
  onImported,
}) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [sheetFilter, setSheetFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);

  const sheetOptions = useMemo(() => {
    if (!preview?.sheetResults) return [];
    return preview.sheetResults.map((s) => s.sheetName);
  }, [preview]);

  const totalRowCount = preview?.rows?.length ?? 0;

  const visibleRows = useMemo(() => {
    if (!preview?.rows) return [];
    return preview.rows.filter(
      (r) => rowMatchesSheet(r, sheetFilter) && rowMatchesStatus(r, statusFilter),
    );
  }, [preview, sheetFilter, statusFilter]);

  const filtersActive = sheetFilter !== 'all' || statusFilter !== 'all';

  const resetState = () => {
    setPreview(null);
    setSheetFilter('all');
    setStatusFilter('all');
    setSelectedKeys(new Set());
  };

  const handleOpenChange = (v) => {
    if (!v) {
      resetState();
      onClose();
    }
  };

  const handleStatusFilterChange = (next) => {
    setStatusFilter((prev) => (prev === next ? 'all' : next));
  };

  const handleFile = (file) => {
    if (!file) return;
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const built = buildProspectImportPreview(wb, chefs, prospects);
        setPreview(built);
        const defaultSelected = new Set(
          built.rows.filter((r) => r.importable).map((r) => r.key),
        );
        setSelectedKeys(defaultSelected);
        setSheetFilter('all');
        setStatusFilter('all');
      } catch (err) {
        toast({
          title: 'Could not read file',
          description: err.message,
          variant: 'destructive',
        });
        resetState();
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setParsing(false);
      toast({ title: 'Could not read file', variant: 'destructive' });
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleKey = (key, checked, importable) => {
    if (!importable) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleAllVisible = (checked) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const importable = visibleRows.filter((r) => r.importable);
      if (checked) {
        importable.forEach((r) => next.add(r.key));
      } else {
        importable.forEach((r) => next.delete(r.key));
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (!preview) return;
    const targets = preview.rows.filter((r) => selectedKeys.has(r.key) && r.importable);
    if (!targets.length) {
      toast({ title: 'No rows selected', variant: 'destructive' });
      return;
    }
    setImporting(true);
    let created = 0;
    let updated = 0;
    const failures = [];
    for (const row of targets) {
      const label = `${row.first_name}${row.last_name ? ` ${row.last_name}` : ''}`.trim();
      if (!importRowHasContact(row)) {
        failures.push(`${label} (Email or phone required)`);
        continue;
      }
      const payload = {
        first_name: row.first_name.trim(),
        last_name: row.last_name?.trim() || '',
        email: row.email?.trim() || undefined,
        mobile: row.mobile?.trim() || undefined,
        city: row.city?.trim() || undefined,
      };
      try {
        if (row.existingProspectId) {
          await base44.entities.ChefInviteProspect.update(row.existingProspectId, payload);
          updated += 1;
        } else {
          await base44.entities.ChefInviteProspect.create({
            ...payload,
            status: 'not_invited',
            gradito_messaging_opt_in: true,
          });
          created += 1;
        }
      } catch (err) {
        const msg = /duplicate|unique/i.test(String(err.message))
          ? 'Duplicate email in database'
          : err.message;
        failures.push(`${label} (${msg})`);
      }
    }
    setImporting(false);
    onImported();
    resetState();
    onClose();
    const skippedErrors = preview.counts.error ?? 0;
    const parts = [];
    if (created) parts.push(`${created} new`);
    if (updated) parts.push(`${updated} updated`);
    let description = parts.length
      ? `${parts.join(' · ')} prospect${created + updated === 1 ? '' : 's'}.`
      : 'No prospects changed.';
    if (skippedErrors) description += ` ${skippedErrors} row(s) had errors and were not imported.`;
    if (failures.length) {
      description += ` ${failures.length} failed: ${failures.slice(0, 3).join('; ')}`;
      if (failures.length > 3) description += '…';
    }
    toast({
      title: 'Import finished',
      description,
      variant: failures.length ? 'destructive' : 'default',
    });
  };

  const importableVisible = visibleRows.filter((r) => r.importable);
  const allVisibleSelected = importableVisible.length > 0
    && importableVisible.every((r) => selectedKeys.has(r.key));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading">Import prospects from Excel</DialogTitle>
        </DialogHeader>

        {!preview && (
          <div className="space-y-4 py-2">
            <div
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-gold transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              {parsing ? (
                <Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              )}
              <p className="font-medium mt-3">Drop Chef Directory workbook (.xlsx)</p>
              <p className="text-sm text-muted-foreground mt-1">
                One tab per market — columns vary by tab (Chef vs First Name).
              </p>
              <Button
                type="button"
                className="mt-4 bg-navy hover:bg-navy/90 text-white"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                Choose file
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>
        )}

        {preview && (
          <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-hidden">
            <ImportSummaryBar
              preview={preview}
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              onShowAllRows={() => setStatusFilter('all')}
            />
            {preview.skippedSheets?.length > 0 && (
              <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                {preview.skippedSheets.map((s) => (
                  <p key={s.sheetName}>
                    Sheet «
                    {s.sheetName}
                    »:
                    {' '}
                    {s.skipReason}
                    {' '}
                    (
                    {s.rowCount}
                    {' '}
                    rows).
                  </p>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={sheetFilter} onValueChange={setSheetFilter}>
                <SelectTrigger className="w-[220px] h-9">
                  <SelectValue placeholder="Sheet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sheets</SelectItem>
                  {sheetOptions.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filtersActive && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-9 px-2 text-muted-foreground"
                  onClick={() => {
                    setSheetFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  Show all rows
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={resetState}>
                Choose another file
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Showing
              {' '}
              {visibleRows.length}
              {' '}
              of
              {' '}
              {totalRowCount}
              {' '}
              rows
            </p>
            <div className="border rounded-lg overflow-auto flex-1 min-h-[240px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(v) => toggleAllVisible(!!v)}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                        {emptyFilterMessage(statusFilter)}
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleRows.map((row) => (
                    <TableRow key={row.key} className={rowLevelClass(row.level)}>
                      <TableCell>
                        <Checkbox
                          disabled={!row.importable}
                          checked={selectedKeys.has(row.key)}
                          onCheckedChange={(v) => toggleKey(row.key, !!v, row.importable)}
                        />
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {row.first_name}
                        {row.last_name ? ` ${row.last_name}` : ''}
                      </TableCell>
                      <TableCell className="text-sm">{row.mobile || '—'}</TableCell>
                      <TableCell className="text-sm max-w-[140px] truncate">{row.email || '—'}</TableCell>
                      <TableCell className="text-sm max-w-[120px] truncate">{row.city || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${levelBadgeClass(row.level)}`}>
                          {row.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                        {row.messages?.join(' · ') || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {preview && (
            <Button
              type="button"
              className="bg-navy hover:bg-navy/90 text-white"
              disabled={importing || selectedKeys.size === 0}
              onClick={handleImport}
            >
              {importing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing…</>
              ) : (
                `Import selected (${selectedKeys.size})`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilterChip({
  active,
  onClick,
  className,
  children,
}) {
  return (
    <Badge
      variant="outline"
      role="button"
      tabIndex={0}
      className={cn(
        'cursor-pointer select-none transition-shadow',
        active && 'ring-2 ring-navy/40 ring-offset-1',
        className,
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </Badge>
  );
}

function ImportSummaryBar({ preview, statusFilter, onStatusFilterChange, onShowAllRows }) {
  const { stats, counts } = preview;
  const filterActive = statusFilter !== 'all';

  return (
    <div className="flex flex-wrap gap-2 items-center text-sm">
      <Badge variant="secondary">{stats.sheetCount} sheets</Badge>
      <Badge variant="secondary">{stats.totalRows} rows scanned</Badge>
      <Badge variant="secondary">{stats.mergedCount} after merge</Badge>
      <FilterChip
        active={statusFilter === 'ok'}
        className={levelBadgeClass('ok')}
        onClick={() => onStatusFilterChange('ok')}
      >
        {counts.ok ?? 0}
        {' '}
        ok
      </FilterChip>
      <FilterChip
        active={statusFilter === 'warning'}
        className={levelBadgeClass('warning')}
        onClick={() => onStatusFilterChange('warning')}
      >
        {counts.warning ?? 0}
        {' '}
        warnings
      </FilterChip>
      <FilterChip
        active={statusFilter === 'error'}
        className={levelBadgeClass('error')}
        onClick={() => onStatusFilterChange('error')}
      >
        {counts.error ?? 0}
        {' '}
        errors
      </FilterChip>
      <FilterChip
        active={statusFilter === 'importable'}
        className="border-border bg-muted/50"
        onClick={() => onStatusFilterChange('importable')}
      >
        <span className="flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {counts.importable ?? 0}
          {' '}
          importable
        </span>
      </FilterChip>
      {filterActive && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-7 px-1 text-muted-foreground"
          onClick={onShowAllRows}
        >
          Show all rows
        </Button>
      )}
    </div>
  );
}