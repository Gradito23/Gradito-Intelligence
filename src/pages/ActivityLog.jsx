import React, { useState } from 'react';
import { useActivityLogs } from '@/hooks/useAppData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChefHat, Calendar, Users, FileText, Plus, Pencil, Trash2 } from 'lucide-react';

const entityIcons = {
  Chef: ChefHat,
  Event: Calendar,
  Client: Users,
  Intake: FileText,
};

const actionIcons = {
  Created: Plus,
  Updated: Pencil,
  Deleted: Trash2,
};

const actionColors = {
  Created: 'bg-emerald-100 text-emerald-800',
  Updated: 'bg-blue-100 text-blue-800',
  Deleted: 'bg-red-100 text-red-800',
};

export default function ActivityLog() {
  const { data: logs } = useActivityLogs();
  const [filterType, setFilterType] = useState('all');

  const filtered = filterType === 'all' ? logs : logs.filter(l => l.entity_type === filterType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground mt-1">All changes across the platform</p>
      </div>

      <div className="flex gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Chef">Chef</SelectItem>
            <SelectItem value="Event">Event</SelectItem>
            <SelectItem value="Client">Client</SelectItem>
            <SelectItem value="Intake">Intake</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map(log => {
          const EntityIcon = entityIcons[log.entity_type] || FileText;
          const ActionIcon = actionIcons[log.action] || Pencil;
          return (
            <Card key={log.id} className="p-4 flex items-start gap-4 hover:bg-secondary/20 transition-colors">
              <div className="p-2 rounded-lg bg-secondary shrink-0">
                <EntityIcon size={18} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{log.actor || 'System'}</span>
                  <Badge className={`${actionColors[log.action] || ''} text-xs border-0 flex items-center gap-1`}>
                    <ActionIcon size={10} />
                    {log.action}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{log.entity_type}</Badge>
                </div>
                <p className="text-sm text-foreground">{log.summary}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(log.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>No activity entries found</p>
          </div>
        )}
      </div>
    </div>
  );
}