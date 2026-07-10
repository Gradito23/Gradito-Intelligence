import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';

export default function AreaCompleteness({ chefs }) {
  const areaData = useMemo(() => {
    const map = {};
    chefs.forEach(chef => {
      if (chef.archived) return;
      (chef.home_areas || []).forEach(area => {
        if (!map[area]) map[area] = { area, total: 0, complete: 0 };
        map[area].total++;
        const t1 = chef.phone && chef.email && chef.menu_url && (chef.bio_url || chef.bio_page);
        if (t1) map[area].complete++;
      });
    });
    return Object.values(map)
      .map(d => ({ ...d, pct: d.total > 0 ? Math.round((d.complete / d.total) * 100) : 0 }))
      .sort((a, b) => a.pct - b.pct);
  }, [chefs]);

  if (!areaData.length) return null;

  return (
    <Card className="p-4">
      <h3 className="font-medium text-sm mb-4">Tier-1 Completeness by Service Area</h3>
      <div className="space-y-2">
        {areaData.map(d => (
          <div key={d.area} className="flex items-center gap-3">
            <span className="text-sm w-44 truncate shrink-0">{d.area}</span>
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${d.pct < 40 ? 'bg-red-400' : d.pct < 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${d.pct}%` }}
              />
            </div>
            <span className={`text-xs font-medium w-10 text-right ${d.pct < 40 ? 'text-red-600' : d.pct < 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {d.pct}%
            </span>
            <span className="text-xs text-muted-foreground w-16">{d.complete}/{d.total}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}