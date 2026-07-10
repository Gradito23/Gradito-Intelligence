import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCheck, Archive, ChevronDown } from 'lucide-react';
import CleanupRow from './CleanupRow';
import { toast } from '@/components/ui/use-toast';

export default function CleanupQueue({ chefs, activeFilter, activeLabel, onClear, resolvedIds, onMarkReviewed }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');

  // Exclude already reviewed rows
  const queue = chefs.filter(c => !resolvedIds.has(c.id));
  const total = chefs.length;
  const resolved = total - queue.length;

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === queue.length) setSelected(new Set());
    else setSelected(new Set(queue.map(c => c.id)));
  };

  const applyBulk = async () => {
    if (!bulkAction || selected.size === 0) return;
    const ids = [...selected];

    if (bulkAction === 'archive') {
      for (const id of ids) {
        await base44.entities.Chef.update(id, { archived: true });
      }
      await base44.entities.ActivityLog.create({
        actor: 'Team', action: 'Updated', entity_type: 'Chef',
        summary: `Bulk archived ${ids.length} records via Data Health`,
      });
      queryClient.invalidateQueries({ queryKey: ['chefs'] });
      toast({ title: `${ids.length} records archived` });
    } else if (bulkAction === 'reviewed') {
      ids.forEach(id => onMarkReviewed(id));
      toast({ title: `${ids.length} records marked reviewed` });
    } else {
      // set status
      for (const id of ids) {
        await base44.entities.Chef.update(id, { status: bulkAction });
      }
      await base44.entities.ActivityLog.create({
        actor: 'Team', action: 'Updated', entity_type: 'Chef',
        summary: `Bulk set status → ${bulkAction} for ${ids.length} records`,
      });
      queryClient.invalidateQueries({ queryKey: ['chefs'] });
      toast({ title: `${ids.length} records → ${bulkAction}` });
    }
    setSelected(new Set());
    setBulkAction('');
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b bg-secondary/30 flex flex-wrap items-center gap-2">
        <span className="font-medium text-sm">{activeLabel}</span>
        <Badge variant="outline" className="text-xs">{queue.length} remaining</Badge>

        {/* Progress bar */}
        {total > 0 && (
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{ width: `${Math.round((resolved / total) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{resolved}/{total} resolved</span>
          </div>
        )}

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue placeholder="Bulk action…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reviewed"><CheckCheck size={12} className="inline mr-1" />Mark reviewed</SelectItem>
                <SelectItem value="archive"><Archive size={12} className="inline mr-1" />Archive all</SelectItem>
                <SelectItem value="Active">Set → Active</SelectItem>
                <SelectItem value="Flagged">Set → Flagged</SelectItem>
                <SelectItem value="Do Not Book">Set → Do Not Book</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 text-xs bg-gold hover:bg-gold/80 text-white" onClick={applyBulk} disabled={!bulkAction}>
              Apply
            </Button>
          </div>
        )}

        <button onClick={onClear} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
          ✕ Clear filter
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="p-8 text-center">
          <CheckCheck size={32} className="mx-auto mb-2 text-emerald-500" />
          <p className="font-medium text-sm text-emerald-700">All clear!</p>
          <p className="text-xs text-muted-foreground mt-1">All records in this filter have been resolved.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/20">
                <th className="p-2 pl-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === queue.length && queue.length > 0}
                    onChange={toggleAll}
                    className="rounded border-border accent-gold"
                  />
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs">Name</th>
                <th className="text-left p-2 font-medium text-muted-foreground text-xs">Status</th>
                <th className="text-left p-2 font-medium text-muted-foreground text-xs">Areas</th>
                <th className="text-left p-2 font-medium text-muted-foreground text-xs">Phone</th>
                <th className="text-left p-2 font-medium text-muted-foreground text-xs">Email</th>
                <th className="text-left p-2 font-medium text-muted-foreground text-xs">Menu</th>
                <th className="text-left p-2 font-medium text-muted-foreground text-xs">Bio</th>
                <th className="text-left p-2 font-medium text-muted-foreground text-xs">Import Notes</th>
                <th className="w-28" />
              </tr>
            </thead>
            <tbody>
              {queue.map(chef => (
                <CleanupRow
                  key={chef.id}
                  chef={chef}
                  activeFilter={activeFilter}
                  selected={selected.has(chef.id)}
                  onSelect={() => toggleSelect(chef.id)}
                  onMarkReviewed={() => onMarkReviewed(chef.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}