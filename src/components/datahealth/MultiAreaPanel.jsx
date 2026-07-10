import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flag, Users } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function MultiAreaPanel({ chefs }) {
  const queryClient = useQueryClient();
  const [flagged, setFlagged] = useState(new Set());

  const multiArea = chefs.filter(c => !c.archived && (c.home_areas || []).length > 1);

  const flagForReview = async (chef) => {
    await base44.entities.Chef.update(chef.id, { status: 'Flagged' });
    await base44.entities.ActivityLog.create({
      actor: 'Team', action: 'Updated', entity_type: 'Chef',
      entity_label: `${chef.first_name} ${chef.last_name}`,
      summary: `Flagged for manual review: possible merge of ${(chef.home_areas || []).join(', ')}`,
    });
    queryClient.invalidateQueries({ queryKey: ['chefs'] });
    setFlagged(prev => new Set([...prev, chef.id]));
    toast({ title: `${chef.first_name} ${chef.last_name} flagged for review` });
  };

  if (!multiArea.length) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-blue-500" />
        <h3 className="font-medium text-sm">Multi-area chefs ({multiArea.length})</h3>
        <span className="text-xs text-muted-foreground ml-2">These records were merged from multiple rows during import. Review suspicious merges below.</span>
      </div>
      <div className="space-y-2">
        {multiArea.map(chef => (
          <div key={chef.id} className="flex items-center gap-3 py-2 border-b last:border-0">
            <div className="flex-1">
              <span className="text-sm font-medium">{chef.first_name} {chef.last_name}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(chef.home_areas || []).map(a => (
                  <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{chef.status || 'Active'}</div>
            {!flagged.has(chef.id) && chef.status !== 'Flagged' ? (
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => flagForReview(chef)}>
                <Flag size={11} className="mr-1" /> Flag merge
              </Button>
            ) : (
              <span className="text-xs text-amber-600 font-medium">Flagged</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}